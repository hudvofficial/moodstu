# Plan: Gallery V2 — Share Card, Client Album, Selected JPG Delivery

Created: 2026-05-19  
Status: In Progress  
Origin: Audit `/contracts/fb09f2ed-a7ea-4d58-b4de-533d3beb3b25/gallery?galleryId=3b69fb5e-641f-41a1-9438-427c9a55c1f8` + Shotpik benchmark report

## Overview

Nâng cấp gallery từ "admin image grid có chọn ảnh" thành một workflow bàn giao ảnh thật:

1. Link share khách đẹp khi gửi qua Facebook/Zalo/Messenger/iMessage.
2. Public album giữ cảm giác album cưới, không phải lưới vuông file manager.
3. Link select/view có quyền thật bằng server capability token.
4. Admin lọc JPG khách chọn trực tiếp trên Google Drive bằng OAuth.
5. Admin lọc JPG khách chọn trên máy local bằng browser folder picker + fallback script pack.
6. Download ảnh gốc được khóa theo quyền + trạng thái thanh toán.
7. Load path được tách rõ summary/page/detail để không kéo full image list khi không cần.

## Confirmed Product Decisions

- Cover album được lộ công khai trong social preview.
- Không dùng `?mode=view` làm quyền thật trong V2; dùng capability link/token.
- Ưu tiên OAuth Google Drive thật, không chỉ export manifest.
- Local filtering dùng hướng hybrid tối ưu: browser folder picker trước, script pack fallback.
- Phase này sẽ mở rộng lọc RAW/XMP gốc ở Phase 07 Local Filter để giải quyết triệt để nút thắt hậu kỳ.
- Face recognition không nằm trong scope.

## Audited Current State

| Area | Current behavior | Evidence |
|---|---|---|
| Real gallery data | Contract `HĐ-2026-0001`, gallery `Ảnh gốc`, `415` ảnh, `draft`, paid in full | Supabase service query during audit |
| Public availability | `/gallery/0c3g9SRt8gQ8` returns "Album chưa sẵn sàng" while gallery is draft | `getPublicGallery()` requires `status = shared` |
| Metadata | OG metadata exists but is thin and uses first image as cover | `app/gallery/[accessUrl]/page.tsx` |
| Public UI | Grid crops thumbnails square | `components/gallery/public-gallery-client.tsx` |
| Select/view rights | `?mode=view` hides actions client-side only | `share-gallery-modal.tsx`, public client |
| Download | `/api/drive-download/[fileId]` checks only file id + Drive API key | `app/api/drive-download/[fileId]/route.ts` |
| Drive integration | Drive uses API key, read-only public folder access | `lib/google-drive.ts` |
| Google OAuth | Current OAuth scope is Calendar only | `app/api/auth/google/route.ts` |
| Admin toolbar noise | Empty full-width `+` strip is `AlbumCreateInput` fallback | `gallery-toolbar.tsx`, `gallery-toolbar-actions.tsx` |
| Pagination | Full gallery has paginated helper but `getGalleriesByContract()` still fetches full image arrays | `gallery-actions.ts`, `gallery-image-helpers.ts` |

## Measured Performance Baseline

Measured against real gallery `3b69fb5e-641f-41a1-9438-427c9a55c1f8` with 415 images using Supabase service client from local machine.

| Operation | Current/Target Role | Observed |
|---|---|---:|
| Fetch gallery rows only | Summary shell | ~217-348ms warm |
| Fetch all 415 image rows, full columns | Current `getGalleriesByContract()` / public full payload | ~283-522ms warm |
| Fetch page 0, 200 image rows + exact count | Intended full gallery page | ~139-183ms warm |
| Count images only | Summary/count chip | ~93-142ms warm |

Conclusion: current 415-image gallery is still usable, but the load path is structurally wrong. Fetching full image arrays for contract detail, metadata, share preview, and initial public render will scale linearly and become expensive at 1,000-3,000 images. Performance work is a foundation phase, not a final cleanup.

## Performance Rules

