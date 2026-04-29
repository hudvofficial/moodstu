# Phase 04 - Realtime, Cache, and Performance

## Objective

Keep dashboard data fresh while preserving fast page load and stable rendering.

## Tasks

1. Define dashboard cache keys for all dashboard data segments.
2. Deduplicate server queries and client fetches.
3. Add realtime invalidation for source tables:
   - contracts
   - payments/receipts
   - schedules
   - work tasks
   - relevant finance tables
4. Keep chart-heavy client islands small and lazy where appropriate.
5. Verify dashboard warmup is bounded and does not waste requests.
6. Measure bundle and route performance after real data replacement.
7. Tune indexes only if query plans show a real need.

## Acceptance Criteria

- Updating a source record refreshes the affected dashboard widget.
- Initial page load does not overfetch duplicate data.
- Real data implementation does not introduce a major bundle regression.
- Build and performance checks pass after dashboard changes.

## Status

Completed.

Dashboard source tables trigger route refresh through realtime hooks. `dashboard:bootstrap` was added to cache namespaces, and performance/chunk checks passed after production build.
