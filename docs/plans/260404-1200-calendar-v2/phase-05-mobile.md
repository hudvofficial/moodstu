# Phase 05: Mobile Drawer Component

Status: ⬜ Pending
Dependencies: Phase 04

## Objective

Mobile chỉ hiển thị Tháng ở dạng gọn. Bấm vào một ngày sẽ mở Bottom Drawer xem danh sách chi tiết các Sự kiện của ngày đó, chuẩn iOS Apple Calendar HIG.

## Requirements

### Functional

- [ ] Responsive Component ẩn Month-Grid phức tạp ở `< 1024px`. Render custom lưới ngày rút gọn cực kỳ nhỏ theo dạng số cho Mobile.
- [ ] Dùng `components/ui/drawer` (Shadcn/Drawer chuẩn của dự án) để trượt Bottom Sheet.
- [ ] Bên trong Drawer là danh sách phẳng `UnifiedCalendarEvent[]` của chính ngày vừa click.

### Non-Functional

- [ ] Trải nghiệm vuốt chạm: Tránh sự kiện chặn Swipe Down để scroll lưới. Cần tuning Snap point của Drawer chuẩn xác.

## Implementation Steps

1. [ ] Viết `components/calendar/drawers/day-drawer.tsx`.
2. [ ] Viết `components/calendar/views/mobile-month-grid.tsx` (hoặc tái sử dụng Month-Grid nhưng CSS breakpoints thu gọn).
3. [ ] Cắm List Event Card vào Day Drawer.

## Files to Create/Modify

- `components/calendar/drawers/day-drawer.tsx`
- `components/calendar/calendar-event-card.tsx` (Sử dụng chung bản Responsive nếu có thể)

---

Next Phase: Phase 06 - Mutations & Event Details (UI)
