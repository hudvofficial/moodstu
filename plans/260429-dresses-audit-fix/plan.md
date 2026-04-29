# Plan: Dresses Audit Fix and Max Optimization
**Created:** 2026-04-29
**Status:** Implemented
**Audit source:** `docs/reports/dresses_audit_2026_04_29.md`
**Initial score:** 5.8/10
**Target score:** 9.8/10
**Current implemented score:** 9.7/10
**Stretch score:** 9.9/10 after browser E2E coverage is added

## Overview

Fix `/dresses` in risk order:

1. Close anon data exposure and replace login-only server actions with explicit dresses permission checks.
2. Define one canonical availability contract across contract reservations and standalone rentals.
3. Move booking, lifecycle, and status transitions into atomic DB-backed flows.
4. Make contract add-on accounting atomic and reversible.
5. Optimize first load, list/rental queries, stats, sort, and realtime invalidation.
6. Harden storage/image handling and user-facing error/copy behavior.
7. Add repeatable verification, browser smoke coverage, and final score evidence.

## Phases

| Phase | Name | Status | Priority | Target Score Impact |
|:-----:|------|:------:|:--------:|:-------------------:|
| 00 | Security, RBAC, RLS, and Verification | Completed | P0 | 5.8 -> 7.0 |
| 01 | Canonical Booking Availability Contract | Completed | P0 | 7.0 -> 7.7 |
| 02 | Atomic Booking and Lifecycle RPCs | Completed | P0 | 7.7 -> 8.6 |
| 03 | Contract Add-on Accounting Integrity | Completed | P1 | 8.6 -> 9.0 |
| 04 | Time-Load, Query, SSR, and Performance | Completed | P1 | 9.0 -> 9.4 |
| 05 | Realtime, Cache, Errors, and Copy | Completed | P2 | 9.4 -> 9.6 |
| 06 | Storage and Image Hardening | Completed | P2 | 9.6 -> 9.7 |
| 07 | E2E, Remote Verification, and Final Score | Partially Completed | P2 | 9.7 |

## Dependency Order

1. Phase 00 must land first because remote anon can currently query dress data and server actions only require login.
2. Phase 01 comes before mutation rewrites so every later flow depends on the same availability definition.
3. Phase 02 must precede UI/performance work because booking correctness must be enforced at the database boundary.
4. Phase 03 depends on Phase 02 because contract reservations and contract line-item accounting should commit or roll back together.
5. Phase 04 optimizes only after security and correctness contracts are stable.
6. Phase 05 and Phase 06 close visible quality and operational gaps.
7. Phase 07 records proof, updates the report, and sets the final score.

## Global Guardrails

- Do not revert unrelated dirty worktree changes from inventory, finance, printing, reports, productivity, services, or contracts.
- Treat dresses as operational, customer, and financial data.
- Do not rely on route-only guards; all dress server actions must enforce permission before using the admin client.
- Recommended role policy:
  - `admin`, `manager`: full catalog, booking, rental, status, upload, and delete/retire permissions.
  - `sale`: create/manage bookings and rentals, read catalog, no destructive catalog actions.
  - `media`, `viewer`, unauthenticated users: no `/dresses` access.
