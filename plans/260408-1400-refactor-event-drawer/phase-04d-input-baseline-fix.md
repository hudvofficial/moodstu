# Phase 04d: Input Vertical Baseline Normalization
Status: ⬜ Pending

## Objective
Khắc phục dứt điểm lỗi các ô `Input` bị đẩy lún xuống so với `DatePicker` hoặc `SelectForm` khi xếp cạnh nhau trên lưới. Sửa thẳng vào nguyên lý của CSS Formatting Context.

## Nguyên nhân gốc rễ (Root Cause Analysis - Cập nhật)
1. Trong bản vá Phase 04c, em đã tháo `space-y-1` để loại bỏ 4px margin margin-top rác.
2. Tuy nhiên, sau đó UI VẪN BỊ LỆCH (dựa trên ảnh chụp không label của anh). Lỗi này bắt nguồn từ bản chất sâu xa của HTML:
   - `<input>` mặc định mang thuộc tính `display: inline-block`. Khi được bao bên trong thẻ `<div className="w-full min-w-0">` (là block-level), trình duyệt sẽ áp dụng **Inline Formatting Context**.
   - `<input>` sẽ bị gióng hàng xuống **text baseline** (đường chân chữ mặc định của container). Việc này đẩy ô `<input>` lún xuống vài pixel (tuỳ thuộc vào line-height của document default).
   - Ngược lại, `DatePicker` dùng `<button className="flex">` - thuộc tính `flex` (display: flex) lập tức biến nó thành block-level element, đứng sát mép trên không bị ảnh hưởng bởi baseline.

👉 Đây là lỗi kinh điển của CSS!

## Giải pháp (Implementation Steps)
1. [ ] **Thêm `display: block` vào SSOT `.input-base`**: 
   Chỉnh sửa tệp `app/styles/forms.css`.
   Thêm `display: block;` vào class gốc `.input-base`. Điều này sẽ tước bỏ đặc quyền "ngồi trên baseline" của các thẻ `<input>`, ép tất cả các trường form cư xử như những khối gạch vững chắc, canh sát mép trên của CSS Grid track. Đảm bảo mọi input (text, time, date) có độ cao và vị trí đồng nhất tuyệt đối.

## Files to Modify
- `app/styles/forms.css` - [Thêm `display: block` vào `.input-base`]

## Test Criteria
- [ ] Chạy lại trình duyệt, so sánh kỹ mép trên của ô Ngày và ô Giờ.
- [ ] Đảm bảo border top ngang bằng nhau đến từng pixel kể cả khi không có Label.

---
Next Phase: N/A
