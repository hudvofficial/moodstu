# Phase 03: Time-Load, SSR Hydration, Stats, and Query Performance
**Status:** Completed
**Priority:** P1
**Target score impact:** 8.9 -> 9.3

## Goal

Make `/employees` load useful data immediately, avoid misleading empty states, and keep list/stats queries fast as data grows.

## Work Items

1. SSR hydrate `/employees`:
   - Read validated `searchParams` on the server.
   - Fetch list and stats in parallel.
   - Pass initial list/stats into `EmployeeListPage`.
2. Tighten SWR behavior:
   - Use fallback data from SSR.
   - Avoid duplicate mount refetch when SSR data is fresh.
   - Keep previous data during filter/page changes.
3. Make failures visible:
   - Throw or render explicit load errors for list/stats action failures.
   - Do not convert fetch failures into empty employee success states.
4. Review list query payload:
   - Keep list projection slim.
   - Keep detail-only fields out of the list.
   - Ensure search/status/role/department filters are server-side.
5. Verify DB support:
   - Indexes for active rows, search, department, role, status, and created/updated sort.
   - Stats use RPC/aggregate, not full-table Node scans.
6. Keep `/employees` app route chunk under budget.

## Acceptance Criteria

- First page render includes list and stats data without waiting for client-only fetch.
- List and stats load failures are visible and actionable.
- Search/filter/sort/page state stays consistent between URL, SSR, and SWR keys.
- List action does not ship salary or unnecessary PII fields.
- `npm run perf:chunks` reports `/employees` under 80KB, target <=45KB.

## Verification

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run perf:audit
npm run perf:chunks
```

## Notes

- Do not optimize by hiding data correctness errors. A fast incorrect empty state is a regression.
- If `npm run build` conflicts with the running dev server, record the blocker and rerun when the dev server is stopped.
