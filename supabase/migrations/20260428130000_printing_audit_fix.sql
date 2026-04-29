-- Printing audit fix: access-safe RPCs, accounting links, and lab payment allocation.

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS printing_order_id uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'expenses_printing_order_id_fkey'
  ) THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT expenses_printing_order_id_fkey
      FOREIGN KEY (printing_order_id)
      REFERENCES public.printing_orders(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_expenses_active_printing_order
  ON public.expenses(printing_order_id)
  WHERE deleted_at IS NULL AND printing_order_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.lab_payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.lab_payments(id) ON DELETE CASCADE,
  printing_order_id uuid NOT NULL REFERENCES public.printing_orders(id),
  amount numeric NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES auth.users(id),
  CONSTRAINT lab_payment_allocations_payment_order_key UNIQUE(payment_id, printing_order_id)
);

CREATE INDEX IF NOT EXISTS idx_lab_payment_allocations_order
  ON public.lab_payment_allocations(printing_order_id);

CREATE INDEX IF NOT EXISTS idx_lab_payment_allocations_payment
  ON public.lab_payment_allocations(payment_id);

CREATE SEQUENCE IF NOT EXISTS public.printing_order_code_seq START WITH 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.printing_orders
    WHERE order_code IS NOT NULL
      AND deleted_at IS NULL
    GROUP BY order_code
    HAVING COUNT(*) > 1
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_printing_orders_active_order_code_unique ON public.printing_orders(order_code) WHERE deleted_at IS NULL AND order_code IS NOT NULL';
  END IF;
END $$;

DO $$
DECLARE
  v_category_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.transaction_categories
    WHERE type = 'chi'
      AND category_code IN ('printing', 'in_an')
  ) THEN
    INSERT INTO public.transaction_categories(category_code, name, type, is_default, created_at, updated_at)
    VALUES ('printing', 'In an', 'chi', false, now(), now());
  END IF;

  SELECT id
  INTO v_category_id
  FROM public.transaction_categories
  WHERE type = 'chi'
    AND category_code IN ('printing', 'in_an')
  ORDER BY CASE WHEN category_code = 'printing' THEN 0 ELSE 1 END, created_at
  LIMIT 1;

  IF v_category_id IS NOT NULL THEN
    UPDATE public.system_settings
    SET value = v_category_id::text,
        description = COALESCE(description, 'Printing expense category id'),
        updated_at = now()
    WHERE key = 'printing_expense_category_id';

    IF NOT FOUND THEN
      INSERT INTO public.system_settings(key, value, description, updated_at)
      VALUES ('printing_expense_category_id', v_category_id::text, 'Printing expense category id', now());
    END IF;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.nextval_printing_order_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  LOOP
    v_code := 'IN-' || to_char(now(), 'YYMMDD') || '-' || lpad(nextval('public.printing_order_code_seq')::text, 5, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.printing_orders
      WHERE order_code = v_code
        AND deleted_at IS NULL
    );
  END LOOP;

  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_printing_expense_category_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category_id uuid;
