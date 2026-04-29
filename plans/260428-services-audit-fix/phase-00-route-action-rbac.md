# Phase 00: Route and Action RBAC Boundary
**Status:** Completed
**Priority:** P0
**Dependencies:** None
**Audit issues:** Critical 1, Critical 2

## Objective

Make `/services` access match `ROLE_PERMISSIONS`: only roles with `"services"` may access services routes and management actions.

## Target Files

- `lib/auth_utils.ts`
- `app/(protected)/services/page.tsx`
- `app/(protected)/services/create/page.tsx`
- `app/(protected)/services/[id]/page.tsx`
- `app/(protected)/services/[id]/quote/page.tsx`
- `app/actions/service-queries.ts`
- `app/actions/service-mutations.ts`
- `app/actions/category-actions.ts`
- `app/actions/builder-actions.ts`

## Implementation Steps

1. Add `requireServicesAccess(supabase, userId)` and `withServicesAccess(action)` in `lib/auth_utils.ts`.
   - Follow existing `requirePrintingAccess` / `requireFinanceAccess` pattern.
   - Resolve employee/JWT role.
   - Check `canAccess(role, "services")`.

2. Add route-level guard.
   - In each `/services` page, call `getAuthenticatedUserContext()`.
   - Redirect or `notFound()` when `!canAccess(context.shellRole, "services")`.
   - Keep quote route internal unless a separate public quote feature is explicitly created.

3. Wrap service actions.
   - `getServices`, `getServiceById`, `getServiceCategories`, `getBundleItems`, `searchServicesForBundle`.
   - `createService`, `updateService`, `deleteService`.

4. Wrap category and builder actions.
   - `upsertCategory`, `deleteCategory`.
   - `upsertRelation`, `upsertPriceRule`, and builder reads.

5. Preserve intentionally contract-facing catalog reads.
   - If contract item picker needs service reads for sale roles, split those into `getAvailableServices` / `getAvailableCatalogItems` with contract permission, not services-admin permission.

## Acceptance Criteria

- Direct URL access to all services routes is denied for sale/media/viewer.
- Direct server-action calls are denied for authenticated users without `"services"`.
- Admin/manager services flows still work.
- TypeScript passes.

## Test Commands

```powershell
npx tsc --noEmit --pretty false
npm run lint
```

Manual smoke:

- Admin/manager can open list/create/edit/quote.
- Sale/media/viewer cannot open services pages by URL.
- Sale contract item picker still works if intentionally supported through separate catalog actions.

---
Next Phase: [Phase 01 - Supabase RLS/Public Exposure Hardening](./phase-01-rls-public-exposure.md)
