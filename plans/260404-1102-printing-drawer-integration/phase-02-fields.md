# Phase 02: Responsive Grid & Sticky Footer

Status: ⬜ Pending
Dependencies: Phase 01

## Objective

Tổ chức lại cách hiển thị các TextField (Ngày hẹn, Lab, Hạng mục) bên trong layout dạng dọc của Drawer, và đưa các nút Action thành sticky footer luôn nằm ở đáy màn hình Drawer.

## Implementation Steps

1. [ ] Kiểm tra các lưới CSS Grid e.g. `form-grid-2col`, đảm bảo nó xuống dòng (stack) trên màn Mobile (1 cột) và chia 2 cột trên Desktop bên trong Drawer.
2. [ ] Thay đổi cách render `<div className="form-actions">` cũ (chơi theo prop footer của UnifiedModal) sang việc để nhóm div này làm node con ở cuối `<Drawer>` nhưng dùng CSS định vị để nó luôn bám đáy (Sticky Bottom/Absolute). _Lưu ý Drawer nội bộ đã có `flex-1 overflow-y-auto`, ta có thể bọc Children bằng phần tử flex column._
3. [ ] Cân chỉnh padding (px-5, py-4) để khu vực "Hạng Mục In" (sản phẩm, quy cách) không bị chật.
4. [ ] Chuẩn hoá thẻ Text: Thay thế thẻ Order Code (e.g., `text-h2`) sang UI Token của Drawer (e.g., Badge trạng thái in ấn).

## Files to Modify

- `components/printing/printing-detail-drawer.tsx` - Thiết lập layout internal form

## Test Criteria

- [ ] Khu vực Điền form (chi tiết hạng mục in) có thể scroll mượt mà.
- [ ] Các cụm Nút (Button tạo mới, Update, Xóa, Bắt đầu in) luôn ghim cứng tại đáy Drawer, dễ dàng bấm ngay cả khi Form đang scroll tít ở trên.

---

Next Phase: [Phase 03](phase-03-integration.md)
