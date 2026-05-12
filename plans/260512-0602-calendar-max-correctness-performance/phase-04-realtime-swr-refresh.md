# Phase 04 - Realtime and SWR Refresh Budget

Status: Planned  
Risk: Medium  
Goal: Revalidate exactly the data that changed without causing unrelated loading spikes.

## Work

1. Narrow SWR invalidation:
   - Replace broad `prefixes: "calendar"` invalidation with exact current month keys where practical.
   - Do not refresh `calendar-google` on every internal schedule/task change unless Google-linked data is affected.
2. Review `lib/swr.ts` prefix matching:
   - Ensure namespace matching cannot accidentally include unrelated keys such as `calendar-google`.
   - Add a small unit-level check or script assertion if possible.
3. Consolidate realtime where useful:
   - Consider one channel for schedule/task changes instead of separate duplicate auth/session setup.
   - Keep this secondary to correctness.
4. Mutation and realtime coordination:
   - Mutation-triggered `mutate()` and realtime-triggered revalidation should not double-fetch more than needed.
   - Keep optimistic UI only where rollback is safe.

## Files Likely Touched

- `hooks/use-calendar-data.ts`
- `lib/swr.ts`
- `app/(protected)/calendar/page.tsx`
- Calendar mutation call sites

## Exit Gate

- One schedule/task update causes the expected month cache to refresh.
- Google event cache is not refreshed by unrelated internal updates.
- UI still reflects mutation results promptly.

