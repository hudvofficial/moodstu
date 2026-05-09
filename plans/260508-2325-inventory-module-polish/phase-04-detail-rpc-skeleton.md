# Phase 04: Detail Page — Single RPC + Skeleton
Status: ⬜ Pending
Dependencies: None (independent)

## Objective
2 tối ưu cho `/inventory/[id]` detail page:
1. Gộp 3 queries thành 1 RPC `inventory_detail_v2`
2. Thêm `loading.tsx` skeleton cho instant perceived load

## Vấn đề hiện tại

### 3 round-trips cho detail
```ts
// inventory-queries.ts — fetchInventoryDetail()
const [itemRes, txnRes, totalsRes] = await Promise.all([
  supabase.from("inventory_items").select(...)...,           // Query 1: item info
  supabase.from("inventory_transactions").select(...)...,    // Query 2: transactions
  supabase.rpc("inventory_item_transaction_totals", ...),    // Query 3: totals
]);
```
`Promise.all` song song nhưng vẫn 3 round-trips tới Supabase.

### Không có loading skeleton
`/inventory/[id]/` không có `loading.tsx` → blank screen cho đến khi RSC resolve.

## Implementation Steps

### A. Database — Tạo RPC
1. [ ] **Supabase Migration** — Tạo function `inventory_detail_v2(p_item_id uuid)`:
   - Returns JSON object chứa:
     - `item`: thông tin vật tư (từ `inventory_items`)
     - `transactions`: 50 giao dịch gần nhất (từ `inventory_transactions`)
     - `totals`: `totalIn`, `totalOut`, `transactionCount` (aggregated)
   - 1 function = 1 DB round-trip thay vì 3

2. [ ] **Test RPC** — Chạy trực tiếp trên Supabase để verify output format

### B. Server Action — Sử dụng RPC mới
3. [ ] **inventory-queries.ts** — Update `fetchInventoryDetail()`:
   - Try `inventory_detail_v2()` trước
   - Fallback sang 3 queries cũ nếu RPC fail (safe migration pattern, giống contracts)
   ```ts
   // Try new RPC first
   const { data, error } = await supabase.rpc("inventory_detail_v2", { p_item_id: id });
   if (!error && data) return normalizeDetailV2(data);
   
   // Fallback to legacy 3-query pattern
   const [itemRes, txnRes, totalsRes] = await Promise.all([...]);
   ```

### C. Loading Skeleton
4. [ ] **Tạo `app/(protected)/inventory/[id]/loading.tsx`** — Skeleton layout matching detail page:
   - Breadcrumb skeleton
   - Header card skeleton (avatar + name + badges)
   - Desktop: detail-grid (main 8col + sidebar 4col) skeletons
   - Mobile: stacked card skeletons

### D. Profiling
5. [ ] **Benchmark** — So sánh timing trước/sau:
   - `profileAction("inventory.fetchInventoryDetail")` log timing
   - Target: 3 queries (~150-200ms) → 1 RPC (~50-80ms)

## Files to Create
- `app/(protected)/inventory/[id]/loading.tsx` — Detail skeleton

## Files to Modify
- `app/actions/inventory-queries.ts` — fetchInventoryDetail() with RPC fallback

## Supabase Migration
```sql
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
```

## Test Criteria
- [ ] Navigate to `/inventory/[id]` → skeleton hiện ngay (< 100ms perceived)
- [ ] Detail data load chính xác (item info + transactions + totals)
- [ ] RPC timing < 100ms (check profiler logs)
- [ ] Fallback works: nếu RPC fail → legacy queries vẫn chạy đúng
- [ ] `npm run build` passes

---
Next Phase: phase-05-qa-verification.md
