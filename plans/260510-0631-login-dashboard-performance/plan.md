# Plan: Login -> Dashboard Performance
Created: 2026-05-10T06:31+07:00
Status: In Progress

## Goal
Remove the "wait during login, then wait again on dashboard" experience without hiding real backend cost. The target is:

1. Login gives immediate feedback.
2. Dashboard lands with shell + KPI/critical data ready.
3. Heavy chart/list sections stream or hydrate separately.
4. Query-level slow spots are measured before adding DB/RPC changes.
5. Realtime freshness is preserved; no stale dashboard after contract/payment updates.

## Current Audit Snapshot

Files audited:
- `app/actions/auth.ts`
- `components/auth/login-page-client.tsx`
- `components/auth/login-transition.tsx`
- `app/(protected)/layout.tsx`
- `app/(protected)/dashboard/page.tsx`
- `app/(protected)/dashboard/loading.tsx`
- `lib/api/dashboard.ts`
- `components/dashboard/*`
- `components/shared/realtime-sync.tsx`
- `hooks/use-realtime.ts`
- `lib/swr.ts`
- `supabase/migrations/*performance*`, hot-path indexes

Observed current reality:
- Login UI already uses immediate `flushSync` loading feedback and a full-screen transition.
- Login server action already skips clean-path rate-limit DB precheck unless `login_attempt_hint` exists.
- Current working tree has a bridge optimization: login success calls `prewarmDashboardBootstrap()`.
- `/dashboard` is still a single async page that awaits `getDashboardBootstrap()` before rendering any card.
- `getDashboardBootstrap()` loads KPI, revenue chart, service breakdown, upcoming events, and payment reminders as one bundle.
- Admin/manager dashboard can trigger roughly 17 Supabase reads inside that bundle:
  - KPI: current/previous payments + receipts, debt rows, 4 contract count queries.
  - Revenue chart: payments + receipts over 6 months.
  - Service breakdown: monthly contracts.
  - Upcoming events: contract events, schedules, work tasks.
  - Payment reminders: payment plans + fallback contracts.
- Existing `/finance/dashboard` already uses a better local pattern: Suspense zones with independent async server components.
- Dashboard realtime currently mounts many `RealtimeSync` listeners without explicit SWR keys, so it falls back to `router.refresh()`.
- Short `unstable_cache` on full bootstrap improves post-login navigation, but can briefly mask realtime refreshes if used as the final architecture.
- Existing migrations already include many hot-path indexes for contracts, payments, receipts, payment_plans, schedules, and work_tasks. DB changes should be profile-driven, not speculative.

## Direction

Use the current prewarm as an interim bridge only. The real shape should be:

- Critical path: auth context + role visibility + KPI cards.
- Deferred path: charts, service distribution, upcoming events, payment reminders.
- Cache strategy: section-level and freshness-aware, not one full-page cache.
- Verification: lint/type/build plus dashboard verify/smoke and timing logs.

## Phases

| Phase | Name | Status | Main Outcome |
| --- | --- | --- | --- |
| 00 | Baseline & Audit Lock | Done | Current behavior and risks are documented before implementation. |
| 01 | Critical Dashboard Split | Done | Login prewarms only critical dashboard data instead of full dashboard bundle. |
| 02 | Deferred Dashboard Streaming | Done | `/dashboard` renders KPI immediately and streams charts/lists by section. |
| 03 | Section Timing & Query Profiling | Done | Measure each dashboard section in production-like flow. |
| 04 | DB/RPC Optimization, If Proven | Planned | Add aggregate RPC/index only where timing proves a bottleneck. |
| 05 | Realtime Freshness & Release Gate | Done Locally | Ensure route refresh/cache invalidation stays correct after updates. |

## Non-Goals

- No redesign of dashboard layout unless needed for skeleton/deferred sections.
- No DB migration until Phase 03 proves the exact slow query.
- No `git add .`; existing untracked docs/plans/migration stay out of this scope unless explicitly approved.
- No long-lived cache for volatile finance/contract dashboard data.

## Verification Commands

- `npm run lint`
- `npx tsc --noEmit --pretty false`
- `npm run build`
- `npm run verify:dashboard`
- `npm run smoke:dashboard`
- Optional after deploy: `npm run smoke:production`
