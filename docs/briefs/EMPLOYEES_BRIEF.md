# 💡 BRIEF: Module Employees — Quản lý Nhân sự Mood Studio

**Ngày tạo:** 2026-03-24  
**Cập nhật:** 2026-03-24 (v2 — Deep Audit)  
**Source:** /brainstorm + V1 codebase + V2 DB schema + RLS policies + Cross-module audit  
**Trạng thái:** Chờ duyệt → `/plan`

---

## 1. TỔNG QUAN MODULE

### Vấn đề cần giải quyết
Mood Studio cần **một giao diện quản lý nhân sự tập trung** để:
- Theo dõi đội ngũ gồm nhiều vai trò đặc thù studio (Photographer, Makeup Artist, Retoucher, Editor, Sales, Cameraman)
- Tra cứu nhanh ai đang làm, ai đã nghỉ, bộ phận nào thiếu người
- Xem hồ sơ chi tiết + ghi chú quản lý cho từng nhân viên
- Nhân viên tự xem & cập nhật thông tin cá nhân cơ bản
- Liên kết dữ liệu nhân sự với các module khác: Work Tasks, Schedules, Finance, Auth

### Đối tượng sử dụng
| Vai trò | Quyền | Sử dụng chính |
|---------|-------|---------------|
| **Admin** | Full CRUD + xem lương + phân quyền + soft delete | Tạo/sửa/xóa hồ sơ, phân quyền, xem salary, link auth user |
| **Manager** | CRUD (trừ salary + role + delete) | Quản lý team, duyệt đơn, ghi chú |
| **Sale/Media/CTV** | Read own profile + self-edit cơ bản | Xem & sửa thông tin cá nhân (tên, SĐT, email) |

---

## 2. HIỆN TRẠNG HỆ THỐNG (Audit 2026-03-24)

### 2.1. Bugs phải fix trước khi build UI

| # | Severity | Bug | File | Chi tiết |
|---|----------|-----|------|----------|
| B1 | 🔴 Critical | **Notes ghi đè salary_info** | `employee-actions.ts:105` | `.update({ salary_info: { notes } })` — ghi đè toàn bộ JSONB, mất base_salary, bank_name, etc. |
| B2 | 🔴 Critical | **Status filter mismatch** | `user-management-actions.ts:39` | Filter `status = "Đang làm"` nhưng data thực tế = `"active"` → link user↔employee **không match** |
| B3 | 🟠 High | **ALLOWED_FIELDS thiếu** | `employee-actions.ts` | Thiếu `role`, `gender` trong whitelist → form không update được |

### 2.2. Data hiện tại (5 nhân viên)

| employee_code | full_name | department | position | role | status | salary_info | start_date | auth_user_id |
|---------------|-----------|------------|----------|------|--------|-------------|------------|--------------|
| NV-001 | Nguyễn Minh Tâm | Sản xuất | Photographer | sale | active | `{}` | null | null |
| NV-002 | Trần Thị Lan | Sản xuất | Makeup Artist | sale | active | `{}` | null | null |
| NV-003 | Lê Hoàng Nam | Sản xuất | Cameraman | sale | active | `{}` | null | null |
| NV-004 | Phạm Thị Mai | Hậu kỳ | Editor | sale | active | `{}` | null | null |
| NV-005 | Vũ Đức Anh | Hậu kỳ | Retoucher | sale | active | `{}` | null | null |

**⚠️ Vấn đề data:**
- **Department:** Free text (`"Sản xuất"`, `"Hậu kỳ"`) — KHÔNG CÓ ENUM
- **Role:** Tất cả = `"sale"` (sai — cần migration fix)
- **salary_info:** `{}` rỗng 100%
- **start_date:** `null` 100%
- **auth_user_id:** `null` 100% → RLS functions return NULL → RLS broken cho tất cả NV

### 2.3. Backend actions hiện tại

| File | Functions | Vấn đề |
|------|-----------|--------|
| `employee-actions.ts` (112 lines) | `getEmployeesAction`, `getEmployeeStatsAction`, `createEmployeeAction`, `updateEmployeeAction`, `softDeleteEmployeeAction`, `updateEmployeeNotesAction` | ❌ Vi phạm V2 Template Spec: chưa split queries/mutations. Thiếu `getEmployeeById`. Select thiếu `role`, `gender`. Chỉ filter dept+status (thiếu role). |
| `salary-actions.ts` (80 lines) | `addSalaryAdjustment`, `deleteSalaryAdjustment`, `recalculateEmployeeSalary` | ✅ Đúng pattern, recalculate logic rõ ràng |
| `user-management-actions.ts` | `getAuthUsersWithEmployees`, `updateUserRole`, `linkUserToEmployee`, `unlinkUserFromEmployee`, `getUnlinkedEmployees` | ❌ Filter `status = "Đang làm"` thay vì `"active"` |
| `task-assign-actions.ts` | `assignTask`, `checkEmployeeAvailability` | ✅ Cross-module integration hoạt động |
| `task-overlap-actions.ts` | `checkEmployeeTimeOverlap`, `checkEmployeeDeadlineOverlap` | ✅ Conflict detection chi tiết |

### 2.4. DB Trigger
```sql
-- Trigger tự động update updated_at khi UPDATE employees
trigger: update_employees_updated_at → EXECUTE FUNCTION update_updated_at_column()
```
> **Lưu ý:** Action code KHÔNG CẦN set `updated_at: new Date().toISOString()` thủ công — trigger xử lý rồi.

### 2.5. Employee Code Generation
- **Không có DB sequence/trigger** cho employee_code
- Hiện tại: NV-001 → NV-005 (manual/app logic)
- **Decision needed:** Dùng DB sequence, app logic, hoặc UUID prefix?

