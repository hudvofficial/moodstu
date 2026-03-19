# Phase 01: Grid Foundation Setup
Status: ⬜ Pending

## Objective
Thiết lập bộ khung Grid "bất biến" cho trang Login, thay thế cho các lớp Flex-col lồng nhau hiện tại.

## Requirements
- [ ] Container chính sử dụng `display: grid`.
- [ ] Chia cột cố định trên Desktop (LG+): 60% Image / 40% Form (hoặc tỉ lệ tương đương).
- [ ] Đảm bảo Form column có `min-width: 320px`.

## Implementation Steps
1. [ ] Sửa file `app/login/page.tsx`: Thay đổi lớp `flex` của container bao ngoài thành `grid lg:grid-cols-5`.
2. [ ] Thiết lập `col-span-3` cho phần Ảnh bìa (Left side).
3. [ ] Thiết lập `col-span-2` cho phần Form (Right side).
4. [ ] Khóa chiều ngang cho Form Content bằng `max-w-[420px]` và `w-full`.

## Files to Modify
- `app/login/page.tsx`

## Test Criteria
- [ ] Giao diện không đổi trên Desktop nhưng cấu trúc HTML dùng Grid.
- [ ] Kiểm tra Inspect Tool thấy các "ngăn" Grid đã được phân chia rõ ràng.
