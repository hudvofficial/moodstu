# Audit Report - 2026-04-08

## Phạm vi: Giao diện Mobile Calendar Toolbar (Khối Action Buttons)

Sau khi kiểm tra trực quan UI qua browser, em đã tìm ra nguyên nhân cốt lõi khiến tổng thể các nút trên Header vẫn mang lại cảm giác "nhỏ" và "lạc quẻ" dù đã tăng size icon bên trong:

## 🔴 Critical Issues (Vấn đề cốt lõi về UI/UX)

1. **Sai lệch Shape (Hình dáng) dẫn đến ảo giác "Nhỏ"**
   - **Vấn đề:** Khối hiển thị tháng (`T4, 2026`) đang dùng khối bo góc `rounded-lg` (hình chữ nhật bo tròn), có khối lượng thị giác lớn. Trong khi đó, 2 nút Action kế bên là `rounded-full` (hình tròn). Thể tích của hình tròn `40px` luôn hụt 4 góc so với hình vuông bo tròn `40px`, làm tổng thể nó trông teo tóp và lệch tone.
   - **Cách sửa:** Đổi 2 nút Action sang `rounded-[14px]` (Squircle) hoặc `rounded-xl` để đồng bộ form dáng vững chãi với khối Date Picker.

2. **Kích thước Touch Target bị hụt so với chuẩn Apple HIG**
   - **Vấn đề:** Kích thước nút hiện tại là `w-10 h-10` (40px). Trong Mobile UX (đặc biệt HIG của Apple), khu vực chạm ngón cái trên navbar được khuyến nghị tối thiểu là `44px x 44px`. Cái này làm anh thấy nó bị nhỏ so với ngón tay.
   - **Cách sửa:** Nâng base container của 2 nút này lên `w-11 h-11` (44px) - chuẩn bài App. Icon bên trong duy trì `w-5 h-5` nhằm tạo không gian thở (padding), nhưng tăng nhẹ stroke.

3. **Background & Border nhạt nhòa**
   - **Vấn đề:** Nút Date Pick có mảng khối rõ ràng, trong khi 2 nút Action lại xài viền mỏng + nền chìm vào nền app (`bg-bg-card border-border/50`).
   - **Cách sửa:** Dùng nền mờ chung hệ thống kiểu `bg-text-main/5 hover:bg-text-main/10` gỡ bỏ border dư thừa.

## ⚙️ Thiết kế mã (Fix Plan)

Nếu anh chấp thuận bản phân tích này, em sẽ làm đúng 1 path cho `calendar-toolbar.tsx`:
1. Thay `w-10 h-10 rounded-full` => `w-11 h-11 rounded-[14px]`.
2. Thay `border border-xxx bg-bg-card` => `bg-text-main/5 text-text-main`.
3. Thay `<Icon className="w-6 h-6" />` => `<Icon className="w-5 h-5" strokeWidth={2.5} />` (nhỏ lại xí nhưng nét đanh hơn, hợp với container 44px).
