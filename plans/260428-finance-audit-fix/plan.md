# Plan: Finance Audit Fix - Security, Integrity, Performance
**Created:** 2026-04-28
**Status:** Done
**Audit source:** `docs/reports/finance_audit_2026_04_28.md`

## Overview

Fix the Finance and Reports audit findings in risk order:

1. Close server-action authorization gaps first.
2. Fix P0 data-integrity bugs that can corrupt finance state.
3. Harden accounting mutation flows.
4. Reduce time-load risk from unbounded pagination and app-side aggregation.
5. Normalize delete semantics and run final verification.

This plan should be executed phase by phase. Do not mix broad performance rewrites into the security phases.

## Phases

| Phase | Name | Status | Priority | Effort |
|:-----:|------|:------:|:--------:|:------:|
| 00 | Finance Read Access Boundary | Complete | P0 | 2-4h |
| 01 | P0 Data Integrity Fixes | Complete | P0 | 3-5h |
| 02 | Accounting Flow Hardening | Complete | P1 | 1-2d |
| 03 | Time-load and RPC Optimization | Complete | P1 | 1-2d |
| 04 | Delete Semantics and Final Verification | Complete | P2 | 0.5-1d |

## Dependency Order

1. Phase 00 must land first because current read actions use the admin client and bypass route-only guards.
2. Phase 01 can follow immediately after Phase 00; it touches schema/action bugs with clear reproduction paths.
3. Phase 02 depends on Phase 01 debt/schema cleanup.
4. Phase 03 should run after access gates are in place, so RPC/fallback changes cannot accidentally widen data exposure.
5. Phase 04 is the cleanup and final verification pass.

## Global Guardrails

- Do not revert unrelated modified files in auth/calendar/contracts/CRM.
- Keep finance fixes scoped to `app/actions`, `lib/validations`, finance/report components only where needed, and Supabase migrations.
- Use existing auth helpers and patterns before adding new abstractions.
- Any new RPC must be service-role only unless there is a specific authenticated-user reason.
- Preserve current UI behavior unless a UI change is required to support corrected business logic.

## Verification Baseline

Run after each phase when feasible:

```powershell
npx tsc --noEmit --pretty false
npm run perf:audit
```

Run after phase 03 and phase 04:

```powershell
npm run build
npm run perf:chunks
```

Optional targeted lint if available:

```powershell
npm run lint -- "app/(protected)/finance" "app/(protected)/reports" components/finance components/reports app/actions lib/validations/finance.schema.ts
```

## Completion Definition

- No unauthenticated or non-finance role can call Finance/Reports read actions successfully.
- Debt/category critical bugs are fixed and covered by focused tests or clear manual checks.
- Accounting mutations reject invalid overpayments/over-marking and respect locked periods.
- List/report endpoints cap request size and avoid normal-path full-table aggregation for high-volume paths.
- Build, TypeScript, perf audit, and chunk checks pass.

## 2026-04-28 Implementation Update

Completed:
- Added `withFinanceRead` and converted Finance/Reports read actions to require finance access before querying with the admin client.
- Fixed debt update schema so omitted `status` no longer defaults to `open`.
- Hardened debt update/delete with `deleted_at` filters, accounting-date period lock, guarded optimistic update, and amount/status recalculation.
- Hardened installment payment against deleted/closed/overpaid debts and updates paid/remaining totals.
- Fixed finance category schema/action mismatch for `thu`/`chi`.
- Fixed monthly fixed-cost generation to ignore soft-deleted fixed costs.
- Added salary overpayment guard.
- Added page-size caps for finance list helpers and custom date range caps for report/cashflow paths.
- Made fixed-cost read/update/delete consistent with soft delete.
- Added explicit payment-recording access policy for contract payment receipts while preserving sale collection flow.
- Added SQL/RPC paths for custom-date ledger, debt stats, and reports snapshot with app fallback only for missing RPCs.
- Standardized soft delete for investments, credit cards, financial goals, budgets, and fixed costs.
- Added finance audit completion migration `20260428090000_finance_audit_fix_completion.sql`.

Still open:
- None for Finance audit phases 00-04. Apply the new Supabase migration before production verification against live data.

Verified:
```powershell
npx tsc --noEmit --pretty false
npm run perf:audit
npm run build
npm run perf:chunks
```
