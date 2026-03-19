# Phase 04: Render Lên Biểu Đồ & Thay số liệu Server
Status: ⬜ Pending

## Objective
Gắn React Components (Dùng SWR, RSC) với Backend và gỡ bỏ dữ liệu Mock từ Phase 02. Triển khai Recharts với Màu nhận diện Earth-Tone.

## Requirements
- Dữ liệu Realtime or near-realtime (Tựa React-Query) dùng thư viện SWR.
- Charts Responsive tự chỉnh cỡ ResizeObserver của Recharts.

## Implementation Steps
1. Xây dựng `<LineChart Revenue>` bọc trong `ResponsiveContainer`. Tooltip Custom. Màu: `--color-primary`.
2. Xây dựng `<PieChart Services>` cho tỉ trọng HĐ (Cưới / Concept / Thẻ ...). Tooltip tùy chỉnh. Palette: Lấy màu theo chuẩn Earth-Tone.
3. Tích hợp Error Boundary và Fallback khi Fail Loading trên Client.
4. Clean code toàn bộ, Commit hoàn thành Wave 1.

## Test Criteria
- [ ] Ghi nhận data Render lên Recharts hoạt động đúng chuẩn Tailwind Variables.
- [ ] Render Data đúng. Data không có cũng ko lỗi.
