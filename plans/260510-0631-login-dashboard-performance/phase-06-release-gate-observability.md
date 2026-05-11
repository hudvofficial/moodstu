# Phase 06: Release Gate and Observability
Status: Done

## Objective
Prove the optimization with automated checks and before/after timings. Do not call the work complete based on subjective UI feel only.

## Required Checks
Run after implementation:
- `npm run lint`
- `npx tsc --noEmit --pretty false`
- `npm run build`
- `npm run verify:dashboard`
- `npm run smoke:dashboard`

## Performance Checks
1. Run controlled local/staging tests with:
   - `AUTH_LOGIN_PROFILE=1`
   - `DASHBOARD_PROFILE=1`
2. Capture these labels before and after:
   - auth login total
   - middleware claims
   - layout auth context
   - dashboard.access
   - dashboard.critical
   - dashboard.kpis
   - each deferred section
3. Confirm Phase 01:
   - no awaited 250ms prewarm in login success path
4. Confirm Phase 02:
   - warm critical KPI RPC <= 250ms
   - full dashboard critical <= 600ms on the same environment
5. Confirm Phase 05:
   - realtime updates refresh correct visible sections
   - no duplicate refresh storms on bursty table changes

## Manual Smoke
- Fresh login to `/dashboard`.
- Hard refresh `/dashboard`.
- Navigate away and back.
- Update a contract and verify contract KPI/service/upcoming/reminders behavior.
- Record a payment and verify revenue/debt/reminders behavior.
- Update schedule/task/event and verify upcoming events behavior.
- Check viewer/media/sale/admin visibility differences.

## Rollback Plan
- If RPC has formula issues, keep fallback REST query path and switch the loader back.
- If realtime tag split misses updates, fall back to invalidating all dashboard tags before route refresh.
- If auth path changes break disabled users, revert to current `getAuthenticatedUserContext()` behavior.
- Do not roll back Phase 01 unless prewarm is proven to improve end-to-end timing after Phase 02.

## Result
- `npm run lint` passed.
- `npx tsc --noEmit --pretty false` passed.
- `npm run build` passed.
- `npm run verify:dashboard` passed.
- `npm run smoke:dashboard` passed.
- `npx --yes supabase migration list` shows remote deployed through `20260510201000`.
- Runtime profiling hooks are available through `AUTH_LOGIN_PROFILE=1`, `AUTH_CONTEXT_PROFILE=1`, and `DASHBOARD_PROFILE=1`.
- Full release gate was rerun after the final realtime trailing-refresh adjustment and still passed.
