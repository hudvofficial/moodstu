# Phase A: Foundation & Infrastructure
**Status:** ⬜ Pending
**Dependencies:** Không có

## Objective
Xây dựng nền tảng infrastructure cho UnifiedModal V2:
- Tách portal logic ra file riêng (zero render delay)
- Tạo `useEscape` hook reusable cho toàn hệ thống
- Fix body scroll lock đúng chuẩn iOS/Android
- Thêm props `closeOnBackdrop`, `closeOnEsc` configurable

## Context
V2 hiện tại dùng `useState + useEffect` để tạo portal → 2 render cycles → flicker.
V1 dùng `useRef` lazy init → zero-delay, synchronous.

## Implementation Steps

### A1 — Tạo `components/ui/modal-portal.tsx`
```tsx
// Dựa trên V1 ModalPortal.tsx
// useRef thay vì useState+useEffect → zero render delay
// Portal vào document.body trực tiếp
```
- [ ] Copy logic từ V1 `ModalPortal.tsx`
- [ ] Không tạo thêm wrapper div trong DOM

### A2 — Tạo `hooks/useEscape.ts`
```tsx
// Reusable hook cho toàn app
// Params: onEscape callback + active boolean
// Dùng document.addEventListener (không phải window)
```
- [ ] Copy từ V1 `useEscape.ts`
- [ ] Export named: `export function useEscape(...)`

### A3 — Sửa `components/ui/unified-modal.tsx`: Body Scroll Lock
```tsx
// Thay thế: document.body.style.overflow = 'hidden'
// Thành: lock cả documentElement + body, restore scrollY
const scrollY = window.scrollY
document.documentElement.style.overflow = 'hidden'
document.body.style.overflow = 'hidden'
return () => {
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
  window.scrollTo(0, scrollY)
}
```
- [ ] Fix iOS bounce bug khi mở modal

### A4 — Thêm `closeOnBackdrop` prop (default: true)
- [ ] Backdrop click chỉ close khi `closeOnBackdrop === true`
- [ ] Cần cho confirm dialog (không đóng khi click ngoài)

### A5 — Thêm `closeOnEsc` prop (default: true) + dùng `useEscape` hook
- [ ] Thay thế inline `useEffect` ESC bằng `useEscape(handleClose, closeOnEsc && isOpen)`

## Files

| File | Hành động | Ghi chú |
|------|-----------|---------|
| `hooks/useEscape.ts` | Tạo mới | Reusable cho toàn app |
| `components/ui/modal-portal.tsx` | Tạo mới | Zero-delay portal |
| `components/ui/unified-modal.tsx` | Sửa | A3 + A4 + A5 |

## Test Criteria
- [ ] Mở modal lần đầu không bị flicker
- [ ] ESC key đóng modal
- [ ] `closeOnEsc={false}` → ESC không đóng
- [ ] Click backdrop đóng modal
- [ ] `closeOnBackdrop={false}` → click ngoài không đóng
- [ ] Scroll body bị lock khi modal mở
- [ ] Scroll position được restore khi đóng modal

---
Next: phase-B-mobile-ux.md
