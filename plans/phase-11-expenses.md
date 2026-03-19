# Phase 11: Expenses & Transaction Categories

**Status:** ⬜ Backlog
**Dependencies:** Phase 05 (Payments), Phase 04 (Contracts)
**Est.:** 1.5 days

## Objective

Phiếu chi liên kết HĐ/nhân viên. Danh mục thu/chi customizable. Chi phí cố định hàng tháng (thuê nhà, điện, marketing).

## Implementation Steps

### Danh mục Thu/Chi
- [ ] DB: Bảng `transaction_categories` (code, type ENUM 'income'|'expense', name, icon)
- [ ] CRUD categories (Admin only)
- [ ] Seed data mặc định (Tiền thuê, Quảng cáo, Vật tư, Lương...)
- [ ] Icon picker cho mỗi category

### Phiếu Chi
- [ ] DB: Bảng `expenses` (date, type, category_id, contract_id?, amount, status, approved_by)
- [ ] CRUD phiếu chi
- [ ] Liên kết contract (optional)
- [ ] Upload hoá đơn (image_url → Supabase Storage)
- [ ] Duyệt chi: status flow (Chờ duyệt → Đã chi TM / Đã chi CK)
- [ ] Filter theo tháng, category, status

### Chi phí Cố định
- [ ] DB: Bảng `fixed_costs` (name, type, monthly_amount, start_date, end_date)
- [ ] CRUD chi phí cố định
- [ ] Auto tính tổng/tháng cho báo cáo

## V1 Lessons
- v1 dùng `category_name VARCHAR` denorm → v2 chỉ FK `category_id`
- v1 status dùng Vietnamese strings → v2 dùng ENUM

## Test Criteria
- [ ] Tạo phiếu chi + liên kết HĐ OK
- [ ] Duyệt chi thay đổi status đúng
- [ ] Chi phí cố định tính tổng tháng đúng
- [ ] Filter hoạt động

---
**Next Phase:** → Phase 12 (Debts & Goals)