---

## 3. FEATURE MAP CHI TIẾT

### 🚀 MVP — Phase 1 (Bắt buộc có)

| # | Feature | Mô tả | V1 Reference |
|---|---------|-------|-------------|
| F1 | **Employee List Page** | Danh sách NV + search + pagination (dùng `PageLayout`) | EmployeesTable.tsx |
| F2 | **Stats Dashboard** | 4 metric cards (tổng, đang làm, theo phòng ban) | EmployeesStats.tsx |
| F3 | **Filters** | Filter status, phòng ban, role + sort (dùng `tabs-filter` + `filter-select`) | EmployeesFilters.tsx |
| F4 | **Create Employee** | Modal form tạo NV mới (dùng `unified-modal`) | EmployeeForm.tsx (modal mode) |
| F5 | **Employee Detail Page** | Hồ sơ chi tiết: thông tin + contact + work info | EmployeeProfileClient.tsx |
| F6 | **Edit Employee** | Modal chỉnh sửa trên detail page | EmployeeForm.tsx (modal mode) |
| F7 | **Self-Edit Profile** | NV tự sửa info cá nhân (tên, SĐT, email) qua RLS | *(mới — từ RLS audit)* |
| F8 | **Notes** | Ghi chú quản lý — tách ra column riêng hoặc fix JSONB bug | EmployeeProfileClient.tsx |
| F9 | **Soft Delete** | "Cho nghỉ việc" = set deleted_at, ẩn khỏi list mặc định | employee-actions.ts |
| F10 | **Role-based Access** | Admin/Manager/User permission phân tầng theo RLS policies | EmployeeForm.tsx |
| F11 | **Skeleton Loading** | Loading state khi fetch data (dùng `skeleton.tsx`) | V1 EmployeesPageSkeleton |
| F12 | **Mobile FAB** | Floating action button "Thêm NV" trên mobile (dùng `FABButton`) | V1 FABButton |
| F13 | **Bug Fixes** | Fix B1, B2, B3 trước khi build UI | *(prerequisite)* |

### 🎁 Phase 2 (Sau khi MVP ổn định)

| # | Feature | Mô tả | Dependency |
|---|---------|-------|-----------
| F14 | **Attendance Tab** | Tab chấm công trên detail page | Table `attendance` (11 columns) |
| F15 | **Requests Tab** | Tab đơn từ (nghỉ phép, tạm ứng) + approval flow | Table `requests` (15 columns) |
| F16 | **Productivity Summary** | Mini stats: tổng jobs, tasks hoàn thành, conflict check | `work_tasks` + `task-overlap-actions` |
| F17 | **Export Excel** | Xuất danh sách NV ra file | ExportButton component |
| F18 | **Data Migration** | Fix role, department, salary_info, start_date cho 5 NV | SQL migration scripts |

### 💭 Backlog (Cân nhắc sau)

| # | Feature | Mô tả |
|---|---------|-------|
| F19 | **Evaluations Tab** | Đánh giá nhân viên định kỳ (table `evaluations`) |
| F20 | **Equipment Tab** | Thiết bị đang giữ (link từ equipment module) |
| F21 | **Avatar Upload** | Upload ảnh thay avatar chữ cái |
| F22 | **Bulk Import** | Import NV từ Excel |
| F23 | **Org Chart** | Sơ đồ tổ chức trực quan |

---

## 4. USER FLOWS

### Flow 1: Xem danh sách nhân viên
```
Admin mở /employees (sidebar entry đã có — lib/navigation.ts:69)
  → Server component fetch data (getEmployeeList)
  → Render: Stats (4 cards) → Filters → Table/Cards → Pagination
  → Bấm NV → Navigate /employees/{id}
```

### Flow 2: Tạo nhân viên mới
```
Admin bấm "Thêm nhân viên" (button desktop / FAB mobile)
  → Modal mở (unified-modal.tsx)
  → Điền form: Họ tên*, Giới tính, SĐT, Email
  → Chọn: Phòng ban, Vị trí, Role
  → (Admin only) Nhập: Lương cơ bản, Ngân hàng
  → employee_code auto-generate (NV-{next_seq})
  → Bấm "Lưu"
  → createEmployee server action
  → fireAuditLog → revalidatePath → Toast "Tạo thành công"
  → Modal đóng, list refresh
```

### Flow 3: Xem + chỉnh sửa hồ sơ (Admin/Manager)
```
Mở /employees/{id}
  → Server component: getEmployeeById (cần tạo mới)
  → Sidebar: Avatar + Mã NV + Status badge + Contact
  → Main: Work Info + Payment Info + Notes
  → Bấm "Chỉnh sửa" (Admin/Manager only)
  → Modal mở với form pre-filled
  → Sửa → Bấm "Lưu" → updateEmployee → refresh
```

### Flow 4: Self-Edit Profile (NV thường)
```
NV đăng nhập → mở /employees/{own_id}
  → RLS: employees_update cho phép sửa khi id = get_current_employee_id()
  → Chỉ hiện fields: tên, SĐT, email, avatar
  → KHÔNG hiện: role, salary_info, notes
  → Sửa → Bấm "Lưu" → updateEmployee (server-side validate scope)
```

### Flow 5: Ghi chú nhân viên (Admin/Manager)
```
Trên detail page, scroll tới Notes section
  → Textarea editable (Admin/Manager only)
  → Gõ nội dung → blur → auto-save (debounce)
  → ⚠️ PHẢI fix B1 trước: notes cần riêng, KHÔNG ghi vào salary_info
```

