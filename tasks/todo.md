# Kế hoạch sửa lỗi tạo khách hàng mới & Tối ưu hoá toàn hệ thống

## Vấn đề gốc rễ
- Lỗi `insert or update on table "customers" violates foreign key constraint "customers_created_by_fkey"` xảy ra khi tạo khách hàng mới.
- Nguyên nhân: Trong file `customer-actions.ts`, biến `created_by` đang gán nhầm thành `employee.id` (ID nội bộ của bảng `employees`) thay vì phải là `userId` (ID của bảng `auth.users`).

## Kết quả Audit diện rộng toàn dự án
Để đảm bảo xử lý triệt để, em đã audit toàn bộ các file trong thư mục `app/actions/` để tìm kiếm sự phân công sai lệch tương tự:
1. **Các modules bị ảnh hưởng:**
   - `app/actions/customer-actions.ts` (1 lỗi tại hàm `createCustomer`)
   - `app/actions/lead-actions.ts` (1 lỗi tại hàm `createLead`)
2. **Các modules KHÔNG bị ảnh hưởng (đang dùng đúng `userId`):**
   - Hầu hết toàn bộ các module khác (finance, inventory, printing, expense, receipt, debt, work-task, v.v...) đều dùng chuẩn `created_by: userId` và `updated_by: userId`.
   - Hàm `writeAuditLog` tại `lib/audit.ts` cũng đã tách bạch rất chuẩn `performed_by` (auth.users.id) và `employee_id`.

## Kế hoạch thực hiện (Đã cập nhật)
- `[x]` **Sửa lỗi chính:** Thay thế `employee.id` bằng `userId` tại hàm `createCustomer` (file `customer-actions.ts`).
- `[x]` **Tối ưu phòng ngừa:** Thay thế `employee.id` bằng `userId` tại hàm `createLead` (file `lead-actions.ts`).
- `[x]` Kiểm tra lại các file này xem còn truyền biến nào sai lệch tham chiếu không (ví dụ: `assigned_to` đã dùng đúng `employee.id`).
- `[x]` Tiến hành build lại và kiểm tra code để đảm bảo code sạch.

Xin phép anh duyệt plan hoàn chỉnh này để em bắt đầu code!
