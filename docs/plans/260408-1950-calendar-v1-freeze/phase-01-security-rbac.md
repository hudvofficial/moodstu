# Phase 01: Security Validation & RBAC
Status: ✅ Complete
Dependencies: None

## Objective
Harden toàn bộ module Server Actions bằng Zod Schema (đã có sẵn trong package.json). Bắt exception một cách gọn gàng trong khối `withAuth` để frontend nhận được error object chuẩn.

## Requirements
### Functional
- [ ] Import `z` từ `zod` và tạo các Schema.
- [ ] Validate đủ các field: uuid/id khống chế non-empty, enum `source`, kiểu datetime hợp lệ, `title` trim, `employee_id`, `assigned_to`, `status`, `deadline`, `color_id`.
- [ ] Zod `parse` gọi trực tiếp bên trong `withAuth`. Nếu nó throw Exception, cơ chế bắt Exception có sẵn từ `withAuth` sẽ tự biến nó thành `ActionResult` type (`{ success: false, error }`).

## Implementation Steps
1. [ ] Cập nhật `app/actions/calendar-mutations.ts`: Validate Zod đầy đủ tại các hàm `updateDragDropDate`, `createCalendarEvent`, `updateCalendarEvent`, `deleteCalendarEvent`.
2. [ ] Cập nhật `app/actions/calendar-task-actions.ts`: Validate Zod đầy đủ tại `assignCalendarTask`, `checkEmployeeAvailability`, `updateCalendarTaskDetails`.
3. [ ] Bổ sung check quyền `ROLE_PERMISSIONS` vào hàm `checkGoogleCalendarStatus` ở `app/actions/calendar-queries.ts`. 

## Files to Create/Modify
- `app/actions/calendar-mutations.ts`
- `app/actions/calendar-task-actions.ts`
- `app/actions/calendar-queries.ts`

## Test Criteria
- Cố tình truyền `title` chỉ toàn space sẽ bị báo lỗi.
- Validation bắt được các UUID rác. Cấu trúc error văng ra vẫn tuân thủ Type `{ success: false, error: ... }`.
- Next Context: Sau khi parse ok payload từ Client gọi tới server, tiến sang [Phase 02](./phase-02-google-two-way-sync.md) để vá lỗi sync data Google.

---
Next Phase: [Phase 02](phase-02-google-two-way-sync.md)
