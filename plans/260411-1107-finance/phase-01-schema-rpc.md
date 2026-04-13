# Phase 01: Database Schema & RPC
Status: ✅ Complete (ngoại trừ Migration 4 Optional)
Dependencies: Phase 00 (inventory verified, decisions locked)

## Objective
Tạo bảng mới cho Close Management, bổ sung indexes trên bảng hiện có, tạo RPCs cần thiết, run typegen.

## Scope
- Tạo 2 bảng mới: `finance_monthly_closes`, `finance_close_tasks`.
- Bổ sung indexes trên bảng hiện có (với mapping → query).
- Tạo RPCs: `advance_close_task`, `is_period_locked`.
- Optional: thêm `idempotency_key` column.
- Run typegen.
- KHÔNG thay đổi cấu trúc bảng hiện có (chỉ thêm index + optional column).

---

## 1. Migration 1: Close Tables

**File**: `supabase/migrations/20260411160000_finance_close_tables.sql`

```sql
-- ═══════════════════════════════════════════
-- Finance Close Management Tables
-- ═══════════════════════════════════════════

-- 1. Monthly Closes
CREATE TABLE IF NOT EXISTS public.finance_monthly_closes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period TEXT NOT NULL,                     -- Format: 'YYYY-MM'
  status TEXT NOT NULL DEFAULT 'draft',      -- draft | in_progress | pending_review | locked
  snapshot_metrics JSONB DEFAULT '{}',
  locked_by UUID REFERENCES auth.users(id),
  locked_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_close_period UNIQUE(period)
);

-- 2. Close Tasks (8-step workflow)
CREATE TABLE IF NOT EXISTS public.finance_close_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  close_id UUID NOT NULL REFERENCES public.finance_monthly_closes(id) ON DELETE CASCADE,
  step_number INT NOT NULL CHECK (step_number BETWEEN 1 AND 8),
  step_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'chua_bat_dau',
  assignee_id UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_close_step UNIQUE(close_id, step_number)
);

-- 3. RLS — Restrict to service_role (server actions only)
ALTER TABLE public.finance_monthly_closes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_closes"
  ON public.finance_monthly_closes FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Authenticated users can read (dashboard/UI needs)
CREATE POLICY "authenticated_read_closes"
  ON public.finance_monthly_closes FOR SELECT
  TO authenticated
  USING (true);

ALTER TABLE public.finance_close_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_close_tasks"
  ON public.finance_close_tasks FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_close_tasks"
  ON public.finance_close_tasks FOR SELECT
  TO authenticated
  USING (true);
```

### Verify:
```
list_tables(schemas: ["public"], verbose: true)
→ Confirm finance_monthly_closes, finance_close_tasks xuất hiện
→ Confirm RLS enabled, policies scoped to service_role + authenticated
```

---

## 2. Migration 2: Indexes + Performance Gate

**File**: `supabase/migrations/20260411160001_finance_indexes.sql`

### Index → Query Mapping

| Index | Phục vụ query | Phase |
|-------|---------------|-------|
| `idx_receipts_date` ON `receipts(receipt_date)` | Dashboard aggregate by month, Ledger date range filter | 03a |
| `idx_receipts_contract` ON `receipts(contract_id) WHERE contract_id IS NOT NULL` | Receipts list filter by contract | 03b |
| `idx_expenses_date` ON `expenses(expense_date)` | Dashboard aggregate, Ledger date filter, Budget actuals | 03a, 03e |
| `idx_expenses_category` ON `expenses(category_id) WHERE category_id IS NOT NULL` | Budget vs Actuals group by category | 03e |
| `idx_expenses_deleted` ON `expenses(deleted_at)` (partial WHERE deleted_at IS NULL) | Filter active expenses (avoid seq scan on soft-deleted) | 03a-03e |
| `idx_payments_contract` ON `payments(contract_id) WHERE contract_id IS NOT NULL` | Payment list for contract, Debts aging | 03b, 03c |
| `idx_payments_date` ON `payments(payment_date)` | Dashboard aggregate, Ledger date filter | 03a |
| `idx_debts_status` ON `debts(status) WHERE status IS DISTINCT FROM 'da_thanh_toan'` | Active debts list | 03c |
| `idx_close_tasks_close_id` ON `finance_close_tasks(close_id)` | Close detail fetch | 03e |

