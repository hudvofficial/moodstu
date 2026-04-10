# Phase 05: Forms & Filters Optimization
Status: ⬜ Pending
Dependencies: Phase 04

## Objective
Tối ưu màn hình Nhập Liệu (Tạo mới/Sửa Leads & Customers) và Bộ Lọc ưu tiên tốc độ và độ chính xác UX trên điện thoại (Mobile-first). Mọi thao tác Search hay chọn Dropdown đều phải thoải mái 1 tay và không làm vỡ giao diện nền.

## Files to Modify
- `components/crm/lead-form-modal.tsx`
- `components/crm/customer-form-modal.tsx`
- `components/crm/lead-filters.tsx`
- `components/crm/customer-filters.tsx`

## Implementation Steps

### 1. UX Tối ưu Form Nhập liệu (Modals)
- [x] Chuyển đổi thiết kế Modal để trên giao diện hẹp thì Form tự động mở dạng Fullscreen hoặc Bottom Sheet có định vị rõ ràng. (Đã wrap bằng `UnifiedModal` hỗ trợ Swipe-Dismiss)
- [x] Đặt khoảng cách (margin/padding) lớn cho các ô input text (`input-base`) để dế trỏ ngón tay vào.
- [x] Khu vực button Lưu / Hủy (Actions Footer) phải là phần `sticky bottom` (ghim dưới đáy) trên mobile để không phải kéo mỏi tay mới tìm thấy nút Lưu.

### 2. Sắp xếp lại Filters
- [x] Review lại `lead-filters.tsx` và `customer-filters.tsx`.
- [x] Thiết kế dạng Tags Filter vuốt chéo ngang (horizontal scroll) cho các Dropdown phổ biến giống cách `TabsFilter.tsx` tích hợp. 
- [x] Ô Search cần chiếm full-width tự do (100%) khi dùng trên mobile. Đảm bảo Icon Search nằm cân xứng. (Đã xử lý thông qua Global Header)

## Test Criteria
- [x] Bật bàn phím điện thoại ảo lên thì form trượt lên, không được đè mất ô Input đang nhập hoặc nút Gửi.
- [x] Test các Dropdown Filters chọn bằng chạm ngón tay không bị sai target.

---
Next Action: Sử dụng `/code phase-05` để bắt đầu sửa lỗi cho màn hình này.
