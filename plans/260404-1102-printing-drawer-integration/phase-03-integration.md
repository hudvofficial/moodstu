# Phase 03: State Integration & Final Polish

Status: ⬜ Pending
Dependencies: Phase 02

## Objective

Tối ưu hóa hành vi quản lý state, scroll khóa nền, và tiến hành kiểm tra linter chặt chẽ để đảm bảo không bị gián đoạn logic Create/Update của Printing Module ban đầu.

## Implementation Steps

1. [ ] Kiểm tra cơ chế `onSaved` và `onStatusChange` từ `printing-list-page.tsx`, xác nhận không có sự cố đóng mở Drawer khi state mẹ Component cập nhật (Sử dụng `<PrintingDetailDrawer>` ngoài cùng list orders loop).
2. [ ] Cấu hình Title Badge (`titleBadge`) của Drawer: Hiển thị `<Badge variant="...">` với Trạng Thái Đơn In kế bên `title` ("Tạo đơn in mới" hoặc "Sửa đơn in").
3. [ ] Chạy linter `npx tsc --noEmit` sau khi rename và refactor các props.
4. [ ] Thực thi Gateway `before-edit` checklist và chạy Browser Agent Audit UI so sánh Mobile vs Desktop.

## Test Criteria

- [ ] Form tạo hoá đơn và Lưu đơn thực thi ổn định, tự động đóng Drawer.
- [ ] TypeScript check thông qua hoàn toàn.
- [ ] UX tương tác đạt Gold Standard.

---

End of Plan.
