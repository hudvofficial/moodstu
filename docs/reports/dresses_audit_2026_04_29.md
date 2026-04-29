# Dresses Module Audit - 2026-04-29

Scope: `/dresses`, `/dresses/rentals`, dress catalog actions, contract-linked reservations, standalone rentals, storage upload, realtime/SWR behavior, Supabase table exposure, build health, and performance.

## Final Summary

- Score: 5.8/10.
- Production recommendation: not ready for production until P0 security and booking-integrity issues are fixed.
- Critical issues: 6.
- Warnings: 9.
- Positive findings: 8.
- Remote data observed: service role sees 8 `dresses`, 2 `dress_reservations`, 1 `dress_rentals`, and 0 `dress_rental_accessories`.
- Remote anon posture: anon can query `dresses`, `dress_reservations`, `dress_rentals`, and `dress_rental_accessories`.
- Build health: TypeScript, lint, perf audit, production build, and chunk budget pass.
- `/dresses` route chunk: 52KB, under the 80KB app-route budget.

## Critical Issues

1. Dress data is exposed to anon on remote Supabase
   - Remote probe:
     - `dresses`: anon ok, 8 rows.
     - `dress_reservations`: anon ok, 2 rows.
     - `dress_rentals`: anon ok, 0 rows.
     - `dress_rental_accessories`: anon ok, 0 rows.
   - Impact: dress catalog and reservation metadata are readable with the public anon key. If standalone rentals grow, customer names/phones in `dress_rentals` are at risk too.
   - Required fix: add a hardening migration to enable RLS, revoke broad grants, and allow app access only through server-side role-checked actions. Add `npm run verify:dresses`.

2. Route and server actions only require login, not `/dresses` permission
   - Files:
     - `app/(protected)/dresses/page.tsx:5` renders the module without a dresses route guard.
     - `app/actions/dress-queries.ts:3`, `app/actions/dress-mutations.ts:3`, `app/actions/rental-queries.ts:3`, `app/actions/rental-mutations.ts:3` use `withAuth`.
     - `lib/auth_utils.ts:268-280` shows `withAuth` only verifies a user and then uses the admin client.
   - Impact: any authenticated user can call dress read/write server actions even if navigation hides the module.
   - Required fix: add `app/(protected)/dresses/layout.tsx` with `canAccess(role, "dresses")`, add `requireDressesAccess`/`withDressesAccess`, and replace all dress/rental actions.

3. Double-booking can happen because contract reservations and standalone rentals do not check each other
   - Files:
     - `app/actions/dress-mutations.ts:259-267` checks overlap only in `dress_reservations`.
     - `app/actions/rental-mutations.ts:27-34` checks overlap only in `dress_rentals`.
     - `app/actions/dress-queries.ts:124-132` availability checks only `dress_reservations`.
   - Impact: the same dress can be reserved for a contract and also booked as a standalone rental for the same date range.
   - Required fix: make one canonical availability contract that checks both sources, or merge flows into one table. Enforce it in DB or atomic RPC, not only in client/server action code.

4. Booking writes are non-atomic and race-prone
   - Files:
     - `app/actions/dress-mutations.ts:260-318` performs check-then-insert for reservations.
     - `app/actions/rental-mutations.ts:28-42` performs check-then-insert for standalone rentals.
   - Impact: two concurrent requests can both pass the overlap check before either insert commits.
   - Required fix: use a transaction/RPC with row locking or a Postgres exclusion constraint for active date ranges.

5. Dress lifecycle can be corrupted by delete/status actions
   - Files:
     - `app/actions/dress-mutations.ts:202-207` blocks delete only for active `dress_reservations`, not active `dress_rentals` or history.
     - `app/actions/rental-mutations.ts:185-190` marks any dress available without verifying it is currently cleaning or has no active booking.
     - `app/actions/dress-mutations.ts:13-31` recalculates status from `dress_reservations` only and can overwrite statuses like maintenance/retired.
   - Impact: dresses with active standalone rentals can be deleted; cleaning/maintenance/retired state can be overwritten; operational status can disagree with actual bookings.
   - Required fix: centralize lifecycle transitions in DB-backed functions that consider both reservation sources and protected statuses.

6. Contract add-on reservation billing can leave contract totals and line items inconsistent
   - Files:
     - `app/actions/dress-mutations.ts:276-314` inserts a `contract_items` row and manually increments `contracts.total_amount`/`remaining_amount`.
     - `app/actions/dress-mutations.ts:418-443` subtracts from contract totals on release but does not void/delete the `contract_items` row.
   - Impact: contract detail can still show the add-on row while contract totals no longer include it, or vice versa after partial failures.
   - Required fix: move add-on reservation + contract item + contract totals into a single atomic RPC and define cancellation semantics for the line item.

## Warnings

1. Sort UI is wired but not implemented in the query
   - Files:
     - `components/dresses/dresses-filters.tsx:28-32` exposes sort options.
     - `components/dresses/dresses-list-client.tsx:55-56` passes `sort`.
     - `app/actions/dress-queries.ts:31-35` always orders by `created_at DESC`.
   - Impact: users see sort controls that do not work.

