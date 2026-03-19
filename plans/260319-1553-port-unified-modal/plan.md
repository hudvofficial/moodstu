# Plan: Port V1 UnifiedModal → V2 (System-Wide)
**Tạo:** 2026-03-19 16:00  
**Cập nhật:** 2026-03-19 17:01  
**Status:** 🟡 Phase D — Performance Fix

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
| A | Foundation & Infrastructure | ✅ Done | `modal-portal.tsx`, `hooks/useEscape.ts`, `unified-modal.tsx` |
| B | Mobile UX (Bottom Sheet + Swipe) | ✅ Done | `unified-modal.tsx`, `hooks/useSwipeDismiss.ts`, `pages.css` |
| C | API Enhancement (Size + Footer + A11y) | ✅ Done | `unified-modal.tsx` |
| D | Performance Fix (partial) | ✅ Done | `unified-modal.tsx` |
| **E** | **Nuclear Perf Fix** | ⬜ Pending | `unified-modal.tsx`, `pages.css`, `CustomerFormModal.tsx` |

## 🚨 Phase D — Performance Fix (MỚI)

**Vấn đề:** Modal sau Phase A+B+C lag hơn trước khi triển khai.

### Audit Results (từ brainstorm + code comparison)

**Root causes đã xác nhận:**

| Cause | Evidence | Fix |
|-------|----------|-----|
| C3 auto-focus `useEffect` | Không có trong V1/Coffee/original V2 | Xóa useEffect (giữ Tab cycling) |
| Animation 300ms (slide-up) | Original V2 = 200ms, V1 Coffee cũng tương tự | `animationDuration: '200ms'` inline |
| Scroll lock — scrollbar shift | Desktop Windows: scrollbar 15px biến mất khi lock | `padding-right: scrollbarWidth` |

**NOT causes (đã loại):**
- `useSwipeDismiss` — trivial computation, no async
- `ModalPortal` — đã fix (typeof document check, instant)
- `isClosing` delay — intentional (close animation)

### Reference Comparison
- V1 Moodstudio `webapp/components/ui/UnifiedModal.tsx` — **không có auto-focus**, scroll lock giống nhau
- mcoffe `src/components/ui/Modal.tsx` — **không có scroll lock**, không có auto-focus, 44 lines
- Git snapshot: `7d76dc2` (có thể rollback nếu cần)

### Implementation Plan

**D1: Xóa C3 auto-focus useEffect** (lines 94-102)
```tsx
// XÓA BLOCK NÀY:
React.useEffect(() => {
  if (!isOpen) return;
  const el = dialogRef.current;
  if (!el) return;
  const firstFocusable = el.querySelector<HTMLElement>(...)
  firstFocusable?.focus();
}, [isOpen]);
// GIỮ LẠI: handleTabKey (Tab cycling)
```

**D2: animationDuration 200ms** (modal card inline style)
```tsx
style={{
  maxWidth: MAX_WIDTH_MAP[size],
  marginLeft: "auto",
  marginRight: "auto",
  animationDuration: "200ms",   // ← THÊM
  ...swipeStyle,
}}
```

**D3: Scroll lock — compensate scrollbar width**
```tsx
React.useEffect(() => {
  if (!isOpen) return;
  const scrollY = window.scrollY;
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }
  return () => {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
    window.scrollTo(0, scrollY);
  };
}, [isOpen]);
```

### Files thay đổi
- `components/ui/unified-modal.tsx` — 3 thay đổi nhỏ

### Acceptance Criteria
- [ ] Modal mở không có keyboard popup (mobile)
- [ ] Modal mở không có page shift (desktop Windows)
- [ ] Animation cảm giác nhanh, snappy (~200ms)
- [ ] Swipe-to-dismiss vẫn hoạt động
- [ ] Tab cycling vẫn hoạt động
- [ ] Closing animation vẫn smooth

## Quick Commands
- Phase D: `/code`
- Rollback nếu cần: `git checkout 7d76dc2 -- components/ui/unified-modal.tsx`
