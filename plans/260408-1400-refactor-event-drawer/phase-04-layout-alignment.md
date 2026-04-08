# Phase 04: Căn chỉnh Layout cho DatePicker & Time Input (Bản cập nhật rà soát)

## Vấn đề hiện tại
Trong bản nháp trước, em đã đề xuất gỡ bỏ `form-grid-2col` và tạo `flex flex-col` bọc toàn bộ form, điều này tuy giải quyết được lỗi DatePicker bị bóp nghẹt, nhưng lại phá vỡ tính nhất quán của thiết kế Desktop / Modal System (vốn dĩ luôn gom các cột nhập liệu thành 2 column). Việc nhét thủ công `flex gap-2` cho Date và Time vào bên trong 1 column của `form-grid-2col` (làm bề ngang mỗi trường bị bóp còn ~90px) chính là nguyên nhân gốc rễ.

## Giải pháp chuẩn xác (Duy trì Grid System)
Thay vì nhét cả Ngày và Giờ vào chung 1 lưới con, ta sẽ tách Ngày và Giờ ra thành **hai trường riêng biệt**, tương ứng với 2 cột của `form-grid-2col` hiện có.

- **Hàng 1 (`<div className="form-grid-2col shrink-0">`)**: 
  - Cột 1: `Ngày bắt đầu` (DatePicker)
  - Cột 2: `Giờ bắt đầu` (Input type="time")
- **Hàng 2 (`<div className="form-grid-2col shrink-0">`)**: 
  - Cột 1: `Ngày kết thúc` (DatePicker)
  - Cột 2: `Giờ kết thúc` (Input type="time")

*(Tuyệt đối không dùng `mt-4` bừa bãi. Khoảng cách giữa 2 khối này sẽ tự động ăn theo token `space-y-4` của wrapper cha `<div className="space-y-4">` đã có sẵn).*

Bằng cách này:
1. Mỗi trường đều sở hữu đúng **50% bề ngang** (~208px), thừa không gian cho `DatePicker` không bị tràn text.
2. Form giữ nguyên cấu trúc Standard `form-grid-2col` theo CSS Token cốt lõi của V2, không tự sinh code layout `flex` phá form.
3. Logical Grouping rõ ràng hơn cho người dùng.

## Gate Check
- Bề ngang các cột chuẩn 50-50, không còn bị rớt chữ.
- Hàng lối (Alignment) khớp với các Select Box / Input phía dưới của Form.

## Next Steps
Anh duyệt lại bản Plan này bằng lệnh:
`/code phase-04`
