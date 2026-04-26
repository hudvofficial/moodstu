# Phase 00: Fix Regression — List Badges Missing Data
Status: ✅ Complete
Dependencies: None
Priority: 🔴 CRITICAL (regression from previous session)

## Root Cause

Session trước Phase 02 đã bỏ `work_tasks` và `contract_checklists` JOINs khỏi 
`getContractList()` query (line 88-94 trong contract-queries.ts) để giảm payload.

**Nhưng** 2 component trên contracts table VẪN đọc data này:
- `ProgressBadge` → `getArr(c, "work_tasks")` → nhận `[]` → hiện "Chưa có task"  
- `MissingInfoBadge` → `getArr(c, "contract_checklists")` → nhận `[]` → hiện "—"

## Fix Strategy

Thêm lại 2 JOINs nhưng chỉ lấy **minimum fields** cần thiết cho badges:

### work_tasks (ProgressBadge cần):
- `id` — key
- `work_type` — phân nhóm Tiền kỳ/Sản xuất/Hậu kỳ
- `status` — tính progress %
- `deadline` — check overdue

### contract_checklists (MissingInfoBadge cần):
- `id` — key
- `contract_id` — required by interface
- `event_stage` — group by stage
- `category` — group by category
- `item_name` — display in tooltip
- `is_completed` — count missing
- `created_at`, `updated_at` — required by interface

## Implementation Steps

1. [ ] File: `app/actions/contract-queries.ts` — `getContractList` function
2. [ ] Thêm `work_tasks (id, work_type, status, deadline)` vào SELECT
3. [ ] Thêm `contract_checklists (id, contract_id, event_stage, category, item_name, is_completed, created_at, updated_at)` vào SELECT

```typescript
// BEFORE (line 88-94):
.select(`id, contract_code, customer_id, service_type,
   transaction_type, contract_date, work_date, delivery_date,
   total_amount, discount_amount, paid_amount,
   remaining_amount, status, payment_status,
   description, updated_at, created_at,
   customers (id, customer_code, full_name, phone, address, bride_name, groom_name)`)

// AFTER:
.select(`id, contract_code, customer_id, service_type,
   transaction_type, contract_date, work_date, delivery_date,
   total_amount, discount_amount, paid_amount,
   remaining_amount, status, payment_status,
   description, updated_at, created_at,
   customers (id, customer_code, full_name, phone, address, bride_name, groom_name),
   work_tasks (id, work_type, status, deadline),
   contract_checklists (id, contract_id, event_stage, category, item_name, is_completed, created_at, updated_at)`)
```

## Test Criteria
- [ ] "Tiến độ" column hiện progress bar (không phải "Chưa có task")
- [ ] "Thông tin" column hiện badge đúng (Đầy đủ / Thiếu tin / —)
- [ ] TypeScript: 0 errors

## Notes
- Slim JOINs chỉ lấy fields badges cần, KHÔNG lấy hết → vẫn nhanh hơn query cũ
- Cần verify trên browser sau khi fix

---
Next Phase: phase-01-client-first.md
