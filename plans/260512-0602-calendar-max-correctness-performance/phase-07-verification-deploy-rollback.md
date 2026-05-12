# Phase 07 - Verification, Deploy, and Rollback

Status: Planned  
Risk: Medium  
Goal: Ship only after the full correctness and performance gate passes.

## Required Commands

Run before deploy:

```powershell
npm run lint
npm run type-check
npm run verify:calendar
npm run smoke:calendar
npm run build
```

Run DB/deploy steps only after local gates pass:

```powershell
npx supabase db push
npx vercel deploy --prod
```

## Manual Production Smoke

1. Login to production as an authorized calendar user.
2. Open `/calendar`.
3. Verify current month loads quickly without blank state.
4. Switch month/week/day views.
5. Create a same-day schedule.
6. Create or verify a multi-day schedule.
7. Verify task deadline and task start-date display.
8. Drag/drop one schedule and one task in a safe test record.
9. Verify role restrictions with a non-admin account if available.
10. Verify Google disconnected and connected states if available.

## Rollback Plan

1. If deploy fails before traffic cutover, keep previous production alias.
2. If app deploy breaks calendar UI, roll back to previous Vercel deployment.
3. If DB migration causes query issues:
   - Keep REST fallback active.
   - Ship a hotfix to bypass RPC while preserving server-side authorization.
4. If Google sync produces divergence:
   - Disable external sync path temporarily.
   - Keep internal schedule creation/editing active.

## Exit Gate

- Production `/calendar` passes manual smoke.
- Timings meet target:
  - Warm internal month data: under 250 ms server-side for normal month.
  - Cold internal month data: under 800 ms server-side for normal month.
  - UI data-ready after navigation: under 1.5 s on a normal authenticated session.
- Known remaining issues are documented and not P0/P1 correctness risks.

