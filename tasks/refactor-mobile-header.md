# Plan: Refactor Mobile Header & Tab Nav (Linked State)
Created: 2026-03-18T02:45
Status: ✅ Complete

## Overview
Tối ưu hóa UI/UX cho phần Header và Tab Navigation trên phiên bản Mobile của Contract Detail. Loại bỏ việc hardcode kích thước bằng JS (56px) và áp dụng "Linked State" pattern để xử lý triệt để lỗi Header chồng đè (overlap) lên Tab Navigation khi người dùng scroll, sử dụng CSS variables và trạng thái component cha. Điều này sẽ giúp App tránh được độ trễ lag, tự nhiên và mượt mà hơn.

## Tech Stack
- Frontend: Next.js, React, TailwindCSS
- Concept: Linked State, CSS Variables, Native Sticky Position

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Chuẩn hóa Design System (CSS) | ✅ Complete | 100% |
| 02 | Hoist (Đẩy lên) State Quản Lý Scroll | ✅ Complete | 100% |
| 03 | Áp dụng UI Thích Ứng Mượt | ✅ Complete | 100% |

---

## Chi tiết các Phase xử lý:

### Phase 01: Chuẩn hóa Design System (CSS)
Status: ✅ Complete
- **Mục tiêu:** Tách giá trị kích thước và các tiện ích (utilities) lặp lại ra khỏi JSX, gom thành Rule gốc.
- **Công việc:**
  - [x] Mở file `app/design-system.css`.
  - [x] Khai báo biến CSS toàn cục: `--header-mobile-h: 56px;`.
  - [x] Khai báo Token Class `.btn-icon` chứa tất cả CSS cho cụm nút như `<ArrowLeft>` hay `<MoreHorizontal>` (vd: 40x40, rounded-full, hover, v.v...).

### Phase 02: Hoist (Đẩy lên) State Quản Lý Scroll
Status: ✅ Complete
- **Mục tiêu:** Quản lý tập trung một trạng thái Ẩn/Hiện `isMobileHeaderVisible` chung cho tất cả component cần điều hướng theo. 
- **Công việc:**
  - [x] Xóa bỏ logic `addEventListener("scroll")` đang độc lập ở trong `components/contracts/detail/top-action-bar.tsx`.
  - [x] Mở component cha `components/contracts/detail/contract-detail-client.tsx` để cài đặt sự kiện "scroll" chung, định nghĩa state `isMobileHeaderVisible`.
  - [x] Truyền props `headerVisible={isMobileHeaderVisible}` xuống cho `TopActionBar`.
  - [x] Truyền props `headerVisible={isMobileHeaderVisible}` xuống cho `MobileTabNav`.

### Phase 03: Áp dụng UI Thích Ứng Mượt
Status: ✅ Complete
- **Mục tiêu:** Cập nhật lại HTML class để sử dụng Native Sticky Position và CSS transition mượt mà.
- **Công việc:**
  - [x] Trong `TopActionBar`, update class để dùng `h-[var(--header-mobile-h)]` thay cho `h-14` + clean up class `.btn-icon`.
  - [x] Trong `MobileTabNav`, thiết lập CSS sao cho: nếu `headerVisible == true` thì `top-[var(--header-mobile-h)]`, còn nếu `false` thì `top-0` (để trượt mượt áp sát gốc).
  - [x] Check và clean up lại các style còn lặp lại của Tab Nav đảm bảo tuân thủ thiết kế Sticker Design phẳng không shadow.
  
## Quick Commands
- Bắt đầu: `/code phase-01`
- Check progress: `/next`
