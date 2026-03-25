# PROMPT: Implementation Plan cho Module /employees

> **Cách dùng:** Copy toàn bộ nội dung dưới đây làm prompt cho `/plan`
> **Ngày tạo:** 2026-03-24
> **Dựa trên:** EMPLOYEES_BRIEF.md v2 (Deep Audit — 14 sections)

---

Bạn là Senior Technical Architect cho Mood Studio V2. Hãy tạo IMPLEMENTATION PLAN chi tiết cho module /employees dựa trên BRIEF đã duyệt.

## A. INPUT BẮT BUỘC — ĐỌC HẾT TRƯỚC KHI PLAN

| # | File | Mục đích |
|---|------|----------|
| 1 | `docs/briefs/EMPLOYEES_BRIEF.md` | BRIEF chính (v2, 14 sections, Deep Audit) |
| 2 | `docs/specs/v2-module-template.md` | V2 Module Template Spec (380 dòng — Gold Standard) |
| 3 | `app/actions/employee-actions.ts` | Actions hiện tại (112 dòng — cần refactor) |
| 4 | `app/actions/salary-actions.ts` | Salary actions (80 dòng — giữ nguyên) |
| 5 | `app/actions/user-management-actions.ts` | Auth linking (có bug B2 cần fix) |
| 6 | `app/actions/work-task-actions.ts` | Có `getActiveEmployees()` — cần move |
| 7 | `app/actions/task-overlap-actions.ts` | Employee time/deadline overlap checks — KHÔNG thay đổi |
| 8 | `app/actions/task-assign-actions.ts` | Task assignment — KHÔNG thay đổi |
| 9 | `app/actions/schedule-actions.ts` | Schedule employee_id — KHÔNG thay đổi |
| 10 | Scan toàn bộ `components/ui/` | 29 shared components có sẵn |
| 11 | `app/globals.css` | Design tokens, SSOT classes |
| 12 | Folder `components/contracts/` | Reference module (Gold Standard pattern) |
| 13 | `app/actions/contract-queries.ts` + `contract-mutations.ts` | Reference: action split pattern |
| 14 | `lib/navigation.ts` (line 69) | Sidebar entry employees — đã có |
| 15 | `components/dashboard/quick-access-grid.tsx` | Dashboard entry employees — đã có |
| 16 | `tasks/pre-code-checklist.md` | Pre-code gate |
| 17 | `tasks/gates/before-edit.md` | Before-edit gate |
| 18 | `tasks/lessons.md` | Lessons learned |

## B. DECISIONS ĐÃ CHỐT

| # | Câu hỏi | Quyết định |
|---|---------|-----------|
| Q1 | Department: ENUM hay text? | **Predefined list (app constants)**, KHÔNG dùng DB ENUM, giữ VARCHAR trong DB |
| Q2 | Notes: tách column hay fix JSONB? | **Thêm column `notes` TEXT riêng** vào employees table (DB migration) |
| Q3 | employee_code: auto thế nào? | **App logic (MAX + 1)**, format `NV-{seq 3 digits}` |
| Q4 | Data migration 5 NV? | **CÓ** — fix role đúng per position, set start_date |
| Q5 | Self-edit profile? | **CÓ** — RLS đã support, NV tự sửa tên/SĐT/email |
| Q6 | Gender options? | **Nam / Nữ** (2 options, toggle) |
| Q7 | Drawer quick preview? | **KHÔNG** — click NV → navigate `/employees/{id}` trực tiếp |
| Q8 | Page size? | **20 NV/page** (giống V1) |
| Q9 | Back navigation detail? | **`<Link href="/employees">`** (KHÔNG dùng router.back()) |
| Q10 | `getActiveEmployees()` refactor? | **MOVE** sang `employee-queries.ts`, update imports trong `work-task-actions.ts` + `event-task-modal.tsx` |

## C. PHASE 0: PREREQUISITES (Bug Fixes + Infrastructure)

Liệt kê CHI TIẾT từng file cần sửa, dòng nào, đổi thành gì:

### C.1. Bug Fixes

- [ ] **Fix B1:** `employee-actions.ts:105` — Notes ghi đè salary_info
  - Hiện tại: `.update({ salary_info: { notes } })` → xóa sạch salary data
  - Sau fix: dùng column `notes` mới (sau migration), KHÔNG động vào salary_info
  - Function `updateEmployeeNotesAction` sửa lại hoàn toàn

- [ ] **Fix B2:** `user-management-actions.ts:39` — Status filter mismatch
  - Hiện tại: `.eq("status", "Đang làm")`
  - Sửa thành: `.eq("status", "active")`

