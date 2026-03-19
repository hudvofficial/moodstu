# Phase 10: Services Catalog

**Status:** ⬜ Backlog
**Dependencies:** Phase 02 (Database)
**Est.:** 1 day

## Objective

Catalog dịch vụ theo loại (Cưới/Baby/Concept/Hình thẻ/Thiệp). Quản lý giá, gói combo, active/inactive.

## Implementation Steps

- [ ] DB: Bảng `services` (name, type ENUM, price, is_combo, items[])
- [ ] DB: Bảng `service_details` (service_id, item_name, quantity, unit_price)
- [ ] CRUD dịch vụ đơn lẻ + combo
- [ ] Phân loại theo service_type ENUM
- [ ] Combo builder: chọn nhiều DV → tạo gói với giá riêng
- [ ] Active/Inactive toggle (không xoá, chỉ ẩn)
- [ ] Liên kết: contract tạo mới → chọn DV từ catalog → auto fill giá

## V1 Lessons
- v1 dùng VARCHAR cho category → v2 dùng ENUM
- v1 có 130+ services → cần pagination + search

## Test Criteria
- [ ] CRUD services OK
- [ ] Combo tính đúng tổng giá
- [ ] Contract form pick service → auto fill price

---
**Next Phase:** → Phase 11 (Expenses)
