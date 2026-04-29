# Phase 05: Realtime, Cache, Errors, and Copy
**Status:** Completed
**Priority:** P2
**Target score impact:** 9.4 -> 9.6

## Goal

Make the UI reliable under data changes, make failures visible, and clean up visible Vietnamese copy issues.

## Work Items

1. Narrow realtime invalidation:
   - debounce updates
   - mutate only affected list/detail/stat keys where possible
   - avoid revalidating every cache for unrelated row changes.
2. Surface read failures:
   - list error state
   - stats error state
   - detail drawer error state
   - rental list error state.
3. Fix corrupted Vietnamese copy:
   - `lib/validations/dress.schema.ts`
   - any `/dresses` labels, placeholders, toasts, and validation messages found by targeted search.
4. Remove or use unused variables:
   - current known warning: `app/actions/dress-mutations.ts` unused `contractId`.
5. Align search parameter naming:
   - prefer global `q` where the app already uses header search
   - keep backward compatibility with `search` only if needed.
6. Add role-aware UI affordances:
   - hide/disable destructive catalog actions for sale users if Phase 00 policy restricts them
   - show real permission errors on blocked actions.

## Acceptance Criteria

- Permission/RLS/read failures are not shown as "empty list" or zero stats.
- Realtime updates do not trigger broad immediate reloads for unrelated events.
- Vietnamese text is accented and not corrupted.
- Lint no longer reports dresses-specific unused-variable warnings.
- UI controls match actual role permissions.

## Verification

```powershell
npx tsc --noEmit --pretty false
npm run lint
rg -n "khong|Khong|dang|Dang|ten|ma|mo ta|contractId|mutate\\(" app components lib hooks
```

## Notes

- Keep copy changes scoped to visible `/dresses` surfaces unless the same corrupted string is shared.
- Do not add explanatory text blocks to the UI; use standard error/toast patterns already used in the app.
