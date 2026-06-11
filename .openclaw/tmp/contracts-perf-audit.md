# Contracts Module Performance Audit

Scope: `app/(protected)/contracts` routes, `components/contracts` list/detail/create/edit/gallery, and relevant hooks/actions/queries. Source files were not intentionally changed; audit only.

## High-impact findings

### 1) `/contracts` list TTFB is intentionally traded for better FCP/LCP
- Evidence: `app/(protected)/contracts/page.tsx:15` is an async route that waits for `searchParams`, then runs `getContractList` and `getContractStats` in parallel at `app/(protected)/contracts/page.tsx:35` before returning `ContractsListClient` at `app/(protected)/contracts/page.tsx:41`.
- Impact: Good user-perceived FCP/LCP after response because `ContractsListClient` receives `initialData` and `initialStats`, but TTFB is blocked by auth + Supabase RPC latency. If contracts RPCs are p95 slow, users see no streamed shell.
- Recommendation: keep this for desktop/list-heavy users if list content is the LCP. If TTFB is the priority, split route into a fast shell with Suspense boundaries: render header/filter skeleton immediately, then stream list/stats from a server child or hydrate React Query via `HydrationBoundary` while preserving the current `initialFilters` key shape.
- File targets: `app/(protected)/contracts/page.tsx:15`, `app/(protected)/contracts/page.tsx:35`, `components/contracts/contracts-list-client.tsx:171`.

### 2) Detail route is client-first and pays a detail-page data waterfall
- Evidence: `app/(protected)/contracts/[id]/page.tsx` only extracts `id` and returns `ContractDetailClient`; data fetch occurs in `components/contracts/detail/contract-detail-client.tsx:107` via `useContractDetail`, whose query calls `getContractDetail` at `lib/hooks/use-contract-queries.ts:247`.
- Impact: TTFB is low, but FCP/LCP can be delayed by the client-side server-action round trip, and the page may show `ContractDetailLoading` while JavaScript hydrates and queries run.
- Recommendation: add an optional server-prefetch path for detail pages where the summary card is the LCP. Either pass the current `initialContract` props already supported by `ContractDetailClient` at `components/contracts/detail/contract-detail-client.tsx:73`, or use React Query dehydration for `contractKeys.detail(id)`. Keep the client-first path only if TTFB is more valuable than populated first paint.
- File targets: `app/(protected)/contracts/[id]/page.tsx`, `components/contracts/detail/contract-detail-client.tsx:73`, `components/contracts/detail/contract-detail-client.tsx:107`, `lib/hooks/use-contract-queries.ts:247`.

### 3) Query-key mismatch risk can silently disable list initial data
- Evidence: `app/(protected)/contracts/page.tsx:20` comments that `initialFilters` JSON key order must match `useContractFilters`; `components/contracts/contracts-list-client.tsx:163` and `components/contracts/contracts-list-client.tsx:167` compare `JSON.stringify(initialFilters)` and `JSON.stringify(swrFilters)`.
- Impact: Any filter shape/order drift makes `initialDataForCurrentFilters` undefined at `components/contracts/contracts-list-client.tsx:171`, causing an unexpected client refetch and skeleton despite SSR work.
- Recommendation: replace stringified object comparison with a stable filter-normalization helper shared by `page.tsx`, `useContractFilters`, and `contractKeys.list`. This also avoids extra renders from key-order differences.
- File targets: `app/(protected)/contracts/page.tsx:20`, `components/contracts/contracts-list-client.tsx:163`, `lib/hooks/use-contract-queries.ts:47`.

### 4) SWR and React Query coexist on the list hot path
- Evidence: `components/contracts/contracts-list-client.tsx:29` uses React Query, while `components/contracts/contracts-list-client.tsx:37` imports `preload` from `swr` and uses it for notes prefetch at `components/contracts/contracts-list-client.tsx:262`.
- Impact: Additional client bundle/runtime cost and two caching mental models on a high-traffic page. Also makes cache invalidation harder to reason about after realtime mutations.
- Recommendation: move contract notes prefetch to React Query (`queryClient.prefetchQuery`) and remove SWR from this route once no other contracts hot path depends on it.
- File targets: `components/contracts/contracts-list-client.tsx:37`, `components/contracts/contracts-list-client.tsx:256`, `components/contracts/contracts-list-client.tsx:262`.

