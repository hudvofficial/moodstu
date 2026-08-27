-- T-20260827-tien-vao-payment-plans / ADR-016 phụ lục M4
-- Lịch thu mặc định chỉ còn Cọc + Tất toán. Đợt 1 / Đợt 2 do generator luôn sinh 0đ, không hạn,
-- chưa bao giờ được thu (đo 26/08: 115 pending + 4 cancelled + 1 partial có 1 phân bổ). Xoá các dòng
-- installment KHÔNG có phân bổ (backup: docs/reports/backup_2026-08-27_payment_plans_installments.json);
-- dòng có phân bổ giữ nguyên. RPC thu tiền (process_contract_payment_v2) tự tạo đợt `outside` khi cần —
-- không đụng. contract_payment_health_checks chỉ đòi ≥ 1 đợt/HĐ active → không đỏ.

DO $$
DECLARE
  v_del   bigint;
  v_keep  bigint;
  v_alloc bigint;
  v_pay   bigint;
BEGIN
  SELECT count(*) INTO v_del FROM public.payment_plans pp
   WHERE pp.stage_key IN ('installment_1', 'installment_2')
     AND NOT EXISTS (SELECT 1 FROM public.payment_plan_allocations a WHERE a.payment_plan_id = pp.id);
  SELECT count(*) INTO v_keep FROM public.payment_plans pp
   WHERE pp.stage_key IN ('installment_1', 'installment_2')
     AND EXISTS (SELECT 1 FROM public.payment_plan_allocations a WHERE a.payment_plan_id = pp.id);
  SELECT count(DISTINCT a.payment_id) INTO v_alloc FROM public.payment_plan_allocations a
    JOIN public.payments p ON p.id = a.payment_id WHERE p.deleted_at IS NULL;
  SELECT count(*) INTO v_pay FROM public.payments WHERE deleted_at IS NULL;
  IF v_del <> 119 OR v_keep <> 1 OR v_alloc <> v_pay THEN
    RAISE EXCEPTION 'Pre-check M4 that bai: xoa=% (mong 119) giu=% (mong 1) phieu_thu_co_phan_bo=%/% — DUNG, hoi Claude',
      v_del, v_keep, v_alloc, v_pay;
  END IF;
  RAISE NOTICE 'Pre-check OK: xoa % dong installment khong phan bo, giu % dong co phan bo', v_del, v_keep;
END $$;

-- Generator: cùng chữ ký, bỏ 2 khối Đợt 1 / Đợt 2 (phần còn lại giữ nguyên chữ bản 20260505111000)
CREATE OR REPLACE FUNCTION public.create_default_payment_schedule_v2(
  p_contract_id uuid, p_total numeric, p_initial_amount numeric DEFAULT 0, p_initial_stage text DEFAULT NULL::text,
  p_contract_date date DEFAULT CURRENT_DATE, p_work_date date DEFAULT NULL::date)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_initial_plan_id uuid := NULL;
  v_total numeric := GREATEST(0, COALESCE(p_total, 0));
  v_initial_amount numeric := GREATEST(0, COALESCE(p_initial_amount, 0));
  v_initial_stage_key text := public.payment_stage_key_v2(p_initial_stage);
  v_target_stage_key text;
BEGIN
  IF p_contract_id IS NULL THEN
    RAISE EXCEPTION 'Contract id is required';
  END IF;
  IF v_total <= 0 THEN
    RETURN NULL;
  END IF;
  IF v_initial_amount > v_total + 0.01 THEN
    RAISE EXCEPTION 'So tien thanh toan ban dau vuot qua gia tri hop dong.';
  END IF;
  UPDATE public.payment_plans
  SET stage_key = public.payment_stage_key_v2(COALESCE(stage_key, stage_name)),
      stage_name = public.payment_stage_display_label_v2(COALESCE(stage_key, stage_name), stage_name)
  WHERE contract_id = p_contract_id
    AND COALESCE(status, 'pending') <> 'cancelled';
  UPDATE public.payment_plans
  SET sort_order = CASE stage_key
        WHEN 'deposit' THEN 10
        WHEN 'final' THEN 40
        ELSE sort_order
      END,
      stage_name = CASE stage_key
        WHEN 'deposit' THEN 'Cọc'
        WHEN 'final' THEN 'Tất toán'
        ELSE stage_name
      END
  WHERE contract_id = p_contract_id
    AND stage_key IN ('deposit', 'final')
    AND COALESCE(status, 'pending') <> 'cancelled';
  INSERT INTO public.payment_plans (
    contract_id, stage_name, stage_key, amount, due_date, status, sort_order
  )
  SELECT p_contract_id, 'Cọc', 'deposit',
         CASE WHEN COALESCE(v_initial_stage_key, 'deposit') = 'deposit' THEN v_initial_amount ELSE 0 END,
         COALESCE(p_contract_date, CURRENT_DATE),
         'pending',
         10
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.payment_plans
    WHERE contract_id = p_contract_id
      AND stage_key = 'deposit'
      AND COALESCE(status, 'pending') <> 'cancelled'
  );
  -- ADR-016 M4: không sinh 'installment_1' / 'installment_2' (0đ, không hạn) nữa — Mood thu Cọc + Tất toán;
  -- thu thêm ngoài lịch → process_contract_payment_v2 tự tạo đợt 'outside'.
  INSERT INTO public.payment_plans (
    contract_id, stage_name, stage_key, amount, due_date, status, sort_order
  )
  SELECT p_contract_id, 'Tất toán', 'final',
         CASE
           WHEN COALESCE(v_initial_stage_key, '') = 'final' AND v_initial_amount > 0 THEN v_initial_amount
           ELSE GREATEST(0, v_total - v_initial_amount)
         END,
         COALESCE(p_work_date, p_contract_date, CURRENT_DATE),
         'pending',
         40
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.payment_plans
    WHERE contract_id = p_contract_id
      AND stage_key = 'final'
      AND COALESCE(status, 'pending') <> 'cancelled'
  );
  v_target_stage_key := CASE
    WHEN v_initial_amount >= v_total THEN 'final'
    ELSE COALESCE(v_initial_stage_key, 'deposit')
  END;
  IF v_target_stage_key NOT IN ('deposit', 'final') THEN
    v_target_stage_key := 'deposit';
  END IF;
  SELECT id
  INTO v_initial_plan_id
  FROM public.payment_plans
  WHERE contract_id = p_contract_id
    AND stage_key = v_target_stage_key
    AND COALESCE(status, 'pending') <> 'cancelled'
  ORDER BY sort_order, created_at
  LIMIT 1;
  RETURN v_initial_plan_id;
END;
$function$;

DELETE FROM public.payment_plans pp
 WHERE pp.stage_key IN ('installment_1', 'installment_2')
   AND NOT EXISTS (SELECT 1 FROM public.payment_plan_allocations a WHERE a.payment_plan_id = pp.id);

DO $$
DECLARE
  v_left bigint;
  v_missing bigint;
BEGIN
  SELECT count(*) INTO v_left FROM public.payment_plans WHERE stage_key IN ('installment_1', 'installment_2');
  SELECT issue_count INTO v_missing FROM public.contract_payment_health_checks() WHERE check_name = 'active_contracts_missing_payment_stage';
  IF COALESCE(v_missing, 0) <> 0 THEN
    RAISE EXCEPTION 'Sau khi xoa: % HD active khong con dot thu — DUNG', v_missing;
  END IF;
  RAISE NOTICE 'Xong: con % dong installment (co phan bo), HD thieu dot thu = %', v_left, COALESCE(v_missing, 0);
END $$;
