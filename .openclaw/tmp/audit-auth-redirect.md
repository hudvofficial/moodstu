# Audit: Auth/Middleware Redirect Patterns Causing "Giut Ve Dashboard"

## Findings

### 1. `lib/supabase/middleware.ts` exists, but no root `middleware.ts` / `proxy.ts` was found
- File/line: `lib/supabase/middleware.ts:39` defines `updateSession(request: NextRequest)`.
- File/line: project root has no `middleware.ts`; search only found `lib/supabase/middleware.ts` plus package files.
- Why dangerous: Next.js middleware is only executed from the root middleware/proxy entrypoint. If this function is not re-exported from root, Supabase cookies are not refreshed on navigations, and the auth proxy headers (`x-mood-auth-*`) are never injected for protected layouts.
- Impact on symptom: protected route navigation relies on `app/(protected)/layout.tsx` and `app/(protected)/contracts/layout.tsx` reading cookies/claims directly. If cookies are stale or not refreshed, the layout can temporarily resolve `context === null` or a fallback role and redirect.

### 2. Contracts module layout redirects to `/dashboard` on any transient role/context mismatch
- File/line: `app/(protected)/contracts/layout.tsx:10` calls `getAuthenticatedUserContext()`.
- File/line: `app/(protected)/contracts/layout.tsx:12` redirects to `/login` if no context.
- File/line: `app/(protected)/contracts/layout.tsx:13` redirects to `/dashboard` if `!canAccess(context.shellRole, "contracts")`.
- Why dangerous: `getAuthenticatedUserContext()` defaults to claims-based user lookup, then employee lookup. If claims or employee/role data are temporarily unavailable, stale, or incomplete, `shellRole` may be normalized from missing metadata and `canAccess(..., "contracts")` can fail. That converts a recoverable auth/role timing issue into a hard navigation to `/dashboard`.
- Impact on symptom: this is the clearest direct source of "detail opens then snaps back to dashboard". It runs for both `/contracts` and `/contracts/[id]`, so a detail navigation can trigger it independently of the contract-detail fetch.

### 3. Auth context uses claims/header fast path without a verified-user fallback in normal protected layouts
- File/line: `lib/auth_utils.ts:170` defines `getClaimsUser()`.
- File/line: `lib/auth_utils.ts:171` first trusts auth proxy headers from middleware.
- File/line: `lib/auth_utils.ts:176` falls back to `supabase.auth.getClaims()`.
- File/line: `lib/auth_utils.ts:343` only calls `getVerifiedUser()` when `bootstrapProfile === true`.
- File/line: `lib/auth_utils.ts:344` otherwise returns `await getClaimsUser()`.
- Why dangerous: `getClaims()` is fast and usually good, but if proxy headers are missing because root middleware is absent, or if claims validation fails during token refresh, the protected layout gets `null` with no `getUser()` retry. For module authorization, missing role metadata can also degrade to a role that lacks contracts access.
- Impact on symptom: this can cause one redirect from the protected layout (`/login`) or from the contracts layout (`/dashboard`) during navigation. If React/Next performs parallel route transitions/prefetches, it can look like repeated redirects.

### 4. Middleware redirect behavior is strict on auth failure and has no retry/grace path
- File/line: `lib/supabase/middleware.ts:112` calls `supabase.auth.getClaims()`.
- File/line: `lib/supabase/middleware.ts:115` treats any exception as unauthenticated.
- File/line: `lib/supabase/middleware.ts:169` redirects unauthenticated protected requests to `/login`.
- File/line: `lib/supabase/middleware.ts:173` redirects authenticated `/login` requests to `/dashboard`.
- Why dangerous: if root middleware is wired in later, a transient `getClaims()` failure during refresh will be treated as logout immediately. Also, any accidental redirect to `/login` while a session still exists will bounce back to `/dashboard`, matching a "redirected twice" pattern: protected route -> login -> dashboard.
- Note: this file currently appears inactive unless a missing root middleware/proxy imports and exports `updateSession`.

### 5. Contract detail fetch errors do not redirect to dashboard
- File/line: `app/(protected)/contracts/[id]/page.tsx:10` renders `<ContractDetailClient contractId={id} />` and does not redirect.
- File/line: `lib/hooks/use-contract-queries.ts:251` calls `getContractDetail(id)` in React Query.
- File/line: `app/actions/contract-queries.ts:477` defines `getContractDetail(id)`.
- File/line: `app/actions/contract-queries.ts:481` wraps it with `withAuthRead(...)`.
- File/line: `app/actions/contract-queries.ts:491` enforces `requireContractAccess(...)` before detail queries.
- File/line: `app/actions/contract-queries.ts:628` throws query errors; `withAuthRead` catches them and returns `{ success: false, error }` upstream.
- File/line: `components/contracts/detail/contract-detail-client.tsx:622` renders an inline error state when `contractError` exists.
- File/line: `components/contracts/detail/contract-detail-client.tsx:637` links back to `/contracts`, not `/dashboard`.
- Conclusion: 500/403/contract-not-found errors in the detail fetch are surfaced as an error card, not a dashboard redirect.