## INP / hydration / client-cost findings

### 5) List page invalidates broad caches on every realtime contract event
- Evidence: realtime subscription is installed at `components/contracts/contracts-list-client.tsx:194`; every change calls `revalidateContractListCaches` at `components/contracts/contracts-list-client.tsx:185`, which invalidates list, stats, and drawer extras at `lib/hooks/use-contract-queries.ts:392`.
- Impact: On high write volume, background refetches can compete with user input and cause INP spikes, especially while filtering/paginating.
- Recommendation: keep the 600ms debounce for low volume, but add targeted cache patches for common updates (`status`, checklist completion, payment amounts) before broad invalidation. Consider invalidating `drawerExtras` only when a drawer is open.
- File targets: `components/contracts/contracts-list-client.tsx:185`, `components/contracts/contracts-list-client.tsx:194`, `lib/hooks/use-contract-queries.ts:392`.

### 6) Detail page handles realtime better, but fallback invalidation is still broad
- Evidence: detail page patches checklist/events/tasks optimistically at `components/contracts/detail/contract-detail-client.tsx:139`, `components/contracts/detail/contract-detail-client.tsx:154`, and `components/contracts/detail/contract-detail-client.tsx:197`; fallback invalidation runs at `components/contracts/detail/contract-detail-client.tsx:249` and invalidates detail + drawer extra via `lib/hooks/use-contract-queries.ts:400`.
- Impact: Good for INP when known payloads arrive, but unknown payload bursts still cause repeated full detail refetches. The settle window is only 160ms at `components/contracts/detail/contract-detail-client.tsx:59`.
- Recommendation: increase fallback settle batching to 500-1000ms or batch payloads in `useRealtimeMulti` for detail routes. Keep optimistic patches for visible sections.
- File targets: `components/contracts/detail/contract-detail-client.tsx:59`, `components/contracts/detail/contract-detail-client.tsx:249`, `lib/hooks/use-contract-queries.ts:400`.

### 7) Create/edit form mounts heavy modals even when closed
- Evidence: `components/contracts/form/index.tsx:208`, `components/contracts/form/index.tsx:225`, and `components/contracts/form/index.tsx:252` mount `ItemModal`, `CreateServiceModal`, and `CustomerFormModal` unconditionally; visibility is only controlled by `isOpen` props.
- Impact: Initial hydration includes modal trees and their hooks even when users never open them. This is avoidable JS/React work on create/edit routes.
- Recommendation: dynamically import and conditionally mount these modals only when open. Example target behavior: `{form.items.showItemModal && <ItemModal ... />}` plus `dynamic(() => import(...), { ssr: false })` for the modal modules.
- File targets: `components/contracts/form/index.tsx:12`, `components/contracts/form/index.tsx:208`, `components/contracts/form/index.tsx:225`, `components/contracts/form/index.tsx:252`.

### 8) Edit form still uses client-only load after mount
- Evidence: edit route returns `<ContractForm mode="edit" contractId={id} />`; `components/contracts/form/index.tsx:67` calls `form.loadContractForEdit(contractId)` in `useEffect`, and the loading spinner renders at `components/contracts/form/index.tsx:92`.
- Impact: Fast TTFB, but edit content cannot appear until hydration + client fetch complete; this hurts FCP and perceived speed on direct edit links.
- Recommendation: for edit routes, consider server-loading `getContractForEdit` and passing initial edit data into `useContractForm`, or use React Query hydration. Keep current client-first mode if edit route traffic is low and TTFB matters more.
- File targets: `app/(protected)/contracts/[id]/edit/page.tsx`, `components/contracts/form/index.tsx:67`, `components/contracts/form/hooks/useContractForm.ts`.

## Gallery findings

### 9) Gallery route optimizes TTFB but creates a two-step client data waterfall
- Evidence: `app/(protected)/contracts/[id]/gallery/page.tsx:5` explicitly avoids blocking TTFB; `useGalleryData` first calls `getGallerySummariesByContract` at `components/contracts/gallery/use-gallery-data.ts:111`, then once `activeGalleryId` exists calls `getGalleryDataV2` at `components/contracts/gallery/use-gallery-data.ts:168`.
- Impact: Good TTFB, but first real gallery content depends on client JS and at least one/two server-action round trips. This can delay LCP for gallery thumbnails.
- Recommendation: if gallery page LCP is important, use route-level prefetch for summaries and the first gallery data page when `galleryId` is present, then pass through the existing `initialGalleries` / `initialGalleryData` props already supported by `GalleryFullPage` and `useGalleryData`.
- File targets: `app/(protected)/contracts/[id]/gallery/page.tsx:15`, `components/contracts/gallery/gallery-full-page.tsx:31`, `components/contracts/gallery/use-gallery-data.ts:29`, `components/contracts/gallery/use-gallery-data.ts:111`, `components/contracts/gallery/use-gallery-data.ts:168`.

