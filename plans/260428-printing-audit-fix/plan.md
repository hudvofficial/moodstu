# Plan: Printing Audit Fix and Optimization
**Created:** 2026-04-28
**Status:** Done
**Audit source:** `docs/reports/printing_audit_2026_04_28.md`

## Overview

Fix the Printing/Labs audit findings in risk order:

1. Close route and server-action authorization gaps.
2. Establish missing RPC/database contracts and fail-fast behavior.
3. Make printing expense sync accounting-safe.
4. Make lab payment allocation correct and atomic.
5. Remove time-load risks from app-side aggregation and unvalidated filters.
6. Clean up UI semantics, component size, and final verification.

The module crosses Contracts and Finance, so every phase must preserve existing contract-detail printing entry points while tightening the permission and accounting boundaries.

## Phases

| Phase | Name | Status | Priority | Effort |
|:-----:|------|:------:|:--------:|:------:|
| 00 | Printing Access Boundary | Done | P0 | 2-4h |
| 01 | RPC and Data Contract Foundation | Done | P0 | 0.5-1d |
| 02 | Printing Expense Accounting Sync | Done | P0 | 1-2d |
| 03 | Lab Payment Allocation | Done | P0 | 1-2d |
| 04 | Time-load and Query Optimization | Done | P1 | 1-2d |
| 05 | UI Semantics, Cleanup, Final Verification | Done | P2 | 0.5-1d |

## Dependency Order

1. Phase 00 lands first because current actions use the admin client through `withAuth`.
2. Phase 01 creates the RPC and DB foundation needed by later accounting/performance fixes.
3. Phase 02 and Phase 03 can be implemented after Phase 01; keep them separate because they touch different accounting flows.
4. Phase 04 runs after access gates and RPC grants are safe.
5. Phase 05 is the cleanup, UX semantics, and verification pass.

## Global Guardrails

- Do not revert unrelated changes. Current unrelated untracked file: `docs/reports/finance_score_2026_04_28.md`.
- Keep access checks server-side. Route layouts are not enough for server actions.
- Any new RPC touching finance/printing state must be service-role only unless explicitly documented otherwise.
- Prefer atomic RPCs for multi-table accounting changes.
- Preserve current contract-detail printing workflows while correcting authorization and accounting behavior.
- Do not broaden role permissions for `printing`; enforce the existing role model.
- Keep app fallbacks only for local missing-RPC development when they cannot corrupt finance figures.

## Verification Baseline

Run after each phase when feasible:

```powershell
npx tsc --noEmit --pretty false
npm run perf:audit
npm run verify:printing
```

Run after phases 01, 04, and 05:

```powershell
npm run build
npm run perf:chunks
```

Targeted checks:

```powershell
rg -n 'withAuth\(' app/actions/printing-queries.ts app/actions/printing-reference-queries.ts app/actions/printing-mutations.ts app/actions/lab-queries.ts app/actions/lab-mutations.ts app/actions/printing-actions.ts
rg -n 'get_printing_cost_stats|finance_lab_debt_summary|printing_stats|lab_payment' supabase/migrations types/database.types.ts app/actions
npx supabase db push --dry-run
```

## Completion Definition

- Non-printing roles cannot access `/printing`, `/printing/labs`, or printing/lab server actions.
- Printing order create/update/delete keeps finance expenses consistent or fails atomically.
- Lab payment cannot close unrelated/underpaid orders and records clear allocation.
- Printing stats and lab debt come from migrated SQL/RPC contracts with service-role-only grants.
- Direct calls with huge page sizes or invalid filters are rejected or clamped.
- `/printing` and `/printing/labs` stay under the route chunk budget.
- Build, TypeScript, perf audit, and chunk checks pass.

## Source Audit Mapping

- Critical 1: Phase 00
- Critical 2: Phase 02
- Critical 3: Phase 03
- Critical 4: Phase 01
- Warnings 1, 4, 5, 9: Phase 01 and Phase 04
- Warnings 2, 3: Phase 04
- Warnings 6, 7, 8: Phase 01 and Phase 05
- Suggestions 1-5: Phase 05
