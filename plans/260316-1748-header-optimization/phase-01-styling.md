# Phase 01: Thiết Kế Layout Header
Status: ⬜ Pending
Dependencies: None

## Objective
Thay đổi Styling của element `<header>` trong `components/layout/header.tsx` để đồng nhất ngôn ngữ thiết kế chung (bỏ border cứng, chuyển sang dùng shadow làm mảng phân cách).

## Requirements
### Functional
- [ ] Giao diện Header đồng bộ với Sidebar hiện tại.
- [ ] Không làm gián đoạn Logic hiển thị các Components con (Title, Filters, User Profile).

### Tiêu Chí Cụ Thể
- Loại bỏ Tailwind CSS class `border-b` và `border-border`.
- Thêm thuộc tính bóng mờ `shadow-(--shadow-sidebar)`.

## Implementation Steps
1. [ ] Mở file `components/layout/header.tsx`.
2. [ ] Sửa lại className của tag `<header>` chính.

## Files to Modify
- `components/layout/header.tsx` - Styling chính cho Header.

## Test Criteria
- [ ] Scroll thử trên trình duyệt (Desktop + Mobile)
- [ ] Xác nhận viền dưới đã mất và khi cuộn phần tử bên dưới sẽ bị shadow của Header chia mảng.
