# Phase 00 - Contract Freeze and Baseline

Status: Planned  
Risk: Medium  
Goal: Define the expected behavior before changing internals, so performance optimizations cannot accidentally rewrite product logic.

## Decisions To Freeze

1. Calendar visibility:
   - Can all calendar-enabled employees view all employee schedules/tasks?
   - Or should non-admin users only see their own records?
2. Calendar edit rights:
   - Which roles can create schedules for another employee?
   - Which roles can drag/drop another employee's schedule or task?
3. Task date source:
   - `deadline` anchors deadline-driven tasks.
   - `start_date` anchors scheduled work without a deadline.
   - Drag/drop must update the same source field that rendered the task.
4. Schedule date source:
   - `event_date` is the start date.
   - `end_date` preserves multi-day duration.
   - Drag/drop must preserve duration server-side.
5. Google sync:
   - Decide whether it is best-effort with warning, transactional where possible, or backed by a retry/orphan-cleanup queue.

## Baseline Measurements

Capture current numbers before Phase 01:

- Authenticated `/calendar` first paint and data-ready timing.
- RPC timing for current month, previous/next month, and heavy month.
- REST fallback timing.
- Google linked-id fetch timing.
- Google event fetch timing when the user is connected.
- Realtime revalidation count after one schedule change.

## Deliverables

- A short contract note in this plan folder.
- Baseline timing output copied into the phase file or a companion log.
- A fixture matrix for roles and event types.

## Exit Gate

- Product behavior is explicit enough that Phase 01 can implement server-side checks without guessing.

