-- Inventory audit hardening and aggregate contracts.
-- Keeps all stock writes service-role-only and enforces active item lifecycle rules.

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.inventory_items FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.inventory_transactions FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.inventory_items TO service_role;
GRANT ALL ON TABLE public.inventory_transactions TO service_role;

CREATE SEQUENCE IF NOT EXISTS public.inventory_item_code_seq;

DO $$
DECLARE
  v_max_code bigint;
BEGIN
  SELECT COALESCE(MAX((regexp_match(item_code, '^VT-([0-9]+)$'))[1]::bigint), 0)
  INTO v_max_code
  FROM public.inventory_items
  WHERE item_code ~ '^VT-[0-9]+$';

  PERFORM setval(
    'public.inventory_item_code_seq',
    GREATEST(v_max_code, 1),
    v_max_code > 0
  );
END;
$$;

REVOKE ALL ON SEQUENCE public.inventory_item_code_seq FROM PUBLIC, anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.inventory_item_code_seq TO service_role;

CREATE OR REPLACE FUNCTION public.nextval_inventory_code()
RETURNS text AS $$
  SELECT 'VT-' || LPAD(nextval('public.inventory_item_code_seq')::text, 3, '0');
$$ LANGUAGE sql VOLATILE SET search_path = public;

CREATE OR REPLACE FUNCTION public.inventory_stats()
RETURNS jsonb AS $$
DECLARE
  v_items jsonb;
  v_transactions_this_month integer;
BEGIN
  SELECT jsonb_build_object(
    'total', COUNT(*)::integer,
    'active', COUNT(*) FILTER (WHERE status = 'active')::integer,
    'lowStock', COUNT(*) FILTER (
      WHERE status = 'active'
        AND COALESCE(min_stock, 0) > 0
        AND COALESCE(current_stock, 0) > 0
        AND COALESCE(current_stock, 0) < COALESCE(min_stock, 0)
    )::integer,
    'outOfStock', COUNT(*) FILTER (
      WHERE status = 'active'
        AND COALESCE(current_stock, 0) = 0
    )::integer,
    'totalValue', COALESCE(SUM(
      COALESCE(current_stock, 0) * COALESCE(average_unit_price, 0)
    ), 0),
    'transactionsThisMonth', 0
  )
  INTO v_items
  FROM public.inventory_items
  WHERE deleted_at IS NULL;

  SELECT COUNT(*)::integer
  INTO v_transactions_this_month
  FROM public.inventory_transactions
  WHERE created_at >= date_trunc('month', now());

  RETURN jsonb_set(
    COALESCE(v_items, '{}'::jsonb),
    '{transactionsThisMonth}',
    to_jsonb(COALESCE(v_transactions_this_month, 0)),
    true
  );
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.inventory_item_transaction_totals(
  p_item_id uuid
) RETURNS jsonb AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'totalIn', COALESCE(SUM(quantity) FILTER (WHERE transaction_type = 'stock_in'), 0),
      'totalOut', COALESCE(SUM(quantity) FILTER (WHERE transaction_type = 'stock_out'), 0),
      'transactionCount', COUNT(*)::integer
    )
    FROM public.inventory_transactions
    WHERE item_id = p_item_id
  );
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.inventory_list(
  p_search text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_sort text DEFAULT 'newest',
  p_page integer DEFAULT 1,
  p_limit integer DEFAULT 20
) RETURNS jsonb AS $$
DECLARE
  v_page integer := GREATEST(COALESCE(p_page, 1), 1);
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
  v_offset integer;
  v_total integer;
  v_items jsonb;
  v_search text := NULLIF(BTRIM(COALESCE(p_search, '')), '');