### 6. Contracts error boundary does not redirect
- File/line: `app/(protected)/contracts/error.tsx:10` renders an error boundary UI.
- File/line: `app/(protected)/contracts/error.tsx:25` displays the message.
- File/line: `app/(protected)/contracts/error.tsx:27` only calls `reset()`.
- Conclusion: no dashboard redirect logic was found in the contracts error boundary.

### 7. No `contexts/auth-context.tsx`, `hooks/use-auth.ts`, or `hooks/use-auth.tsx` found
- Searched paths: `contexts/auth-context.tsx`, `hooks/use-auth.ts`, `hooks/use-auth.tsx`.
- Current app appears to use server-side `getAuthenticatedUserContext()` rather than a client auth provider for protected routing.
- Result: no client `useEffect([user])` / `onAuthStateChange` redirect loop was found in those expected files because they do not exist.

## Root Cause

Most likely root cause is authorization at the contracts layout level, not the contract-detail fetch itself:

1. The direct `/dashboard` redirect comes from `app/(protected)/contracts/layout.tsx:13`.
2. That redirect depends on `getAuthenticatedUserContext()` returning a role with `contracts` permission.
3. The auth context normally uses claims/proxy headers rather than verified `getUser()`.
4. The Supabase middleware helper that should refresh cookies and inject proxy headers is located at `lib/supabase/middleware.ts`, but no root Next.js middleware/proxy entrypoint was found.
5. Therefore, during navigation to `/contracts/[id]`, a transient or stale auth/role resolution can fail `canAccess(..., "contracts")`, causing a hard redirect to `/dashboard`.
6. If a failed protected request first goes to `/login` and the app then detects an existing session, middleware/login logic can bounce to `/dashboard`, producing the perceived double redirect.

## Recommended Fix

### P0 - Verify and wire the actual Next.js middleware entrypoint
- Add or restore a root `middleware.ts` (or `proxy.ts`, depending on the Next.js version used by this project) that calls `updateSession` from `lib/supabase/middleware.ts`.
- Example shape:

```ts
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- Then confirm requests to `/contracts/[id]` include refreshed Supabase cookies and downstream `x-mood-auth-*` headers.

### P0 - Make contracts layout fail closed without sending users to dashboard on transient auth role uncertainty
- Replace the immediate `/dashboard` redirect for missing contracts permission with either:
  - a dedicated `/unauthorized` page,
  - an inline access-denied UI,
  - or a verified fallback before redirect.
- Safer server-side pattern:
  1. call `getAuthenticatedUserContext()`;
  2. if context missing, redirect to `/login`;
  3. if role lacks contracts permission, re-check with a verified/authenticated source or fresh employee lookup;
  4. only then show access denied, not `/dashboard`.
- Avoid redirecting to `/dashboard` as a generic authorization fallback; it masks auth bugs and creates the exact "giut ve dashboard" behavior.

### P1 - Add a verified fallback in `getAuthenticatedUserContext()` when claims fail or role metadata is missing
- In `lib/auth_utils.ts`, for protected layout/module authorization, consider:
  - try headers/claims first;
  - if claims are missing or role is missing, call `getVerifiedUser()` once;
  - then use employee role as the source of truth.
- This can be gated by an option such as `getAuthenticatedUserContext({ verifyOnMissingClaims: true })` to avoid adding `getUser()` cost to every read path.

### P1 - Harden middleware against transient `getClaims()` failures
- If root middleware is active, do not immediately redirect on a single `getClaims()` exception caused by refresh/network edge cases.
- Consider a fallback to `supabase.auth.getUser()` only when claims fail on protected browser navigations, or let the request through to the protected layout with no-store and let server-side auth decide.
- Preserve refreshed cookies on every redirect, which `redirectWithCookies()` already attempts to do.

### P2 - Add redirect instrumentation
- Log the route, reason, auth source, user id presence, shell role, and target for each redirect:
  - middleware unauthenticated -> `/login`;
  - login authenticated -> `/dashboard`;
  - protected layout no context -> `/login`;
  - contracts layout no access -> `/dashboard`.
- This will confirm whether the two observed redirects are contracts layout -> dashboard, or protected route -> login -> dashboard.

## Risk Assessment

- Severity: High for UX and trust. Users can be kicked out of in-progress contract workflows even when authenticated.
- Likelihood: High if root middleware is indeed absent/inactive or if role claims are incomplete/stale.
- Blast radius: All module layouts using `if (!canAccess(context.shellRole, "module")) redirect("/dashboard")`, not just contracts. Similar patterns were seen in other protected module layouts.
- Data safety: Low direct data-loss risk from the redirect itself, but high risk of lost unsaved form state on detail/edit pages.
- Recommended priority: P0 for middleware entrypoint verification and contracts layout redirect removal/retry; P1 for auth context fallback and redirect observability.
