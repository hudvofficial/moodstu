-- Fix save_contract_atomic RPC to include assigned_to and wedding_date

BEGIN;

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
      wedding_date = NULLIF(p_customer->>'wedding_date', '')::date,
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
        assigned_to = NULLIF(p_contract->>'assigned_to', '')::uuid,
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
          assigned_to,
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
          NULLIF(p_contract->>'assigned_to', '')::uuid,
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

COMMIT;
