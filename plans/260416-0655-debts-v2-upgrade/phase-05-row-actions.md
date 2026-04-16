# Phase 05: Row Actions — Quick Pay Kỳ + QR + Nhắc Nợ

Status: ⬜ Pending
Dependencies: Phase 01, Phase 04 (cần installment columns + progress UI)

## Objective

Thêm row-level actions cho từng khoản nợ — V1 có QR thanh toán, nhắc nợ Zalo, edit/delete. V2 cần thêm Quick Pay Kỳ (cho trả góp).

## Tính năng

### Quick Pay Kỳ (Trả Góp)
- [ ] Nút "✅ Đã đóng kỳ" trên row — gọi `markInstallmentPaid` action (đã có sẵn V2)
- [ ] 1 tap → installment_paid +1, auto-complete khi paid = total
- [ ] Toast thông báo "Đã thanh toán kỳ X/Y"
- [ ] V2 style: `btn-icon` ghost + icon `CheckCircle` Lucide

### Mark Paid Quick (Khoản Thường)
- [ ] Nút "Đã thanh toán" — gọi `updateDebt({ status: "da_thanh_toan" })` (đã có sẵn V2)
- [ ] V2 style: `btn-icon` ghost + icon `CircleCheck` Lucide

### QR Thanh Toán (Tab Phải thu)
- [ ] Chỉ hiện khi: tab = "Phải thu" && status chưa TT
- [ ] Tạo QR code từ bank info (reuse từ module Receipts nếu có)
- [ ] V2 Modal style

### Nhắc Nợ
- [ ] Copy mẫu tin nhắn nhắc nợ vào clipboard
- [ ] Template: "Anh/chị [tên] ơi, khoản [tên nợ] [số tiền] đã quá hạn [X ngày]..."
- [ ] Toast "Đã copy tin nhắn nhắc nợ"

### Delete (Soft delete — đã có V2)
- [ ] Confirm dialog trước khi xóa
- [ ] Gọi `deleteDebt` (soft delete + audit — đã có sẵn V2)

## Files to Create/Modify

- `components/finance/debts/debt-row-actions.tsx` — **[NEW]** hoặc refactor existing
- `components/finance/debts/debt-desktop-table.tsx` — Integrate row actions
- `components/finance/debts/debt-mobile-list.tsx` — Integrate row actions

## Test Criteria

- [ ] Quick Pay Kỳ: bấm → kỳ tăng, progress bar cập nhật
- [ ] Mark Paid: bấm → status đổi, row grey out
- [ ] QR: mở modal, hiển thị QR đúng bank info
- [ ] Nhắc nợ: bấm → clipboard có nội dung đúng
- [ ] Delete: confirm → xóa mềm → row biến mất

---
Next Phase: [phase-06](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/plans/260416-0655-debts-v2-upgrade/phase-06-credit-cards.md)
