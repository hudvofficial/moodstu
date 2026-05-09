CREATE OR REPLACE FUNCTION inventory_detail_v2(p_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_transactions jsonb;
  v_totals jsonb;
BEGIN
  -- Item info
  SELECT to_jsonb(i.*) INTO v_item
  FROM inventory_items i
  WHERE i.id = p_item_id AND i.deleted_at IS NULL;

  IF v_item IS NULL THEN
    RETURN NULL;
  END IF;

  -- Recent transactions (limit 50)
  SELECT COALESCE(jsonb_agg(t ORDER BY t.created_at DESC), '[]'::jsonb) INTO v_transactions
  FROM (
    SELECT * FROM inventory_transactions
    WHERE item_id = p_item_id
    ORDER BY created_at DESC
    LIMIT 50
  ) t;

  -- Aggregated totals
  SELECT jsonb_build_object(
    'totalIn', COALESCE(SUM(CASE WHEN transaction_type = 'stock_in' THEN quantity ELSE 0 END), 0),
    'totalOut', COALESCE(SUM(CASE WHEN transaction_type = 'stock_out' THEN quantity ELSE 0 END), 0),
    'transactionCount', COUNT(*)
  ) INTO v_totals
  FROM inventory_transactions
  WHERE item_id = p_item_id;

  RETURN jsonb_build_object(
    'item', v_item,
    'transactions', v_transactions,
    'totals', v_totals
  );
END;
$$;
