# Calendar Module Audit - 2026-04-27

Scope: `/calendar` production readiness audit for business rules, loading time, and performance.

## Summary
- Critical issues: 2
- Warnings: 5
- Suggestions: 3
- Verification: targeted `eslint`, `tsc --noEmit`, and `perf:audit` passed.
- Production build: `npm run build` timed out after 183s with `EPIPE`; stale chunk audit shows `/calendar` route at 58.2KB, below the 80KB app-route budget, but this must be confirmed after a successful fresh build.

## Post-Fix Status
- Critical issues fixed: task edit now routes to `updateCalendarTaskDetails`; schedule Google sync now writes local DB first, then best-effort links Google.
- UX/state fixes applied: `/calendar?date=` and `?view=` are read on initial state; mobile no longer exposes week/day pills while rendering month-only.
- Performance fixes applied: mobile month grid uses `eventsByDate`; employee names use a memoized lookup map; Google month fetch only calls CalendarList when at least one Google event has no per-event `colorId`, preserving the Google default-calendar color rule.
- Google external-event policy fixed: imported Google events are read-only in UI, and the unused server action that patched external Google event colors was removed.
- Verification after fixes: targeted `eslint` passed, `npx tsc --noEmit --pretty false` passed, `npm run perf:audit` passed, and `npm run build` passed in 111s after the Google color-rule correction.
- Fresh chunk result: `/calendar/page` is 59.2KB, below the 80KB app-route budget. `npm run perf:chunks` still exits non-zero because unrelated `contracts/[id]` is 82.8KB.

## Critical Issues

1. Task edit flow opens a schedule form and submits to the wrong mutation
   - Files: `components/calendar/drawers/event-form-drawer.tsx:234`, `components/calendar/drawers/event-form-drawer.tsx:139`, `app/actions/calendar-mutations.ts:210`
   - Current behavior: task events can show the "edit" button when editable, but submit calls `updateCalendarEvent`, which updates the `schedules` table.
   - Impact: editing a task from Calendar fails with "event not found" or gives users a broken edit path.
   - Required fix: either disable schedule-style editing for `source === "task"` or route task edits to `updateCalendarTaskDetails`.

2. Google sync can create external/orphan state before the local DB write succeeds
   - Files: `app/actions/calendar-mutations.ts:174`, `app/actions/calendar-mutations.ts:198`, `app/actions/calendar-mutations.ts:264`, `app/actions/calendar-mutations.ts:289`
   - Current behavior: create/update calls Google before the final `schedules` insert/update.
   - Impact: if DB write fails after Google succeeds, Google Calendar can contain an event that Mood Studio does not own or cannot map.
   - Required fix: write local DB first, then best-effort push to Google and persist `google_event_id`; for update, avoid mutating Google until the local update is guaranteed or add compensating rollback.

## Warnings

1. URL state is written but not read on initial load
   - Files: `hooks/use-calendar-data.ts:7`, `hooks/use-calendar-data.ts:8`, `hooks/use-calendar-data.ts:103`, `components/calendar/solar-lunar-converter.tsx:108`
   - Current behavior: the lunar/solar converter routes to `/calendar?date=YYYY-MM-DD`, and view mode is written to `?view=`, but `useCalendarData` always initializes `new Date()` and `"month"`.
   - Impact: deep links, converter navigation, and restored calendar view do not work reliably.

2. Mobile toolbar exposes week/day view, but mobile renderer always shows month grid
   - Files: `components/calendar/calendar-toolbar.tsx:190`, `components/calendar/calendar-wrapper.tsx:242`
   - Current behavior: mobile users can select "Week" or "Day", but the body still renders `MobileMonthGrid`.
   - Impact: confusing UX and URL/view state drift.
   - Fix option: hide week/day pills on mobile or implement mobile day/week views.

3. External Google events are not strictly read-only despite spec
   - Files: `components/calendar/drawers/event-form-drawer.tsx:239`, `components/calendar/drawers/event-form-drawer.tsx:313`, `app/actions/calendar-mutations.ts:358`
   - Current behavior: imported Google events allow color patching back to Google.
   - Impact: violates `docs/specs/calendar.md` read-only policy for imported Google events unless the policy has intentionally changed.
   - Decision needed: either update spec/product policy or remove this edit action.

4. Task time data is degraded to all-day cards
   - File: `app/actions/calendar-queries.ts:150`
   - Current behavior: tasks use `deadline || start_date` as `start`, `end_time` alone as `end`, and `allDay: true`.
   - Impact: on-set tasks with `start_time/end_time` cannot appear in correct day time sections; event detail can also format a bare `end_time` incorrectly.
   - Fix option: compose ISO start/end from date + `start_time/end_time` for on-set tasks, while keeping deadline tasks all-day.

5. Google fetch adds latency to first calendar load
   - Files: `app/actions/calendar-queries.ts:58`, `lib/googleCalendarService.ts:140`, `lib/googleCalendarService.ts:165`
   - Current behavior: DB fetches and Google fetch run in parallel, but `fetchCalendarEvents` waits for Google before returning. Google path can make two external HTTP calls: calendar metadata and events.
   - Impact: slow or rate-limited Google API increases perceived loading time for `/calendar`.
   - Fix option: return internal DB events first and hydrate Google events separately, or cache calendar default color so the monthly path uses one external call.

## Suggestions

1. Mobile grid should reuse `eventsByDate`
   - File: `components/calendar/views/mobile-month-grid.tsx:67`
   - Current behavior: each of 28-42 cells filters the full events array.
   - Impact: O(days * events) render cost on mobile.
   - Fix: pass `eventsByDate` into `MobileMonthGrid`, same as desktop.

2. Employee name mapping is O(events * employees)
   - File: `hooks/use-calendar-data.ts:43`
   - Current behavior: each event does `employeesData.find(...)`.
   - Fix: memoize `Map<employeeId, full_name>` once, then map O(events).

3. Fresh chunk audit still needs a successful build
   - Current stale result: `/calendar/page` chunk is 58.2KB, under the 80KB budget.
   - Caveat: `npm run perf:chunks` failed overall because an unrelated contracts detail chunk is 82.8KB. Re-run after build completes.

## Release Recommendation

`/calendar` is no longer blocked by the two critical issues from this audit. Remaining release note: `perf:chunks` still fails on an unrelated contract-detail route over budget, not on `/calendar`.
