# Finance Module Audit - 2026-04-28

Scope: `/finance`, `/reports` finance-backed views, finance server actions, validation schemas, accounting close flow, RPC grants, time-load/performance, and security boundaries.

## Summary
- Critical issues: 4
- Warnings: 9
- Suggestions: 5
- Verification: `npx tsc --noEmit --pretty false`, `npm run perf:audit`, and `npm run perf:chunks` passed.
- Current chunk status: no app route chunk over 80KB. Heaviest finance routes are `/finance/salaries` 61.4KB, `/finance/debts` 60.6KB, `/finance/goals` 55.8KB, `/finance/receipts` 55.7KB, `/finance/investments` 45.8KB, `/finance/expenses` 39.7KB.
- Release recommendation: do not treat Finance/Reports data access as production-safe until the server-action permission gaps are closed.

## Critical Issues

1. Finance read actions bypass module permission while using the admin Supabase client
   - Files: `lib/auth_utils.ts:268`, `lib/auth_utils.ts:278`, `lib/auth_utils.ts:373`, `lib/auth_utils.ts:404`, `app/actions/finance-operations-queries.ts:66`, `app/actions/finance-operations-queries.ts:83`, `app/actions/finance-operations-queries.ts:99`, `app/actions/finance-operations-queries.ts:120`, `app/actions/finance-operations-queries.ts:166`, `app/actions/finance-operations-queries.ts:220`, `app/actions/finance-operations-queries.ts:269`, `app/actions/finance-operations-queries.ts:318`, `app/actions/finance-operations-queries.ts:371`, `app/actions/finance-operations-queries.ts:431`, `app/actions/finance-operations-queries.ts:443`, `app/actions/finance-operations-queries.ts:494`, `app/actions/finance-operations-queries.ts:506`, `app/actions/finance-operations-queries.ts:527`, `app/actions/finance-operations-queries.ts:589`, `app/actions/finance-operations-queries.ts:662`, `app/actions/finance-operations-queries.ts:753`, `app/actions/finance-operations-queries.ts:779`, `app/actions/finance-operations-queries.ts:798`
   - Current behavior: `withAuth` authenticates then passes `createAdminClient()` into the action. Many finance read actions never call `requireFinanceAccess`.
   - Impact: authenticated roles without finance permission can call server actions directly and read receipts, expenses, debts, salaries, goals, investments, categories, fixed costs, and detail records. Route layouts protect pages, not server actions.
   - Required fix: add a shared `withFinanceRead` wrapper and convert every finance read action to call `requireFinanceAccess` before any query.

2. Reports and cashflow endpoints have the same authorization gap
   - Files: `app/actions/finance-reports-queries.ts:75`, `app/actions/finance-reports-queries.ts:81`, `app/actions/finance-cashflow-timeline.ts:28`, `app/actions/finance-cashflow-timeline.ts:33`, `app/actions/goal-budget-actions.ts:286`, `app/actions/goal-budget-actions.ts:287`, `app/(protected)/reports/layout.tsx:13`
   - Current behavior: `/reports` layout checks `reports` access, but the backing server actions use bare `withAuth`.
   - Impact: non-finance/non-report authenticated users can directly request financial snapshots, cashflow timelines, debt stats, and budget actuals through server actions.
   - Required fix: gate these actions with `requireFinanceAccess` or a stricter `requireReportsAccess` that maps to the same admin/manager boundary.

3. Debt updates silently reset status to `open`
   - Files: `lib/validations/finance.schema.ts:42`, `lib/validations/finance.schema.ts:49`, `app/actions/debt-actions.ts:101`, `app/actions/debt-actions.ts:124`, `app/actions/debt-actions.ts:131`
   - Current behavior: `updateDebtSchema = createDebtSchema.partial()`, but the defaulted `status` still parses to `"open"` even when update input omits status.
   - Impact: editing amount, notes, due date, card, or platform can reopen closed/partial debts and corrupt AR/AP reports.
   - Required fix: split create and update schemas so update status has no default, and add transition/remaining consistency checks.

