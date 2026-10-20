-- ADR-020 (T-20261020-payment-plans-dong-bo): lịch thu (payment_plans) phải khớp phiếu thu + tổng HĐ.
-- A) create_default_payment_schedule_v2: đích phân bổ = đợt đã nhận số tiền (hết cảnh Cọc kẹt pending / Tất toán 0đ nhận phân bổ).
-- B) resync_payment_plan_amounts_v2 + trigger AFTER UPDATE OF total_amount ON contracts: tổng HĐ đổi -> đợt 'final' đi theo.
-- C) contract_payment_health_checks: +2 check (plan_allocation_exceeds_amount, plan_amount_sum_mismatch).
-- KHÔNG sửa dữ liệu cũ (11 HĐ) — script dọn riêng. KHÔNG đổi bảng/CHECK/RLS.
-- (migrate-direct.mjs tự bọc BEGIN/COMMIT) Sinh từ thân hàm sống 20/10/2026; revert: agent/HANDOFFS/T-20261020-adr020-payment-plans-sync.revert.sql


-- A) thân sống + đúng 1 khối đổi
CREATE OR REPLACE FUNCTION public.create_default_payment_schedule_v2(p_contract_id uuid, p_total numeric, p_initial_amount numeric DEFAULT 0, p_initial_stage text DEFAULT NULL::text, p_contract_date date DEFAULT CURRENT_DATE, p_work_date date DEFAULT NULL::date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
  -- ADR-020: đích phân bổ = chính đợt đã nhận số tiền ở trên. Trước đây ép 'final' khi initial >= total
  -- trong khi đợt Cọc đã mang số tiền (dòng INSERT 'deposit' phía trên) -> phân bổ rơi vào Tất toán 0đ,
  -- Cọc kẹt 'pending' (7 HĐ: 0013, 0020, 0043, 0044, 0050, 0055, 0067).
  v_target_stage_key := COALESCE(v_initial_stage_key, 'deposit');
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

-- B) Bất biến: Σ amount đợt (không huỷ, không outside) + Σ phiếu phát sinh sống = total_amount.
-- Chỉ chỉnh đợt 'final' (đợt đầu tiên nếu có nhiều), không đụng đợt Cọc đã thu, không đụng phiếu thu / phân bổ.
CREATE OR REPLACE FUNCTION public.resync_payment_plan_amounts_v2(p_contract_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total numeric;
  v_final_id uuid;
  v_final_amount numeric;
  v_others numeric;
  v_adjustments numeric;
  v_new_amount numeric;
BEGIN
  IF p_contract_id IS NULL THEN
    RAISE EXCEPTION 'Contract id is required';
  END IF;

  SELECT COALESCE(total_amount, 0) INTO v_total
  FROM public.contracts
  WHERE id = p_contract_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT id, COALESCE(amount, 0)
  INTO v_final_id, v_final_amount
  FROM public.payment_plans
  WHERE contract_id = p_contract_id
    AND stage_key = 'final'
    AND COALESCE(status, 'pending') <> 'cancelled'
  ORDER BY sort_order, created_at
  LIMIT 1;
  IF v_final_id IS NULL THEN
    RETURN; -- không có Tất toán để chỉnh; health check sẽ báo nếu Σ lệch
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_others
  FROM public.payment_plans
  WHERE contract_id = p_contract_id
    AND id <> v_final_id
    AND COALESCE(status, 'pending') <> 'cancelled'
    AND COALESCE(stage_key, '') <> 'outside';

  SELECT COALESCE(SUM(amount), 0) INTO v_adjustments
  FROM public.payments
  WHERE contract_id = p_contract_id
    AND deleted_at IS NULL
    AND COALESCE(is_contract_adjustment, false);

  v_new_amount := GREATEST(0, v_total - v_others - v_adjustments);

  IF v_new_amount IS DISTINCT FROM v_final_amount THEN
    UPDATE public.payment_plans SET amount = v_new_amount WHERE id = v_final_id;
    PERFORM public.sync_payment_plan_statuses_v2(p_contract_id);
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.resync_payment_plan_amounts_v2(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resync_payment_plan_amounts_v2(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.trg_contract_total_resync_plans_v2()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.resync_payment_plan_amounts_v2(NEW.id);
  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.trg_contract_total_resync_plans_v2() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_contract_total_resync_plans_v2 ON public.contracts;
CREATE TRIGGER trg_contract_total_resync_plans_v2
  AFTER UPDATE OF total_amount ON public.contracts
  FOR EACH ROW
  WHEN (OLD.total_amount IS DISTINCT FROM NEW.total_amount)
  EXECUTE FUNCTION public.trg_contract_total_resync_plans_v2();

-- C) thân sống + 2 khối UNION ALL cuối
CREATE OR REPLACE FUNCTION public.contract_payment_health_checks()
 RETURNS TABLE(check_name text, issue_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH payment_sums AS (
    SELECT contract_id, SUM(amount) AS paid_sum
    FROM public.payments
    WHERE deleted_at IS NULL
      AND contract_id IS NOT NULL
    GROUP BY contract_id
  ),
  allocation_sums AS (
    SELECT payment_id, SUM(amount) AS allocated_amount
    FROM public.payment_plan_allocations
    GROUP BY payment_id
  )
  SELECT
    'overpaid_contracts'::text AS check_name,
    COUNT(*)::bigint AS issue_count
  FROM public.contracts
  WHERE deleted_at IS NULL
    AND (
      COALESCE(paid_amount, 0) > COALESCE(total_amount, 0) + 0.01
      OR COALESCE(remaining_amount, 0) < -0.01
    )

  UNION ALL

  SELECT
    'active_contracts_missing_payment_stage'::text AS check_name,
    COUNT(*)::bigint AS issue_count
  FROM public.contracts c
  WHERE c.deleted_at IS NULL
    AND COALESCE(c.status, '') <> 'da_huy'
    AND COALESCE(c.total_amount, 0) > 0
    AND NOT EXISTS (
      SELECT 1
      FROM public.payment_plans pp
      WHERE pp.contract_id = c.id
        AND COALESCE(pp.status, 'pending') <> 'cancelled'
    )

  UNION ALL

  SELECT
    'invalid_payment_stage_key'::text AS check_name,
    COUNT(*)::bigint AS issue_count
  FROM public.payment_plans pp
  WHERE COALESCE(pp.status, 'pending') <> 'cancelled'
    AND COALESCE(pp.stage_key, '') NOT IN ('deposit', 'installment_1', 'installment_2', 'final', 'outside', 'custom')

  UNION ALL

  SELECT
    'normal_contract_payment_without_allocation'::text AS check_name,
    COUNT(*)::bigint AS issue_count
  FROM public.payments p
  LEFT JOIN allocation_sums a ON a.payment_id = p.id
  WHERE p.deleted_at IS NULL
    AND p.contract_id IS NOT NULL
    AND COALESCE(p.is_contract_adjustment, false) IS FALSE
    AND COALESCE(a.allocated_amount, 0) <= 0

  UNION ALL

  SELECT
    'payment_allocation_sum_mismatch'::text AS check_name,
    COUNT(*)::bigint AS issue_count
  FROM public.payments p
  LEFT JOIN allocation_sums a ON a.payment_id = p.id
  WHERE p.deleted_at IS NULL
    AND p.contract_id IS NOT NULL
    AND COALESCE(p.is_contract_adjustment, false) IS FALSE
    AND ABS(COALESCE(p.amount, 0) - COALESCE(a.allocated_amount, 0)) > 0.01

  UNION ALL

  SELECT
    'payment_allocation_to_voided_payment'::text AS check_name,
    COUNT(*)::bigint AS issue_count
  FROM public.payment_plan_allocations ppa
  JOIN public.payments p ON p.id = ppa.payment_id
  WHERE p.deleted_at IS NOT NULL

  UNION ALL

  SELECT
    'contract_adjustments_missing_addon_item'::text AS check_name,
    COUNT(*)::bigint AS issue_count
  FROM public.payments p
  LEFT JOIN public.contract_items ci
    ON ci.id = p.contract_adjustment_item_id
   AND ci.contract_id = p.contract_id
   AND ci.deleted_at IS NULL
  WHERE p.deleted_at IS NULL
    AND p.contract_id IS NOT NULL
    AND COALESCE(p.is_contract_adjustment, false) IS TRUE
    AND ci.id IS NULL

  UNION ALL

  SELECT
    'contract_payment_sum_mismatch'::text AS check_name,
    COUNT(*)::bigint AS issue_count
  FROM public.contracts c
  LEFT JOIN payment_sums p ON p.contract_id = c.id
  WHERE c.deleted_at IS NULL
    AND ABS(COALESCE(c.paid_amount, 0) - COALESCE(p.paid_sum, 0)) > 0.01

  UNION ALL

  -- ADR-020: đợt nhận phân bổ vượt số tiền kế hoạch (loại 'outside': đợt thu ngoài lịch có amount 0 theo thiết kế)
  SELECT
    'plan_allocation_exceeds_amount'::text AS check_name,
    COUNT(DISTINCT pp.contract_id)::bigint AS issue_count
  FROM public.payment_plans pp
  JOIN public.contracts c ON c.id = pp.contract_id AND c.deleted_at IS NULL
  JOIN (
    SELECT ppa.payment_plan_id, SUM(ppa.amount) AS allocated
    FROM public.payment_plan_allocations ppa
    JOIN public.payments pay ON pay.id = ppa.payment_id AND pay.deleted_at IS NULL
    GROUP BY ppa.payment_plan_id
  ) s ON s.payment_plan_id = pp.id
  WHERE COALESCE(pp.status, 'pending') <> 'cancelled'
    AND COALESCE(pp.stage_key, '') <> 'outside'
    AND s.allocated > COALESCE(pp.amount, 0) + 0.01

  UNION ALL

  -- ADR-020: Σ đợt (không huỷ, không outside) + Σ phiếu phát sinh sống phải bằng total_amount
  SELECT
    'plan_amount_sum_mismatch'::text AS check_name,
    COUNT(*)::bigint AS issue_count
  FROM public.contracts c
  WHERE c.deleted_at IS NULL
    AND COALESCE(c.status, '') <> 'da_huy'
    AND EXISTS (
      SELECT 1 FROM public.payment_plans x
      WHERE x.contract_id = c.id AND COALESCE(x.status, 'pending') <> 'cancelled'
    )
    AND ABS(
      COALESCE((
        SELECT SUM(x.amount) FROM public.payment_plans x
        WHERE x.contract_id = c.id
          AND COALESCE(x.status, 'pending') <> 'cancelled'
          AND COALESCE(x.stage_key, '') <> 'outside'
      ), 0)
      + COALESCE((
        SELECT SUM(pay.amount) FROM public.payments pay
        WHERE pay.contract_id = c.id
          AND pay.deleted_at IS NULL
          AND COALESCE(pay.is_contract_adjustment, false)
      ), 0)
      - COALESCE(c.total_amount, 0)
    ) > 0.01;
$function$;

-- giữ ACL cũ của 2 hàm đã có (CREATE OR REPLACE không đổi ACL; khai lại cho chắc, không mở thêm quyền)
REVOKE ALL ON FUNCTION public.create_default_payment_schedule_v2(uuid, numeric, numeric, text, date, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.contract_payment_health_checks() FROM PUBLIC, anon, authenticated;

