# Phase 02 - Task and Schedule Behavior Parity

Status: Planned  
Risk: High  
Goal: Make displayed calendar items mutate the same underlying fields that made them visible.

## Work

1. Fix task mapping:
   - Set `originalDateField: "deadline"` when `deadline` exists.
   - Set `originalDateField: "start_date"` when the task is displayed from `start_date`.
2. Fix task drag/drop:
   - Dragging a deadline task updates `deadline`.
   - Dragging a start-date task updates `start_date`.
   - Preserve task time fields if the app uses them.
3. Fix schedule drag/drop:
   - Derive old duration from DB `event_date` and `end_date`.
   - Preserve multi-day range without trusting client `oldDateIso`.
4. Review task editing drawer:
   - Editing a task should not silently discard the date field that anchored it.
   - If task times are not supported in UI, make the server contract explicit and tested.
5. Add parity smoke coverage:
   - Schedule same-day timed event.
   - Schedule all-day multi-day event.
   - Task with `deadline`.
   - Task with `start_date` and no `deadline`.
   - Drag/drop for each category.

## Files Likely Touched

- `app/actions/calendar-queries.ts`
- `app/actions/calendar-mutations.ts`
- `app/actions/calendar-task-actions.ts`
- `components/calendar/drawers/event-form-drawer.tsx`
- `components/calendar/events/draggable-event.tsx`
- `scripts/smoke-calendar.mjs`

## Exit Gate

- Calendar display and mutation semantics match for every event source.
- Drag/drop does not create hidden deadline/start-date drift.

