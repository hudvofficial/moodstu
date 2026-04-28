# Phase 00: Finance Read Access Boundary
**Status:** Complete
**Priority:** P0
**Dependencies:** None
**Audit issues:** Critical 1, Critical 2

## Objective

Every Finance/Reports read server action must enforce module permission before querying with the admin Supabase client.

The key risk is that `withAuth` authenticates the user, then passes `createAdminClient()` to the action. Route layouts protect pages, but direct server-action calls can bypass those route checks unless each action calls a module gate.

## Target Files

- `lib/auth_utils.ts`
- `app/actions/finance-operations-queries.ts`
- `app/actions/finance-reports-queries.ts`
- `app/actions/finance-cashflow-timeline.ts`
- `app/actions/goal-budget-actions.ts`
- `app/actions/expense-actions.ts`
- `app/actions/payment-actions.ts` only for read helper policy decision if needed
- `app/(protected)/reports/layout.tsx` only if report permission model changes

## Implementation Steps

1. Add a shared read wrapper.
   - Create `withFinanceRead<T>(action)` in `lib/auth_utils.ts`, or a local helper in finance actions if keeping auth utils small.
   - Internally call `withAuth`, then `requireFinanceAccess(supabase, userId)`, then execute the action.
   - Keep return shape as existing `ActionResult<T>`.

2. Convert `finance-operations-queries.ts`.
   - Replace bare `withAuth` on all finance read functions with `withFinanceRead`.
   - Functions include period lock check, category/contract option reads, receipts, expenses, debts, cards, lab debts, fixed costs, investments, salaries, goals, goal cashflow, contributions, receipt detail, expense detail.

3. Convert report-backed read actions.
   - `getReportsSnapshot` must require finance/report permission before querying.
   - `getCashflowTimeline` must require finance/report permission.
   - `getBudgetsWithActuals` must require finance permission.

4. Decide report permission semantics.
   - Current role model gives `reports` only to admin/manager, same as finance.
   - Simple option: use `requireFinanceAccess` for report data because the data is financial.
   - More explicit option: add `requireReportsAccess`, but ensure it is not broader than finance for financial snapshots.

5. Add negative-path verification.
   - If there are existing action tests, add tests for sale/media/viewer denial.
   - If no test harness exists, document manual checks and verify affected actions return `success: false`.

## Acceptance Criteria

- All Finance/Reports read actions that query finance tables call `requireFinanceAccess` or a stricter equivalent.
- No bare `withAuth` remains in finance read paths unless the function is intentionally public and documented.
- Existing admin/manager finance pages still load.
- TypeScript passes.

## Test Commands

```powershell
rg -n "withAuth\\(" app/actions/finance-operations-queries.ts app/actions/finance-reports-queries.ts app/actions/finance-cashflow-timeline.ts app/actions/goal-budget-actions.ts
npx tsc --noEmit --pretty false
npm run perf:audit
```

---
Next Phase: [Phase 01 - P0 Data Integrity Fixes](./phase-01-data-integrity-p0.md)

## 2026-04-28 Implementation Update

Completed:
- Added `withFinanceRead` in `lib/auth_utils.ts`.
- Converted finance operation reads, reports snapshot, cashflow timeline, budget actuals, and contract expense reads to use the finance access gate.
- Confirmed no bare `withAuth` remains in the audited finance/report read files except contract payment actions, which remain tracked under Phase 02 permission policy.
