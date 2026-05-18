# Phase 04: Scope Cache Invalidation
Status: Completed
Priority: P1

## Objective
Replace broad route revalidation after business mutations with the smallest safe invalidation set.

## Files
- `app/actions/contract-mutations.ts`
- `app/actions/payment-actions.ts`
- `app/actions/work-task-actions.ts`
- `app/actions/contract-event-actions.ts`
- `app/actions/printing-mutations.ts`
- `app/actions/dress-mutations.ts`
- `lib/cache-invalidation.ts`
- `app/actions/dashboard-cache.ts`

## Tasks
1. Categorize mutations by affected data:
   - contract shell
   - contract detail timeline/tasks
   - finance totals
   - dresses/rentals
   - dashboard critical KPIs
2. Replace repeated `revalidatePath()` sets with named invalidation helpers.
3. Avoid invalidating `/contracts` list when only a detail-only field changes.
4. Avoid invalidating finance routes for changes that do not affect money.
5. Add comments where broader invalidation is intentionally retained.

## Acceptance Criteria
- Each mutation has an explicit invalidation scope.
- No action blindly revalidates more than its domain without justification.
- Existing list/detail/dashboard correctness remains intact.

## Result
- Added `lib/server-cache-invalidation.ts`.
- Replaced direct invalidation sets in contract mutations, contract lifecycle, payments, work tasks, contract events, printing, and dresses with named scope helpers.
- Detail-only task/event operations no longer invalidate the whole contract list by default.
- Finance/dashboard invalidation is only requested from money/status paths that affect those views.
