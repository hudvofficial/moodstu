# Phase 01: Gỡ bỏ Pending State trong Sidebar
Status: ⬜ Pending

## Objective
Dọn dẹp component `sidebar.tsx`, loại bỏ các thao tác re-render không cần thiết và các logic event rườm rà.

## Requirements
### Functional
- [ ] Sidebar vẫn hiển thị đúng item đang active (sử dụng `usePathname`).
- [ ] Xóa bỏ state `pendingHref` và các biến liên quan.
- [ ] Chuyển trang bình thường bằng component `<Link>` gốc của Next.js.

### Non-Functional
- [ ] UI không bị giật/khựng ngay tại lúc click do re-render.

## Implementation Steps
1. [x] Xóa state `pendingHref` trong `components/layout/sidebar.tsx`.
2. [x] Xóa hàm `markPending`.
3. [x] Gỡ bỏ các event `onPointerEnter`, `onFocus`, `onClick` từ thẻ `<Link>`.
4. [x] Xóa phần CSS highlight dựa trên `isPending`.

## Files to Create/Modify
- `components/layout/sidebar.tsx`

## Test Criteria
- [x] Click vào menu chuyển trang mượt mà.
- [x] Bấm vào item thì highlight chuyển đổi tự nhiên theo URL mà không chớp.

---
Next Phase: Phase 02 Prewarm Removal