- [ ] **Fix B3:** `employee-actions.ts` — ALLOWED_FIELDS thiếu
  - Thêm `"role"`, `"gender"` vào ALLOWED_FIELDS whitelist

### C.2. DB Migrations

- [ ] **Migration 1:** Thêm column `notes TEXT DEFAULT NULL` vào employees table
- [ ] **Migration 2:** Fix data 5 NV hiện tại:
  - NV-001 Nguyễn Minh Tâm: role → `media`, start_date → `2025-01-15`
  - NV-002 Trần Thị Lan: role → `media`, start_date → `2025-01-15`
  - NV-003 Lê Hoàng Nam: role → `media`, start_date → `2025-02-01`
  - NV-004 Phạm Thị Mai: role → `media`, start_date → `2025-03-01`
  - NV-005 Vũ Đức Anh: role → `media`, start_date → `2025-03-01`
  - *(Anh confirm role/date chính xác, trên chỉ là placeholder)*

### C.3. Action Refactor

- [ ] **Split `employee-actions.ts`** (112 dòng) thành:
  - `employee-queries.ts` — READ-only: `getEmployeeList`, `getEmployeeById` (mới), `getEmployeeStats`, `getNextEmployeeCode` (mới), `getActiveEmployees` (move từ work-task-actions.ts)
  - `employee-mutations.ts` — CUD: `createEmployee`, `updateEmployee`, `softDeleteEmployee`, `restoreEmployee` (mới), `updateEmployeeNotes` (fix B1)
- [ ] **Update imports** trong:
  - `work-task-actions.ts` — `getActiveEmployees` import path
  - `components/contracts/detail/event-task-modal.tsx` — `getActiveEmployees` import path
- [ ] **Xóa** `employee-actions.ts` cũ sau khi split xong

### C.4. Types

- [ ] `types/employee.ts` — DB row types, enums (EmployeeRole, EmployeeStatus), interfaces
- [ ] `types/employee-constants.ts` — DEPARTMENT_OPTIONS, ROLE_LABELS, STATUS_MAP, GENDER_OPTIONS, color maps
- [ ] `types/employee-form.ts` — EmployeeFormData interface (form ≠ DB)

## D. PHASE 1: MVP (File-by-file specs)

Cho MỖI file ghi rõ:
- Path đầy đủ
- Số dòng dự kiến (PHẢI < 300)
- Imports cụ thể
- Props / interface
- Logic chính (state, handlers, business rules)
- CSS classes (PHẢI là SSOT tokens từ globals.css)
- Responsive behavior (mobile `< lg` vs desktop `≥ lg`)

### D.1. Route Infrastructure

- [ ] `app/(protected)/employees/page.tsx` — Server component, SSR fetch getEmployeeList + getEmployeeStats, pass data qua props
- [ ] `app/(protected)/employees/layout.tsx` — Layout wrapper (nếu cần)
- [ ] `app/(protected)/employees/loading.tsx` — Next.js file-based loading, dùng skeleton pattern
- [ ] `app/(protected)/employees/error.tsx` — Error boundary cho server component failures
- [ ] `app/(protected)/employees/[id]/page.tsx` — Server component, SSR fetch getEmployeeById, handle not found
- [ ] `app/(protected)/employees/[id]/not-found.tsx` — UI khi employee ID không tồn tại

### D.2. Next.js Metadata

- `page.tsx`: `export const metadata = { title: "Nhân sự | Mood Studio" }`
- `[id]/page.tsx`: `export async function generateMetadata({ params })` → dynamic title `"NV-001 Nguyễn Minh Tâm | Mood Studio"`

### D.3. Server Actions

- [ ] `app/actions/employee-queries.ts`
  - `getEmployeeList(params)` — filter status/dept/role, search name/code/phone/email, sort, pagination (pageSize=20), `.is("deleted_at", null)` mặc định
  - `getEmployeeById(id)` — single employee với full data, throw if not found
  - `getEmployeeStats()` — count tổng/active/per department
  - `getNextEmployeeCode()` — MAX employee_code + 1, format `NV-{seq}`
  - `getActiveEmployees()` — move từ work-task-actions.ts, select id/full_name/avatar_url/department

