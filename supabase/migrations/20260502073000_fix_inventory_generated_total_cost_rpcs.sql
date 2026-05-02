-- Fix inventory transaction writes after total_cost became a generated column.
-- Generated columns cannot receive explicit INSERT values; quantity * unit_cost is computed by DB.

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
    item_id, transaction_type, quantity, unit_cost,
    supplier, reason, notes, performed_by, created_by
  ) VALUES (
    p_item_id,
    'stock_in',
    p_quantity,
    p_unit_cost,
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
    item_id, transaction_type, quantity, unit_cost,
    contract_id, reason, customer_name, customer_phone, notes,
    performed_by, created_by
  ) VALUES (
    p_item_id,
    'stock_out',
    p_quantity,
    v_unit_cost,
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

CREATE OR REPLACE FUNCTION public.create_sale_receipt_atomic(
  p_receipt jsonb,
  p_items jsonb
) RETURNS jsonb AS $$
DECLARE
  v_receipt_id uuid;
  v_item jsonb;
  v_current_stock int;
  v_item_name text;
  v_qty int;
  v_sale_price numeric;
  v_unit_cost numeric;
  v_receipt_amount numeric;
  v_items_total numeric := 0;
  v_created_by uuid := NULLIF(p_receipt->>'created_by', '')::uuid;
BEGIN
  v_receipt_amount := COALESCE(NULLIF(p_receipt->>'receipt_amount', '')::numeric, 0);
  IF v_receipt_amount <= 0 THEN
    RAISE EXCEPTION 'Receipt amount must be greater than 0';
  END IF;

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Sale receipt must contain at least one item';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := COALESCE(NULLIF(v_item->>'quantity', '')::int, 0);
    v_sale_price := COALESCE(NULLIF(v_item->>'unit_cost', '')::numeric, 0);

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid sale quantity for item "%"', COALESCE(v_item->>'item_name', v_item->>'item_id');
    END IF;

    IF v_sale_price < 0 THEN
      RAISE EXCEPTION 'Invalid sale price for item "%"', COALESCE(v_item->>'item_name', v_item->>'item_id');
    END IF;

    SELECT COALESCE(current_stock, 0), name, COALESCE(average_unit_price, 0)
    INTO v_current_stock, v_item_name, v_unit_cost
    FROM public.inventory_items
    WHERE id = (v_item->>'item_id')::uuid AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Inventory item "%" does not exist', COALESCE(v_item->>'item_name', v_item->>'item_id');
    END IF;

    IF v_current_stock < v_qty THEN
      RAISE EXCEPTION '% does not have enough stock. Remaining %', v_item_name, v_current_stock;
    END IF;

    v_items_total := v_items_total + (v_qty * v_sale_price);
  END LOOP;

  IF ABS(v_receipt_amount - v_items_total) > 0.01 THEN
    RAISE EXCEPTION 'Receipt amount % does not match sale items total %', v_receipt_amount, v_items_total;
  END IF;

  INSERT INTO public.receipts (
    receipt_date, receipt_type, payment_type, receipt_amount,
    notes, category_id, category_name, customer_name, customer_phone,
    status, created_by
  ) VALUES (
    (p_receipt->>'receipt_date')::date,
    p_receipt->>'receipt_type',
    p_receipt->>'payment_type',
    v_receipt_amount,
    COALESCE(p_receipt->>'notes', ''),
    NULLIF(p_receipt->>'category_id', '')::uuid,
    COALESCE(p_receipt->>'category_name', ''),
    NULLIF(p_receipt->>'customer_name', ''),
    NULLIF(p_receipt->>'customer_phone', ''),
    'confirmed',
    v_created_by
  ) RETURNING id INTO v_receipt_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'quantity')::int;

    SELECT COALESCE(average_unit_price, 0)
    INTO v_unit_cost
    FROM public.inventory_items
    WHERE id = (v_item->>'item_id')::uuid;

    INSERT INTO public.inventory_transactions (
      item_id, transaction_type, quantity, unit_cost,
      reason, notes, performed_by, created_by
    ) VALUES (
      (v_item->>'item_id')::uuid,
      'stock_out',
      v_qty,
      v_unit_cost,
      'Ban vat tu',
      CONCAT('Receipt: ', v_receipt_id::text, ' | Sale price: ', COALESCE(v_item->>'unit_cost', '0')),
      v_created_by,
      v_created_by
    );

    UPDATE public.inventory_items
    SET current_stock = COALESCE(current_stock, 0) - v_qty,
        updated_at = now(),
        updated_by = v_created_by
    WHERE id = (v_item->>'item_id')::uuid;
  END LOOP;

  RETURN jsonb_build_object('receipt_id', v_receipt_id);
END;
$$ LANGUAGE plpgsql VOLATILE SET search_path = public;

REVOKE ALL ON FUNCTION public.inventory_stock_in_atomic(uuid, integer, numeric, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.inventory_stock_out_atomic(uuid, integer, uuid, text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_sale_receipt_atomic(jsonb, jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.inventory_stock_in_atomic(uuid, integer, numeric, text, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.inventory_stock_out_atomic(uuid, integer, uuid, text, text, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_sale_receipt_atomic(jsonb, jsonb) TO service_role;
