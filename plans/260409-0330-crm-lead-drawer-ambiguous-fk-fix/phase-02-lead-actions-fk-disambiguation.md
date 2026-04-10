# Phase 02: Khắc phục Ambiguous FK
Status: ⬜ Pending
Dependencies: phase-01-auth-utils-error-handler.md

## Objective
Bảng `crm_leads` đang giữ hai Foreign Keys chĩa về bảng `employees` (là `assigned_to` và `created_by`). Vì vậy cú pháp lấy nhân viên gán (assigned employee) thông qua `.select("*, employees(...)")` gây ra lỗi nhầm lẫn quan hệ (Ambiguous FK Error 400).

## Requirements
### Functional
- [ ] Sửa lại câu query trong `getLeadById`.
- [ ] Disambiguate cột được nhắm tới bằng cách báo rõ FK muốn xài là `assigned_to`.

### Non-Functional
- [ ] Viết lại tên bí danh (alias) trong select field thành `employees` để tương thích cấu trúc của object trên UI.

## Implementation Steps
1. [ ] Mở file `app/actions/lead-actions.ts`.
2. [ ] Tìm đến hàm `getLeadById`.
3. [ ] Sửa `.select("*, employees(id, full_name)")` thành `.select("*, employees!assigned_to(id, full_name)")`.

## Files to Create/Modify
- `app/actions/lead-actions.ts` - Fix lại PostgREST query cho getLeadById

## Test Criteria
- [ ] Test lại thao tác nhấp mở cái Drawer lên. Drawer không còn báo "Loi server" hay lỗi fetch nữa mà ra đúng thông tin Lead.

---
Next Phase: phase-03-testing.md
