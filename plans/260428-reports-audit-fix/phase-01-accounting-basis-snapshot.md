# Phase 01: Report Accounting Basis and Snapshot Contract
**Status:** Completed
**Priority:** P0
**Dependencies:** Phase 00
**Audit issues:** Critical 2, Suggestions 2 and 4

## Objective

Make `/reports` financially coherent by separating cashflow metrics from profit/accrual metrics or by explicitly documenting and enforcing one consistent basis.

Current risk: `totalRevenue` is cash-based by payment date, while contract count, service mix, direct costs, and add-ons are scoped by contract date.

## Target Files

- `supabase/migrations/*_reports_snapshot_basis.sql` (new)
- `app/actions/finance-reports-queries.ts`
- `types/reports.ts`
- `components/reports/reports-stats-bar.tsx`
- `components/reports/reports-overview-panels.tsx`
- `components/reports/reports-cashflow-view.tsx`
- `components/reports/reports-export.ts`
- `docs/specs/reports.md` or `docs/specs/finance.md`

## Implementation Steps

1. Define report basis.
   - Cashflow view: payments, standalone receipts, expenses, salaries, fixed costs by transaction/date range.
   - Profit view: contract revenue and direct costs scoped consistently by contract date or completion date.
   - Explicitly label current debt as "as of today" if it remains unscoped.

2. Update snapshot RPC.
   - Return separate `cashflowSummary` and `profitSummary` or equivalent fields.
   - Avoid using payment-date revenue to calculate contract-date profit.
   - Keep service distribution tied to the same basis as contract/profit summary.

3. Update TypeScript types and normalizers.
   - Add separate fields rather than overloading `summary.totalRevenue`.
   - Preserve compatibility with UI by mapping old fields only if the meaning stays correct.

4. Update UI copy.
   - Show "Doanh thu thu tiền" for cash.
   - Show "Doanh thu hợp đồng" for profit/accrual.
   - Avoid a single ambiguous `netProfit` unless the basis is clear.

5. Add consistency checks.
   - `verify:reports` should verify required keys and compare cashflow totals to ledger totals for the same period.
   - The check should allow known basis differences only when documented.

## Acceptance Criteria

- `netProfit` and `profitMargin` no longer mix payment-date revenue with contract-date costs.
- UI labels clearly distinguish cashflow and profit basis.
- Export sheets use the same basis labels as UI.
- `verify:reports` checks snapshot shape and key totals.

## Test Commands

```powershell
npm run verify:reports
npx tsc --noEmit --pretty false
npm run build
```

---
Next Phase: [Phase 02 - Fail-Closed SSR, Validation, and Typed RPC Contracts](./phase-02-fail-closed-validation-types.md)