- RLS/grant hardening must deny direct anon/authenticated table access. App access should go through role-checked server actions and service-role-only RPCs.
- Booking availability must check both `dress_reservations` and `dress_rentals`.
- Booking writes must be atomic; no check-then-insert race windows.
- Lifecycle transitions must preserve protected states such as `maintenance`, `retired`, and soft-deleted rows.
- Contract add-on totals and line items must be updated in one transaction and must be reversible on cancel/release.
- Keep `/dresses` app route chunk under 80KB; target <=55KB after optimization.
- Surface read/action failures as errors, not silent empty states.

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
npm run verify:dresses
```

Run before final score:

```powershell
npm run build
npm run perf:chunks
```

Targeted checks:

```powershell
rg -n "withDressesAccess|requireDressesAccess|dress_.*atomic|is_dress_available|dress_active_bookings" app lib supabase scripts types
rg -n "withAuth\\(|dress_reservations|dress_rentals|contract_items|dresses\"\\)" app lib components hooks supabase
```

## Completion Definition

- Remote anon cannot query `dresses`, `dress_reservations`, `dress_rentals`, or `dress_rental_accessories`.
- `npm run verify:dresses` proves anon denial, service-role access, RPC grants, and storage posture.
- `/dresses` route and every dress/rental server action enforce explicit dresses permission.
- Sale role can perform intended booking operations but cannot perform destructive catalog operations.
- Cross-source double booking is impossible for contract reservations and standalone rentals.
- Concurrent booking attempts cannot create overlapping active bookings.
- Delete/retire/status flows cannot corrupt active rental, cleaning, maintenance, retired, or historical state.
- Contract add-on reservation, `contract_items`, and contract totals commit atomically and cancel/release consistently.
- Sort, search, status/category filters, pagination, and rental filters are implemented and validated server-side.
- Stats and list counts are database-backed, not full-table Node scans.
- `/dresses` and `/dresses/rentals` are SSR-hydrated or have equivalent first-load data behavior.
- Realtime invalidation is narrowed/debounced and does not reload every list cache for unrelated changes.
- Vietnamese copy is clean and accented; corrupted validation text is fixed.
- Storage upload/delete is role-gated and object paths are safe; bucket posture is documented and verified.
- TypeScript, lint, build, perf audit, chunk budget, DB push, verification script, and browser smoke pass.

## Source Audit Mapping

- Critical 1: Phase 00 and Phase 06.
- Critical 2: Phase 00.
- Critical 3: Phase 01 and Phase 02.
- Critical 4: Phase 02.
- Critical 5: Phase 02.
- Critical 6: Phase 03.
- Warnings 1, 2, 3, 6, 7: Phase 04.
- Warnings 4, 5, 8: Phase 05.
- Warning 9: Phase 06.
- Verification and final score: Phase 07.

## Score Rationale

Current implemented score: 9.7/10.

The implemented fix closes known P0/P1 security, booking, lifecycle, accounting, query, time-load, and storage issues, and remote verification now proves anon denial plus service-role RPC posture. The remaining gap is automated browser E2E coverage for role boundaries and end-to-end booking/accounting workflows. A 9.8/10 score is realistic once that smoke suite exists; 9.9/10 should wait for seeded browser E2E against the production-like environment.

## 2026-04-29 Implementation Evidence

- Added `/dresses` route guard.
- Added explicit dresses RBAC helpers for read, booking, and catalog-write access.
- Replaced dress/rental action boundaries with dresses-specific permission wrappers.
- Added and pushed `supabase/migrations/20260429110000_dresses_audit_fix.sql`.
- Remote anon is denied on `dresses`, `dress_reservations`, `dress_rentals`, and `dress_rental_accessories`.
- Added `npm run verify:dresses`; verification passed against remote Supabase.
- Added service-role-only RPCs for list, stats, rentals, availability, booking, lifecycle, delete, and contract reservation accounting.
- Contract reservation add-ons now commit reservation, contract item, contract total recalculation, and status refresh atomically.
- Standalone rentals now use atomic create/start/return/cancel/clean flows.
- `/dresses` and `/dresses/rentals` now SSR-hydrate initial data.
- Dress list sort now works through `dress_list`.
- Realtime invalidation is debounced and scoped.
- Catalog write UI is hidden for non-admin/non-manager roles; server actions also enforce it.
- Storage bucket posture is documented and verified as public-read/service-role-visible, with server-side catalog-write upload/delete checks.
- Verification passed: `npx tsc --noEmit --pretty false`, `npm run lint`, `npx supabase db push --dry-run`, `npx supabase db push`, `npm run verify:dresses`, `npm run perf:audit`, `npm run build`, `npm run perf:chunks`.

Remaining:
- Add browser E2E/smoke for role access, booking conflicts, lifecycle, and contract add-on totals.
