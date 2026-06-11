# Auth Layout Optimization Analysis

## Files reviewed

- `app/(protected)/layout.tsx`
- `lib/supabase/middleware.ts`
- `lib/auth_utils.ts`
- `lib/auth-proxy-headers.ts` for existing proxy header constants

## Current protected layout behavior

`app/(protected)/layout.tsx` is fully blocking:

```tsx
const context = await getAuthenticatedUserContext();

if (!context) {
  redirect("/login");
}

if (context.isEmployeeDisabled) {
  redirect("/account-disabled");
}
```

Because this runs in the top-level protected layout, every route under `app/(protected)` waits for auth context before any protected HTML can render. `Suspense` around children does not help because the layout itself must resolve before it can return `AppShell`.

## What `getAuthenticatedUserContext()` does

`getAuthenticatedUserContext()` calls the cached implementation with `bootstrapProfile === false` by default:

```ts
export async function getAuthenticatedUserContext(options?: {
  bootstrapProfile?: boolean;
}): Promise<AuthenticatedUserContext | null> {
  return getAuthenticatedUserContextCached(options?.bootstrapProfile === true);
}
```

For the default layout path, the chain is:

1. `getClaimsUser()`
   - Creates a Supabase server client.
   - Calls `supabase.auth.getClaims()`.
   - Returns a lightweight user object from JWT claims.
2. `getEmployeeContextByAuthUserId(user.id)`
   - Creates an admin Supabase client.
   - Queries `employees` by `auth_user_id` with retry on schema-cache errors.
3. Builds layout context:
   - `shellRole`
   - `userName`
   - `isEmployeeDisabled`
   - settings/member booleans

`bootstrapEmployeeProfile(...)` only runs when `bootstrapProfile: true` and a verified user exists. The current layout does not pass that option, so bootstrap is not part of the normal protected layout path.

## Middleware auth behavior

`lib/supabase/middleware.ts` already checks auth for non-public routes:

```ts
const { data, error } = await supabase.auth.getClaims();
isAuthenticated = !error && !!data?.claims?.sub;
```

Then:

```ts
if (!isAuthenticated && !isPublicRoute) {
  return redirectWithCookies("/login");
}

if (isAuthenticated && isLoginRoute) {
  return redirectWithCookies("/dashboard");
}
```

So for protected routes, middleware already performs the login gate and redirects unauthenticated users to `/login` before the route is rendered.

## Is the layout duplicating middleware?

Yes, partially.

Duplicate work:

- Middleware calls `supabase.auth.getClaims()` for protected routes.
- Protected layout calls `getAuthenticatedUserContext()`.
- `getAuthenticatedUserContext()` calls `getClaimsUser()`.
- `getClaimsUser()` calls `supabase.auth.getClaims()` again.

Not duplicate work:

- Middleware does not query `employees`.
- Middleware does not check disabled/deleted employee status.
- Middleware does not compute `shellRole` or `userName` for `AppShell`.

Conclusion: the `/login` auth check is duplicated, but the `/account-disabled` check is not. The layout cannot simply be removed or wrapped in Suspense unless disabled-account redirect behavior is moved somewhere else.

## Optimization goals

Need to preserve these behaviors exactly:

- `redirect("/login")` when no valid auth exists.
- `redirect("/account-disabled")` when employee exists but is inactive/deleted.
- `AppShell` still receives `role` and `userName`.

Main TTFB bottlenecks to reduce:

- Avoid the second `supabase.auth.getClaims()` in layout.
- Avoid blocking unrelated child data behind auth work where possible.
- Keep employee disabled check server-side before protected UI is shown.

## Recommended fix: pass verified claims from middleware to layout via request headers

The codebase already has `lib/auth-proxy-headers.ts` with auth proxy header names and `clearAuthProxyHeaders()`. Middleware currently clears spoofed inbound headers but never sets trusted replacement headers. This is the intended shape for avoiding duplicate claims verification.

### Step 1: middleware sets trusted auth headers after `getClaims()`

In `lib/supabase/middleware.ts`, import header constants:

```ts
import {
  AUTH_PROXY_EMAIL_HEADER,
  AUTH_PROXY_FULL_NAME_HEADER,
  AUTH_PROXY_ROLE_HEADER,
  AUTH_PROXY_SOURCE_HEADER,
  AUTH_PROXY_SUB_HEADER,
  clearAuthProxyHeaders,
} from "@/lib/auth-proxy-headers";
```

After successful `getClaims()`, set trusted headers on `requestHeaders`:

```ts
let claims: Record<string, unknown> | null = null;

try {
  const { data, error } = await supabase.auth.getClaims();
  claims = !error && data?.claims?.sub ? data.claims : null;
  isAuthenticated = !!claims;
} catch {
  isAuthenticated = false;
  claims = null;
} finally {
  logAuthShellTiming(
    "middleware.claims",
    Math.round(performance.now() - claimsStartedAt),
    isAuthenticated ? "authenticated=true" : "authenticated=false",
  );
}

if (claims) {
  requestHeaders.set(AUTH_PROXY_SOURCE_HEADER, "middleware");
  requestHeaders.set(AUTH_PROXY_SUB_HEADER, String(claims.sub));

  if (typeof claims.email === "string") {
    requestHeaders.set(AUTH_PROXY_EMAIL_HEADER, claims.email);
  }

  const appMetadata =
    claims.app_metadata && typeof claims.app_metadata === "object"
      ? (claims.app_metadata as Record<string, unknown>)
      : {};
  const userMetadata =
    claims.user_metadata && typeof claims.user_metadata === "object"
      ? (claims.user_metadata as Record<string, unknown>)
      : {};

  const role =
    typeof appMetadata.role === "string"
      ? appMetadata.role
      : typeof userMetadata.role === "string"
        ? userMetadata.role
        : null;
  const fullName =
    typeof userMetadata.full_name === "string" ? userMetadata.full_name : null;

  if (role) requestHeaders.set(AUTH_PROXY_ROLE_HEADER, role);
  if (fullName) requestHeaders.set(AUTH_PROXY_FULL_NAME_HEADER, fullName);
}
```

