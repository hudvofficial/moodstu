# Phase 01: Database Migrations (RPCs + Soft Delete)
Status: ✅ Complete (2026-04-12)
Dependencies: None
Priority: 🔴 Critical

## Objective
Tạo 2 atomic RPCs mới + migration thêm `deleted_at` cho 6 bảng tài chính.

## Audit Items
- **C1**: `createPaymentReceipt` race condition → RPC `process_contract_payment`
- **C2**: `undoContribution` non-atomic → RPC `undo_contribution_atomic`
- **C3**: Hard delete inconsistency → Migration `deleted_at`

---

## Implementation Steps

### 1. RPC `process_contract_payment` (C1)

- [ ] **1.1** Tạo migration `add_process_contract_payment_rpc`
- [ ] **1.2** Function signature:
  ```sql
  CREATE OR REPLACE FUNCTION process_contract_payment(
    p_contract_id UUID,
    p_amount NUMERIC,
    p_payment_method TEXT,
    p_payment_date TEXT,
    p_payment_stage TEXT DEFAULT NULL,
    p_category_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_payment_plan_id UUID DEFAULT NULL,
    p_update_total BOOLEAN DEFAULT FALSE,
    p_user_id UUID DEFAULT NULL
  ) RETURNS JSON AS $$
  ```
- [ ] **1.3** Logic bên trong:
  1. `SELECT ... FROM contracts WHERE id = p_contract_id FOR UPDATE` (row lock)
  2. `INSERT INTO payments (...) RETURNING id`
  3. Tính `new_paid`, `new_remaining`, `payment_status`
  4. `UPDATE contracts SET ...`
  5. If `p_payment_plan_id` → `UPDATE payment_plans SET status='paid', receipt_id=...`
  6. `RETURN json_build_object('payment_id', v_payment_id)`
- [ ] **1.4** Kiểm tra `is_period_locked` bên trong RPC
- [ ] **1.5** Test RPC qua `supabase.rpc()` call

### 2. RPC `undo_contribution_atomic` (C2)

- [ ] **2.1** Tạo migration `add_undo_contribution_atomic_rpc`
- [ ] **2.2** Function signature:
  ```sql
  CREATE OR REPLACE FUNCTION undo_contribution_atomic(
    p_contribution_id UUID
  ) RETURNS VOID AS $$
  ```
- [ ] **2.3** Logic bên trong:
  1. `SELECT * FROM goal_contributions WHERE id = p_contribution_id`
  2. Check 24h window: `IF extract(epoch FROM now() - created_at) > 86400 THEN RAISE`
  3. `DELETE FROM goal_contributions WHERE id = p_contribution_id`
  4. `UPDATE financial_goals SET current_amount = GREATEST(0, current_amount - amount) WHERE id = goal_id RETURNING *`
  5. Auto-revert: `IF status = 'completed' AND current_amount < target_amount → SET status = 'active'`
- [ ] **2.4** Test RPC

### 3. Migration: Soft Delete Columns (C3)

- [ ] **3.1** Tạo migration `add_soft_delete_to_finance_tables`
- [ ] **3.2** Thêm `deleted_at TIMESTAMPTZ DEFAULT NULL` cho:
  - `debts`
  - `financial_goals`
  - `budgets`
  - `fixed_costs`
  - `investments`
  - `receipts`
  - `credit_cards`
- [ ] **3.3** Tạo index `idx_{table}_deleted_at` cho mỗi bảng (partial index WHERE deleted_at IS NULL)
- [ ] **3.4** Verify migration không break existing data

---

## Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| CREATE | Migration: `process_contract_payment` | Atomic payment RPC |
| CREATE | Migration: `undo_contribution_atomic` | Atomic undo RPC |
| CREATE | Migration: `soft_delete_finance_tables` | `deleted_at` columns + indexes |

## Test Criteria
- [ ] Cả 3 migrations chạy thành công (no error)
- [ ] RPC `process_contract_payment` trả về `payment_id`
- [ ] RPC `undo_contribution_atomic` xóa contribution + giảm goal amount
- [ ] Soft delete columns tồn tại trên tất cả 7 tables
- [ ] Existing data không bị ảnh hưởng (`deleted_at = NULL`)

## Risks & Notes
- ⚠️ Migration soft delete: cần chạy trên production. Data hiện tại an toàn vì default NULL.
- ⚠️ RPC `process_contract_payment`: phải test concurrent calls để verify FOR UPDATE lock hoạt động.
- ⚠️ Nếu `receipts` đã có `deleted_at` column → skip trong migration.

---
Next Phase: → [Phase 02: Server Action Hardening](./phase-02-server-action-hardening.md)
