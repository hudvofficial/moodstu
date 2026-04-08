# Phase 03: Timezone & Linting
Status: ✅ Complete
Dependencies: Phase 02

## Objective
Xóa sổ mọi string manipulation làm sai ngày giờ Local. Khắc phục cảnh báo dependency React tuyệt đối bằng standard implementation (không tắt Eslint).

## Requirements
### Functional
- [x] Frontend phải parse và format Date bằng engine an toàn của `date-fns` (giờ local của máy trạm). Không có hiện tượng rớt timezone.
- [x] Không còn warning hay error nào trên file `day-view.tsx`.

## Implementation Steps
1. [x] **Chữa Lệch Múi Giờ (`event-form-drawer.tsx`)**: 
   - Hàm `formatDatetimeLocal`: Chuyển sang sử dụng `format(date, "yyyy-MM-dd'T'HH:mm")`.
   - Tìm cả các fallback date local trong form (ví dụ: `new Date().toISOString().split("T")[0]`) -> Thay bằng fallback `format` luôn.
2. [x] **Fix Lint (`day-view.tsx`)**: 
   - Khai báo hằng số global ngoài component: `const EMPTY_EVENTS: UnifiedCalendarEvent[] = [];`
   - Tái cấu trúc phép gán: `const allEvents = eventsByDate.get(dateIso) ?? EMPTY_EVENTS;`
   - TUYỆT ĐỐI không dùng comment `// eslint-disable...` trên mã nguồn này để phớt lờ cảnh báo dependency hook!.

## Files to Create/Modify
- `components/calendar/drawers/event-form-drawer.tsx`
- `components/calendar/views/day-view.tsx`

## Test Criteria
- Cập nhật Data xong không bị nhảy (Ví dụ: tạo event 08h00, lưu xong, DB vẫn phản hồi về trả 08h00 - test cẩn thận).
- Output command `npx eslint` qua list file không nhắc đến `day-view.tsx` nữa.

---
Next Phase: [Phase 04](phase-04-testing.md)
