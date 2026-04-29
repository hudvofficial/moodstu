# Phase 03: Time-Load, SSR Hydration, Picker, and Realtime
**Status:** Completed
**Priority:** P1
**Target score impact:** 9.2 -> 9.5

## Goal

Improve perceived load time and reduce avoidable data refresh/load on large catalogs.

## Work Items

1. SSR-hydrate `/inventory`:
   - Fetch initial list and stats in `app/(protected)/inventory/page.tsx`.
   - Seed SWR fallback or pass initial data to the client in the local pattern used by optimized modules.
   - Avoid immediate duplicate revalidation when fallback is fresh.
2. SSR-hydrate `/inventory/[id]`:
   - Validate route UUID before fetching.
   - Fetch detail on the server and seed client detail fallback.
3. Add searchable/paginated picker action:
   - `fetchInventoryPickerItems({ search, page, limit, activeOnly })`
   - Default limit around 20-50.
   - Active-only by default.
4. Update stock modals:
   - Server-search items instead of loading first 1,000 rows.
   - Keep selected row flow fast when item is already provided.
5. Debounce realtime invalidation:
   - Avoid immediate revalidating every inventory key on bursts.
   - Mutate detail only when item id can be inferred.

## Acceptance Criteria

- First inventory list paint has useful data without waiting for a client-only fetch.
- Detail page has initial detail data when opened directly.
- Stock modals can find items beyond the first 1,000 rows.
- Realtime updates remain responsive without flooding all inventory caches.
- `/inventory` route chunk remains under 80KB.

## Verification

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run perf:audit
npm run build
npm run perf:chunks
```

## Notes

- Do not move heavy modal-only code into the main route if it increases initial JS materially.
- Keep pagination/filter URL state stable.
