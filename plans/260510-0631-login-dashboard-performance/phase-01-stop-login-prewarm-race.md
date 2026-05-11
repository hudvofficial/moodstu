# Phase 01: Stop Login Prewarm Race
Status: Done Locally

## Objective
Remove the artificial dashboard wait from the login success path. Login should navigate as soon as auth and cookies are done.

## Problem
`components/auth/login-page-client.tsx` currently:
1. calls `router.prefetch("/dashboard")`
2. starts `prewarmDashboardForNavigation()`
3. waits for either prewarm or 250ms
4. calls `router.replace("/dashboard")`

Because critical dashboard work often exceeds 250ms, this creates a common bad case: user waits 250ms, the prewarm continues or competes, and the real dashboard route still has to render.

## Implementation Tasks
1. Remove the awaited `Promise.race()` around `prewarmDashboardForNavigation()`.
2. Prefer one of these shapes:
   - simplest: remove dashboard prewarm from login entirely
   - acceptable bridge: start prewarm fire-and-forget after `router.replace`, with no awaited delay
3. Keep `router.prefetch("/dashboard")` only if it does not trigger extra server-action data work.
4. Keep error logging quiet and non-blocking if fire-and-forget prewarm remains.
5. Update `app/actions/dashboard-cache.ts` only if `prewarmDashboardForNavigation()` becomes unused.

## Acceptance Criteria
- Successful login no longer waits on dashboard prewarm.
- `DASHBOARD_PREWARM_BUDGET_MS` is removed or unused.
- Auth login profile shows no post-auth dashboard step.
- Navigation still lands on `/dashboard` correctly for admin, manager, sale, media, and viewer roles.

## Result
- Removed `prewarmDashboardForNavigation()` import and awaited `Promise.race()` from `components/auth/login-page-client.tsx`.
- Removed `DASHBOARD_PREWARM_BUDGET_MS` and the local `wait()` helper.
- Removed the now-unused `prewarmDashboardForNavigation()` server action from `app/actions/dashboard-cache.ts`.

## Verification
- Manual login with `AUTH_LOGIN_PROFILE=1`.
- Check browser Network: no duplicate dashboard server-action request before the actual dashboard navigation.
- Run `npm run verify:dashboard` after code changes.

## Risks
- Removing prewarm can expose the dashboard critical cost more clearly until Phase 02 lands. That is acceptable; Phase 01 removes false waiting and request contention.
