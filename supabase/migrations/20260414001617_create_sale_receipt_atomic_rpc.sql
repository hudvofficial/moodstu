CREATE OR REPLACE FUNCTION public.create_sale_receipt_atomic(
  p_receipt jsonb,
  p_items jsonb
) RETURNS jsonb AS $$
DECLARE
  v_receipt_id uuid;
  v_item jsonb;
  v_current_stock int;
  v_item_name text;
BEGIN
  -- Phase 1: Validate ALL stock first (fail fast)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT current_stock, name INTO v_current_stock, v_item_name
    FROM public.inventory_items
    WHERE id = (v_item->>'item_id')::uuid AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Vật tư "%" không tồn tại', v_item->>'item_name';
    END IF;
    IF v_current_stock < (v_item->>'quantity')::int THEN
      RAISE EXCEPTION '% không đủ tồn kho. Còn %', v_item_name, v_current_stock;
    END IF;
  END LOOP;

  -- Phase 2: Insert receipt
  INSERT INTO public.receipts (
    receipt_date, receipt_type, payment_type, receipt_amount,
    notes, category_id, category_name, customer_name, customer_phone,
    status, created_by
  ) VALUES (
    (p_receipt->>'receipt_date')::date,
    p_receipt->>'receipt_type',
    p_receipt->>'payment_type',
    (p_receipt->>'receipt_amount')::numeric,
    COALESCE(p_receipt->>'notes', ''),
    NULLIF(p_receipt->>'category_id', '')::uuid,
    COALESCE(p_receipt->>'category_name', ''),
    NULLIF(p_receipt->>'customer_name', ''),
    NULLIF(p_receipt->>'customer_phone', ''),
    'confirmed',
    NULLIF(p_receipt->>'created_by', '')::uuid
  ) RETURNING id INTO v_receipt_id;

  -- Phase 3: Insert inventory_transactions + decrement stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.inventory_transactions (
      item_id, transaction_type, quantity, unit_cost, total_cost,
      reason, notes
    ) VALUES (
      (v_item->>'item_id')::uuid,
      'stock_out',
      (v_item->>'quantity')::int,
      COALESCE((v_item->>'unit_cost')::numeric, 0),
      (v_item->>'quantity')::int * COALESCE((v_item->>'unit_cost')::numeric, 0),
      'Bán vật tư',
      CONCAT('Receipt: ', v_receipt_id::text)
    );

    UPDATE public.inventory_items
    SET current_stock = current_stock - (v_item->>'quantity')::int,
        updated_at = now()
    WHERE id = (v_item->>'item_id')::uuid;
  END LOOP;

  RETURN jsonb_build_object('receipt_id', v_receipt_id);
END;
$$ LANGUAGE plpgsql VOLATILE SET search_path = public;

REVOKE ALL ON FUNCTION public.create_sale_receipt_atomic(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_sale_receipt_atomic(jsonb, jsonb) TO service_role;;
