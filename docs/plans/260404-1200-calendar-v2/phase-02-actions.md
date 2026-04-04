# Phase 02: API Layer & RBAC Logics

Status: ⬜ Pending

## Objective

Tạo các functions server actions xử lý hợp nhất queries và kiểm soát quyền Application-level dựa vào user profile thay vì RLS.

## Requirements

### Functional

- [ ] Chèn App-Level RBAC bằng logic code (LƯU Ý QUAN TRỌNG: `withAuth` gọi `createAdminClient` nên sẽ bypass RLS của Database. Toàn bộ logic Filter và phân quyền phải được handle bằng code trong Action action):
  - `admin`, `manager`: Xem được toàn bộ Lịch của Studio, Có quyền Sửa/Xoá toàn bộ sự kiện. Được quyền tạo `schedule` mảng riêng biệt cho bất kỳ ai.
  - `sale`, `media`: Xem được toàn bộ Lịch của Studio (để canh lịch). Chỉ gán `editable = true` khi event thuộc quyền sở hữu của mình (`employee_id === my_id` hoặc task được `assigned_to === my_id`). **Được tạo `schedule` nội bộ chỉ cho chính mình, không được tạo cho người khác.**
- [ ] Drag/Drop Target Logic - NẾU Kéo Thả Xảy Ra:
  - Nếu `source === 'schedule'`, update field `event_date`. NẾU `end_date` có giá trị, BẮT BUỘC shift `end_date` đi một khoảng thời gian `deltaMs` (số miliseconds lệch biệt giữa newDate và oldDate).
  - Nếu `source === 'task'`, update field `deadline`.
  - Nếu `source === 'contract_event'` hoặc `source === 'google'`, MUST THROW ERROR "Không thể dời lịch sự kiện cấu trúc/Google".

## Implementation Steps

1. [ ] Viết hàm `fetchCalendarEvents` trả về đúng struct `UnifiedCalendarEvent`.
2. [ ] Viết Server Actions `updateDragDropDate(id, source, isoDate)` bắt đúng logic của DragTarget bên trên.

## Files to Create/Modify

- `app/actions/calendar-queries.ts`
- `app/actions/calendar-mutations.ts`
