# BÁO CÁO PHÂN TÍCH HIỆU NĂNG: LOGIN & DASHBOARD LOAD TIME

## 📌 Tổng quan
Báo cáo này phân tích nguyên nhân gây ra sự chậm trễ trong luồng đăng nhập và tải trang Dashboard của dự án `mood-studio`. Mục tiêu là cung cấp đủ thông tin kỹ thuật để thực hiện tối ưu hóa mà không cần phân tích lại từ đầu.

---

## 🔴 1. Vấn đề chính: Xác thực và Tải Context trùng lặp

Điểm nghẽn lớn nhất nằm ở việc thực hiện nhiều Network Round-trips dư thừa tới Supabase để xác thực người dùng và tải thông tin nhân viên.

### 1.1. Xác thực dư thừa (Middleware $\rightarrow$ Layout)
- **`middleware.ts`**: Thực hiện `supabase.auth.getClaims()`. Đây là thao tác kiểm tra JWT local, tốc độ nhanh, dùng để gatekeeper các route.
- **`app/(protected)/layout.tsx`**: Gọi `getAuthenticatedUserContext()`.
- **`lib/auth_utils.ts` $\rightarrow$ `getAuthenticatedUserContext()`**: 
    - Hàm này mặc định gọi `getVerifiedUser()` (Sử dụng `supabase.auth.getUser()`).
    - **Vấn đề**: `getUser()` là một **network request** tới GoTrue API của Supabase. Việc gọi `getUser()` ngay sau khi `middleware` đã xác thực qua claims là dư thừa và gây trễ (thường từ 200ms - 800ms tùy region).

### 1.2. Truy vấn hồ sơ nhân viên (`employee context`)
- Sau khi có user, hệ thống gọi `getEmployeeContextByAuthUserId(user.id)`.
- Hàm này sử dụng `createAdminClient()` để truy vấn bảng `employees`.
- **Vấn đề**: Đây là một network call khác. Mặc dù có dùng `@cache`, nhưng lần đầu load trang vẫn phải chờ DB phản hồi. Việc có cơ chế retry (`EMPLOYEE_CONTEXT_RETRY_DELAYS_MS`) cho thấy sự không ổn định về schema cache hoặc latency của DB.

### 1.3. Luồng khởi tạo (`bootstrapProfile`)
- Nếu `bootstrapProfile: true`, hàm `bootstrapEmployeeProfile()` sẽ chạy.
- Luồng này thực hiện chuỗi thao tác: `Select email` $\rightarrow$ `Update auth_user_id` $\rightarrow$ `syncAuthIdentity` (Update metadata).
- **Vấn đề**: Đây là một chuỗi các request ghi/đọc DB liên tiếp, gây chậm trễ nghiêm trọng trong lần đầu đăng nhập hoặc khi đồng bộ profile.

---

## 🟡 2. Các điểm nghẽn phụ

### 2.1. Hydration Providers tại `RootLayout`
- `app/layout.tsx` bọc ứng dụng trong một chuỗi dài các providers: `ThemeProvider`, `NuqsAdapter`, `SWRProvider`, `QueryProvider`, `ModalProvider`, `ViewTransitions`, v.v.
- **Vấn đề**: Việc mount quá nhiều context ở cấp cao nhất có thể làm tăng thời gian TTI (Time to Interactive).

### 2.2. Dữ liệu Dashboard (RPC calls)
- Dashboard fetch nhiều RPC phức tạp: `get_dashboard_kpi`, `get_dashboard_revenue_chart`, `get_dashboard_service_breakdown`.
- **Vấn đề**: Nếu các RPC này chưa được tối ưu hóa ở phía PostgreSQL, thời gian phản hồi sẽ kéo dài, khiến user cảm thấy dashboard "load lâu" dù đã qua bước login.

---

## 🚀 Gợi ý tối ưu hóa cho Claude

Để cải thiện tốc độ, hãy tập trung vào các hướng sau:

1. **Ưu tiên `getClaims()` hơn `getUser()`**:
   - Thay đổi `getAuthenticatedUserContext` để sử dụng `getClaimsUser()` (local JWT verify) thay vì `getVerifiedUser()` (network call) cho các luồng chỉ cần đọc thông tin cơ bản.
   - Chỉ sử dụng `getUser()` cho các thao tác ghi hoặc các flow yêu cầu xác thực tuyệt đối.

2. **Tối ưu hóa truy vấn Employee**:
   - Kiểm tra index của cột `auth_user_id` trong bảng `employees`.
   - Cân nhắc đưa các thông tin nhân viên cơ bản (role, full_name) vào `app_metadata` của Supabase Auth để lấy trực tiếp từ JWT claims mà không cần gọi DB.

3. **Tinh gọn luồng Bootstrap**:
   - Giảm thiểu số lượng request trong `bootstrapEmployeeProfile`. Gộp các thao tác update nếu có thể.

4. **Tối ưu Dashboard Rendering**:
   - Sử dụng `React.Suspense` và skeleton screens cho các RPC nặng để không chặn render toàn bộ trang.
   - Kiểm tra performance của các hàm RPC trong Supabase.

---
**File phân tích bởi:** Mood Sen (OpenClaw Agent)
**Ngày thực hiện:** 10/06/2026
