# Phase 05: Realtime Freshness & Release Gate
Status: Done Locally

## Objective
Ship the dashboard speed work without breaking realtime freshness after contracts/payments/receipts/payment plans/events change.

## Realtime Findings

Current dashboard mounts:

- `RealtimeSync table="contracts"`
- `RealtimeSync table="payments"`
- `RealtimeSync table="receipts"`
- `RealtimeSync table="payment_plans"`
- `RealtimeSync table="contract_events"`
- `RealtimeSync table="schedules"`
- `RealtimeSync table="work_tasks"`

Because no explicit SWR keys/prefixes are passed, `useRealtime()` falls back to `router.refresh()`.

## Cache Rule

Avoid a long full-dashboard `unstable_cache`.

Acceptable:
- Request-level `cache()` for deduping inside one render.
- Short section-level cache only when freshness impact is understood.
- Tag/key invalidation if a persistent cache is introduced.

Not acceptable:
- Full dashboard cache that hides realtime refresh for too long.
- Cache keyed only by static string without role/user separation.

## Implementation Tasks

1. Decide after Phase 02 whether dashboard sections are RSC-only or SWR-backed.
2. If RSC-only:
   - Keep realtime `router.refresh()`.
   - Avoid persistent cache for volatile sections, or use very short TTL.
3. If SWR-backed:
   - Add dashboard section cache keys in `lib/swr.ts`.
   - Pass exact keys/prefixes to `RealtimeSync`.
   - Mutate only affected section keys instead of full route refresh.
4. Run manual checks:
   - create/update contract changes KPI/list after refresh
   - payment changes revenue/debt/reminders
   - payment plan changes reminders
   - schedule/task/event changes upcoming list

## Release Gate

Must pass:
- `npm run lint`
- `npx tsc --noEmit --pretty false`
- `npm run build`
- `npm run verify:dashboard`
- `npm run smoke:dashboard`
- Production smoke after deploy if requested

## Result

- Added `DASHBOARD_CRITICAL_CACHE_TAG` to the short critical dashboard cache.
- Added `app/actions/dashboard-cache.ts` to invalidate the dashboard tag and `/dashboard` path.
- Replaced raw dashboard `RealtimeSync` usage with `DashboardRealtimeRefresh`, which invalidates cache before route refresh.
- Local release gate passed:
  - `npm run lint`
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
  - `npm run verify:dashboard`
  - `npm run smoke:dashboard`

## Rollback Plan

If streaming/refactor causes issues:
- Keep old `getDashboardBootstrap()` as a temporary compatibility wrapper.
- Revert page to single bootstrap render while keeping timing instrumentation.
- Do not roll back login immediate feedback.
