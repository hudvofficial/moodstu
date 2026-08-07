-- Sửa add_fulfillment_transaction_atomic nhánh bán lẻ (không gắn hợp đồng):
-- INSERT receipts truyền category_id = chuỗi rỗng vào cột uuid → 22P02
-- "invalid input syntax for type uuid" → nhánh này chưa từng chạy được.
-- (Prod hiện có 0 phát sinh nên chưa ai gặp; bắt được khi e2e chuỗi
-- add→update→delete cho task sửa phát sinh.) Đổi thành NULL — cột nullable.
-- Nguồn: pg_get_functiondef trên prod 2026-08-08, chỉ áp đúng 1 sửa trên.

CREATE OR REPLACE FUNCTION public.add_fulfillment_transaction_atomic(p_parent_txn_id uuid, p_new_item_id uuid, p_quantity integer, p_sale_unit_price numeric, p_payment_method payment_method_enum, p_payment_date date, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_parent_txn public.inventory_transactions%ROWTYPE;
  v_item public.inventory_items%ROWTYPE;
  v_contract public.contracts%ROWTYPE;
  v_total_amount numeric;
  v_new_stock integer;
  
  -- For financial links
  v_payment_id uuid := NULL;
  v_contract_item_id uuid := NULL;
  v_receipt_id uuid := NULL;
  v_receipt_code text := NULL;
  v_new_total numeric;
  v_new_paid numeric;
  v_new_remaining numeric;
  v_payment_status text;
  v_stage_label text;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: actor_id is required';
  END IF;

  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than 0';
  END IF;

  -- 1. Lock and load parent transaction
  SELECT * INTO v_parent_txn
  FROM public.inventory_transactions
  WHERE id = p_parent_txn_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy đợt in gốc';
  END IF;

  -- 2. Lock and load new inventory item
  SELECT * INTO v_item
  FROM public.inventory_items
  WHERE id = p_new_item_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mã vật tư không tồn tại';
  END IF;

  IF v_item.status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'Không thể xuất vật tư đang ngưng sử dụng';
  END IF;

  IF COALESCE(v_item.current_stock, 0) < p_quantity THEN
    RAISE EXCEPTION 'Vật tư % không đủ tồn kho. Tồn hiện tại: %', v_item.name, COALESCE(v_item.current_stock, 0);
  END IF;

  v_total_amount := p_quantity * p_sale_unit_price;
  v_new_stock := COALESCE(v_item.current_stock, 0) - p_quantity;

  -- 3. If there is a cost (> 0), link to finance
  IF v_total_amount > 0 THEN
    -- A. If linked to contract
    IF v_parent_txn.contract_id IS NOT NULL THEN
      SELECT * INTO v_contract
      FROM public.contracts
      WHERE id = v_parent_txn.contract_id AND deleted_at IS NULL
      FOR UPDATE;

      IF v_contract.status = 'da_huy' THEN
        RAISE EXCEPTION 'Hợp đồng đã hủy, không thể bán thêm';
      END IF;

      v_payment_id := gen_random_uuid();
      v_receipt_code := public.contract_payment_receipt_code(v_payment_id, p_payment_date);
      v_stage_label := public.payment_stage_display_label_v2('phat_sinh', 'Phat sinh hop dong');

      INSERT INTO public.contract_items (
        contract_id, type, item_name, quantity, unit_price,
        original_price, discount_amount, total_amount, is_addon, addon_category,
        notes, added_by
      ) VALUES (
        v_parent_txn.contract_id, 'phat_sinh'::public.item_type_enum,
        LEFT(CONCAT('Bổ sung: ', v_item.name, ' (', v_item.item_code, ')'), 120),
        p_quantity, p_sale_unit_price, p_sale_unit_price, 0, v_total_amount,
        true, 'khac'::public.addon_category_enum, 'In bổ sung phát sinh', p_user_id
      ) RETURNING id INTO v_contract_item_id;

      INSERT INTO public.payments (
        id, contract_id, customer_id, amount, payment_method,
        payment_date, payment_stage, notes, receipt_code,
        created_by, approved_by, is_contract_adjustment, contract_adjustment_item_id
      ) VALUES (
        v_payment_id, v_parent_txn.contract_id, v_contract.customer_id,
        v_total_amount, p_payment_method, p_payment_date,
        v_stage_label, 'Thu tiền in bổ sung phát sinh', v_receipt_code,
        p_user_id, p_user_id, true, v_contract_item_id
      );

      v_new_total := COALESCE(v_contract.total_amount, 0) + v_total_amount;
      v_new_paid := COALESCE(v_contract.paid_amount, 0) + v_total_amount;
      v_new_remaining := GREATEST(0, v_new_total - v_new_paid);
      v_payment_status := public.contract_payment_status_v2(v_new_paid, v_new_remaining);

      UPDATE public.contracts
      SET total_amount = v_new_total,
          paid_amount = v_new_paid,
          remaining_amount = v_new_remaining,
          payment_status = v_payment_status,
          updated_at = now(),
          updated_by = p_user_id
      WHERE id = v_parent_txn.contract_id;

    ELSE
      -- B. Retail Sale
      v_receipt_id := gen_random_uuid();
      
      INSERT INTO public.receipts (
        id, receipt_date, receipt_type, payment_type, receipt_amount,
        notes, category_id, category_name, customer_name, customer_phone,
        created_by
      ) VALUES (
        v_receipt_id, p_payment_date, 'sale_receipt', p_payment_method,
        v_total_amount, 'Thu tiền in bổ sung phát sinh', NULL, 'Bán vật tư',
        COALESCE(v_parent_txn.customer_name, 'Khách lẻ'),
        COALESCE(v_parent_txn.customer_phone, ''),
        p_user_id
      );
    END IF;
  END IF;

  -- 4. Create inventory transaction
  INSERT INTO public.inventory_transactions (
    item_id, transaction_type, quantity, unit_cost,
    contract_id, reason, notes, customer_name, customer_phone, customer_address,
    source_type, source_id, receipt_id, sale_unit_price, sale_total, payment_method,
    performed_by, created_by, parent_transaction_id
  ) VALUES (
    p_new_item_id,
    'stock_out',
    p_quantity,
    COALESCE(v_item.average_unit_price, 0), -- Cost of Goods Sold
    v_parent_txn.contract_id,
    'In bổ sung phát sinh',
    'Bổ sung cho phiếu xuất gốc',
    v_parent_txn.customer_name,
    v_parent_txn.customer_phone,
    v_parent_txn.customer_address,
    CASE 
      WHEN v_total_amount > 0 AND v_parent_txn.contract_id IS NOT NULL THEN 'contract_addon_sale'
      WHEN v_total_amount > 0 AND v_parent_txn.contract_id IS NULL THEN 'retail_sale'
      ELSE 'contract_fulfillment' 
    END,
    COALESCE(v_payment_id, p_parent_txn_id),
    v_receipt_id,
    p_sale_unit_price,
    v_total_amount,
    p_payment_method::text,
    p_user_id,
    p_user_id,
    p_parent_txn_id
  );

  -- 5. Update stock
  UPDATE public.inventory_items
  SET current_stock = v_new_stock,
      updated_at = now(),
      updated_by = p_user_id
  WHERE id = p_new_item_id;

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'receipt_id', v_receipt_id,
    'contract_item_id', v_contract_item_id,
    'current_stock', v_new_stock
  );
END;
$function$
;
