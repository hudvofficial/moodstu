# PROMPT CODE: Module /employees — Phase-by-Phase

> **Cách dùng:** Copy TỪNG PHASE một, chạy xong phase nào verify xong mới chuyển phase tiếp
> **SSOT:** `docs/briefs/EMPLOYEES_BRIEF.md` + `docs/briefs/EMPLOYEES_PLAN_PROMPT.md`

---

## ═══════════════════════════════════════════
## PHASE 0A: BUG FIXES
## ═══════════════════════════════════════════

```
Đọc trước:
- docs/briefs/EMPLOYEES_BRIEF.md (Section 2: Hiện trạng)
- docs/briefs/EMPLOYEES_PLAN_PROMPT.md (Section C.1: Bug Fixes)
- tasks/pre-code-checklist.md
- tasks/gates/before-edit.md
- tasks/lessons.md

Thực hiện 3 bug fixes theo thứ tự:

### Fix B1: Notes ghi đè salary_info
File: app/actions/employee-actions.ts (line 105)
- Hiện tại: `.update({ salary_info: { notes } })` → GHI ĐÈ toàn bộ salary_info
- CHƯA fix được vì chưa có column `notes` riêng → đánh dấu TODO, fix ở Phase 0B sau migration
- Tạm thời: comment out function, thêm `// TODO: fix after migration adds notes column`

### Fix B2: Status filter mismatch
File: app/actions/user-management-actions.ts (line 39 và line 101)
- Line 39: `.eq("status", "Đang làm")` → đổi thành `.eq("status", "active")`
- Line 101: `.eq("status", "Đang làm")` → đổi thành `.eq("status", "active")`
- KHÔNG thay đổi bất kỳ logic nào khác trong file

### Fix B3: ALLOWED_FIELDS whitelist
File: app/actions/employee-actions.ts
- Tìm ALLOWED_FIELDS array
- Thêm "role", "gender" vào array

Sau khi fix xong:
- [ ] npm run build → ZERO errors
- [ ] Verify: không file nào khác bị ảnh hưởng
```

## ═══════════════════════════════════════════
## PHASE 0B: DB MIGRATIONS
## ═══════════════════════════════════════════

```
Đọc trước:
- docs/briefs/EMPLOYEES_BRIEF.md (Section 5: Data Model)
- docs/briefs/EMPLOYEES_PLAN_PROMPT.md (Section C.2: Migrations)

Thực hiện 2 migrations qua Supabase MCP:

### Migration 1: Thêm column notes
SQL:
ALTER TABLE employees ADD COLUMN notes TEXT DEFAULT NULL;
COMMENT ON COLUMN employees.notes IS 'Ghi chú quản lý — tách riêng khỏi salary_info JSONB';

### Migration 2: Fix data 5 NV hiện tại
Trước khi chạy, HỎI USER xác nhận role + start_date chính xác cho từng NV:
- NV-001 Nguyễn Minh Tâm (Photographer) → role = ?
- NV-002 Trần Thị Lan (Makeup Artist) → role = ?
- NV-003 Lê Hoàng Nam (Cameraman) → role = ?
- NV-004 Phạm Thị Mai (Editor) → role = ?
- NV-005 Vũ Đức Anh (Retoucher) → role = ?

Sau migration:
- [ ] Query verify: SELECT id, full_name, role, notes, start_date FROM employees;
- [ ] Confirm column notes tồn tại
- [ ] Confirm role đã update đúng
```

## ═══════════════════════════════════════════
## PHASE 0C: ACTION REFACTOR + TYPES
## ═══════════════════════════════════════════

```
Đọc trước:
- docs/specs/v2-module-template.md (Section 2: Server Actions Pattern)
- docs/briefs/EMPLOYEES_PLAN_PROMPT.md (Section C.3 + C.4)
- app/actions/employee-actions.ts (file hiện tại — sẽ bị xóa)
- app/actions/contract-queries.ts (Gold Standard reference)
- app/actions/contract-mutations.ts (Gold Standard reference)

### Bước 1: Tạo Types (tạo trước vì actions import types)

1. types/employee.ts
   - EmployeeRole type = "admin" | "manager" | "sale" | "media" | "ctv"
   - EmployeeStatus type
   - Employee interface (match DB schema đúng 17 columns + notes column mới)
   - EmployeeListItem interface (cho list page — subset columns)
   - EmployeeDetail interface (cho detail page — full columns)

