-- Contracts production hardening:
-- - service_role-only SECURITY DEFINER RPCs with fixed search_path
-- - atomic contract save for create/edit/items/initial payment
-- - payment RPC supports updateTotal for contract add-ons
-- - cancelled payment plans are represented consistently

BEGIN;

ALTER TABLE public.payment_plans
  DROP CONSTRAINT IF EXISTS payment_plans_status_check;

ALTER TABLE public.payment_plans
  ADD CONSTRAINT payment_plans_status_check
  CHECK (status = ANY (ARRAY['pending', 'paid', 'overdue', 'cancelled']));

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
  v_payment_id uuid;
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
    contract_id,
    customer_id,
    amount,
    payment_method,
    payment_date,
    payment_stage,
    category_id,
    notes,
    created_by
  )
  VALUES (
    p_contract_id,
    v_contract.customer_id,
    p_amount,
    p_payment_method,
    p_payment_date,
    p_payment_stage,
    p_category_id,
    p_notes,
    p_created_by
  )
  RETURNING id INTO v_payment_id;

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
  v_total numeric := COALESCE(NULLIF(p_contract->>'total_amount', '')::numeric, 0);
  v_discount numeric := COALESCE(NULLIF(p_contract->>'discount_amount', '')::numeric, 0);
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
        work_date = NULLIF(p_contract->>'work_date', '')::date,
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
          NULLIF(p_contract->>'work_date', '')::date,
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
     AND COALESCE(NULLIF(p_initial_payment->>'amount', '')::numeric, 0) > 0 THEN
    PERFORM public.process_contract_payment_v2(
      v_contract_id,
      COALESCE(NULLIF(p_initial_payment->>'amount', '')::numeric, 0),
      (p_initial_payment->>'payment_method')::public.payment_method_enum,
      COALESCE(NULLIF(p_initial_payment->>'payment_date', '')::date, v_contract_date),
      NULLIF(p_initial_payment->>'payment_stage', ''),
      NULLIF(p_initial_payment->>'category_id', '')::uuid,
      NULL,
      NULL,
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

CREATE OR REPLACE FUNCTION public.cancel_contract_cascade(
  p_contract_id uuid,
  p_reason text,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_contract public.contracts%ROWTYPE;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: actor_id is required';
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
    RETURN;
  END IF;

  UPDATE public.contracts
  SET status = 'da_huy',
      cancel_reason = NULLIF(p_reason, ''),
      cancelled_at = now(),
      cancelled_by = p_user_id,
      updated_by = p_user_id,
      updated_at = now()
  WHERE id = p_contract_id;

  UPDATE public.work_tasks
  SET status = 'da_huy',
      updated_at = now()
  WHERE contract_id = p_contract_id
    AND COALESCE(status, '') <> 'hoan_thanh';

  UPDATE public.printing_orders
  SET status = 'da_huy',
      updated_by = p_user_id,
      updated_at = now()
  WHERE contract_id = p_contract_id
    AND deleted_at IS NULL
    AND COALESCE(status, '') NOT IN ('hoan_thanh', 'da_huy');

  UPDATE public.payment_plans
  SET status = 'cancelled'
  WHERE contract_id = p_contract_id
    AND COALESCE(status, 'pending') NOT IN ('paid', 'cancelled');
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_contract_cascade(
  p_contract_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: actor_id is required';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.payments
    WHERE contract_id = p_contract_id
      AND deleted_at IS NULL
      AND amount > 0
  ) THEN
    RAISE EXCEPTION 'Hop dong da co phieu thu, chi duoc huy thay vi xoa';
  END IF;

  UPDATE public.contract_items
  SET deleted_at = now(),
      updated_at = now()
  WHERE contract_id = p_contract_id
    AND deleted_at IS NULL;

  UPDATE public.contract_events
  SET deleted_at = now(),
      updated_at = now()
  WHERE contract_id = p_contract_id
    AND deleted_at IS NULL;

  UPDATE public.work_tasks
  SET status = 'da_huy',
      updated_at = now()
  WHERE contract_id = p_contract_id
    AND COALESCE(status, '') <> 'hoan_thanh';

  UPDATE public.dress_reservations
  SET status = 'cancelled',
      updated_at = now()
  WHERE contract_id = p_contract_id
    AND COALESCE(status, '') <> 'cancelled';

  UPDATE public.printing_orders
  SET deleted_at = now(),
      updated_by = p_user_id,
      updated_at = now()
  WHERE contract_id = p_contract_id
    AND deleted_at IS NULL;

  UPDATE public.payment_plans
  SET status = 'cancelled'
  WHERE contract_id = p_contract_id
    AND COALESCE(status, 'pending') NOT IN ('paid', 'cancelled');

  UPDATE public.contracts
  SET deleted_at = now(),
      updated_by = p_user_id,
      updated_at = now()
  WHERE id = p_contract_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Khong tim thay hop dong';
  END IF;
END;
$$;

ALTER FUNCTION public.recalc_contract_totals(uuid) SECURITY DEFINER;
ALTER FUNCTION public.recalc_contract_totals(uuid) SET search_path TO public;

REVOKE ALL ON FUNCTION public.process_contract_payment(uuid, numeric, public.payment_method_enum, date, text, uuid, text, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_contract_payment_v2(uuid, numeric, public.payment_method_enum, date, text, uuid, text, uuid, boolean, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_contract_atomic(jsonb, jsonb, jsonb, uuid, uuid, timestamp with time zone, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_contract_cascade(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_contract_cascade(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalc_contract_totals(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.process_contract_payment(uuid, numeric, public.payment_method_enum, date, text, uuid, text, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_contract_payment_v2(uuid, numeric, public.payment_method_enum, date, text, uuid, text, uuid, boolean, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_contract_atomic(jsonb, jsonb, jsonb, uuid, uuid, timestamp with time zone, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_contract_cascade(uuid, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_contract_cascade(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.recalc_contract_totals(uuid) TO service_role;

COMMIT;
