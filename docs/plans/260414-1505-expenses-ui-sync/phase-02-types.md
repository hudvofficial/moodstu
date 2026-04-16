# Phase 02: Types & Edit / Modal Flow
Status: ⬜ Pending | 🟡 In Progress | ✅ Complete
Dependencies: Phase 01

## Objective
Nhấn mạnh tính Parity Type và bắt lỗi khi Server Action trả Failed trong UI Modal.

## Implementation Steps
1. [x] Cập nhật `ExpenseListItem` list exact fields: `id, expense_date, payment_method, category_id, category_name, amount, description, recipient, approved_by, created_by, created_at, updated_at, contract_id, image_url` nếu schema có.
2. [x] Sửa `ExpenseFormModal` nhận `initialData`, create/update chung.
3. [x] `ExpenseFormModal` check ActionResult trước khi toast success.

## Files to Create/Modify
- types/finance-operations.ts
- components/finance/expenses/expense-form-modal.tsx
