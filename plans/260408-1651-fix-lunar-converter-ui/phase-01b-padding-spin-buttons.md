# Phase 01b: Spin Button Xóa Sổ & Ép Căn Giữa (Alignment Strict)
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Triệt tiêu triệt để yếu tố native spin-button của thẻ input type=number trên mọi trình duyệt (đặc biệt là Webkit và Firefox) để trả lại 100% diện tích không gian bên phải của thẻ. Từ đó lấy lại thuộc tính `text-center` chuẩn mực và chống cắt mất chữ cho ô [Năm] đang bị bẻ gãy layout.

## Requirements
### Functional
- [ ] Xóa Spin Button ở dạng inner (webkit)
- [ ] Xóa Spin Button ở dạng outer (webkit)
- [ ] Xóa Spin Button mặc định trên Firefox (`appearance:textfield`)

### Non-Functional
- [ ] Kích thước font cần giảm từ `text-h2` mập mạp xuống mức tiêu chuẩn `text-3xl` hoặc `text-2xl` cho an toàn responsive.
- [ ] Ép margin-padding nội tại nhỏ lại để đảm bảo chữ 4 con số luôn hiển thị ở center.

## Implementation Steps
1. [ ] Mở file `components/calendar/solar-lunar-converter.tsx`.
2. [ ] Thay dòng thẻ input className: Dùng combo `[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`.
3. [ ] Đổi size text `text-h2` -> `text-3xl`, thêm `!px-0` để không ăn default padding của `input-base`.
4. [ ] Xóa min-w-0 đi vì hết tác dụng.

## Test Criteria
- [ ] Chữ ở 3 ô "Ngày", "Tháng", "Năm" phải thẳng hàng tuyệt đối ở giữa.
- [ ] Số 2026 không bị cắt khuyết mảng.
- [ ] Mũi tên tăng giảm số bay màu vĩnh viễn trên Chrome lẫn Safari/Firefox.

---
Next Phase: Phase 02: V-GATE Audit & Verification
