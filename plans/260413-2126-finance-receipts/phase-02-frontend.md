# Phase 02: Frontend Crud Flow
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Xây dựng giao diện Danh sách, cập nhật Edit Form Modal và hệ thống State phục vụ Update Record. Làm sạch hoàn toàn CSS ngoại vi, chuyển sang SSOT framework của V2.

## Requirements
### Functional
- [ ] G5: Bổ sung chức năng Edit vào Receipt Form Modal, có cơ chế mapping fields hiện thời lên UI component `CurrencyInput`, `DatePicker`. Tự động bind `expectedUpdatedAt`.
- [ ] G6: Phủ 1 thanh Search Box param bên ngoài Client để search theo `contract_code` và Customer Name.
- [ ] Actions UI: Mở rộng Toolset Button (Sửa, In) vào `.table-base` của Destkop và Mobile List.

### Non-Functional
- [ ] Performance: Cập nhật cơ chế debounce khi gõ chữ vào Search Box.
- [ ] Style Guide: Check toàn bộ Form Modal, loại bỏ inline styling (`style={{}}`), áp dụng variable CSS.

## Implementation Steps
1. [ ] Step 1 - Sửa `receipt-form-modal.tsx`: Thêm prop `editData`. Triển khai logic Update dựa vào ID thay vì Insert Create.
2. [ ] Step 2 - Sửa `receipt-desktop-table.tsx` & `receipt-mobile-list.tsx`: Nhấn Edit Mở Form Modal, truyền đúng Data Target.
3. [ ] Step 3 - Cập nhật `receipts-client.tsx`: Bổ sung `<Input />` icon Search. Lọc kết quả render List dựa trên param (hoặc Client filter text-based tạm).

## Files to Modify
- `components/finance/receipts/receipt-form-modal.tsx`
- `components/finance/receipts/receipt-desktop-table.tsx`
- `components/finance/receipts/receipt-mobile-list.tsx`
- `components/finance/receipts/receipts-client.tsx`

## Test Criteria
- [ ] Sửa 1 thông tin (Ví dụ: Nội dung ghi chú), Save. Record lưu dữ liệu ngay lập tức. SWR reloads đúng kết quả.
- [ ] Tìm kiếm bằng đoạn text "Khách vãng lai", danh sách lưới filter ra đúng Row.

---
Next Phase: [Phase 03: Full Page Details & Print](phase-03-detail-print.md)
