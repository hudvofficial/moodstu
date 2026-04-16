# BRIEF: Khôi Phục Business Logic Bảng Lương (Từ V1 lên V2)
**Vấn đề:** Trong quá trình refactor UI và chuyển đổi Server Actions (V2), hệ thống Bảng Lương (Module Salaries) đã bị lược bỏ quá tay các Logic Cốt Lõi từ V1. Hệ quả là bảng lương trở thành dạng "Read-only" thiếu các chức năng tác nghiệp kế toán.

## Danh Sách Chức Năng Bị Thất Lạc Cần Phục Hồi:
1. **Pre-flight Warnings (Cảnh Báo Trước Khởi Tạo):** V1 phát hiện Hợp đồng chưa gán nhân sự, Hợp đồng lương 0đ trước khi chạy tạo lương. V2 ghi đè bằng Server Action ẩn khiến user mất quyền kiểm soát.
2. **Hệ Thống Thanh Toán (Payment Tracking):** V1 theo dõi Dòng tiền 2 lớp: `net_salary` (Tổng phải trả), `paid_amount` (Đã thanh toán), `remaining_amount` (Còn lại) -> kèm trạng thái Xong/1 Phần/Chờ. V2 bị thiếu cột và logic này.
3. **Thao Tác Component:**
   - **In Phiếu Lương (`PayslipModal.tsx`)**: Missing.
   - **Thanh Toán Nhanh (`PaymentConfirmModal.tsx`)**: Missing.
   - **Xóa User Khỏi Bảng Lương (`DeleteEmployeeModal.tsx`)**: Missing.
4. **Tham Số Bổ Sung JSONB:**
   - Lương cứng ở V2 cần tính toán linh hoạt dựa trên `salary_info` JSONB (Tránh gán cứng 0đ).

## Mục Tiêu Hướng Tới:
Phục hồi trọn vẹn sức mạnh "Nghiệp vụ Kế toán" của V1 lên Giao diện SSOT bóng mượt của V2. Hệ thống phải đảm đương được việc Tracking Dòng Tiền & In Cấp Phiếu Lương.
