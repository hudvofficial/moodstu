-- Phase 01 Step 2: Atomic Sale Receipt RPC
-- Validates all stock first, then inserts receipt + stock_out transactions.
-- Uses FOR UPDATE row locks to prevent race conditions.

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

  -- Phase 1: validate every item before writing anything.
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

  -- Phase 2: insert revenue receipt using sale total.
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

  -- Phase 3: record stock-out cost at inventory average cost, then decrement stock.
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'quantity')::int;

    SELECT COALESCE(average_unit_price, 0)
    INTO v_unit_cost
    FROM public.inventory_items
    WHERE id = (v_item->>'item_id')::uuid;

    INSERT INTO public.inventory_transactions (
      item_id, transaction_type, quantity, unit_cost, total_cost,
      reason, notes, performed_by, created_by
    ) VALUES (
      (v_item->>'item_id')::uuid,
      'stock_out',
      v_qty,
      v_unit_cost,
      v_qty * v_unit_cost,
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

REVOKE ALL ON FUNCTION public.create_sale_receipt_atomic(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_sale_receipt_atomic(jsonb, jsonb) TO service_role;
