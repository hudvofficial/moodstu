# Phase 02: Realtime Freshness and SWR Cache Correctness
**Status:** Completed
**Priority:** P1
**Target score impact:** 9.1 -> 9.3

## Goal

Keep open calendar views fresh when another user changes schedules or work tasks.

## Work Items

1. Add scoped realtime subscriptions for `schedules` and `work_tasks`.
2. Debounce remote invalidations so bulk task updates do not stampede `fetchCalendarEvents`.
3. Keep local optimistic refresh after current-user mutations.
4. Revalidate the active calendar month only, not unrelated months.
5. Confirm focus/reconnect behavior does not hide stale data after network recovery.
6. Add smoke coverage for two-client freshness if feasible, or script-level mutation plus SWR refresh assertions.

## Acceptance Criteria

- Creating/updating/deleting a schedule in one browser refreshes another open calendar.
- Updating task deadline/status/assignment refreshes another open calendar.
- Realtime does not cause duplicate reload loops.
- Google event refresh is not forced for every internal DB change.

## Verification

```powershell
npm run smoke:calendar
npx eslint components/calendar hooks/use-calendar-data.ts
npm run build
```

## Notes

- `schedules` and `work_tasks` realtime invalidates the calendar SWR namespace with debounce.
- Remaining 9.8 proof requires two-browser E2E freshness coverage.
