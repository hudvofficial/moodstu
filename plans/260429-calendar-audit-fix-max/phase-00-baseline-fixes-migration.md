# Phase 00: Baseline Fixes and Migration Push
**Status:** Completed
**Priority:** P0
**Target score impact:** 8.1 -> 8.7

## Goal

Close the immediate visible and server-invariant gaps found during the 2026-04-29 audit, then apply the supporting DB indexes remotely.

## Work Items

1. Replace raw enum title-casing in the status filter with calendar status display labels.
2. Add a calendar status label SSOT for task, schedule, cancelled, and Google statuses.
3. Reject schedule `end_date` values earlier than `event_date` in server validation.
4. Restrict calendar task status updates to the known task status enum.
5. Check employee availability using same-day ranges so timestamped rows are detected.
6. Add calendar hot-path indexes for schedule month fetch and employee/task availability checks.
7. Push the calendar migration to remote Supabase.

## Acceptance Criteria

- Status filter no longer renders `Hoan thanh`, `Dang lam`, `Chua lam`, or `Published`.
- Direct server-action schedule create/update rejects invalid date order.
- Availability check catches same-day timestamp rows.
- Remote Supabase migration list includes `20260429190000`.

## Verification

```powershell
npx eslint "app/(protected)/calendar" app/actions/calendar-queries.ts app/actions/calendar-mutations.ts app/actions/calendar-task-actions.ts components/calendar hooks/use-calendar-data.ts hooks/use-calendar-keyboard.ts lib/utils/calendar-utils.ts types/calendar.types.ts
npx tsc --noEmit --pretty false
npx supabase db push --dry-run
npx supabase db push
npm run perf:audit
npm run build
npm run perf:chunks
```

## Notes

- Completed before this plan was created.
- DB migration has been pushed to remote Supabase.
