# Phase 04: Public Gallery Page (Khách xem + chọn ảnh)
Status: ✅ Complete
Dependencies: Phase 02 ✅, Phase 03 ✅

## Objective
Tạo trang public cho khách — xem ảnh từ Drive, thả tim ❤️ chọn ảnh, không cần đăng nhập

## Implementation Steps

### 1. Route: /gallery/[accessUrl]
- [x] Server component: fetch gallery data → render client component
- [x] Trang public (NO AUTH)
- [x] SEO: dynamic title, robots noindex
- [x] Error state: "Album chưa sẵn sàng"

### 2. PublicGalleryClient (main client component)
- [x] Landing screen: blurred background, album title, "Xem Album" button
- [x] Gallery view: sticky header, photo grid, heart buttons
- [x] Optimistic toggle: toggle ngay UI → DB async → revert nếu fail

### 3. ImageViewer (Full-screen Modal)
- [x] Full-screen slider
- [x] Swipe left/right (mobile touch events)
- [x] Arrow keys + Escape (desktop keyboard)
- [x] Heart toggle button
- [x] Note input (save on blur)
- [x] Image counter (X / Y)
- [x] Big image (sz=s1600 for full-screen)

### 4. SelectionSummary (bottom bar)
- [x] Fixed bottom bar: "Đã chọn X ảnh / Y"
- [x] Only visible when selectedCount > 0
- [x] Backdrop blur

### 5. Middleware Update
- [x] Added `/gallery` to publicRoutes in middleware
- [x] Khách không bị redirect về /login

## Files Created/Modified
- `app/gallery/[accessUrl]/page.tsx` ✅ (NEW — route)
- `components/gallery/public-gallery-client.tsx` ✅ (NEW — ~290 lines)
- `components/gallery/image-viewer.tsx` ✅ (NEW — ~220 lines)
- `components/gallery/selection-summary.tsx` ✅ (NEW — ~50 lines)
- `lib/supabase/middleware.ts` ✅ (MODIFIED — add /gallery public)

## Test Criteria
- [x] TypeScript build: 0 errors
- [x] Dev server chạy OK
- [x] Middleware cho phép /gallery public access
- [ ] Visual test: landing → grid → viewer (cần data thật)
- [ ] Heart toggle: optimistic + DB persist
- [ ] Note save: on blur
- [ ] Swipe mobile + arrow desktop

## Notes
- Landing dùng first image as blurred background, elegant dark theme
- Grid dùng auto-fill minmax(140px, 1fr) cho responsive
- External Drive URLs: dùng <img> tag (not <Image> from next/image)
- Animations: fadeInUp, staggered entry per image

---
Next Phase: phase-05-admin-filter.md
