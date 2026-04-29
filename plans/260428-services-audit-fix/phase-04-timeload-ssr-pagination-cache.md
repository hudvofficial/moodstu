# Phase 04: Time-Load, SSR Hydration, Pagination, Cache
**Status:** Completed
**Priority:** P2
**Dependencies:** Phase 03
**Audit issues:** Warnings 3, 4

## Objective

Improve perceived load, avoid silent truncation above 50 services, and make cache invalidation intentional.

## Target Files

- `app/(protected)/services/page.tsx`
- `components/services/services-list-client.tsx`
- `app/actions/service-queries.ts`
- `lib/swr.ts`
- `lib/cache-invalidation.ts`
- `components/services/service-filters.tsx`

## Implementation Steps

1. SSR-hydrate initial list and categories.
   - Fetch first page and categories in `page.tsx`.
   - Pass fallback data to `ServicesListClient`.
   - Disable redundant revalidate-on-mount when SSR fallback is present.

2. Add pagination or intentional full-data mode.
   - Use server-side page/limit state for list.
   - Keep stats accurate:
     - either derive from all-services stats query,
     - or clearly scope stats to current filter/page.

3. Add search/filter state to key.
   - SWR key should include search/category/status/page/limit.
   - Avoid one global `cacheKeys.services()` for every filter.

4. Add central invalidation helper.
   - `revalidateServiceCaches(serviceId?)` should cover:
     - `services`
     - `categories`
     - service detail if applicable.

5. Check client chunk.
   - Dynamic-load builder/quote modal if route chunk grows.
   - Keep `/services` under 80KB.

## Acceptance Criteria

- First data is available from SSR.
- Catalogs over 50 records are not silently hidden.
- Search/filter pages cache independently.
- Mutations invalidate the right services cache prefixes.
- `/services` chunk remains under 80KB.

## Test Commands

```powershell
npx tsc --noEmit --pretty false
npm run perf:audit
npm run build
npm run perf:chunks
```

---
Next Phase: [Phase 05 - Verification, Smoke, Final Score](./phase-05-verification-smoke-final-score.md)
