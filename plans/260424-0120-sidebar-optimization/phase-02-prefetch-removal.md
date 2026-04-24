# Phase 02: Vô hiệu hóa Prewarm Data
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Chặn hoàn toàn tình trạng gọi Server Actions bừa bãi khi hover hoặc khi route thay đổi để tránh quá tải Server.

## Requirements
### Functional
- [ ] Gỡ bỏ hàm `warmRoute` trong `sidebar.tsx`.
- [ ] Dọn dẹp hoặc tạm vô hiệu hóa hoàn toàn nội dung hàm `prewarmRouteData` trong `lib/navigation-data-prefetch.ts`.

### Non-Functional
- [ ] Performance network được giải phóng hoàn toàn khi lướt chuột qua menu.

## Implementation Steps
1. [x] Mở `components/layout/sidebar.tsx` và xóa hàm `warmRoute` (kể cả trong thẻ `<Link>` trang dashboard).
2. [x] Mở `lib/navigation-data-prefetch.ts` và chuyển nội dung hàm `prewarmRouteData` thành rỗng (chỉ return sớm để không phá vỡ import nếu có ở đâu khác gọi tới).

## Files to Create/Modify
- `components/layout/sidebar.tsx`
- `lib/navigation-data-prefetch.ts`

## Test Criteria
- [x] Mở tab Network trong F12, lướt chuột qua tất cả các menu, không có POST request nào bị bắn lên server.

---
Next Phase: Hoàn thành
