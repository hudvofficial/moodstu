# Phase 02: Data Contract & Permission Model

Status: Done  
Goal: Add the data model needed for share cards, real link permissions, selected batches, and copy jobs.

## Current Gap

Current gallery schema has `access_url`, `password`, `status`, `selection_deadline`, Drive fields, and image rows. It does not model:

- separate select/view/download links,
- stable social preview cover/title/description,
- share version/cache invalidation,
- selection limits,
- delivery unlock state,
- selected batch lifecycle,
- Drive/local filtering jobs.

## Proposed Schema

### `gallery_share_links`

Purpose: server-enforced capability links.

Fields:

- `id uuid pk`
- `gallery_id uuid fk`
- `slug text unique not null`
- `capability text not null` — `select`, `view`, `download`
- `status text not null` — `active`, `disabled`
- `expires_at timestamptz null`
- `access_version int not null default 1`
- `created_by uuid null`
- `created_at`, `updated_at`

### `galleries` additions

- `cover_image_id uuid null`
- `og_title text null`
- `og_description text null`
- `og_image_url text null`
- `share_version int not null default 1`
- `selection_limit int null`
- `allow_comments boolean not null default true`
- `allow_download boolean not null default false`
- `download_unlocked_at timestamptz null`
- `download_unlocked_by uuid null`

### `gallery_selection_batches`

Purpose: snapshot a client selection for retouch/delivery.

- `id uuid pk`
- `gallery_id uuid fk`
- `contract_id uuid fk`
- `status text` — `draft`, `client_submitted`, `studio_locked`, `drive_copied`, `local_exported`, `retouching`, `delivered`
- `selected_count int not null default 0`
- `created_by_client text null`
- `locked_by uuid null`
- `locked_at timestamptz null`
- `created_at`, `updated_at`

### `gallery_selection_batch_items`

- `id uuid pk`
- `batch_id uuid fk`
- `image_id uuid fk`
- `file_name text`
- `drive_file_id text`
- `sort_order int`
- `client_note text null`

### `gallery_filter_jobs`

Purpose: Drive copy/local export job progress and retry.

- `id uuid pk`
- `gallery_id uuid fk`
- `batch_id uuid fk null`
- `job_type text` — `drive_copy_jpg`, `local_manifest`
- `status text` — `queued`, `running`, `completed`, `failed`, `cancelled`
- `total_count int`
- `processed_count int`
- `success_count int`
- `failed_count int`
- `target_url text null`
- `manifest_url text null`
- `error text null`
- `created_by uuid`
- `created_at`, `updated_at`

## Permission Rules

- `select`: can view, select/unselect JPG, comment if enabled.
- `view`: can view only; no selection mutation, no notes/comments unless explicitly enabled later.
- `download`: can download only when payment/download gate passes.
- Admin actions still require authenticated contract permission.

## Acceptance

- Migrations are additive and backward-compatible.
- Existing `access_url` continues to work during transition.
- Types updated.
- RLS/service-role boundary preserved.
- Old password hash/access version logic remains valid until migrated.

## Implementation Notes

- Added migration `20260519090000_gallery_v2_data_contract_permissions.sql`.
- Added `galleries` fields for cover/OG/share version/selection limit/download unlock state.
- Added `gallery_share_links`, `gallery_selection_batches`, `gallery_selection_batch_items`, and `gallery_filter_jobs`.
- New tables use forced RLS with service-role-only policies, matching existing gallery hardening.
- Added `ensureGalleryShareLinks()` to create one active `select`, `view`, and `download` capability slug per gallery.
- Public gallery resolver now accepts either legacy `galleries.access_url` or a Phase 02 `gallery_share_links.slug`.
- Signed gallery access tokens now include capability while still accepting legacy tokens as `select`.
- Public selection and note mutations now require a valid `select` capability token.
- Password unlock/session restore now preserve the capability slug, so view links do not become select links after unlock.
- Added selected-batch and filter-job creation actions for later Drive/local delivery phases.
- Share modal now prefers real capability links and falls back to legacy `access_url` until migration/data is available.

## Deferred To Later Phases

- Editing OG title/description/cover in admin UI belongs to Phase 03.
- Premium public album layout belongs to Phase 04.
- Drive OAuth copy execution belongs to Phase 06.
- Local export execution belongs to Phase 07.
- Payment-aware download endpoint enforcement belongs to Phase 08.

## Verification

- `npx eslint app/actions/gallery-actions.ts app/gallery/[accessUrl]/page.tsx components/contracts/gallery/share-gallery-modal.tsx components/contracts/detail/drive-gallery-block.tsx components/gallery/gallery-page-client.tsx components/gallery/password-gate.tsx components/gallery/public-gallery-client.tsx components/providers/modal-renderer.tsx lib/gallery-access.ts types/gallery.ts types/database.types.ts`
- `npm run build`
