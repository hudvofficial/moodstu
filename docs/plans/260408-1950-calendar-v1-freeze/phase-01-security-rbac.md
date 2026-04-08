# Phase 01: Security Validation & RBAC
Status: ✅ Complete
Dependencies: None

## Objective
Harden toàn bộ module Server Actions bằng Zod Schema (đã có sẵn trong package.json). Bắt exception một cách gọn gàng trong khối `withAuth` để frontend nhận được error object chuẩn.

## Requirements
### Functional
- [x] Import `z` từ `zod` và tạo các Schema.
- [x] Validate đủ các field: `title` trim min(1), `event_date`/`end_date` ISO date, `employee_id` min(1), `color_id`, `sync_to_google`, `source` enum, `status`, `deadline`.
- [x] Zod `parse` gọi trực tiếp bên trong `withAuth`. Nếu nó throw Exception, cơ chế bắt Exception có sẵn từ `withAuth` sẽ tự biến nó thành `ActionResult` type (`{ success: false, error }`).

## Implementation Steps
1. [x] Cập nhật `app/actions/calendar-mutations.ts`: Validate Zod đầy đủ tại các hàm `updateDragDropDate`, `createCalendarEvent`, `updateCalendarEvent`, `deleteCalendarEvent`.
2. [x] Cập nhật `app/actions/calendar-task-actions.ts`: Validate Zod đầy đủ tại `assignCalendarTask`, `checkEmployeeAvailability`, `updateCalendarTaskDetails`.
3. [x] Bổ sung check quyền `ROLE_PERMISSIONS` vào hàm `checkGoogleCalendarStatus` ở `app/actions/calendar-queries.ts`.

## RBAC Matrix — `assignCalendarTask`

| Scenario | Admin/Manager | Sale/Media |
|----------|:---:|:---:|
| Task unassigned → assign to self | ✅ Allow | ✅ Allow |
| Task unassigned → assign to other | ✅ Allow | ❌ L55-57 blocks |
| Task assigned to me → keep | ✅ Allow | ✅ Allow |
| Task assigned to someone else → steal | ✅ Allow | ❌ L52-54 blocks |
| Task assigned to someone else → reassign | ✅ Allow | ❌ L52-54 blocks |

## RBAC Matrix — `updateCalendarTaskDetails`

| Scenario | Admin/Manager | Sale/Media |
|----------|:---:|:---:|
| Edit own task status/deadline | ✅ Allow | ✅ Allow |
| Edit other's task | ✅ Allow | ❌ L176-178 blocks |
| Reassign via assigned_to field | ✅ Allow | ❌ L184-186 blocks |

## ⚠️ Known Limitation
- ID fields dùng `z.string().trim().min(1)`, **không dùng** `z.uuid()`. Bắt được empty/space string nhưng **không** bắt invalid UUID format (VD: `"abc"` vẫn pass validation, sẽ return empty result từ DB query). Google event ID không phải UUID nên `z.uuid()` không phù hợp cho eventId chung.

## Files Modified
- `app/actions/calendar-mutations.ts`
- `app/actions/calendar-task-actions.ts`
- `app/actions/calendar-queries.ts`

## Test Criteria
- [x] Cố tình truyền `title` chỉ toàn space sẽ bị báo lỗi.
- [x] Validation bắt empty/space ID nhờ `z.string().trim().min(1)`.
- [x] Non-admin assign task người khác → reject.
- [x] Non-admin steal task → reject.

---
Next Phase: [Phase 02](phase-02-google-two-way-sync.md)
