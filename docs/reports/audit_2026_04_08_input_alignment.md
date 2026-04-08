# Audit Report - 2026/04/08 (UI Alignment Audit)

## Summary
- 🔴 Critical Issues: 0
- 🟡 Warnings: 1 (Form Field Vertical Alignment)
- 🟢 Suggestions: 1

## 🟡 Warnings (Nên sửa)
1. Lỗi lệch chiều dọc giữa Component DatePicker và Component Input
   - File: `components/ui/input.tsx` và `app/styles/forms.css`
   - Nguyên nhân: Đây là một lỗi "margin collapse" siêu kinh điển của CSS.
     Bên trong `Input.tsx` đang có thẻ bọc `<div className="w-full space-y-1">`. Class `space-y-1` chèn thêm `margin-top: 4px` cho thẻ `<input>`.
     Bên cạnh đó, nhãn tự nhiên `.label-base` cũng đã quy định sẵn `margin-bottom: 4px`.
     Theo luật CSS, margin giữa 2 thẻ `Block` sẽ bị "collapse" (triệt tiêu dồn cục thành 1), nhưng ngặt nỗi thẻ `<input>` mặc định mang đặc tính `inline-block` chứ KHÔNG PHẢI `block`. Do đó CSS Margin Collapse mất tác dụng! Lỗ hổng này dẫn đến kết quả: Gap của DatePicker là **4px**, trong khi Gap của Input là **4px + 4px = 8px**. Vì thế mà ô nhập giờ (Time Input) luôn bị trễ / lún xuống dưới 4px so với ô DatePicker bên trái dù bề ngang đã chia đều.
   - Cách sửa:
     - Xóa class `space-y-1` thừa thãi bên trong wrapper của `components/ui/input.tsx` vì bản thân `label-base` đã là SSOT cho khoảng cách dãn dòng.
     - Về lâu dài, có thể gắn thẳng `display: block` vào `.input-base` trong `form.css` để bảo vệ vững chắc margin logic.

## 🟢 Suggestions (Tùy chọn)
1. Thêm Option xóa nhãn dán trong Grid (Design SSOT)
   - Nếu trong một lưới lưới sát nhau (form-grid) mà người dùng chủ động bỏ dãn lề, ta nên quy chuẩn Component Input & DatePicker sử dụng chung 1 root context. Hiện tại `Input.tsx` và `DatePicker.tsx` đều có logic render Label riêng bên trong Component thay vì tách riêng. Điều này tiện nhưng nếu label không xuất hiện, wrapper DOM tree vẫn lệch. Tạm thời giải pháp tháo `space-y-1` sẽ khắc phục dứt điểm 100% bug hiện tại.

## Next Steps
Bấm phím tắt để triển khai Fix All Mode.