- [ ] `app/actions/employee-mutations.ts`
  - `createEmployee(payload)` — validate, auto employee_code, insert, fireAuditLog, revalidatePath("/employees")
  - `updateEmployee(id, payload)` — validate ALLOWED_FIELDS (incl. role, gender), JSONB merge salary_info (KHÔNG ghi đè), fireAuditLog, revalidatePath
  - `softDeleteEmployee(id)` — set deleted_at = now(), fireAuditLog (severity: WARNING), revalidatePath
  - `restoreEmployee(id)` — set deleted_at = null, fireAuditLog, revalidatePath
  - `updateEmployeeNotes(id, notes)` — update column `notes` (KHÔNG phải salary_info!), revalidatePath
  - `updated_at`: KHÔNG set manually — DB trigger `update_employees_updated_at` tự xử lý

### D.4. List Page Components

- [ ] `components/employees/employees-list-client.tsx` — Orchestrator: nhận data từ server component, render stats + filters + table/cards + pagination + empty state + FAB
- [ ] `components/employees/list/employees-stats.tsx` — 4 stats cards (dùng `kpi-card.tsx`), grid 2×2 mobile → 4 cols desktop
- [ ] `components/employees/list/employees-filters.tsx` — TabsFilter (status: Tất cả/Đang làm/Nghỉ việc) + FilterSelect (dept) + FilterSelect (role) + Sort dropdown (tên A-Z, mã NV, ngày vào, phòng ban) + SearchBar → URL searchParams
- [ ] `components/employees/list/employees-table.tsx` — Desktop table (≥ lg): columns Mã NV, Avatar+Tên, Bộ phận, Vị trí, Role, SĐT, Status. Row click → navigate detail
- [ ] `components/employees/list/employee-mobile-card.tsx` — Mobile card (< lg): avatar + tên + mã NV + dept + role + status badge. Card tap → navigate detail
- [ ] `components/employees/list/employees-skeleton.tsx` — Loading skeleton: 4 stat card skeletons + 6 row/card skeletons (dùng `skeleton.tsx`)

### D.5. Detail Page Components

- [ ] `components/employees/detail/employee-detail-client.tsx` — Orchestrator: state cho edit modal open/close, delete confirm, notes state. Nhận employee data qua props
- [ ] `components/employees/detail/detail-layout-sections.tsx` — Desktop: sidebar (30%) + main (70%). Mobile: stacked 1 column
- [ ] `components/employees/detail/summary-card.tsx` — Avatar (letter), full_name, employee_code, status badge, phone, email. Dùng `avatar.tsx` có sẵn
- [ ] `components/employees/detail/work-info-card.tsx` — Department, position, start_date (or "Chưa cập nhật"), role badge
- [ ] `components/employees/detail/payment-info-card.tsx` — salary_info JSONB display: bank_name, bank_account_no, bank_account_name, base_salary (formatCurrency). Admin only — ẩn hoàn toàn cho non-admin. Empty: "Chưa cập nhật". Link text "Xem lịch sử lương →" (Phase 2, navigate `/finance/salaries`)
- [ ] `components/employees/detail/notes-section.tsx` — Textarea auto-save on blur (debounce 1.5s). Admin/Manager only. Indicator "Đang lưu..." / "Đã lưu ✓"

### D.6. Form Components

- [ ] `components/employees/form/index.tsx` — Form orchestrator: unified-modal wrapper, submit handler (create or update mode), success toast, modal close → state cleanup
- [ ] `components/employees/form/IdentitySection.tsx` — full_name* (text), gender (toggle Nam/Nữ), phone (text, VN format), email (email input)
- [ ] `components/employees/form/WorkSection.tsx` — department* (select từ DEPARTMENT_OPTIONS constants), position (text), start_date (DatePicker, default today), role (select từ ROLE_LABELS — Admin only, ẩn cho Manager)
- [ ] `components/employees/form/SalarySection.tsx` — base_salary (CurrencyInput), bank_name (text), bank_account_no (text), bank_account_name (text, auto uppercase). Admin only section — ẩn hoàn toàn cho non-Admin
- [ ] `components/employees/form/hooks/useEmployeeForm.ts` — state management, updateField, validation rules, duplicate check (email/phone → warn không block), getNextEmployeeCode on mount (create mode), submit logic (createEmployee or updateEmployee), error handling

### D.7. Self-Edit Flow

- NV đăng nhập (auth_user_id linked) → mở `/employees/{own_id}`
- UI chỉ hiện: tên, giới tính, SĐT, email (editable)
- KHÔNG hiện: role select, salary section, notes, delete button
- Server-side: `updateEmployee` validate scope — NV chỉ update fields cho phép
- ⚠️ Prerequisite: auth_user_id phải được link trước (Settings module, ngoài scope)

