Fix triệt để module Employees theo Audit Report. Fix ALL P1 + P2 (13 items). KHÔNG thêm gì ngoài scope.

## CONTEXT

Đọc trước (BẮT BUỘC):
- docs/reports/employee_audit_report.md hoặc audit report trong brain — SSOT cho plan này
- tasks/pre-code-checklist.md
- tasks/gates/before-edit.md
- tasks/lessons.md
- components/ui/tabs-filter.tsx — component sẽ reuse
- components/ui/select/SelectPill.tsx — component sẽ reuse
- components/ui/pagination.tsx — component sẽ reuse
- components/contracts/contracts-list-client.tsx — Gold Standard layout reference
- components/contracts/contracts-dropdown-filters.tsx — Gold Standard filter pattern

TRƯỚC KHI CODE: mở browser xem /contracts + /employees desktop cạnh nhau để xác nhận visual target.

Supabase Project ID: mnoqeluywookswpcykha

---

## PHASE 1: SHARED HELPERS (P2 #11 — DRY trước, dùng lại sau)

### Bước 1.1: Tạo file mới `lib/employee-utils.ts`

```ts
// Extract từ 3 files duplicate
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  return phone;
}

export function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).slice(-2).join("").toUpperCase();
}
```

### Bước 1.2: Update imports trong 3 files

Xóa local `formatPhone` + `getInitials` trong:
- `components/employees/employee-table.tsx` → import từ `@/lib/employee-utils`
- `components/employees/employee-card.tsx` → import từ `@/lib/employee-utils`
- `components/employees/employee-detail-page.tsx` → import từ `@/lib/employee-utils`

---

## PHASE 2: FIX BUSINESS LOGIC BUGS (P1 #5-6, P2 #7-8)

### Bước 2.1: Fix filter "Nghỉ việc" + stats count

Sửa: `app/actions/employee-queries.ts`

**getEmployeeList:**
```ts
// THAY THẾ logic status filter cũ:
if (params.status === "inactive") {
  // "Nghỉ việc" = soft-deleted employees
  query = query.not("deleted_at", "is", null);
} else {
  query = query.is("deleted_at", null);
  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }
}
```

**getEmployeeStats:**
Thêm count cho soft-deleted:
```ts
// Đếm inactive (soft-deleted)
const { count: inactiveCount } = await supabase
  .from("employees")
  .select("*", { count: "exact", head: true })
  .not("deleted_at", "is", null);
```

Return thêm `inactive` trong stats object. Update type nếu cần.

### Bước 2.2: Fix status badge cho NV đã nghỉ (P2 #7)

Sửa: `employee-table.tsx` + `employee-card.tsx`

Logic: nếu `emp.deleted_at` → override status thành "Nghỉ việc" (neutral badge):
```ts
const effectiveStatus = emp.deleted_at ? "inactive" : emp.status;
const statusInfo = EMPLOYEE_STATUS_MAP[effectiveStatus] || { label: effectiveStatus, variant: "neutral" };
```

### Bước 2.3: Thêm ₫ vào lương (P2 #8)

Sửa: `employee-detail-page.tsx`

```ts
// TÌM:
value: salary.base_salary ? formatCurrency(salary.base_salary) : null
// THAY:
value: salary.base_salary ? `${formatCurrency(salary.base_salary)} ₫` : null
```

### Bước 2.4: Fix dynamic Tailwind classes (P2 #12)

Sửa: `employee-table.tsx` + `employee-card.tsx`

Thay dynamic `bg-${variant}/10 text-${variant}` bằng mapping object:

```ts
const BADGE_COLORS: Record<string, string> = {
  error: "bg-error/10 text-error",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
  neutral: "bg-surface text-text-muted",
};

// Dùng: className={BADGE_COLORS[roleBadge.variant] || BADGE_COLORS.neutral}
```

Áp dụng cho CẢ role badge VÀ status badge.

---

## PHASE 3: REFACTOR FILTERS (P1 #1-4 — trọng tâm)

### Bước 3.1: Rewrite `employee-filters.tsx`

Xóa toàn bộ nội dung cũ, viết lại theo Gold Standard:

