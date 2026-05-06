-- Atomic void/reversal for contract payments.
-- Contract collections stay in payments; voiding soft-deletes the payment,
-- restores linked payment plans, and recalculates contract debt in one DB txn.

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS is_contract_adjustment boolean NOT NULL DEFAULT false;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS voided_at timestamptz NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS voided_by uuid NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS void_reason text NULL;

CREATE INDEX IF NOT EXISTS idx_payments_voided_contract
  ON public.payments(contract_id, voided_at)
  WHERE contract_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.process_contract_payment_v2(
  p_contract_id uuid,
  p_amount numeric,
  p_payment_method public.payment_method_enum,
  p_payment_date date,
  p_payment_stage text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_payment_plan_id uuid DEFAULT NULL,
  p_update_total boolean DEFAULT false,
  p_created_by uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_plan public.payment_plans%ROWTYPE;
  v_payment_id uuid;
  v_receipt_code text;
  v_current_remaining numeric;
  v_total numeric;
  v_paid numeric;
  v_remaining numeric;
  v_payment_status text;
  v_rows integer;
BEGIN
  IF p_created_by IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: actor_id is required';
  END IF;

  IF p_contract_id IS NULL THEN
    RAISE EXCEPTION 'Contract id is required';
  END IF;

  IF p_payment_date IS NULL THEN
    RAISE EXCEPTION 'Payment date is required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than 0';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.finance_monthly_closes
    WHERE period = to_char(p_payment_date, 'YYYY-MM')
      AND status = 'locked'
  ) THEN
    RAISE EXCEPTION 'Ky nay da chot so, khong the thay doi du lieu.';
  END IF;

  SELECT *
  INTO v_contract
  FROM public.contracts
  WHERE id = p_contract_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Khong tim thay hop dong';
  END IF;

  IF v_contract.status = 'da_huy' THEN
    RAISE EXCEPTION 'Hop dong da huy, khong the thu tien';
  END IF;

  v_current_remaining := GREATEST(
    0,
    COALESCE(v_contract.remaining_amount, COALESCE(v_contract.total_amount, 0) - COALESCE(v_contract.paid_amount, 0))
  );

  IF COALESCE(p_update_total, false) THEN
    IF v_current_remaining > 0 THEN
      RAISE EXCEPTION 'Chi tao phat sinh tang hop dong khi cong no hien tai da tat toan.';
    END IF;
  ELSIF p_amount > v_current_remaining THEN
    RAISE EXCEPTION 'So tien thu vuot qua so tien con lai cua hop dong.';
  END IF;

  IF p_payment_plan_id IS NOT NULL THEN
    SELECT *
    INTO v_plan
    FROM public.payment_plans
    WHERE id = p_payment_plan_id
      AND contract_id = p_contract_id
    FOR UPDATE;

    IF NOT FOUND OR COALESCE(v_plan.status, 'pending') IN ('paid', 'cancelled') THEN
      RAISE EXCEPTION 'Dot thanh toan khong hop le hoac da dong';
    END IF;

    IF p_amount < COALESCE(v_plan.amount, 0) THEN
      RAISE EXCEPTION 'So tien thu khong du de tat toan dot thanh toan da chon';
    END IF;
  END IF;

  v_payment_id := gen_random_uuid();
  v_receipt_code := public.contract_payment_receipt_code(v_payment_id, p_payment_date);
  v_total := COALESCE(v_contract.total_amount, 0)
    + CASE WHEN COALESCE(p_update_total, false) THEN p_amount ELSE 0 END;
  v_paid := COALESCE(v_contract.paid_amount, 0) + p_amount;
  v_remaining := GREATEST(0, v_total - v_paid);
  v_payment_status := CASE
    WHEN v_paid <= 0 THEN 'chua_thanh_toan'
    WHEN v_remaining <= 0 THEN 'da_thanh_toan'
    WHEN v_paid < (v_total * 0.5) THEN 'da_coc'
    ELSE 'thanh_toan_mot_phan'
  END;

  INSERT INTO public.payments (
    id,
    contract_id,
    customer_id,
    amount,
    payment_method,
    payment_date,
    payment_stage,
    category_id,
    notes,
    receipt_code,
    created_by,
    approved_by,
    is_contract_adjustment
  )
  VALUES (
    v_payment_id,
    p_contract_id,
    v_contract.customer_id,
    p_amount,
    p_payment_method,
    p_payment_date,
    p_payment_stage,
    p_category_id,
    p_notes,
    v_receipt_code,
    p_created_by,
    p_created_by,
    COALESCE(p_update_total, false)
  );

  UPDATE public.contracts
  SET total_amount = v_total,
      paid_amount = v_paid,
      remaining_amount = v_remaining,
      payment_status = v_payment_status,
      updated_by = p_created_by,
      updated_at = now()
  WHERE id = p_contract_id;

  IF p_payment_plan_id IS NOT NULL THEN
    UPDATE public.payment_plans
    SET status = 'paid',
        receipt_id = v_payment_id
    WHERE id = p_payment_plan_id
      AND contract_id = p_contract_id
      AND COALESCE(status, 'pending') <> 'cancelled';

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
      RAISE EXCEPTION 'Dot thanh toan khong hop le hoac da bi huy';
    END IF;
  END IF;

  RETURN json_build_object(
    'payment_id', v_payment_id,
    'receipt_code', v_receipt_code,
    'new_paid', v_paid,
    'new_remaining', v_remaining,
    'payment_status', v_payment_status,
    'total_amount', v_total
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.void_contract_payment_v2(
  p_payment_id uuid,
  p_reason text,
  p_actor_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_contract public.contracts%ROWTYPE;
  v_total numeric;
  v_paid numeric;
  v_remaining numeric;
  v_payment_status text;
  v_restored_plans integer := 0;
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: actor_id is required';
  END IF;

  IF p_payment_id IS NULL THEN
    RAISE EXCEPTION 'Payment id is required';
  END IF;

  IF p_reason IS NULL OR length(btrim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'Ly do huy phieu thu phai co it nhat 5 ky tu';
  END IF;

  SELECT *
  INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
    AND deleted_at IS NULL
    AND contract_id IS NOT NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Khong tim thay phieu thu hop dong hoac phieu da bi huy';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.finance_monthly_closes
    WHERE period = to_char(v_payment.payment_date, 'YYYY-MM')
      AND status = 'locked'
  ) THEN
    RAISE EXCEPTION 'Ky nay da chot so, khong the huy phieu thu.';
  END IF;

  SELECT *
  INTO v_contract
  FROM public.contracts
  WHERE id = v_payment.contract_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Khong tim thay hop dong cua phieu thu';
  END IF;

  UPDATE public.payments
  SET deleted_at = now(),
      voided_at = now(),
      voided_by = p_actor_id,
      void_reason = btrim(p_reason),
      updated_at = now()
  WHERE id = p_payment_id;

  UPDATE public.payment_plans
  SET status = 'pending',
      receipt_id = NULL
  WHERE receipt_id = p_payment_id
    AND contract_id = v_payment.contract_id
    AND COALESCE(status, 'pending') = 'paid';

  GET DIAGNOSTICS v_restored_plans = ROW_COUNT;

  v_total := CASE
    WHEN COALESCE(v_payment.is_contract_adjustment, false)
      THEN GREATEST(0, COALESCE(v_contract.total_amount, 0) - COALESCE(v_payment.amount, 0))
    ELSE COALESCE(v_contract.total_amount, 0)
  END;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_paid
  FROM public.payments
  WHERE contract_id = v_payment.contract_id
    AND deleted_at IS NULL;

  v_remaining := GREATEST(0, v_total - v_paid);
  v_payment_status := CASE
    WHEN v_paid <= 0 THEN 'chua_thanh_toan'
    WHEN v_remaining <= 0 THEN 'da_thanh_toan'
    WHEN v_paid < (v_total * 0.5) THEN 'da_coc'
    ELSE 'thanh_toan_mot_phan'
  END;

  UPDATE public.contracts
  SET total_amount = v_total,
      paid_amount = v_paid,
      remaining_amount = v_remaining,
      payment_status = v_payment_status,
      updated_by = p_actor_id,
      updated_at = now()
  WHERE id = v_payment.contract_id;

  RETURN json_build_object(
    'payment_id', p_payment_id,
    'contract_id', v_payment.contract_id,
    'voided_amount', v_payment.amount,
    'restored_payment_plans', v_restored_plans,
    'new_total', v_total,
    'new_paid', v_paid,
    'new_remaining', v_remaining,
    'payment_status', v_payment_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_contract_payment_v2(uuid, numeric, public.payment_method_enum, date, text, uuid, text, uuid, boolean, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.void_contract_payment_v2(uuid, text, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.process_contract_payment_v2(uuid, numeric, public.payment_method_enum, date, text, uuid, text, uuid, boolean, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.void_contract_payment_v2(uuid, text, uuid) TO service_role;
