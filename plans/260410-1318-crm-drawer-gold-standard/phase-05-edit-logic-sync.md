# Phase 05: Đồng bộ kiến trúc Sửa (Edit Logic) Lead vs Customer
Status: ✅ Complete

## Objective
Xử lý lỗi nghiêm trọng từ kết quả Audit: Nút "Sửa" trong `LeadDetailDrawer` bị liệt do bị comment code, đồng thời chuẩn hoá kiến trúc Modal Sửa (Encapsulation) và tối ưu Mutation (tránh `router.refresh`).

## Requirements
### 1. Component Encapsulation (Chuẩn hoá cấu trúc Modal)
- **Edit Modal (Bên trong Drawer):** Bưng `<LeadFormModal />` nhét hẳn vào bên trong `lead-detail-drawer.tsx` để gánh việc Sửa. (Bắt chước triệt để CustomerDrawer). Thiết lập local `isEditOpen`.
- **Create Modal (Ngoài List Page):** Gỡ comment `<LeadFormModal />` ở `lead-list-page.tsx`, móc vào nút "Thêm Lead" (hiện tại nút Thêm Lead đang bị return `alert`).
- **Nút Xuất File:** Hiệu chỉnh luồng xử lý hoặc ẩn đi để tránh nút cứng (Dead button).

### 2. Tái kết nối Logic Nút Bấm (Wire up)
- Trong `LeadDetailDrawer`, nút Edit (Sửa) -> `onClick={() => setIsEditOpen(true)}`.
- Trong `LeadListPage`, nút "Thêm Lead" -> `onClick={() => setShowForm(true)}`. Render Modal để tạo mới.
- Trong `LeadListPage`, nút "Xuất file" -> Bổ sung `onClick` hiển thị Toast info "Tính năng sắp ra mắt" (Tránh click không có phản hồi).

### 3. Tối ưu Hiệu năng Toàn diện (Performance Mutate)
- Xoá hoàn toàn sự hiện diện của `router.refresh()` (hàm `onSaved`) ở phân hệ Lead.
- **Form Sửa/Thêm:** Khi lưu gọi thẳng `globalMutate(cacheKeys.leads())` (và `cacheKeys.leadDetail(id)`).
- **Trạng thái Lead (Stage):** Đổi sang dùng `globalMutate` khi kéo thả/đổi trạng thái (`handleStageChange`).
- **Nút "Huỷ Lead" (Mark Lost):** Khi lưu lý do huỷ, áp dụng `globalMutate()` thay vì chờ load lại vòng ngoài.
- **Nút "Chốt Đơn" (Convert):** Khi xác nhận chuyển đổi sang Customer thành công, dùng `mutate()` cục bộ trước khi push router.
- *Lợi ích:* Giải thoát 100% người dùng khỏi tình trạng chớp màn hình, giật lag sau mỗi lần bấm xác nhận. Mọi thứ sẽ update Local State ngay lập tức.

## Implementation Steps
- [x] Xoá các code thừa/comment out liên quan đến `LeadFormModal` khỏi `components/crm/lead-list-page.tsx`. Xoá prop `onEdit`, `onSaved` khỏi thẻ `<LeadDetailDrawer>` trong file đó.
- [x] Vào `components/crm/lead-detail-drawer.tsx`, thêm state `isEditOpen`.
- [x] Import `LeadFormModal` vào `LeadDetailDrawer`.
- [x] Tạo hàm `handleEditSaved()` trong `LeadDetailDrawer` chứa `globalMutate`.
- [x] Chèn `<LeadFormModal />` vào JSX của `LeadDetailDrawer`.
- [x] Móc dây lại nút `<Button Sửa>`.

## File ảnh hưởng
- [MODIFY] `components/crm/lead-list-page.tsx`
- [MODIFY] `components/crm/lead-detail-drawer.tsx`