### 10) Gallery filtering/sorting and diagnostics can become main-thread work
- Evidence: `filteredGroups` filters and sorts all grouped images at `components/contracts/gallery/use-gallery-data.ts:303`; diagnostics and debug logs run at `components/contracts/gallery/use-gallery-data.ts:282` and `components/contracts/gallery/use-gallery-data.ts:294`.
- Impact: For large galleries, repeated filtering/sorting/logging can produce long tasks and hurt INP, especially when toggling filters or scrolling.
- Recommendation: remove or gate debug logs in production, memoize group counts, and switch to the existing virtual masonry implementation for large galleries. Prefer sorting/filtering a capped viewport list when total groups exceed a threshold.
- File targets: `components/contracts/gallery/use-gallery-data.ts:282`, `components/contracts/gallery/use-gallery-data.ts:294`, `components/contracts/gallery/use-gallery-data.ts:303`, `components/contracts/gallery/use-masonry-grid-virtual.ts`.

### 11) Gallery image grid is mostly bandwidth-aware but should verify async decoding
- Evidence: page size is network-aware at `components/contracts/gallery/use-gallery-data.ts:30`; grid resolves DPR-aware thumbnails at `components/contracts/gallery/gallery-image-grid.tsx:19` and eager loads only early items at `components/contracts/gallery/gallery-image-grid.tsx:86`.
- Impact: Good LCP/bandwidth posture, but final impact depends on `GalleryImageTile` using dimensions/aspect ratio and `decoding="async"` or equivalent.
- Recommendation: verify `GalleryImageTile` uses stable aspect-ratio boxes, width/height or CSS aspect ratio, `loading="lazy"` for non-eager images, and `decoding="async"`. If using `next/image`, set `sizes` from `columnWidth` and avoid unbounded remote originals.
- File targets: `components/contracts/gallery/gallery-image-grid.tsx:19`, `components/contracts/gallery/gallery-image-grid.tsx:86`, `components/contracts/gallery/gallery-image-tile.tsx`.

## Backend/query observations

### 12) Contract stats fallback is expensive if RPCs are missing
- Evidence: `getContractStats` tries `contract_stats`, then `contract_stats_simple`, then logs fallback at `app/actions/contract-queries.ts:433` and executes multiple count queries.
- Impact: If RPCs are not deployed, `/contracts` SSR waits on multiple counts before response, hurting TTFB.
- Recommendation: ensure `contract_stats` is deployed and monitored. Add instrumentation/alerts when fallback executes so regressions are caught early.
- File targets: `app/actions/contract-queries.ts:366`, `app/actions/contract-queries.ts:433`.

### 13) Contract detail fallback is expensive if v2/v3 RPC is unavailable
- Evidence: `getContractDetail` uses RPC at `app/actions/contract-queries.ts:477`, logs fallback at `app/actions/contract-queries.ts:517`, then runs 8 parallel queries.
- Impact: Detail navigation and hover prefetch can become heavy under missing-RPC conditions.
- Recommendation: deploy and validate the preferred detail RPC (`NEXT_PUBLIC_RPC_V3=true` if stable). Rate-limit hover prefetch if many rows are hovered quickly.
- File targets: `app/actions/contract-queries.ts:477`, `app/actions/contract-queries.ts:517`, `components/contracts/contracts-list-client.tsx:256`, `lib/hooks/use-contract-queries.ts:586`.

## Suggested priorities

1. Stabilize query-key normalization for list initial data to avoid silent SSR waste.
2. Remove SWR from contracts list hover prefetch and use React Query only.
3. Conditionally mount/dynamically import form modals on create/edit routes.
4. Decide per route whether TTFB or populated FCP is the goal: `/contracts` currently favors populated FCP; detail/gallery favor TTFB.
5. Gate gallery debug logs and switch to virtual masonry for large galleries.
