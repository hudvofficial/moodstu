# Phase 03: Publish Flow & Social Preview

Status: ⬜ Pending  
Goal: Make copied gallery links publishable and good-looking in social apps.

## Current Gap

- Admin full gallery can open share modal for a draft gallery, causing copied public link to show "Album chưa sẵn sàng".
- Metadata uses first image thumbnail instead of a deliberate cover.
- Social card lacks robust OG/Twitter fields.
- Social bots may not reliably render Google Drive thumbnail URLs.

## Target Behavior

Admin share flow:

1. Gallery is draft.
2. Admin opens share.
3. Modal shows preview card and state `Draft`.
4. Admin clicks `Publish`.
5. System creates/activates select + view share links.
6. Modal shows:
   - Select link
   - View-only link
   - QR for both
   - Social preview card
   - Copy-ready message text

Public social card:

- `robots: noindex`
- `og:type=website`
- `og:site_name=Mood Studio`
- `og:locale=vi_VN`
- `og:title`
- `og:description`
- `og:image`
- `og:image:width=1200`
- `og:image:height=630`
- `og:image:alt`
- `twitter:card=summary_large_image`

## OG Image Strategy

Preferred:

- Add `/api/og/gallery/[slug]`.
- Generate 1200x630 card from cover image + title + Mood logo.
- Cache by `share_version`.

Fallback:

- Use `og_image_url` if pre-generated/stored.
- If no cover image, use first JPG image.
- If Drive thumbnail unavailable, brand-only generated card.

## Data Fetch Rule

Metadata must not call the full public gallery payload. Use a lightweight preview query:

- gallery title/status/share fields,
- contract code/payment/customer names,
- cover image thumbnail,
- total image count via count query.

## Acceptance

- `/gallery/s/[slug]` and `/gallery/v/[slug]` produce different capabilities.
- Draft links do not present as share-ready.
- Facebook/Zalo/Messenger-style preview has title, description, image.
- No full image list fetch during metadata generation.
