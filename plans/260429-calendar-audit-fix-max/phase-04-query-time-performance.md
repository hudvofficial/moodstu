# Phase 04: Query Shape, Time Windows, and Performance
**Status:** Completed
**Priority:** P1
**Target score impact:** 9.5 -> 9.6

## Goal

Keep month/week/day reads index-backed, timezone-safe, and scalable.

## Work Items

1. Centralize calendar date-window construction.
2. Use local day boundaries consistently for cells, availability, drag/drop, and filters.
3. Evaluate server-side employee/status filters for large month payloads.
4. Join or batch employee names without O(events * employees) client work.
5. Profile remote timing for:
   - internal month fetch.
   - filtered employee/status views.
   - availability checks.
6. Confirm indexes are used for:
   - `schedules.event_date`.
   - `schedules(employee_id, event_date)`.
   - `work_tasks.deadline`.
   - `work_tasks.start_date`.
   - `work_tasks(assigned_to, deadline)`.

## Acceptance Criteria

- Month fetch remains fast with realistic data volume.
- Availability checks remain index-backed.
- Date boundaries do not drift around timezone offset.
- Chunk size stays below app-route budget.

## Verification

```powershell
npm run perf:audit
npm run perf:chunks
npx supabase db push --dry-run
```

## Notes

- Calendar indexes from `20260429190000_calendar_audit_fix.sql` are pushed.
- Chunk budget passed after production build; `/calendar` route chunk is 54.1KB.
