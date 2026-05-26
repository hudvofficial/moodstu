-- =====================================================
-- Migration: Vendor Expense Tracking (SAFE VERSION)
-- Date: 2026-05-28
-- Description: Safe version with comprehensive IF NOT EXISTS checks
-- Replaces: 20260528000001 (if failed)
-- =====================================================

-- =====================================================
-- PART 1: Add work_task_id column (SAFE)
-- =====================================================

DO $$
BEGIN
  -- Add column only if not exists
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'expenses'
      AND column_name = 'work_task_id'
  ) THEN
    ALTER TABLE public.expenses ADD COLUMN work_task_id uuid NULL;
    RAISE NOTICE 'Added work_task_id column to expenses';
  ELSE
    RAISE NOTICE 'work_task_id column already exists';
  END IF;

  -- Add FK constraint only if not exists
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'expenses_work_task_id_fkey'
  ) THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT expenses_work_task_id_fkey
      FOREIGN KEY (work_task_id)
      REFERENCES public.work_tasks(id)
      ON DELETE SET NULL;
    RAISE NOTICE 'Added FK constraint expenses_work_task_id_fkey';
  ELSE
    RAISE NOTICE 'FK constraint already exists';
  END IF;
END $$;

-- Create index (IF NOT EXISTS built-in)
CREATE INDEX IF NOT EXISTS idx_expenses_active_work_task
  ON public.expenses(work_task_id)
  WHERE deleted_at IS NULL AND work_task_id IS NOT NULL;

-- Add comment (safe - can run multiple times)
COMMENT ON COLUMN public.expenses.work_task_id IS 'Links expense to vendor work_task (similar to printing_order_id)';

-- =====================================================
-- PART 2: Create Vendor Expense Category (SAFE)
-- =====================================================

DO $$
DECLARE
  v_category_id uuid;
BEGIN
  -- Check if vendor category exists
  SELECT id INTO v_category_id
  FROM public.transaction_categories
  WHERE type = 'chi'
    AND category_code IN ('vendor', 'freelancer')
  ORDER BY
    CASE WHEN category_code = 'vendor' THEN 0 ELSE 1 END,
    created_at
  LIMIT 1;

  -- Create if not exists
  IF v_category_id IS NULL THEN
    INSERT INTO public.transaction_categories(
      category_code,
      name,
      type,
      is_default,
      created_at,
      updated_at
    )
    VALUES (
      'vendor',
      'Chi phí thợ ngoài',
      'chi',
      false,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_category_id;

    RAISE NOTICE 'Created vendor expense category: %', v_category_id;
  ELSE
    RAISE NOTICE 'Vendor category already exists: %', v_category_id;
  END IF;

  -- Upsert system setting
  INSERT INTO public.system_settings(key, value, description, updated_at)
  VALUES (
    'vendor_expense_category_id',
    v_category_id::text,
    'Vendor expense category ID for auto-expense creation',
    NOW()
  )
  ON CONFLICT (key) DO UPDATE
  SET value = v_category_id::text,
      description = 'Vendor expense category ID for auto-expense creation',
      updated_at = NOW();

  RAISE NOTICE 'Set system_settings.vendor_expense_category_id = %', v_category_id;
END $$;

-- =====================================================
-- PART 3: Category Resolver Function (SAFE)
-- =====================================================

CREATE OR REPLACE FUNCTION public.resolve_vendor_expense_category_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category_id uuid;
BEGIN
  -- Try system_settings first
  SELECT value::uuid
  INTO v_category_id
  FROM public.system_settings
  WHERE key = 'vendor_expense_category_id'
  LIMIT 1;

  IF v_category_id IS NOT NULL THEN
    RETURN v_category_id;
  END IF;

  -- Fallback: lookup by category_code
  SELECT id
  INTO v_category_id
  FROM public.transaction_categories
  WHERE type = 'chi'
    AND category_code IN ('vendor', 'freelancer')
  ORDER BY
    CASE WHEN category_code = 'vendor' THEN 0 ELSE 1 END,
    created_at
  LIMIT 1;

  RETURN v_category_id;
END;
$$;

-- =====================================================
-- PART 4: Vendor Expense Upsert Function (SAFE)
-- =====================================================

CREATE OR REPLACE FUNCTION public.upsert_vendor_expense(
  p_work_task_id uuid,
  p_actor_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Format work_type
  v_work_type_display := CASE v_task.work_type
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
      expense_date,
      payment_method,
      category_id,
      amount,
      description,
      recipient,
      contract_id,
      work_task_id,
      created_by,
      created_at,
      updated_at
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

-- =====================================================
-- PART 5: Permissions (SAFE)
-- =====================================================

-- Revoke all (safe to run multiple times)
REVOKE ALL ON FUNCTION public.resolve_vendor_expense_category_id() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.upsert_vendor_expense(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- Grant to service_role
GRANT EXECUTE ON FUNCTION public.resolve_vendor_expense_category_id() TO service_role;
GRANT EXECUTE ON FUNCTION public.upsert_vendor_expense(uuid, uuid) TO service_role;

-- =====================================================
-- PART 6: Comments
-- =====================================================

COMMENT ON FUNCTION public.resolve_vendor_expense_category_id() IS 'Resolves vendor expense category ID from system_settings or fallback lookup';
COMMENT ON FUNCTION public.upsert_vendor_expense(uuid, uuid) IS 'Creates or updates vendor expense when work_task status changes. Mirrors printing expense pattern. Expense recognized on task completion (accrual accounting).';

-- =====================================================
-- Migration Complete
-- =====================================================

SELECT 'Vendor expense tracking migration completed successfully' AS status;
