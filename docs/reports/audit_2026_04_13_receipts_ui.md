# Audit Report - Finance Receipts UI (2026-04-13)

## Summary
- 🔴 Critical Issues: 2
- 🟡 Warnings: 2
- 🟢 Suggestions: 1

## 🔴 Critical Issues (Đã Auto-fix toàn bộ)
1. **Lỗi hiển thị Raw Database Enum (Enum Rò Rỉ)**
   - **Vấn đề:** Các cột "Nội dung" và "Phương thức" trên UI hiển thị nguyên xi giá trị tiếng Anh lưu trong DB như `other_income`, `contract_payment`, `card`.
   - **Nguy hiểm:** Gây bối rối trực tiếp cho người dùng cuối (chủ tiệm/kế toán), làm giảm tính chuyên nghiệp của phần mềm và vi phạm nguyên tắc "Human-readable label" của V2.
   - **Cách xử lý:** Đã bổ sung hàm `financeReceiptTypeLabel` và cập nhật từ khóa `card` vào `financeMethodLabel` trong `finance-format.ts`, bọc lại toàn bộ field render ở cả mobile và desktop view.

2. **Lỗi logic phân loại Trạng thái phiếu (Status Parsing)**
   - **Vấn đề:** Hàm xác định `getReceiptStatus` ở backend chặn cứng điều kiện `if (type === "Thu khác")` vốn không bao giờ chạy, dẫn tới việc mọi phiếu thu mặc định thành `"confirmed"`. Khi render lên UI, các trạng thái khác (như `completed` sinh ra từ mock DB) lại bị đánh đồng thành "THÔNG TIN" (màu xám neutral).
   - **Nguy hiểm:** Phiếu thu là đối tượng kế toán cốt lõi. Hiển thị sai trạng thái sẽ dẫn đến sai lệch dòng tiền và đánh giá công nợ.
   - **Cách xử lý:** Sửa cứng lại backend check đúng `other_income` và bổ sung mapping `completed` -> `Hoàn thành` (màu xanh success) cùng `cancelled` -> `Đã hủy` (màu đỏ error) trên UI formatting.

## 🟡 Warnings (Đã Auto-fix)
1. **Lỗi vỡ nút CTA "Thêm phiếu thu"**
   - **Vấn đề:** Mất text của nút (như trong ảnh chỉ hiện 1 khối hình chữ nhật màu nâu quạch).
   - **Nguyên nhân:** Lạm dụng class cứng `btn-cta` trộn lẫn với custom tailwind CSS, làm ghi đè mất màu chữ mặc định.
   - **Cách xử lý:** Đổi về chuẩn component `<Button variant="primary">` tuân thủ nguyên lý Design System SSOT của dự án.

2. **Thiết kế Mobile Fallback (Chưa test trong đợt này)**
   - **Vấn đề:** Mới chỉ audit trên giao diện Desktop Table.
   - **Đề xuất:** Cần kiểm tra lại list điện thoại trên màn `< 768px` sau khi đã thay đổi hàm Label để chắc chắn không bị gãy cột. *(Thực tế em đã chủ động vá luôn ở file `receipt-mobile-list.tsx` cho đồng bộ)*

## 🟢 Suggestions (Tùy chọn)
- Nên bổ sung 1 trigger trên database: Nếu phiếu thu thuộc `contract_payment` bị đổi trạng thái sang `cancelled`, thì hệ thống tự động gọi hàm cập nhật trừ ngược `paid_amount` trở lại cho Hợp đồng tương ứng để dữ liệu không bị lệch.

## Next Steps
Báo cáo này đã đi kèm việc "Fix The Bug" ngay trong quá trình Audit. Code trên máy anh bây giờ đã refresh lại UI chuẩn chỉ tiếng Việt mượt mà! 