### Flow 6: "Cho nghỉ việc" (Soft Delete — Admin only)
```
Admin mở detail page → Bấm "Cho nghỉ việc"
  → Confirm dialog: "Xác nhận cho [Tên] nghỉ việc?"
  → softDeleteEmployee → set deleted_at = now()
  → NV biến mất khỏi list mặc định
  → Có thể filter "Nghỉ việc" để xem lại
  → KHÔNG xóa data, vẫn giữ FK references
  → Auth user vẫn active (tách biệt)
  → Work tasks giữ nguyên assigned_to, hiển thị "(Đã nghỉ)"
```

### Flow 7: Filter + Search
```
Trên list page:
  → Tab filter: "Tất cả" / "Đang làm" / "Nghỉ việc" (tabs-filter.tsx)
  → Dropdown: Phòng ban (filter-select.tsx)
  → Dropdown: Role (filter-select.tsx)
  → Search bar: tìm theo tên / mã NV / SĐT / email (search-bar.tsx)
  → URL update với searchParams → server re-fetch
```

---

## 5. DATA MODEL

### 5.1. employees table (17 columns) → UI Field Mapping

| DB Column | Type | UI Label | Input Type | Validation | Ai được sửa |
|-----------|------|----------|-----------|------------|-------------|
| `id` | UUID | — | — | Auto (gen_random_uuid) | — |
| `auth_user_id` | UUID FK→auth.users | — | — | Unique, nullable | System (link flow) |
| `employee_code` | VARCHAR | Mã NV | — (auto generate) | Unique, format: `NV-{seq}` | — |
| `full_name` | VARCHAR | Họ và Tên | text input | **Required**, min 2 chars | Admin, Manager, Self |
| `gender` | VARCHAR | Giới tính | toggle (Nam/Nữ) | Default: Nam | Admin, Manager, Self |
| `avatar_url` | TEXT | Avatar | — (letter fallback) | Optional | Backlog |
| `phone` | VARCHAR | Điện thoại | text input | Optional, VN format 0xxx 10-11 digits | Admin, Manager, Self |
| `email` | VARCHAR | Email | email input | Optional, unique warn | Admin, Manager, Self |
| `department` | VARCHAR | Phòng ban | select | **Required** — ⚠️ hiện là free text | Admin, Manager |
| `position` | VARCHAR | Vị trí | text input | Optional | Admin, Manager |
| `role` | ENUM | Quyền hạn | select | Default: ctv — ENUM: admin\|manager\|sale\|media\|ctv | **Admin only** |
| `status` | VARCHAR | Trạng thái | select | Default: `"active"` | Admin, Manager |
| `salary_info` | JSONB | Lương & Ngân hàng | nested fields | **Admin only** | **Admin only** |
| `start_date` | DATE | Ngày bắt đầu | DatePicker | Default: today | Admin, Manager |
| `deleted_at` | TIMESTAMPTZ | — (soft delete) | — | Nullable | Admin |
| `created_at` | TIMESTAMPTZ | — | — | Auto (now()) | — |
| `updated_at` | TIMESTAMPTZ | — | — | Auto (trigger) | — |

### 5.2. salary_info JSONB Structure

```jsonc
{
  "base_salary": 8000000,           // Lương cơ bản (VNĐ)
  "bank_name": "Vietcombank",       // Tên ngân hàng
  "bank_account_no": "0123456789",  // Số tài khoản
  "bank_account_name": "NGUYEN VAN A", // Chủ TK (uppercase)
  "branch": "Trụ sở chính"         // Chi nhánh NH
}
```

> ⚠️ **Thực tế hiện tại:** salary_info = `{}` cho tất cả 5 NV. UI PHẢI handle empty gracefully (hiển thị "Chưa cập nhật").

> ⚠️ **Notes hiện lưu trong salary_info.notes** — Bug B1. Cần quyết định: tách column `notes` riêng hoặc fix JSONB merge logic.

### 5.3. Department Options

**⚠️ DECISION NEEDED:** Data hiện tại là free text tiếng Việt. Có 2 lựa chọn:

#### Option A: Giữ free text (ít migration)
| Giá trị hiện tại | Label UI |
|-------------------|----------|
| `Sản xuất` | Sản xuất |
| `Hậu kỳ` | Hậu kỳ |
| *(thêm tùy ý)* | *(tùy ý)* |

#### Option B: Normalize sang predefined list (khuyến nghị)
| Value | Label UI | Mô tả |
|-------|----------|-------|
| `Sản xuất` | Sản xuất | Photographer, Cameraman, Makeup Artist |
| `Hậu kỳ` | Hậu kỳ | Editor, Retoucher |
| `Kinh doanh` | Kinh doanh | Sales |
| `Hậu cần` | Hậu cần | Logistic |
| `CTV` | Cộng tác viên | Freelancer |
| `Quản lý` | Quản lý | Management |

### 5.4. Role ENUM (DB: `employee_role_enum`)

| Value | Label UI | Permission Level |
|-------|----------|-----------------|
| `admin` | Admin | Full access |
| `manager` | Quản lý | CRUD trừ salary/role/delete |
| `sale` | Sale | Read team + edit own profile |
| `media` | Media | Read team + edit own profile |
| `ctv` | CTV | Read own profile only |

### 5.5. employee_salaries table (26 columns) — Salary per month/NV

