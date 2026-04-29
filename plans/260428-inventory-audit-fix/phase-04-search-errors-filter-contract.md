# Phase 04: Search UX, Error Surfacing, and Filter Contract
**Status:** Completed
**Priority:** P2
**Target score impact:** 9.5 -> 9.6

## Goal

Close visible UX and operational clarity gaps.

## Work Items

1. Wire inventory search:
   - Add search input in inventory filters or connect the app shell search to `setSearch`.
   - Debounce input.
   - Reset page to 1 on search change.
2. Decide low/out-stock filter contract:
   - Either implement `low_stock` and `out_of_stock` statuses in filter UI/action, or remove stale contract comments.
   - Prefer implementation if it fits current UX.
3. Improve read error handling:
   - Stop turning permission/data failures into empty inventory states where feasible.
   - Return typed failures for list/detail/stats/history.
   - Show actionable UI error and retry.
4. Add filter input validation:
   - Zod schema for list filters, transaction filters, picker filters.
   - Cap search length, page, limit, date ranges.
5. Update audit report with user-visible behavior changes.

## Acceptance Criteria

- Users can search inventory by name/code from `/inventory`.
- Low-stock and out-of-stock filter behavior matches the hook/UI/server contract.
- Server/data failures are visible as errors, not fake zero counts.
- Bad filter inputs cannot cause unbounded queries.

## Verification

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run perf:audit
```

## Notes

- Keep filter UI compact; this is an operational module, not a marketing page.
- Avoid adding a new global search system unless current shell search already has a clear integration point.
