# Plan: Inventory Audit Fix and Optimization
**Created:** 2026-04-28
**Status:** Completed
**Audit source:** `docs/reports/inventory_audit_2026_04_28.md`
**Initial score:** 7.5/10
**Target score:** 9.6/10
**Final score:** 9.6/10

## Overview

Fix `/inventory` in risk order:

1. Harden Supabase RPC grants and add repeatable remote verification.
2. Replace generic settings-admin coupling with explicit inventory app permission checks.
3. Enforce stock lifecycle invariants: no stock movement for discontinued items and no delete with stock/history.
4. Move stats/detail aggregates and code generation into database-backed contracts.
5. Improve first load, picker search, realtime invalidation, and user-facing search.
6. Add verification/smoke evidence and update the final score report.

## Phases

| Phase | Name | Status | Priority | Target Score Impact |
|:-----:|------|:------:|:--------:|:-------------------:|
| 00 | RPC Security, RBAC, and Verification | Completed | P0 | 7.5 -> 8.3 |
| 01 | Stock Lifecycle and Delete Invariants | Completed | P0 | 8.3 -> 8.9 |
| 02 | Aggregate SQL, Detail Correctness, and Codegen | Completed | P1 | 8.9 -> 9.2 |
| 03 | Time-Load, SSR Hydration, Picker, and Realtime | Completed | P1 | 9.2 -> 9.5 |
| 04 | Search UX, Error Surfacing, and Filter Contract | Completed | P2 | 9.5 -> 9.6 |
| 05 | Smoke, Final Score, and Report Update | Completed | P2 | 9.6 |

## Dependency Order

1. Phase 00 first because direct RPC execute posture is the highest-risk production gap.
2. Phase 01 next because stock lifecycle and delete behavior affect ledger correctness.
3. Phase 02 stabilizes database contracts before SSR and picker optimization consume them.
4. Phase 03 improves time-load only after correctness/security are stable.
5. Phase 04 closes visible UX gaps and makes failures obvious instead of silent empty states.
6. Phase 05 records proof and updates the score.

## Global Guardrails

- Do not revert unrelated dirty worktree changes from finance, printing, reports, productivity, or services.
- Treat inventory as internal operational/financial data.
- Only admin/manager should access `/inventory` and inventory-management actions.
- Finance receipt sale inventory options may remain available only through an explicitly intended finance/contract-safe server action.
- Stock ledger writes must stay atomic at the database level.
- No discontinued item can be stocked in or out.
- No item with stock or transaction history can be silently removed from operational/audit history.
- Keep `/inventory` route chunk under 80KB.
- Preserve existing list/detail/modal UX while improving load behavior.

## Verification Baseline

Run after implementation phases when feasible:

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run perf:audit
```

Run after DB/security phases:

```powershell
npx supabase db push --dry-run
npx supabase db push
npm run verify:inventory
```

Run before final score:

```powershell
npm run build
npm run perf:chunks
```

Targeted checks:

```powershell
rg -n "withInventoryAccess|requireInventoryAccess|inventory_stock_|inventory_stats|inventory_item_totals|nextval_inventory_code" app lib supabase scripts types
rg -n "setSearch|fetchInventoryPickerItems|useRealtime\\(\"inventory|discontinued|deleteInventoryItem" app components hooks lib
```

## Completion Definition

- Direct anon calls to inventory stock RPCs are denied.
- `npm run verify:inventory` proves service-role access, anon denial, and core RPC shape.
- Inventory server actions enforce explicit inventory permission, not only generic settings-admin permission.
- Stock-in/out fails for discontinued or deleted items at DB/action level.
- Delete is blocked for items with stock or transaction history; discontinue is the safe archive path.
- Stats and item detail totals come from SQL aggregates, not full-row Node scans or latest-50 transaction lists.
- Inventory code generation is DB-backed and concurrency-safe.
- `/inventory` initial list/stats and `/inventory/[id]` detail are SSR-hydrated.
- Picker endpoints are searchable/paginated and active-only by default.
- Search UI is wired and low/out-stock filter contract is either implemented or removed.
- Read failures surface as errors, not silent zero-data states.
- TypeScript, lint, build, perf audit, chunk budget, remote DB push, and verification script pass.

## Source Audit Mapping

- Critical 1: Phase 01.
- Critical 2: Phase 00.
- Critical 3: Phase 01.
- Warnings 1 and 2: Phase 02.
- Warning 3: Phase 03.
- Warnings 4 and 6: Phase 04.
- Warnings 5 and 7: Phase 03.
- Verification and score update: Phase 05.

## Completion Evidence

- Added and pushed `supabase/migrations/20260428200000_inventory_security_hardening.sql`.
- Added `npm run verify:inventory`; remote verification passed after push.
- Inventory tables and RPCs are denied to anon; service-role access remains available.
- Inventory actions now use explicit `withInventoryAccess`.
- Stock RPCs reject discontinued items and retain row-level `FOR UPDATE` locking.
- Delete now blocks items with stock or transaction history.
- Stats/list/detail totals use SQL RPC contracts.
- Item code generation now uses `nextval_inventory_code()`.
- `/inventory` and `/inventory/[id]` are SSR-hydrated.
- Picker is active-only, server-searchable, and paginated.
- Inventory search and low/out-stock filter tabs are wired.
- Verification passed: `npx tsc --noEmit --pretty false`, `npm run lint`, `npm run verify:inventory`, `npm run perf:audit`, `npm run build`, `npm run perf:chunks`, `npx supabase migration list`.
