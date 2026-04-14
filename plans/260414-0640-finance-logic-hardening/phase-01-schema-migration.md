# Phase 01: Schema Migration
Status: ⬜ Pending
Dependencies: None (DB-first)

## Objective
Tạo 3 migration files đồng bộ DB schema với types đã khai báo, tạo RPC atomic cho sale receipt, và fix soft-delete filter trong dashboard RPCs.

## Requirements
### Functional
- [ ] `receipts` table có `deleted_at`, `created_by`, `updated_by` columns
- [ ] Indexes tối ưu cho active receipt queries (date, contract_id, type)
- [ ] RPC `create_sale_receipt_atomic` — validate tồn kho → insert receipt → xuất kho, trong 1 transaction
- [ ] Tất cả dashboard RPCs filter `deleted_at IS NULL` trên `receipts`

### Non-Functional
- [ ] Idempotent: `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`
- [ ] `CREATE OR REPLACE FUNCTION` cho RPCs (không break existing)
- [ ] Revoke PUBLIC, chỉ grant service_role

## Implementation Steps

### Step 1: `20260414060000_receipts_columns_and_indexes.sql`

```sql
-- Idempotent schema sync
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS created_by uuid NULL;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS updated_by uuid NULL;

-- Partial indexes (active receipts only)
CREATE INDEX IF NOT EXISTS idx_receipts_active_date
  ON public.receipts(receipt_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_receipts_active_contract
  ON public.receipts(contract_id) WHERE deleted_at IS NULL AND contract_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_receipts_active_type
  ON public.receipts(receipt_type) WHERE deleted_at IS NULL;
```

> **Quyết định:** KHÔNG tạo trigram index (cần pg_trgm extension, rủi ro trên hosted Supabase). Simple ILIKE đủ cho volume hiện tại (<10K receipts). Nếu cần tối ưu search sau → tạo RPC search riêng.

### Step 2: `20260414060001_create_sale_receipt_atomic_rpc.sql`

```sql
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
  -- Phase 1: Validate ALL stock first (fail fast → zero partial writes)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT current_stock, name INTO v_current_stock, v_item_name
    FROM public.inventory_items
    WHERE id = (v_item->>'item_id')::uuid AND deleted_at IS NULL
    FOR UPDATE;  -- row lock prevents race condition

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
    status
  ) VALUES (
    (p_receipt->>'receipt_date')::date,
    p_receipt->>'receipt_type',
    p_receipt->>'payment_type',
    (p_receipt->>'receipt_amount')::numeric,
    COALESCE(p_receipt->>'notes', ''),
    NULLIF(p_receipt->>'category_id', ''),
    COALESCE(p_receipt->>'category_name', ''),
    NULLIF(p_receipt->>'customer_name', ''),
    NULLIF(p_receipt->>'customer_phone', ''),
    'confirmed'
  ) RETURNING id INTO v_receipt_id;

  -- Phase 3: Insert inventory_transactions + decrement stock (per item)
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
GRANT EXECUTE ON FUNCTION public.create_sale_receipt_atomic(jsonb, jsonb) TO service_role;
```

### Step 3: `20260414060002_fix_rpcs_soft_delete.sql`

```sql
-- Fix: thêm `AND deleted_at IS NULL` vào tất cả receipts subqueries.
-- Dùng CREATE OR REPLACE, signature không đổi → idempotent.

-- 3a. finance_dashboard_metrics — 2 receipts subqueries
CREATE OR REPLACE FUNCTION public.finance_dashboard_metrics(
  p_month INT, p_year INT
) RETURNS TABLE (...same signature...) AS $$ ... $$;
-- Thay đổi duy nhất:
--   Line "WHERE contract_id IS NULL AND receipt_date >= ..."
--   → "WHERE contract_id IS NULL AND deleted_at IS NULL AND receipt_date >= ..."
-- (2 chỗ: current month + previous month)

-- 3b. finance_revenue_by_month — 1 receipts CTE
CREATE OR REPLACE FUNCTION public.finance_revenue_by_month(
  p_year INT
) RETURNS TABLE (...same...) AS $$ ... $$;
-- receipts_by_month CTE: thêm "AND deleted_at IS NULL"

-- 3c. finance_ledger — 1 receipts UNION ALL block
CREATE OR REPLACE FUNCTION public.finance_ledger(
  p_page INT, p_page_size INT, p_month INT, p_year INT, p_type TEXT
) RETURNS TABLE (...same...) AS $$ ... $$;
-- receipts block: thêm "WHERE r.deleted_at IS NULL" (hiện tại KHÔNG có WHERE)
```

## Files to Create/Modify
- `supabase/migrations/20260414060000_receipts_columns_and_indexes.sql` — [NEW]
- `supabase/migrations/20260414060001_create_sale_receipt_atomic_rpc.sql` — [NEW]
- `supabase/migrations/20260414060002_fix_rpcs_soft_delete.sql` — [NEW]

## Test Criteria
- [ ] `supabase migration up` thành công (không lỗi)
- [ ] `\d public.receipts` hiện 3 cột mới + indexes
- [ ] `SELECT proname FROM pg_proc WHERE proname = 'create_sale_receipt_atomic'` trả về 1 row
- [ ] Dashboard metrics exclude receipts có deleted_at

## Notes
- Tất cả migration phải idempotent (chạy lại không lỗi)
- Không touch existing columns/functions mà không cần thiết
- `FOR UPDATE` lock trong sale RPC ngăn race condition khi 2 user bán cùng vật tư

---
Next Phase: [Phase 02 — Contract Receipt Pipeline](phase-02-receipt-pipeline.md)