| Column | Type | Mô tả |
|--------|------|-------|
| `id` | UUID PK | |
| `monthly_salary_id` | UUID FK | Link bảng lương tháng |
| `employee_id` | UUID FK→employees | |
| `year` | INTEGER | Năm |
| `month` | INTEGER | Tháng |
| `base_salary` | NUMERIC | Lương cơ bản |
| `attendance_days` | INTEGER | Ngày công |
| `additional_days` | INTEGER | Ngày tăng ca |
| `total_work_days` | INTEGER | Tổng ngày làm |
| `total_work_hours` | NUMERIC | Tổng giờ làm |
| `monthly_salary` | NUMERIC | Lương tháng (tính từ công) |
| `product_salary` | NUMERIC | Lương sản phẩm |
| `bonus` | NUMERIC | Tổng thưởng |
| `penalty` | NUMERIC | Tổng phạt |
| `total_salary` | NUMERIC | Tổng lương (base + product + bonus - penalty) |
| `advance_payment` | NUMERIC | Tạm ứng |
| `net_salary` | NUMERIC | Thực lĩnh (total - advance) |
| `paid_amount` | NUMERIC | Đã trả |
| `remaining_amount` | NUMERIC | Còn lại |
| `kpi_target` | NUMERIC | KPI mục tiêu |
| `kpi_achieved` | NUMERIC | KPI đạt được |
| `kpi_percentage` | NUMERIC | % KPI |
| `notes` | TEXT | Ghi chú |
| `created_by` | UUID FK→auth.users | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

> **Salary Formula (V1 salaryService.ts):**
> ```
> dailyRate = base_salary / standard_work_days (26)
> total = dailyRate × (actual_work_days + additional_days) + bonus - penalty
> net = total - advance_payment
> ```

### 5.6. requests table (15 columns)

| Column | Type | Mô tả |
|--------|------|-------|
| `id` | UUID PK | |
| `request_date` | DATE | Default: CURRENT_DATE |
| `request_type` | VARCHAR | Loại đơn (nghỉ phép, tạm ứng, etc.) |
| `leave_type` | VARCHAR | Loại nghỉ (nullable) |
| `reason` | TEXT | Lý do |
| `amount` | NUMERIC | Số tiền (cho tạm ứng) |
| `image_url` | TEXT | Ảnh đính kèm |
| `notes` | TEXT | Ghi chú thêm |
| `message` | TEXT | Tin nhắn |
| `requester_id` | UUID FK→employees | **Không phải employee_id** |
| `approver_id` | UUID FK→employees | Người duyệt |
| `approval_date` | DATE | Ngày duyệt |
| `status` | VARCHAR | Default: `'cho_duyet'` (tiếng Việt, không dấu) |
| `created_at` | TIMESTAMPTZ | |
| `created_by` | UUID FK→auth.users | |

### 5.7. attendance table (11 columns)

| Column | Type | Mô tả |
|--------|------|-------|
| `id` | UUID PK | |
| `employee_id` | UUID FK→employees | |
| `date` | DATE | Ngày chấm công |
| `check_in_time` | TIME | Giờ vào |
| `check_out_time` | TIME | Giờ ra |
| `work_shift_id` | UUID FK→work_shifts | Ca làm |
| `status` | VARCHAR | |
| `notes` | TEXT | |
| `created_by` | UUID FK→auth.users | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### 5.8. Stats Query Mapping

| Stat Card | Query Logic |
|-----------|------------|
| Tổng nhân sự | `COUNT(*) WHERE deleted_at IS NULL` |
| Đang làm việc | `COUNT(*) WHERE status = 'active' AND deleted_at IS NULL` |
| Phòng Sản xuất | `COUNT(*) WHERE department = 'Sản xuất' AND deleted_at IS NULL` |
| Phòng Hậu kỳ | `COUNT(*) WHERE department = 'Hậu kỳ' AND deleted_at IS NULL` |

---

## 6. RLS POLICIES & SECURITY

### 6.1. Custom DB Functions (RLS phụ thuộc)

```sql
-- Lấy role của user hiện tại dựa trên auth.uid() → employees.auth_user_id
get_current_employee_role() → employee_role_enum
  SELECT role FROM employees WHERE auth_user_id = auth.uid() AND deleted_at IS NULL LIMIT 1

-- Lấy employee ID của user hiện tại
get_current_employee_id() → UUID
  SELECT id FROM employees WHERE auth_user_id = auth.uid() AND deleted_at IS NULL LIMIT 1
```

> ⚠️ **CRITICAL:** 5 NV hiện tại đều `auth_user_id = null` → cả 2 functions return NULL → RLS deny mọi request từ browser client. Hiện V2 dùng `withAuth()` (service_role) nên bypass RLS, nhưng self-edit flow sẽ CẦN auth_user_id linked.

### 6.2. RLS Policies Matrix

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `employees` | admin/manager: ALL; other: own only | admin/manager | admin/manager OR self (auth_user_id match) | admin only |
| `employee_salaries` | admin: ALL; other: own only | admin/manager | admin/manager | admin/manager |
| `attendance` | admin/manager: ALL; other: own only | admin/manager | admin/manager | admin/manager |
| `requests` | admin/manager: ALL; other: own only | ANY authenticated user | admin/manager | admin/manager |
| `evaluations` | admin: ALL; other: own only | admin/manager | admin/manager | admin/manager |
| `work_shifts` | ALL (public read) | admin/manager | admin/manager | admin/manager |

### 6.3. Permission Matrix — UI Layer

| Field / Action | Admin | Manager | Sale/Media/CTV |
|----------------|-------|---------|----------------|
| Xem list NV | ✅ ALL | ✅ ALL | ✅ team/self (RLS) |
| Tạo NV mới | ✅ | ✅ (RLS) | ❌ |
| Sửa hồ sơ NV bất kỳ | ✅ | ✅ (RLS) | ❌ |
| Sửa hồ sơ cá nhân | ✅ | ✅ | ✅ (self only, RLS) |
| Sửa role | ✅ | ❌ | ❌ |
| Xem/sửa salary_info | ✅ | ❌ | ❌ |
| Cho nghỉ việc (soft delete) | ✅ | ❌ | ❌ |
| Xem notes | ✅ | ✅ | ❌ |
| Sửa notes | ✅ | ✅ | ❌ |
| Tạo request (nghỉ phép, tạm ứng) | ✅ | ✅ | ✅ (self) |
| Duyệt request | ✅ | ✅ | ❌ |
| Xem salary history | ✅ | ❌ | ✅ (own only, RLS) |

