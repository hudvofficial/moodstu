# Phase 03: Auth and Shell Hot Path
Status: Done Locally

## Objective
Measure and reduce auth/context cost on the login-to-dashboard path without weakening disabled-account or role checks.

## Current Shape
- Middleware calls `supabase.auth.getClaims()` to guard protected routes.
- Protected layout calls `getAuthenticatedUserContext()`.
- `getAuthenticatedUserContext()` calls claims again, then loads employee context with the admin client.
- The employee lookup has indexes in migrations, but remote latency still appears in baseline timings.

## Implementation Tasks
1. Add optional timing labels around:
   - middleware claims
   - layout auth context
   - `getClaimsUser()`
   - employee context lookup
2. Confirm whether middleware and layout claims are both needed for every request.
3. Evaluate safe reductions:
   - keep middleware as coarse redirect only
   - keep layout as source of shell role/name/disabled status
   - avoid `auth.getUser()` except `bootstrapProfile: true`
   - narrow employee selected columns only if shell does not need all fields
4. Confirm `idx_employees_auth_user_id` or unique equivalent exists in deployed DB before adding any new index.
5. If employee context is still slow after indexes are confirmed, consider a small `auth_user_context` RPC that returns only shell fields.

## Acceptance Criteria
- Timings distinguish proxy/auth slowness from dashboard data slowness.
- Disabled employee redirect still works.
- Shell `role` and `userName` remain correct.
- No route becomes login-only when it should enforce module role checks.

## Verification
- Login as at least one active account and one disabled account if test data exists.
- `AUTH_LOGIN_PROFILE=1` and dashboard auth timing enabled.
- `npm run verify:dashboard`.

## Result
- Middleware still performs the protected-route `supabase.auth.getClaims()` guard.
- Verified claims are now forwarded through internal proxy headers and consumed by `getClaimsUser()` to avoid a second Supabase claims request on protected page render.
- Added `AUTH_CONTEXT_PROFILE=1` timing for middleware claims, claims source, employee context lookup, and full auth context.
- Kept disabled employee enforcement in protected layout and kept employee lookup as the shell source of truth.
- Confirmed deployed migrations include employee `auth_user_id` indexes, so no speculative index was added.

## Risks
- Middleware cannot safely trust client-modifiable data.
- Removing layout employee lookup would break disabled-account enforcement unless replaced by an equivalent server-side source.
