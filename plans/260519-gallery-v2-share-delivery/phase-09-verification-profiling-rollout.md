# Phase 09: Verification, Profiling, Rollout

Status: ⬜ Pending  
Goal: Ensure Gallery V2 scales past the current 415-image album and can roll out safely.

## Performance Work

Replace full gallery image fetches where summaries are enough:

- `getGalleriesByContract()` should not always embed all `gallery_images`.
- Add summary query:
  - gallery rows,
  - image counts,
  - selected counts,
  - cover thumbnail,
  - shared link states.
- Keep paginated image fetching for full gallery view.
- Metadata uses preview query only.

## Verification Matrix

Admin:

- Draft gallery cannot produce misleading ready link.
- Publish creates active select/view links.
- Empty `+` strip is gone.
- Selected JPG actions appear only when useful.
- Paid status appears for `HĐ-2026-0001`.

Public:

- Select link can select.
- View link cannot select.
- Social preview metadata exists.
- Public album uses non-square masonry.
- Password album still has social card.

Drive:

- OAuth connect still supports Calendar.
- Drive selected JPG copy works.
- Copy job progress and failures persist.

Local:

- Browser copy works when File System Access API exists.
- Export pack fallback works.

Security:

- Direct file id download is not a public bypass.
- Capability tokens enforce permissions server-side.
- RLS/service-role action boundaries remain explicit.

## Commands

- `npx eslint <changed files>`
- `npm run build`
- `npm run verify:contracts`
- Add targeted gallery smoke script if implementation touches DB/security.

## Rollout

1. Keep legacy `/gallery/[accessUrl]` during transition.
2. Generate new select/view links for existing shared galleries.
3. Migrate share modal to prefer V2 links.
4. After verification, deprecate query-mode view-only.
