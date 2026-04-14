# Phase 04: Tinh chỉnh CSS & Tối ưu Giao diện A5 (Portrait)
Status: ✅ Complete
Dependencies: Phase 01, 02, 03

## Objective
Làm cho phiếu thu trông giống thật (A5 / Stripe Bill) thay vì bị dàn trải theo chiều ngang của Modal 2xl.

## Implementation Steps
1. [x] **Thu hẹp Modal/Container:** Đổi `size="2xl"` thành `size="lg"` hoặc `size="md"` để thu hẹp chiều ngang.
2. [x] **Tạo hiệu ứng tờ giấy (3D/Stripe Style):**
   - Bọc toàn bộ nội dung phiếu thu (phần `content`) vào một thẻ `div`.
   - Cấp cho thẻ Div này class: `bg-white dark:bg-zinc-950 rounded-lg shadow-sm border border-border/50`.
3. [x] **Căn chỉnh lại Spacing (Padding/Margin):** Giảm bớt khoảng trống dư thừa, tạo viền margin để tờ phiếu thu "nổi" lên trên modal background.
4. [x] **Kiểm tra Responsive:** Đảm bảo trên Mobile tờ phiếu thu hiển thị full viền, trên Desktop thì đứng giữa màn hình và có tỷ lệ dọc (Portrait) thanh thoát.

## Files to Modify
- `components/finance/receipts/receipt-detail-modal.tsx` - [UPDATE] Chỉnh sửa markup và class CSS.

## Test Criteria
- [ ] Giao diện modal hiển thị dọc gọn gàng, giống tờ bill thanh toán.
- [ ] Tỷ lệ hợp lý trên desktop.
- [ ] Không bị méo chữ hay tràn khung trên mobile.

---
Next Phase: Hoàn tất quá trình Refactor (Done).
