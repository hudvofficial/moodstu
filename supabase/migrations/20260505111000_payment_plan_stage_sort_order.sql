-- Normalize canonical payment stage ordering after four-stage repair.

UPDATE public.payment_plans
SET sort_order = CASE stage_key
      WHEN 'deposit' THEN 10
      WHEN 'installment_1' THEN 20
      WHEN 'installment_2' THEN 30
      WHEN 'final' THEN 40
      ELSE sort_order
    END,
    stage_name = CASE stage_key
      WHEN 'deposit' THEN 'Cọc'
      WHEN 'installment_1' THEN 'Đợt 1'
      WHEN 'installment_2' THEN 'Đợt 2'
      WHEN 'final' THEN 'Tất toán'
      ELSE stage_name
    END
WHERE COALESCE(status, 'pending') <> 'cancelled'
  AND stage_key IN ('deposit', 'installment_1', 'installment_2', 'final');

CREATE OR REPLACE FUNCTION public.create_default_payment_schedule_v2(
  p_contract_id uuid,
  p_total numeric,
  p_initial_amount numeric DEFAULT 0,
  p_initial_stage text DEFAULT NULL,
  p_contract_date date DEFAULT CURRENT_DATE,
  p_work_date date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
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
        WHEN 'installment_1' THEN 20
        WHEN 'installment_2' THEN 30
        WHEN 'final' THEN 40
        ELSE sort_order
      END,
      stage_name = CASE stage_key
        WHEN 'deposit' THEN 'Cọc'
        WHEN 'installment_1' THEN 'Đợt 1'
        WHEN 'installment_2' THEN 'Đợt 2'
        WHEN 'final' THEN 'Tất toán'
        ELSE stage_name
      END
  WHERE contract_id = p_contract_id
    AND stage_key IN ('deposit', 'installment_1', 'installment_2', 'final')
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

  INSERT INTO public.payment_plans (
    contract_id, stage_name, stage_key, amount, due_date, status, sort_order
  )
  SELECT p_contract_id, 'Đợt 1', 'installment_1', 0, NULL, 'pending', 20
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.payment_plans
    WHERE contract_id = p_contract_id
      AND stage_key = 'installment_1'
      AND COALESCE(status, 'pending') <> 'cancelled'
  );

  INSERT INTO public.payment_plans (
    contract_id, stage_name, stage_key, amount, due_date, status, sort_order
  )
  SELECT p_contract_id, 'Đợt 2', 'installment_2', 0, NULL, 'pending', 30
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.payment_plans
    WHERE contract_id = p_contract_id
      AND stage_key = 'installment_2'
      AND COALESCE(status, 'pending') <> 'cancelled'
  );

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

  IF v_target_stage_key NOT IN ('deposit', 'installment_1', 'installment_2', 'final') THEN
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
$$;

REVOKE ALL ON FUNCTION public.create_default_payment_schedule_v2(uuid, numeric, numeric, text, date, date)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_default_payment_schedule_v2(uuid, numeric, numeric, text, date, date)
  TO service_role;
