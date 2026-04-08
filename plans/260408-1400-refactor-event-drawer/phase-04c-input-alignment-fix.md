# Phase 04c: Input & DatePicker Alignment Fix
Status: ⬜ Pending
Dependencies: Phase 04b

## Objective
Sửa triệt để lỗi "lệch 4px chiều dọc" giữa ô `Input type="time"` và `DatePicker` bằng cách xử lý triệt để nguyên lý CSS Margin Collapse.

## Bối cảnh kỹ thuật
1. Hiện tại, `Input.tsx` sử dụng class `space-y-1` để tạo khoảng cách giữa Label, Input, và Error Message.
2. Tuy nhiên, class CSS SSOT `.label-base` và `.error-text` trong `forms.css` **ĐÃ ĐƯỢC ĐỊNH NGHĨA SẴN** các thông số `margin-bottom: 4px` và `margin-top: 4px`.
3. Do ô `<input>` mang đặc tính `inline-block`, luật ép biên (Margin Collapse) của CSS bị vô hiệu hóa. Sự hiện diện của `space-y-1` đã VÔ TÌNH CỘNG DỒN thêm một đoạn margin 4px nữa, làm cho khoảng cách gap bị đội lên (4+4 = 8px).
4. `DatePicker` thì làm chuẩn (chỉ dùng label-base) nên gap là 4px.

=> Sự xung đột giữa tiện ích Tailwind (`space-y-1`) và SSOT Global (`margin` chuẩn) gây ra độ lún lệch 4px trên giao diện form.

## Implementation Steps
1. [x] **Tháo gỡ `space-y-1` khỏi `Input.tsx`**: 
   Chỉnh sửa tệp `components/ui/input.tsx`, giữ nguyên container `w-full min-w-0` nhưng loại bỏ hoàn toàn `space-y-1`.
   Trả lại quyền quản lý khoảng cách (gap) duy nhất cho các thành phần gốc là `.label-base` và `.error-text`.

## Files to Modify
- `components/ui/input.tsx` - [Tháo gỡ Tailwind space-y-1 dư thừa]

## Test Criteria
- [ ] Vị trí các ô Text, Time, Date trên cùng một hàng của Form phải bằng chằn chặn nhau đến từng vi-mê-li, không có ô nào bị đẩy lún xuống.
- [ ] Label của Input vẫn hiển thị cách khung nhập đúng 4px chuẩn V2 Gold Standard.
- [ ] Error message (nếu có) vẫn cách khung nhập đúng 4px dưới đít.

---
Next Phase: N/A (Đây là bản vá layout cuối cùng cho UI)
