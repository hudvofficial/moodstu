# Phase 03C: Tối ưu Form Thu Tiền & Dọn dẹp Dashboard (V1 Parity)
Status: ⬜ Pending

## Objective
Đưa logic nghiệp vụ chọn đợt thanh toán của V2 về đúng chuẩn dữ liệu DB của V1, đồng thời dọn dẹp khối "Kế hoạch thanh toán" thừa thãi ở Dashboard.

## Requirements
### Functional
- [ ] Gỡ bỏ `PaymentPlanBlock` khỏi Sidebar của Financial Dashboard.
- [ ] Xóa logic `BusinessStageId` ảo (`deposit`, `second`, `final`).
- [ ] Thay đổi options của Dropdown "Đợt thanh toán" trong `payment-receipt-form.tsx` để render trực tiếp từ mảng `paymentPlans` lấy từ DB (y hệt V1).
- [ ] Giữ lại lựa chọn "Thanh toán phát sinh" / custom.
- [ ] Format dropdown labels: `[Tên đợt] - [Số tiền]₫ 👈 Tiếp theo` (nếu là đợt chưa thu kế tiếp).

## Implementation Steps
1. [ ] **Xóa Component Thừa**: Xóa file `payment-plan-block.tsx` và gỡ import khỏi `financial-dashboard.tsx`.
2. [ ] **Gỡ Type Ảo**: Xóa `BusinessStageId` ở `contract-detail-client.tsx`, `detail-layout-sections.tsx`.
3. [ ] **Refactor Form Options**: Sửa `payment-receipt-form.tsx` loại bỏ hàm `getPlanStageKey` và map trực tiếp options từ DB.
4. [ ] **Xử lý Logic Chọn**: Cập nhật hàm xử lý khi chọn option trong Dropdown để auto-fill amount dựa vào dữ liệu của row đó.

## Files to Modify
- `components/contracts/detail/payment-receipt-form.tsx` - Refactor logic dropdown.
- `components/contracts/detail/financial-dashboard.tsx` - Bỏ PaymentPlanBlock.
- `components/contracts/detail/contract-detail-client.tsx` - Sửa state và props truyền xuống.
- `components/contracts/detail/detail-layout-sections.tsx` - Sửa type của prop.
- `components/contracts/detail/payment-plan-block.tsx` - [DELETE].

## Test Criteria
- [ ] Dashboard hiển thị gọn gàng, không có "Kế hoạch thanh toán".
- [ ] Form thu tiền hiển thị đúng danh sách đợt lấy từ DB.
- [ ] Khi chọn một đợt chưa thu, field "Số tiền" được điền đúng `amount` của đợt đó.
- [ ] Tạo phiếu thu lưu thành công và refresh lại cache chính xác.
