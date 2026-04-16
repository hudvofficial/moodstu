# Phase 01: Sync Swipe Cards & List
Status: ✅ Complete

## Objective
Thay thế các utility classes và cấu trúc layout bị lệch chuẩn bên trong `expense-mobile-swipe-card.tsx` để khớp hoàn toàn với kiến trúc của `receipt-mobile-swipe-card.tsx` (SSOT). Đồng thời kiểm tra check lại `expense-mobile-list.tsx` cho hoàn chỉnh.

## Requirements
### Functional
- [ ] Render 2 dòng chuẩn: (1) Tên danh mục, (2) Badge trạng thái/loại + Ngày tháng.
- [ ] Sắp xếp các Action Buttons (Trái: Xem, In | Phải: Sửa, Duyệt, Xóa).
- [ ] Bấm vào thẻ Card gọi `onView` (tương đương `setIsDetailOpen` bên Receipts).

### Non-Functional
- [ ] Tuân thủ chặt chẽ design tokens của Tailwind (Bỏ `bg-surface-elevated`, dùng style Action Button giống Receipts).
- [ ] Đổi màu nút Duyệt từ `interactive` thành màu phù hợp hơn (e.g., `success` -> xanh lá).

## Implementation Steps
1. [ ] Cập nhật `leftActions` và `rightActions` token classes:
   - "Xem": `bg-primary` (như QR bên phiếu thu).
   - "Duyệt": `bg-success` (tuân thủ nguyên tắc safe actions trên Mobile thay vì interactive).
   - "Sửa": `bg-warning`.
   - "In": `bg-info`.
   - "Xóa": `bg-error`.
2. [ ] Thêm Type Badge vào dòng thứ 2 cạnh ngày tháng (nếu phù hợp logic chi/tạm ứng).
3. [ ] Cập nhật format ngày và số tiền để cân đối layout.

## Files to Modify
- `components/finance/expenses/expense-mobile-swipe-card.tsx` - Sync UI layout and action colors.
- `components/finance/expenses/expense-mobile-list.tsx` - Update standard gap/padding (nếu cần).

---
Next Phase: N/A
