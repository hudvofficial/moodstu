# Phase 01: RBAC, Server Invariants, and Action Contracts
**Status:** Completed
**Priority:** P0
**Target score impact:** 8.7 -> 9.1

## Goal

Make every calendar server action enforce one shared, explicit permission contract while preserving the calendar business policy.

## Work Items

1. Add shared helpers:
   - `requireCalendarAccess`.
   - `requireCalendarWriteAccess`.
   - `requireCalendarScheduleOwnerOrManager`.
   - `requireCalendarTaskOwnerOrManager`.
2. Replace repeated employee/role lookup blocks in calendar actions with the helpers.
3. Validate target employees before assignment/create/update:
   - target employee exists.
   - target employee is active.
   - non-admin/non-manager target is self.
4. Convert `.single()` record lookups that can throw into explicit not-found handling.
5. Add action-level tests or `verify:calendar` checks for:
   - viewer denied.
   - sale/media own-only writes.
   - admin/manager team writes.
   - Google source drag denied.
   - invalid date order denied.
6. Confirm no direct action path can update a Google imported event.

## Acceptance Criteria

- Calendar actions do not duplicate role-check logic.
- Every admin-client read/write action has an explicit calendar permission boundary.
- Non-global roles cannot mutate another employee schedule/task through direct action calls.
- Not-found and permission errors are deterministic and user-readable.

## Verification

```powershell
npm run verify:calendar
npx eslint app/actions/calendar-queries.ts app/actions/calendar-mutations.ts app/actions/calendar-task-actions.ts lib/auth_utils.ts
npx tsc --noEmit --pretty false
```

## Notes

- Implemented with `lib/calendar-auth.ts`.
- Target employee active-state validation is enforced before assignment and schedule owner changes.