BEGIN
  SELECT NULLIF(value, '')::uuid
  INTO v_category_id
  FROM public.system_settings
  WHERE key = 'printing_expense_category_id'
    AND value ~* '^[0-9a-f-]{36}$'
  LIMIT 1;

  IF v_category_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.transaction_categories WHERE id = v_category_id AND type = 'chi') THEN
    RETURN v_category_id;
  END IF;

  SELECT id
  INTO v_category_id
  FROM public.transaction_categories
  WHERE type = 'chi'
    AND category_code IN ('printing', 'in_an')
  ORDER BY CASE WHEN category_code = 'printing' THEN 0 ELSE 1 END, created_at
  LIMIT 1;

  RETURN v_category_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_printing_expense(
  p_printing_order_id uuid,
  p_actor_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.printing_orders%ROWTYPE;
  v_expense_id uuid;
  v_expense_date date;
  v_category_id uuid;
  v_lab_name text := 'Lab';
  v_item_names text;
  v_description text;
BEGIN
  SELECT *
  INTO v_order
  FROM public.printing_orders
  WHERE id = p_printing_order_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Printing order not found';
  END IF;

  SELECT id, expense_date
  INTO v_expense_id, v_expense_date
  FROM public.expenses
  WHERE printing_order_id = p_printing_order_id
    AND deleted_at IS NULL
  ORDER BY created_at DESC NULLS LAST
  LIMIT 1
  FOR UPDATE;

  v_expense_date := COALESCE(v_expense_date, CURRENT_DATE);

  IF public.is_period_locked(v_expense_date) THEN
    RAISE EXCEPTION 'Ky ke toan da khoa';
  END IF;

  IF COALESCE(v_order.total_amount, 0) <= 0 OR COALESCE(v_order.status, '') = 'da_huy' THEN
    IF v_expense_id IS NOT NULL THEN
      UPDATE public.expenses
      SET deleted_at = now(),
          updated_at = now()
      WHERE id = v_expense_id;
    END IF;
    RETURN v_expense_id;
  END IF;

  IF v_order.lab_id IS NOT NULL THEN
    SELECT lab_name
    INTO v_lab_name
    FROM public.labs
    WHERE id = v_order.lab_id;
  END IF;

  SELECT string_agg(NULLIF(item->>'name', ''), ', ')
  INTO v_item_names
  FROM jsonb_array_elements(COALESCE(v_order.items::jsonb, '[]'::jsonb)) AS item;

  v_category_id := public.resolve_printing_expense_category_id();
  v_description := '[Auto-Print] ' || COALESCE(v_order.order_code, p_printing_order_id::text) ||
    ': ' || COALESCE(v_item_names, 'Don in') || ' (' || COALESCE(v_lab_name, 'Lab') || ')';

  IF v_expense_id IS NULL THEN
    INSERT INTO public.expenses(
      expense_date,
      payment_method,
      category_id,
      amount,
      description,
      recipient,
      contract_id,
      printing_order_id,
      created_by,
      created_at,
      updated_at
    )
    VALUES (
      CURRENT_DATE,
      'chuyen_khoan'::public.payment_method_enum,
      v_category_id,
      COALESCE(v_order.total_amount, 0),
      v_description,
      COALESCE(v_lab_name, 'Lab'),
      v_order.contract_id,
      p_printing_order_id,
      p_actor_id,
      now(),
      now()
    )
    RETURNING id INTO v_expense_id;
  ELSE
    UPDATE public.expenses
    SET category_id = v_category_id,
        amount = COALESCE(v_order.total_amount, 0),
        description = v_description,
        recipient = COALESCE(v_lab_name, 'Lab'),
        contract_id = v_order.contract_id,
        updated_at = now()
    WHERE id = v_expense_id;
  END IF;

  RETURN v_expense_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.printing_items_total(p_items jsonb)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(SUM(
    COALESCE(NULLIF(item->>'quantity', '')::numeric, 0) *
    COALESCE(NULLIF(item->>'unitPrice', '')::numeric, 0)
  ), 0)
  FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) AS item;
$$;