```sql
-- ═══════════════════════════════════════════
-- Finance Indexes (bảng hiện có + bảng mới)
-- ═══════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_receipts_date
  ON public.receipts(receipt_date);
CREATE INDEX IF NOT EXISTS idx_receipts_contract
  ON public.receipts(contract_id) WHERE contract_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_date
  ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category
  ON public.expenses(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_active
  ON public.expenses(expense_date) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payments_contract
  ON public.payments(contract_id) WHERE contract_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_date
  ON public.payments(payment_date);

CREATE INDEX IF NOT EXISTS idx_debts_status
  ON public.debts(status) WHERE status IS DISTINCT FROM 'da_thanh_toan';

CREATE INDEX IF NOT EXISTS idx_close_tasks_close_id
  ON public.finance_close_tasks(close_id);
```

### Performance Gate (chạy sau apply indexes)

Chạy `EXPLAIN ANALYZE` cho các query chính. Target: mỗi query < 200ms.

```sql
-- 1. Dashboard aggregate (Phase 03a)
EXPLAIN ANALYZE
SELECT COALESCE(SUM(amount), 0)
FROM public.payments
WHERE payment_date >= '2026-01-01' AND payment_date <= '2026-01-31';

-- 2. Expenses aggregate (Phase 03a)
EXPLAIN ANALYZE
SELECT COALESCE(SUM(amount), 0)
FROM public.expenses
WHERE expense_date >= '2026-01-01' AND expense_date <= '2026-01-31'
  AND deleted_at IS NULL;

-- 3. Active debts list (Phase 03c)
EXPLAIN ANALYZE
SELECT id, entity_name, amount, status, due_date
FROM public.debts
WHERE status IS DISTINCT FROM 'da_thanh_toan'
ORDER BY due_date ASC NULLS LAST
LIMIT 20 OFFSET 0;

-- 4. Budget actuals group by category (Phase 03e)
EXPLAIN ANALYZE
SELECT tc.name AS category_name, SUM(e.amount) AS actual_amount
FROM public.expenses e
JOIN public.transaction_categories tc ON tc.id = e.category_id
WHERE e.expense_date >= '2026-01-01' AND e.expense_date <= '2026-01-31'
  AND e.deleted_at IS NULL
GROUP BY tc.name;
```

**Decision rule**:
- ✅ < 200ms → proceed
- ⚠️ 200-500ms → OK for MVP, add TODO for RPC/materialized view
- ❌ > 500ms → MUST create RPC before UI phase

---

## 3. Migration 3: RPCs

**File**: `supabase/migrations/20260411160002_finance_close_rpcs.sql`

### 3.1 RPC: `advance_close_task`

