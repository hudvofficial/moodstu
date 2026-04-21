-- Atomic inventory stock operations.
-- Locks inventory row with FOR UPDATE so transaction log and stock count stay consistent.

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
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than 0';
  END IF;

  IF p_unit_cost IS NULL OR p_unit_cost < 0 THEN
    RAISE EXCEPTION 'Unit cost must be greater than or equal to 0';
  END IF;

  SELECT COALESCE(current_stock, 0), COALESCE(average_unit_price, 0), name
  INTO v_current_stock, v_old_avg, v_item_name
  FROM public.inventory_items
  WHERE id = p_item_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item does not exist';
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
  v_warning text;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than 0';
  END IF;

  SELECT COALESCE(current_stock, 0), COALESCE(min_stock, 0), COALESCE(average_unit_price, 0), name
  INTO v_current_stock, v_min_stock, v_unit_cost, v_item_name
  FROM public.inventory_items
  WHERE id = p_item_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item does not exist';
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

REVOKE ALL ON FUNCTION public.inventory_stock_in_atomic(uuid, integer, numeric, text, text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.inventory_stock_out_atomic(uuid, integer, uuid, text, text, text, text, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.inventory_stock_in_atomic(uuid, integer, numeric, text, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.inventory_stock_out_atomic(uuid, integer, uuid, text, text, text, text, uuid) TO service_role;
