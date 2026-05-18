# Phase 07: Auth and Action Overhead Reduction
Status: Completed
Priority: P2

## Objective
Reduce repeated auth and role lookup overhead across frequent server actions without weakening security.

## Files
- `lib/auth_utils.ts`
- `lib/supabase/server.ts`
- Module action files that call multiple internal actions

## Tasks
1. Profile `auth.getUser`, `auth.employeeContext`, and full action timings for small actions.
2. Add a `withModuleAccess` style wrapper or cached request-local access context where it reduces duplicate role resolution.
3. Keep service-role DB access gated behind verified user and module permission.
4. For compound actions, use internal functions with one outer auth gate.
5. Do not replace verified auth with client-provided identity.

## Acceptance Criteria
- Frequent small actions show lower fixed overhead.
- Permission checks remain explicit and testable.
- No action gets broader access than before.

## Result
- Existing request-local caching for verified user/admin client/employee context remains in place.
- CRM, Moodie, and Finance gates now reuse `resolveActiveUserRole()` instead of repeating role lookup logic.
- CRM and Moodie still require a concrete active employee record, preserving previous access semantics.
- Contract gate functions already used the cached role resolver.