2. `/dresses` is client-data-only, with no SSR hydration
   - Files: `app/(protected)/dresses/page.tsx:5-6`, `components/dresses/dresses-list-client.tsx:54-64`.
   - Impact: first useful data waits for client JS plus server action round trips.

3. Stats read every dress row into Node
   - File: `app/actions/dress-queries.ts:96-110`.
   - Impact: stats scale linearly and transfer more data than needed.

4. Read failures are hidden as empty states
   - Files: `app/actions/dress-queries.ts:56-64`, `app/actions/dress-queries.ts:111-114`, `app/actions/dress-queries.ts:178-187`.
   - Impact: permission/RLS/data failures can look like "no dresses" or "0 stats".

5. Realtime invalidation is broad and immediate
   - File: `components/dresses/dresses-list-client.tsx:67-75`.
   - Impact: any dress, reservation, or rental change revalidates all dress list caches and stats without debouncing.

6. Rental query filters are unvalidated and search is not sanitized
   - File: `app/actions/rental-queries.ts:34-60`.
   - Impact: arbitrary page sizes/status values and raw search strings can produce unexpected query behavior or expensive requests.

7. Rental schemas do not enforce date order on the server
   - File: `lib/validations/rental.schema.ts:22-33`.
   - Impact: direct server action calls can create invalid rental periods even though the UI blocks them.

8. Text/copy has at least one corrupted Vietnamese validation message
   - File: `lib/validations/dress.schema.ts:95`.
   - Impact: users may see mojibake on date validation failures.

9. Storage posture is broad
   - Files:
     - `app/actions/dress-mutations.ts:469-494` uploads to the public `dresses` bucket.
     - Remote probe: `dresses` bucket exists and is public.
   - Impact: public catalog photos may be intended, but upload/delete currently depends only on `withAuth` and broad bucket public-read posture.

## Positive Findings

- Core CRUD uses Zod validation, audit logging, soft delete, and optimistic locking for edit flows.
- Build passes with current worktree.
- `/dresses` app route chunk is 52KB, under the 80KB route budget.
- QR and camera scanner libraries are dynamically imported.
- List and rental pages are paginated.
- Hot-path indexes exist for `dress_reservations` and `dress_rentals`.
- Detail drawer avoids a full page navigation for common item inspection.
- Upload path validates file presence, image MIME prefix, and size.

## Verification Commands Run

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run perf:audit
npm run build
npm run perf:chunks
```

Results:

- TypeScript: passed.
- Lint: passed with 0 errors and 19 warnings. Dresses-specific warning: `app/actions/dress-mutations.ts:359` unused `contractId`.
- Perf audit: passed.
- Production build: passed.
- Chunk budget: passed. `/dresses` route chunk is 52KB; no app route chunks over 80KB.

Remote Supabase probe:

```text
Anon table exposure:
- dresses: anon ok (8 rows)
- dress_reservations: anon ok (2 rows)
- dress_rentals: anon ok (0 rows)
- dress_rental_accessories: anon ok (0 rows)
Service-role table access:
- dresses: service-role ok (8 rows)
- dress_reservations: service-role ok (2 rows)
- dress_rentals: service-role ok (1 rows)
- dress_rental_accessories: service-role ok (0 rows)
Storage buckets:
- dresses: exists public=true
- studio-assets: exists public=true
```

## Suggested Fix Phases

1. Phase 00 - Security boundary
   - Add dresses route guard.
   - Add `requireDressesAccess` and `withDressesAccess`.
   - Replace all dress/rental query and mutation `withAuth` usage.
   - Add DB grant/RLS hardening and `scripts/verify-dresses.mjs`.

2. Phase 01 - Booking integrity
   - Define canonical active booking model across `dress_reservations` and `dress_rentals`.
   - Add atomic create/cancel/start/return RPCs or DB constraints.
   - Validate date ranges server-side.

3. Phase 02 - Lifecycle and billing correctness
   - Centralize dress status transitions.
   - Protect maintenance/retired/deleted states.
   - Make contract add-on reservation billing atomic and reversible.

4. Phase 03 - Time-load and query optimization
   - SSR-hydrate `/dresses` and `/dresses/rentals`.
   - Move stats to SQL aggregate.
   - Implement sort in `fetchDressList`.
   - Debounce/narrow realtime invalidation.

5. Phase 04 - UX and cleanup
   - Fix corrupted Vietnamese copy.
   - Surface read errors as real errors.
   - Add browser smoke for admin/manager/sale allowed and media/viewer blocked.

## Score Rationale

Score: 5.8/10.

The module has a usable UI, validated CRUD, audit logs, good chunk size, and a working production build. The score is pulled down by production-grade security and correctness issues: anon table exposure, route/action RBAC gaps, race-prone booking, split booking sources that can double-book, lifecycle transitions that ignore some booking sources, and non-atomic contract add-on accounting. After Phase 00 and Phase 01, the module can realistically move into the 7.5-8.2 range; after lifecycle/billing and SSR/stats fixes, it can reach 9+.
