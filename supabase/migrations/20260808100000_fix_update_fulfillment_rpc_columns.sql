-- Sửa update_fulfillment_transaction_atomic: bỏ các cột KHÔNG tồn tại.
-- (1) inventory_transactions không có updated_at/updated_by → câu UPDATE cuối RAISE 42703
--     → rollback toàn transaction → "sửa phát sinh" chưa từng chạy nổi tới cùng.
-- (2) payments không có updated_by (chỉ có updated_at).
-- Đối chiếu: delete_fulfillment_transaction_atomic KHÔNG dính — chỉ ghi updated_at/updated_by
-- vào contracts + inventory_items (hai bảng có đủ cột).
-- Nguồn: pg_get_functiondef trên prod 2026-08-08, chỉ áp đúng 2 sửa trên.

CREATE OR REPLACE FUNCTION public.update_fulfillment_transaction_atomic(p_txn_id uuid, p_new_quantity integer, p_new_unit_price numeric, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_txn public.inventory_transactions%ROWTYPE;
  v_item public.inventory_items%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_contract public.contracts%ROWTYPE;
  v_delta_qty integer;
  v_delta_amount numeric;
  v_new_stock integer;
  v_new_sale_total numeric;
  v_new_total numeric;
  v_new_paid numeric;
  v_new_remaining numeric;
  v_payment_status text;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: actor_id is required';
  END IF;

  IF p_new_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than 0';
  END IF;

  IF p_new_unit_price < 0 THEN
    RAISE EXCEPTION 'Unit price cannot be negative';
  END IF;

  -- 1. Lock and load transaction
  SELECT * INTO v_txn
  FROM public.inventory_transactions
  WHERE id = p_txn_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy giao dịch';
  END IF;

  IF v_txn.parent_transaction_id IS NULL THEN
    RAISE EXCEPTION 'Chỉ có thể sửa phiếu phát sinh (phải có parent_transaction_id)';
  END IF;

  -- 2. Calculate deltas
  v_delta_qty := p_new_quantity - v_txn.quantity;
  v_new_sale_total := p_new_quantity * p_new_unit_price;
  v_delta_amount := v_new_sale_total - COALESCE(v_txn.sale_total, 0);

  -- 3. Lock and load inventory item
  SELECT * INTO v_item
  FROM public.inventory_items
  WHERE id = v_txn.item_id
  FOR UPDATE;

  IF v_delta_qty > 0 AND COALESCE(v_item.current_stock, 0) < v_delta_qty THEN
    RAISE EXCEPTION 'Vật tư % không đủ tồn kho để bổ sung thêm % cái. Tồn hiện tại: %', v_item.name, v_delta_qty, COALESCE(v_item.current_stock, 0);
  END IF;

  v_new_stock := COALESCE(v_item.current_stock, 0) - v_delta_qty;

  -- 4. Handle financial updates
  IF v_txn.source_type = 'contract_addon_sale' THEN
    -- Find payment
    SELECT * INTO v_payment
    FROM public.payments
    WHERE id = v_txn.source_id
    FOR UPDATE;

    IF FOUND THEN
      -- Find contract
      SELECT * INTO v_contract
      FROM public.contracts
      WHERE id = v_payment.contract_id
      FOR UPDATE;

      IF v_contract.status = 'da_huy' THEN
        RAISE EXCEPTION 'Hợp đồng đã hủy, không thể sửa phát sinh';
      END IF;

      -- Update payment
      UPDATE public.payments 
      SET amount = v_new_sale_total,
          updated_at = now()
      WHERE id = v_payment.id;

      -- Update contract item
      IF v_payment.contract_adjustment_item_id IS NOT NULL THEN
        UPDATE public.contract_items 
        SET quantity = p_new_quantity,
            unit_price = p_new_unit_price,
            total_amount = v_new_sale_total,
            updated_at = now()
        WHERE id = v_payment.contract_adjustment_item_id;
      END IF;

      -- Update contract amounts
      v_new_total := COALESCE(v_contract.total_amount, 0) + v_delta_amount;
      v_new_paid := COALESCE(v_contract.paid_amount, 0) + v_delta_amount;
      v_new_remaining := GREATEST(0, v_new_total - v_new_paid);
      v_payment_status := public.contract_payment_status_v2(v_new_paid, v_new_remaining);

      UPDATE public.contracts
      SET total_amount = v_new_total,
          paid_amount = v_new_paid,
          remaining_amount = v_new_remaining,
          payment_status = v_payment_status,
          updated_at = now(),
          updated_by = p_user_id
      WHERE id = v_contract.id;
    END IF;

  ELSIF v_txn.source_type = 'retail_sale' AND v_txn.receipt_id IS NOT NULL THEN
    -- Update receipt
    UPDATE public.receipts 
    SET receipt_amount = v_new_sale_total,
        updated_at = now(),
        updated_by = p_user_id
    WHERE id = v_txn.receipt_id;
  END IF;

  -- 5. Update inventory transaction
  UPDATE public.inventory_transactions 
  SET quantity = p_new_quantity,
      sale_unit_price = p_new_unit_price,
      sale_total = v_new_sale_total
  WHERE id = p_txn_id;

  -- 6. Update stock
  UPDATE public.inventory_items
  SET current_stock = v_new_stock,
      updated_at = now(),
      updated_by = p_user_id
  WHERE id = v_txn.item_id;

  RETURN jsonb_build_object(
    'success', true,
    'current_stock', v_new_stock
  );
END;
$function$
;
