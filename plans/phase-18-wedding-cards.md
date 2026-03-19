# Phase 18: Wedding Cards (Thiệp Cưới)

**Status:** ⬜ Backlog
**Dependencies:** Phase 04 (Contracts)
**Est.:** 1 day

## Objective

Quản lý đơn hàng thiệp cưới. Mẫu thiệp, đặt hàng, deadline giao, track trạng thái.

## Implementation Steps

- [ ] DB: Extend printing_orders hoặc separate table cho wedding cards
- [ ] Mẫu thiệp: gallery view, giá theo loại
- [ ] Đơn hàng thiệp: số lượng, nội dung in, ngày giao
- [ ] Status flow: Nhận đơn → Đang in → Đã in xong → Đã giao
- [ ] Deadline tracking: cảnh báo gần deadline
- [ ] Link contract (nếu có) hoặc standalone

## Test Criteria
- [ ] Tạo đơn thiệp OK
- [ ] Status transitions đúng
- [ ] Deadline alert hoạt động

---
**Next Phase:** → Phase 19 (Quick POS)
