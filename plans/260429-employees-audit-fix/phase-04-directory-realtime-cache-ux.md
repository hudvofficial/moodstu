# Phase 04: Directory Access, Realtime, Cache, and UX Safety
**Status:** Completed
**Priority:** P2
**Target score impact:** 9.3 -> 9.6

## Goal

Reduce secondary data exposure and polish operational UX without changing core employee-management scope.

## Work Items

1. Audit `getActiveEmployees()` usages:
   - Contracts
   - Calendar
   - CRM
   - Productivity/tasks
   - Prefetch and warmup hooks
2. Replace broad directory access with role-scoped, redacted reads:
   - Return only fields needed by each caller.
   - Avoid exposing phone/email/salary/profile data in picker paths.
   - Consider separate helpers for management list vs assignment picker.
3. Narrow realtime invalidation:
   - Debounce `employees` invalidation.
   - Invalidate list/detail/stats keys intentionally.
   - Avoid global employee cache reloads for unrelated updates where feasible.
4. Replace native confirms:
   - `components/employees/employee-detail-page.tsx`
   - `components/employees/employee-detail-drawer.tsx`
   - Use existing app `ConfirmDialog`/modal pattern.
5. Clean up Vietnamese copy for employee errors, stale update conflicts, and lifecycle warnings.

## Acceptance Criteria

- Employee assignment pickers remain functional in dependent modules.
- Picker actions expose only minimum safe employee fields.
- Realtime updates refresh the right employee views without broad cache churn.
- Destructive actions use app-native confirmation UI with clear Vietnamese copy.
- No new chunk-budget regression.

## Verification

```powershell
rg -n "getActiveEmployees|active-employees|RealtimeSync table=\"employees\"|window.confirm" app components hooks lib
npx tsc --noEmit --pretty false
npm run lint
npm run perf:chunks
```

## Notes

- Do not break assignment workflows just to tighten privacy. If a module needs employee names for assignment, keep a redacted picker path.
- Directory read policy should be explicit, not accidental through generic login.
