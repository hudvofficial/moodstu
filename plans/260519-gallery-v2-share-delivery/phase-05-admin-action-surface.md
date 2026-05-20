# Phase 05: Admin Gallery Action Surface

Status: ⬜ Pending  
Goal: Make admin gallery actions match real studio operations and remove UI noise.

## Current Gap

The empty full-width white strip with `+` is `AlbumCreateInput` rendered when `albums.length === 0 && activeGalleryId`. It is not a core workflow and is visually confusing.

Evidence:

- `gallery-toolbar.tsx`: `hasDesktopFilters` includes `Boolean(activeGalleryId)`.
- `gallery-toolbar.tsx`: fallback `AlbumCreateInput` renders when no albums exist.
- `gallery-toolbar-actions.tsx`: collapsed button is `Tạo album mới`.

## Target Admin Toolbar

Primary visible actions:

- `Publish / Share`
- `Preview social card`
- `Copy select link`
- `Copy view-only link`
- `Selected JPG` actions
- `Download` actions gated by payment/access
- `Sort`
- `View mode`

Move lower-frequency actions into menu:

- Create category/album
- Watermark preview
- Reorder manual
- Raw/JPG filters
- Drive sync

## Required UI Removals

- Remove standalone empty strip `+`.
- Do not render category creation row when no categories exist.
- Show category tabs only when categories exist or when admin enters category management mode.

## Admin Business Cards

Add compact status cards or chips:

- Gallery state: `Draft`, `Shared`, `Locked`, `Delivered`.
- Payment state: `Đã thanh toán`, `Còn nợ`.
- Delivery eligibility.
- Selected count.
- Share links health.

## Acceptance

- No empty full-width `+` strip.
- Draft/shared state is obvious.
- Admin can find the real operations without guessing icon meaning.
- Share button either publishes or clearly asks to publish first.
