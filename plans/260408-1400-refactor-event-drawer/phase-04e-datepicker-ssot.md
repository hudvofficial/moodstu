# Phase 04e: SSOT Compliance for DatePicker
Status: ✅ Complete

## Objective
Khắc phục lỗi lệch viền, lệch font và lệch chiều cao cuối cùng giữa `DatePicker` và `Input` do vi phạm cấu trúc Design System (SSOT). Đồng nhất component `DatePicker` sử dụng đúng chuẩn lưới `.input-base`.

## Current Flaws (Lỗi đang tồn tại)
Component `DatePicker.tsx` (dòng 407) định nghĩa giao diện nút bấm hoàn toàn bằng cấp độ CSS Inline (Tailwind classes thủ công) như sau:
`className="w-full px-3 py-2.5 min-h-11 text-left text-xs leading-4 border border-border..."`

Điều này đi ngược lại hoàn toàn với quy chuẩn SSOT của dự án (mọi form input phải dùng `.input-base`). Hậu quả vật lý sinh ra:
1. Chiều cao tính toán lệch (44px cố định vs `<input>` co giãn).
2. Viền màu khác nhau.
3. Kích thước font chữ bị bé đi (12px vs 14px chuẩn của .input-base).
4. Label căn gập ghềnh.

## Implementation Steps
1. [ ] **Chỉnh sửa `DatePicker.tsx`**:
   - Tìm kiếm dòng định nghĩa `button` trigger bật lịch (khoảng line 407).
   - Xóa toàn bộ chuỗi hardcode: `px-3 py-2.5 min-h-11 text-xs leading-4 border border-border`.
   - Thay thế bằng **`.input-base`** (tự động nhận 100% style chuẩn).
   - Bổ sung thêm `.flex .items-center .justify-between` để dàn đều biểu tượng icon.
2. [ ] **Cập nhật `plan.md`**: Tick Done cho 04e khi hoàn thiện.

## Tests
- Kiểm tra trực quan: DatePicker và Time Input phải giống hệt nhau về đường viền, độ dày hộp, font chữ bên trong.
- Cả hai khi đặt trong lưới Grid sẽ phẳng tắp 100%. Mức độ hoàn thiện Enterprise.
