# Phase 04: In Phiếu Lương & Hành động Grid
Status: ⬜ Pending | 🟡 In Progress | ✅ Complete
Dependencies: Phase 03

## Objective
Hồi sinh tất cả modal làm việc kế toán cục bộ (In phiếu lương, Cập nhật trạng thái thanh toán, Xóa người khỏi bảng).

## Requirements
### Functional
- [ ] Cấy `<PayslipModal>` (Giao diện chuẩn In Ấn Phiếu Lương Giấy giống V1).
- [ ] Cấy `<PaymentConfirmModal>` để thực thi hàm chốt nợ.
- [ ] Action Menu Table: Thay vì chỉ có (Chi Tiết / Điều Chỉnh), bổ sung thêm In Phiếu (Voucher), Thanh Toán (Pay), Xóa (Del).
- [ ] Mọi hành vi cập nhật xong phải Reload lại bảng.

## Files to Create/Modify
- `components/finance/salaries/salary-desktop-table.tsx` - Add UI Buttons
- `components/finance/salaries/salary-mobile-list.tsx` - Add Swipe UI Buttons
- (Optional: Copy các Modal cũ từ V1 sang V2 và Refactor style).

## Test Criteria
- [ ] In được phiếu lương hiển thị pop-up in giấy A5.
---
Next Phase: Hoàn tất Lương
