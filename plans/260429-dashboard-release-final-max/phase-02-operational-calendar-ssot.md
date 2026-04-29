# Phase 02 - Operational Calendar SSOT

## Objective

Make dashboard upcoming work represent real studio operations, not only contract event rows.

## Tasks

1. Build a dashboard upcoming-work aggregator.
2. Merge these sources:
   - `contract_events` for contract milestones
   - `schedules` for assigned calendar events
   - `work_tasks` for operational deadlines
3. Apply role visibility:
   - admin/manager: all studio upcoming work
   - sale: contract-facing events and assigned/owned work if ownership is available
   - media: assigned schedules/tasks only
   - viewer: no operational list
4. Exclude cancelled/deleted records:
   - deleted contracts
   - cancelled contracts
   - cancelled events/tasks where status supports it
5. Normalize rows into one `UpcomingEventData` shape with:
   - stable id/source key
   - display date
   - customer/contract context
   - responsible employee where available
   - link target
6. Deduplicate when a schedule/task mirrors the same contract event.
7. Sort by nearest actionable date.

## Acceptance Criteria

- Manager dashboard sees contract events, manual schedules, and task deadlines in one upcoming list.
- Media dashboard sees assigned operational work without unrelated finance/contract rollups.
- Cancelled/deleted rows do not appear.
- Empty state remains correct when there is no upcoming work.

## Status

Completed.

Implementation:

- `lib/api/dashboard.ts` now aggregates upcoming work from `contract_events`, `schedules`, and `work_tasks`.
- Admin/manager see studio upcoming work; restricted roles keep role-scoped visibility.
- Cancelled/deleted contract work is filtered out before display.
- Upcoming rows expose explicit source labels so the widget can show where each item came from.

Verification:

- `npm run smoke:dashboard` seeds and reads all three upcoming-work sources.
- `npm run verify:dashboard` checks source coverage.
