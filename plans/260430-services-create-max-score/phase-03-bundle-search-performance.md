# Phase 03: Bundle Search Payload and Interaction Perf
**Status:** Completed  
**Priority:** P1  
**Dependencies:** Phase 02  
**Score impact:** 9.45 -> 9.6

## Objective

Make bundle service search lightweight, responsive, and predictable.

## Target Files

- `app/actions/service-queries.ts`
- `components/services/form/hooks/useServiceSearch.ts`
- `components/services/form/ServiceBundleSection.tsx`
- `components/services/builder/BuilderMode.tsx` if lazy loading is needed

## Implementation Steps

1. Use a narrow search action.
   - Use or refine `searchServicesForBundle(query, excludeId?)`.
   - Select only fields required by bundle UI.
   - Limit to 20.
   - Filter active, non-deleted, `single` services.

2. Update `useServiceSearch`.
   - Stop calling broad `getServices` for bundle lookup.
   - Keep debounce.
   - Clear results below 2 characters.
   - Ignore stale responses.
   - Return `isSearching` and `hasSearched`.

3. Update dropdown UX.
   - Stable dropdown height.
   - Loading row.
   - Empty row after search completes.
   - Error row or toast for search failures.

4. Check route chunk impact.
   - If builder code pushes create/edit chunks close to budget, dynamic import `BuilderMode` behind toggle.

## Acceptance Criteria

- Bundle search payload is narrow.
- UI does not flicker or show stale results.
- Empty/loading states are clear.
- App route chunks remain under 80KB.

## Verification

```powershell
npm run perf:audit
npm run build
npm run perf:chunks
```

Manual:

- Type 1 char: no request/results.
- Type 2+ chars: loading then results.
- Fast typing: no stale older results displayed.
- No-result query: empty state.
