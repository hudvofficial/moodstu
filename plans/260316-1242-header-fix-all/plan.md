# Plan: Header Fix All
Created: 2026-03-16T12:42
Status: 🟡 In Progress

## Vấn đề
Header V2 quá minimal (66 lines) vs V1 (200 lines, rich features).
Screenshot cho thấy Title + Bell không hiển thị đúng.
Mobile hoàn toàn không có header (hidden lg:flex).

## Scope — Rebuild header theo V1 logic
### V1 Features cần port:
1. ✅ Title + Subtitle (desktop left)
2. ✅ Mobile: Logo + Centered Title 
3. ✅ Search: Desktop inline, Mobile icon → overlay
4. ✅ Notification bell (cả mobile + desktop)
5. ✅ Scroll hide (mobile only) — useScrollDirection
6. ❌ Theme toggle (SKIP — V2 chưa có dark mode)
7. ❌ Create button (SKIP — dùng CrmFab + page-level)
8. ❌ Panel toggle (SKIP — không cần)

### Files sửa:
- `components/layout/header.tsx` — Rebuild (Desktop + Mobile)
- `components/layout/app-shell.tsx` — Show header on mobile
- `hooks/use-scroll-direction.ts` — New hook (port V1)

### Constraints:
- Max 250 lines/file
- lucide-react only (NO Material Symbols)
- Design tokens from globals.css
- Inter font, no serif/italic
