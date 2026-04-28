# Phase 03: Time-load and RPC Optimization
**Status:** Complete
**Priority:** P1
**Dependencies:** Phase 00, Phase 01
**Audit issues:** Warnings 7, 8, 9

## Objective

Remove the biggest time-load risks:

- Uncapped page sizes.
- Custom report ranges with no bounds.
- Normal-path app-side full-table aggregation for reports, ledger, and debt stats.

## Target Files

- `app/actions/finance-operations-queries.ts`
- `app/actions/finance-dashboard-queries.ts`
- `app/actions/finance-reports-queries.ts`
- `lib/report-period.ts`
- `lib/validations/finance.schema.ts`
- `supabase/migrations/*`

## Implementation Steps

1. Add shared pagination validation.
   - Define `FinancePage` and `FinancePageSize` schemas or a utility clamp.
   - Recommended max: 50 for operational lists, 100 only for admin/export paths.
   - Apply to receipts, expenses, debts, goals, goal contributions, ledger.

2. Validate report filters server-side.
   - Add Zod schema for `ReportFiltersInput`.
   - Validate month 1-12, quarter 1-4, reasonable year range.
   - Cap custom ranges, for example max 366 days unless an export-specific path is added.

3. Replace custom-date ledger fallback.
   - Current `fetchLedger` forces fallback whenever `fromDate` and `toDate` are present.
   - Add an RPC that accepts date range and type, paginates in SQL, and returns total count.
   - Keep fallback only for missing-RPC local dev, not normal production path.

4. Move debt stats to SQL/RPC.
   - Current `fetchDebtStats` loads all debt rows and reduces in app.
   - Add service-role-only `finance_debt_stats()` RPC.

5. Move reports snapshot aggregation to SQL/RPC or split into bounded aggregate queries.
   - At minimum avoid loading large child rowsets when only sums/counts are needed.
   - Preserve formulas from current reports snapshot while moving aggregation to DB.

6. Re-run chunk/build checks.
   - Ensure no new client bundle growth from validation libraries in client components.

## Acceptance Criteria

- Direct calls with huge pageSize are clamped.
- Custom report ranges over the cap are rejected.
- Ledger custom date path uses SQL pagination, not app memory sort/slice.
- Debt stats no longer loads all debts into app memory.
- Build and perf checks pass.

## Test Commands

```powershell
npx tsc --noEmit --pretty false
npm run build
npm run perf:audit
npm run perf:chunks
```

---
Next Phase: [Phase 04 - Delete Semantics and Final Verification](./phase-04-delete-semantics-verify.md)

## 2026-04-28 Implementation Update

Completed:
- Added shared page-size cap for finance list helpers.
- Capped direct contract option limit.
- Added custom date range validation for reports and cashflow timeline paths.
- Added `finance_ledger_range` RPC and routed custom-date ledger through SQL pagination.
- Added `finance_debt_stats` RPC and routed debt stats through SQL aggregation.
- Added `finance_reports_snapshot` RPC and routed reports snapshot through server-side aggregate JSON.
- Kept query fallback only for missing RPC/schema-cache cases.

Still open:
- None for this phase. Apply migration `20260428090000_finance_audit_fix_completion.sql` before relying on the new RPC paths in production.
