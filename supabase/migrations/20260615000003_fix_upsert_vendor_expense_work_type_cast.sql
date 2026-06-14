-- =====================================================
-- Migration: Fix upsert_vendor_expense work_type enum coercion (root cause)
-- Date: 2026-06-15
-- =====================================================
-- Bug: CASE v_task.work_type WHEN 'hau_ky_phim' ... — 'hau_ky_phim' KHÔNG có trong
--   work_type_enum (enum chỉ có: bien_tap, cameraman, chup_anh, concept, dung_phim,
--   hau_ky_anh, khac, kich_ban, makeup, premiere, quay_phim, retouch, tro_ly).
--   Simple CASE trên kiểu enum buộc Postgres coerce MỌI literal WHEN sang enum khi
--   evaluate → literal 'hau_ky_phim' invalid → RAISE 22P02 cho MỌI task (kể cả
--   chup_anh). Hệ quả: upsert_vendor_expense THROW mọi lần → accrual expense CHƯA BAO
--   GIỜ được tạo kể từ 28/05 → vendor cost bị under-count, contract-profit bỏ sót.
-- Fix: so sánh trên work_type::text (text), không coerce enum. 1 dòng đổi.
-- (Lưu ý latent khác, KHÔNG sửa ở đây: check is_period_locked dùng CURRENT_DATE thay vì
--  completion_date khi tạo expense mới — không phải nguyên nhân hiện tại.)
-- =====================================================

CREATE OR REPLACE FUNCTION public.upsert_vendor_expense(p_work_task_id uuid, p_actor_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_task public.work_tasks%ROWTYPE;
  v_vendor_name text := 'Vendor';
  v_expense_id uuid;
  v_expense_date date;
  v_category_id uuid;
  v_description text;
  v_contract_code text;
  v_work_type_display text;
BEGIN
  -- Lock and load work_task
  SELECT * INTO v_task
  FROM public.work_tasks
  WHERE id = p_work_task_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Work task không tồn tại';
  END IF;

  -- Validate vendor assignment
  IF v_task.vendor_id IS NULL THEN
    RAISE EXCEPTION 'Task không được giao cho vendor (assigned_to employee)';
  END IF;

  -- Find existing expense
  SELECT id, expense_date
  INTO v_expense_id, v_expense_date
  FROM public.expenses
  WHERE work_task_id = p_work_task_id
    AND deleted_at IS NULL
  ORDER BY created_at DESC NULLS LAST
  LIMIT 1
  FOR UPDATE;

  v_expense_date := COALESCE(v_expense_date, CURRENT_DATE);

  -- Check period lock
  IF public.is_period_locked(v_expense_date) THEN
    RAISE EXCEPTION 'Kỳ kế toán đã khóa';
  END IF;

  -- Handle edge cases (soft delete expense)
  IF COALESCE(v_task.cost, 0) <= 0 OR
     v_task.status != 'hoan_thanh' OR
     v_task.status = 'da_huy' THEN
    IF v_expense_id IS NOT NULL THEN
      UPDATE public.expenses
      SET deleted_at = NOW(),
          updated_at = NOW()
      WHERE id = v_expense_id;
    END IF;
    RETURN v_expense_id;
  END IF;

  -- Get vendor name
  SELECT full_name INTO v_vendor_name
  FROM public.vendors
  WHERE id = v_task.vendor_id AND deleted_at IS NULL;

  v_vendor_name := COALESCE(v_vendor_name, 'Vendor');

  -- Resolve category
  v_category_id := public.resolve_vendor_expense_category_id();

  IF v_category_id IS NULL THEN
    RAISE EXCEPTION 'Vendor expense category không được cấu hình';
  END IF;

  -- Get contract code
  IF v_task.contract_id IS NOT NULL THEN
    SELECT contract_code INTO v_contract_code
    FROM public.contracts
    WHERE id = v_task.contract_id AND deleted_at IS NULL;
  END IF;

  -- Format work_type — ✅ FIX: cast sang text để KHÔNG coerce enum (tránh 22P02)
  v_work_type_display := CASE v_task.work_type::text
    WHEN 'chup_anh' THEN 'Chụp ảnh'
    WHEN 'quay_phim' THEN 'Quay phim'
    WHEN 'makeup' THEN 'Trang điểm'
    WHEN 'hau_ky_anh' THEN 'Hậu kỳ ảnh'
    WHEN 'hau_ky_phim' THEN 'Hậu kỳ phim'
    ELSE COALESCE(v_task.work_type::text, 'Công việc')
  END;

  -- Build description
  v_description := '[Auto-Vendor] ' || v_work_type_display || ' - ' || v_vendor_name;
  IF v_contract_code IS NOT NULL THEN
    v_description := v_description || ' (HD: ' || v_contract_code || ')';
  END IF;

  -- Insert or Update
  IF v_expense_id IS NULL THEN
    INSERT INTO public.expenses(
      expense_date, payment_method, category_id, amount, description,
      recipient, contract_id, work_task_id, created_by, created_at, updated_at
    )
    VALUES (
      COALESCE(v_task.completion_date::date, CURRENT_DATE),
      'chuyen_khoan'::public.payment_method_enum,
      v_category_id,
      COALESCE(v_task.cost, 0),
      v_description,
      v_vendor_name,
      v_task.contract_id,
      p_work_task_id,
      p_actor_id,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_expense_id;
  ELSE
    UPDATE public.expenses
    SET category_id = v_category_id,
        amount = COALESCE(v_task.cost, 0),
        description = v_description,
        recipient = v_vendor_name,
        contract_id = v_task.contract_id,
        expense_date = COALESCE(v_task.completion_date::date, expense_date),
        updated_at = NOW()
    WHERE id = v_expense_id;
  END IF;

  RETURN v_expense_id;
END;
$$;

-- Re-run backfill (idempotent): giờ upsert đã chạy được → tạo accrual cho task còn thiếu.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT wt.id
    FROM public.work_tasks wt
    WHERE wt.vendor_id IS NOT NULL
      AND wt.status = 'hoan_thanh'
      AND wt.cost > 0
      AND NOT EXISTS (
        SELECT 1 FROM public.expenses e
        WHERE e.work_task_id = wt.id AND e.deleted_at IS NULL
      )
  LOOP
    BEGIN
      PERFORM public.upsert_vendor_expense(r.id, NULL);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'backfill skipped task %: %', r.id, SQLERRM;
    END;
  END LOOP;
END $$;