4. Finance category CRUD is broken by schema/type mismatch
   - Files: `lib/validations/finance.schema.ts:142`, `lib/validations/finance.schema.ts:144`, `app/actions/finance-category-actions.ts:23`, `app/actions/finance-category-actions.ts:30`, `components/finance/categories/category-form-modal.tsx:19`, `components/finance/categories/category-form-modal.tsx:41`, `app/actions/finance-category-actions.ts:55`
   - Current behavior: UI/action send `type: "thu" | "chi"`, while Zod requires `"Thu" | "Chi"`. The create audit description also references `name` instead of `parsed.data.name`.
   - Impact: category create/update can fail validation; if insert succeeds after schema correction, audit logging can throw at runtime in Node because `name` is not a local variable.
   - Required fix: make schema accept canonical DB values `"thu" | "chi"` and use `parsed.data.name` in audit logs.

## Warnings

1. Payment receipt creation is authorized by contract access, not finance access
   - Files: `app/actions/payment-actions.ts:3`, `app/actions/payment-actions.ts:117`, `app/actions/payment-actions.ts:127`, `app/actions/payment-actions.ts:187`, `app/actions/payment-actions.ts:189`, `types/roles.ts:40`
   - Impact: a `sale` user has `contracts` access but not `finance`; direct action calls can create contract payment receipts if this is not an intended business rule.
   - Required fix: define explicit permission for recording payments. If finance-only, require finance access. If sale can collect payments, add a narrow `canRecordPayment` policy and audit it.

2. Debt installment payment is not accounting-safe
   - Files: `app/actions/debt-actions.ts:184`, `app/actions/debt-actions.ts:188`, `app/actions/debt-actions.ts:195`, `app/actions/debt-actions.ts:198`, `app/actions/debt-actions.ts:204`
   - Impact: `markInstallmentPaid` has no period lock, no deleted filter, no cap against over-marking installments, no optimistic lock, and does not update `paid_amount`/`remaining`.
   - Required fix: move to an atomic RPC or guarded update that locks the debt row, caps installment count, updates monetary totals, and blocks locked periods.

3. Debt period lock uses `updated_at` instead of the accounting date
   - Files: `app/actions/debt-actions.ts:108`, `app/actions/debt-actions.ts:110`, `app/actions/debt-actions.ts:117`
   - Impact: editing an old debt can bypass a closed accounting period if `updated_at` is current, or block valid edits for the wrong period.
   - Required fix: store/select the debt accounting date (`due_date`, `debt_date`, or payment date depending on operation) and check that date.

4. Salary payment can overpay without changing status
   - Files: `app/actions/salary-actions.ts:154`, `app/actions/salary-actions.ts:162`, `app/actions/salary-actions.ts:169`
   - Impact: `paid_amount` can exceed `net_salary`; `remaining_amount` is clamped to zero but there is no paid/completed status or overpayment rejection.
   - Required fix: reject `amount > remaining_amount` or require explicit overpayment handling and status update.

5. Fixed costs, investments, and credit cards use inconsistent delete semantics
   - Files: `app/actions/fixed-cost-actions.ts:118`, `app/actions/fixed-cost-actions.ts:132`, `app/actions/investment-actions.ts:138`, `app/actions/investment-actions.ts:151`, `app/actions/debt-actions.ts:258`, `app/actions/finance-operations-queries.ts:493`
   - Impact: some queries filter `deleted_at`, but delete actions hard-delete records. `fetchFixedCosts` does not filter `deleted_at`, so behavior depends on whether data was hard- or soft-deleted.
   - Required fix: standardize soft delete for finance master data that has `deleted_at`, and add `deleted_at IS NULL` to reads.

6. Monthly fixed-cost generation includes deleted fixed costs
   - Files: `app/actions/expense-actions.ts:235`, `app/actions/expense-actions.ts:243`, `app/actions/expense-actions.ts:273`
   - Impact: deleted/deprecated fixed costs can generate expenses if rows remain soft-deleted.
   - Required fix: add `.is("deleted_at", null)` to the fixed-cost source query and validate month/year with Zod.

7. Page size is not capped for finance lists
   - Files: `app/actions/finance-operations-queries.ts:26`, `app/actions/finance-operations-queries.ts:28`, `app/actions/finance-operations-queries.ts:121`, `app/actions/finance-operations-queries.ts:221`, `app/actions/finance-operations-queries.ts:319`, `app/actions/finance-operations-queries.ts:590`, `app/actions/finance-operations-queries.ts:756`
   - Impact: direct server-action callers can request very large pages and create avoidable DB/app pressure.
   - Required fix: clamp `pageSize` to a fixed maximum, e.g. 50 or 100.

