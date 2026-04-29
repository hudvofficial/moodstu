# Phase 03: Google Calendar Load Split and Failure Isolation
**Status:** Completed
**Priority:** P1
**Target score impact:** 9.3 -> 9.5

## Goal

Make internal calendar load independent from Google Calendar latency or failures.

## Work Items

1. Split internal DB events and Google events into separate server actions or separate SWR keys.
2. Render internal schedules/tasks as soon as DB fetch completes.
3. Load Google events as an additive layer with its own loading/error state.
4. Add a short timeout or resilient failure path for Google fetch.
5. Cache primary calendar default color or avoid repeated metadata calls.
6. Preserve dedupe against Mood-created Google-linked schedules.
7. Keep imported Google events read-only in UI and server action policy.

## Acceptance Criteria

- `/calendar` internal month view renders if Google API is slow or unavailable.
- Google failures are visible but non-blocking.
- Google linked local schedules do not duplicate with imported Google events.
- No access token or Google auth payload reaches the browser.

## Verification

```powershell
npm run verify:calendar
npm run perf:audit
npm run build
```

## Notes

- Internal events now come from `fetchCalendarEvents`.
- Google events now load separately through `fetchCalendarGoogleEvents` and `cacheKeys.calendarGoogle`.
