# Phase 01: Setup & UI Implementation
Status: ⬜ Pending

## Objective
Thay thế thiết kế Legend hiện tại của `WidgetSourceDonut` bằng một danh sách Stripe-like trực quan, thẳng hàng, hiển thị đủ thông tin về các nguồn khách.

## Requirements
### Functional
- [ ] Giữ nguyên cấu trúc Stack Dọc (Vertical), nhưng CẢI TIẾN TRẢI NGHIỆM ĐÓNG MỞ (Progressive Disclosure) để chống cồng kềnh.
- [ ] Gọt bớt bán kính (size) thẻ SVG Donut Chart từ `160px` xuống bé hơn một chút để nhẹ mắt.
- [ ] Tích hợp thuật toán gộp "Nguồn Rác": Mặc định chỉ hiển thị danh sách **Top 4** nguồn. Nếu có >4, phần dư ra lập tức bị giấu đi.
- [ ] Tích hợp nút `+ X kênh khác`: Đặt dưới cùng. Lấy cảm hứng từ Stripe, thay vì gộp thành màu xám nát Donut, ta giữ Donut như thật nhưng List thì giới hạn hiển thị. Bấm vào mới bung thêm ra (Accordion) hoặc bung Modal. Giờ mình làm **Accordion (Show More/Less)**.

### Non-Functional
- [ ] KHÔNG dùng thanh cuộn lồng nhau (`overflow-y-auto` bên trong widget).
- [ ] UI mượt mà, đúng chuẩn Apple HIG: nút Show More phải mộc mạc (ghost button text-muted).

## Implementation Steps
1. [x] Mở file `components/crm/widgets/widget-source-donut.tsx`.
2. [x] Sửa lại kích thước `size` của Donut Chart (từ 160 xuống khoảng 140).
3. [x] Bổ sung state `isExpanded` (mặc định `false`).
4. [x] Khai báo logic `visibleData`: Nếu `isExpanded` = true thì full `sourceData`. Nếu false thì `sourceData.slice(0, 4)`.
5. [x] Render `<div className="flex flex-col gap-1.5">` và map qua `visibleData`.
6. [x] Bên dưới khối map, nếu `sourceData.length > 4`, render nút `Button variant="ghost"` để toggle `isExpanded`, nội dung nút: `Tất cả kênh (${sourceData.length})` hoặc `Ẩn bớt`.

## Files to Create/Modify
- `components/crm/widgets/widget-source-donut.tsx` - Áp dụng Stripe-like Legend List.

## Test Criteria
- [ ] Layout không tràn mép ngang của Card.
- [ ] Chữ số phần trăm dóng thẳng hàng theo chiều dọc (tabular nums hoặc fixed width).
- [ ] Nhìn vào thấy rõ luôn kênh nào hiệu quả nhất.

---
Next Phase: Phase 02 - Testing & Verification
