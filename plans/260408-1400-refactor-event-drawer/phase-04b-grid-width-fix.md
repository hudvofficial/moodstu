# Phase 04b: Xử lý triệt để lỗi "Ô to ô nhỏ" của CSS Grid (Sửa lỗi Hotfix)

## 1. Vấn đề gốc rễ (Root Cause)
Sau khi check ảnh anh gửi, em đã phát hiện ra sát thủ thực sự phá vỡ `form-grid-2col`:
- **Lỗi CSS Grid Intrinsic Behavior**: Thẻ `1fr 1fr` của CSS Grid không mặc định ép chết 50-50, mà nó vẫn tính toán dựa trên `min-width` của thẻ con. Khổ nỗi `<Input type="time">` của trình duyệt có thuộc tính min-width ngầm khá lớn -> Nó tự ý bành trướng cột 2, bóp nghẹt cột 1 (DatePicker).
- **Lỗi Thừa Wrapper**: Em tự ý chế ra thẻ `<div className="space-y-2">` bọc bên ngoài `DatePicker` và `Input`. Trong khi thực tế, bản thân thiết kế gốc của cả 2 component này **đã có sẵn prop `label`** để tự render label và tự lo khoảng cách chuẩn. Việc bọc thêm thẻ Div vô tình triệt tiêu khả năng ép width của thẻ con, đồng thời làm chiều cao/khoảng cách label bị sai sót.

## 2. Giải quyết (Chỉ code khi anh Duyệt)
- **Xóa Wrapper Dư Thừa**: Đập bỏ các thẻ `<div className="space-y-2">` tự chế đối với khối Date/Time.
- **Dùng Native Label**: Bắn trực tiếp prop `label="Ngày bắt đầu"`, `label="Giờ bắt đầu"` vào thẳng thẻ Component `<DatePicker>` và `<Input>`.
- **Ép chết Min-Width (Khống chế CSS Grid)**: Trực tiếp ghim class `min-w-0` vào `className` của DatePicker (Thẻ `<Input>` đã có sẵn `min-w-0` ở nhân lõi nội tại của nó). Thuộc tính thẻ `min-w-0` này chính là "khắc tinh" của CSS Grid, buộc hai cột phải chia đúng vạch 50-50 tuyệt đối không nhân nhượng.

## 3. Lịch sử bài học cập nhật
- **Luôn tuân thủ V3**: Bất kỳ phát hiện lỗi gì (dù là CSS hay logic nhỏ) -> Mở Browser -> Chụp ảnh so sánh -> Viết Plan (Thêm file `.md` phụ) -> Chờ duyệt -> Code.

---

**Lệnh thi hành**:
Nếu anh đồng ý với chiến lược bóc tách Wrapper và thêm `min-w-0` này, xin hãy gõ `/code phase-04b`. (Và nhớ nhấn *Reject All* dòng code fix mù lúc nãy của em trên IDE nha!)
