# Phase 5 — Shared System Standardization

## MỤC TIÊU
Fix 8 gaps để shared system đạt 100%. Module mới chỉ cần import → tự đồng bộ.

## ĐỌC TRƯỚC (BẮT BUỘC)
- tasks/pre-code-checklist.md
- tasks/lessons.md
- tasks/gates/before-edit.md
- Audit report: shared_system_gap_analysis.md

## GATE: VISUAL VERIFY (BẮT BUỘC)
1. Mở browser `/contracts` → screenshot trước khi sửa
2. Mở browser `/employees` → screenshot trước khi sửa
3. Viết plan ngắn → trình anh duyệt trước khi code

---

## BƯỚC 1: Consolidate Utilities (P1 — 5 files, ~10 phút)

### 1a. Move `getInitials()` → `lib/utils.ts`

HIỆN TẠI: 3 bản copy:
- `lib/employee-utils.ts` → `getInitials(name: string)`
- `components/contracts/contracts-table.tsx` (line 34) → local function
- `components/ui/avatar.tsx` (line 25) → local function

LÀM:
```ts
// Thêm vào lib/utils.ts
export function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).slice(-2).join("").toUpperCase();
}
```

SỬA:
- `lib/employee-utils.ts` → xóa `getInitials`, giữ `formatPhone`
- `contracts-table.tsx` → xóa local function, import từ `@/lib/utils`
- `avatar.tsx` → xóa local function, import từ `@/lib/utils`
- `employee-table.tsx` → đổi import
- `employee-card.tsx` → đổi import
- `employee-detail-page.tsx` → đổi import

### 1b. Move `formatPhone()` → `lib/utils.ts`

HIỆN TẠI: `lib/employee-utils.ts` → chỉ còn `formatPhone`
CRM, Finance cũng sẽ cần format số điện thoại.

LÀM:
- Move `formatPhone()` vào `lib/utils.ts`
- XÓA file `lib/employee-utils.ts` (giờ trống)
- Grep tất cả imports → đổi sang `@/lib/utils`

### 1c. Xóa 3 `formatDate()` local copies

HIỆN TẠI:
- `employee-detail-page.tsx` (line 22) → local `formatDate()`
- `dashboard/upcoming-events.tsx` (line 26) → local `formatDate()`
- `contracts/print/contract-template.tsx` (line 20) → local `formatDate()`

LÀM: Xóa 3 functions, thêm `import { formatDate } from "@/lib/utils"` ở mỗi file.

---

## BƯỚC 2: Extract VARIANT_COLORS → shared (P1 — ~10 phút)

### Target: `lib/variant-colors.ts`

HIỆN TẠI: Copy-paste y hệt ở 2 files:
- `employee-table.tsx` (line 16-31)
- `employee-card.tsx` (line 16-31)

TẠO file mới:
```ts
// lib/variant-colors.ts
export const VARIANT_COLORS: Record<string, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error:   "bg-error/10 text-error",
  info:    "bg-info/10 text-info",
  neutral: "bg-surface text-text-muted",
  primary: "bg-primary/10 text-primary",
};

export const VARIANT_DOT: Record<string, string> = {
  success: "bg-success",
  warning: "bg-warning",
  error:   "bg-error",
  info:    "bg-info",
  neutral: "bg-text-muted",
  primary: "bg-primary",
};
```

SỬA:
- `employee-table.tsx` → xóa local VARIANT_COLORS + VARIANT_DOT, import từ `@/lib/variant-colors`
- `employee-card.tsx` → xóa local, import

---

## BƯỚC 3: Extract StatsBar → shared component (P1 — ~30 phút)

### Reference: stats_bar_audit_report.md (đã audit kĩ)

TẠO: `components/ui/stats-bar.tsx`

