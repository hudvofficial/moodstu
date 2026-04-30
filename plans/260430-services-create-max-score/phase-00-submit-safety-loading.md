# Phase 00: Submit Safety and Loading State
**Status:** Completed  
**Priority:** P0  
**Dependencies:** None  
**Score impact:** 8.8 -> 9.1

## Objective

Make `/services/create` safe against duplicate submit and consistent across desktop sidebar, mobile sticky panel, and native form submit.

## Target Files

- `components/services/form/hooks/useServiceForm.ts`
- `components/services/form/index.tsx`
- `components/services/form/SaveActionPanels.tsx`
- `components/services/form/ServiceBundleSection.tsx`
- `lib/validations/service.schema.ts`
- `app/actions/service-mutations.ts`

## Implementation Steps

1. Add an immediate submit lock.
   - Use `useRef(false)` inside `useServiceForm`.
   - Return early if submit is already in-flight.
   - Set lock before async work starts.
   - Release lock in `finally`.

2. Keep all submit paths unified.
   - `<form onSubmit>` calls the same guarded `handleSubmit`.
   - Desktop and mobile action panels call the same guarded `handleSubmit`.
   - No separate mutation path should exist.

3. Improve loading labels.
   - Desktop create button: `Đang tạo...` while submitting.
   - Mobile create button: `Đang tạo...` while submitting.
   - Edit route should retain `Đang lưu...` wording.

4. Block invalid bundle create.
   - If `fulfillment_type === "bundle"` and `bundleItems.length === 0`, block submit.
   - Show field/section-level error near `ServiceBundleSection`.
   - Mirror the rule in server validation or RPC guard if missing.

5. Confirm cache and redirect remain targeted.
   - Keep `revalidateByPrefixes([cacheKeys.services(), cacheKeys.categories()])`.
   - Keep `router.push("/services")`.
   - Do not add `router.refresh()`.

## Acceptance Criteria

- Rapid double click creates at most one record.
- Pressing Enter plus clicking save creates at most one record.
- Submit buttons disable immediately.
- Submit lock releases after both success and failure.
- Empty bundle cannot be created as a bundle service.

## Verification

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run perf:audit
```

Manual:

- Open `/services/create`.
- Fill required fields.
- Double-click create quickly.
- Confirm only one toast/request/result.
- Switch fulfillment to bundle and submit with no child items; confirm blocked with clear error.
