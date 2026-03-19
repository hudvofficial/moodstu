# Phase 03: Responsive & Mobile Polish
Status: ⬜ Pending

## Objective
Tối ưu hóa Grid cho Mobile và thêm các hiệu ứng mượt mà.

## Requirements
- [ ] Trên Mobile (< 1024px), Grid trở thành 1 cột.
- [ ] Ẩn phần Ảnh bìa trên Mobile để tập trung không gian cho Form.
- [ ] Padding an toàn cho Mobile (`px-6` hoặc `px-8`).

## Implementation Steps
1. [ ] Sử dụng breakpoint `hidden lg:block` cho cột Ảnh bìa.
2. [ ] Đảm bảo Form container chiếm `col-span-5` (full grid) khi ở màn hình nhỏ.
3. [ ] Kiểm tra trạng thái Loading: Loader xoay phải nằm giữa nút, không làm nút biến dạng.

## Files to Modify
- `app/login/page.tsx`

## Test Criteria
- [ ] Mở Chrome DevTools giả lập iPhone SE (320px) -> Giao diện vẫn đọc được tốt, chữ không bị gãy.
- [ ] Nút Đăng nhập bấm được bình thường, không bị icon che mất chữ.