2. types/employee-constants.ts
   - DEPARTMENT_OPTIONS: array { value, label } — dùng giá trị tiếng Việt match DB thực tế ("Sản xuất", "Hậu kỳ", "Kinh doanh", "Hậu cần", "CTV", "Quản lý")
   - ROLE_LABELS: Record<EmployeeRole, string>
   - STATUS_LABELS: Record<string, string>
   - GENDER_OPTIONS: [{ value: "Nam", label: "Nam" }, { value: "Nữ", label: "Nữ" }]
   - EMPLOYEE_STATUS_MAP: Record<string, { label, variant }> cho Badge

3. types/employee-form.ts
   - EmployeeFormData interface
   - DEFAULT_FORM_DATA
   - ALLOWED_FIELDS array (bao gồm role, gender)
   - Validation rules interface

### Bước 2: Tạo employee-queries.ts

File: app/actions/employee-queries.ts
Follow pattern contract-queries.ts.

Functions:
- getEmployeeList(params: { search?, status?, department?, role?, sort?, page?, pageSize? })
  → filter .is("deleted_at", null) mặc định (trừ khi status = "terminated")
  → search: ilike full_name, employee_code, phone, email
  → sort options: full_name, employee_code, start_date, department
  → pagination: range((page-1)*pageSize, page*pageSize-1)
  → select: id, employee_code, full_name, department, position, role, phone, email, status, gender, avatar_url, start_date, deleted_at
  → return { employees, total, pageSize }

- getEmployeeById(id: string)
  → select ALL columns (incl. salary_info, notes, created_at, updated_at)
  → .is("deleted_at", null) — nhưng nếu cần view NV đã nghỉ thì bỏ filter này
  → throw if not found

- getEmployeeStats()
  → count total, active, per department (dùng data thực tế "Sản xuất", "Hậu kỳ")
  → .is("deleted_at", null)

- getNextEmployeeCode()
  → SELECT employee_code FROM employees ORDER BY employee_code DESC LIMIT 1
  → parse number, +1, format NV-{padStart 3}
  → handle edge: nếu table rỗng → NV-001

- getActiveEmployees()
  → MOVE từ work-task-actions.ts
  → select: id, full_name, avatar_url, department
  → .eq("status", "active").is("deleted_at", null)

### Bước 3: Tạo employee-mutations.ts

File: app/actions/employee-mutations.ts
Follow pattern contract-mutations.ts.

Functions:
- createEmployee(payload)
  → auto employee_code via getNextEmployeeCode()
  → insert full payload + employee_code
  → fireAuditLog action: "CREATE"
  → revalidatePath("/employees")
  → return data

- updateEmployee(id, payload)
  → filter payload through ALLOWED_FIELDS
  → Nếu payload chứa salary_info → JSONB MERGE (dùng spread: { ...existing.salary_info, ...payload.salary_info })
  → KHÔNG set updated_at (trigger xử lý)
  → fireAuditLog action: "UPDATE"
  → revalidatePath("/employees"), revalidatePath(`/employees/${id}`)

- softDeleteEmployee(id)
  → .update({ deleted_at: new Date().toISOString() })
  → fireAuditLog action: "DELETE", severity: "WARNING"
  → revalidatePath("/employees")

- restoreEmployee(id)
  → .update({ deleted_at: null })
  → fireAuditLog action: "UPDATE"
  → revalidatePath("/employees")

- updateEmployeeNotes(id, notes)
  → .update({ notes }) — dùng column notes MỚI (KHÔNG phải salary_info)
  → revalidatePath(`/employees/${id}`)

### Bước 4: Update imports

- work-task-actions.ts: đổi import getActiveEmployees → from "@/app/actions/employee-queries"
  HOẶC: xóa getActiveEmployees khỏi work-task-actions.ts, chỉ giữ import
- components/contracts/detail/event-task-modal.tsx: đổi import path

### Bước 5: Xóa employee-actions.ts cũ

- Xóa file app/actions/employee-actions.ts
- Grep toàn bộ codebase kiểm tra không còn import từ file cũ

