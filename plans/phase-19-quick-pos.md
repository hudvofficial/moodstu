# Phase 19: Quick POS (Hình Thẻ)

**Status:** ⬜ Backlog
**Dependencies:** Phase 05 (Payments)
**Est.:** 0.5 day

## Objective

Giao dịch nhanh walk-in cho hình thẻ, CMND, visa. Không cần tạo HĐ đầy đủ.

## Implementation Steps

- [ ] Simplified POS form: tên khách, loại hình, số lượng, giá, phương thức TT
- [ ] Auto-generate receipt ngay khi thanh toán
- [ ] Lịch sử giao dịch POS (filter theo ngày)
- [ ] Dashboard: doanh thu POS hôm nay
- [ ] Nếu khách muốn HĐ → convert POS → Contract

## Test Criteria
- [ ] Tạo giao dịch POS < 30s
- [ ] Receipt auto generate OK
- [ ] Lịch sử filter đúng

---
**Next Phase:** → Phase 20 (Audit Logs)
