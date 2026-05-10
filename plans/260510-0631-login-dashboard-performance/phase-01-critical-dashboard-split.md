# Phase 01: Critical Dashboard Split
Status: Done

## Objective
Make login prewarm only the data required for a useful first dashboard paint. Do not make login wait for charts, reminders, or event lists.

## Proposed Data Shape

Create these server data contracts in `lib/api/dashboard.ts`:

- `DashboardCriticalData`
  - `access`
  - `period`
  - `kpis`
  - `errors`

- `DashboardDeferredData`
  - `revenueChart`
  - `serviceBreakdown`
  - `upcomingEvents`
  - `paymentReminders`
  - section-level `errors`

## Implementation Tasks

1. Extract `getDashboardCritical()` from `getDashboardBootstrap()`.
2. Move only `queryKpis()` into the critical loader.
3. Keep `requireDashboardAccess()` shared and cached per request.
4. Replace `prewarmDashboardBootstrap()` with `prewarmDashboardCritical()`.
5. Update `app/actions/auth.ts` to await `prewarmDashboardCritical()` after successful auth.
6. Keep the existing full bootstrap temporarily for compatibility, then remove after Phase 02.

## UX Contract

After login:
- The user should land on `/dashboard` with app shell, quick access, and KPI cards ready.
- Heavy sections may still show local skeletons.
- Login should not be delayed by revenue chart, service chart, upcoming events, or payment reminders.

## Acceptance Criteria

- Login success path no longer awaits the full dashboard bundle.
- KPI cards are warm immediately after redirect.
- `npm run lint`, `tsc`, `build`, and `verify:dashboard` pass.

## Result

- Added `DashboardCriticalData` and critical loader in `lib/api/dashboard.ts`.
- Added `prewarmDashboardCritical()` and wired login success to it.
- Deferred chart/list sections no longer block login prewarm.

## Risk

- If KPI query itself is slow, login can still feel slow. Phase 03 will profile this before deciding on RPC/aggregate SQL.