CREATE OR REPLACE FUNCTION public.create_printing_order_atomic(
  p_order jsonb,
  p_actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract_id uuid := NULLIF(p_order->>'contractId', '')::uuid;
  v_lab_id uuid := NULLIF(p_order->>'labId', '')::uuid;
  v_items jsonb := COALESCE(p_order->'items', '[]'::jsonb);
  v_total numeric;
  v_order_id uuid;
  v_order_code text;
BEGIN
  IF v_contract_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.contracts WHERE id = v_contract_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Hop dong khong hop le';
  END IF;

  IF v_lab_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.labs WHERE id = v_lab_id AND deleted_at IS NULL AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Lab khong hop le';
  END IF;

  IF jsonb_typeof(v_items) <> 'array' OR jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'Can it nhat 1 san pham';
  END IF;

  v_total := public.printing_items_total(v_items);
  v_order_code := public.nextval_printing_order_code();

  INSERT INTO public.printing_orders(
    contract_id,
    lab_id,
    order_code,
    status,
    payment_status,
    total_amount,
    order_date,
    expected_date,
    items,
    notes,
    created_by,
    created_at,
    updated_at,
    updated_by
  )
  VALUES (
    v_contract_id,
    v_lab_id,
    v_order_code,
    'cho_xu_ly',
    'chua_thanh_toan',
    v_total,
    now(),
    NULLIF(p_order->>'expectedDate', '')::date,
    v_items,
    NULLIF(p_order->>'notes', ''),
    p_actor_id,
    now(),
    now(),
    p_actor_id
  )
  RETURNING id INTO v_order_id;

  PERFORM public.upsert_printing_expense(v_order_id, p_actor_id);

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_code', v_order_code,
    'contract_id', v_contract_id,
    'total_amount', v_total
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_printing_order_atomic(
  p_order_id uuid,
  p_order jsonb,
  p_expected_updated_at timestamptz,
  p_actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current public.printing_orders%ROWTYPE;
  v_lab_id uuid := NULLIF(p_order->>'labId', '')::uuid;
  v_items jsonb := COALESCE(p_order->'items', '[]'::jsonb);
  v_total numeric;
  v_updated_at timestamptz;
BEGIN
  SELECT *
  INTO v_current
  FROM public.printing_orders
  WHERE id = p_order_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Khong tim thay don in';
  END IF;

  IF p_expected_updated_at IS NOT NULL
     AND v_current.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'Don in da duoc cap nhat boi nguoi khac. Vui long tai lai trang.';
  END IF;

  IF v_lab_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.labs WHERE id = v_lab_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Lab khong hop le';
  END IF;

  IF jsonb_typeof(v_items) <> 'array' OR jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'Can it nhat 1 san pham';
  END IF;

  v_total := public.printing_items_total(v_items);

  UPDATE public.printing_orders
  SET lab_id = v_lab_id,
      items = v_items,
      notes = NULLIF(p_order->>'notes', ''),
      expected_date = NULLIF(p_order->>'expectedDate', '')::date,
      total_amount = v_total,
      updated_at = now(),
      updated_by = p_actor_id
  WHERE id = p_order_id
  RETURNING updated_at INTO v_updated_at;

  PERFORM public.upsert_printing_expense(p_order_id, p_actor_id);

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'order_code', v_current.order_code,
    'contract_id', v_current.contract_id,
    'total_amount', v_total,
    'updated_at', v_updated_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_printing_order_atomic(
  p_order_id uuid,
  p_actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current public.printing_orders%ROWTYPE;
  v_expense_id uuid;
  v_expense_date date;
BEGIN
  SELECT *
  INTO v_current
  FROM public.printing_orders
  WHERE id = p_order_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Khong tim thay don in';
  END IF;

  SELECT id, expense_date
  INTO v_expense_id, v_expense_date
  FROM public.expenses
  WHERE printing_order_id = p_order_id
    AND deleted_at IS NULL
  ORDER BY created_at DESC NULLS LAST
  LIMIT 1
  FOR UPDATE;

  IF v_expense_id IS NOT NULL AND public.is_period_locked(v_expense_date) THEN
    RAISE EXCEPTION 'Ky ke toan da khoa';
  END IF;

  UPDATE public.expenses
  SET deleted_at = now(),
      updated_at = now()
  WHERE printing_order_id = p_order_id
    AND deleted_at IS NULL;

  UPDATE public.printing_orders
  SET deleted_at = now(),
      updated_at = now(),
      updated_by = p_actor_id
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'order_code', v_current.order_code,
    'contract_id', v_current.contract_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.printing_stats()
RETURNS TABLE (
  total bigint,
  cho_xu_ly bigint,
  dang_in bigint,
  da_in bigint,
  da_nhan bigint,
  total_cost numeric,
  unpaid_cost numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*)::bigint AS total,
    COUNT(*) FILTER (WHERE status = 'cho_xu_ly')::bigint AS cho_xu_ly,
    COUNT(*) FILTER (WHERE status = 'dang_in')::bigint AS dang_in,
    COUNT(*) FILTER (WHERE status = 'da_in')::bigint AS da_in,
    COUNT(*) FILTER (WHERE status = 'da_nhan')::bigint AS da_nhan,
    COALESCE(SUM(total_amount) FILTER (WHERE COALESCE(status, '') <> 'da_huy'), 0)::numeric AS total_cost,
    COALESCE(SUM(total_amount) FILTER (
      WHERE payment_status = 'chua_thanh_toan'
        AND COALESCE(status, '') <> 'da_huy'
    ), 0)::numeric AS unpaid_cost
  FROM public.printing_orders
  WHERE deleted_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.get_printing_cost_stats()
RETURNS TABLE (
  total_cost numeric,
  unpaid_cost numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(total_amount) FILTER (WHERE COALESCE(status, '') <> 'da_huy'), 0)::numeric AS total_cost,
    COALESCE(SUM(total_amount) FILTER (
      WHERE payment_status = 'chua_thanh_toan'
        AND COALESCE(status, '') <> 'da_huy'
    ), 0)::numeric AS unpaid_cost
  FROM public.printing_orders
  WHERE deleted_at IS NULL;
$$;

DROP FUNCTION IF EXISTS public.finance_lab_debt_summary();

CREATE OR REPLACE FUNCTION public.finance_lab_debt_summary()
RETURNS TABLE (
  lab_id uuid,
  lab_name text,
  order_count bigint,
  total_orders numeric,
  total_paid numeric,
  remaining numeric,
  last_order_date timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH allocation_totals AS (
    SELECT printing_order_id, COALESCE(SUM(amount), 0)::numeric AS allocated
    FROM public.lab_payment_allocations
    GROUP BY printing_order_id
  ),
  balances AS (
    SELECT
      po.id,
      po.lab_id,
      po.total_amount,
      po.order_date,
      COALESCE(at.allocated, 0)::numeric AS allocated,
      CASE
        WHEN po.payment_status = 'da_thanh_toan' AND COALESCE(at.allocated, 0) = 0 THEN 0
        ELSE GREATEST(COALESCE(po.total_amount, 0) - COALESCE(at.allocated, 0), 0)
      END AS remaining
    FROM public.printing_orders po
    LEFT JOIN allocation_totals at ON at.printing_order_id = po.id
    WHERE po.deleted_at IS NULL
      AND po.lab_id IS NOT NULL
      AND COALESCE(po.status, '') <> 'da_huy'
  )
  SELECT
    l.id AS lab_id,
    l.lab_name::text AS lab_name,
    COUNT(b.id)::bigint AS order_count,
    COALESCE(SUM(COALESCE(b.total_amount, 0)), 0)::numeric AS total_orders,
    COALESCE(SUM(COALESCE(b.allocated, 0)), 0)::numeric AS total_paid,
    COALESCE(SUM(COALESCE(b.remaining, 0)), 0)::numeric AS remaining,
    MAX(b.order_date)::timestamptz AS last_order_date
  FROM balances b
  JOIN public.labs l ON l.id = b.lab_id
  WHERE b.remaining > 0
    AND l.deleted_at IS NULL
  GROUP BY l.id, l.lab_name
  ORDER BY remaining DESC;
$$;

CREATE OR REPLACE FUNCTION public.printing_lab_overview()
RETURNS TABLE (
  id uuid,
  lab_name text,
  contact_person text,
  phone text,
  address text,
  status text,
  created_at timestamptz,
  service_count bigint,
  service_preview text[],
  outstanding_debt numeric,
  unpaid_orders bigint,
  last_payment_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH debt AS (
    SELECT *
    FROM public.finance_lab_debt_summary()
  ),
  services AS (
    SELECT
      lab_id,
      COUNT(*)::bigint AS service_count,
      ARRAY(
        SELECT ls_inner.item_name::text
        FROM public.lab_services ls_inner
        WHERE ls_inner.lab_id = ls.lab_id
        ORDER BY ls_inner.item_name
        LIMIT 3
      ) AS service_preview
    FROM public.lab_services ls
    GROUP BY lab_id
  ),
  payments AS (
    SELECT lab_id, MAX(created_at)::timestamptz AS last_payment_at
    FROM public.lab_payments
    GROUP BY lab_id
  )
  SELECT
    l.id,
    l.lab_name::text,
    l.contact_person::text,
    l.phone::text,
    l.address::text,
    l.status::text,
    l.created_at::timestamptz,
    COALESCE(s.service_count, 0)::bigint AS service_count,
    COALESCE(s.service_preview, ARRAY[]::text[]) AS service_preview,
    COALESCE(d.remaining, 0)::numeric AS outstanding_debt,
    COALESCE(d.order_count, 0)::bigint AS unpaid_orders,
    p.last_payment_at
  FROM public.labs l
  LEFT JOIN debt d ON d.lab_id = l.id
  LEFT JOIN services s ON s.lab_id = l.id
  LEFT JOIN payments p ON p.lab_id = l.id
  WHERE l.deleted_at IS NULL
  ORDER BY l.lab_name;
$$;

CREATE OR REPLACE FUNCTION public.record_lab_payment_atomic(
  p_lab_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_note text,
  p_allocations jsonb,
  p_actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id uuid;
  v_allocations jsonb := COALESCE(p_allocations, '[]'::jsonb);
  v_allocation jsonb;
  v_order public.printing_orders%ROWTYPE;
  v_existing_alloc numeric;
  v_remaining numeric;
  v_alloc_total numeric := 0;
  v_remaining_payment numeric;
  v_closed_count integer := 0;
  v_order_id uuid;
  v_amount numeric;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'So tien thanh toan phai lon hon 0';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.labs WHERE id = p_lab_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Lab khong hop le';
  END IF;

  INSERT INTO public.lab_payments(lab_id, amount, payment_method, note, created_by, created_at)
  VALUES (p_lab_id, p_amount, COALESCE(NULLIF(p_payment_method, ''), 'chuyen_khoan'), NULLIF(p_note, ''), p_actor_id, now())
  RETURNING id INTO v_payment_id;

  IF jsonb_typeof(v_allocations) = 'array' AND jsonb_array_length(v_allocations) > 0 THEN
    FOR v_allocation IN SELECT value FROM jsonb_array_elements(v_allocations)
    LOOP
      v_order_id := NULLIF(v_allocation->>'printing_order_id', '')::uuid;
      v_amount := COALESCE(NULLIF(v_allocation->>'amount', '')::numeric, 0);

      SELECT *
      INTO v_order
      FROM public.printing_orders
      WHERE id = v_order_id
        AND lab_id = p_lab_id
        AND deleted_at IS NULL
        AND COALESCE(status, '') <> 'da_huy'
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Don in khong hop le';
      END IF;

      SELECT COALESCE(SUM(amount), 0)
      INTO v_existing_alloc
      FROM public.lab_payment_allocations
      WHERE printing_order_id = v_order_id;

      v_remaining := GREATEST(COALESCE(v_order.total_amount, 0) - COALESCE(v_existing_alloc, 0), 0);

      IF v_amount <= 0 OR v_amount > v_remaining THEN
        RAISE EXCEPTION 'So tien phan bo khong hop le';
      END IF;

      INSERT INTO public.lab_payment_allocations(payment_id, printing_order_id, amount, created_by)
      VALUES (v_payment_id, v_order_id, v_amount, p_actor_id);

      v_alloc_total := v_alloc_total + v_amount;
    END LOOP;
  ELSE
    v_remaining_payment := p_amount;
    FOR v_order IN
      SELECT *
      FROM public.printing_orders
      WHERE lab_id = p_lab_id
        AND deleted_at IS NULL
        AND COALESCE(status, '') <> 'da_huy'
        AND COALESCE(payment_status, 'chua_thanh_toan') <> 'da_thanh_toan'
      ORDER BY order_date NULLS LAST, created_at NULLS LAST, id
      FOR UPDATE
    LOOP
      SELECT COALESCE(SUM(amount), 0)
      INTO v_existing_alloc
      FROM public.lab_payment_allocations
      WHERE printing_order_id = v_order.id;

      v_remaining := GREATEST(COALESCE(v_order.total_amount, 0) - COALESCE(v_existing_alloc, 0), 0);
      IF v_remaining > 0 THEN
        v_amount := LEAST(v_remaining, v_remaining_payment);

        INSERT INTO public.lab_payment_allocations(payment_id, printing_order_id, amount, created_by)
        VALUES (v_payment_id, v_order.id, v_amount, p_actor_id);
        v_alloc_total := v_alloc_total + v_amount;
        v_remaining_payment := v_remaining_payment - v_amount;
      END IF;

      IF v_remaining_payment <= 0.01 THEN
        EXIT;
      END IF;
    END LOOP;

    IF v_remaining_payment > 0.01 THEN
      RAISE EXCEPTION 'So tien thanh toan lon hon cong no lab hien tai';
    END IF;
  END IF;

  IF abs(v_alloc_total - p_amount) > 0.01 THEN
    RAISE EXCEPTION 'Tong phan bo khong khop so tien thanh toan';
  END IF;

  UPDATE public.printing_orders po
  SET payment_status = 'da_thanh_toan',
      updated_at = now(),
      updated_by = p_actor_id
  WHERE po.lab_id = p_lab_id
    AND po.deleted_at IS NULL
    AND COALESCE(po.status, '') <> 'da_huy'
    AND GREATEST(
      COALESCE(po.total_amount, 0) -
      COALESCE((SELECT SUM(amount) FROM public.lab_payment_allocations lpa WHERE lpa.printing_order_id = po.id), 0),
      0
    ) <= 0.01;

  GET DIAGNOSTICS v_closed_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'payment_id', v_payment_id,
    'allocated_amount', v_alloc_total,
    'closed_order_count', v_closed_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.nextval_printing_order_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resolve_printing_expense_category_id() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.upsert_printing_expense(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.printing_items_total(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_printing_order_atomic(jsonb, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_printing_order_atomic(uuid, jsonb, timestamptz, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_printing_order_atomic(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.printing_stats() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_printing_cost_stats() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finance_lab_debt_summary() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.printing_lab_overview() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_lab_payment_atomic(uuid, numeric, text, text, jsonb, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.nextval_printing_order_code() TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_printing_expense_category_id() TO service_role;
GRANT EXECUTE ON FUNCTION public.upsert_printing_expense(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.printing_items_total(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_printing_order_atomic(jsonb, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_printing_order_atomic(uuid, jsonb, timestamptz, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_printing_order_atomic(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.printing_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_printing_cost_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_lab_debt_summary() TO service_role;
GRANT EXECUTE ON FUNCTION public.printing_lab_overview() TO service_role;
GRANT EXECUTE ON FUNCTION public.record_lab_payment_atomic(uuid, numeric, text, text, jsonb, uuid) TO service_role;
