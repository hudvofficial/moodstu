# Phase 01: Frontend UI Cập nhật DraggableEvent & CalendarEventCard
Status: ⬜ Pending

## Objective
Áp dụng mã màu chuẩn của Google Calendar vào thẻ sự kiện, dạng nền đen/màu sẫm chữ trắng. Ẩn thông tin nhân sự và nhãn phụ (groupLabel) trên thẻ nếu sự kiện đó thuộc Google.

## Requirements
### Functional
- [ ] Thẻ sự kiện (`DraggableEvent`) trên Lưới Lịch nếu từ Google thì luôn màu nền (background-color) đặc, nếu bị miss mã thì xài mặc định `#039be5`. Chữ màu `#ffffff` (Solid Style).
- [ ] Ẩn div/span chứa EmployeeName và GroupLabel trên `DraggableEvent` nếu `source === "google"`.
- [ ] (Tùy chọn) Ẩn tương tự trên khung `CalendarEventCard` nếu xem ở danh sách dọc.

## Implementation Steps
1. [ ] Mở file `components/calendar/views/draggable-event.tsx`.
2. [ ] Điều chỉnh hằng số `isGoogleColored` và `googleStyle` thành ép hiển thị cho Google event (fallback hex fallback nểu null trả về `#039be5`).
3. [ ] Chặn render `{event.employeeName}`/ `{event.groupLabel}` nều `event.source === 'google'`.
4. [ ] Mở file `components/calendar/calendar-event-card.tsx` bọc các khúc render chi tiết phụ (`event.employeeName`, `event.groupLabel`) trong điều kiện `if (event.source !== "google")`.

## Files to Create/Modify
- `components/calendar/views/draggable-event.tsx` - [Theme UI thẻ Google & Logic ẩn]
- `components/calendar/calendar-event-card.tsx` - [Logic ẩn detail]

## Test Criteria
- [ ] Event trên G-Calendar được hiển thị nền y như Google, chữ Trắng nổi bật, viền trái đậm.
- [ ] Thẻ Google Event gáy gọn (chỉ còn Title).
- [ ] Các thẻ Internal/Task bình thường không bị ảnh hưởng.

---
Next Phase: `/code phase-02`