## E. CROSS-MODULE — KHÔNG ĐƯỢC PHÁ

| File | Sử dụng employees | Hành động |
|------|-------------------|-----------|
| `work-task-actions.ts` | `getActiveEmployees()` | MOVE function sang `employee-queries.ts`, update import |
| `task-assign-actions.ts` | `assignTask({ employeeId })` | KHÔNG thay đổi |
| `task-overlap-actions.ts` | `checkEmployeeTimeOverlap()`, `checkEmployeeDeadlineOverlap()` | KHÔNG thay đổi |
| `schedule-actions.ts` | `employee_id` field | KHÔNG thay đổi |
| `components/contracts/detail/event-task-modal.tsx` | import `getActiveEmployees` | UPDATE import path |
| `components/contracts/detail/task-list-panel.tsx` | `employees:assigned_to(...)` join | KHÔNG thay đổi |
| `components/contracts/detail/notes-timeline.tsx` | `employees.full_name` | KHÔNG thay đổi |
| `components/contracts/drawer-assignments.tsx` | `employees.full_name` | KHÔNG thay đổi |
| `components/contracts/form/ContractInfoSection.tsx` | `assigned_to` free text | KHÔNG thay đổi |
| `components/dashboard/quick-access-grid.tsx` | employees entry | Verify link `/employees` hoạt động |
| `lib/navigation.ts:69` | sidebar entry | Verify route `/employees` tồn tại |
| `salary-actions.ts` | `recalculateEmployeeSalary` | KHÔNG thay đổi |
| `user-management-actions.ts` | link/unlink employee | Fix B2 only, logic giữ nguyên |

## F. SCOPE BOUNDARIES

### Trong scope (MVP)
- ✅ CRUD employees (list, detail, create, edit, soft delete, restore)
- ✅ Filters + search + sort + pagination
- ✅ Stats cards
- ✅ Notes auto-save
- ✅ Self-edit profile cơ bản
- ✅ Skeleton loading
- ✅ Mobile FAB
- ✅ Empty states
- ✅ Error handling
- ✅ Bug fixes (B1, B2, B3)
- ✅ Action refactor (split queries/mutations)
- ✅ Types + constants

### Ngoài scope (Phase 2+)
- ❌ Attendance tab
- ❌ Requests tab (nghỉ phép, tạm ứng)
- ❌ Evaluations tab
- ❌ Productivity summary (work_tasks stats)
- ❌ Export Excel
- ❌ Equipment tab
- ❌ Avatar upload
- ❌ Bulk import
- ❌ Org chart
- ❌ Auth linking UI (thuộc Settings module)
- ❌ Salary history UI (thuộc Finance module)

## G. VERIFICATION PLAN

### G.1. Build & Lint
- [ ] `npm run build` — ZERO errors
- [ ] Tất cả files < 300 dòng
- [ ] Không có `any` type (full TypeScript)
- [ ] CSS chỉ dùng SSOT tokens (grep check hardcoded values)

### G.2. Functional Tests (Browser)
- [ ] Mở `/employees` → stats + filters + table/cards hiển thị đúng
- [ ] Search by name → kết quả đúng
- [ ] Search by employee_code → kết quả đúng
- [ ] Search by phone → kết quả đúng
- [ ] Search by email → kết quả đúng
- [ ] Filter status "Đang làm" → chỉ active employees
- [ ] Filter status "Nghỉ việc" → chỉ soft-deleted
- [ ] Filter status "Tất cả" → cả 2
- [ ] Filter department → đúng
- [ ] Filter role → đúng
- [ ] Sort by tên A-Z → đúng thứ tự
- [ ] Sort by mã NV → đúng thứ tự
- [ ] Pagination: page 1 → page 2 → page 1 (nếu > 20 NV)
- [ ] Tạo NV mới → modal mở → điền form → employee_code auto-gen → lưu → toast → list refresh
- [ ] Tạo NV: bỏ trống full_name → validation error hiện
- [ ] Tạo NV: nhập email trùng → warning (không block)
- [ ] Tạo NV: button disabled + spinner khi saving (no double-click)
- [ ] Mở detail `/employees/{id}` → sidebar + main content đúng
- [ ] Detail: salary_info = {} → "Chưa cập nhật" (không crash)
- [ ] Detail: start_date = null → "Chưa cập nhật"
- [ ] Detail: phone/email = null → "—"
- [ ] Edit NV → modal pre-filled → sửa → lưu → toast → refresh
- [ ] Edit: role field chỉ Admin thấy
- [ ] Edit: salary section chỉ Admin thấy
- [ ] Notes: gõ → blur → auto-save → "Đã lưu ✓"
- [ ] Notes: verify DB — column `notes` update, `salary_info` KHÔNG bị thay đổi
- [ ] Soft delete → confirm dialog → lưu → NV ẩn khỏi list
- [ ] Soft delete: filter "Nghỉ việc" → thấy NV vừa xóa
- [ ] Restore: (nếu implement) → NV hiện lại trong list "Đang làm"
- [ ] Empty state: filter KPI 0 results → hiện UX state (không blank page)
- [ ] Skeleton: refresh page → thấy skeleton trước khi data load
- [ ] Invalid URL `/employees/invalid-uuid` → not-found page
- [ ] Error boundary: server action fail → error message user-friendly

