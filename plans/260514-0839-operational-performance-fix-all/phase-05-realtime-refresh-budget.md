# Phase 05: Realtime Refresh Budget
Status: Completed
Priority: P1

## Objective
Reduce realtime-triggered full refreshes and eliminate broad dashboard route refresh when possible.

## Files
- `components/contracts/detail/contract-detail-client.tsx`
- `components/contracts/contracts-list-client.tsx`
- `components/dashboard/dashboard-realtime-refresh.tsx`
- `hooks/use-realtime-multi.ts`
- `scripts/perf-audit.mjs`

## Tasks
1. For contract detail, patch common realtime payloads:
   - checklist update
   - work task insert/update/delete
   - contract event insert/update/delete
   - payment insert/delete where enough payload exists
2. Fall back to detail revalidation only for complex or incomplete payloads.
3. Increase debounce for bursty cross-table writes where safe.
4. Replace dashboard `router.refresh()` with section/cache invalidation where possible.
5. Update `perf:audit` only after the broad refresh is removed or justified.

## Acceptance Criteria
- `npm run perf:audit` passes.
- One payment write does not cause repeated full dashboard refreshes.
- One task update does not reload full contract detail if payload can patch UI.

## Result
- Dashboard realtime no longer calls broad `router.refresh()`.
- Contract detail realtime patches checklist updates, contract event insert/update/delete, and work task update/delete payloads when row data is sufficient.
- Payloads that are incomplete or complex still fall back to one debounced detail cache revalidation.
- `npm run perf:audit` passes.
