# Phase 04: Detail Drawers & Care Logs UX
Status: ⬜ Pending
Dependencies: Phase 03

## Objective
Tối ưu trải nghiệm xem chi tiết khách hàng và lịch sử chăm sóc trên Mobile (Slide-up Detail Drawers). Đảm bảo giao diện mượt mà, nội dung không bị tràn màn hình, thuận tiện cho việc đọc và ghi chú (Care Log) bằng một tay.

## Files to Modify
- `components/crm/lead-detail-drawer.tsx`
- `components/crm/customer-detail-drawer.tsx`
- `components/crm/lead-care-log.tsx`

## Implementation Steps

### 1. Unified Drawer Layout
- [x] Kiểm tra responsive (class `max-h-[85vh]` hoặc `h-full` trên mobile). 
- [x] Đảm bảo Header của Drawer dính chặt trên cùng (sticky) để nút đóng (Close) luôn hiển thị.
- [x] Tối ưu vùng hiển thị nội dung chính bên trong (padding, typography section).

### 2. CRM Detail Sections
- [x] Chia khối thông tin (Khách hàng, Nhu cầu, Ghi chú) theo dạng card ẩn có title nhỏ gọn thay vì các khối text dính xát vào nhau.
- [x] Form hiển thị trạng thái và tiềm năng: Sử dụng `Select` hoặc `Dropdown` tối ưu thao tác chạm.

### 3. Care Logs (Lịch sử chăm sóc)
- [x] Tái cấu trúc UX/UI list hiển thị các bước chăm sóc trong `lead-care-log.tsx`.
- [x] Đảm bảo input chèn Log mới (`textarea`) dễ nhập liệu không bị bàn phím ảo che mất nút Send.

## Test Criteria
- [ ] Không bị lỗi UX dội UI lên hoặc mất nút "Gửi" khi gõ text.
- [ ] Tốc độ trượt và độ mượt của màn hình Detail ổn định giống với Printing Module.
- [ ] Nội dung khi scroll dài không lỗi hiển thị.

---
Next Action: Sử dụng `/code phase-04` để tiến hành sửa code.
