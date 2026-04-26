# Phase 02: Slim List Query
Status: ✅ Complete
Dependencies: None (independent of Phase 01)

## Objective
Giảm ~200-500ms cho mỗi lần load `/contracts` bằng cách:
1. Bỏ 5/6 bảng con khỏi list query (C1)
2. Update drawer để dùng lazy-load thay vì inline data

## Issues Fixed
- 🔴 **C1**: Over-fetching trong `getContractList` (200-500ms saved)

## Implementation Steps

### Step 1: Slim down `getContractList` query
**File:** `app/actions/contract-queries.ts` (line ~86-119)

**Current** (6 JOINs):
```typescript
.select(`id, contract_code, ...,
  customers (...),
  contract_checklists (...),    // ❌ Drawer only
  contract_notes (...),         // ❌ Drawer only
  contract_events (...),        // ❌ Drawer only
  work_tasks (..., employees:assigned_to(...)),  // ❌ Drawer only
  payment_plans (...)           // ❌ Drawer only
`, { count: "estimated" })
```

**Fix** (1 JOIN — customers only):
```typescript
.select(`id, contract_code, customer_id, service_type,
  transaction_type, contract_date, work_date, delivery_date,
  total_amount, discount_amount, paid_amount, remaining_amount,
  status, payment_status, description,
  updated_at, created_at,
  customers (id, customer_code, full_name, phone, bride_name, groom_name)`,
  { count: "estimated" })
```

> ⚠️ Giữ lại field `customer_id` và nested `customers(...)` vì bảng list/card hiển thị tên KH.
> Bỏ: checklists, notes, events, tasks, payment_plans — tất cả đã có hook lazy-load riêng.

---

### Step 2: Update `ContractsListClient.handleView()`
**File:** `components/contracts/contracts-list-client.tsx` (line ~147-177)

**Current** — truyền drawer data trực tiếp từ list query:
```typescript
const item: ContractListItem = {
  ...contract,
  contract_events: contractRecord.contract_events || [],    // ❌ Giờ = undefined
  contract_checklists: contractRecord.contract_checklists || [],
  work_tasks: contractRecord.work_tasks || [],
  payment_plans: contractRecord.payment_plans || [],
  contract_notes: contractRecord.contract_notes || [],
};
```

**Fix** — chỉ truyền contract summary, drawer tự lazy-load:
```typescript
const item: ContractListItem = {
  id,
  contract_code: contractRecord.contract_code || null,
  status: contractRecord.status || null,
  service_type: contractRecord.service_type || null,
  work_date: contractRecord.work_date || null,
  contract_date: contractRecord.contract_date || null,
  total_amount: Number(contractRecord.total_amount) || 0,
  paid_amount: Number(contractRecord.paid_amount) || 0,
  remaining_amount: Number(contractRecord.remaining_amount) || 0,
  customer_id: contractRecord.customer_id || null,
  customers: contractRecord.customers || null,
  // Drawer sections — lazy loaded by useContractDrawerExtra
  contract_events: [],
  contract_checklists: [],
  work_tasks: [],
  payment_plans: [],
  contract_notes: [],
};
```

---

### Step 3: Verify ContractDrawer lazy-loads correctly
**File:** `components/contracts/contract-drawer.tsx`

Kiểm tra rằng `ContractDrawer` component đã dùng `useContractDrawerExtra` hook để fetch drawer sections khi mở, KHÔNG phụ thuộc vào data từ list query. Nếu chưa → cập nhật drawer để lazy-load khi `isOpen = true`.

---

### Step 4: Clean up customerMap builder
**File:** `components/contracts/contracts-list-client.tsx` (line ~195-202)

Logic build `customerMap` vẫn hoạt động vì `customers` vẫn được JOIN. Không cần thay đổi.

## Files to Modify
- `app/actions/contract-queries.ts` — Slim SELECT (line ~86-119)
- `components/contracts/contracts-list-client.tsx` — Update handleView (line ~147-177)
- `components/contracts/contract-drawer.tsx` — Verify lazy-load pattern

## Test Criteria
- [ ] Trang `/contracts` load nhanh hơn (target: <1s)
- [ ] Bảng danh sách hiển thị đúng: mã HĐ, tên KH, trạng thái, số tiền, ngày
- [ ] Click vào row → drawer mở + hiển thị events/tasks/notes đúng (lazy-loaded)
- [ ] Hover prefetch vẫn hoạt động
- [ ] Pagination + filter vẫn đúng
- [ ] Mobile card view vẫn đúng

## Risk Assessment
- **Medium risk**: Thay đổi data structure từ list → drawer. Cần verify drawer fallback.
- **Rollback**: Thêm lại JOINs vào SELECT nếu drawer không lazy-load đúng.

---
Next Phase: phase-03-auth-dedup.md
