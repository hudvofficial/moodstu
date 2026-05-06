-- Contract payment flexible stages.
-- Stages are operational milestones; payment amounts are entered per receipt.
-- payment_plans.amount > 0 remains supported as an optional planned/legacy amount.

CREATE OR REPLACE FUNCTION public.payment_stage_key_v2(p_stage text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO public
AS $$
DECLARE
  v_raw text := lower(btrim(COALESCE(p_stage, '')));
  v_key text;
BEGIN
  IF v_raw = '' THEN
    RETURN NULL;
  END IF;

  v_key := replace(v_raw, 'đ', 'd');
  v_key := regexp_replace(v_key, '[^a-z0-9]+', '_', 'g');
  v_key := regexp_replace(v_key, '^_+|_+$', '', 'g');

  IF v_key IN ('dat_coc', 'coc', 'tien_coc', 'deposit', 'contract_deposit')
     OR v_raw LIKE '%cọc%'
     OR v_raw LIKE '%coc%' THEN
    RETURN 'deposit';
  END IF;

  IF v_key IN ('thanh_toan_dot_1', 'dot_1', 'lan_1', 'first', 'installment_1', 'stage_1')
     OR v_raw LIKE '%đợt 1%'
     OR v_raw LIKE '%dot 1%'
     OR v_raw LIKE '%lần 1%'
     OR v_raw LIKE '%lan 1%' THEN
    RETURN 'installment_1';
  END IF;

  IF v_key IN ('thanh_toan_dot_2', 'dot_2', 'lan_2', 'second', 'installment_2', 'stage_2')
     OR v_raw LIKE '%đợt 2%'
     OR v_raw LIKE '%dot 2%'
     OR v_raw LIKE '%lần 2%'
     OR v_raw LIKE '%lan 2%' THEN
    RETURN 'installment_2';
  END IF;

  IF v_key IN ('tat_toan', 'final', 'remaining', 'thanh_toan_het', 'thanh_toan_con_lai', 'con_lai')
     OR v_raw LIKE '%tất toán%'
     OR v_raw LIKE '%tat toan%'
     OR v_raw LIKE '%thanh toán hết%'
     OR v_raw LIKE '%thanh toan het%'
     OR v_raw LIKE '%còn lại%'
     OR v_raw LIKE '%con lai%' THEN
    RETURN 'final';
  END IF;

  IF v_key IN ('outside', 'thu_ngoai_dot', 'ngoai_dot', 'thu_khong_theo_dot', 'thanh_toan_khac', 'custom')
     OR v_raw LIKE '%ngoài đợt%'
     OR v_raw LIKE '%ngoai dot%'
     OR v_raw LIKE '%không theo đợt%'
     OR v_raw LIKE '%khong theo dot%' THEN
    RETURN 'outside';
  END IF;

  IF v_key IN ('phat_sinh', 'adjustment', 'contract_adjustment') THEN
    RETURN 'adjustment';
  END IF;

  RETURN v_key;
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
  v_key text := public.payment_stage_key_v2(p_stage);
BEGIN
  IF v_key = 'deposit' THEN
    RETURN 'Cọc';
  ELSIF v_key = 'installment_1' THEN
    RETURN 'Đợt 1';
  ELSIF v_key = 'installment_2' THEN
    RETURN 'Đợt 2';
  ELSIF v_key = 'final' THEN
    RETURN 'Tất toán';
  ELSIF v_key = 'outside' THEN
    RETURN 'Thu ngoài đợt';
  ELSIF v_key = 'adjustment' THEN
    RETURN 'Phát sinh hợp đồng';
  END IF;

  RETURN COALESCE(NULLIF(p_default, ''), NULLIF(p_stage, ''), 'Thanh toán hợp đồng');
END;
$$;

UPDATE public.payment_plans
SET stage_key = public.payment_stage_key_v2(COALESCE(stage_key, stage_name)),
    stage_name = public.payment_stage_display_label_v2(COALESCE(stage_key, stage_name), stage_name)
WHERE COALESCE(status, 'pending') <> 'cancelled';

CREATE OR REPLACE VIEW public.payment_plan_states AS
SELECT
  pp.id,
  pp.contract_id,
  pp.stage_name,
  pp.stage_key,
  pp.sort_order,
  pp.amount,
  COALESCE(SUM(ppa.amount) FILTER (WHERE p.deleted_at IS NULL), 0)::numeric AS paid_amount,
  CASE
    WHEN COALESCE(pp.amount, 0) > 0 THEN
      GREATEST(0, pp.amount - COALESCE(SUM(ppa.amount) FILTER (WHERE p.deleted_at IS NULL), 0))::numeric
    ELSE 0::numeric
  END AS remaining_amount,
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
  WITH plan_sums AS (
    SELECT
      pp.id AS payment_plan_id,
      COALESCE(SUM(ppa.amount) FILTER (WHERE p.deleted_at IS NULL), 0) AS paid_amount,
      (
        SELECT ppa2.payment_id
        FROM public.payment_plan_allocations ppa2
        JOIN public.payments p2 ON p2.id = ppa2.payment_id AND p2.deleted_at IS NULL
        WHERE ppa2.payment_plan_id = pp.id
        ORDER BY p2.payment_date DESC, p2.created_at DESC
        LIMIT 1
      ) AS latest_payment_id
    FROM public.payment_plans pp
    LEFT JOIN public.payment_plan_allocations ppa ON ppa.payment_plan_id = pp.id
    LEFT JOIN public.payments p ON p.id = ppa.payment_id
    WHERE pp.contract_id = p_contract_id
    GROUP BY pp.id
  )
  UPDATE public.payment_plans pp
  SET status = CASE
        WHEN COALESCE(pp.status, 'pending') = 'cancelled' THEN 'cancelled'
        WHEN COALESCE(ps.paid_amount, 0) <= 0 THEN 'pending'
        WHEN COALESCE(pp.amount, 0) > 0
          AND COALESCE(ps.paid_amount, 0) + 0.01 >= COALESCE(pp.amount, 0)
          THEN 'paid'
        ELSE 'partial'
      END,
      receipt_id = CASE
        WHEN COALESCE(pp.status, 'pending') = 'cancelled' THEN pp.receipt_id
        WHEN COALESCE(pp.amount, 0) > 0
          AND COALESCE(ps.paid_amount, 0) + 0.01 >= COALESCE(pp.amount, 0)
          THEN ps.latest_payment_id
        ELSE NULL
      END
  FROM plan_sums ps
  WHERE pp.id = ps.payment_plan_id
    AND pp.contract_id = p_contract_id;
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
BEGIN
  IF p_contract_id IS NULL THEN
    RAISE EXCEPTION 'Contract id is required';
  END IF;

  SELECT id
  INTO v_initial_plan_id
  FROM public.payment_plans
  WHERE contract_id = p_contract_id
    AND COALESCE(status, 'pending') <> 'cancelled'
  ORDER BY sort_order, created_at
  LIMIT 1;

  IF v_initial_plan_id IS NOT NULL THEN
    RETURN v_initial_plan_id;
  END IF;

  IF COALESCE(p_total, 0) <= 0 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.payment_plans (
    contract_id, stage_name, stage_key, amount, due_date, status, sort_order
  )
  VALUES
    (p_contract_id, 'Cọc', 'deposit', 0, COALESCE(p_contract_date, CURRENT_DATE), 'pending', 10),
    (p_contract_id, 'Đợt 1', 'installment_1', 0, NULL, 'pending', 20),
    (p_contract_id, 'Đợt 2', 'installment_2', 0, NULL, 'pending', 30),
    (p_contract_id, 'Tất toán', 'final', 0, COALESCE(p_work_date, p_contract_date, CURRENT_DATE), 'pending', 40);

  SELECT id
  INTO v_initial_plan_id
  FROM public.payment_plans
  WHERE contract_id = p_contract_id
    AND stage_key = CASE
      WHEN COALESCE(p_initial_amount, 0) >= COALESCE(p_total, 0) THEN 'final'
      ELSE COALESCE(public.payment_stage_key_v2(p_initial_stage), 'deposit')
    END
  ORDER BY sort_order, created_at
  LIMIT 1;

  IF v_initial_plan_id IS NULL THEN
    SELECT id
    INTO v_initial_plan_id
    FROM public.payment_plans
    WHERE contract_id = p_contract_id
      AND stage_key = 'deposit'
    ORDER BY sort_order, created_at
    LIMIT 1;
  END IF;

  RETURN v_initial_plan_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.contract_payment_status_v2(
  p_paid numeric,
  p_remaining numeric
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO public
AS $$
  SELECT CASE
    WHEN COALESCE(p_paid, 0) <= 0 THEN 'chua_thanh_toan'
    WHEN COALESCE(p_remaining, 0) <= 0 THEN 'da_thanh_toan'
    ELSE 'thanh_toan_mot_phan'
  END;
$$;

CREATE OR REPLACE FUNCTION public.trg_contract_payment_status_v2()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO public
AS $$
BEGIN
  NEW.paid_amount := GREATEST(0, COALESCE(NEW.paid_amount, 0));
  NEW.remaining_amount := GREATEST(0, COALESCE(NEW.total_amount, 0) - NEW.paid_amount);
  NEW.payment_status := public.contract_payment_status_v2(NEW.paid_amount, NEW.remaining_amount);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contract_payment_status_v2 ON public.contracts;
CREATE TRIGGER trg_contract_payment_status_v2
BEFORE INSERT OR UPDATE OF total_amount, paid_amount, remaining_amount
ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.trg_contract_payment_status_v2();

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
  v_target_plan public.payment_plans%ROWTYPE;
  v_payment_id uuid;
  v_receipt_code text;
  v_adjustment_item_id uuid;
  v_current_remaining numeric;
  v_total numeric;
  v_paid numeric;
  v_remaining numeric;
  v_payment_status text;
  v_stage_key text := public.payment_stage_key_v2(p_payment_stage);
  v_active_plan_count integer := 0;
  v_payment_stage_label text;
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
  ELSE
    IF p_amount > v_current_remaining + 0.01 THEN
      RAISE EXCEPTION 'So tien thu vuot qua so tien con lai cua hop dong.';
    END IF;

    SELECT COUNT(*)
    INTO v_active_plan_count
    FROM public.payment_plans
    WHERE contract_id = p_contract_id
      AND COALESCE(status, 'pending') NOT IN ('cancelled', 'paid', 'closed');

    IF v_active_plan_count = 0 THEN
      PERFORM public.create_default_payment_schedule_v2(
        p_contract_id,
        COALESCE(v_contract.total_amount, 0),
        0,
        NULL,
        COALESCE(v_contract.contract_date, CURRENT_DATE),
        v_contract.work_date
      );
    END IF;

    IF p_payment_plan_id IS NOT NULL THEN
      SELECT *
      INTO v_target_plan
      FROM public.payment_plans
      WHERE id = p_payment_plan_id
        AND contract_id = p_contract_id
        AND COALESCE(status, 'pending') NOT IN ('cancelled', 'paid', 'closed')
      ORDER BY sort_order, created_at
      LIMIT 1;
    ELSIF v_stage_key = 'outside' THEN
      SELECT *
      INTO v_target_plan
      FROM public.payment_plans
      WHERE contract_id = p_contract_id
        AND stage_key = 'outside'
        AND COALESCE(status, 'pending') <> 'cancelled'
      ORDER BY sort_order, created_at
      LIMIT 1;

      IF NOT FOUND THEN
        INSERT INTO public.payment_plans (
          contract_id, stage_name, stage_key, amount, due_date, status, sort_order
        )
        VALUES (
          p_contract_id,
          'Thu ngoài đợt',
          'outside',
          0,
          p_payment_date,
          'pending',
          90
        )
        RETURNING * INTO v_target_plan;
      END IF;
    ELSIF v_stage_key IS NOT NULL THEN
      SELECT *
      INTO v_target_plan
      FROM public.payment_plans
      WHERE contract_id = p_contract_id
        AND stage_key = v_stage_key
        AND COALESCE(status, 'pending') NOT IN ('cancelled', 'paid', 'closed')
      ORDER BY sort_order, created_at
      LIMIT 1;
    END IF;

    IF v_target_plan.id IS NULL THEN
      SELECT pp.*
      INTO v_target_plan
      FROM public.payment_plans pp
      LEFT JOIN (
        SELECT ppa.payment_plan_id, SUM(ppa.amount) AS paid_amount
        FROM public.payment_plan_allocations ppa
        JOIN public.payments p ON p.id = ppa.payment_id AND p.deleted_at IS NULL
        WHERE ppa.contract_id = p_contract_id
        GROUP BY ppa.payment_plan_id
      ) s ON s.payment_plan_id = pp.id
      WHERE pp.contract_id = p_contract_id
        AND COALESCE(pp.status, 'pending') NOT IN ('cancelled', 'paid', 'closed')
      ORDER BY
        CASE WHEN COALESCE(s.paid_amount, 0) <= 0 THEN 0 ELSE 1 END,
        pp.sort_order,
        pp.created_at
      LIMIT 1;
    END IF;

    IF v_target_plan.id IS NULL THEN
      RAISE EXCEPTION 'Hop dong chua co stage thanh toan dang mo. Hay repair payment_plans truoc khi thu.';
    END IF;
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

  v_payment_stage_label := CASE
    WHEN COALESCE(p_update_total, false)
      THEN public.payment_stage_display_label_v2(COALESCE(NULLIF(p_payment_stage, ''), 'phat_sinh'), 'Phát sinh hợp đồng')
    ELSE public.payment_stage_display_label_v2(
      COALESCE(NULLIF(p_payment_stage, ''), v_target_plan.stage_key, v_target_plan.stage_name),
      v_target_plan.stage_name
    )
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
    v_payment_stage_label,
    p_category_id,
    p_notes,
    v_receipt_code,
    p_created_by,
    p_created_by,
    COALESCE(p_update_total, false),
    v_adjustment_item_id
  );

  IF NOT COALESCE(p_update_total, false) THEN
    INSERT INTO public.payment_plan_allocations (
      contract_id,
      payment_plan_id,
      payment_id,
      amount,
      created_by
    )
    VALUES (
      p_contract_id,
      v_target_plan.id,
      v_payment_id,
      p_amount,
      p_created_by
    );

    PERFORM public.sync_payment_plan_statuses_v2(p_contract_id);
  END IF;

  v_total := COALESCE(v_contract.total_amount, 0)
    + CASE WHEN COALESCE(p_update_total, false) THEN p_amount ELSE 0 END;
  v_paid := COALESCE(v_contract.paid_amount, 0) + p_amount;
  v_remaining := GREATEST(0, v_total - v_paid);
  v_payment_status := public.contract_payment_status_v2(v_paid, v_remaining);

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
    'new_total', v_total,
    'new_paid', v_paid,
    'new_remaining', v_remaining,
    'payment_status', v_payment_status,
    'payment_plan_id', CASE WHEN COALESCE(p_update_total, false) THEN NULL ELSE v_target_plan.id END
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
  v_payment_status := public.contract_payment_status_v2(v_paid, v_remaining);

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
    AND ABS(COALESCE(c.paid_amount, 0) - COALESCE(p.paid_sum, 0)) > 0.01;
$$;

REVOKE ALL ON FUNCTION public.payment_stage_key_v2(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.payment_stage_display_label_v2(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.contract_payment_status_v2(numeric, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_contract_payment_v2(uuid, numeric, public.payment_method_enum, date, text, uuid, text, uuid, boolean, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.void_contract_payment_v2(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.contract_payment_health_checks() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.payment_stage_key_v2(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.payment_stage_display_label_v2(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.contract_payment_status_v2(numeric, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_contract_payment_v2(uuid, numeric, public.payment_method_enum, date, text, uuid, text, uuid, boolean, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.void_contract_payment_v2(uuid, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.contract_payment_health_checks() TO service_role;
