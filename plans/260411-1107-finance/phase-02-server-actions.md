# Phase 02: Server Actions Hardening
Status: ⬜ Pending  
Dependencies: Phase 01 (schema + RPC done, typegen done)

## Objective
Harden tất cả finance actions. Fix all known bugs (B1-B9). Tạo actions mới. Đặt performance contracts cho mọi query/action chính.

---

## 1. Bug Fixes (PHẢI fix trước khi harden)

### Fix B1: `debt-actions.ts` — Schema Mismatch
```diff
- interface DebtInput {
-   debt_name: string;     // ❌ DB = entity_name
-   debt_type: string;     // ❌ DB = entity_type
-   debt_amount: number;   // ❌ DB = amount
- }
+ interface DebtInput {
+   entity_name: string;   // ✅ match DB
+   entity_type: string;   // ✅ match DB
+   amount: number;        // ✅ match DB
+   type: string;
+   due_date?: string | null;
+   status?: string;
+   notes?: string | null;
+   entity_id?: string | null;
+ }
```
Đồng thời fix `createDebt` insert mapping.

### Fix B2 + B9: `goal-budget-actions.ts:172` — Wrong Columns

**Hiện tại** (OLD BUG / DO NOT IMPLEMENT): query `expenses` bằng `.select("category_name, expense_amount")`
- `category_name` → **KHÔNG TỒN TẠI** trong bảng `expenses` (chỉ có `category_id`)
- `expense_amount` → **KHÔNG TỒN TẠI** (cột tên là `amount`)

**Fix đúng** — phải join `transaction_categories`:
```ts
// ❌ WRONG (OLD BUG / DO NOT IMPLEMENT)
const { data } = await supabase
  .from("expenses")
  .select("category_name, expense_amount")
  .gte("expense_date", startDate)
  .lte("expense_date", endDate);

// ✅ CORRECT (fix)
const { data } = await supabase
  .from("expenses")
  .select("amount, category_id, transaction_categories!category_id(name)")
  .gte("expense_date", startDate)
  .lte("expense_date", endDate)
  .is("deleted_at", null);

// Hoặc nếu Supabase relationship không work:
const { data: expenses } = await supabase
  .from("expenses")
  .select("amount, category_id")
  .gte("expense_date", startDate)
  .lte("expense_date", endDate)
  .is("deleted_at", null);

const { data: categories } = await supabase
  .from("transaction_categories")
  .select("id, name")
  .eq("type", "Chi");

const catMap = Object.fromEntries((categories || []).map(c => [c.id, c.name]));
const actualByCategory: Record<string, number> = {};
for (const e of expenses || []) {
  const catName = catMap[e.category_id] || "Khác";
  actualByCategory[catName] = (actualByCategory[catName] || 0) + (e.amount || 0);
}
```

> **⚠️ QUAN TRỌNG**: Filter `deleted_at IS NULL` — không đếm expenses đã soft delete.

### Fix B3: `payment-actions.ts` — Missing Audit Log

Thêm `await writeAuditLog(...)` sau payment insert + contract update.

### Fix B5: `salary-actions.ts` — Swallowed Error

```diff
- try { await recalculateEmployeeSalary(supabase, data.employee_salary_id); }
- catch (e) { logError({ error: e, context: "addSalaryAdjustment.recalculate" }).catch(() => {}); }
+ await recalculateEmployeeSalary(supabase, data.employee_salary_id);
+ // Nếu recalc fail → throw → withAdmin catch → return error → UI hiển thị
```

### Fix B8: `expense-actions.ts:29` — `status` Column Not Exist

**Hiện tại** (OLD BUG / DO NOT IMPLEMENT):
```ts
// ❌ expenses KHÔNG CÓ cột status
.update({ status: "approved" })
```

**Fix**:
```ts
.update({ approved_by: userId })      // ✅ cột có sẵn
```

Mọi nơi check "đã duyệt" → dùng `approved_by IS NOT NULL`.
UI badge: `approved_by ? "Đã duyệt" : "Chờ duyệt"`.

---

## 2. Zod Schemas: `lib/validations/finance.schema.ts`

(Pattern reference: `lib/validations/contract.schema.ts`)

