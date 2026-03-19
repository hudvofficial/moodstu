# Phase 08: Team Media Management

**Status:** 🟡 Stitch Done (2/2 screens)
**Dependencies:** Phase 04 (Contracts), Phase 02 (Database)
**Est.:** 1.5 days

## Objective

Module quản lý team chụp ảnh/quay phim/makeup. Assign job cho từng HĐ, task tracking (todo → doing → done), workload dashboard.

## Implementation Steps

- [ ] DB: Bảng `work_progress` (contract_id, assigned_to, task_type, status, deadline)
- [ ] CRUD tasks theo contract
- [ ] Assign nhân viên vào task (dropdown team media)
- [ ] Kanban board view (todo/doing/done) — dùng @dnd-kit nếu cần
- [ ] Task status badges + deadline alerts
- [ ] Workload dashboard: ai đang bận, ai rảnh
- [ ] Filter theo nhân viên, loại task, trạng thái
- [ ] Notifications khi được assign task mới

## Key Logic (từ v1)
- Task types: Chụp hình, Chỉnh ảnh, Makeup, Quay phim, Thiết kế album
- Status flow: Chưa làm → Đang làm → Hoàn thành
- Conflict check: 1 người không nhận 2 job cùng ngày

## Test Criteria
- [ ] Tạo/sửa/xoá task OK
- [ ] Assign task hiển thị đúng người
- [ ] Workload dashboard tính đúng số job/người
- [ ] Filter hoạt động đúng

---
**Next Phase:** → Phase 09 (Calendar)
