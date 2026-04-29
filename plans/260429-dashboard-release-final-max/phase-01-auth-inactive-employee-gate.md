# Phase 01 - Auth and Inactive Employee Gate

## Objective

Prevent inactive or deleted employees from accessing the protected app, including `/dashboard`.

## Tasks

1. Harden `getAuthenticatedUserContext` or protected layout behavior so an inactive/deleted employee is not silently downgraded to viewer.
2. Preserve safe behavior for users that truly have no employee profile only if product policy allows automatic bootstrap.
3. Add an explicit error/redirect path for disabled employee accounts.
4. Reuse the same active employee rule in dashboard access.
5. Add verification coverage:
   - active employee can access dashboard
   - inactive employee cannot get protected context
   - deleted employee cannot get protected context
   - missing employee fallback behaves according to policy

## Acceptance Criteria

- Inactive/deleted employee cannot enter dashboard as viewer.
- No finance/contract/calendar dashboard data can be fetched under inactive employee identity.
- Existing active-role behavior remains unchanged.
- Verify script detects regression.

## Status

Completed.

Implementation:

- `lib/auth_utils.ts` now marks inactive/deleted employee contexts with `isEmployeeDisabled`.
- `app/(protected)/layout.tsx` redirects disabled employee accounts to `/account-disabled`.
- `app/account-disabled/page.tsx` gives the user a controlled blocked-account screen and logout action.
- `lib/supabase/middleware.ts` allows `/account-disabled` as a public route.

Verification:

- `npm run verify:dashboard` checks the disabled-account gate.
- Scoped eslint, typecheck, and production build passed.