Sau khi refactor xong:
- [ ] npm run build → ZERO errors
- [ ] Grep: không còn import từ "employee-actions"
- [ ] Verify: contracts module vẫn hoạt động (event-task-modal, task assignment)
```

## ═══════════════════════════════════════════
## PHASE 1A: LIST PAGE (Routes + Components)
## ═══════════════════════════════════════════

```
Đọc trước:
- docs/briefs/EMPLOYEES_BRIEF.md (Section 7.2: List Page wireframes)
- docs/specs/v2-module-template.md (Section 1: Folder Structure)
- components/contracts/ (Gold Standard reference — cách contracts module tổ chức)
- components/ui/ — scan toàn bộ shared components có sẵn
- app/globals.css — design tokens
- tasks/gates/before-edit.md — PHẢI MỞ BROWSER xem UI trước khi code

### Bước 1: Route files

1. app/(protected)/employees/page.tsx (~40 dòng)
   - Server Component
   - import getEmployeeList, getEmployeeStats from employee-queries
   - Fetch data SSR
   - export metadata = { title: "Nhân sự | Mood Studio" }
   - Render <EmployeesListClient data={employees} stats={stats} />

2. app/(protected)/employees/layout.tsx (~15 dòng)
   - Nếu cần layout wrapper, tạo minimal
   - Nếu không cần, bỏ qua

3. app/(protected)/employees/loading.tsx (~20 dòng)
   - import EmployeesSkeleton
   - return <EmployeesSkeleton />

4. app/(protected)/employees/error.tsx (~30 dòng)
   - "use client"
   - Error boundary UI

### Bước 2: List components (tạo theo dependency order)

1. components/employees/list/employees-skeleton.tsx (~60 dòng)
   - 4 stat card skeletons (grid 2×2 mobile, 4-col desktop)
   - 6 row skeletons
   - Dùng components/ui/skeleton.tsx

2. components/employees/list/employees-stats.tsx (~80 dòng)
   - Props: stats: { total, active, departments: Record<string, number> }
   - 4 kpi-card.tsx instances
   - Grid: 2×2 mobile, 4-col desktop
   - CSS: dùng SSOT tokens

3. components/employees/list/employees-filters.tsx (~100 dòng)
   - TabsFilter: "Tất cả" | "Đang làm" | "Nghỉ việc"
   - FilterSelect: Department (from DEPARTMENT_OPTIONS)
   - FilterSelect: Role (from ROLE_LABELS)
   - Sort dropdown: Tên A-Z, Mã NV, Ngày vào, Phòng ban
   - SearchBar
   - Tất cả filter → URL searchParams (useRouter + useSearchParams)

4. components/employees/list/employees-table.tsx (~120 dòng)
   - Desktop only (hidden on mobile: className="hidden lg:block")
   - Columns: Mã NV, Avatar+Tên, Bộ phận, Vị trí, Role badge, SĐT, Status badge
   - Row click → router.push(`/employees/${id}`)
   - Dùng avatar.tsx, badge.tsx

5. components/employees/list/employee-mobile-card.tsx (~80 dòng)
   - Mobile only (hidden on desktop: className="lg:hidden")
   - Card: avatar + tên + mã NV + dept + role + status badge
   - Tap → router.push(`/employees/${id}`)

6. components/employees/employees-list-client.tsx (~120 dòng)
   - "use client"
   - Props: data, stats (from server component)
   - Orchestrator: Stats → Filters → Table (desktop) / Cards (mobile) → Pagination → Empty state
   - Import pagination.tsx, ux-states.tsx
   - FABButton cho mobile ("Thêm nhân viên")
   - State: createModalOpen

Sau Phase 1A:
- [ ] npm run build → ZERO errors
- [ ] Mở browser /employees → stats + filters + table/cards hiển thị
- [ ] Mobile 375px → cards layout, FAB visible
- [ ] Desktop 1440px → table layout
- [ ] Search + filter → kết quả đúng
- [ ] Empty state khi 0 results
- [ ] Skeleton loading khi navigate
- [ ] Click NV → navigate (sẽ 404 vì detail chưa có — OK)
```

## ═══════════════════════════════════════════
## PHASE 1B: DETAIL PAGE
## ═══════════════════════════════════════════

```
Đọc trước:
- docs/briefs/EMPLOYEES_BRIEF.md (Section 7.3: Detail Page wireframes)
- components/contracts/detail/ (Gold Standard reference)
- tasks/gates/before-edit.md — MỞ BROWSER xem list page đã xong trước

### Bước 1: Route files