```sql
CREATE OR REPLACE FUNCTION public.advance_close_task(
  p_close_id UUID,
  p_step_number INT,
  p_new_status TEXT
) RETURNS VOID AS $$
DECLARE
  v_prev_status TEXT;
  v_current_status TEXT;
  v_close_status TEXT;
  v_user_id UUID;
BEGIN
  -- Auth check: dùng auth.uid() cho security, KHÔNG tin client param
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 1. Check close is not locked
  SELECT status INTO v_close_status
  FROM public.finance_monthly_closes WHERE id = p_close_id;

  IF v_close_status IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy kỳ chốt sổ.';
  END IF;

  IF v_close_status = 'locked' THEN
    RAISE EXCEPTION 'Kỳ đã khóa sổ, không thể thay đổi.';
  END IF;

  -- 2. Check previous step is completed (except step 1)
  IF p_step_number > 1 THEN
    SELECT status INTO v_prev_status
    FROM public.finance_close_tasks
    WHERE close_id = p_close_id AND step_number = p_step_number - 1;

    IF v_prev_status IS NULL OR v_prev_status != 'hoan_thanh' THEN
      RAISE EXCEPTION 'Bước % chưa hoàn thành.', p_step_number - 1;
    END IF;
  END IF;

  -- 3. Get current status
  SELECT status INTO v_current_status
  FROM public.finance_close_tasks
  WHERE close_id = p_close_id AND step_number = p_step_number;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy bước % trong kỳ chốt sổ.', p_step_number;
  END IF;

  -- 4. Validate state transition
  IF NOT (
    (v_current_status = 'chua_bat_dau' AND p_new_status = 'dang_thuc_hien') OR
    (v_current_status = 'dang_thuc_hien' AND p_new_status = 'cho_duyet') OR
    (v_current_status = 'cho_duyet' AND p_new_status IN ('hoan_thanh', 'co_van_de')) OR
    (v_current_status = 'co_van_de' AND p_new_status = 'dang_thuc_hien')
  ) THEN
    RAISE EXCEPTION 'Không thể chuyển từ "%" sang "%".', v_current_status, p_new_status;
  END IF;

  -- 5. Apply update
  UPDATE public.finance_close_tasks
  SET status = p_new_status,
      started_at = CASE WHEN p_new_status = 'dang_thuc_hien' AND started_at IS NULL THEN now() ELSE started_at END,
      completed_at = CASE WHEN p_new_status = 'hoan_thanh' THEN now() ELSE completed_at END,
      updated_at = now()
  WHERE close_id = p_close_id AND step_number = p_step_number;

  -- 6. If step 8 completed → lock the close period
  IF p_step_number = 8 AND p_new_status = 'hoan_thanh' THEN
    UPDATE public.finance_monthly_closes
    SET status = 'locked', locked_by = v_user_id, locked_at = now(), updated_at = now()
    WHERE id = p_close_id;
  ELSE
    UPDATE public.finance_monthly_closes
    SET status = 'in_progress', updated_at = now()
    WHERE id = p_close_id AND status = 'draft';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant: chỉ service_role (server actions call), KHÔNG cho anonymous
REVOKE ALL ON FUNCTION public.advance_close_task FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.advance_close_task TO service_role;
```

> **Security notes**:
> - `SECURITY DEFINER` + `SET search_path = public` — chống path injection
> - Dùng `auth.uid()` thay vì nhận `p_user_id` từ client — KHÔNG tin client
> - `REVOKE ALL ... FROM PUBLIC` → chỉ service_role gọi được
> - Non-admin users KHÔNG thể gọi trực tiếp qua PostgREST

### 3.2 RPC: `is_period_locked`

```sql
CREATE OR REPLACE FUNCTION public.is_period_locked(p_date DATE)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.finance_monthly_closes
    WHERE period = to_char(p_date, 'YYYY-MM')
    AND status = 'locked'
  );
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

-- Cho phép authenticated users check (dùng trong form validation)
GRANT EXECUTE ON FUNCTION public.is_period_locked TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_period_locked TO service_role;
```

---

## 4. Migration 4 (Optional — cần user duyệt): Idempotency Key

```sql
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS idempotency_key UUID UNIQUE;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS idempotency_key UUID UNIQUE;
```

> **⚠️ Cần user confirm trước khi apply**: migration này thêm cột vào bảng production.
> Nếu KHÔNG duyệt: client-side debounce + disabled button chống double click. Ghi rõ đây là **fallback yếu** — không chống được network retry / browser reload.

---

## 5. Typegen

```
mcp_supabase-mcp-server_generate_typescript_types(project_id: "...")
→ Overwrite types/database.types.ts
→ Verify finance_monthly_closes + finance_close_tasks rows xuất hiện
```

---

