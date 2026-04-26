# Phase 02: Parallelize + Slim Query
Status: ✅ Complete
Dependencies: Phase 01

## Objective
Tối ưu `getContractDetail()` cho cold start — giảm từ ~1,088ms xuống ~500ms.
Bỏ waterfall 2-phase, chạy ALL queries song song.

## Nguyên lý

```
BEFORE (waterfall):
Phase 1: SELECT * + 5 JOINs (~600ms)
    ↓ WAIT
Phase 2: Promise.all(5 queries) (~500ms)
Total: ~1,088ms

AFTER (parallel):
Promise.all(7 queries) (~500ms max)
Total: ~500ms
```

## Implementation Steps

### 1. Tách contract core query khỏi embedded JOINs
- [ ] File: `app/actions/contract-queries.ts` function `getContractDetail`
- [ ] Query contracts với explicit columns (bỏ `SELECT *`)
- [ ] Giữ embedded JOINs cho `customers`, `contract_items` (cần cho render)
- [ ] Tách `contract_events`, `work_tasks`, `contract_checklists` ra query riêng

### 2. Chạy tất cả queries trong 1 Promise.all
- [ ] 7 queries song song:
  1. contracts + customers + contract_items (embedded)
  2. contract_events
  3. work_tasks (+ employee join)
  4. contract_checklists
  5. payments
  6. dress_reservations
  7. payment_plans
  8. audit_logs
  9. printing_orders

### 3. Explicit columns cho contracts table
- [ ] Thay `SELECT *` bằng danh sách cột cần thiết
- [ ] Loại bỏ columns lớn không cần render

```typescript
// BEFORE
.select(`*, customers(...), contract_items(...), ...`)

// AFTER  
.select(`
  id, contract_code, status, service_type, work_date, contract_date,
  total_amount, paid_amount, remaining_amount, deposit_amount,
  discount_amount, notes, payment_status, customer_id,
  work_time, work_location, created_at, updated_at, deleted_at,
  customers (id, customer_code, full_name, phone, ...),
  contract_items (id, type, item_name, ...)
`)
```

## Files to Create/Modify
- `app/actions/contract-queries.ts` — Restructure getContractDetail

## Test Criteria
- [ ] Cold start: < 800ms total page load
- [ ] Data integrity: tất cả fields vẫn render đúng
- [ ] TypeScript: 0 errors

---
Next Phase: phase-03-cache-auth.md