BEGIN
  v_offset := (v_page - 1) * v_limit;

  WITH filtered AS (
    SELECT
      id, item_code, name, category, unit,
      current_stock, min_stock, purchase_price, average_unit_price, sale_price,
      supplier, image_url, status, notes,
      created_by, updated_by, created_at, updated_at, deleted_at
    FROM public.inventory_items
    WHERE deleted_at IS NULL
      AND (p_category IS NULL OR category = p_category)
      AND (
        p_status IS NULL
        OR (p_status = 'active' AND status = 'active')
        OR (p_status = 'discontinued' AND status = 'discontinued')
        OR (
          p_status = 'low_stock'
          AND status = 'active'
          AND COALESCE(min_stock, 0) > 0
          AND COALESCE(current_stock, 0) > 0
          AND COALESCE(current_stock, 0) < COALESCE(min_stock, 0)
        )
        OR (
          p_status = 'out_of_stock'
          AND status = 'active'
          AND COALESCE(current_stock, 0) = 0
        )
      )
      AND (
        v_search IS NULL
        OR name ILIKE ('%' || v_search || '%')
        OR item_code ILIKE ('%' || v_search || '%')
      )
  )
  SELECT COUNT(*)::integer
  INTO v_total
  FROM filtered;

  WITH filtered AS (
    SELECT
      id, item_code, name, category, unit,
      current_stock, min_stock, purchase_price, average_unit_price, sale_price,
      supplier, image_url, status, notes,
      created_by, updated_by, created_at, updated_at, deleted_at
    FROM public.inventory_items
    WHERE deleted_at IS NULL
      AND (p_category IS NULL OR category = p_category)
      AND (
        p_status IS NULL
        OR (p_status = 'active' AND status = 'active')
        OR (p_status = 'discontinued' AND status = 'discontinued')
        OR (
          p_status = 'low_stock'
          AND status = 'active'
          AND COALESCE(min_stock, 0) > 0
          AND COALESCE(current_stock, 0) > 0
          AND COALESCE(current_stock, 0) < COALESCE(min_stock, 0)
        )
        OR (
          p_status = 'out_of_stock'
          AND status = 'active'
          AND COALESCE(current_stock, 0) = 0
        )
      )
      AND (
        v_search IS NULL
        OR name ILIKE ('%' || v_search || '%')
        OR item_code ILIKE ('%' || v_search || '%')
      )
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(page_rows)), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT *
    FROM filtered
    ORDER BY
      CASE WHEN p_sort = 'name_asc' THEN name END ASC NULLS LAST,
      CASE WHEN p_sort = 'stock_asc' THEN current_stock END ASC NULLS LAST,
      CASE WHEN p_sort = 'stock_desc' THEN current_stock END DESC NULLS LAST,
      created_at DESC
    OFFSET v_offset
    LIMIT v_limit
  ) AS page_rows;

  RETURN jsonb_build_object(
    'items', COALESCE(v_items, '[]'::jsonb),
    'total', COALESCE(v_total, 0),
    'page', v_page,
    'limit', v_limit
  );
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.inventory_stock_in_atomic(
  p_item_id uuid,
  p_quantity integer,
  p_unit_cost numeric,
  p_supplier text DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_current_stock integer;
  v_old_avg numeric;
  v_new_stock integer;
  v_new_avg numeric;
  v_item_name text;
  v_status text;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than 0';
  END IF;

  IF p_unit_cost IS NULL OR p_unit_cost < 0 THEN
    RAISE EXCEPTION 'Unit cost must be greater than or equal to 0';
  END IF;

  SELECT COALESCE(current_stock, 0), COALESCE(average_unit_price, 0), name, status
  INTO v_current_stock, v_old_avg, v_item_name, v_status
  FROM public.inventory_items
  WHERE id = p_item_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item does not exist';
  END IF;

  IF v_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'Cannot stock in discontinued inventory item';
  END IF;

  v_new_stock := v_current_stock + p_quantity;
  v_new_avg := CASE
    WHEN v_new_stock > 0 THEN ((v_current_stock * v_old_avg) + (p_quantity * p_unit_cost)) / v_new_stock
    ELSE p_unit_cost
  END;

  INSERT INTO public.inventory_transactions (
    item_id, transaction_type, quantity, unit_cost, total_cost,
    supplier, reason, notes, performed_by, created_by
  ) VALUES (
    p_item_id,
    'stock_in',
    p_quantity,
    p_unit_cost,
    p_quantity * p_unit_cost,
    NULLIF(BTRIM(COALESCE(p_supplier, '')), ''),
    COALESCE(NULLIF(BTRIM(COALESCE(p_reason, '')), ''), 'Nhap kho'),
    NULLIF(BTRIM(COALESCE(p_notes, '')), ''),
    p_user_id,
    p_user_id
  );

  UPDATE public.inventory_items
  SET current_stock = v_new_stock,
      average_unit_price = ROUND(v_new_avg, 2),
      purchase_price = p_unit_cost,
      updated_by = p_user_id,
      updated_at = now()
  WHERE id = p_item_id;

  RETURN jsonb_build_object(
    'item_id', p_item_id,
    'item_name', v_item_name,
    'current_stock', v_new_stock,
    'average_unit_price', ROUND(v_new_avg, 2)
  );
END;
$$ LANGUAGE plpgsql VOLATILE SET search_path = public;

CREATE OR REPLACE FUNCTION public.inventory_stock_out_atomic(
  p_item_id uuid,
  p_quantity integer,
  p_contract_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_customer_name text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_current_stock integer;
  v_min_stock integer;
  v_new_stock integer;
  v_unit_cost numeric;
  v_item_name text;
  v_status text;
  v_warning text;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than 0';
  END IF;

  SELECT COALESCE(current_stock, 0), COALESCE(min_stock, 0), COALESCE(average_unit_price, 0), name, status
  INTO v_current_stock, v_min_stock, v_unit_cost, v_item_name, v_status
  FROM public.inventory_items
  WHERE id = p_item_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item does not exist';
  END IF;

  IF v_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'Cannot stock out discontinued inventory item';
  END IF;

  IF v_current_stock < p_quantity THEN
    RAISE EXCEPTION 'Not enough stock. Remaining %', v_current_stock;
  END IF;

  v_new_stock := v_current_stock - p_quantity;

  INSERT INTO public.inventory_transactions (
    item_id, transaction_type, quantity, unit_cost, total_cost,
    contract_id, reason, customer_name, customer_phone, notes,
    performed_by, created_by
  ) VALUES (
    p_item_id,
    'stock_out',
    p_quantity,
    v_unit_cost,
    p_quantity * v_unit_cost,
    p_contract_id,
    COALESCE(NULLIF(BTRIM(COALESCE(p_reason, '')), ''), 'Xuat kho'),
    NULLIF(BTRIM(COALESCE(p_customer_name, '')), ''),
    NULLIF(BTRIM(COALESCE(p_customer_phone, '')), ''),
    NULLIF(BTRIM(COALESCE(p_notes, '')), ''),
    p_user_id,
    p_user_id
  );

  UPDATE public.inventory_items
  SET current_stock = v_new_stock,
      updated_by = p_user_id,
      updated_at = now()
  WHERE id = p_item_id;

  IF v_min_stock > 0 AND v_new_stock < v_min_stock THEN
    v_warning := v_item_name || ' sap het. Con ' || v_new_stock || ' (toi thieu: ' || v_min_stock || ')';
  END IF;

  RETURN jsonb_build_object(
    'item_id', p_item_id,
    'item_name', v_item_name,
    'current_stock', v_new_stock,
    'warning', v_warning
  );
END;
$$ LANGUAGE plpgsql VOLATILE SET search_path = public;

REVOKE ALL ON FUNCTION public.nextval_inventory_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.inventory_stats() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.inventory_item_transaction_totals(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.inventory_list(text, text, text, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.inventory_stock_in_atomic(uuid, integer, numeric, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.inventory_stock_out_atomic(uuid, integer, uuid, text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.nextval_inventory_code() TO service_role;
GRANT EXECUTE ON FUNCTION public.inventory_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.inventory_item_transaction_totals(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.inventory_list(text, text, text, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.inventory_stock_in_atomic(uuid, integer, numeric, text, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.inventory_stock_out_atomic(uuid, integer, uuid, text, text, text, text, uuid) TO service_role;
