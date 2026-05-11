# Phase 05: Cache, Realtime, and Client Budget
Status: Done Locally

## Objective
Preserve dashboard freshness while reducing unnecessary startup subscriptions, route refreshes, and warmup work after landing on `/dashboard`.

## Current Shape
- `DashboardRealtimeRefresh` subscribes to seven tables.
- Any change calls `invalidateDashboardCache()` and then `router.refresh()`.
- `invalidateDashboardCache()` invalidates the critical tag and `/dashboard`.
- `DashboardWarmup` prefetches `/contracts` and `/dresses` after 3 seconds.
- `NavigationWarmup` prefetches up to four allowed routes after 3 seconds and idle time.

## Implementation Tasks
1. Split cache tags by data scope if persistent caches remain:
   - `dashboard-critical`
   - `dashboard-revenue`
   - `dashboard-service-breakdown`
   - `dashboard-upcoming-events`
   - `dashboard-payment-reminders`
2. Map source tables to affected tags:
   - `payments`, `receipts`: critical, revenue, reminders where applicable
   - `contracts`: critical, service, upcoming, reminders
   - `payment_plans`: reminders
   - `contract_events`, `schedules`, `work_tasks`: upcoming
3. Replace seven independent realtime channels with one dashboard channel that registers multiple `postgres_changes` handlers, if Supabase client behavior supports it cleanly.
4. Debounce one refresh per burst and invalidate only affected tags before refresh.
5. Move dashboard and navigation warmups behind a stricter idle gate:
   - after first dashboard render
   - cancel on route change
   - skip on slow connection or low-power hints if available
6. Remove `DashboardWarmup` if it does not show measurable user benefit.

## Acceptance Criteria
- Updating a payment refreshes KPI/revenue/reminders.
- Updating a schedule/event/task refreshes upcoming events without invalidating unrelated caches.
- No stale dashboard after realtime changes.
- Initial dashboard load does not immediately create avoidable prefetch/data pressure.

## Result
- Replaced seven independent dashboard realtime hooks/channels with one `dashboard-realtime` channel that registers handlers for all dashboard source tables.
- Debounced realtime refreshes into one invalidation/refresh per burst.
- `invalidateDashboardCache(changedTables)` only invalidates the critical KPI tag for `contracts`, `payments`, and `receipts`; schedule/task/event changes still refresh the route without clearing critical KPI cache.
- Removed `DashboardWarmup` and its `/contracts` + `/dresses` startup prefetch.
- Left `NavigationWarmup` in place because it is already delayed/idle and `prewarmRouteData()` is disabled.

## Risks
- Fine-grained invalidation can miss dependencies. Keep the table-to-tag map documented in code.
- Too much client-side cleverness can be worse than one full refresh. Measure before and after.
