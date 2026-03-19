# Plan: Port V1 UnifiedModal → V2 (System-Wide)
**Tạo:** 2026-03-19 16:00
**Status:** 🟡 Pending

## Nguyên tắc thiết kế
> **Contracts module là nơi đặt chuẩn — toàn hệ thống kế thừa.**
> UnifiedModal sau khi fix sẽ là shared component cho TẤT CẢ modules: Finance, CRM, Customers, Inventory, Settings...
> Không hardcode, không inline, không viết lại ở mỗi nơi.

## Source
- V1 reference: `C:\Users\Admin\Desktop\Ai\0Moodstudio\webapp\components\ui\UnifiedModal.tsx`
- V2 target: `components/ui/unified-modal.tsx`
- Design spec: `plans/stitch-master-brief.md` Section 3.3

## V2 Tiêu chí (từ stitch-master-brief §3.3)
- **Mobile:** Full-screen bottom sheet, slide-up animation
- **Desktop:** Center modal, max-width 640px, scale-in animation

## Phases

| Phase | Tên | Status | Files |
|-------|-----|--------|-------|
| A | Foundation & Infrastructure | ⬜ Pending | 2 files mới + 1 sửa |
| B | Mobile UX (Bottom Sheet + Swipe) | ⬜ Pending | unified-modal.tsx |
| C | API Enhancement (Size + Footer + A11y) | ⬜ Pending | unified-modal.tsx |

## Quick Commands
- Phase A: `/code phase-A`
- Phase B: `/code phase-B`
- Phase C: `/code phase-C`