1. app/(protected)/employees/[id]/page.tsx (~50 dòng)
   - Server Component
   - import getEmployeeById from employee-queries
   - Fetch employee, handle not found: if (!employee) notFound()
   - generateMetadata: dynamic title "NV-001 Nguyễn Minh Tâm | Mood Studio"
   - Render <EmployeeDetailClient employee={employee} />

2. app/(protected)/employees/[id]/not-found.tsx (~20 dòng)
   - "Không tìm thấy nhân viên"
   - Link về /employees

### Bước 2: Detail components

1. components/employees/detail/summary-card.tsx (~80 dòng)
   - Props: employee (EmployeeDetail)
   - Avatar letter (dùng avatar.tsx), full_name, employee_code
   - Status badge (dùng badge.tsx + EMPLOYEE_STATUS_MAP)
   - Contact: phone (or "—"), email (or "—")

2. components/employees/detail/work-info-card.tsx (~60 dòng)
   - Department, position, start_date (or "Chưa cập nhật"), role badge
   - CSS: card-base, label-base

3. components/employees/detail/payment-info-card.tsx (~80 dòng)
   - Props: salaryInfo (JSONB), isAdmin (boolean)
   - Nếu !isAdmin → return null (KHÔNG render)
   - Hiển thị: bank_name, bank_account_no, bank_account_name, base_salary (formatCurrency)
   - Empty salary_info → "Chưa cập nhật" cho mỗi field
   - Link: "Xem lịch sử lương →" (Phase 2)

4. components/employees/detail/notes-section.tsx (~80 dòng)
   - Props: employeeId, initialNotes, canEdit (Admin/Manager)
   - Textarea + auto-save on blur (debounce 1.5s)
   - Indicator: "Đang lưu..." | "Đã lưu ✓"
   - Call updateEmployeeNotes (column notes — KHÔNG salary_info)
   - Nếu !canEdit → read-only hoặc hidden

5. components/employees/detail/detail-layout-sections.tsx (~60 dòng)
   - Desktop: grid 2 columns — sidebar (summary-card) | main (work-info + payment-info + notes)
   - Mobile: stacked 1 column

6. components/employees/detail/employee-detail-client.tsx (~150 dòng)
   - "use client"
   - Props: employee (EmployeeDetail)
   - State: editModalOpen, deleteConfirmOpen
   - Header: "← Danh sách" (Link /employees) + "Chỉnh sửa" button (Admin/Manager) + "Cho nghỉ việc" (Admin)
   - Render: DetailLayoutSections → SummaryCard + WorkInfo + PaymentInfo + Notes
   - Soft delete: confirm-dialog.tsx → softDeleteEmployee → redirect /employees
   - Restore: (nếu viewing deleted employee) → restoreEmployee → refresh

Sau Phase 1B:
- [ ] Mở /employees/{id} → sidebar + main hiển thị đúng
- [ ] salary_info = {} → "Chưa cập nhật"
- [ ] start_date = null → "Chưa cập nhật"
- [ ] phone/email = null → "—"
- [ ] Notes: gõ → blur → "Đã lưu ✓" → verify DB column notes (KHÔNG salary_info)
- [ ] Mobile: stacked layout
- [ ] Desktop: sidebar + main grid
- [ ] "← Danh sách" → navigate /employees
- [ ] Invalid ID → not-found page
```

## ═══════════════════════════════════════════
## PHASE 1C: FORM (Create + Edit)
## ═══════════════════════════════════════════

```
Đọc trước:
- docs/briefs/EMPLOYEES_BRIEF.md (Section 7.4: Form wireframe)
- components/contracts/form/ (Gold Standard reference)
- tasks/gates/before-edit.md — MỞ BROWSER xem list + detail đã xong

### Bước 1: Form hook

1. components/employees/form/hooks/useEmployeeForm.ts (~150 dòng)
   - Params: editId? (string — nếu edit mode)
   - State: formData (EmployeeFormData), errors, saving
   - useEffect: nếu editId → fetch getEmployeeById → populate form
   - useEffect: nếu create mode → getNextEmployeeCode → set employee_code
   - updateField<K>(field, value): update state + clear error
   - validate(): check required (full_name, department), email format, phone format
   - checkDuplicate(): email/phone unique → WARN (toast warning, không block submit)
   - handleSubmit(): validate → createEmployee / updateEmployee → toast success → return true
   - return { formData, updateField, errors, saving, handleSubmit }