### G.3. Responsive Tests
- [ ] Mobile 375px: cards layout, table hidden, FAB visible
- [ ] Desktop 1440px: table layout, FAB hidden, button visible
- [ ] Tablet 768px: acceptable layout (no broken elements)
- [ ] Detail mobile: stacked layout (sidebar trên, main dưới)
- [ ] Detail desktop: sidebar left + main right

### G.4. Security Tests
- [ ] Admin: tạo/sửa/xóa NV ✅, sửa role ✅, xem salary ✅
- [ ] Manager: tạo/sửa NV ✅, sửa role ❌, xem salary ❌, xóa ❌
- [ ] NV thường: xem list ✅, xem own detail ✅, self-edit (tên/SĐT/email) ✅, sửa role ❌, xem salary ❌
- [ ] salary_info section ẩn hoàn toàn cho non-Admin (không chỉ disabled, mà KHÔNG render)

### G.5. Cross-module Tests
- [ ] Dashboard → click "Nhân viên" → navigate `/employees` ✅
- [ ] Sidebar → click "Nhân viên" → navigate `/employees` ✅
- [ ] Contracts → event-task-modal → employee dropdown vẫn hoạt động (sau move getActiveEmployees)
- [ ] Contracts → task assignment → employee name hiển thị đúng
- [ ] User management → link/unlink employee hoạt động (sau fix B2)

## H. CONSTRAINTS (TUYỆT ĐỐI KHÔNG VI PHẠM)

1. Mọi file < 300 dòng — split nếu vượt
2. V2 Template Spec conventions: naming, folder structure, split queries/mutations
3. Dùng shared UI components có sẵn — KHÔNG tạo mới nếu `components/ui/` đã có
4. CSS dùng design tokens từ globals.css — KHÔNG hardcode colors, spacing, border-radius
5. Server Actions dùng `withAuth()` wrapper
6. `revalidatePath()` sau mọi mutation — cả `"/employees"` và `"/employees/{id}"`
7. `fireAuditLog()` cho mọi CREATE/UPDATE/DELETE
8. Soft delete: `.is("deleted_at", null)` cho mọi list query
9. KHÔNG duplicate salary UI — salary history link sang Finance module
10. Follow Contract module patterns (Gold Standard reference)
11. Error handling: try/catch, user-friendly error message, toast notification
12. Empty data: handle null/undefined gracefully — "Chưa cập nhật" hoặc "—"
13. `employee_code`: auto-generate app logic, check unique constraint on INSERT
14. `updated_at`: KHÔNG set manually — DB trigger tự xử lý
15. V1 hooks (`useEmployeesList`, `useEmployeeStats`): KHÔNG import/reuse, tạo mới theo V2 pattern
16. Button states: disabled + spinner khi async operation (prevent double-click)
17. Form cleanup: modal close → state reset (unmount handles cleanup)
18. Toast: scan codebase tìm toast implementation đang dùng, dùng cùng loại
19. `avatar.tsx`: dùng component có sẵn, KHÔNG tạo avatar component mới
20. `formatCurrency()` + `CURRENCY_SYMBOL` cho mọi hiển thị tiền

## I. OUTPUT FORMAT

Plan PHẢI gồm 5 phần:

1. **Dependency Graph** — file nào build trước, phụ thuộc file nào (mermaid diagram)
2. **Phase 0 specs** — từng bug fix chi tiết (trước/sau) + migration SQL chính xác + refactor plan
3. **Phase 1 specs** — mỗi file: path, ~lines, imports, props/interface, logic, CSS tokens, responsive
4. **Verification Checklist** — copy Section G, KHÔNG được bỏ item nào
5. **Risk Mitigation** — từ BRIEF Section 14 + cách handle cụ thể
