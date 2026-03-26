# Audit Report - Rentals Module (26/03/2026)

## Summary
- 🔴 Critical Issues: 0
- 🟡 Warnings: 2 (Lỗi hiển thị UI Desktop, sai Design Token)
- 🟢 Suggestions: 1

## 🔴 Critical Issues (Phải sửa ngay)
*(Không có lỗi bảo mật hoặc N+1 query nguy cấp. Các Action đã có withAuth, Zod schema.)*

## 🟡 Warnings (Nên sửa)
1. **Sai cấu trúc Token và Layout Desktop trên khối Thống kê (Stats Bar)**
   - **File:** `components/dresses/standalone-rentals-client.tsx`
   - **Triệu chứng:** Khối "Tổng đơn thuê" (Stats array) chạy ngang nguyên cả khung màn hình Desktop 1440px mà bên trong chỉ điểm đúng chữ siêu nhỏ (`text-body-sm`), nhìn trống huếch và giống web bị vỡ.
   - **Cách sửa:** Gọn lại thành một cụm Stats chuyên nghiệp (`text-h3 tabular-nums`), giống với màn hình quản lý `DressesStatsBar` (áp dụng Style Apple HIG Dashboard).

2. **Dùng sai CSS Class tự chế - Tailwind V4 không hiểu**
   - **File:** `components/dresses/standalone-rentals-client.tsx`
   - **Triệu chứng:** Sử dụng class `hover:bg-hover/30` và `border-border/30` cho các dòng Table (`RentalRow`). Tại biến `--color-` ở `globals.css` chỉ có `bg-bg-hover` (earth-tone). Việc ghi sai class gốc khiến chuột lia qua dòng dữ liệu không đổi màu phản hồi (vì Tailwind không sinh style).
   - **Cách sửa:** Thay thế toàn bộ bằng `hover:bg-bg-hover` và `border-border-light` (giống màn hình `contract-list`).

## 🟢 Suggestions (Tùy chọn)
1. **Empty State Component:** Component `<EmptyState>` đang khá to, nếu mảng `/dresses/rentals` ít dữ liệu có thể cân nhắc kích cỡ nhỏ hơn để gọn gàng hơn, tuy nhiên hiện tại thì UI vẫn đang ổn định và consistent.

---
## Next Steps
(Chi tiết trong Menu Action Plan ở tin nhắn của em)