- Metadata/share preview must use preview summary query only.
- Contract detail gallery block must use summary query only.
- Admin full gallery initial load should fetch summary + first image page, not summary + all images + first page.
- Public gallery initial render should not require all image rows when album is large.
- Reaction/comment/album counts should use aggregate/count queries, not raw full rows where possible.
- Any page/action that displays a count must know whether it is showing total count or loaded count.

## Phases

| Phase | Name | Status | Primary Outcome |
|---|---|---|---|
| 00 | Baseline & Operational Invariants | ⬜ Pending | Freeze current behavior and acceptance rules |
| 01 | Load Path & Summary Query Foundation | Done | Remove full-image overfetch from shell/share/detail paths |
| 02 | Data Contract & Permission Model | Done | Gallery share links, cover metadata, selected batch/job tables |
| 03 | Publish Flow & Social Preview | Done | Stable share card, OG image, publish state |
| 04 | Public Client Album UX | Done | Premium masonry album, Star selection, better lightbox |
| 05 | Admin Gallery Action Surface | Done | Remove noise, expose real business actions |
| 06 | Google Drive OAuth & Selected JPG Copy | ⬜ Pending | Copy selected JPG to Drive folder with progress |
| 07 | Local RAW/JPG Smart Workflow | ⬜ Pending | Browser picker + script pack with RAW smart matcher |
| 08 | Payment-Aware Download Gate | ⬜ Pending | Secure delivery endpoint + paid/unlocked state |
| 09 | Verification, Profiling, Rollout | ⬜ Pending | Perf budgets, smoke/e2e, safe migration |

## Files Expected To Change

Likely areas; exact write set should be confirmed phase-by-phase before coding:

- `app/gallery/[accessUrl]/page.tsx`
- `components/gallery/*`
- `components/contracts/gallery/*`
- `components/contracts/detail/drive-gallery-block.tsx`
- `components/contracts/detail/drive-link-modal.tsx`
- `app/actions/gallery-actions.ts`
- `app/actions/gallery-drive-actions.ts`
- `app/actions/gallery-image-helpers.ts`
- `app/api/drive-download/[fileId]/route.ts`
- `app/api/auth/google/route.ts`
- `app/api/auth/google/callback/route.ts`
- `lib/google-drive.ts`
- `lib/gallery-access.ts`
- `lib/settings-secrets.ts`
- `types/gallery.ts`
- `types/settings.ts`
- `supabase/migrations/*`
- `components/providers/modal-renderer.tsx`
- `lib/context/modal-context.tsx`

## Not Changing

- No face recognition.
- Google Drive Copy (Phase 06) only copies JPG. Local Export Pack (Phase 07) WILL support copying RAW/XMP via Smart Matcher.
- No public indexing of private customer albums. Use Open Graph for social unfurl, keep `robots: noindex`.
- No destructive Drive move by default. Copy only.
- No rewrite of contract/payment core. Gallery reads existing payment status and remaining amount.

## Verification Gate

Each implementation phase must pass:

- `npx eslint <changed files>`
- `npm run build`
- Browser verification at:
  - Admin: `/contracts/fb09f2ed-a7ea-4d58-b4de-533d3beb3b25/gallery?galleryId=3b69fb5e-641f-41a1-9438-427c9a55c1f8`
  - Public select link
  - Public view-only link
  - Social card preview endpoint
- Drive copy dry-run and real copy test on a small controlled folder.
- Local filter test with duplicate filenames and missing files.

## Phase Docs

- `phase-00-baseline-invariants.md`
- `phase-01-load-path-summary-performance.md`
- `phase-02-data-contract-permissions.md`
- `phase-03-publish-social-preview.md`
- `phase-04-public-client-album-ux.md`
- `phase-05-admin-action-surface.md`
- `phase-06-drive-oauth-selected-jpg-copy.md`
- `phase-07-local-raw-smart-workflow.md`
- `phase-08-payment-download-gate.md`
- `phase-09-verification-profiling-rollout.md`
