# Phase 04: Time-Load, Query, SSR, and Performance
**Status:** Completed
**Priority:** P1
**Target score impact:** 9.0 -> 9.4

## Goal

Improve first useful load and query scalability after security and correctness are stable.

## Work Items

1. SSR-hydrate `/dresses`:
   - initial list
   - initial stats
   - initial filters/search params.
2. SSR-hydrate or server-prefetch `/dresses/rentals` where practical.
3. Implement database-backed list query/RPC:
   - status filter
   - category filter
   - search
   - sort
   - pagination
   - total count.
4. Implement sort behavior currently exposed by UI:
   - newest
   - price ascending
   - price descending
   - name ascending.
5. Move stats to SQL aggregate:
   - total
   - available
   - rented/reserved
   - maintenance/cleaning
   - relevant financial/rental summaries if displayed.
6. Cap and validate rental query inputs:
   - max page size
   - allowed status values
   - sanitized search
   - bounded date ranges.
7. Keep heavy detail history paginated or aggregated.
8. Preserve code splitting for QR/scanner/camera flows.

## Acceptance Criteria

- First render does not wait for client JS plus server action round trips for normal list/stats.
- Stats do not fetch every dress row into Node.
- Sort controls visibly affect result order.
- Page size and search cannot create unbounded or expensive requests.
- `/dresses` route chunk stays under 80KB and target remains <=55KB.
- `npm run perf:chunks` has no route-budget failures.

## Verification

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run perf:audit
npm run build
npm run perf:chunks
```

Targeted checks:

```powershell
rg -n "initial.*Dress|dress_stats|fetchDressList|sort|pageSize|limit" app components lib supabase
```

## Notes

- Do not optimize by widening table grants or moving sensitive reads to the client.
- Performance changes should preserve the Phase 00 permission boundary.
