-- Sửa delete_fulfillment_transaction_atomic: xoá receipts TRƯỚC khi xoá
-- inventory_transactions trong khi inventory_transactions.receipt_id còn FK
-- trỏ receipts → 23503 → xoá phát sinh bán lẻ chưa từng chạy được.
-- (Nhánh contract_addon_sale không dính — không đụng receipts.)
-- Đảo thứ tự: xoá txn con trước, receipt sau.
-- Bắt được khi e2e chuỗi add→update→delete. Prod có 0 phát sinh nên chưa ai gặp.
-- Nguồn: pg_get_functiondef trên prod 2026-08-08, chỉ áp đúng 1 sửa trên.

CREATE OR REPLACE FUNCTION public.delete_fulfillment_transaction_atomic(p_txn_id uuid, p_user_id uuid)
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
  v_new_stock integer;
  v_new_total numeric;
  v_new_paid numeric;
  v_new_remaining numeric;
  v_payment_status text;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: actor_id is required';
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
    RAISE EXCEPTION 'Chỉ có thể xoá phiếu phát sinh (phải có parent_transaction_id)';
  END IF;

  -- 2. Lock and load inventory item
  SELECT * INTO v_item
  FROM public.inventory_items
  WHERE id = v_txn.item_id
  FOR UPDATE;

  v_new_stock := COALESCE(v_item.current_stock, 0) + v_txn.quantity;

  -- 3. Handle financial reversals
  IF v_txn.sale_total > 0 THEN
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
          RAISE EXCEPTION 'Hợp đồng đã hủy, không thể xoá phát sinh';
        END IF;

        -- Delete payment and contract_item
        DELETE FROM public.payments WHERE id = v_payment.id;
        IF v_payment.contract_adjustment_item_id IS NOT NULL THEN
          DELETE FROM public.contract_items WHERE id = v_payment.contract_adjustment_item_id;
        END IF;

        -- Update contract amounts
        v_new_total := COALESCE(v_contract.total_amount, 0) - v_txn.sale_total;
        v_new_paid := COALESCE(v_contract.paid_amount, 0) - v_txn.sale_total;
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

    END IF;
  END IF;

  -- 4. Delete inventory transaction TRƯỚC — inventory_transactions.receipt_id
  -- có FK trỏ receipts, xoá receipt trước sẽ vỡ 23503.
  DELETE FROM public.inventory_transactions WHERE id = p_txn_id;

  -- 4b. Rồi mới xoá receipt của phát sinh bán lẻ (nếu có)
  IF v_txn.source_type = 'retail_sale' AND v_txn.receipt_id IS NOT NULL THEN
    DELETE FROM public.receipts WHERE id = v_txn.receipt_id;
  END IF;

  -- 5. Update stock
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