8. App-side full-table aggregation remains on several finance paths
   - Files: `app/actions/finance-reports-queries.ts:81`, `app/actions/finance-reports-queries.ts:132`, `app/actions/finance-dashboard-queries.ts:277`, `app/actions/finance-dashboard-queries.ts:306`, `app/actions/finance-dashboard-queries.ts:366`, `app/actions/finance-dashboard-queries.ts:372`, `app/actions/finance-dashboard-queries.ts:739`, `app/actions/finance-operations-queries.ts:370`, `app/actions/finance-operations-queries.ts:372`
   - Impact: reports, custom-date ledger, and debt stats can load all matching rows into the app server, then aggregate/sort/slice in memory. This will degrade as rows grow.
   - Required fix: move these to paginated/aggregate RPCs or SQL views. Do not use fallback for normal custom-date ledger.

9. Custom report ranges are not bounded or Zod-validated
   - Files: `lib/report-period.ts:60`, `lib/report-period.ts:98`, `lib/report-period.ts:102`, `app/actions/finance-reports-queries.ts:75`
   - Impact: callers can request multi-year custom ranges and trigger large cross-table scans.
   - Required fix: validate report filters server-side, cap custom ranges, and reject invalid years/months/quarters before querying.

## Positive Findings

- Finance route layout gates `/finance` by shell permission.
- Dashboard/intelligence actions already use `requireFinanceAccess` in the main dashboard query file.
- Critical RPCs for dashboard, ledger, finance intelligence, and contract payment are service-role only in recent migrations.
- Contract payment RPC `process_contract_payment_v2` is atomic, locks the contract row, filters `deleted_at`, and checks locked periods.
- Receipt and expense mutations mostly apply period locks and audit logs.
- App route chunks are currently under budget; finance heavy tables are split into route-level chunks.

## Suggested Fix Order

1. P0: add `withFinanceRead` and gate every finance/report read server action.
2. P0: fix debt update schema default reset and add debt monetary/status invariants.
3. P0: fix finance category schema/action mismatch.
4. P1: decide and enforce payment-recording permission boundary.
5. P1: harden debt installment and salary payment flows with period locks, caps, and atomic updates.
6. P1: cap pagination and report custom date windows.
7. P1: replace app-side full-table aggregations with RPCs/views.
8. P2: standardize soft delete semantics for fixed costs, investments, credit cards, and related reads.

## Verification Commands Run

```powershell
npx tsc --noEmit --pretty false
npm run perf:audit
npm run perf:chunks
```

## Fix Closeout - 2026-04-28

Status: Finance audit phases 00-04 completed in `plans/260428-finance-audit-fix`.

Fixed:
- Finance/Reports read actions now use finance-aware authorization before querying with the admin client.
- Debt/category P0 integrity issues were corrected.
- Payment recording now has an explicit access policy, salary overpayment is rejected, and installment debt updates keep paid/remaining/status consistent.
- Finance list page sizes and custom report/cashflow ranges are bounded.
- Custom-date ledger, debt stats, and report snapshot now have service-role-only SQL/RPC paths with missing-RPC fallback.
- Fixed costs, investments, credit cards, financial goals, and budgets now use consistent soft-delete behavior and active-row reads.

Added migration:
- `supabase/migrations/20260428090000_finance_audit_fix_completion.sql`

Verification:
```powershell
npx tsc --noEmit --pretty false
npm run perf:audit
npm run build
npm run perf:chunks
```

Supabase migration deployment:
- Applied `supabase/migrations/20260428090000_finance_audit_fix_completion.sql` to linked Supabase project `mnoqeluywookswpcykha`.
- Fixed the migration during deployment so `finance_reports_snapshot` casts `contracts.service_type::text` before `NULLIF`; production stores `service_type` as `service_type_enum`.
- `npx --yes supabase migration list` now shows local and remote both at `20260428090000`.

Note: Full-worktree `git diff --check` is still blocked by a pre-existing trailing whitespace issue in `app/actions/lead-actions.ts`, outside this finance pass; scoped finance diff-check passed.
