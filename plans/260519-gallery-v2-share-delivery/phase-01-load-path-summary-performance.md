# Phase 01: Load Path & Summary Query Foundation

Status: Done  
Goal: Fix the loading architecture before adding heavier V2 features.

## Why This Comes Early

The current UI has some lazy loading, but the data flow still overfetches:

- `getGalleriesByContract()` fetches every image for every gallery.
- Contract detail `DriveGalleryBlock` only needs counts but receives full image arrays.
- Full admin gallery loads `getGalleriesByContract()` and then also loads `getGalleryImagesPaginated()`.
- Public metadata calls `getPublicGallery()`, which can fetch the full image list just to build OG title/count/cover.
- Public gallery initially receives all image rows and only hides extra items client-side.

This is not a final polish issue. If V2 adds social preview, capability links, selected batches, and Drive jobs on top of this load path, performance will degrade in a hard-to-debug way.

## Measured Baseline

Measured against gallery `3b69fb5e-641f-41a1-9438-427c9a55c1f8` with 415 images:

- Full image fetch: ~283-522ms warm.
- First page 200 + exact count: ~139-183ms warm.
- Count-only: ~93-142ms warm.

The current album is manageable, but the shape is wrong for 1,000-3,000 image albums.

## Target Query Split

### `getGallerySummariesByContract(contractId)`

For contract detail and folder cards.

Return:

- gallery id/title/status/folder type/access state,
- image count,
- selected count,
- cover image thumbnail,
- shared links summary,
- selection deadline,
- Drive folder URL,
- delivery/download state.

Do not return full image rows.

### `getGalleryPreviewBySlug(slug)`

For metadata/social preview.

Return:

- title/description,
- cover URL,
- image count,
- customer/studio display names,
- robots/index policy,
- capability status.

Do not return gallery image arrays.

### `getGalleryImagesPaginated(galleryId, page, pageSize, filters)`

For admin full gallery and public gallery.

Return:

- image page,
- total count,
- selected count if needed,
- cursor/page info.

### `getGalleryInteractionSummary(galleryId)`

For toolbar stats.

Return aggregate counts:

- total hearts,
- total comments,
- comments per image only when comment filter opens,
- selected count.

## UI Loading Strategy

Admin full gallery:

1. Render toolbar shell from summary.
2. Fetch first image page.
3. Fetch interactions as secondary/deferred data.
4. Lazy-load further pages.

Contract detail:

1. Fetch gallery summaries only.
2. Do not fetch image rows unless user opens gallery.

Public gallery:

1. Server loads preview/first page only.
2. Client paginates/masonry-loads additional pages.

Metadata:

1. Use preview query only.
2. Never call full public gallery payload.

## Acceptance

- `DriveGalleryBlock` does not depend on `gallery_images?.length`.
- Admin full gallery initial load does not call both full-image fetch and paginated fetch for the same gallery.
- Social metadata does not fetch all images.
- Toolbar counts distinguish total count from loaded image count.
- 415-image gallery renders correctly.
- Test with synthetic 1,000+ row gallery or mocked page data before rollout.

## Implementation Notes

- Added `getGallerySummariesByContract()` for contract detail and admin gallery shells.
- Added `getPublicGalleryPreview()` so metadata/social preview reads only title/count/cover.
- Added `getPublicGalleryImagesPaginated()` and changed public gallery initial payload to first page only.
- Changed admin full gallery to use summaries plus `getGalleryImagesPaginated()` instead of embedded full image arrays.
- Toolbar total image count now uses aggregate total, not only loaded rows.

## Verification

- `npx eslint app/actions/gallery-actions.ts app/gallery/[accessUrl]/page.tsx components/contracts/gallery/use-gallery-data.ts components/contracts/gallery/gallery-full-page.tsx components/contracts/gallery/gallery-toolbar.tsx components/contracts/detail/drive-gallery-block.tsx components/gallery/gallery-page-client.tsx components/gallery/public-gallery-client.tsx types/gallery.ts`
- `npm run build`
