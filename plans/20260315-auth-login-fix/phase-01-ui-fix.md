# Phase 01: UI Stabilization

## Objective
Sửa lỗi text bị ép dọc, nút bị biến dạng và đảm bảo trang Login linh hoạt (responsive) trên Mobile/Desktop.

## Implementation Steps
1. [ ] **Container Fix:** Sửa lại cấu hình Flex/Grid tại `app/login/page.tsx` để text không bị bóp nghẹt.
2. [ ] **Width Constraints:** Áp dụng `w-full` và `max-w` chuẩn cho các khối Brand và Form.
3. [ ] **Mobile Scroll:** Loại bỏ `overflow-hidden` gây khó chịu khi dùng bàn phím ảo trên điện thoại.
4. [ ] **Component Sync:** Đồng bộ lại `Input` và `Button` shared để không phá layout trang.

## Files to Modify
- `app/login/page.tsx`
- `components/ui/input.tsx`
- `components/ui/button.tsx`

## Test Criteria
- [ ] Ảnh nền Unsplash hiện đúng (đã fix config).
- [ ] Text không bị xếp dọc trên màn hình iPhone SE (375px).
- [ ] Nút "Đăng nhập" luôn chiếm trọn bề ngang Form.