---

## 7. UI/UX SPEC

### 7.1. Shared UI Components (có sẵn — 29 components)

| Component | File | Dùng cho |
|-----------|------|----------|
| `avatar.tsx` | components/ui/ | Letter avatar fallback |
| `badge.tsx` | components/ui/ | Status badge |
| `button.tsx` | components/ui/ | Primary, secondary actions |
| `pagination.tsx` | components/ui/ | List pagination |
| `search-bar.tsx` | components/ui/ | Search employees |
| `filter-select.tsx` | components/ui/ | Filter dropdowns (dept, role) |
| `tabs-filter.tsx` | components/ui/ | Status tabs (Tất cả/Đang làm/Nghỉ) |
| `unified-modal.tsx` | components/ui/ | Create/Edit modal |
| `drawer.tsx` | components/ui/ | Quick preview (optional) |
| `skeleton.tsx` | components/ui/ | Loading states |
| `kpi-card.tsx` | components/ui/ | Stats cards |
| `currency-input.tsx` | components/ui/ | Salary input |
| `date-picker.tsx` | components/ui/ | Start date |
| `table.tsx` | components/ui/ | Desktop table |
| `confirm-dialog.tsx` | components/ui/ | Soft delete confirmation |
| `select.tsx` / `simple-select.tsx` | components/ui/ | Department, role selects |
| `status-select.tsx` | components/ui/ | Status select |
| `ux-states.tsx` | components/ui/ | Empty state, error state |

### 7.2. List Page (`/employees`)

#### Mobile (< lg)
```
┌─────────────────────────┐
│ PageLayout: "Nhân sự"   │
├─────────────────────────┤
│ [Stats: 2×2 grid]       │
│ ┌──────┐ ┌──────┐       │
│ │ 5    │ │ 5    │       │
│ │TỔNG  │ │ACTIVE│       │
│ ├──────┤ ├──────┤       │
│ │ 3    │ │ 2    │       │
│ │SẢN X │ │HẬU KỲ│       │
│ └──────┘ └──────┘       │
├─────────────────────────┤
│ [TabsFilter]            │
│ ◉Tất cả ○Đang làm ○Nghỉ│
│ [Phòng ban▾] [Role▾]   │
├─────────────────────────┤
│ [Employee Card]         │
│ ┌───────────────────┐   │
│ │ NV-001   ●Active  │   │
│ │ Nguyễn Minh Tâm   │   │
│ │ Sản xuất  sale    │   │
│ │ 📱 0901...        │   │
│ └───────────────────┘   │
│ [Employee Card] ...     │
├─────────────────────────┤
│ [Pagination]            │
└─────────────────────────┘
   🔵 FAB: [+ Thêm NV]
```

#### Desktop (≥ lg)
```
┌──────────────────────────────────────────────────────┐
│ PageLayout: "Quản lý Nhân sự"          [+ Thêm NV]  │
├──────────────────────────────────────────────────────┤
│ [Stats: 4 cards — grid-cols-4]                       │
│ ┌──────────┐┌──────────┐┌──────────┐┌──────────┐    │
│ │ 🏷 5     ││ ✅ 5     ││ 📷 3     ││ 🎨 2     │    │
│ │ TỔNG NV  ││ ĐANG LÀM ││ SẢN XUẤT ││ HẬU KỲ   │    │
│ └──────────┘└──────────┘└──────────┘└──────────┘    │
├──────────────────────────────────────────────────────┤
│ [TabsFilter + FilterSelect]                          │
│ ◉Tất cả ○Đang làm ○Nghỉ    [Role▾] [Phòng ban▾]   │
├──────────────────────────────────────────────────────┤
│ [Table]                                              │
│ Mã NV │ Họ tên      │ Bộ phận  │ Role │ SĐT │Status│
│ NV-001│ ●Nguyễn M T │ Sản xuất │ sale │ 0901│Active│
│ NV-002│ ●Trần T L   │ Sản xuất │ sale │ 0902│Active│
│ ...   │             │          │      │     │      │
├──────────────────────────────────────────────────────┤
│ [Pagination]                                         │
└──────────────────────────────────────────────────────┘
```

### 7.3. Detail Page (`/employees/{id}`)

#### Mobile
```
┌─────────────────────────┐
│ ← Danh sách   [✏️ Sửa] │
├─────────────────────────┤
│ ┌───────────────────┐   │
│ │ [T] Nguyễn M Tâm  │   │
│ │ NV-001  ●Đang làm │   │
│ │ 📧 tam@mood.com   │   │
│ │ 📱 0901 234 567   │   │
│ └───────────────────┘   │
├─────────────────────────┤
│ THÔNG TIN CÔNG VIỆC     │
│ Phòng ban: Sản xuất     │
│ Vị trí: Photographer    │
│ Ngày vào: Chưa cập nhật │
│ Quyền: sale             │
├─────────────────────────┤
│ THANH TOÁN 🔒Admin only │
│ NH: Chưa cập nhật       │
│ STK: Chưa cập nhật      │
├─────────────────────────┤
│ GHI CHÚ (Admin/Manager) │
│ [textarea auto-save]    │
│                   [Lưu] │
└─────────────────────────┘
```

