# Phase 01: Detail Correctness and Stale Data Fix
**Status:** Completed
**Priority:** P0
**Dependencies:** Phase 00
**Audit issues:** Critical 2

## Objective

Guarantee that the detail drawer/self detail view never shows a previous employee's task details under the currently selected employee.

## Target Files

- `lib/hooks/use-productivity.ts`
- `components/productivity/productivity-page-client.tsx`
- `components/productivity/productivity-detail-drawer.tsx`
- `components/productivity/productivity-detail-content.tsx`
- Optional targeted test or verification helper

## Implementation Steps

1. Change detail SWR behavior.
   - Disable `keepPreviousData` for employee detail, or use a selected-employee-aware wrapper that returns an empty/skeleton state until the matching key resolves.
   - Keep overview `keepPreviousData` if desired because it does not cross employee identity.

2. Add detail ownership guard in render.
   - Track the active `detailEmployeeId`.
   - Render `DetailSkeleton` when selected employee id and resolved detail key do not match.
   - Avoid passing stale `detailGroups` into `ProductivityDetailDrawer`.

3. Reset detail state on period changes.
   - Already resets `selectedEmployeeId` on period change; verify behavior remains correct.
   - Ensure self-mode period change does not use old-period `initialDetail`.

4. Improve error state.
   - Detail errors should identify that details failed for the selected employee without exposing raw internal RPC details.

## Acceptance Criteria

- Selecting employee A, then employee B, shows skeleton/empty state until B details load.
- Drawer title and task list always refer to the same employee.
- Self view does not show stale detail from previous period.
- TypeScript and lint pass.

## Test Commands

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run build
```

Manual smoke:

- Admin opens team view, selects employee A, then employee B quickly.
- Confirm B drawer never renders A contract/task rows.

---
Next Phase: [Phase 02 - RPC Contract Migration and Metric Basis](./phase-02-rpc-contract-migration-metric-basis.md)
