---
title: "Thân hàm DB — vat-tu"
tags: [sinh-tu-dong, db, ham, vat-tu]
cap-nhat: 2026-09-10
trang-thai: sinh-tu-dong
nguon: pg_proc · pg_policies · information_schema.role_table_grants
---

> ⚙️ **File này do `scripts/vault-gen-db-truth.mjs` sinh ra từ database production. ĐỪNG sửa tay** — chạy lại script để cập nhật.

# Thân hàm DB — vat-tu

11 hàm. `SECURITY DEFINER` = chạy bằng quyền chủ hàm, **bỏ qua RLS** → hàm loại này phải tự kiểm quyền bên trong.

| Hàm | Tham số | Trả về | Quyền | Ngôn ngữ |
|---|---|---|---|---|
| [`add_fulfillment_transaction_atomic`](#add_fulfillment_transaction_atomic) | `p_parent_txn_id uuid, p_new_item_id uuid, p_quantity integer, p_sale_unit_price numeric, p_payment_method payment_method_enum, p_payment_date date, p_user_id uuid` | `jsonb` | **DEFINER** | plpgsql |
| [`create_sale_receipt_atomic`](#create_sale_receipt_atomic) | `p_receipt jsonb, p_items jsonb` | `jsonb` | invoker | plpgsql |
| [`delete_fulfillment_transaction_atomic`](#delete_fulfillment_transaction_atomic) | `p_txn_id uuid, p_user_id uuid` | `jsonb` | **DEFINER** | plpgsql |
| [`inventory_detail_v2`](#inventory_detail_v2) | `p_item_id uuid` | `jsonb` | **DEFINER** | plpgsql |
| [`inventory_item_transaction_totals`](#inventory_item_transaction_totals) | `p_item_id uuid` | `jsonb` | invoker | plpgsql |
| [`inventory_list`](#inventory_list) | `p_search text, p_category text, p_status text, p_sort text, p_page integer, p_limit integer` | `jsonb` | invoker | plpgsql |
| [`inventory_stats`](#inventory_stats) | `—` | `jsonb` | invoker | plpgsql |
| [`inventory_stock_in_atomic`](#inventory_stock_in_atomic) | `p_item_id uuid, p_quantity integer, p_unit_cost numeric, p_supplier text, p_reason text, p_notes text, p_user_id uuid, p_supplier_id uuid, p_paid boolean, p_payment_method text, p_paid_date date` | `jsonb` | **DEFINER** | plpgsql |
| [`inventory_stock_out_atomic`](#inventory_stock_out_atomic) | `p_item_id uuid, p_quantity integer, p_contract_id uuid, p_reason text, p_customer_name text, p_customer_phone text, p_notes text, p_user_id uuid` | `jsonb` | invoker | plpgsql |
| [`restore_inventory_from_transaction`](#restore_inventory_from_transaction) | `p_source_type text, p_source_id uuid, p_reason text, p_actor_id uuid` | `void` | invoker | plpgsql |
| [`update_fulfillment_transaction_atomic`](#update_fulfillment_transaction_atomic) | `p_txn_id uuid, p_new_quantity integer, p_new_unit_price numeric, p_user_id uuid` | `jsonb` | **DEFINER** | plpgsql |

---

## add_fulfillment_transaction_atomic

`add_fulfillment_transaction_atomic(p_parent_txn_id uuid, p_new_item_id uuid, p_quantity integer, p_sale_unit_price numeric, p_payment_method payment_method_enum, p_payment_date date, p_user_id uuid)` → `jsonb` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
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
```

---

## create_sale_receipt_atomic

`create_sale_receipt_atomic(p_receipt jsonb, p_items jsonb)` → `jsonb` · SECURITY INVOKER · plpgsql · VOLATILE

```sql
DECLARE
  v_receipt_id uuid;
  v_item jsonb;
  v_current_stock int;
  v_item_name text;
  v_status text;
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

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Sale receipt must contain an item array';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Sale receipt must contain at least one item';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := COALESCE(NULLIF(v_item->>'quantity', '')::int, 0);
    v_sale_price := COALESCE(
      NULLIF(v_item->>'sale_unit_price', '')::numeric,
      NULLIF(v_item->>'unit_cost', '')::numeric,
      0
    );

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid sale quantity for item "%"', COALESCE(v_item->>'item_name', v_item->>'item_id');
    END IF;

    IF v_sale_price <= 0 THEN
      RAISE EXCEPTION 'Invalid sale price for item "%"', COALESCE(v_item->>'item_name', v_item->>'item_id');
    END IF;

    SELECT COALESCE(current_stock, 0), name, status, COALESCE(average_unit_price, 0)
    INTO v_current_stock, v_item_name, v_status, v_unit_cost
    FROM public.inventory_items
    WHERE id = (v_item->>'item_id')::uuid AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Inventory item "%" does not exist', COALESCE(v_item->>'item_name', v_item->>'item_id');
    END IF;

    IF v_status IS DISTINCT FROM 'active' THEN
      RAISE EXCEPTION 'Cannot sell discontinued inventory item "%"', v_item_name;
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
    v_sale_price := COALESCE(
      NULLIF(v_item->>'sale_unit_price', '')::numeric,
      NULLIF(v_item->>'unit_cost', '')::numeric,
      0
    );

    SELECT COALESCE(average_unit_price, 0)
    INTO v_unit_cost
    FROM public.inventory_items
    WHERE id = (v_item->>'item_id')::uuid;

    INSERT INTO public.inventory_transactions (
      item_id, transaction_type, quantity, unit_cost,
      reason, notes, customer_name, customer_phone,
      source_type, source_id, receipt_id, sale_unit_price, sale_total, payment_method,
      performed_by, created_by
    ) VALUES (
      (v_item->>'item_id')::uuid,
      'stock_out',
      v_qty,
      v_unit_cost,
      'Ban vat tu',
      NULLIF(COALESCE(p_receipt->>'notes', ''), ''),
      NULLIF(p_receipt->>'customer_name', ''),
      NULLIF(p_receipt->>'customer_phone', ''),
      'retail_sale',
      v_receipt_id,
      v_receipt_id,
      v_sale_price,
      v_qty * v_sale_price,
      NULLIF(p_receipt->>'payment_type', ''),
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
```

---

## delete_fulfillment_transaction_atomic

`delete_fulfillment_transaction_atomic(p_txn_id uuid, p_user_id uuid)` → `jsonb` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
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
```

---

## inventory_detail_v2

`inventory_detail_v2(p_item_id uuid)` → `jsonb` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
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
```

---

## inventory_item_transaction_totals

`inventory_item_transaction_totals(p_item_id uuid)` → `jsonb` · SECURITY INVOKER · plpgsql · STABLE

```sql
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
```

---

## inventory_list

`inventory_list(p_search text, p_category text, p_status text, p_sort text, p_page integer, p_limit integer)` → `jsonb` · SECURITY INVOKER · plpgsql · STABLE

```sql
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
```

---

## inventory_stats

`inventory_stats()` → `jsonb` · SECURITY INVOKER · plpgsql · STABLE

```sql
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
```

---

## inventory_stock_in_atomic

`inventory_stock_in_atomic(p_item_id uuid, p_quantity integer, p_unit_cost numeric, p_supplier text, p_reason text, p_notes text, p_user_id uuid, p_supplier_id uuid, p_paid boolean, p_payment_method text, p_paid_date date)` → `jsonb` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  v_current_stock integer; v_old_avg numeric; v_new_stock integer; v_new_avg numeric; v_item_name text; v_status text;
  v_txn_id uuid; v_supplier_id uuid; v_expense jsonb;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be greater than 0'; END IF;
  IF p_unit_cost IS NULL OR p_unit_cost < 0 THEN RAISE EXCEPTION 'Unit cost must be greater than or equal to 0'; END IF;
  SELECT COALESCE(current_stock, 0), COALESCE(average_unit_price, 0), name, status, supplier_id
  INTO v_current_stock, v_old_avg, v_item_name, v_status, v_supplier_id
  FROM public.inventory_items WHERE id = p_item_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inventory item does not exist'; END IF;
  IF v_status IS DISTINCT FROM 'active' THEN RAISE EXCEPTION 'Cannot stock in discontinued inventory item'; END IF;
  v_supplier_id := COALESCE(p_supplier_id, v_supplier_id);
  IF p_paid AND p_quantity * p_unit_cost > 0 AND v_supplier_id IS NULL THEN
    RAISE EXCEPTION 'Nhap kho da tra tien can chon nha cung cap';
  END IF;

  v_new_stock := v_current_stock + p_quantity;
  v_new_avg := CASE WHEN v_new_stock > 0 THEN ((v_current_stock * v_old_avg) + (p_quantity * p_unit_cost)) / v_new_stock ELSE p_unit_cost END;

  INSERT INTO public.inventory_transactions (item_id, transaction_type, quantity, unit_cost, supplier, reason, notes, source_type, performed_by, created_by)
  VALUES (p_item_id, 'stock_in', p_quantity, p_unit_cost, NULLIF(BTRIM(COALESCE(p_supplier, '')), ''), COALESCE(NULLIF(BTRIM(COALESCE(p_reason, '')), ''), 'Nhap kho'), NULLIF(BTRIM(COALESCE(p_notes, '')), ''), 'stock_in', p_user_id, p_user_id)
  RETURNING id INTO v_txn_id;

  UPDATE public.inventory_items
  SET current_stock = v_new_stock, average_unit_price = ROUND(v_new_avg, 2), purchase_price = p_unit_cost,
      supplier_id = v_supplier_id, updated_by = p_user_id, updated_at = now()
  WHERE id = p_item_id;

  IF p_paid AND p_quantity * p_unit_cost > 0 THEN
    v_expense := public.record_payee_payment_atomic('supplier', v_supplier_id, p_quantity * p_unit_cost, p_payment_method, p_paid_date,
      'Nhập phôi ' || v_item_name || ' ×' || p_quantity,
      jsonb_build_array(jsonb_build_object('target_id', v_txn_id, 'amount', p_quantity * p_unit_cost)), p_user_id);
  END IF;

  RETURN jsonb_build_object('item_id', p_item_id, 'item_name', v_item_name, 'current_stock', v_new_stock, 'average_unit_price', ROUND(v_new_avg, 2),
                            'transaction_id', v_txn_id, 'expense_id', v_expense->>'expense_id');
END
```

---

## inventory_stock_out_atomic

`inventory_stock_out_atomic(p_item_id uuid, p_quantity integer, p_contract_id uuid, p_reason text, p_customer_name text, p_customer_phone text, p_notes text, p_user_id uuid)` → `jsonb` · SECURITY INVOKER · plpgsql · VOLATILE

```sql
DECLARE
  v_current_stock integer;
  v_min_stock integer;
  v_new_stock integer;
  v_unit_cost numeric;
  v_item_name text;
  v_status text;
  v_warning text;
  v_source_type text;
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

  v_source_type := CASE WHEN p_contract_id IS NOT NULL THEN 'contract_fulfillment' ELSE 'internal_use' END;
  v_new_stock := v_current_stock - p_quantity;

  INSERT INTO public.inventory_transactions (
    item_id, transaction_type, quantity, unit_cost,
    contract_id, reason, customer_name, customer_phone, notes,
    source_type, performed_by, created_by
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
    v_source_type,
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
```

---

## restore_inventory_from_transaction

`restore_inventory_from_transaction(p_source_type text, p_source_id uuid, p_reason text, p_actor_id uuid)` → `void` · SECURITY INVOKER · plpgsql · VOLATILE

```sql
DECLARE
  v_tx record;
  v_current_stock integer;
BEGIN
  FOR v_tx IN
    SELECT it.*
    FROM public.inventory_transactions it
    WHERE it.transaction_type = 'stock_out'
      AND it.source_type = p_source_type
      AND it.source_id = p_source_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.inventory_transactions restored
        WHERE restored.transaction_type = 'stock_in'
          AND restored.source_type = 'return'
          AND restored.source_id = p_source_id
          AND restored.item_id = it.item_id
      )
  LOOP
    SELECT COALESCE(current_stock, 0)
    INTO v_current_stock
    FROM public.inventory_items
    WHERE id = v_tx.item_id
    FOR UPDATE;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    INSERT INTO public.inventory_transactions (
      item_id, transaction_type, quantity, unit_cost,
      contract_id, reason, notes, customer_name, customer_phone,
      source_type, source_id, receipt_id, sale_unit_price, sale_total, payment_method,
      performed_by, created_by
    ) VALUES (
      v_tx.item_id,
      'stock_in',
      v_tx.quantity,
      COALESCE(v_tx.unit_cost, 0),
      v_tx.contract_id,
      p_reason,
      CONCAT('Restore from stock-out transaction: ', v_tx.id::text),
      v_tx.customer_name,
      v_tx.customer_phone,
      'return',
      p_source_id,
      v_tx.receipt_id,
      v_tx.sale_unit_price,
      v_tx.sale_total,
      v_tx.payment_method,
      p_actor_id,
      p_actor_id
    );

    UPDATE public.inventory_items
    SET current_stock = v_current_stock + COALESCE(v_tx.quantity, 0),
        updated_at = now(),
        updated_by = p_actor_id
    WHERE id = v_tx.item_id;
  END LOOP;
END;
```

---

## update_fulfillment_transaction_atomic

`update_fulfillment_transaction_atomic(p_txn_id uuid, p_new_quantity integer, p_new_unit_price numeric, p_user_id uuid)` → `jsonb` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
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
```
