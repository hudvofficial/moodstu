# Phase 04: Public Client Album UX

Status: ⬜ Pending  
Goal: Replace file-grid feeling with a premium client album experience.

## Current Gap

`components/gallery/public-gallery-client.tsx` renders square tiles with `aspectRatio: 1 / 1`. That is efficient but makes wedding photos feel like a file picker and crops vertical/horizontal composition.

## Target Layout

### Welcome

- Full cover image, not just blurred background.
- Album title from OG title/gallery title.
- Subtitle with photo count and studio name.
- Primary CTA: `Xem album`.
- Optional password gate stays before or after welcome depending final UX, but social preview remains public.

### Gallery

- Masonry layout preserving image aspect ratio.
- Mobile: 2-column compact masonry.
- Desktop: 4-5 columns depending width.
- No forced square crop.
- Sticky compact top: title, count, selected count.
- Sticky bottom selection bar for select capability.

### Selection

- Use Star icon for selected image.
- Heart/Like remains separate reaction if kept.
- Selection count respects `selection_limit` when configured.
- If limit reached, show clear message and prevent extra selection server-side.

### Lightbox

- Fullscreen image.
- File name visible.
- Star/select button primary.
- Note/comment field if allowed.
- Prev/next keyboard and swipe.
- View-only mode has no select/note/download actions.

## Acceptance

- Public page no longer displays square-only grid.
- View-only link cannot select even if client manipulates UI.
- Select link can select and note only through valid capability.
- 415-image album remains scrollable and responsive.