### Bước 2: Form sections

2. components/employees/form/IdentitySection.tsx (~80 dòng)
   - Props: formData, updateField, errors
   - full_name* (input-base), gender toggle (Nam/Nữ), phone (input-base), email (input-base)
   - Validation error hiển thị dưới mỗi field

3. components/employees/form/WorkSection.tsx (~80 dòng)
   - Props: formData, updateField, errors, isAdmin
   - department* (select từ DEPARTMENT_OPTIONS)
   - position (input-base)
   - start_date (DatePicker, default today)
   - role (select từ ROLE_LABELS — chỉ render nếu isAdmin)

4. components/employees/form/SalarySection.tsx (~80 dòng)
   - Props: formData, updateField, isAdmin
   - Nếu !isAdmin → return null (section KHÔNG render)
   - base_salary (CurrencyInput)
   - bank_name, bank_account_no, bank_account_name (auto uppercase onChange)
   - Label: "Lương & Ngân hàng 🔒"

### Bước 3: Form orchestrator

5. components/employees/form/index.tsx (~100 dòng)
   - Props: editId?, isOpen, onClose, isAdmin
   - Dùng unified-modal.tsx
   - Import useEmployeeForm hook
   - Title: editId ? "Chỉnh sửa nhân viên" : "Thêm nhân viên"
   - Render: IdentitySection → WorkSection → SalarySection
   - Footer: [Hủy] [💾 Lưu hồ sơ] — button disabled + spinner khi saving
   - onSubmit success → onClose() (modal unmount → state cleanup)

### Bước 4: Integrate form vào list + detail

- employees-list-client.tsx: thêm <EmployeeFormModal isOpen={createModalOpen} onClose={...} />
- employee-detail-client.tsx: thêm <EmployeeFormModal editId={employee.id} isOpen={editModalOpen} onClose={...} />

Sau Phase 1C:
- [ ] List page: bấm "Thêm NV" → modal mở
- [ ] Create: điền form → employee_code auto-gen → lưu → toast → list refresh
- [ ] Create: bỏ trống full_name → validation error
- [ ] Create: email trùng → warning toast (không block)
- [ ] Create: button disabled khi saving
- [ ] Detail: bấm "Chỉnh sửa" → modal pre-filled
- [ ] Edit: sửa tên → lưu → detail refresh
- [ ] Edit: role field chỉ Admin thấy
- [ ] Edit: salary section chỉ Admin thấy
- [ ] Manager: tạo NV ✅, sửa role ❌, xem salary ❌
```

## ═══════════════════════════════════════════
## PHASE 1D: FINAL POLISH + FULL VERIFICATION
## ═══════════════════════════════════════════

```
Đọc trước:
- docs/briefs/EMPLOYEES_PLAN_PROMPT.md (Section G: Verification Plan — TOÀN BỘ)

### Bước 1: Self-edit flow
- Khi user = NV thường (không phải admin/manager):
  - Detail page: ẩn salary section, ẩn notes, ẩn delete button
  - Edit modal: chỉ hiện IdentitySection (tên, gender, SĐT, email)
  - WorkSection: read-only hoặc ẩn role
  - SalarySection: ẩn hoàn toàn
- Logic: check currentUserRole → conditional rendering

### Bước 2: Soft delete + restore
- Detail page NV đã nghỉ: hiểu status badge "Nghỉ việc"
- Button "Khôi phục" thay vì "Chỉnh sửa" (Admin only)
- List page: filter "Nghỉ việc" → thấy NV đã soft delete

### Bước 3: Cross-module verify
- [ ] Dashboard → "Nhân viên" → /employees ✅
- [ ] Sidebar → "Nhân viên" → /employees ✅
- [ ] Contracts → event-task-modal → employee dropdown hoạt động
- [ ] User management → link/unlink employee hoạt động

### Bước 4: Full verification checklist
Chạy TOÀN BỘ checklist từ EMPLOYEES_PLAN_PROMPT.md Section G:
- G.1: Build & Lint (4 items)
- G.2: Functional Tests (30+ items)
- G.3: Responsive Tests (5 items)
- G.4: Security Tests (4 items)
- G.5: Cross-module Tests (5 items)

### Bước 5: File size audit
- Grep tất cả files trong components/employees/ → đảm bảo < 300 dòng
- Nếu file nào > 300 → split theo v2-module-template.md patterns
```
