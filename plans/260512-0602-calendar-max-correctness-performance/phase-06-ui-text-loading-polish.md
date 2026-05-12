# Phase 06 - Calendar UX, Loading States, and Polish

Status: Planned  
Risk: High  
Goal: Make `/calendar` usable as a daily operating surface without hiding system state or changing behavior.

## Work

1. Product workflow audit:
   - Review the actual daily flows: find work, filter by employee/source/status, create schedule, edit task, drag/drop, resolve conflict, inspect Google sync state.
   - Identify where users need month, week, and day views to answer different questions.
   - Remove UI that looks decorative but does not help scanning or action.
2. Information architecture:
   - Make the first viewport prioritize calendar controls, current period, employee/source filters, and create action.
   - Keep filters compact but visible; do not bury operational filters behind vague controls.
   - Ensure source badges make schedules, tasks, contract events, and Google events distinguishable at a glance.
3. Month/week/day view design:
   - Month view: dense scanning, stable cell heights, clear overflow behavior, no card-in-card clutter.
   - Week view: stronger time/order reading, drag targets obvious, today/current range clear.
   - Day view: detailed queue with times, owner, source, status, and conflict indicators.
   - Switching views must preserve selected date, filters, and loaded data.
4. Drawer and action flow:
   - `EventFormDrawer` should have one reliable create/edit mental model.
   - Availability conflicts must be visible before save when relevant.
   - Task vs schedule editing must show the correct date source, matching Phase 02 behavior.
   - Google sync warnings must be visible without blocking internal calendar use.
5. Loading and error states:
   - Keep skeletons stable across desktop/mobile.
   - Avoid layout shifts in month/week/day views.
   - Show actionable error states when RPC/fallback/Google fails.
   - Internal calendar should render independently from slower Google data.
6. Timing UX:
   - Add profile markers for shell render, internal data ready, Google data ready, and realtime refresh.
   - Avoid full-page loading when only a filter/view changes and data is already available.
   - Keep optimistic states only where rollback is safe and understandable.
7. Mojibake sweep:
   - Scan calendar UI/actions for corrupted Vietnamese strings.
   - Fix action messages, labels, status text, and empty states.
   - Add a lightweight detector for common mojibake sequences if practical.
8. Drawer consolidation:
   - Reduce duplicated create/edit paths in `EventFormDrawer` only after behavior tests exist.
   - Preserve existing validation and role restrictions.
9. Accessibility and responsive pass:
   - Confirm icon buttons have labels/tooltips.
   - Ensure long customer/event text truncates cleanly.
   - Verify no text overlaps on mobile.
   - Keyboard focus must be visible in toolbar, cells, drawers, and menus.
10. Visual QA:
   - Capture desktop and mobile screenshots for month, week, day, loading, empty, error, and drawer states.
   - Check text overlap, click targets, overflow, and contrast.
   - Validate drag/drop affordance with Playwright or manual screenshot/video notes.

## Files Likely Touched

- `components/calendar/drawers/event-form-drawer.tsx`
- `components/calendar/views/month-grid.tsx`
- `components/calendar/views/week-grid.tsx`
- `components/calendar/views/day-view.tsx`
- `components/calendar/events/*.tsx`
- `components/calendar/filters/*.tsx`
- `hooks/use-calendar-data.ts`
- `app/actions/calendar-*.ts`
- `scripts/verify-calendar.mjs`
 - `scripts/smoke-calendar.mjs`

## Exit Gate

- Calendar text is readable and consistent.
- Month/week/day views support daily operation without confusing source/date semantics.
- Loading and error states do not mask correctness failures or make the app feel stuck.
- Desktop and mobile screenshots are visually stable.
- Timing markers show the internal calendar can render before slower Google data.