```ts
import { z } from "zod";

export const createReceiptSchema = z.object({
  receipt_date: z.string().date(),
  receipt_type: z.string().min(1),
  payment_type: z.string().min(1),
  contract_id: z.string().uuid().optional(),
  receipt_amount: z.number().positive("Số tiền thu phải > 0"),
  notes: z.string().optional(),
  category_id: z.string().uuid().optional(),
});

export const createExpenseSchema = z.object({
  expense_date: z.string().date(),
  payment_method: z.enum(["tien_mat", "chuyen_khoan"]),
  category_id: z.string().uuid().optional(),
  amount: z.number().positive("Số tiền chi phải > 0"),
  description: z.string().optional(),
  recipient: z.string().optional(),
  image_url: z.string().url().optional(),
});
export const updateExpenseSchema = createExpenseSchema.partial();

export const createDebtSchema = z.object({
  entity_name: z.string().min(1),   // ✅ match DB
  entity_type: z.string().min(1),
  type: z.string().min(1),
  amount: z.number().positive(),     // ✅ match DB
  due_date: z.string().date().optional(),
  notes: z.string().optional(),
  entity_id: z.string().uuid().optional(),
});

export const createGoalSchema = z.object({
  name: z.string().min(1).trim(),
  target_amount: z.number().positive(),
  deadline: z.string().date().optional(),
});

export const upsertBudgetSchema = z.object({
  category_name: z.string().min(1).trim(),
  budget_amount: z.number().positive(),
  period_month: z.number().int().min(1).max(12),
  period_year: z.number().int().min(2024).max(2030),
});

export const createCloseSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, "Format: YYYY-MM"),
});
```

---

## 3. Harden Checklist (H1-H5)

| # | Check | Details |
|---|-------|---------|
| H1 | Permission | Mutations: `withAdmin`. Queries: `withAuth`. |
| H2 | Zod | `schema.safeParse(input)` → reject nếu invalid |
| H3 | Audit | `await writeAuditLog()` + `oldData`/`newData` cho update/delete |
| H4 | Optimistic Lock | Updates: `expectedUpdatedAt` param → `.eq("updated_at", expected)` → 0 rows = concurrent conflict |
| H5 | Period Lock | Create/update thu chi: `is_period_locked(date)` trước insert |

### Per-file matrix:

| File | H1 | H2 | H3 | H4 | H5 | Bug |
|------|----|----|----|----|----|----|
| `receipt-actions.ts` | ✅ | ✅ | ✅ fire→await | N/A | ✅ | — |
| `expense-actions.ts` | ✅ | ✅ | ✅ add oldData | ✅ update | ✅ create | **B8** |
| `debt-actions.ts` | ✅ | ✅ | ✅ fire→await | ✅ update | N/A | **B1** |
| `salary-actions.ts` | ✅ | ✅ | ✅ fire→await | N/A | N/A | **B5** |
| `goal-budget-actions.ts` | ✅ | ✅ | ✅ fire→await | ✅ goal update | N/A | **B2, B9** |
| `investment-actions.ts` | ✅ | ✅ | ✅ fire→await | ✅ update | N/A | — |
| `payment-actions.ts` | ✅ | ✅ | ✅ **thêm mới** | ✅ | ✅ | **B3** |
| `integrity-actions.ts` | ✅ | N/A | N/A | N/A | N/A | — |

---

## 4. Performance Contracts

### 4.1 `getDashboardMetrics(month: number, year: number)`

| Contract | Value |
|----------|-------|
| Parameters | **Bắt buộc** `month`, `year` |
| Server-side aggregate | `SUM(payments.amount)` + `SUM(receipts.receipt_amount WHERE contract_id IS NULL)` cho inflows. `SUM(expenses.amount WHERE deleted_at IS NULL)` cho outflows. |
| No double-count | Payments (contract thu) + Receipts WHERE `contract_id IS NULL` (thu misc). KHÔNG cộng receipts có contract_id vì đã tính trong payments. |
| Filter | `expenses.deleted_at IS NULL` |
| Return shape | `{ totalInflow: number, totalOutflow: number, profit: number, monthChangePercent: number }` |
| Target perf | < 200ms (đo bằng EXPLAIN ANALYZE Phase 01) |
| Fallback | Nếu > 200ms → tạo RPC `get_dashboard_metrics(p_month, p_year)` |

### 4.2 `getCashflowTimeline(startDate: string, endDate: string)`

| Contract | Value |
|----------|-------|
| Aggregate | Server-side. Daily/weekly buckets. KHÔNG trả raw transactions. |
| Date range max | 12 tháng. Action reject nếu range > 12 months. |
| Filter | `expenses.deleted_at IS NULL` |
| Return shape | `Array<{ date: string, inflow: number, outflow: number }>` |
| Target perf | < 300ms (aggregate + group by date) |

### 4.3 `fetchLedger(params)`

| Contract | Value |
|----------|-------|
| Pagination | **Bắt buộc** server-side `{ page, pageSize }`. Max `pageSize = 100`. |
| Sort | Default `date DESC`. Configurable. |
| Return shape | `{ items: LedgerEntry[], total: number, page: number, pageSize: number }` |
| Filter | Server-side filter by month/year/type. KHÔNG load toàn bộ rồi filter client. |
| No double-count | Same rule as Dashboard: payments + receipts (no contract_id) + expenses |

### 4.4 `fetchDebts(params)`

