# Phase 02: RBAC Assign Logic
Status: ✅ Complete
Dependencies: phase-01-database-stats.md

## Objective
Cho phép Sale tự điều hướng uỷ quyền quản lí Lead của mình. Chỉnh sửa logic chặn việc Sale update dữ liệu. Tái định vị uỷ quyền cho biến employeeId từ object sang dạng parameter logic.

## Requirements
### Functional
- [x] Sale được gán lead tự động có quyền từ chối (bán lead/nhả lead). Điều chỉnh quyền cho phép mutate dữ liệu về giá trị `null`.
- [x] Bổ sung đoạn mã bypass: `if (role === "sale" && parsed.data.employeeId === null && oldData.assigned_to === employee.id)` -> accept.

## Implementation Steps
1. [x] Cập nhật file `lead-lifecycle.ts`, hàm `assignLead`.
2. [x] Bổ sung đoạn mã bypass: `if (role === "sale" && parsed.data.employeeId === null && oldData.assigned_to === employee.id)` -> accept.

## Files to Create/Modify
- `app/actions/lead-lifecycle.ts`

---
Next Phase: phase-03-frontend-swr.md
