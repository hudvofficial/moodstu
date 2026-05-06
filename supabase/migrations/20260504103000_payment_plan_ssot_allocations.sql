-- Phase 07: payment_plans as SSOT for normal contract collection.
-- Adds allocation-aware installment tracking, repairs legacy V2 contracts,
-- and keeps the existing payments write model for cash events.

BEGIN;

ALTER TABLE public.payment_plans
  DROP CONSTRAINT IF EXISTS payment_plans_status_check;

UPDATE public.payment_plans
SET status = CASE
  WHEN lower(COALESCE(status, '')) IN ('paid', 'da_thu', 'da_thanh_toan', 'đã thu', 'đã thanh toán') THEN 'paid'
  WHEN lower(COALESCE(status, '')) IN ('cancelled', 'da_huy', 'huy', 'đã hủy', 'hủy') THEN 'cancelled'
  WHEN lower(COALESCE(status, '')) IN ('partial', 'mot_phan', 'một phần') THEN 'partial'
  ELSE 'pending'
END;

ALTER TABLE public.payment_plans
  ADD COLUMN IF NOT EXISTS stage_key text,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

UPDATE public.payment_plans
SET stage_key = CASE
  WHEN stage_key IS NOT NULL THEN stage_key
  WHEN lower(COALESCE(stage_name, '')) LIKE '%coc%' OR lower(COALESCE(stage_name, '')) LIKE '%cọc%' THEN 'deposit'
  WHEN lower(COALESCE(stage_name, '')) LIKE '%lan 2%' OR lower(COALESCE(stage_name, '')) LIKE '%lần 2%' OR lower(COALESCE(stage_name, '')) LIKE '%dot 2%' OR lower(COALESCE(stage_name, '')) LIKE '%đợt 2%' THEN 'second'
  WHEN lower(COALESCE(stage_name, '')) LIKE '%tat toan%' OR lower(COALESCE(stage_name, '')) LIKE '%tất toán%' OR lower(COALESCE(stage_name, '')) LIKE '%het%' OR lower(COALESCE(stage_name, '')) LIKE '%hết%' THEN 'final'
  WHEN lower(COALESCE(stage_name, '')) LIKE '%con lai%' OR lower(COALESCE(stage_name, '')) LIKE '%còn lại%' THEN 'remaining'
  ELSE 'custom'
END
WHERE stage_key IS NULL;

WITH ranked AS (
  SELECT id, row_number() OVER (
    PARTITION BY contract_id
    ORDER BY COALESCE(due_date, created_at::date, CURRENT_DATE), created_at, id
  ) AS rn
  FROM public.payment_plans
)
UPDATE public.payment_plans pp
SET sort_order = ranked.rn * 10
FROM ranked
WHERE ranked.id = pp.id
  AND COALESCE(pp.sort_order, 0) = 0;

ALTER TABLE public.payment_plans
  ADD CONSTRAINT payment_plans_status_check
  CHECK (status = ANY (ARRAY['pending', 'partial', 'paid', 'overdue', 'cancelled']));