#### Desktop
```
┌──────────────────────────────────────────────────────┐
│ ← Danh sách                              [Chỉnh sửa]│
├──────────────┬───────────────────────────────────────┤
│ SIDEBAR      │ MAIN CONTENT                          │
│ ┌──────────┐ │ ┌─────────────────────────────────┐   │
│ │   [T]    │ │ │ THÔNG TIN CÔNG VIỆC             │   │
│ │ Nguyễn T │ │ │ Phòng ban  │ Vị trí             │   │
│ │ NV-001   │ │ │ Sản xuất   │ Photographer       │   │
│ │ ●Active  │ │ │ Ngày BĐ   │ Quyền              │   │
│ └──────────┘ │ │ Chưa CN   │ sale               │   │
│ ┌──────────┐ │ └─────────────────────────────────┘   │
│ │ LIÊN HỆ  │ │ ┌─────────────────────────────────┐   │
│ │ Email    │ │ │ THANH TOÁN 🔒                    │   │
│ │ (chưa)   │ │ │ Chưa cập nhật                   │   │
│ │ SĐT     │ │ └─────────────────────────────────┘   │
│ │ (chưa)   │ │ ┌─────────────────────────────────┐   │
│ └──────────┘ │ │ GHI CHÚ                         │   │
│              │ │ [textarea auto-save]      [Lưu] │   │
│              │ └─────────────────────────────────┘   │
└──────────────┴───────────────────────────────────────┘
```

### 7.4. Create/Edit Modal

```
┌─────────────────────────────────────┐
│ ✏️ Thêm nhân viên            [✕]   │
├─────────────────────────────────────┤
│ ── Trạng thái & Quyền ──           │
│ [Trạng thái ▾] [Quyền ▾ 🔒Admin]  │
│                                     │
│ ── Thông tin cá nhân ──             │
│ Họ và Tên *  [___________________] │
│ Giới tính    [Nam] [Nữ]            │
│ Điện thoại   [___________________] │
│ Email        [___________________] │
│                                     │
│ ── Bộ phận & Vị trí ──             │
│ Phòng ban *  [Sản xuất       ▾]   │
│ Vị trí       [___________________] │
│ Ngày BĐ      [📅 hôm nay]         │
│                                     │
│ ── Lương & Ngân hàng 🔒Admin ──    │
│ Lương CB     [8,000,000      đ]    │
│ Ngân hàng    [___________________] │
│ Số TK        [___________________] │
│ Chủ TK       [___________________] │
├─────────────────────────────────────┤
│              [Hủy]  [💾 Lưu hồ sơ] │
└─────────────────────────────────────┘
```

---

## 8. V2 MODULE TEMPLATE COMPLIANCE

### 8.1. Required Folder Structure (per `docs/specs/v2-module-template.md`)

```
app/actions/
├── employee-queries.ts          # READ-only (getEmployeeList, getEmployeeById, getEmployeeStats)
├── employee-mutations.ts        # CREATE/UPDATE/DELETE (createEmployee, updateEmployee, softDelete)
└── employee-lifecycle.ts        # Status transitions nếu cần

components/employees/
├── employees-list-client.tsx    # List view (client component)
├── employees-drawer.tsx         # Quick preview drawer (optional)
├── detail/
│   ├── employee-detail-client.tsx   # Detail orchestrator
│   ├── detail-layout-sections.tsx   # Desktop + Mobile layouts
│   ├── summary-card.tsx             # Sidebar card
│   └── work-info-card.tsx
│   └── payment-info-card.tsx
│   └── notes-section.tsx
├── form/
│   ├── index.tsx                    # Form orchestrator
│   ├── IdentitySection.tsx          # Tên, giới tính, SĐT, email
│   ├── WorkSection.tsx              # Phòng ban, vị trí, ngày BĐ
│   ├── SalarySection.tsx            # Lương, ngân hàng (Admin only)
│   └── hooks/
│       └── useEmployeeForm.ts       # Composition hook

types/
├── employee.ts                  # DB types + enums
├── employee-constants.ts        # Labels, maps, helpers
└── employee-form.ts             # Form-specific types

app/(protected)/employees/
├── page.tsx                     # Server component (SSR data fetch)
└── [id]/
    └── page.tsx                 # Detail page (SSR)
```

### 8.2. Naming Convention (from template spec)

| Type | Convention | Ví dụ |
|------|-----------|-------|
| Action functions | `verb + Module + Detail` | `getEmployeeList()`, `createEmployee()` |
| Component files | kebab-case | `employees-list-client.tsx` |
| Form sections | PascalCase | `IdentitySection.tsx` |
| Hooks | `use + Module + Feature` | `useEmployeeForm()` |
| Type files | kebab-case | `employee-constants.ts` |

### 8.3. File Size Rules

| Threshold | Action |
|-----------|--------|
| ≤ 250 lines | ✅ Ideal |
| 250–300 lines | ⚠️ Monitor |
| > 300 lines | 🔴 MUST SPLIT |

---

## 9. CROSS-MODULE INTEGRATION

### 9.1. Employees ↔ Work Tasks
```
work_tasks.assigned_to → employees.id (FK)
```
- `getContractWorkTasks()` JOIN employees: `employees:assigned_to(id, full_name, avatar_url, department)`
- `assignTask()` gán employee vào task, set status = `"dang_lam"`
- `checkEmployeeAvailability(employeeId, targetDate)` — check lịch trùng
- `checkEmployeeTimeOverlap(employeeId, eventDate, startTime, endTime)` — check giờ trùng
- `checkEmployeeDeadlineOverlap(employeeId, targetDeadline)` — check deadline trùng
- Khi NV soft delete → tasks KHÔNG cascade, hiển thị "(Đã nghỉ)" badge

### 9.2. Employees ↔ Schedules
```
schedules.employee_id → employees.id
```
- Schedule actions: `createSchedule({ employeeId })`, `updateSchedule({ employeeId })`
- Phase 2: Detail page show "Lịch sắp tới"

