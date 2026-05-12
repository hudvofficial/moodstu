# Phase 01 - Access Control and Date Windows

Status: Planned  
Risk: High  
Goal: Fix correctness and data-safety before more speed work.

## Work

1. Harden calendar auth:
   - `requireCalendarAccess()` must enforce active employee state.
   - If employees support soft-delete, also reject deleted employees.
   - Apply the same rule to helper paths used by schedule/task actions.
2. Fix availability visibility:
   - `checkEmployeeAvailability()` must not force global-admin access.
   - Self-check is allowed.
   - Other-employee checks require the same role policy as create/edit assignment.
3. Use exclusive end windows:
   - Replace inclusive `<= endDate` and `.lte(endDate)` calendar windows with `[startDate, endExclusive)`.
   - Apply to RPC, fallback REST queries, Google linked-id queries, and any window-based smoke tests.
4. Enforce calendar view scope:
   - If non-admin users should only see own data, filter server-side before returning rows.
   - If global view is intended, document it and keep edit restrictions separate.
5. Add negative tests:
   - Disabled employee cannot call calendar server actions.
   - Non-authorized user cannot inspect another employee's conflicts.
   - End-window boundary event is included correctly.

## Files Likely Touched

- `lib/calendar-auth.ts`
- `app/actions/calendar-queries.ts`
- `app/actions/calendar-mutations.ts`
- `app/actions/calendar-task-actions.ts`
- `supabase/migrations/*calendar*`
- `scripts/smoke-calendar.mjs`

## Exit Gate

- Authorization failures are enforced server-side, not just in UI.
- Month boundary tests pass for same-day, final-day, and multi-day records.

