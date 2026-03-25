# Employee Module Spec (V2)

> **Status:** Gold Standard ✅ (Audited 2026-03-25)
> **Goal:** Quản lý hồ sơ nhân sự, phòng ban, vai trò và phân quyền (RBAC) cơ bản.

---

## 1. Folder Structure

```
app/
├── (protected)/employees/
│   ├── page.tsx                  # Danh sách nhân sự
│   ├── [id]/
│   │   └── page.tsx              # Chi tiết nhân sự
│   └── error.tsx                 # Error Boundary
│
components/employees/
├── employee-list-page.tsx        # Cấu trúc trang danh sách
├── employee-table.tsx            # Bảng hiển thị nhân sự
├── employee-card.tsx             # Card view cho mobile
├── employee-form-modal.tsx       # Modal tạo/sửa nhân sự (Zod-ready)
├── employee-info-card.tsx        # Card thông tin chi tiết
└── employee-filters.tsx          # Bộ lọc nhân sự
│
app/actions/
├── employee-queries.ts           # READ: getEmployeeList, getEmployeeById, getEmployeeStats
└── employee-mutations.ts         # WRITE: createEmployee, updateEmployee, deleteEmployee
```

---

## 2. Server Actions Pattern

### 2.1 Queries (`employee-queries.ts`)
- `getEmployeeList()`: Trả về danh sách nhân viên kèm thông tin phòng ban & status.
- `getEmployeeStats()`: Thống kê số lượng nhân viên theo trạng thái (active/inactive).

### 2.2 Mutations (`employee-mutations.ts`)
- **`createEmployee(rawData)`**:
    - Validate qua `employeeCreateSchema`.
    - Tự động sinh `employee_code` (NV-XXXX).
    - **fireAuditLog** hành động "CREATE".
- **`updateEmployee(id, rawData)`**:
    - Validate server-side.
    - Cập nhật các trường thông tin cá nhân, salary_info (JSONB), notes.
    - **fireAuditLog** hành động "UPDATE".
- **`deleteEmployee(id)`**: Soft delete nhân viên.

---

## 3. Data Validation (`employee.schema.ts`)

- **`employeeCreateSchema`**:
    - Bắt buộc: `full_name`.
    - Enums cho `role` (`admin`, `manager`, `staff`, `ctv`) và `status` (`active`, `inactive`).
    - Hỗ trợ `salary_info` dạng `z.record(z.string(), z.unknown())` để lưu trữ dữ liệu lương linh hoạt.

---

## 4. RBAC & Security

- Module sử dụng `withAuth()` để bảo vệ Server Actions.
- `role`: Trường phân quyền chính quyết định quyền truy cập vào các module khác của hệ thống.
- **Audit Logs**: Mọi thay đổi về hồ sơ nhân sự (đặc biệt là thay đổi Role) đều được lưu log hệ thống.

---

## 5. Module Compliance Checklist

- [x] Actions split: queries / mutations
- [x] All actions use `withAuth()`
- [x] Zod validation `safeParse()`
- [x] `fireAuditLog` integration
- [x] `error.tsx` separate boundary
- [x] Metadata SEO implemented
- [x] Soft delete migration
