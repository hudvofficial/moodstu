# Phase 02: Stop Duplicate Initial Fetches
Status: Completed
Priority: P0

## Objective
Prevent SSR-provided data from being fetched again immediately on client mount.

## Files
- `lib/hooks/use-contracts.ts`
- `app/(protected)/contracts/[id]/page.tsx`
- Possibly other hooks with the same fallback pattern

## Tasks
1. Add `revalidateOnMount: fallbackData ? false : undefined` to `useContractDetail()`.
2. Keep cache seeding effect so optimistic updates still have current data.
3. Audit other operational hooks for `fallbackData` without `revalidateOnMount: false`.
4. Add verification by profiling action call counts during `/contracts/[id]` navigation.

## Acceptance Criteria
- On SSR detail navigation, `getContractDetail()` is not immediately called twice.
- Manual refresh still gets fresh data.
- Realtime and explicit mutation invalidation still refresh detail when needed.

## Result
- Added `revalidateOnMount: fallbackData ? false : undefined` to `useContractDetail()`.
- Kept SWR fallback cache seeding so optimistic detail updates still have a base object.
- `useContracts()` and `useContractStats()` already had the same fallback mount guard.
