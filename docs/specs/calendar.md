# Spec: Calendar V2

Status: 📋 Code-Ready (Implementation Specifications)

## 1. Mục tiêu (Objective)

Xây dựng module Lịch V2 với định hướng làm trung tâm điều phối không gian, thời gian và nhân sự. SSOT về UI (Apple HIG + Stripe) và SSOT về dữ liệu.

## 2. Nguồn dữ liệu & Schema (Schema Truth)

### A. Sự kiện độc lập (`schedules`)

- `id` (uuid, PK)
- `event_type` (varchar)
- `event_date` (timestamptz) - _Ngày diễn ra_
- `end_date` (timestamptz nullable)
- `employee_id` (uuid, FK `employees.id`) - _Chủ sự kiện_
- `contract_id` (uuid nullable)
- `color_id` (varchar), `role_in_event` (work_type_enum)
- `status` (varchar), `google_event_id` (varchar)

### B. Nhiệm vụ Hợp đồng (`work_tasks`)

- `id` (uuid, PK)
- `contract_id` (uuid)
- `work_type` (work_type_enum)
- `assigned_to` (uuid, FK)
- `start_time`, `end_time`, `deadline` (timestamptz)
- `status`, `event_id` (FK `contract_events.id`)

### C. Google Calendar

Fetch thuần tuý read-only (hoặc push 1 chiều).

## 3. RBAC Matrix (Ma trận Quyền hạn)

_Server Action sẽ xử lý qua App-Level ACL sau khi `withAuth()` fetch profile._

| Role        | Quyền Đọc (Toàn Cục) | Role Này Có Thể Xem Lịch Ai?                                | Tạo/Xóa (Write) `schedules`         | Drag Drop (Đổi ngày) `schedules` | Drag Drop `work_tasks`   |
| ----------- | -------------------- | ----------------------------------------------------------- | ----------------------------------- | -------------------------------- | ------------------------ |
| **Admin**   | ✅ Toàn bộ Studio    | Xem được Calendar của TẤT CẢ mọi người                      | ✅ Sinh cho bất kỳ ai               | ✅ Được thao tác                 | ✅ Được sửa `deadline`   |
| **Manager** | ✅ Toàn bộ Studio    | Xem được Calendar của TẤT CẢ mọi người                      | ✅ Sinh cho bất kỳ ai               | ✅ Được thao tác                 | ✅ Được sửa `deadline`   |
| **Sale**    | ✅ Toàn bộ Studio    | Xem được Calendar của TẤT CẢ mọi người (để tránh đụng lịch) | ✅ **Chỉ tạo Lịch Cá Nhân (my_id)** | ✅ **Chỉ kéo Lịch Cá Nhân**      | ❌ Phải là `assigned_to` |
| **Media**   | ✅ Toàn bộ Studio    | Xem được Calendar của TẤT CẢ mọi người (để tránh đụng lịch) | ✅ **Chỉ tạo Lịch Cá Nhân (my_id)** | ✅ **Chỉ kéo Lịch Cá Nhân**      | ❌ Phải là `assigned_to` |

## 4. Payload Contract (Bắt buộc tuân thủ 100%)

Hàm `fetchCalendarEvents` trả về một mảng `UnifiedCalendarEvent[]` cấu trúc như sau:

```typescript
export interface UnifiedCalendarEvent {
  id: string; // schedule.id, task.id, hoặc google_event_id
  source: "schedule" | "task" | "google";
  sourceId: string; // Trỏ về bản ghi gốc DB

  title: string;
  start: string; // ISO (schedule.event_date | task.deadline | google.start)
  end: string | null; // ISO (schedule.end_date | task.end_time | google.end)
  allDay: boolean; // True nếu không có timezone exact time
  status: string; // Pending, completed, v.v..

  employeeId: string | null; // schedule.employee_id | task.assigned_to
  contractId: string | null;
  googleEventId: string | null; // Nếu có link 2 bên

  editable: boolean; // Tính toán từ RBAC Matrix ở mục 3 trên Server
  draggable: boolean; // Nguồn = contract_event hoặc google => false

  colorToken: string; // Màu UI (Tailwind hex) ánh xạ từ DB
  groupKey: string | null; // '${contract_id}_${date}' để gom nhóm ở UI
  groupLabel: string | null; // 'HĐ KH Nguyễn Văn A'

  originalDateField: string; // Cho biết drag đang sửa trường nào ('event_date' hay 'deadline')
}
```

## 5. Google Sync Policy

- **Fetch:** Best-effort async. Lỗi Google Sync thì bỏ qua (catch trả về mảng rỗng), không làm gãy luồng tải data DB nội bộ.
- **Tương tác Google Event:** Imported từ Google vào là STRICTLY Read-Only trong App.
- **Create:** Server Push `createGoogleCalendarEvent` (tạo 1 chiều) ngay lập tức nếu chọn.
- **Delete/Update:** Xoá/sửa bản ghi local có `google_event_id` SẼ Trigger Server Action sang Google thông qua `deleteGoogleCalendarEvent()`. Nếu request này fail bên Google, kệ (Log warning), nhưng ở local thì vẫn phải cập nhật lưu Database xong.

## 6. SWR Fetch & Cache Strategy

- **Chiến lược:** Pure Client Fetch + Skeleton Loading (Không SSR prefetch để tận dụng bộ nhớ đệm phân tán nhanh gọn).
- **Cache Key:** `[ 'calendar', { timeMin: isoStart, timeMax: isoEnd, employees: [...], status: [...] } ]`

## 7. UI Constraints

- Desktop: Tháng (Grid 7x5) - Cấm Kanban Board.
- Mobile: Lưới gọn - Bấm -> Drawers Detail - Cấm View Tuần/Ngày nhiều cột.
