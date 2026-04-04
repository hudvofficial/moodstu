# Phase 01: Drawer Layout Component Setup

Status: ⬜ Pending
Dependencies: None

## Objective

Thay thế thẻ `<UnifiedModal>` bị giới hạn thành component `<Drawer>` SSOT của hệ thống và giải quyết việc rename component để phản ánh đúng UX design.

## Implementation Steps

1. [ ] Đổi tên file `printing-form-modal.tsx` thành `printing-detail-drawer.tsx` (hoặc tạo file mới và copy sang).
2. [ ] Import `Drawer` từ `@/components/ui/drawer` thay cho `UnifiedModal`.
3. [ ] Chuyển đổi cấu trúc đóng gói của `UnifiedModal` (như thuộc tính `title`, `size`, `footer`) sang cấu trúc của `Drawer` (`title`, `width`, `children`).
4. [ ] Mở rộng Desktop width (e.g. `width="650px"`) trên `<Drawer>` để có không gian chứa lưới Hạng Mục in ấn.

## Files to Create/Modify

- `components/printing/printing-detail-drawer.tsx` - File Drawer mới kế thừa logic.
- `components/printing/printing-list-page.tsx` - Cập nhật import và Component tag từ Modal sang Drawer mới.

## Test Criteria

- [ ] Giao diện form hiển thị Sidebar Panel trên Desktop (1440px).
- [ ] Giao diện form hiển thị Bottom Sheet trên Mobile (375px).
- [ ] Giao diện đóng lại trơn tru khi click ra ngoài Overlay hoặc nhấn nút Đóng.

---

Next Phase: [Phase 02](phase-02-fields.md)
