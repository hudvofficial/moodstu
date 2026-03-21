# Plan: V1 → V2 Full Business Logic Port
Created: 2026-03-21T11:33
Updated: 2026-03-21T11:42
Status: 🟡 Planning

## Nguyên tắc
> V2 = V1 + Tối ưu. Build ĐẦY ĐỦ logic, dựng sẵn hạ tầng.
> Infrastructure TRƯỚC → Contract nối dây SAU.

## Nguồn tham chiếu
- V1: `C:\Users\Admin\Desktop\Ai\0Moodstudio\webapp`
- V2: `c:\Users\Admin\Desktop\Ai\mood saas\mood-studio`
- Audit: `v1_v2_full_business_logic_audit.md`

---

## Kiến trúc phụ thuộc

```
LAYER 1 — INFRASTRUCTURE (dựng trước):
├── Phase 01: Audit System         ← mọi module đều cần
├── Phase 02: Expense Module       ← contract cần để tính profit
└── Phase 03: Lab Module (full)    ← contract cần để tạo đơn in

LAYER 2 — CONTRACT CORE (nối dây):
├── Phase 04: Auto-Expense Pipeline   ← nối Printing → Expenses
├── Phase 05: Lợi nhuận ròng          ← nối Work Tasks + Printing → Finance
├── Phase 06: Task RBAC               ← nối Employees → Auth
└── Phase 07: Contract Lifecycle      ← nối tất cả child tables

LAYER 3 — ADVANCED:
└── Phase 08: Profit Detail Modal     ← UI tổng hợp
```

## Phases Overview

| Phase | Layer | Name | Features | Status |
|-------|-------|------|----------|--------|
| 01 | 🏗️ Infra | Audit System | F17 | ✅ Done |
| 02 | 🏗️ Infra | Expense Module | F11, F19, F20 | ✅ Done |
| 03 | 🏗️ Infra | Lab Module Full | F6, F7, F8, F9, F10 | ✅ Done |
| 04 | 🔌 Core | Auto-Expense Pipeline | F5, F12 | ⬜ Pending |
| 05 | 🔌 Core | Lợi nhuận ròng | F1, F3, F4 | ⬜ Pending |
| 06 | 🔌 Core | Task RBAC | F16 | ✅ Done |
| 07 | 🔌 Core | Contract Lifecycle Atomic | F13, F14, F15 | ⬜ Pending |
| 08 | ⭐ Adv | Profit Detail Modal | F2, F21 | ⬜ Pending |

**Tổng:** 21 features | 8 phases

---

# Phase 01: Audit System
Layer: 🏗️ Infrastructure
Status: ✅ Done
Dependencies: None (mọi module cần nó)

## Objective
Port hệ thống audit logging từ V1. Mọi mutation trong hệ thống
đều cần ghi log với severity + source tracking.

## V1 Reference
- `lib/audit.ts` — writeAuditLog, fireAuditLog, logError

## Implementation Steps
- [ ] Check V2 có `lib/audit.ts` chưa
- [ ] Port writeAuditLog(action, tableName, recordId, description, severity, source, oldData, newData)
- [ ] Port fireAuditLog (non-blocking version)
- [ ] Port logError (error logging)
- [ ] Check bảng `audit_logs` trong Supabase schema
- [ ] Nếu chưa có → tạo migration

## Files to Create/Modify
- `lib/audit.ts` — audit functions
- Supabase migration (nếu cần bảng audit_logs)

## Test Criteria
- [ ] writeAuditLog ghi được vào DB
- [ ] fireAuditLog không block main flow
- [ ] severity levels: INFO, WARNING, CRITICAL

---

# Phase 02: Expense Module
Layer: 🏗️ Infrastructure
Status: ✅ Done
Dependencies: Phase 01 (Audit)

## Objective
Dựng module chi phí đầy đủ: CRUD expenses, transaction categories,
chi phí cố định hàng tháng. Contract sẽ gọi vào module này.

## V1 Reference
- `app/actions/finance.ts` — createExpense (L116+)
- `app/actions/expenses.ts` — generateMonthlyFixedCosts (L19-115)

## Implementation Steps

### Step 1: Check DB schema
- [ ] Bảng `expenses` trong V2 — có đủ columns không?
- [ ] Bảng `fixed_costs` trong V2 — có chưa?
- [ ] Bảng `transaction_categories` — có chưa?
- [ ] Migration nếu thiếu

### Step 2: Expense CRUD actions
- [ ] Tạo `app/actions/expense-actions.ts`
- [ ] createExpense(data) — thêm chi phí
- [ ] updateExpense(id, data) — sửa
- [ ] deleteExpense(id) — xóa
- [ ] getExpensesByContract(contractId) — lấy chi phí theo HĐ
- [ ] Mỗi function đều gọi writeAuditLog

### Step 3: Transaction Categories
- [ ] getTransactionCategories(type: "Thu" | "Chi")
- [ ] V2 payment-actions.ts ĐÃ CÓ function này → verify

### Step 4: Chi phí cố định hàng tháng
- [ ] Port generateMonthlyFixedCosts(month, year)
- [ ] Lấy fixed_costs active trong tháng
- [ ] Anti-duplicate check (tag pattern)
- [ ] Auto-map category
- [ ] Batch insert

## Files to Create
- `app/actions/expense-actions.ts`

## Test Criteria
- [ ] CRUD expense thành công
- [ ] Generate monthly costs — tạo đúng số records
- [ ] Anti-duplicate — chạy 2 lần không trùng

---

# Phase 03: Lab Module Full
Layer: 🏗️ Infrastructure
Status: ✅ Done
Dependencies: Phase 01 (Audit)

