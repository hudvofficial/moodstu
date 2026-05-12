# Calendar Max Correctness + Performance Plan

Date: 2026-05-12  
Scope: `/calendar` app logic, data access, loading performance, realtime refresh, Google sync, and end-to-end calendar UX.  
Priority rule: correctness and data-safety first; performance work must not change intended app behavior silently.

## Current Read

The previous `/calendar` performance pass improved month loading by adding the `calendar_month_events` RPC and reducing branch-by-branch REST fetches. Warm RPC timing is now acceptable, but the module is not yet "max score" because several correctness rules are implicit or only enforced by the UI. The next pass must make the server actions, RPC, drag/drop behavior, cache invalidation, and Google sync agree on the same contract.

## Top Risks Found

1. `requireCalendarAccess()` checks permission but does not yet enforce active/non-deleted employee state inside server actions.
2. `checkEmployeeAvailability()` currently allows a calendar user to query conflicts for other employees through a forced global-admin path.
3. Month date windows use inclusive end dates in the RPC/fallback path. If calendar dates become timestamp-like or contain times, final-day events can be missed.
4. Task date semantics are not explicit. Tasks displayed from `start_date` are still marked as `originalDateField: "deadline"`, so drag/drop can mutate the wrong field.
5. Schedule drag/drop preserves multi-day duration only when the client sends `oldDateIso`; the server should derive duration from DB data.
6. Realtime invalidation uses a broad `calendar` prefix, which can refresh unrelated `calendar-google` data on every internal schedule/task change.
7. Google sync is best-effort. Create/update/delete can leave internal and Google state partially out of sync without a recovery path.
8. Calendar UI/action text still contains likely mojibake in several files, which hurts operator trust and can hide real error states.
9. Calendar UI is not yet strong enough for daily operations: month/week/day density, drawer flow, filters, drag/drop affordance, mobile layout, and error/loading states need a dedicated pass.
10. Existing smoke tests only cover a narrow schedule path and RPC inclusion. They do not protect task parity, authorization boundaries, drag/drop, realtime invalidation, or Google-linked records.

## Target Score

- Correctness: 9.5/10+
- Performance: 9/10+
- Operability: 9/10+
- UX clarity: 9/10+

The module should only be considered "max score" after the release gate in Phase 07 passes against production-equivalent data and role scenarios.

## Timing Budget

- Authenticated `/calendar` navigation: visible shell under 500 ms on warm app route.
- Internal month data warm fetch: under 250 ms server-side for a normal month.
- Internal month data cold fetch: under 800 ms server-side for a normal month.
- Data-ready after navigation: under 1.5 s on a normal authenticated session.
- View switch month/week/day after data is loaded: no blocking refetch for already-loaded range.
- Realtime refresh after schedule/task mutation: under 1 s, scoped to the affected calendar cache.
- Google connected state must not block internal calendar render; Google results may stream or hydrate separately.

## Phase Order

1. [Phase 00 - Contract Freeze and Baseline](./phase-00-contract-freeze-baseline.md)
2. [Phase 01 - Access Control and Date Windows](./phase-01-access-control-date-windows.md)
3. [Phase 02 - Task and Schedule Behavior Parity](./phase-02-task-schedule-parity.md)
4. [Phase 03 - RPC and Query Hardening](./phase-03-rpc-query-hardening.md)
5. [Phase 04 - Realtime and SWR Refresh Budget](./phase-04-realtime-swr-refresh.md)
6. [Phase 05 - Google Sync Correctness](./phase-05-google-sync-correctness.md)
7. [Phase 06 - Calendar UX, Loading States, and Polish](./phase-06-ui-text-loading-polish.md)
8. [Phase 07 - Verification, Deploy, and Rollback](./phase-07-verification-deploy-rollback.md)

## Implementation Status

Completed on 2026-05-13 before commit/deploy.

- Phase 01: active/non-deleted employee enforcement and exclusive date windows are implemented.
- Phase 02: task `deadline` versus `start_date` parity and server-side schedule duration preservation are implemented.
- Phase 03: RPC fallback, order fix, and opt-in/slow-query timing profiling are implemented.
- Phase 04: realtime invalidation is scoped to the internal calendar cache; Google data is split to its own SWR key.
- Phase 05: Google-linked deletes now block local deletion when Google deletion fails.
- Phase 06: toolbar filters, event cards, day view, loading/refresh indicators, and stable calendar cell UI are polished.
- Phase 07: `verify:calendar`, lint, typecheck, production build, smoke, migration check, and diff check passed locally.

## Non-Negotiable Gates

- No phase may weaken role/ownership checks to gain speed.
- No cache optimization may hide a failed mutation or stale ownership state.
- No UI cleanup may remove actionable error messages.
- RPC changes must keep a tested fallback until production smoke passes.
- Every behavior change must be covered by either smoke tests, unit-level checks, or a documented manual verification path.

## Files Reviewed During Audit

- `app/(protected)/calendar/page.tsx`
- `app/actions/calendar-queries.ts`
- `app/actions/calendar-mutations.ts`
- `app/actions/calendar-task-actions.ts`
- `lib/calendar-auth.ts`
- `lib/swr.ts`
- `hooks/use-calendar-data.ts`
- `components/calendar/drawers/event-form-drawer.tsx`
- `components/calendar/views/month-grid.tsx`
- `components/calendar/views/week-grid.tsx`
- `components/calendar/views/day-view.tsx`
- `components/calendar/events/draggable-event.tsx`
- `components/calendar/events/droppable-day.tsx`
- `supabase/migrations/20260512090000_calendar_month_events_rpc.sql`
- `scripts/verify-calendar.mjs`
- `scripts/smoke-calendar.mjs`
