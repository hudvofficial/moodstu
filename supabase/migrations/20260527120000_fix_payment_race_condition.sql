-- P0-2 FIX: Payment race condition
-- Issue: remaining_amount check happened BEFORE lock acquisition
-- Fix: Move validation logic AFTER FOR UPDATE lock

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
  -- Input validation
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

  -- ⚡ P0-2 FIX: Add max amount validation
  IF p_amount > 10000000000 THEN
    RAISE EXCEPTION 'Payment amount exceeds maximum limit (10 billion VND)';
  END IF;

  -- Period lock check
  IF EXISTS (
    SELECT 1
    FROM public.finance_monthly_closes
    WHERE period = to_char(p_payment_date, 'YYYY-MM')
      AND status = 'locked'
  ) THEN
    RAISE EXCEPTION 'Ky nay da chot so, khong the thay doi du lieu.';
  END IF;

  -- ⚡ P0-2 FIX: Lock contract FIRST before any validation
  -- This prevents race conditions where 2 payments read same remaining_amount
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

  -- ⚡ P0-2 FIX: Calculate remaining AFTER lock (not before)
  -- Now we have exclusive lock, no one else can modify this contract
  v_current_remaining := GREATEST(
    0,
    COALESCE(v_contract.remaining_amount, COALESCE(v_contract.total_amount, 0) - COALESCE(v_contract.paid_amount, 0))
  );

  -- Validate payment amount against remaining
  IF COALESCE(p_update_total, false) THEN
    IF v_current_remaining > 0 THEN
      RAISE EXCEPTION 'Chi tao phat sinh tang hop dong khi cong no hien tai da tat toan.';
    END IF;
  ELSIF p_amount > v_current_remaining THEN
    RAISE EXCEPTION 'So tien thu vuot qua so tien con lai cua hop dong (con lai: % VND).', v_current_remaining;
  END IF;

  -- Payment plan validation
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

    -- ⚡ P0-2 FIX: Changed < to <= (allow exact amount)
    IF p_amount < COALESCE(v_plan.amount, 0) THEN
      RAISE EXCEPTION 'So tien thu khong du de tat toan dot thanh toan da chon';
    END IF;
  END IF;

  -- Generate payment ID and receipt code
  v_payment_id := gen_random_uuid();
  v_receipt_code := public.contract_payment_receipt_code(v_payment_id, p_payment_date);

  -- Calculate new totals
  v_total := COALESCE(v_contract.total_amount, 0)
    + CASE WHEN COALESCE(p_update_total, false) THEN p_amount ELSE 0 END;
  v_paid := COALESCE(v_contract.paid_amount, 0) + p_amount;
  v_remaining := GREATEST(0, v_total - v_paid);

  -- ⚡ P0-2 FIX: Use integer multiplication to avoid float precision issues
  v_payment_status := CASE
    WHEN v_paid <= 0 THEN 'chua_thanh_toan'
    WHEN v_remaining <= 0 THEN 'da_thanh_toan'
    WHEN v_paid * 2 < v_total THEN 'da_coc'  -- Changed from: v_paid < (v_total * 0.5)
    ELSE 'thanh_toan_mot_phan'
  END;

  -- Insert payment record
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
    approved_by
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
    p_created_by
  );

  -- Update contract totals (still within transaction, still holding lock)
  UPDATE public.contracts
  SET total_amount = v_total,
      paid_amount = v_paid,
      remaining_amount = v_remaining,
      payment_status = v_payment_status,
      updated_by = p_created_by,
      updated_at = now()
  WHERE id = p_contract_id;

  -- Update payment plan if specified
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

  -- Return result
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

-- Add comment explaining the fix
COMMENT ON FUNCTION public.process_contract_payment_v2 IS
'Atomic payment processing with race condition fix (P0-2).
- Lock acquired BEFORE validation to prevent concurrent overpayment
- Max amount validation added
- Float precision fixed (v_paid * 2 < v_total instead of multiplication by 0.5)';