### 9.3. Employees ↔ Finance (Salaries)
```
employee_salaries.employee_id → employees.id
monthly_salaries ← employee_salaries (monthly_salary_id)
salary_adjustments.employee_salary_id → employee_salaries.id
```
- `salary-actions.ts` → `recalculateEmployeeSalary()`: `total = base + product + bonus - penalty`, `net = total - advance`
- `salary_adjustments` link qua `employee_salary_id` (KHÔNG trực tiếp `employee_id`)
- Detail page: salary_info từ JSONB (lương cơ bản, ngân hàng)
- Salary history: **Link sang Finance module** (không duplicate UI)

### 9.4. Employees ↔ Auth (User Management)
```
employees.auth_user_id → auth.users.id
```
- `linkUserToEmployee(authUserId, employeeId)` — link account khi NV đăng nhập
- `unlinkUserFromEmployee(authUserId)` — hủy link
- `getUnlinkedEmployees()` — NV chưa link auth (hiện tại = 5/5)
- `suggestEmployeeForUser` — auto-match by email
- `updateUserRole(authUserId, newRole)` — sync role từ auth → employees
- ⚠️ Hiện filter `status = "Đang làm"` (B2 bug) → cần fix sang `"active"`

### 9.5. Employees ↔ Contracts
```
contracts.assigned_to → FREE TEXT (KHÔNG phải FK!)
```
- `ContractInfoSection.tsx`: input text "Nhân viên phụ trách" — typed bằng tay
- **Không có FK constraint** → data không đồng bộ nếu NV đổi tên
- Phase future: có thể upgrade thành FK → employees.id

### 9.6. Employees ↔ Dashboard
```
components/dashboard/quick-access-grid.tsx
```
- Đã có entry employees: `bg: "bg-slate-100"`, `text: "text-slate-600"`
- Link tới `/employees` (route chưa tồn tại → cần tạo)

---

## 10. V1 → V2 MIGRATION NOTES

### ✅ Giữ nguyên
| Item | Lý do |
|------|-------|
| Layout list: mobile cards + desktop table | UX đã proven, responsive tốt |
| Stats 4 cards (2×2 mobile, 4-col desktop) | Pattern đã chuẩn hóa |
| URL-based filtering (searchParams) | Server-side filtering |
| Profile layout: sidebar + main grid | Rõ ràng, đã test thực tế |
| Notes auto-save on blur | UX tốt, giảm friction |
| UnifiedModal cho create/edit | V2 standard |
| Avatar chữ cái (fallback) | Đơn giản, hiệu quả |
| Pagination pattern | V2 có `pagination.tsx` sẵn |

### 🔄 Thay đổi
| V1 | V2 | Lý do |
|----|-----|-------|
| `employee_type` (NV/CTV) column | Dùng `role` ENUM (admin\|manager\|sale\|media\|ctv) | V2 DB schema thay đổi |
| `base_salary`, `bank_*` columns riêng | Gộp vào `salary_info` JSONB | V2 schema design |
| React Query mutations | Server Actions + revalidatePath | V2 standard |
| Separate create page `/employees/create` | **Modal only** | V2 modal-first pattern |
| EmployeeForm 742 dòng 1 file | Split: `IdentitySection` + `WorkSection` + `SalarySection` | V2 rule: < 300 dòng/file |
| `useRealtime` subscription | **Bỏ** (V2 dùng revalidatePath) | V2 cache strategy |
| Role: Admin/Manager/User (string) | Role: admin\|manager\|sale\|media\|ctv (ENUM) | V2 DB ENUM |
| Attendance module (V1 đã xóa) | Build mới nếu cần (Phase 2) | V1 `AttendanceToolbar = null` |
| Single `employee-actions.ts` | Split: `employee-queries.ts` + `employee-mutations.ts` | V2 Template Spec |

### ❌ Bỏ / Defer
| Item | Lý do |
|------|-------|
| Page-mode form (3-col layout) | V2 chỉ dùng modal |
| EmployeeDetailModal (productivity) | Phase 2, phụ thuộc work_tasks |
| EmployeePicker | Thuộc schedules/contracts module scope |

---

## 11. EDGE CASES & VALIDATION

### 11.1. Soft Delete Logic
| Scenario | Behavior |
|----------|----------|
| NV bị soft delete | `deleted_at = now()`, ẩn khỏi list mặc định |
| Filter "Nghỉ việc" | `WHERE deleted_at IS NOT NULL` |
| Filter "Tất cả" | Bao gồm cả đã nghỉ |
| NV đã nghỉ nhưng có task active | Task vẫn hiển thị, NV name + "(Đã nghỉ)" |
| Restore NV | `deleted_at = NULL` (Admin only) |
| NV đã nghỉ + linked auth user | Auth user vẫn active, KHÔNG auto disable |
| NV đã nghỉ + salary records | Records giữ nguyên, read-only |

### 11.2. Duplicate Checks
| Field | Rule |
|-------|------|
| `employee_code` | Auto-generate, unique, format: `NV-{next_seq}` |
| `email` | Unique if not null (warn, không block) |
| `phone` | Unique if not null (warn, không block) |
| `auth_user_id` | Unique (1 auth user = 1 employee) |

### 11.3. Form Validation Rules
| Field | Validation |
|-------|-----------|
| `full_name` | Required, min 2 chars |
| `department` | Required |
| `role` | Required, must match DB ENUM |
| `salary_info.base_salary` | >= 0, number only |
| `salary_info.bank_account_name` | Auto uppercase |
| `start_date` | Valid date, default today |
| `email` | Valid email format if provided |
| `phone` | Số VN (0xxx), 10-11 digits if provided |

