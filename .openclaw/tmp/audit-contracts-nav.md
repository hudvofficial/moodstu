# Audit: Contracts Detail Redirects To Dashboard

## Findings

1. **High - Module-level contracts auth guard redirects to `/dashboard` on any temporary role/context miss**
   - File: `app/(protected)/contracts/layout.tsx:12`
   - File: `app/(protected)/contracts/layout.tsx:13`
   - Code: `if (!context) redirect("/login");` and `if (!canAccess(context.shellRole, "contracts")) redirect("/dashboard");`
   - Why it matters: opening `/contracts/[id]` from the drawer triggers an App Router navigation and re-runs this server layout. If `getAuthenticatedUserContext()` returns a degraded/fallback role, stale employee status, null employee, or a transient auth/context read during that RSC request, the user is immediately redirected to `/dashboard`. This is the only contracts-specific code path found that can produce the exact symptom.

2. **Medium - Drawer detail navigation performs full route transition from client state, which re-runs server guards**
   - File: `components/contracts/contract-drawer.tsx:192`
   - Code: `router.push(`/contracts/${contractId}`);`
   - Context: the list opens an in-page drawer first, then `router.push` enters `/contracts/[id]`. This is normal Next.js usage, but it means any server redirect thrown by `app/(protected)/contracts/layout.tsx` wins and will replace the client view.
   - Not found: no `window.history.replaceState` / `pushState` usage inside contracts components or hooks.

3. **Medium - URL filter state uses shallow client URL mutation through `nuqs`; safe-path guard exists, but stale writes can still race with navigation depending on nuqs internals**
   - File: `hooks/useListFilters.ts:75`
   - File: `hooks/useListFilters.ts:88`
   - Code: `useQueryStates(..., { shallow: true, scroll: false })` and `safeSetQueryState(...)`.
   - Context: this is the replacement for the old `router.push` filter behavior. It is not using raw `window.history.*` directly in app code, and `safeSetQueryState` prevents writes after `window.location.pathname` differs from the mounted path. However, if a filter/search callback fires before the pathname changes while a detail navigation is pending, it can still update the list URL. I did not find evidence that it redirects to `/dashboard`; it is a possible navigation race only.

4. **Low - Header search uses `router.replace` against the current `window.location.pathname` after a debounce**
   - File: `components/layout/header.tsx:88`
   - File: `components/layout/header.tsx:105`
   - Code: reads `window.location.pathname` and calls `router.replace(...)`.
   - Context: this is not contracts-specific and does not target `/dashboard`, but a pending debounce from the contracts list can run during detail navigation and mutate the URL for whichever route is current. It is unlikely to be the dashboard redirect root cause, but it can add confusing route churn during navigation.

5. **Low - Protected root layout redirects unauthenticated/disabled users, but not to dashboard**
   - File: `app/(protected)/layout.tsx:13`
   - File: `app/(protected)/layout.tsx:17`
   - Code: redirects to `/login` or `/account-disabled` only.
   - Context: not the reported `/dashboard` destination.

6. **Low - Supabase middleware does not match `/contracts/[id]` specially and does not redirect contracts to dashboard**
   - File: `lib/supabase/middleware.ts:132`
   - File: `lib/supabase/middleware.ts:136`
   - Code: unauthenticated users redirect to `/login`; authenticated users on `/login` redirect to `/dashboard`.
   - Context: there is no workspace-root `middleware.ts` source file. I found only generated `.next/.../middleware.js` and `lib/supabase/middleware.ts`. Middleware has no `/contracts` pattern that would redirect `/contracts/[id]` to `/dashboard`.

7. **Informational - Other contracts route pushes are expected and do not target dashboard**
   - File: `components/contracts/contracts-list-client.tsx:271` -> `/contracts/${id}/edit`
   - File: `components/contracts/contracts-list-client.tsx:297` -> `/contracts/create`
   - File: `components/contracts/contracts-list-client.tsx:308` -> `/contracts/create`
   - File: `components/contracts/contract-drawer.tsx:158` -> `/contracts/${contractId}/edit`
   - File: `components/contracts/contract-drawer.tsx:201` -> `/contracts/${contractId}#section-payment`
   - File: `components/contracts/detail/contract-actions-menu.tsx:89` -> `/contracts`
   - File: `components/contracts/detail/drive-gallery-block.tsx:233` -> `/contracts/${contractId}/gallery?...`

## Root Cause

