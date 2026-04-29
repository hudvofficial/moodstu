# Phase 03: Validation and Builder Contract Fixes
**Status:** Completed
**Priority:** P1
**Dependencies:** Phase 02
**Audit issues:** Warnings 1, 2, 5, 6, 7

## Objective

Close direct action-call gaps, fix builder read contracts, and validate all services-related payloads.

## Target Files

- `lib/validations/service.schema.ts`
- `app/actions/service-queries.ts`
- `app/actions/category-actions.ts`
- `app/actions/builder-actions.ts`
- `components/services/form/hooks/useServiceSearch.ts`
- `components/services/form/ServiceBundleSection.tsx`
- `components/services/builder/*`

## Implementation Steps

1. Add query/filter schema.
   - Validate search length.
   - Validate UUID category.
   - Validate status and fulfillment type.
   - Clamp page/limit, e.g. page >= 1 and limit <= 100.

2. Add category schemas.
   - `categoryUpsertSchema`: optional UUID id, trimmed name, capped icon.
   - `categoryDeleteSchema`: UUID id.

3. Add quick-create schema.
   - Trim name.
   - Validate service_type/item_type.
   - Require non-negative selling/cost price.

4. Add builder schemas.
   - Relation id/parent/child/category UUIDs.
   - Allow only known relation types.
   - Price rule conditions/actions schema or conservative JSON object cap.
   - Priority bounds.

5. Fix builder select.
   - Replace `service_name` with `name`.
   - Stop returning `[]` silently on DB errors; log and surface controlled error.

6. Fix bundle picker.
   - Use `searchServicesForBundle(query, parentId)` where possible.
   - Server-side validation remains source of truth.

## Acceptance Criteria

- Invalid filters cannot produce oversized DB ranges.
- Invalid category/quick-create/builder payloads are rejected before DB writes.
- Builder relation reads work with real table columns.
- Bundle picker excludes current parent and nested bundles.
- TypeScript/lint pass.

## Test Commands

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run verify:services
```

---
Next Phase: [Phase 04 - Time-Load, SSR Hydration, Pagination, Cache](./phase-04-timeload-ssr-pagination-cache.md)