```tsx
import type { LucideIcon } from "lucide-react";

export interface StatItem {
  icon: LucideIcon;
  label: string;
  value: string;
  iconBg?: string;
  iconColor?: string;
  trend?: number;
}

export interface StatsBarProps {
  items: StatItem[];
  mobileItems?: StatItem[];
  className?: string;
}
```

Layout:
- Desktop: `hidden lg:flex items-center gap-5` + dividers `w-px h-6 bg-text-muted/20`
- Mobile: `lg:hidden flex gap-3 px-2 mb-4` + mini cards `min-w-[140px] bg-bg-card px-4 py-4 rounded-lg shadow-sm`

SỬA:
- `contracts/compact-stats.tsx` → giữ `formatCompact()` + `mobileItems` logic, dùng `<StatsBar>`
- `employees/employee-stats-bar.tsx` → giữ `topDept` logic, dùng `<StatsBar>`

---

## BƯỚC 4: Extract FAB → shared component (P2 — ~10 phút)

TẠO: `components/ui/fab.tsx`

```tsx
import { Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FABProps {
  icon?: LucideIcon;
  onClick: () => void;
  label?: string;
  className?: string;
}

export function FAB({ icon: Icon = Plus, onClick, label = "Tạo mới", className }: FABProps) {
  return (
    <div className="lg:hidden fixed bottom-24 right-4 z-40">
      <button
        onClick={onClick}
        aria-label={label}
        className={cn(
          "flex items-center justify-center size-12 rounded-full bg-primary text-text-inverse shadow-lg hover:opacity-90 active:scale-95 transition-all",
          className
        )}
      >
        <Icon className="w-5 h-5" />
      </button>
    </div>
  );
}
```

SỬA:
- `contracts-list-client.tsx` → xóa FAB inline, dùng `<FAB onClick={...} />`
- `employee-list-page.tsx` → xóa FAB inline, dùng `<FAB onClick={...} />`

---

## BƯỚC 5: Employees dùng EmptyState shared (P2 — ~10 phút)

HIỆN TẠI: `employee-list-page.tsx` (line 77-96) viết inline empty state
ĐÃ CÓ: `components/ui/ux-states.tsx` export `EmptyState` component

SỬA `employee-list-page.tsx`:
```tsx
import { EmptyState } from "@/components/ui/ux-states";

// Thay inline JSX bằng:
{employees.length === 0 && (
  hasFilters ? (
    <EmptyState
      icon={FilterX}
      title="Không tìm thấy"
      description="Không tìm thấy nhân viên phù hợp bộ lọc"
      actionLabel="Xóa bộ lọc"
      onAction={clearFilters}
    />
  ) : (
    <EmptyState
      icon={Users}
      title="Chưa có nhân viên"
      description="Chưa có nhân viên nào trong hệ thống"
      actionLabel="Thêm nhân viên đầu tiên"
      onAction={() => setShowForm(true)}
    />
  )
)}
```

---

## BƯỚC 6: Viết Pattern Doc (P3 — ~15 phút)

TẠO: `docs/list-page-pattern.md`

Nội dung: document cấu trúc chuẩn cho list page:
- Imports cần dùng (shared components)
- Layout structure (main-container → stats → filters → table/cards → pagination)
- Mobile patterns (FAB, cards thay table)
- Empty state handling
- Tham chiếu file mẫu: `contracts-list-client.tsx` + `employee-list-page.tsx`

---

## VERIFY SAU KHI XONG

1. `npm run dev` — 0 errors
2. Mở `/contracts` → stats bar + filter + table giữ nguyên visual
3. Mở `/employees` → stats bar + filter + table giữ nguyên visual
4. Grep kiểm tra:
   - `grep -r "getInitials" lib/` → chỉ 1 file `utils.ts`
   - `grep -r "VARIANT_COLORS" components/` → 0 local copies
   - `grep -r "formatPhone" lib/` → chỉ 1 file `utils.ts`
   - `grep -r "function formatDate" components/` → 0 local copies
5. Không có regression