Most likely root cause is **the contracts segment authorization guard in `app/(protected)/contracts/layout.tsx`**. The contracts list and contracts detail both live under this layout, but navigating from an already-rendered contracts list drawer into `/contracts/[id]` causes a fresh RSC/navigation request. If `getAuthenticatedUserContext()` transiently resolves to a role that fails `canAccess(..., "contracts")`, `redirect("/dashboard")` is thrown server-side and Next.js navigates the browser to dashboard.

I did **not** find the exact previous calendar bug pattern (`window.history.replaceState` or `window.history.pushState`) in contracts navigation code. The only raw `window.history.replaceState` matches are in auth pages:

- `components/auth/login-page-client.tsx:41`
- `components/auth/reset-password-form.tsx:37`

Those are unrelated to contracts detail navigation.

The detail page itself (`app/(protected)/contracts/[id]/page.tsx`) is client-first and does not redirect. `ContractDetailClient` shows a loading skeleton or an inline error with a link back to `/contracts`; it does not redirect to dashboard. Contract detail re-fetch/realtime invalidation can fail the detail query, but the client component handles that locally and does not call `router.push('/dashboard')`.

## Recommended Fix

1. **Make contracts layout redirect less brittle and observable**

   Current:

   ```ts
   const context = await getAuthenticatedUserContext();

   if (!context) redirect("/login");
   if (!canAccess(context.shellRole, "contracts")) redirect("/dashboard");
   ```

   Recommended:

   ```ts
   const context = await getAuthenticatedUserContext();

   if (!context) redirect("/login");

   const hasContractsAccess = canAccess(context.shellRole, "contracts");
   if (!hasContractsAccess) {
     console.warn("[contracts-auth] denied", {
       path: "contracts-layout",
       userId: context.user.id,
       role: context.shellRole,
       employeeStatus: context.employee?.status,
       employeeDeletedAt: context.employee?.deleted_at,
     });
     redirect("/dashboard");
   }
   ```

   This confirms whether the dashboard redirect is coming from this guard and captures the role/status that caused it.

2. **Consider not redirecting to dashboard for permission failure in a segment layout**

   Safer UX:

   ```ts
   import { forbidden } from "next/navigation";

   if (!canAccess(context.shellRole, "contracts")) forbidden();
   ```

   Or render a module-level access-denied component. This prevents a transient detail navigation from visually looking like a random dashboard kick.

3. **Stabilize auth context used by nested protected layouts**

   `app/(protected)/layout.tsx` already fetches `getAuthenticatedUserContext()` and passes `role` into `AppShell`, then `app/(protected)/contracts/layout.tsx` fetches it again. Because `getAuthenticatedUserContext` is React-cached per request, this is deduped within one RSC request but not across navigations. Prefer a single source for auth/permission checks if possible, or make `getAuthenticatedUserContext()` fail closed only for true unauthenticated/disabled states and avoid JWT fallback role changes that can deny a route after the shell already showed it.

4. **Harden debounced URL updates during navigation**

   Header search can still call `router.replace` after a delayed timeout. Add the same mounted-path guard used by `useListFilters`, or clear the pending debounce on pathname change before replacing:

   ```ts
   const mountedPathRef = React.useRef(pathname);
   React.useEffect(() => {
     mountedPathRef.current = pathname;
     if (debounceRef.current) clearTimeout(debounceRef.current);
   }, [pathname]);
   ```

   Then before `router.replace`, return if `window.location.pathname !== mountedPathRef.current`.

5. **Keep contracts detail navigation on Next router; do not use raw History API**

   `router.push(`/contracts/${contractId}`)` is the right primitive. Do not replace it with `window.history.pushState`. The likely fix is the server guard/auth stability, not manual history manipulation.

## Risk Assessment

- **Severity: High** for the `app/(protected)/contracts/layout.tsx:13` dashboard redirect, because it exactly matches the reported destination and can interrupt normal detail navigation.
- **Likelihood: High** if the user can see `/contracts` but gets kicked only on detail navigation; that points to a fresh server navigation guard, not client-side detail data fetching.
- **Blast radius: Medium** because the same guard pattern exists in other module layouts (`finance`, `inventory`, `services`, etc.), so the same transient context issue could affect other detail pages.
- **Client routing risk: Low to Medium**. No raw History API use was found in contracts. `nuqs` shallow filter sync and debounced header search can race with navigation, but neither targets `/dashboard`.
- **Middleware risk: Low**. Middleware only redirects unauthenticated users to `/login` and authenticated users away from `/login` to `/dashboard`; it does not special-case `/contracts/[id]`.
