# Phase 17: Labs & Printing Orders

**Status:** 🟡 Stitch Done (2/2 screens)
**Dependencies:** Phase 04 (Contracts), Phase 11 (Expenses)
**Est.:** 1.5 days

## Objective

Quản lý xưởng in ảnh (labs). Đơn đặt in liên kết HĐ + Lab. Bảng giá lab. Theo dõi công nợ lab.

## Implementation Steps

### Quản lý Lab
- [ ] DB: Bảng `labs` (name, contact_person, phone, address)
- [ ] DB: Bảng `lab_services` (lab_id, item_name, cost_price)
- [ ] CRUD labs + bảng giá từng lab
- [ ] So sánh giá giữa các lab

### Đơn In Ảnh
- [ ] DB: Bảng `printing_orders` (contract_id, lab_id, item_name, quantity, unit_price, total, status, payment_status)
- [ ] Tạo đơn in từ contract detail (link HĐ + chọn Lab)
- [ ] Auto fill giá từ lab_services
- [ ] Status flow: Đang in → Đã về → Đã giao khách
- [ ] Payment status: Chưa TT / Đã TT
- [ ] Grouped list: nhóm theo lab, theo tháng
- [ ] Stats: pending count, overdue count, total debt, monthly cost (copy v1 pattern)

### Công nợ Lab
- [ ] Aggregation: tổng printing_orders chưa TT = công nợ lab
- [ ] Lab debt dashboard card
- [ ] Quick pay: đánh dấu đã TT → tạo expense tự động

## V1 Carry-over
- PrintingStats component (pendingCount, overdueCount, totalDebt, monthlyCost)
- GroupedPrintingList component
- PrintingToolbar + PrintingPagination

## Test Criteria
- [ ] CRUD labs + bảng giá OK
- [ ] Đơn in auto fill giá từ lab
- [ ] Status transitions đúng flow
- [ ] Công nợ lab tổng hợp đúng
- [ ] Quick pay tạo expense

---
**Next Phase:** → Phase 18 (Wedding Cards)
