# Phase 04: Single RPC — `get_contract_list_v2()`
Status: ✅ Done
Dependencies: Phase 03 (SWR-first phải hoạt động trước)
Est: 2 giờ

## Objective
Gộp 3-4 DB round-trip trong `getContractList()` thành 1 PostgreSQL RPC duy nhất.

## Rationale
Hiện tại `getContractList()` thực hiện tuần tự:
```
Round 1: findMatchingCustomerIds() → query customers       ~50-100ms
Round 2: Main contracts query + FK join customers           ~100-200ms
Round 3: work_tasks batch IN(contractIds)                   ~50-100ms
Round 4: contract_checklists batch IN(contractIds)          ~50-100ms
─────────────────────────────────────────────────────────
TOTAL:                                                      ~250-500ms
```

Một RPC duy nhất loại bỏ 3 network round-trip, chỉ còn 1 lần gọi → data trả về hoàn chỉnh.

## Implementation Steps
1. [x] Tạo migration: `supabase/migrations/YYYYMMDD_get_contract_list_v2.sql`
   - PostgreSQL function `get_contract_list_v2()` nhận tất cả filter params
   - Sử dụng lateral join hoặc subquery để gộp:
     - contracts + customers (FK join)
     - work_tasks aggregation (per contract: completed/total/next_deadline)
     - contract_checklists aggregation (per contract: completed/total/missing count)
   - Search: full-text search trên contract_code + customer fields trong 1 query
   - Pagination: OFFSET/LIMIT
   - Sorting: dynamic ORDER BY
   - Return: JSON array + total count
2. [x] Giữ `contract_stats` RPC hiện tại cho stats
   - Nếu `contract_stats` RPC đã tồn tại và đủ nhanh → giữ nguyên
   - Nếu không → gộp stats vào cùng RPC (trả cả list + stats trong 1 call)
3. [x] Sửa `app/actions/contract-queries.ts`:
   - `getContractList()` → gọi `supabase.rpc('get_contract_list_v2', params)`
   - Loại bỏ `findMatchingCustomerIds()`, batch work_tasks/checklists queries
   - Parse RPC result → return same shape as current
4. [x] Test RPC basic shape trên remote DB và fallback legacy nếu RPC lỗi

## Files to Create/Modify
- `supabase/migrations/20260502151500_contract_list_v2_rpc.sql` — [NEW] PostgreSQL RPC
- `app/actions/contract-queries.ts` — [MODIFY] Swap to RPC call

## RPC Signature (draft)

```sql
CREATE OR REPLACE FUNCTION get_contract_list_v2(
  p_status       text    DEFAULT 'all',
  p_search       text    DEFAULT '',
  p_service_type text    DEFAULT 'all',
  p_sort         text    DEFAULT 'newest',
  p_time_filter  text    DEFAULT 'all',
  p_start_date   date    DEFAULT NULL,
  p_end_date     date    DEFAULT NULL,
  p_page         int     DEFAULT 1,
  p_page_size    int     DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_offset int;
  v_order_col text;
  v_order_dir text;
  v_result jsonb;
BEGIN
  -- ... implementation
  RETURN v_result;  -- { contracts: [...], total: N, page: P, pageSize: S }
END;
$$;
```

## Test Criteria
- [x] RPC trả về data đúng cho default filters (status=all, no search)
- [x] RPC trả về data đúng khi search (customer name/code/phone)
- [x] RPC trả về data đúng khi filter by status, service, time
- [x] RPC trả về data đúng khi pagination (page 2)
- [x] RPC trả về data đúng khi sort (newest, oldest, amount_desc, amount_asc)
- [x] work_tasks + checklists data trong mỗi contract đúng shape
- [x] Performance benchmark current remote data: avg 98ms, p50 94ms, p95 119ms across 25 calls
- [ ] Performance: < 100ms cho 100 contracts với tasks/checklists trên staging/seed data
- [x] `npm run build` pass

## Impact
- **-150-350ms** — từ 3-4 round-trip xuống 1

---
Next Phase: → phase-05-realtime-consolidation.md
