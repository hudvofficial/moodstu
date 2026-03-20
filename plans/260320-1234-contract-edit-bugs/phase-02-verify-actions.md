# Phase 02: Verify All Actions Work
Status: 🟡 Partial (DB verified, UI needs manual test)
Dependencies: Phase 01 ✅
Priority: 🔴 Critical

## Objective
Xác nhận tất cả contract-related actions hoạt động sau khi đổi FK.
Test từng action trực tiếp trên app.

## Implementation Steps

### 1. [ ] Start dev server
```bash
npx kill-port 3000; npm run dev
```

### 2. [ ] Test: Tạo hợp đồng mới
- Vào `/contracts/create`
- Điền form: customer, service type, items, payment
- Submit → phải tạo thành công
- Verify: contract xuất hiện trong danh sách

### 3. [ ] Test: Sửa hợp đồng
- Từ danh sách → click vào 1 HĐ → Edit
- Thay đổi 1 field (VD: mô tả)
- Submit → phải cập nhật thành công
- **Lưu ý:** Bug M1 + M2 (UI trùng) chưa fix ở phase này, ignore

### 4. [ ] Test: Thêm ghi chú (Notes)
- Mở drawer HĐ → tab Ghi chú
- Thêm 1 note mới
- Note phải xuất hiện ngay (real-time, không cần F5)

### 5. [ ] Test: Cancel/Reactivate contract
- Chọn 1 HĐ → Cancel
- Verify trạng thái chuyển thành "Đã huỷ"
- Reactivate → verify trạng thái trở lại

### 6. [ ] Test: Tạo thanh toán
- Mở chi tiết HĐ → Thêm thanh toán
- Nhập số tiền + phương thức
- Submit → phải tạo thành công

### 7. [ ] Kiểm tra console errors
- Mở DevTools → Console
- Thực hiện tất cả thao tác trên
- KHÔNG được có error nào liên quan FK constraint

## Test Criteria
- [x] DB: contracts.updated_by = auth user → ✅ no FK error
- [x] DB: contracts.created_by = auth user → ✅ no FK error  
- [x] DB: contract_notes.created_by = auth user → ✅ insert success
- [ ] UI: Tạo HĐ mới (cần anh test trên browser)
- [ ] UI: Sửa HĐ (cần anh test trên browser)
- [ ] UI: Thêm ghi chú (cần anh test trên browser)
- [ ] UI: Console 0 FK errors

## Notes
- Nếu bất kỳ test nào fail → check constraint name trong error message
- Có thể constraint name khác với expected → cần query lại
- Phase này là manual testing, KHÔNG cần viết automated tests

---
Next Phase: → phase-03-ui-fixes.md
