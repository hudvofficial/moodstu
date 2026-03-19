# Phase 14: Payment Plans (Milestones)

**Status:** ⬜ Backlog
**Dependencies:** Phase 05 (Payments), Phase 04 (Contracts)
**Est.:** 0.5 day

## Objective

Kế hoạch thanh toán nhiều đợt theo HĐ. Liên kết phiếu thu thực tế. Chống Ghost Payment.

## Implementation Steps

- [ ] DB: Bảng `payment_plans` (contract_id, milestone_name, amount, due_date, status, receipt_id)
- [ ] Auto-generate milestones khi tạo HĐ (Cọc, Ngày chụp, Lấy album)
- [ ] CRUD milestones (thêm/sửa/xoá đợt)
- [ ] Link receipt khi thanh toán: payment_plan.receipt_id = receipts.id
- [ ] Ghost Payment check: status='Đã thu' mà receipt_id=null → cảnh báo!
- [ ] Timeline view trên contract detail page
- [ ] Nhắc TT khi gần due_date

## V1 Lessons (CRITICAL)
```
Ghost Payment = payment_plan "Đã thu" nhưng KHÔNG có receipt thực
→ Sai báo cáo tài chính
→ Prevention: ATOMIC transaction (update status + create receipt cùng lúc)
```

## Test Criteria
- [ ] Milestones auto-generate đúng
- [ ] Link receipt không tạo Ghost Payment
- [ ] Integrity scan phát hiện Ghost nếu có
- [ ] Timeline view hiển thị đúng tiến độ

---
**Next Phase:** → Phase 15 (HR)
