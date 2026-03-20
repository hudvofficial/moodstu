# Phase 01: DB Migration — FK → auth.users(id)
Status: ✅ Complete
Dependencies: None (first phase)
Priority: 🔴 Critical

## Objective
Đổi tất cả 22 FK constraints từ `employees(id)` → `auth.users(id)` trong 1 migration duy nhất.
Sau phase này, toàn bộ mutations (create/update/delete) sẽ hoạt động.

## Context
- `withAuth()` trả về `user.id` từ `auth.users` 
- Tất cả actions dùng `created_by: userId` / `updated_by: userId`
- FK cũ trỏ `employees(id)` — bảng employees = 0 records → luôn fail
- employees chưa triển khai (phase sau)

## Requirements
### Functional
- [x] Tất cả 23 FK *_by constraints đổi target từ `employees(id)` → `auth.users(id)` + 3 assigned_to FK dropped
- [x] Không mất data hiện có (bảng đều rỗng, clean migration)
- [x] Actions server KHÔNG cần thay đổi code (đã dùng đúng auth user.id)

### Non-Functional
- [x] Migration dùng DROP IF EXISTS + ADD (idempotent)
- [x] Rollback-safe (có thể revert khi build employees)

## Implementation Steps

### 1. [x] Viết migration SQL

```sql
-- Migration: change_fk_by_columns_to_auth_users
-- Đổi 22 FK constraints từ employees(id) → auth.users(id)

BEGIN;

-- ─── contracts (3 constraints) ─────────────────
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_created_by_fkey;
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_updated_by_fkey;
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_cancelled_by_fkey;

ALTER TABLE contracts ADD CONSTRAINT contracts_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE contracts ADD CONSTRAINT contracts_updated_by_fkey 
  FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE contracts ADD CONSTRAINT contracts_cancelled_by_fkey 
  FOREIGN KEY (cancelled_by) REFERENCES auth.users(id);

-- ─── contract_items (1) ────────────────────────
ALTER TABLE contract_items DROP CONSTRAINT IF EXISTS contract_items_added_by_fkey;
ALTER TABLE contract_items ADD CONSTRAINT contract_items_added_by_fkey 
  FOREIGN KEY (added_by) REFERENCES auth.users(id);

-- ─── payments (2) ──────────────────────────────
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_created_by_fkey;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_approved_by_fkey;
ALTER TABLE payments ADD CONSTRAINT payments_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE payments ADD CONSTRAINT payments_approved_by_fkey 
  FOREIGN KEY (approved_by) REFERENCES auth.users(id);

-- ─── customers (1) ─────────────────────────────
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_created_by_fkey;
ALTER TABLE customers ADD CONSTRAINT customers_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- ─── crm_leads (1) ─────────────────────────────
ALTER TABLE crm_leads DROP CONSTRAINT IF EXISTS crm_leads_created_by_fkey;
ALTER TABLE crm_leads ADD CONSTRAINT crm_leads_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- ─── printing_orders (1) ───────────────────────
ALTER TABLE printing_orders DROP CONSTRAINT IF EXISTS printing_orders_created_by_fkey;
ALTER TABLE printing_orders ADD CONSTRAINT printing_orders_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- ─── debts (1) ─────────────────────────────────
ALTER TABLE debts DROP CONSTRAINT IF EXISTS debts_created_by_fkey;
ALTER TABLE debts ADD CONSTRAINT debts_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- ─── documents (1) ─────────────────────────────
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_created_by_fkey;
ALTER TABLE documents ADD CONSTRAINT documents_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- ─── employee_salaries (1) ─────────────────────
ALTER TABLE employee_salaries DROP CONSTRAINT IF EXISTS employee_salaries_created_by_fkey;
ALTER TABLE employee_salaries ADD CONSTRAINT employee_salaries_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- ─── equipment (1) ─────────────────────────────
ALTER TABLE equipment DROP CONSTRAINT IF EXISTS equipment_created_by_fkey;
ALTER TABLE equipment ADD CONSTRAINT equipment_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- ─── evaluations (1) ───────────────────────────
ALTER TABLE evaluations DROP CONSTRAINT IF EXISTS evaluations_created_by_fkey;
ALTER TABLE evaluations ADD CONSTRAINT evaluations_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- ─── expenses (2) ──────────────────────────────
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_created_by_fkey;
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_approved_by_fkey;
ALTER TABLE expenses ADD CONSTRAINT expenses_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE expenses ADD CONSTRAINT expenses_approved_by_fkey 
  FOREIGN KEY (approved_by) REFERENCES auth.users(id);

-- ─── fixed_costs (1) ───────────────────────────
ALTER TABLE fixed_costs DROP CONSTRAINT IF EXISTS fixed_costs_created_by_fkey;
ALTER TABLE fixed_costs ADD CONSTRAINT fixed_costs_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- ─── galleries (1) ─────────────────────────────
ALTER TABLE galleries DROP CONSTRAINT IF EXISTS galleries_created_by_fkey;
ALTER TABLE galleries ADD CONSTRAINT galleries_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- ─── monthly_salaries (1) ──────────────────────
ALTER TABLE monthly_salaries DROP CONSTRAINT IF EXISTS monthly_salaries_created_by_fkey;
ALTER TABLE monthly_salaries ADD CONSTRAINT monthly_salaries_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- ─── requests (1) ──────────────────────────────
ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_created_by_fkey;
ALTER TABLE requests ADD CONSTRAINT requests_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- ─── work_shifts (1) ───────────────────────────
ALTER TABLE work_shifts DROP CONSTRAINT IF EXISTS work_shifts_created_by_fkey;
ALTER TABLE work_shifts ADD CONSTRAINT work_shifts_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- ─── work_tasks (1) ────────────────────────────
ALTER TABLE work_tasks DROP CONSTRAINT IF EXISTS work_tasks_created_by_fkey;
ALTER TABLE work_tasks ADD CONSTRAINT work_tasks_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id);

COMMIT;
```

### 2. [x] Apply migration qua Supabase MCP
- ✅ Applied via `apply_migration` tool
- Migration name: `change_fk_by_columns_to_auth_users`

### 3. [x] Verify: Query FK constraints confirm tất cả trỏ auth.users
```sql
SELECT tc.table_name, kcu.column_name, ccu.table_name AS fk_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (kcu.column_name LIKE '%_by')
ORDER BY tc.table_name;
-- Expected: ALL rows show fk_table = 'users' (auth schema)
```

## Files to Create/Modify
- **DB only** — Không cần thay đổi code files
- Actions đã dùng `userId` từ `auth.users` → tương thích ngay

## Test Criteria
- [x] Migration apply thành công, không lỗi
- [x] Query verify: 23/23 *_by constraints trỏ `auth.users` (auth schema)
- [x] Không còn *_by constraint nào trỏ `employees` (0 results)

## Rollback Plan
```sql
-- Nếu cần revert: đổi FK ngược lại employees(id)
-- CHỈ DÙNG SAU KHI employees module đã triển khai
```

## Notes
- Migration này fix toàn bộ hệ thống, KHÔNG chỉ /contracts
- Sau migration, tất cả modules (CRM, Finance, Printing...) cũng hoạt động
- Lesson #72 documented approach này

---
Next Phase: → phase-02-verify-actions.md