**DESKTOP (lg+):**
```
[TabsFilter: Tất cả | Đang làm | Nghỉ việc]    [SelectPill: Phòng ban] [SelectPill: Vai trò] [SelectPill: Sắp xếp]
```
- 1 row duy nhất: `flex items-center justify-between`
- Trái: `TabsFilter` (import từ `@/components/ui/tabs-filter`)
- Phải: 3x `SelectPill` (import từ `@/components/ui/select/SelectPill`)
- KHÔNG CÓ search bar

**MOBILE (< lg):**
```
[Pill: Tất cả] [Pill: Đang làm] [Pill: Nghỉ việc] [SelectPill: Phòng ban] [SelectPill: Vai trò] [SelectPill: Sắp xếp]
```
- 1 row scrollable ngang: `flex items-center gap-2 overflow-x-auto scrollbar-hide`
- Status pills dùng style giống contracts mobile
- Filter dropdowns dùng `SelectPill`
- KHÔNG CÓ search bar

**Props interface mới:**
```ts
interface Props {
  stats: { total: number; active: number; inactive: number };
}
```

**State management:** giữ nguyên URL searchParams pattern (useRouter + updateParam helper).

**Tab counts:**
```ts
const STATUS_TABS = [
  { label: "Tất cả", value: "all", count: stats.total },
  { label: "Đang làm", value: "active", count: stats.active },
  { label: "Nghỉ việc", value: "inactive", count: stats.inactive },
];
```

### Bước 3.2: Update `employee-list-page.tsx`

- Update props truyền vào `EmployeeFilters`: thêm `inactive` count
- Xóa search bar detection logic (`hasFilters` check for `search`)
- Giữ nguyên: stats bar, FAB, empty state, table/card, pagination, form modal

---

## PHASE 4: SHARED PAGINATION (P2 #9)

### Bước 4.1: Thay `EmployeePagination` → shared `Pagination`

Sửa: `employee-list-page.tsx`

```ts
// THAY:
import EmployeePagination from "./employee-pagination";
// BẰNG:
import { Pagination } from "@/components/ui/pagination";
```

Kiểm tra shared `Pagination` component có nhận URL-based page change không. Nếu nó dùng `onChange` callback thì wrap:
```ts
<Pagination page={page} totalPages={totalPages} onChange={(p) => {
  const params = new URLSearchParams(searchParams.toString());
  if (p > 1) params.set("page", String(p));
  else params.delete("page");
  router.push(`${pathname}?${params.toString()}`);
}} />
```

### Bước 4.2: Xóa file `employee-pagination.tsx`

Sau khi verify không còn import nào dùng.

---

## PHASE 5: DETAIL PAGE POLISH (P2 #10)

### Bước 5.1: Đổi back link → breadcrumb

Sửa: `employee-detail-page.tsx`

```tsx
// THAY:
<Link href="/employees" className="...">
  <ArrowLeft /> Danh sách nhân viên
</Link>

// BẰNG:
<nav className="flex items-center gap-1.5 text-sm">
  <Link href="/employees" className="text-text-muted hover:text-text transition-colors">Nhân viên</Link>
  <span className="text-text-muted">›</span>
  <span className="text-text font-medium truncate">{employee.full_name}</span>
</nav>
```

---

## PHASE 6: VERIFY

### Build + Test
1. `npx next build` → phải 0 errors
2. Mở browser /employees desktop → screenshot so sánh với /contracts
3. Test filter: click "Nghỉ việc" → phải hiện NV-003
4. Test sort: A→Z, Z→A, Mã NV
5. Mở /employees/[id] → check breadcrumb + lương có ₫ + tel/mailto clickable
6. Check mobile view: filters scroll ngang, cards hiện đúng

### Checklist cuối:
- [ ] Không còn native `<select>` trong employee-filters.tsx
- [ ] Không còn search bar trong filters
- [ ] TabsFilter dùng cho status
- [ ] SelectPill dùng cho 3 dropdowns
- [ ] `formatPhone` + `getInitials` chỉ tồn tại ở 1 file duy nhất
- [ ] Dynamic Tailwind classes đã thay bằng mapping object
- [ ] "Nghỉ việc" filter hoạt động
- [ ] Stats count đúng
- [ ] Lương có ₫
- [ ] Breadcrumb đúng format
- [ ] File employee-pagination.tsx đã xóa
- [ ] Build pass 0 errors
