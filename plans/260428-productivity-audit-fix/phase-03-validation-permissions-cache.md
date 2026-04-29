# Phase 03: Validation, Permission Gates, and Cache Invalidation
**Status:** Completed
**Priority:** P1
**Dependencies:** Phase 02
**Audit issues:** Warnings 3, 6, 7

## Objective

Harden server-action boundaries and make productivity data update reliably after task changes, even when realtime is unavailable.

## Target Files

- `app/actions/productivity-actions.ts`
- `app/actions/task-assign-actions.ts`
- `app/actions/work-task-actions.ts`
- `app/actions/calendar-task-actions.ts`
- `lib/validations/productivity.schema.ts` (new)
- `lib/cache-invalidation.ts`
- `lib/swr.ts`

## Implementation Steps

1. Add productivity validation schema.
   - Validate `period` as `week | month | quarter`.
   - Validate detail `employeeId` as UUID.
   - Validate `startDate` and `endDate` as ISO dates.
   - Enforce `startDate <= endDate`.
   - Cap detail date range to current business-supported maximum, ideally 120 days or quarter length.

2. Apply validation to actions.
   - `fetchProductivityData(period)` should parse period.
   - `fetchEmployeeJobDetails(employeeId, startDate, endDate)` should parse and normalize inputs before RPC.

3. Add permission gates to task mutation actions.
   - `assignTask`, `updateTaskDeadline`, `updateTaskDetails`, and availability helpers should enforce an explicit module gate, not only `withAuth`.
   - Prefer existing `requireContractAccess` or a dedicated task/calendar access helper.

4. Add productivity cache invalidation.
   - After work task create/update/delete/status/assignment changes, invalidate:
     - `productivity`
     - `productivity-detail`
   - Use existing `revalidateByPrefixes` or central helper.

5. Keep audit logs.
   - Preserve current audit logging.
   - Log blocked invalid input and permission failures only through existing safe paths.

## Acceptance Criteria

- Invalid detail range/UUID cannot reach RPC.
- Authenticated users without task management permission cannot mutate work tasks through task assignment actions.
- Task mutations refresh productivity SWR caches even if realtime is disconnected.
- TypeScript, lint, build pass.

## Test Commands

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run build
npm run verify:productivity
```

Manual smoke:

- Manager updates task assignment/status; productivity page refreshes after mutation.
- Media user cannot mutate another employee's task through assignment actions.

---
Next Phase: [Phase 04 - Time-Load, Realtime, and UI Performance](./phase-04-timeload-realtime-performance.md)
