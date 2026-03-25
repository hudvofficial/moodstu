/code Phase 2 — Fix Business Logic Bugs (P1 #5-6, P2 #7-8-12)

## MỤC TIÊU
Fix 5 bugs: filter "Nghỉ việc", stats count, status badge, lương thiếu ₫, dynamic Tailwind classes.

## ĐỌC TRƯỚC
- tasks/pre-code-checklist.md
- tasks/lessons.md
- tasks/gates/before-edit.md
- Audit report: employee_audit_report.md (section 5 + 8)

Supabase Project ID: mnoqeluywookswpcykha

---

## BƯỚC 1: Fix filter "Nghỉ việc" + stats count (P1 #5-6)

Sửa: `app/actions/employee-queries.ts`

### 1a. getEmployeeList — fix status filter logic

TÌM đoạn filter status trong getEmployeeList (khoảng line 35-45).

Logic CŨ (sai):
```ts
if (status === "inactive") query = query.eq("status", "terminated");
```

Logic MỚI (đúng):
```ts
if (params.status === "inactive") {
  // "Nghỉ việc" = soft-deleted (deleted_at IS NOT NULL)
  query = query.not("deleted_at", "is", null);
} else {
  // Mặc định: chỉ hiện active (deleted_at IS NULL)
  query = query.is("deleted_at", null);
  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }
}
```

### 1b. getEmployeeStats — thêm inactive count

TÌM function getEmployeeStats. Thêm query đếm soft-deleted:

```ts
const { count: inactiveCount } = await supabase
  .from("employees")
  .select("*", { count: "exact", head: true })
  .not("deleted_at", "is", null);
```

Return thêm `inactive: inactiveCount || 0` trong stats object.

### 1c. Update Stats type nếu cần

File: `types/employee.ts` hoặc inline trong queries — thêm `inactive` field.

---

## BƯỚC 2: Fix status badge cho NV đã nghỉ (P2 #7)

Sửa: `components/employees/employee-table.tsx` + `components/employees/employee-card.tsx`

Trong cả 2 files, TÌM dòng tương tự:
```ts
const statusInfo = EMPLOYEE_STATUS_MAP[emp.status] || { label: emp.status, variant: "neutral" };
```

THAY bằng:
```ts
const effectiveStatus = emp.deleted_at ? "inactive" : emp.status;
const statusInfo = EMPLOYEE_STATUS_MAP[effectiveStatus] || { label: effectiveStatus, variant: "neutral" };
```

LƯU Ý: Kiểm tra `EmployeeListItem` type có field `deleted_at` không. Nếu chưa có → thêm vào type + thêm vào select query trong getEmployeeList.

---

## BƯỚC 3: Thêm ₫ vào lương (P2 #8)

Sửa: `components/employees/employee-detail-page.tsx`

TÌM:
```ts
value: salary.base_salary ? formatCurrency(salary.base_salary) : null
```

THAY:
```ts
value: salary.base_salary ? `${formatCurrency(salary.base_salary)} ₫` : null
```

LƯU Ý: Check `formatCurrency` trong `lib/utils.ts` — nếu nó đã thêm "VNĐ" thì KHÔNG thêm ₫ nữa.

---

## BƯỚC 4: Fix dynamic Tailwind classes (P2 #12)

Sửa: `components/employees/employee-table.tsx` + `components/employees/employee-card.tsx`

Tailwind KHÔNG generate dynamic classes như `bg-${variant}/10 text-${variant}`.

### 4a. Tạo mapping object (đặt đầu file hoặc trong constants):

```ts
const VARIANT_COLORS: Record<string, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-error/10 text-error",
  info: "bg-info/10 text-info",
  neutral: "bg-surface text-text-muted",
  primary: "bg-primary/10 text-primary",
};

const VARIANT_DOT: Record<string, string> = {
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
  info: "bg-info",
  neutral: "bg-text-muted",
  primary: "bg-primary",
};
```

### 4b. Thay dynamic classes

TÌM (status badge):
```tsx
className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-${statusInfo.variant}/10 text-${statusInfo.variant}`}
```

THAY:
```tsx
className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${VARIANT_COLORS[statusInfo.variant] || VARIANT_COLORS.neutral}`}
```

TÌM (status dot):
```tsx
className={`size-1.5 rounded-full bg-${statusInfo.variant}`}
```

THAY:
```tsx
className={`size-1.5 rounded-full ${VARIANT_DOT[statusInfo.variant] || VARIANT_DOT.neutral}`}
```

TÌM (role badge):
```tsx
className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-${roleBadge.variant}/10 text-${roleBadge.variant}`}
```

THAY:
```tsx
className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${VARIANT_COLORS[roleBadge.variant] || VARIANT_COLORS.neutral}`}
```

Làm tương tự cho employee-card.tsx.

---

## BƯỚC 5: Update employee-list-page.tsx truyền inactive count

Sửa: `components/employees/employee-list-page.tsx`

TÌM:
```tsx
<EmployeeFilters stats={{ total: stats.total, active: stats.active }} />
```

THAY (thêm inactive):
```tsx
<EmployeeFilters stats={{ total: stats.total, active: stats.active, inactive: stats.inactive || 0 }} />
```

Và update Props interface nếu cần.

---

## VERIFY

1. Mở browser /employees → click tab "Nghỉ việc" → phải hiện NV đã xóa mềm (NV-003)
2. Badge NV đã nghỉ → hiện "Nghỉ việc" (neutral) thay vì "Đang làm" (success)
3. Pill count: "Nghỉ việc (1)" thay vì "(0)"
4. Mở /employees/[id] → lương hiện "12.000.000 ₫"
5. Role badge + status badge có màu đúng (không bị missing)
6. Dev server 0 errors

## KHÔNG ĐƯỢC LÀM
- Không sửa layout/filter UI (đó là Phase 3)
- Không thay native select → SelectPill (Phase 3)
- Không xóa search bar (Phase 3)
- Chỉ fix bugs, KHÔNG refactor UI
