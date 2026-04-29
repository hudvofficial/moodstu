# Services Module Audit - 2026-04-28

Scope: `/services`, service list/create/edit/quote routes, service/category/builder server actions, bundle logic, quote flows, Supabase table exposure, time-load, cache behavior, and build/performance health.

## Post-Fix Status

- Final score after implementation: 9.6/10.
- Migration pushed to Supabase: `20260428183000_services_security_atomic_writes.sql`.
- `/services` route chunk after optimization: 49.3KB, below the 80KB app route budget.
- Anon direct reads are now denied for `services`, `service_categories`, `service_bundles`, `service_relations`, `price_rules`, and `studio_info`.
- Service writes now go through `save_service_atomic`; delete goes through `delete_service_atomic`.
- Route and server-action RBAC now enforce the `"services"` permission for service management flows.
- Contract-facing catalog helpers remain deliberately scoped to contract permission so sales contract item picker flows keep working.

Verification passed:

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run verify:services
npm run perf:audit
npm run build
npm run perf:chunks
npx supabase db push --dry-run
npx supabase db push
```

## Summary

- Score: 6.4/10.
- Critical issues: 4.
- Warnings: 7.
- Suggestions: 5.
- Release recommendation: usable only for trusted internal admin/manager sessions. Not ready for high-score production hardening until route/action RBAC and table exposure are fixed.
- `/services` list route chunk: 50.6KB, below the 80KB app route budget.
- `/services/[id]/quote` chunk: 21.6KB.

Remote anon probe:

```text
services: OK rows=1 count=10
service_categories: OK rows=1 count=7
service_bundles: OK rows=0 count=0
service_relations: OK rows=0 count=0
price_rules: OK rows=0 count=0
studio_info: OK rows=1 count=1
```

This means the public anon key can directly query service catalog tables. Because `/services` is modeled as an internal module in `ROLE_PERMISSIONS`, this is not an acceptable default posture.

## Critical Issues

1. `/services` routes are authenticated-only, not role-gated
   - Files: `types/roles.ts:7`, `types/roles.ts:20`, `types/roles.ts:36`, `types/roles.ts:40`, `types/roles.ts:41`, `types/roles.ts:42`, `app/(protected)/layout.tsx:11`, `app/(protected)/layout.tsx:17`, `app/(protected)/services/page.tsx:5`
   - Current behavior: only `admin` and `manager` include `"services"` in `ROLE_PERMISSIONS`, but `ProtectedLayout` only checks login and renders children. The `/services` pages do not call a services access guard.
   - Impact: `sale`, `media`, and `viewer` users can access `/services`, `/services/create`, `/services/[id]`, and `/services/[id]/quote` by direct URL if authenticated.
   - Required fix: add a `requireServicesAccess`/`withServicesAccess` helper and route-level guard for every services page.

2. Service/category/builder server actions use `withAuth` only
   - Files: `app/actions/service-queries.ts:21`, `app/actions/service-queries.ts:68`, `app/actions/service-queries.ts:84`, `app/actions/service-mutations.ts:26`, `app/actions/service-mutations.ts:100`, `app/actions/service-mutations.ts:174`, `app/actions/category-actions.ts:36`, `app/actions/category-actions.ts:70`, `app/actions/category-actions.ts:205`, `app/actions/builder-actions.ts:43`, `app/actions/builder-actions.ts:58`
   - Current behavior: server actions rely on authentication but do not enforce the `"services"` module permission.
   - Impact: an authenticated user without services permission can read services/categories and can mutate services, categories, relations, and price rules if the action endpoint is reachable.
   - Required fix: wrap all services/category/builder reads and writes with app-level services RBAC; keep any contract-facing catalog picker actions separately scoped if sales need them.

3. Remote tables are directly readable by anon
   - Tables probed: `services`, `service_categories`, `service_bundles`, `service_relations`, `price_rules`, `studio_info`.
   - Impact: public clients can query service catalog and category data directly. `services` rows include business pricing fields such as `selling_price` and `cost_price`.
   - Required fix: tighten RLS/policies for internal catalog tables. If a public quote/catalog view is intentionally needed, expose a narrow public RPC/view that excludes internal fields like `cost_price`, audit fields, soft-delete metadata, and builder rules.

4. Bundle create/update is not atomic and can lose bundle items
   - Files: `app/actions/service-mutations.ts:51`, `app/actions/service-mutations.ts:74`, `app/actions/service-mutations.ts:136`, `app/actions/service-mutations.ts:144`, `app/actions/service-mutations.ts:247`, `app/actions/service-mutations.ts:260`
   - Current behavior: service row update and bundle item sync run as separate operations. `syncBundleItems` deletes all existing bundle items first, then inserts new rows.
   - Impact: if insert fails after delete, the service is saved but bundle composition is empty or partial. Create can leave a bundle service without items if item sync fails.
   - Required fix: move service + bundle sync into a DB transaction/RPC or use a safer staging/upsert approach with validation before destructive delete.

## Warnings

1. Builder relations query references a non-existent service column and swallows the error
   - File: `app/actions/builder-actions.ts:20`, `app/actions/builder-actions.ts:22`
   - `services` table has `name`, not `service_name`. The action returns `[]` on error, hiding breakage from the UI.
   - Required fix: select `name` and fail loudly/log safely when relation reads break.

2. Price rule mutations are minimally validated and not cache-invalidated
   - File: `app/actions/builder-actions.ts:58`, `app/actions/builder-actions.ts:62`, `app/actions/builder-actions.ts:67`
   - Current behavior: arbitrary JSON-ish `conditions/actions` can be written with only `name` required; no role gate, no Zod schema, no revalidation.
   - Required fix: schema-validate rule shape and restrict writes to admin/manager.

3. Service list loads only 50 records and ignores pagination metadata
   - Files: `components/services/services-list-client.tsx:28`, `components/services/services-list-client.tsx:51`, `components/services/services-list-client.tsx:61`, `app/actions/service-queries.ts:57`
   - Current behavior: `getServices` returns `{ items,total,page,limit }`, but the UI discards total and renders only first 50.
   - Impact: stats and list silently become wrong once catalog exceeds 50 records.
   - Required fix: add pagination/infinite scroll, or fetch all rows intentionally for stats with a separate capped list query.

4. List page has no SSR data hydration
   - Files: `app/(protected)/services/page.tsx:5`, `components/services/services-list-client.tsx:51`, `components/services/services-list-client.tsx:56`
   - Current behavior: the route renders the client shell and then calls server actions from SWR.
   - Impact: slower first meaningful data paint versus the rest of the app's higher-scoring modules that SSR initial payloads.
   - Required fix: server-fetch services/categories in `page.tsx` and pass fallback data.

5. Search/filter input contracts are not fully validated
   - Files: `app/actions/service-queries.ts:23`, `app/actions/service-queries.ts:24`, `app/actions/service-queries.ts:38`, `lib/utils/service-utils.ts:101`
   - Current behavior: page/limit/status/category are trusted; `sanitizeSearch` only strips `%` and `_`.
   - Impact: invalid limits/pages can trigger oversized ranges or odd query behavior; search still flows into `.or(...)` string construction.
   - Required fix: add Zod schemas for filters and build search with capped values.

6. Bundle business constraints are incomplete
   - Files: `lib/validations/service.schema.ts:44`, `app/actions/service-mutations.ts:240`, `app/actions/service-mutations.ts:252`, `components/services/form/hooks/useServiceSearch.ts:23`
   - Current behavior: bundle item schema only validates UUID/quantity/price. It does not prove child services are active, non-deleted, `single`, or different from the parent. The form search uses `getServices`, not the existing `searchServicesForBundle(excludeId)`.
   - Impact: self-referential bundles or nested/deleted bundle children can be persisted by direct action calls or UI edge cases.
   - Required fix: validate child services server-side before sync and exclude the current parent in UI search.

7. Category and quick-create actions lack module-grade validation
   - Files: `app/actions/category-actions.ts:36`, `app/actions/category-actions.ts:70`, `app/actions/category-actions.ts:198`, `app/actions/category-actions.ts:205`, `app/actions/category-actions.ts:218`
   - Current behavior: category name/icon and quick-create pricing are not Zod-validated. `quickCreateService` accepts any numeric price, including negative values if callers pass them.
   - Required fix: add schemas for category upsert/delete and quick create; clamp/validate numeric fields.

## Positive Findings

- Core create/update services use Zod validation and optimistic locking.
- Service delete is soft-delete and checks contract usage plus child bundle usage.
- Audit logs exist for service/category/builder mutations.
- Tracked hot indexes exist for service list filters/search and bundle parent sorting.
- Search for normal service list is capped and indexed through trigram indexes.
- Build, TypeScript, lint, perf audit, and chunk budget pass.
- `/services` route chunk is 50.6KB, comfortably under budget.
- Quote full-page route is small at 21.6KB.

## Suggested Fix Order

1. P0: Add route/action RBAC for services, categories, builder relations, and price rules.
2. P0: Harden RLS/public table exposure; expose only narrow public quote/catalog data if needed.
3. P1: Make service + bundle sync transactional.
4. P1: Fix builder `service_name` select bug and stop swallowing read errors.
5. P1: Add validation schemas for filters, categories, quick create, relations, and price rules.
6. P2: SSR-hydrate `/services` list and add pagination or an explicit "all services" stats query.
7. P2: Add `verify:services` remote checks for anon denial, service-role reads, action contract sanity, and bundle integrity.
8. P2: Add browser smoke for admin/manager allowed and sale/media/viewer blocked.

## Verification Commands Run

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run perf:audit
npm run build
npm run perf:chunks
```

Results:

- TypeScript: passed.
- Lint: 0 errors, 19 existing warnings outside services.
- Build: passed.
- Perf audit: passed.
- Chunk budget: passed; no app route chunks over 80KB.

Remote checks:

- Direct anon table probes performed with `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `services`, `service_categories`, `studio_info`, `service_bundles`, `service_relations`, and `price_rules` are queryable by anon. Some returned 0 rows because they are empty, but the queries were not denied.

## Score Rationale

Score: 6.4/10.

The module is functionally broad and performs well, but the access boundary is not aligned with the role model. Route-level access, server-action access, and remote table exposure all need tightening before this can score high. After P0 security fixes and transactional bundle sync, this should move into the 8.8-9.2 range. With SSR hydration, pagination, builder validation, and role-based E2E, the module can reach 9.5+.