| Contract | Value |
|----------|-------|
| Pagination | Server-side `{ page, pageSize }`. Default 20. Max 100. |
| Filter | Server-side filter by aging bucket (0-30, 31-60, 61-90, 90+), status. |
| Aging calculation | `CURRENT_DATE - due_date` tính ở action/DB, KHÔNG ở client. |
| Sort | Default `due_date ASC NULLS LAST` |
| N+1 guard | Single query. Nếu cần contract join → inline join. Nếu N+1 detected → tạo RPC. |

### 4.5 `fetchLabDebts(params)`

| Contract | Value |
|----------|-------|
| No N+1 | KHÔNG query từng lab riêng lẻ. Dùng grouped query: `SELECT labs.name, SUM(outstanding)...GROUP BY lab_id`. |
| Fallback | Nếu join phức tạp hoặc > 200ms → tạo RPC `get_lab_debts_summary()` |

### 4.6 `getBudgetsWithActuals(month, year)`

| Contract | Value |
|----------|-------|
| Join | `expenses.amount` + `expenses.category_id` → JOIN `transaction_categories` lấy `name` → match `budgets.category_name` |
| Filter | `expenses.deleted_at IS NULL`, `expenses.expense_date` trong tháng |
| Return | `Array<{ category_name, budget_amount, actual_spent, usage_percent }>` |

---

## 5. Actions Mới

### 5.1 `app/actions/finance-close-actions.ts`

```
"use server"
Exports:
- createMonthlyClose(period: string)
  → withAdmin + Zod createCloseSchema
  → Insert finance_monthly_closes + 8 finance_close_tasks
  → Unique period constraint catch
  → await writeAuditLog

- advanceCloseTask(closeId: string, stepNumber: number, newStatus: string)
  → withAdmin
  → supabase.rpc("advance_close_task", { p_close_id, p_step_number, p_new_status, p_actor_id: userId })
  → await writeAuditLog

- getCloseDetail(closeId: string) → withAdmin (admin-only, RLS restricted)
- listCloses(year?: number) → withAdmin (admin-only, RLS restricted)
```

### 5.2 `app/actions/finance-dashboard-queries.ts`

```
"use server"
Exports:
- getDashboardMetrics(month, year) → withAuth → aggregate (Performance Contract 4.1)
- getCashflowTimeline(startDate, endDate) → withAuth → aggregate (Performance Contract 4.2)
- fetchLedger(params) → withAuth → paginated (Performance Contract 4.3)
```

---

## 6. SWR Cache Strategy (Binding cho Phase 03)

| Action | Sau mutation → revalidate |
|--------|---------------------------|
| `createReceipt` | `cacheKeys.financeDashboard(m, y)`, `cacheKeys.financeLedger(...)`, `cacheKeys.receipts()` |
| `createExpense` | `cacheKeys.financeDashboard(m, y)`, `cacheKeys.financeLedger(...)`, `cacheKeys.expenses(m, y)` |
| `approveExpense` | `cacheKeys.expenses(m, y)` |
| `createDebt` | `cacheKeys.debts()` |
| `addSalaryAdjustment` | `cacheKeys.financeSalaries(m, y)` |
| `createMonthlyClose` | `cacheKeys.financeCloses(y)` |
| `advanceCloseTask` | `cacheKeys.financeCloseDetail(id)` |
| `addContribution` | `cacheKeys.goals()` |
| `upsertBudget` | `cacheKeys.financeBudgets(m, y)` |

---

## Implementation Steps
1. [ ] Tạo `lib/validations/finance.schema.ts`
2. [ ] Fix B8: `expense-actions.ts` → `approved_by` thay `status`
3. [ ] Fix B1: `debt-actions.ts` interface + insert mapping
4. [ ] Fix B2 + B9: `goal-budget-actions.ts` → join `transaction_categories`
5. [ ] Fix B3: `payment-actions.ts` → thêm audit log
6. [ ] Fix B5: `salary-actions.ts` → remove try/catch, fail fast
7. [ ] Harden 8 action files (H1-H5 matrix)
8. [ ] Tạo `finance-close-actions.ts`
9. [ ] Tạo `finance-dashboard-queries.ts`
10. [ ] `npm run build` → 0 errors
11. [ ] `npm run lint` → 0 errors

## Test/Verification Criteria
- [ ] `createReceipt` với `receipt_amount: -100` → Zod reject
- [ ] `approveExpense` → set `approved_by`, NOT `status`
- [ ] `createDebt` → insert OK, `entity_name` in DB
- [ ] `getBudgetsWithActuals(4, 2026)` → returns non-zero actuals (after fix)
- [ ] `createPaymentReceipt` → audit log entry in `audit_logs`
- [ ] Non-admin user → `createReceipt` → `withAdmin` reject
- [ ] `npm run build` pass

---
Next Phase: `phase-03a-ui-dashboard-ledger.md`
