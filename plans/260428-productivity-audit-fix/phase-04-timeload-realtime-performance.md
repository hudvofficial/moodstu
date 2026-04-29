# Phase 04: Time-Load, Realtime, and UI Performance
**Status:** Completed
**Priority:** P2
**Dependencies:** Phase 03
**Audit issues:** Warning 5, performance suggestions

## Objective

Reduce unnecessary revalidation and keep `/productivity` fast under normal multi-user activity.

## Target Files

- `components/productivity/productivity-realtime.tsx`
- `lib/hooks/use-productivity.ts`
- `components/productivity/productivity-page-client.tsx`
- `components/productivity/productivity-toolbar.tsx`
- Optional extracted client state hook/component

## Implementation Steps

1. Narrow realtime subscriptions.
   - Keep overview subscription to relevant productivity tables.
   - For detail drawer, filter by selected contract/employee where practical.
   - Prefer prefix invalidation for broad table changes instead of multiple unrelated subscriptions.

2. Tune SWR behavior.
   - Keep overview SSR fallback with `revalidateOnMount: false`.
   - Detail data should not keep previous employee data.
   - Consider longer `dedupingInterval` if realtime and explicit mutation invalidation are reliable.

3. Reduce client orchestrator complexity.
   - `productivity-page-client.tsx` is ~372 lines.
   - Extract period/sort/filter toolbar or `useProductivityPageState` if it reduces real complexity.

4. Check mobile/desktop layout stability.
   - Ensure table/card rows do not shift when values update.
   - Keep cards/buttons text inside container on small screens.

5. Recheck route chunk.
   - Keep `/productivity` under 80KB.
   - If chunk grows, dynamic-load the detail drawer/content.

## Acceptance Criteria

- Unrelated customer/contract changes do not cause excessive productivity refreshes.
- Detail drawer remains responsive and correct.
- `/productivity` route chunk stays under 80KB.
- Performance audit passes.

## Test Commands

```powershell
npm run perf:audit
npm run perf:chunks
npm run build
npx tsc --noEmit --pretty false
```

---
Next Phase: [Phase 05 - E2E/Smoke Verification and Final Score](./phase-05-e2e-smoke-final-score.md)