Important detail: `clearAuthProxyHeaders(requestHeaders)` is already called before auth. That prevents clients from spoofing these headers. Only middleware-populated values should be trusted.

### Step 2: add a claims-from-headers helper in `lib/auth_utils.ts`

Add imports:

```ts
import { headers } from "next/headers";
import {
  AUTH_PROXY_EMAIL_HEADER,
  AUTH_PROXY_FULL_NAME_HEADER,
  AUTH_PROXY_ROLE_HEADER,
  AUTH_PROXY_SOURCE_HEADER,
  AUTH_PROXY_SUB_HEADER,
} from "@/lib/auth-proxy-headers";
```

Add helper:

```ts
const getProxyClaimsUser = cache(async (): Promise<AuthContextUser | null> => {
  const headerStore = await headers();

  if (headerStore.get(AUTH_PROXY_SOURCE_HEADER) !== "middleware") {
    return null;
  }

  const id = headerStore.get(AUTH_PROXY_SUB_HEADER);
  if (!id) return null;

  const email = headerStore.get(AUTH_PROXY_EMAIL_HEADER) ?? undefined;
  const role = headerStore.get(AUTH_PROXY_ROLE_HEADER);
  const fullName = headerStore.get(AUTH_PROXY_FULL_NAME_HEADER);

  return {
    id,
    email,
    app_metadata: role ? { role } : {},
    user_metadata: fullName ? { full_name: fullName } : {},
  };
});
```

Then change the default context path to prefer proxy claims and fall back to Supabase claims:

```ts
const verifiedUser = bootstrapProfile ? await getVerifiedUser() : null;
const user = verifiedUser ?? (
  bootstrapProfile ? null : (await getProxyClaimsUser()) ?? (await getClaimsUser())
);
if (!user) return null;
```

This preserves `redirect("/login")`: if middleware did not provide valid headers, layout falls back to `getClaimsUser()`. If that also fails, context is `null` and the existing layout redirects to `/login`.

This preserves `redirect("/account-disabled")`: the layout still calls `getEmployeeContextByAuthUserId(user.id)` before rendering `AppShell` and redirects disabled/deleted employees.

### Step 3: leave `app/(protected)/layout.tsx` behavior unchanged initially

The safest first patch is to keep layout as-is:

```tsx
const context = await getAuthenticatedUserContext();

if (!context) redirect("/login");
if (context.isEmployeeDisabled) redirect("/account-disabled");
```

The optimization happens below it by making `getAuthenticatedUserContext()` skip the second claims call when middleware has already authenticated the request.

## Why this reduces TTFB

Before:

1. Middleware: `getClaims()`
2. Layout: `getClaims()` again
3. Layout: employee query
4. Render `AppShell` and children

After:

1. Middleware: `getClaims()`
2. Middleware forwards trusted claim subset in internal request headers
3. Layout: reads user id/email/role/name from headers
4. Layout: employee query
5. Render `AppShell` and children

The employee query remains necessary for disabled-account redirect and shell data, but one auth verification call is removed from the critical path.

## Optional second-stage optimization: move disabled check into middleware

For more aggressive TTFB improvement, middleware could also query employee status and redirect disabled users to `/account-disabled`. Then the layout could potentially stream a shell sooner or use a lighter context path.

However, this is riskier because:

- Middleware runtime may not be appropriate for service-role/admin DB access depending on deployment.
- It duplicates employee lookup with the layout unless employee data is also proxied through headers.
- It increases middleware cost for every protected request, including static-ish routes and assets not in `publicRoutes`.

Recommendation: do not start here. First remove duplicate `getClaims()` with proxy headers.

## Alternative: split layout into auth gate and shell context

A larger refactor could make `app/(protected)/layout.tsx` only perform the minimal login gate and move shell user data into a nested component with Suspense. But disabled redirect blocks that approach unless disabled checks happen before protected UI is visible. Since `redirect("/account-disabled")` must remain server-side, this does not remove the critical employee query by itself.

## Concrete minimal patch summary

1. In middleware:
   - Keep clearing auth proxy headers first.
   - Store successful `data.claims` in a local `claims` variable.
   - Set `x-mood-auth-source`, `x-mood-auth-sub`, and optional email/role/full-name headers on `requestHeaders`.
2. In auth utils:
   - Add `getProxyClaimsUser()` using `next/headers`.
   - Prefer proxy claims in `getAuthenticatedUserContextCached(false)`.
   - Fall back to existing `getClaimsUser()` to preserve direct render/test behavior.
3. Do not change the protected layout's redirect logic in the first pass.

Expected result: same redirect behavior, same `AppShell` props, less duplicated auth work, lower TTFB for protected routes.
