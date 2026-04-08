# Audit Report - 08/04/2026 (DatePicker & Input UI Alignment)

## Summary
- 🔴 Critical Issues: 1 (Lỗi Cấu Trúc CSS cốt lõi - SSOT Violation)
- 🟡 Warnings: 1 (Chiều cao ẩn của thẻ input native)
- 🟢 Suggestions: 1 (Cân nhắc dùng `items-stretch` thay vì `items-start`)

## 🔴 Critical Issues (Phải sửa ngay)
1. **Lỗi Vi Phạm Cấu Trúc SSOT (Single Source of Truth) trong `DatePicker`**
   - **Tệp tin:** `components/ui/date-picker.tsx` (Dòng 407)
   - **Nguyên nhân gốc rễ:** Trong khi thẻ `Input` bên phải tuân thủ tuyệt đối chuẩn `.input-base` (chứa `padding: 10px`, `font-size: 14px`, `border: 1px solid var(--color-border)`, `min-height: 44px`), thì nút bấm của `DatePicker` lại sử dụng **hardcode Tailwind**: `px-3 py-2.5 min-h-11 text-xs border-border`. 
   - **Hậu quả:** 
     - Font chữ lệch (12px vs 14px).
     - Padding khác nhau.
     - Viền lệch mầu (`border-border` không hoàn toàn khớp với `var(--color-border)` ở một số state).
     - Mọi nỗ lực ép khung bằng container đều vô ích vì nội tạng 2 component này KHÁC HẴN NHAU.
   - **Cách khắc phục:** Refactor nút bấm của `DatePicker` để sử dụng trực tiếp class `.input-base`.

## 🟡 Warnings (Lỗi ẩn trong trình duyệt)
1. **Height nở rộng của `<input type="time">`**
   - Trình duyệt Chrome/Webkit có shadow DOM cho input time với padding cố định bên trong. Khi ta áp thêm `padding-top/bottom: 10px` từ `.input-base`, hộp input bị nội dung bên trong đẩy phình ra thành **46px** (hoặc xê dịch baseline).
   - Vì container xài `align-items: start;`, DatePicker (44px) và Time Input (46px) sẽ neo cùng trên 1 điểm, nhưng Time Input bị dài hơn xuống dưới, tạo cảm giác bị lún hoặc xô lệch 2-3px.
   - **Cách khắc phục:** Khóa cứng `height: 44px` trong css cho `.input-base`, hoặc dùng flex container với `items-stretch`.

## 🟢 Action Plan
Thay vì fix lung tung từng chỗ, ta làm một phát chuẩn chỉnh như sau:
1. Sửa `DatePicker` xóa toàn bộ hardcode, bơm `.input-base` vào.
2. Ép cứng `h-11` (44px) hoặc dùng thủ thuật stretch trong grid để khóa chết chiều cao.

🎯 **Phác đồ này đảm bảo hết lệch 100% bằng chứng cứ vật lý hiển thị.**
