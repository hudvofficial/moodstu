# Audit Report - 2026-04-08 (Lunar Converter Center Issue)

## Summary
- 🔴 Critical Issues: 1 (Layout breaking)
- 🟡 Warnings: 1 (Typographical sizing mismatches container)
- 🟢 Suggestions: 1

## 🔴 Critical Issues (Phải sửa ngay)
1. Lỗi căn lề (text-left) và Spin Button chiếm diện tích (Cắt đuôi số)
   - **File:** `components/calendar/solar-lunar-converter.tsx`
   - **Nguy hiểm:** Nút spin mũi tên lên/xuống của `<input type="number">` theo chuẩn trình duyệt (đặc biệt là Safari/Chrome/Firefox) vẫn đang hiển thị. Việc dùng class `[&::-webkit-inner-spin-button]:appearance-none` là chưa đủ mạnh mẽ. Điều này dẫn tới hai hệ quả:
     - (1) Nó chiếm không gian 20-30px bên phải thẻ input, làm cho chữ bị lệch sang trái thay vì center, dù đã có class `text-center`.
     - (2) Ô "Năm" với số "2026" khá rộng, bị spin button chèn ép sinh ra hiện tượng cắt chữ đuôi (thành số 202).
   - **Cách sửa:**
     - Xóa triệt để dấu vết Spin Button: Cần ghép đủ combo: `[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`.
     - Giảm font chữ: Thay vì `text-h2` có thể quá lớn cho Grid-Cols-4 trên mobile, nên sử dụng `text-3xl` hoặc `text-2xl` cho an toàn (hoặc `text-h3`).
     - Force padding: Thay vì `px-2` kết hợp `px-3` của `input-base`, cần ép `!px-1 p-0` để nội dung không bị giới hạn ảo bên trong thẻ.

## 🟡 Warnings (Nên sửa)
1. Thừa thải thuộc tính `min-w-0`
   - **File:** `components/calendar/solar-lunar-converter.tsx`
   - **Lý do:** Thuộc tính `min-w-0` chỉ hoạt động trị flex, grid ở layout con, không có ý nghĩa khi `&::-webkit-inner-spin-button` đã được sửa dứt điểm.

## 🟢 Suggestions (Tùy chọn)
1. Bổ sung focus UI: Focus ring nên thống nhất màu sắc khi bấm vào ô "Ngày/Tháng/Năm" trên Lunar Converter.

## Next Steps
Dùng `/code phase-01b-padding-spin-buttons` (hoặc lệnh tương tự) để Antigravity fix dứt điểm layout này vào file source thực.