CREATE TABLE IF NOT EXISTS public.payment_plan_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  payment_plan_id uuid NOT NULL REFERENCES public.payment_plans(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (payment_plan_id, payment_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_plans_contract_status_sort
  ON public.payment_plans(contract_id, status, sort_order);

CREATE INDEX IF NOT EXISTS idx_payment_plans_contract_due_date
  ON public.payment_plans(contract_id, due_date);

CREATE INDEX IF NOT EXISTS idx_payment_plan_allocations_plan
  ON public.payment_plan_allocations(payment_plan_id);

CREATE INDEX IF NOT EXISTS idx_payment_plan_allocations_payment
  ON public.payment_plan_allocations(payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_plan_allocations_contract
  ON public.payment_plan_allocations(contract_id);

CREATE INDEX IF NOT EXISTS idx_payments_contract_payment_date_active
  ON public.payments(contract_id, payment_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payments_contract_adjustment_active
  ON public.payments(contract_id, is_contract_adjustment)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.payment_plan_states AS
SELECT
  pp.id,
  pp.contract_id,
  pp.stage_name,
  pp.stage_key,
  pp.sort_order,
  pp.amount,
  COALESCE(SUM(ppa.amount) FILTER (WHERE p.deleted_at IS NULL), 0)::numeric AS paid_amount,
  GREATEST(0, pp.amount - COALESCE(SUM(ppa.amount) FILTER (WHERE p.deleted_at IS NULL), 0))::numeric AS remaining_amount,
  pp.due_date,
  pp.status,
  pp.receipt_id,
  pp.created_at
FROM public.payment_plans pp
LEFT JOIN public.payment_plan_allocations ppa ON ppa.payment_plan_id = pp.id
LEFT JOIN public.payments p ON p.id = ppa.payment_id
GROUP BY pp.id;

CREATE OR REPLACE FUNCTION public.sync_payment_plan_statuses_v2(
  p_contract_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  UPDATE public.payment_plans pp
  SET status = CASE
        WHEN COALESCE(pp.status, 'pending') = 'cancelled' THEN 'cancelled'
        WHEN COALESCE(s.paid_amount, 0) <= 0 THEN 'pending'
        WHEN COALESCE(s.paid_amount, 0) + 0.01 >= COALESCE(pp.amount, 0) THEN 'paid'
        ELSE 'partial'
      END,
      receipt_id = CASE
        WHEN COALESCE(pp.status, 'pending') = 'cancelled' THEN pp.receipt_id
        WHEN COALESCE(s.paid_amount, 0) + 0.01 >= COALESCE(pp.amount, 0)
          THEN COALESCE(
            pp.receipt_id,
            (
              SELECT ppa.payment_id
              FROM public.payment_plan_allocations ppa
              JOIN public.payments p ON p.id = ppa.payment_id AND p.deleted_at IS NULL
              WHERE ppa.payment_plan_id = pp.id
              ORDER BY p.payment_date DESC, p.created_at DESC
              LIMIT 1
            )
          )
        ELSE NULL
      END
  FROM (
    SELECT
      ppa.payment_plan_id,
      COALESCE(SUM(ppa.amount) FILTER (WHERE p.deleted_at IS NULL), 0) AS paid_amount
    FROM public.payment_plan_allocations ppa
    JOIN public.payments p ON p.id = ppa.payment_id
    WHERE ppa.contract_id = p_contract_id
    GROUP BY ppa.payment_plan_id
  ) s
  WHERE pp.id = s.payment_plan_id
    AND pp.contract_id = p_contract_id;

  UPDATE public.payment_plans pp
  SET status = CASE WHEN COALESCE(pp.status, 'pending') = 'cancelled' THEN 'cancelled' ELSE 'pending' END,
      receipt_id = CASE WHEN COALESCE(pp.status, 'pending') = 'cancelled' THEN pp.receipt_id ELSE NULL END
  WHERE pp.contract_id = p_contract_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.payment_plan_allocations ppa
      JOIN public.payments p ON p.id = ppa.payment_id AND p.deleted_at IS NULL
      WHERE ppa.payment_plan_id = pp.id
    )
    AND COALESCE(pp.status, 'pending') <> 'cancelled';
END;
$$;

CREATE OR REPLACE FUNCTION public.payment_stage_display_label_v2(
  p_stage text,
  p_default text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO public
AS $$
DECLARE
  v_raw text := btrim(COALESCE(p_stage, ''));
  v_key text := lower(regexp_replace(btrim(COALESCE(p_stage, '')), '[^a-zA-Z0-9]+', '_', 'g'));
BEGIN
  IF v_raw = '' THEN
    RETURN p_default;
  END IF;

  IF v_key IN ('dat_coc', 'coc', 'tien_coc', 'thanh_toan_dot_1', 'dot_1', 'lan_1') THEN
    RETURN 'Cọc lần 1';
  END IF;

  IF v_key IN ('thanh_toan_dot_2', 'dot_2', 'lan_2') THEN
    RETURN 'Đợt 2';
  END IF;

  IF v_key IN ('tat_toan', 'thanh_toan_het') THEN
    RETURN 'Thanh toán hết';
  END IF;

  IF v_key IN ('phat_sinh', 'thu_phat_sinh') THEN
    RETURN 'Phát sinh hợp đồng';
  END IF;

  IF v_key IN ('thu_khong_theo_dot', 'thu_ngoai_dot', 'thanh_toan_khac') THEN
    RETURN 'Thanh toán khác';
  END IF;

  IF v_raw ~ '^[a-z0-9_ -]+$' AND v_raw = lower(v_raw) THEN
    RETURN p_default;
  END IF;

  RETURN v_raw;
END;
$$;

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
      'Thanh toán còn lại',
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
  v_plan record;
  v_payment_id uuid;
  v_receipt_code text;
  v_adjustment_item_id uuid;
  v_current_remaining numeric;
  v_total numeric;
  v_paid numeric;
  v_remaining numeric;
  v_payment_status text;
  v_to_allocate numeric;
  v_alloc_amount numeric;
  v_allocated_total numeric := 0;
  v_open_plan_count integer := 0;
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

    IF p_notes IS NULL OR length(btrim(p_notes)) < 5 THEN
      RAISE EXCEPTION 'Ly do phat sinh phai co it nhat 5 ky tu.';
    END IF;
  ELSIF p_amount > v_current_remaining + 0.01 THEN
    RAISE EXCEPTION 'So tien thu vuot qua so tien con lai cua hop dong.';
  END IF;

  v_payment_id := gen_random_uuid();
  v_receipt_code := public.contract_payment_receipt_code(v_payment_id, p_payment_date);

  IF COALESCE(p_update_total, false) THEN
    INSERT INTO public.contract_items (
      contract_id,
      type,
      item_name,
      quantity,
      unit_price,
      original_price,
      discount_amount,
      total_amount,
      is_addon,
      addon_category,
      notes,
      added_by
    )
    VALUES (
      p_contract_id,
      'phat_sinh'::public.item_type_enum,
      left('Phat sinh: ' || btrim(p_notes), 120),
      1,
      p_amount,
      p_amount,
      0,
      p_amount,
      true,
      'khac'::public.addon_category_enum,
      p_notes,
      p_created_by
    )
    RETURNING id INTO v_adjustment_item_id;
  END IF;

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
    is_contract_adjustment,
    contract_adjustment_item_id
  )
  VALUES (
    v_payment_id,
    p_contract_id,
    v_contract.customer_id,
    p_amount,
    p_payment_method,
    p_payment_date,
    CASE
      WHEN COALESCE(p_update_total, false)
        THEN public.payment_stage_display_label_v2(COALESCE(NULLIF(p_payment_stage, ''), 'phat_sinh'), 'Phát sinh hợp đồng')
      ELSE public.payment_stage_display_label_v2(p_payment_stage, NULL)
    END,
    p_category_id,
    p_notes,
    v_receipt_code,
    p_created_by,
    p_created_by,
    COALESCE(p_update_total, false),
    v_adjustment_item_id
  );

  IF NOT COALESCE(p_update_total, false) THEN
    v_to_allocate := p_amount;

    SELECT COUNT(*)
    INTO v_open_plan_count
    FROM public.payment_plan_states pps
    WHERE pps.contract_id = p_contract_id
      AND COALESCE(pps.status, 'pending') <> 'cancelled'
      AND pps.remaining_amount > 0.01;

    IF v_open_plan_count = 0 THEN
      RAISE EXCEPTION 'Hop dong chua co ke hoach thanh toan dang mo. Hay chay backfill/repair payment_plans truoc khi thu.';
    END IF;

    IF p_payment_plan_id IS NOT NULL THEN
      SELECT pps.*
      INTO v_plan
      FROM public.payment_plan_states pps
      WHERE pps.id = p_payment_plan_id
        AND pps.contract_id = p_contract_id;

      IF NOT FOUND OR COALESCE(v_plan.status, 'pending') = 'cancelled' OR COALESCE(v_plan.remaining_amount, 0) <= 0 THEN
        RAISE EXCEPTION 'Dot thanh toan khong hop le hoac da dong';
      END IF;

      v_alloc_amount := LEAST(v_to_allocate, v_plan.remaining_amount);
      INSERT INTO public.payment_plan_allocations (
        contract_id,
        payment_plan_id,
        payment_id,
        amount,
        created_by
      )
      VALUES (
        p_contract_id,
        v_plan.id,
        v_payment_id,
        v_alloc_amount,
        p_created_by
      );
      v_to_allocate := v_to_allocate - v_alloc_amount;
      v_allocated_total := v_allocated_total + v_alloc_amount;
    END IF;

    FOR v_plan IN
      SELECT pps.*
      FROM public.payment_plan_states pps
      WHERE pps.contract_id = p_contract_id
        AND COALESCE(pps.status, 'pending') <> 'cancelled'
        AND pps.remaining_amount > 0.01
        AND (p_payment_plan_id IS NULL OR pps.id <> p_payment_plan_id)
      ORDER BY pps.sort_order, pps.due_date NULLS LAST, pps.created_at
    LOOP
      EXIT WHEN v_to_allocate <= 0.01;
      v_alloc_amount := LEAST(v_to_allocate, v_plan.remaining_amount);
      INSERT INTO public.payment_plan_allocations (
        contract_id,
        payment_plan_id,
        payment_id,
        amount,
        created_by
      )
      VALUES (
        p_contract_id,
        v_plan.id,
        v_payment_id,
        v_alloc_amount,
        p_created_by
      );
      v_to_allocate := v_to_allocate - v_alloc_amount;
      v_allocated_total := v_allocated_total + v_alloc_amount;
    END LOOP;

    IF v_to_allocate > 0.01 THEN
      RAISE EXCEPTION 'So tien thu vuot qua tong ke hoach thanh toan dang mo.';
    END IF;

    PERFORM public.sync_payment_plan_statuses_v2(p_contract_id);
  END IF;

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

  UPDATE public.contracts
  SET total_amount = v_total,
      paid_amount = v_paid,
      remaining_amount = v_remaining,
      payment_status = v_payment_status,
      updated_by = p_created_by,
      updated_at = now()
  WHERE id = p_contract_id;

  RETURN json_build_object(
    'payment_id', v_payment_id,
    'receipt_code', v_receipt_code,
    'adjustment_item_id', v_adjustment_item_id,
    'allocated_amount', v_allocated_total,
    'new_paid', v_paid,
    'new_remaining', v_remaining,
    'payment_status', v_payment_status,
    'total_amount', v_total
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.process_contract_payment(
  p_contract_id uuid,
  p_amount numeric,
  p_payment_method public.payment_method_enum,
  p_payment_date date,
  p_payment_stage text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_payment_plan_id uuid DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  RETURN public.process_contract_payment_v2(
    p_contract_id,
    p_amount,
    p_payment_method,
    p_payment_date,
    p_payment_stage,
    p_category_id,
    p_notes,
    p_payment_plan_id,
    false,
    p_created_by
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
  v_voided_adjustment_item_id uuid := NULL;
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

  IF COALESCE(v_payment.is_contract_adjustment, false)
    AND v_payment.contract_adjustment_item_id IS NOT NULL THEN
    UPDATE public.contract_items
    SET deleted_at = now(),
        updated_at = now()
    WHERE id = v_payment.contract_adjustment_item_id
      AND contract_id = v_payment.contract_id
      AND deleted_at IS NULL
    RETURNING id INTO v_voided_adjustment_item_id;
  END IF;

  DELETE FROM public.payment_plan_allocations
  WHERE payment_id = p_payment_id
    AND contract_id = v_payment.contract_id;

  GET DIAGNOSTICS v_restored_plans = ROW_COUNT;

  PERFORM public.sync_payment_plan_statuses_v2(v_payment.contract_id);

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
    'voided_adjustment_item_id', v_voided_adjustment_item_id,
    'restored_payment_plans', v_restored_plans,
    'new_total', v_total,
    'new_paid', v_paid,
    'new_remaining', v_remaining,
    'payment_status', v_payment_status
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.save_contract_atomic(
  p_contract jsonb,
  p_customer jsonb,
  p_items jsonb,
  p_actor_id uuid,
  p_existing_contract_id uuid DEFAULT NULL,
  p_expected_updated_at timestamp with time zone DEFAULT NULL,
  p_initial_payment jsonb DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_contract_id uuid := p_existing_contract_id;
  v_contract_code text := NULLIF(p_contract->>'contract_code', '');
  v_contract_date date := COALESCE(NULLIF(p_contract->>'contract_date', '')::date, CURRENT_DATE);
  v_work_date date := NULLIF(p_contract->>'work_date', '')::date;
  v_total numeric := COALESCE(NULLIF(p_contract->>'total_amount', '')::numeric, 0);
  v_discount numeric := COALESCE(NULLIF(p_contract->>'discount_amount', '')::numeric, 0);
  v_initial_amount numeric := 0;
  v_initial_plan_id uuid := NULL;
  v_paid numeric := 0;
  v_remaining numeric := 0;
  v_payment_status text := 'chua_thanh_toan';
  v_prefix text;
  v_next_code integer;
  v_attempt integer;
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: actor_id is required';
  END IF;

  IF p_contract IS NULL OR p_customer IS NULL THEN
    RAISE EXCEPTION 'Contract payload is required';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Contract items must be an array';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Contract must have at least one item';
  END IF;

  UPDATE public.customers
  SET bride_name = NULLIF(p_customer->>'bride_name', ''),
      groom_name = NULLIF(p_customer->>'groom_name', ''),
      bride_phone = NULLIF(p_customer->>'bride_phone', ''),
      bride_height = NULLIF(p_customer->>'bride_height', '')::integer,
      bride_weight = NULLIF(p_customer->>'bride_weight', '')::integer,
      bride_shoe_size = NULLIF(p_customer->>'bride_shoe_size', '')::integer,
      groom_phone = NULLIF(p_customer->>'groom_phone', ''),
      groom_height = NULLIF(p_customer->>'groom_height', '')::integer,
      groom_weight = NULLIF(p_customer->>'groom_weight', '')::integer,
      groom_shoe_size = NULLIF(p_customer->>'groom_shoe_size', '')::integer,
      updated_at = now()
  WHERE id = (p_customer->>'customer_id')::uuid;

  IF v_contract_id IS NOT NULL THEN
    SELECT *
    INTO v_contract
    FROM public.contracts
    WHERE id = v_contract_id
      AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Khong tim thay hop dong';
    END IF;

    IF p_expected_updated_at IS NOT NULL
       AND v_contract.updated_at IS DISTINCT FROM p_expected_updated_at THEN
      RAISE EXCEPTION 'Hop dong da duoc nguoi khac cap nhat. Vui long tai lai trang.';
    END IF;

    UPDATE public.contracts
    SET contract_code = v_contract_code,
        customer_id = (p_contract->>'customer_id')::uuid,
        service_type = (p_contract->>'service_type')::public.service_type_enum,
        transaction_type = COALESCE(NULLIF(p_contract->>'transaction_type', '')::public.transaction_type_enum, 'hop_dong'::public.transaction_type_enum),
        contract_date = v_contract_date,
        work_date = v_work_date,
        delivery_date = NULLIF(p_contract->>'delivery_date', '')::date,
        status = COALESCE(NULLIF(p_contract->>'status', ''), status),
        description = NULLIF(p_contract->>'description', ''),
        notes = NULLIF(p_contract->>'notes', ''),
        total_amount = v_total,
        discount_amount = v_discount,
        updated_by = p_actor_id,
        updated_at = now()
    WHERE id = v_contract_id;

    UPDATE public.contract_items
    SET deleted_at = now(),
        updated_at = now()
    WHERE contract_id = v_contract_id
      AND deleted_at IS NULL;
  ELSE
    FOR v_attempt IN 0..3 LOOP
      BEGIN
        INSERT INTO public.contracts (
          contract_code,
          customer_id,
          service_type,
          transaction_type,
          contract_date,
          work_date,
          delivery_date,
          status,
          description,
          notes,
          total_amount,
          discount_amount,
          paid_amount,
          remaining_amount,
          payment_status,
          created_by,
          updated_by
        )
        VALUES (
          v_contract_code,
          (p_contract->>'customer_id')::uuid,
          (p_contract->>'service_type')::public.service_type_enum,
          COALESCE(NULLIF(p_contract->>'transaction_type', '')::public.transaction_type_enum, 'hop_dong'::public.transaction_type_enum),
          v_contract_date,
          v_work_date,
          NULLIF(p_contract->>'delivery_date', '')::date,
          COALESCE(NULLIF(p_contract->>'status', ''), 'cho_xu_ly'),
          NULLIF(p_contract->>'description', ''),
          NULLIF(p_contract->>'notes', ''),
          v_total,
          v_discount,
          0,
          v_total,
          'chua_thanh_toan',
          p_actor_id,
          p_actor_id
        )
        RETURNING * INTO v_contract;

        v_contract_id := v_contract.id;
        v_contract_code := v_contract.contract_code;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        IF v_attempt = 3 THEN
          RAISE EXCEPTION 'Ma hop dong da ton tai. Vui long tai lai trang.';
        END IF;

        v_prefix := substring(v_contract_code from '^(.*-)[0-9]+$');
        IF v_prefix IS NULL THEN
          v_prefix := v_contract_code || '-';
        END IF;

        SELECT COALESCE(MAX(((regexp_match(contract_code, '([0-9]+)$'))[1])::integer), 0) + 1
        INTO v_next_code
        FROM public.contracts
        WHERE contract_code LIKE v_prefix || '%';

        v_contract_code := v_prefix || lpad((v_next_code + v_attempt)::text, 4, '0');
      END;
    END LOOP;
  END IF;

  INSERT INTO public.contract_items (
    contract_id,
    type,
    item_name,
    service_id,
    dress_id,
    export_type,
    quantity,
    unit_price,
    original_price,
    discount_amount,
    total_amount,
    is_addon,
    addon_category,
    notes,
    added_by
  )
  SELECT
    v_contract_id,
    COALESCE(NULLIF(item_row."type", '')::public.item_type_enum, 'dich_vu'::public.item_type_enum),
    item_row.item_name,
    NULLIF(item_row.service_id, '')::uuid,
    NULLIF(item_row.dress_id, '')::uuid,
    NULLIF(item_row.export_type, '')::public.export_type_enum,
    COALESCE(item_row.quantity, 1),
    COALESCE(item_row.unit_price, 0),
    item_row.original_price,
    COALESCE(item_row.discount_amount, 0),
    COALESCE(item_row.total_amount, 0),
    COALESCE(item_row.is_addon, false),
    NULLIF(item_row.addon_category, '')::public.addon_category_enum,
    NULLIF(item_row.notes, ''),
    p_actor_id
  FROM jsonb_to_recordset(p_items) AS item_row(
    "type" text,
    item_name text,
    service_id text,
    dress_id text,
    export_type text,
    quantity numeric,
    unit_price numeric,
    original_price numeric,
    discount_amount numeric,
    total_amount numeric,
    is_addon boolean,
    addon_category text,
    notes text
  );

  IF p_existing_contract_id IS NULL THEN
    v_initial_amount := CASE
      WHEN p_initial_payment IS NOT NULL AND jsonb_typeof(p_initial_payment) = 'object'
        THEN GREATEST(0, COALESCE(NULLIF(p_initial_payment->>'amount', '')::numeric, 0))
      ELSE 0
    END;

    v_initial_plan_id := public.create_default_payment_schedule_v2(
      v_contract_id,
      v_total,
      v_initial_amount,
      NULLIF(p_initial_payment->>'payment_stage', ''),
      v_contract_date,
      v_work_date
    );
  END IF;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_paid
  FROM public.payments
  WHERE contract_id = v_contract_id
    AND deleted_at IS NULL;

  v_remaining := GREATEST(0, v_total - v_paid);
  v_payment_status := CASE
    WHEN v_paid <= 0 THEN 'chua_thanh_toan'
    WHEN v_remaining <= 0 THEN 'da_thanh_toan'
    WHEN v_paid < (v_total * 0.5) THEN 'da_coc'
    ELSE 'thanh_toan_mot_phan'
  END;

  UPDATE public.contracts
  SET paid_amount = v_paid,
      remaining_amount = v_remaining,
      payment_status = v_payment_status,
      updated_by = p_actor_id,
      updated_at = now()
  WHERE id = v_contract_id;

  IF p_existing_contract_id IS NULL
     AND p_initial_payment IS NOT NULL
     AND jsonb_typeof(p_initial_payment) = 'object'
     AND v_initial_amount > 0 THEN
    PERFORM public.process_contract_payment_v2(
      v_contract_id,
      v_initial_amount,
      (p_initial_payment->>'payment_method')::public.payment_method_enum,
      COALESCE(NULLIF(p_initial_payment->>'payment_date', '')::date, v_contract_date),
      NULLIF(p_initial_payment->>'payment_stage', ''),
      NULLIF(p_initial_payment->>'category_id', '')::uuid,
      NULL,
      v_initial_plan_id,
      false,
      p_actor_id
    );
  END IF;

  SELECT paid_amount, remaining_amount, payment_status, contract_code
  INTO v_paid, v_remaining, v_payment_status, v_contract_code
  FROM public.contracts
  WHERE id = v_contract_id;

  RETURN json_build_object(
    'id', v_contract_id,
    'contract_code', v_contract_code,
    'paid_amount', v_paid,
    'remaining_amount', v_remaining,
    'payment_status', v_payment_status
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.backfill_payment_plan_ssot_v2()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_contract record;
  v_payment record;
  v_plan_id uuid;
  v_plan_count integer;
  v_plan_total numeric;
  v_sort_order integer;
  v_rows integer;
  v_created_plans integer := 0;
  v_created_allocations integer := 0;
BEGIN
  FOR v_contract IN
    SELECT id, total_amount, paid_amount, remaining_amount, contract_date, work_date
    FROM public.contracts
    WHERE deleted_at IS NULL
      AND COALESCE(total_amount, 0) > 0
  LOOP
    SELECT COUNT(*), COALESCE(SUM(amount), 0)
    INTO v_plan_count, v_plan_total
    FROM public.payment_plans
    WHERE contract_id = v_contract.id
      AND COALESCE(status, 'pending') <> 'cancelled';

    IF v_plan_count = 0 THEN
      v_sort_order := 10;

      FOR v_payment IN
        SELECT id, amount, payment_date, payment_stage, created_by, created_at
        FROM public.payments
        WHERE contract_id = v_contract.id
          AND deleted_at IS NULL
          AND COALESCE(is_contract_adjustment, false) = false
        ORDER BY payment_date, created_at
      LOOP
        INSERT INTO public.payment_plans (
          contract_id,
          stage_name,
          stage_key,
          amount,
          due_date,
          status,
          receipt_id,
          sort_order
        )
        VALUES (
          v_contract.id,
          public.payment_stage_display_label_v2(
            v_payment.payment_stage,
            CASE
              WHEN COALESCE(v_contract.remaining_amount, 0) <= 0 THEN 'Thanh toán hết'
              WHEN v_sort_order = 10 THEN 'Cọc lần 1'
              ELSE 'Thanh toán'
            END
          ),
          CASE
            WHEN COALESCE(v_contract.remaining_amount, 0) <= 0 THEN 'final'
            WHEN v_sort_order = 10 THEN 'deposit'
            ELSE 'custom'
          END,
          v_payment.amount,
          v_payment.payment_date,
          'pending',
          v_payment.id,
          v_sort_order
        )
        RETURNING id INTO v_plan_id;

        INSERT INTO public.payment_plan_allocations (
          contract_id,
          payment_plan_id,
          payment_id,
          amount,
          created_by
        )
        VALUES (
          v_contract.id,
          v_plan_id,
          v_payment.id,
          v_payment.amount,
          v_payment.created_by
        )
        ON CONFLICT (payment_plan_id, payment_id) DO NOTHING;

        v_created_plans := v_created_plans + 1;
        v_created_allocations := v_created_allocations + 1;
        v_sort_order := v_sort_order + 10;
      END LOOP;

      IF COALESCE(v_contract.remaining_amount, 0) > 0 THEN
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
          v_contract.id,
          'Thanh toán còn lại',
          'remaining',
          v_contract.remaining_amount,
          COALESCE(v_contract.work_date, v_contract.contract_date, CURRENT_DATE),
          'pending',
          v_sort_order
        );
        v_created_plans := v_created_plans + 1;
      ELSIF COALESCE(v_contract.paid_amount, 0) <= 0 THEN
        PERFORM public.create_default_payment_schedule_v2(
          v_contract.id,
          v_contract.total_amount,
          0,
          NULL,
          COALESCE(v_contract.contract_date, CURRENT_DATE),
          v_contract.work_date
        );
        v_created_plans := v_created_plans + 1;
      END IF;
    ELSE
      INSERT INTO public.payment_plan_allocations (
        contract_id,
        payment_plan_id,
        payment_id,
        amount,
        created_by
      )
      SELECT
        pp.contract_id,
        pp.id,
        pp.receipt_id,
        LEAST(pp.amount, COALESCE(p.amount, pp.amount)),
        p.created_by
      FROM public.payment_plans pp
      JOIN public.payments p ON p.id = pp.receipt_id AND p.deleted_at IS NULL
      WHERE pp.contract_id = v_contract.id
        AND pp.receipt_id IS NOT NULL
      ON CONFLICT (payment_plan_id, payment_id) DO NOTHING;

      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_created_allocations := v_created_allocations + v_rows;

      SELECT COALESCE(SUM(amount), 0)
      INTO v_plan_total
      FROM public.payment_plans
      WHERE contract_id = v_contract.id
        AND COALESCE(status, 'pending') <> 'cancelled';

      IF COALESCE(v_contract.total_amount, 0) - v_plan_total > 0.01 THEN
        SELECT COALESCE(MAX(sort_order), 0) + 10
        INTO v_sort_order
        FROM public.payment_plans
        WHERE contract_id = v_contract.id;

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
          v_contract.id,
          'Thanh toán còn lại',
          'remaining',
          COALESCE(v_contract.total_amount, 0) - v_plan_total,
          COALESCE(v_contract.work_date, v_contract.contract_date, CURRENT_DATE),
          'pending',
          v_sort_order
        );
        v_created_plans := v_created_plans + 1;
      END IF;
    END IF;

    PERFORM public.sync_payment_plan_statuses_v2(v_contract.id);
  END LOOP;

  RETURN json_build_object(
    'created_plans', v_created_plans,
    'created_allocations', v_created_allocations
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.contract_payment_health_checks()
RETURNS TABLE (
  check_name text,
  issue_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  WITH payment_sums AS (
    SELECT contract_id, SUM(amount) AS paid_sum
    FROM public.payments
    WHERE deleted_at IS NULL
      AND contract_id IS NOT NULL
    GROUP BY contract_id
  ),
  adjustment_sums AS (
    SELECT contract_id, SUM(amount) AS adjustment_sum
    FROM public.payments
    WHERE deleted_at IS NULL
      AND contract_id IS NOT NULL
      AND COALESCE(is_contract_adjustment, false) IS TRUE
    GROUP BY contract_id
  ),
  plan_sums AS (
    SELECT contract_id, SUM(amount) AS plan_total
    FROM public.payment_plans
    WHERE COALESCE(status, 'pending') <> 'cancelled'
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
    'active_contracts_missing_payment_plan'::text AS check_name,
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
    'contract_plan_total_mismatch'::text AS check_name,
    COUNT(*)::bigint AS issue_count
  FROM public.contracts c
  LEFT JOIN plan_sums ps ON ps.contract_id = c.id
  LEFT JOIN adjustment_sums adj ON adj.contract_id = c.id
  WHERE c.deleted_at IS NULL
    AND COALESCE(c.status, '') <> 'da_huy'
    AND COALESCE(c.total_amount, 0) > 0
    AND ABS(
      COALESCE(ps.plan_total, 0)
      - GREATEST(0, COALESCE(c.total_amount, 0) - COALESCE(adj.adjustment_sum, 0))
    ) > 0.01

  UNION ALL

  SELECT
    'contract_payments_missing_receipt_code'::text AS check_name,
    COUNT(*)::bigint AS issue_count
  FROM public.payments
  WHERE deleted_at IS NULL
    AND contract_id IS NOT NULL
    AND (receipt_code IS NULL OR btrim(receipt_code) = '')

  UNION ALL

  SELECT
    'contract_payments_pending_after_debt_update'::text AS check_name,
    COUNT(*)::bigint AS issue_count
  FROM public.payments
  WHERE deleted_at IS NULL
    AND contract_id IS NOT NULL
    AND approved_by IS NULL

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
    'payment_plan_status_allocation_mismatch'::text AS check_name,
    COUNT(*)::bigint AS issue_count
  FROM public.payment_plan_states pps
  WHERE COALESCE(pps.status, 'pending') <> 'cancelled'
    AND COALESCE(pps.status, 'pending') <> CASE
      WHEN COALESCE(pps.paid_amount, 0) <= 0 THEN 'pending'
      WHEN COALESCE(pps.paid_amount, 0) + 0.01 >= COALESCE(pps.amount, 0) THEN 'paid'
      ELSE 'partial'
    END

  UNION ALL

  SELECT
    'paid_payment_plans_without_allocation'::text AS check_name,
    COUNT(*)::bigint AS issue_count
  FROM public.payment_plan_states pps
  WHERE COALESCE(pps.status, '') = 'paid'
    AND COALESCE(pps.paid_amount, 0) <= 0

  UNION ALL

  SELECT
    'contract_fully_paid_with_open_plans'::text AS check_name,
    COUNT(*)::bigint AS issue_count
  FROM public.contracts c
  WHERE c.deleted_at IS NULL
    AND COALESCE(c.remaining_amount, 0) <= 0
    AND EXISTS (
      SELECT 1
      FROM public.payment_plan_states pps
      WHERE pps.contract_id = c.id
        AND COALESCE(pps.status, 'pending') NOT IN ('paid', 'cancelled')
        AND COALESCE(pps.remaining_amount, 0) > 0.01
    )

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

  SELECT
    'contract_remaining_amount_mismatch'::text AS check_name,
    COUNT(*)::bigint AS issue_count
  FROM public.contracts c
  WHERE c.deleted_at IS NULL
    AND ABS(
      COALESCE(c.remaining_amount, 0)
      - GREATEST(0, COALESCE(c.total_amount, 0) - COALESCE(c.paid_amount, 0))
    ) > 0.01;
$$;

REVOKE ALL ON FUNCTION public.contract_payment_health_checks() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.contract_payment_health_checks() TO service_role;

SELECT public.backfill_payment_plan_ssot_v2();

COMMIT;