## Implementation Steps
1. [x] Apply migration 1: Close tables → verify `list_tables`.
2. [x] Verify RLS policies: `service_role` full access, `authenticated` read-only.
3. [x] Apply migration 2: Indexes → verify bằng `SELECT indexname FROM pg_indexes WHERE tablename IN (...)`.
4. [x] **Performance gate**: Run 4 EXPLAIN ANALYZE queries → log results → decision.
5. [x] Apply migration 3: RPCs → test cases:
   - Insert close → insert 8 tasks.
   - `advance_close_task(close_id, 1, 'dang_thuc_hien')` → OK
   - `advance_close_task(close_id, 2, 'dang_thuc_hien')` → FAIL (step 1 chưa done)
   - `is_period_locked('2026-03-15')` → `false`
   - Test non-service-role user CANNOT call `advance_close_task` → permission denied
6. [ ] (Optional) Apply migration 4: Idempotency key → nếu user duyệt.
7. [x] Run typegen → update `types/database.types.ts`.
8. [x] `npm run build` → 0 errors.

## Test/Verification Criteria (Passed)

**1. Verification Evidence: `list_tables` & RLS**
```text
Bảng `finance_monthly_closes` và `finance_close_tasks` đã được tạo thành công trên DB project qua MCP `apply_migration`. RLS được enable với policy service_role + authenticated.
```

**2. Verification Evidence: `pg_indexes`**
```text
Các index (idx_receipts_date, idx_expenses_active, etc.) đã được tạo và live trên Supabase.
```

**3. Verification Evidence: EXPLAIN ANALYZE Performance Gate**
```text
Thực thi 4 query thông qua DB:
- Dashboard Aggregate (payments): Execution Time: 0.552 ms
- Expenses Aggregate (expenses): Execution Time: 0.257 ms
- Active Debts (debts SORT): Execution Time: 0.225 ms
- Budget Actuals (expenses JOIN categories): Execution Time: 0.241 ms
Kết quả: TẤT CẢ < 1ms (Vượt xa target < 200ms). ✅ PROCEED.
```

**4. Verification Evidence: Typegen & Build**
```text
- `types/database.types.ts` cập nhật thành công trực tiếp từ `mcp_supabase-mcp-server_generate_typescript_types`.
- Lệnh `npm run build` pass (0 errors).
```

**5. Verification Evidence: Runtime Blocker Fixes (2026-04-12)**

> **Blocker 1: RPC auth.uid() → p_actor_id**
> - Problem: `advance_close_task` used `auth.uid()` which returns NULL when called via service_role client (withAdmin → createAdminClient).
> - Fix: Added `p_actor_id UUID` parameter. Server action passes `userId` from `withAdmin`-verified session. RPC uses `p_actor_id` for `locked_by`. EXECUTE still restricted to `service_role` only.
> - Migration applied: `fix_advance_close_task_actor_id`
> - Typegen regenerated: `advance_close_task.Args` now includes `p_actor_id: string`

> **Blocker 2: Embedded selects on auth.users FK**
> - Problem: `locked_user:locked_by(full_name)` and `assignee:assignee_id(full_name)` fail because FK points to `auth.users` (not exposed in PostgREST/typegen).
> - Fix: Removed embedded selects. Added `resolveEmployeeNames()` helper that looks up `employees.auth_user_id` → `employees.full_name`. Returns `locked_user_name` / `assignee_name` as flat string fields.

> **Blocker 3: RLS too permissive for admin-only module**
> - Problem: `authenticated_read_closes` and `authenticated_read_close_tasks` SELECT policies allowed any authenticated user to read finance close data.
> - Fix: Dropped both policies via migration `restrict_finance_close_rls_admin_only`. Changed `getCloseDetail` and `listCloses` from `withAuth` → `withAdmin`. All reads now flow through `service_role` client only.
> - Migration applied: `restrict_finance_close_rls_admin_only`

```text
npm run build → Exit code: 0 (0 errors)
tsc --noEmit → 0 errors
eslint app/actions/finance-close-actions.ts → 0 errors, 0 warnings
```

---
Next Phase: `phase-02-server-actions.md`
