-- Phase 07 follow-up: keep final/remaining plan labels aligned with business wording.
-- UI treats stage_key = remaining/final as "Thanh toán hết"; make DB defaults match it too.

BEGIN;

UPDATE public.payment_plans
SET stage_name = 'Thanh toán hết'
WHERE COALESCE(stage_key, '') IN ('remaining', 'final')
  AND lower(COALESCE(stage_name, '')) IN (
    'thanh toán còn lại',
    'thanh toan con lai',
    'thanh toán hết / tất toán',
    'tất toán'
  );

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
  v_remaining numeric;
  v_initial_label text;
BEGIN
  IF p_contract_id IS NULL THEN
    RAISE EXCEPTION 'Contract id is required';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.payment_plans
    WHERE contract_id = p_contract_id
      AND COALESCE(status, 'pending') <> 'cancelled'
  ) THEN
    SELECT id
    INTO v_initial_plan_id
    FROM public.payment_plans
    WHERE contract_id = p_contract_id
      AND COALESCE(status, 'pending') <> 'cancelled'
    ORDER BY sort_order, created_at
    LIMIT 1;

    RETURN v_initial_plan_id;
  END IF;

  IF v_total <= 0 THEN
    RETURN NULL;
  END IF;

  IF v_initial_amount > v_total + 0.01 THEN
    RAISE EXCEPTION 'So tien thanh toan ban dau vuot qua gia tri hop dong.';
  END IF;

  v_remaining := GREATEST(0, v_total - v_initial_amount);

  IF v_initial_amount > 0 THEN
    v_initial_label := public.payment_stage_display_label_v2(
      p_initial_stage,
      CASE WHEN v_remaining <= 0 THEN 'Thanh toán hết' ELSE 'Cọc lần 1' END
    );

    INSERT INTO public.payment_plans (
      contract_id,
      stage_name,
      stage_key,
      amount,
      due_date,
      status,
      sort_order
    )
    VALUES (
      p_contract_id,
      v_initial_label,
      CASE
        WHEN v_remaining <= 0 OR v_initial_label = 'Thanh toán hết' THEN 'final'
        WHEN v_initial_label = 'Đợt 2' THEN 'second'
        ELSE 'deposit'
      END,
      v_initial_amount,
      COALESCE(p_contract_date, CURRENT_DATE),
      'pending',
      10
    )
    RETURNING id INTO v_initial_plan_id;
  END IF;

  IF v_remaining > 0 THEN
    INSERT INTO public.payment_plans (
      contract_id,
      stage_name,
      stage_key,
      amount,
      due_date,
      status,
      sort_order
    )
    VALUES (
      p_contract_id,
      'Thanh toán hết',
      'remaining',
      v_remaining,
      COALESCE(p_work_date, p_contract_date, CURRENT_DATE),
      'pending',
      CASE WHEN v_initial_amount > 0 THEN 20 ELSE 10 END
    );
  END IF;

  RETURN v_initial_plan_id;
END;
$$;

COMMIT;
