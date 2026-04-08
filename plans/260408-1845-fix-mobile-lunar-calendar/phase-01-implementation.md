# Phase 01: Cập nhật Component
Status: ⬜ Pending

## Objective
Sửa triệt để 2 lỗi UI/UX theo báo cáo Audit: Thiếu lịch Âm trên grid Mobile và icon Header quá mỏng.

## Requirements
### Functional
- [ ] Mobile Grid phải hiện ngày Âm chuẩn xác, đồng bộ với logic của Desktop (`getLunarDate`).
- [ ] Sự kiện mùng 1 Âm lịch cần được tô đậm.

### UI/UX (Non-Functional)
- [ ] Icon trên mobile toolbar phải dày dạn, rõ ràng (`strokeWidth: 2.5`).
- [ ] Kích thước icon tăng nhẹ lên `w-7 h-7` (28px) để nổi bật.

## Implementation Steps
1. [ ] Sửa file `mobile-month-grid.tsx`
   - Import `getLunarDate, formatLunarShort, isLunarNewMonth`.
   - Tính toán lịch âm trong hàm map theo vòng lặp ngày.
   - Hiển thị element chứa `lunarText` cạnh ngày Dương.
2. [ ] Sửa file `calendar-toolbar.tsx`
   - Tùy chỉnh prop của `SlidersHorizontal` và `RefreshCcw`: `className="w-7 h-7" strokeWidth={2.5}`.

## Files to Modify
- `components/calendar/views/mobile-month-grid.tsx`
- `components/calendar/calendar-toolbar.tsx`

## Test Criteria
- [ ] Mở chế độ Responsive Mobile trên browser:
  - Thấy hiển thị đúng ngày âm bên góc chữ số (ví dụ: `(1/3)`).
  - Nút Âm/Dương và Filter trông đậm đà và to hơn.

---
Next Phase: Hoàn thành (Lưu Review)