## Objective
Dựng full module quản lý lab in ấn: CRUD labs, services, payments, debts.
Contract sẽ gọi vào module này khi tạo đơn in.

## V1 Reference
- `app/actions/printing/labs.ts` (7 functions)
- `app/actions/printing/payments.ts` (4 functions)
- `app/actions/printing/debts.ts`
- `app/actions/printing/orders.ts` (auto-create, sync album)

## Implementation Steps

### Step 1: Lab CRUD
- [ ] addLab(data) — thêm lab mới
- [ ] updateLab(id, data) — sửa thông tin lab
- [ ] deleteLab(id) — xóa lab
- [ ] updateLabStatus(id, status) — bật/tắt lab

### Step 2: Lab Services
- [ ] addLabService(data) — thêm dịch vụ lab (album, ảnh khổ lớn...)
- [ ] updateLabService(id, data)
- [ ] deleteLabService(id)

### Step 3: Lab Payments
- [ ] payPrintingOrder(orderId, amount) — thanh toán 1 đơn
- [ ] payPrintingByLab(labId, amount) — thanh toán theo lab
- [ ] recordLabPayment(data) — ghi nhận chuyển khoản

### Step 4: Lab Debt Tracking
- [ ] getLabDebts(options) — tổng hợp công nợ theo lab

### Step 5: Order Automation
- [ ] autoCreatePrintingOrder(contractId, ...) — auto tạo đơn in
- [ ] syncAlbumStatus(orderId) — đồng bộ status album

## Files to Modify
- `app/actions/printing-actions.ts` — mở rộng thêm tất cả functions

## Test Criteria
- [ ] Lab CRUD hoạt động
- [ ] Thanh toán lab → update payment_status
- [ ] getLabDebts → tổng hợp đúng

---

# Phase 04: Auto-Expense Pipeline
Layer: 🔌 Contract Core
Status: ⬜ Pending
Dependencies: Phase 02 (Expenses), Phase 03 (Labs)

## Objective
Khi tạo đơn in → tự động tạo expense record.
Anti-double-counting khi tính profit.

## V1 Reference
- `app/actions/printing/create-order.ts` L50-80

## Implementation Steps
- [ ] Trong createPrintingOrder (printing-actions.ts):
  - Sau insert thành công → query transaction_categories "Chi phí in ấn"
  - Insert expenses: expense_date, category, contract_id, amount
  - notes = "Tự động tạo từ đơn in #code"
  - Non-blocking (catch error)
- [ ] Anti-double-counting: profit chỉ dùng printing_orders.total_amount

## Files to Modify
- `app/actions/printing-actions.ts`

---

# Phase 05: Lợi nhuận ròng
Layer: 🔌 Contract Core
Status: ⬜ Pending
Dependencies: Phase 02, Phase 04

## Objective
Hiển thị lợi nhuận ròng + biên lợi nhuận trên Financial Dashboard.

## Công thức:
```
netProfit = totalAmount - totalWorkCost - totalPrintCost
margin = (netProfit / totalAmount) * 100
```

## Implementation Steps
- [ ] Query SUM(work_tasks.cost) + SUM(printing_orders.total_amount)
- [ ] Pass xuống FinancialDashboard
- [ ] UI: dòng chi phí + lợi nhuận ròng + tooltip
- [ ] Màu xanh (lời) / đỏ (lỗ)

## Files to Modify
- `app/actions/contracts.ts`
- `components/contracts/detail/contract-detail-client.tsx`
- `components/contracts/detail/financial-dashboard.tsx`

---

# Phase 06: Task RBAC
Layer: 🔌 Contract Core
Status: ✅ Done
Dependencies: Phase 01 (Audit)

## Objective
Nhân viên chỉ update task CỦA MÌNH. Admin/Manager update bất kỳ.

## V1 Reference
- `app/actions/contracts/mutations.ts` L292-357

## Implementation Steps
- [ ] toggleTaskStatus: check user role
- [ ] NOT admin → lookup employee → check assigned_to
- [ ] Không match → throw error

## Files to Modify
- `app/actions/work-task-actions.ts`

---

# Phase 07: Contract Lifecycle Atomic
Layer: 🔌 Contract Core
Status: ⬜ Pending
Dependencies: Phase 01-06 (tất cả)

## Objective
Hủy/Xóa/Khôi phục HĐ — atomic, update tất cả child tables.

## V1 Reference
- `cancel_contract_atomic` RPC
- `delete_contract_atomic` RPC
- `reactivateContract` function

## Implementation Steps
- [ ] Audit V2 cancel/delete hiện tại vs V1
- [ ] Tạo/update atomic RPCs nếu cần
- [ ] Cancel: update work_tasks, inventory, printing, payments
- [ ] Delete: restore stock + cascade delete
- [ ] Reactivate: revert tasks "da_huy" → "chua_lam"

## Files to Modify
- `app/actions/contract-lifecycle.ts`
- Supabase migration (RPCs)

---

# Phase 08: Profit Detail Modal
Layer: ⭐ Advanced
Status: ⬜ Pending
Dependencies: Phase 05

## Objective
Modal chi tiết lợi nhuận: 4 loại chi phí + doanh thu + margin%.

## V1 Reference
- `components/finance/ContractProfitDetailModal.tsx` (442 lines)

## Implementation Steps
- [ ] Tạo contract-profit-modal.tsx — V2 design tokens
- [ ] 4 sections: Doanh thu, Lương, In ấn, Vận hành
- [ ] Footer: Tỷ suất % + Lợi nhuận ròng
- [ ] Action: getContractProfitData(contractId)
- [ ] Button "Xem chi tiết" trên FinancialDashboard

## Files to Create
- `components/contracts/detail/contract-profit-modal.tsx`