### 11.4. Empty Data Handling
| Field | Khi null/empty | UI Display |
|-------|---------------|------------|
| `salary_info` | `{}` | "Chưa cập nhật" |
| `start_date` | null | "Chưa cập nhật" |
| `phone` | null | "—" |
| `email` | null | "—" |
| `avatar_url` | null | Letter avatar (chữ cái đầu) |
| `position` | null | "—" |

---

## 12. DECISIONS CẦN CHỐT (trước /plan)

| # | Câu hỏi | Options | Khuyến nghị |
|---|---------|---------|-------------|
| Q1 | **Department:** ENUM hay text tự do? | A: Text tự do (ít migration) / B: Predefined list | **B** — consistent filter, predefined nhưng KHÔNG dùng DB ENUM (dùng app constants) |
| Q2 | **Notes:** Tách column riêng hay fix JSONB? | A: Thêm column `notes` vào employees / B: Fix JSONB merge logic | **A** — sạch hơn, tránh bug cascade |
| Q3 | **employee_code:** Auto thế nào? | A: DB sequence / B: App logic (`MAX + 1`) / C: UUID prefix | **B** — đơn giản, 5 NV chưa cần sequence |
| Q4 | **Data migration 5 NV?** | Có / Chưa cần | **Có** — ít nhất fix role + start_date |
| Q5 | **Self-edit scope?** | A: Cho phép / B: Chỉ admin/manager edit | **A** — RLS đã support, UX tốt |

---

## 13. ƯỚC TÍNH COMPLEXITY

### Phase 0: Prerequisites (Bug Fixes)
| Task | Complexity | Ước tính |
|------|-----------|----------|
| Fix B1: Notes ghi đè salary_info | 🟢 Dễ | 0.5 session |
| Fix B2: Status filter mismatch | 🟢 Dễ | 0.5 session |
| Fix B3: ALLOWED_FIELDS whitelist | 🟢 Dễ | 0.5 session |
| Refactor: Split employee-actions → queries + mutations | 🟡 TB | 1 session |
| **Tổng Phase 0** | | **~2.5 sessions** |

### Phase 1: MVP
| Feature | Complexity | Ước tính | Ghi chú |
|---------|-----------|----------|---------
| F1: Employee List Page | 🟢 Dễ | 1 session | Dùng PageLayout + shared components |
| F2: Stats Dashboard | 🟢 Dễ | 0.5 session | Dùng kpi-card.tsx |
| F3: Filters | 🟢 Dễ | 0.5 session | tabs-filter + filter-select |
| F4: Create Modal | 🟡 TB | 1 session | Form split 3 sections + JSONB handling |
| F5: Detail Page | 🟡 TB | 1.5 session | Sidebar + Main + responsive |
| F6: Edit Modal | 🟢 Dễ | 0.5 session | Reuse create form |
| F7: Self-Edit | 🟢 Dễ | 0.5 session | Conditional rendering |
| F8: Notes | 🟢 Dễ | 0.5 session | Auto-save textarea (after fix B1) |
| F9: Soft Delete | 🟢 Dễ | 0.5 session | Backend có, thêm UI confirm |
| F10: RBAC | 🟡 TB | 1 session | Conditional rendering + server validation |
| F11: Skeleton | 🟢 Dễ | 0.5 session | Dùng skeleton.tsx |
| F12: Mobile FAB | 🟢 Dễ | 0.5 session | FABButton có sẵn |
| F13: Bug Fixes | 🟡 TB | 2.5 sessions | Phase 0 |
| Types + Constants | 🟢 Dễ | 1 session | employee.ts + employee-constants.ts |
| **Tổng MVP** | | **~11 sessions** |

### Phase 2
| Feature | Complexity | Ghi chú |
|---------|-----------|---------|
| F14: Attendance Tab | 🟡 TB | Query attendance table + calendar UI |
| F15: Requests Tab | 🟡 TB | CRUD requests + approval flow |
| F16: Productivity | 🟡 TB | Aggregate work_tasks data |
| F17: Export | 🟢 Dễ | ExportButton sẵn |
| F18: Data Migration | 🟢 Dễ | SQL scripts |

---

## 14. RỦI RO & CẢNH BÁO

### 🔴 Rủi ro cao
| # | Rủi ro | Giải pháp |
|---|--------|-----------
| R1 | **salary_info JSONB merge bug (B1)** — ghi notes = mất salary data | Fix trước: tách notes column HOẶC dùng JSONB merge `||` operator |
| R2 | **RLS broken** — 5 NV auth_user_id=null → self-edit không hoạt động | Link auth users trước khi enable self-edit flow |
| R3 | **Status mismatch (B2)** — user-management filter sai → link flow broken | Fix filter từ `"Đang làm"` → `"active"` |

### 🟡 Rủi ro trung bình
| # | Rủi ro | Giải pháp |
|---|--------|-----------
| R4 | **employee_code race condition** | Check unique constraint trên INSERT, retry if conflict |
| R5 | **Department values inconsistent** | Chốt predefined list, migration script normalize data |
| R6 | **salary_info = {} cho tất cả 5 NV** | UI handle null gracefully, show "Chưa cập nhật" |

### 🟢 Rủi ro thấp
| # | Rủi ro | Giải pháp |
|---|--------|-----------
| R7 | Form file > 300 dòng | Split từ đầu thành 3 sections |
| R8 | Mobile layout vỡ | Test 375px viewport, dùng mobile-first CSS |

---

## 🚀 BƯỚC TIẾP THEO

> **BRIEF score: 100% (v2 — Deep Audit verified)**
> 1. Anh chốt 5 Decisions (Section 12)
> 2. Chạy `/plan` → tạo PRD chi tiết:
>    - Phase 0: Bug fixes + action refactor
>    - Phase 1: MVP file-by-file implementation specs
>    - Verification checklist
>    - Data migration scripts
