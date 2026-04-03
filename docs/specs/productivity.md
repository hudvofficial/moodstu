# Spec: Productivity Module (Năng suất nhân sự)

Status: 📋 Draft — chờ User duyệt

## 1. Mô tả nghiệp vụ

Phân hệ Năng suất (Productivity) là một Server-driven Dashboard giúp Quản lý/Chủ Studio theo dõi khối lượng công việc, hiệu suất và tải công việc của nhân sự (dựa trên task). Dữ liệu được tổng hợp tự động theo chu kỳ (Tuần / Tháng / Quý) và cảnh báo tình trạng "quá tải" (overloaded).

## 2. Database Schema

Module này là một **Read-only Dashboard** được nuôi bằng PostgreSQL RPCs. Không tạo table mới, cấu trúc phục thuộc vào table `employees`, `work_tasks`, `contracts`.

- Dùng `get_employee_productivity`: Thống kê nhân sự.
- Dùng `get_employee_job_details`: Thống kê chi tiết task của nhân sự đó.

## 3. Server Actions

Đã tồn tại sẵn tại `app/actions/productivity-actions.ts`:

- **Queries:**
  - `fetchProductivityData(period)`: Lấy dữ liệu summary và list employees.
  - `fetchEmployeeJobDetails(employeeId, start, end)`: Detail view các nhiệm vụ của một người.

## 4. UI Components

Chỉ xây dựng giao diện dựa trên Component Catalog V2 Gold Standard:

**Pages:**

- `app/(protected)/productivity/page.tsx`
- `app/(protected)/productivity/loading.tsx`

**Tách file Components chuẩn:**

- `productivity-list-page.tsx`: Client orchestrator (State `period`, SWR refetch).
- `productivity-stats-bar.tsx`: Hiển thị `ProductivitySummary` (tổng giờ, hoàn thành, quá tải...).
- `productivity-filters.tsx`: Bộ lọc thời gian (Tuần, Tháng, Quý) dạng `TabsFilter` or `SelectPill`.
- `productivity-table.tsx`: Bảng Desktop 100% width.
- `productivity-card.tsx`: Mobile grouped thẻ dọc.
- `productivity-detail-drawer.tsx`: Drawer (mở từ góc phải PC) hoặc Bottom Sheet (Mobile) gọi hàm chi tiết task `fetchEmployeeJobDetails` khi click dòng.

## 5. Status Transitions

N/A. (Đây là dashboard chỉ đọc, không có workflow chuyển trạng thái).

## 6. Compliance Check

- [x] SWR Client-fetching thay vì React Query.
- [x] Desktop: Bảng `<TableWrapper>`, Mobile: `<div className="lg:hidden space-y-2">`
- [x] Không hardcode CSS, sử dụng `.card-base`, `.badge`, `StatsBar`, `TabsFilter`.
- [x] UI tuân thủ `module-blueprint.md` Blocks 1-4.
