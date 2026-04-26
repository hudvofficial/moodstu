# Phase 03: Realtime + SWR Invalidation Control
Status: Complete
Priority: Medium

## Objective
Keep `/contracts` realtime fresh without refresh storms or unnecessary cache churn.

## Files
- `components/contracts/contracts-list-client.tsx`
- `components/contracts/detail/contract-detail-client.tsx`
- `lib/hooks/use-contracts.ts`

## Tasks
- [x] Add debounce/throttle for list-level realtime refresh.
- [x] Review `revalidateContractCaches()` scope.
- [x] Keep detail-only realtime using `revalidateContractDetailCaches()`.
- [x] Verify optimistic task updates do not immediately flicker from realtime echo.
- [x] Ensure stats refresh is deduped/slower than detail/list refresh.

## Test Criteria
- [ ] External contract update appears in list.
- [ ] External task/event update appears in detail.
- [ ] Rapid task changes do not trigger visible flicker.
- [x] TypeScript passes.
