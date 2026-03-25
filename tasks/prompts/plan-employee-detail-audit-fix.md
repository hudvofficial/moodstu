/plan Hoàn thiện Token System & Shared Components cho Employee Module

## CONTEXT

Dự án Next.js + Tailwind + Radix UI. Design system tokens nằm trong `app/styles/`. Module Contracts (gold standard) đã dùng đúng tokens. Employee module còn nhiều inline classes → cần migrate.

**KIẾN TRÚC:**
- UI: Functional Component + Hooks (React)
- State: React useState + Server Actions (không thêm Zustand/Redux)
- CSS: SSOT tokens trong `app/styles/*.css`
- Shared Components: `components/ui/` (Badge, SelectForm, v.v.)

**TOKENS CÓ SẴN:**
- `card-base` — card wrapper (`app/styles/pages.css`)
- `.badge` + `.badge-{variant}` — badge tokens (`pages.css`)
- `<Badge variant={v} dot>` — FC component (`components/ui/badge.tsx`) 
- `<SelectForm>` — Radix select FC (`components/ui/select/SelectForm.tsx`)
- `input-base`, `label-base`, `.error-text` — form tokens (`forms.css`)
- `.form-grid-2col` — responsive 2 cols grid (`forms.css`)
- `text-overline`, `text-caption`, `text-h3` — typography tokens (`typography.css`)

---

## PHASE 1: [NEW] Breadcrumb Shared Component
**Effort:** 10 phút

### 1.1 — Tạo CSS tokens
File `app/styles/components.css`, thêm section mới:
```css
/* ── BREADCRUMB ── */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
}
.breadcrumb-link {
  transition: color 150ms ease-out;
}
.breadcrumb-link:hover {
  color: var(--color-primary);
}
.breadcrumb-separator {
  color: var(--color-text-muted);
  flex-shrink: 0;
}
.breadcrumb-current {
  color: var(--color-text-primary);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}
```

### 1.2 — Tạo FC component
File `components/ui/breadcrumb.tsx` [NEW]:
```tsx
"use client";

import { Fragment } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn("breadcrumb", className)}>
      {items.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && <ChevronRight size={14} className="breadcrumb-separator" />}
          {item.href ? (
            <Link href={item.href} className="breadcrumb-link">{item.label}</Link>
          ) : (
            <span className="breadcrumb-current">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
```

### Verify: Import `<Breadcrumb>` từ `@/components/ui/breadcrumb`, render thử → hiển thị đúng style

---

## PHASE 2: [NEW] Section Heading Token
**Effort:** 3 phút

### 2.1 — Tạo CSS token
File `app/styles/typography.css`, thêm sau `.text-overline`:
```css
/* Section heading — card/form sub-sections */
/* Dùng cho: "Thông tin cá nhân", "Ghi chú", section titles */
.section-heading {
  font-size: var(--font-size-body-sm);
  font-weight: 600;
  line-height: 1.4;
  color: var(--color-text-primary);
}
```

### Verify: Class `.section-heading` có font-size ~14px, font-weight 600, color text-primary

---

## PHASE 3: Employee Module Migration
**Effort:** 20 phút | **Files:** 4 files

### 3.1 — `employee-detail-page.tsx`

| Dòng | Hiện tại | Thay bằng |
|------|----------|-----------|
| L1 | `/* eslint-disable */` global | Xóa, thêm `eslint-disable-next-line` trước `<img>` |
| L83-89 | Inline breadcrumb (nav+Link+›) | `<Breadcrumb items={[{label:"Nhân viên",href:"/employees"},{label:employee.full_name}]} />` |
| L92 | `bg-bg-card rounded-xl shadow-xs` | `card-base` (giữ `flex items-start gap-4 py-4 px-5`) |
| L106 | `flex-wrap` + `gap-2` | Bỏ `flex-wrap`, đổi `gap-1.5` |
| L108-110 | Inline role badge classes | `<Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>` |
| L112-115 | Inline status badge + dot | `<Badge variant={statusInfo.variant} dot>{statusInfo.label}</Badge>` |
| L159 | `<div className="lg:hidden">` | `<div className="lg:hidden flex flex-col gap-3">` |

**Import thêm:**
```tsx
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
```

**Xóa import không cần nữa:** Có thể xóa `Link` nếu breadcrumb component handle rồi. Kiểm tra Link còn dùng ở đâu khác trong file trước khi xóa.

### 3.2 — `employee-info-card.tsx`

| Dòng | Hiện tại | Thay bằng |
|------|----------|-----------|
| L21 | embedded: `text-xs font-semibold text-text-muted uppercase tracking-wide mb-3` | `text-overline mb-3` |
| L21 | normal: `text-sm font-semibold text-text mb-3` | `section-heading mb-3` |
| L27 | `text-xs text-text-muted` | `text-caption` |
| L44 | `bg-bg-card rounded-xl shadow-xs p-4` | `card-base p-4` |

### 3.3 — `employee-notes.tsx`

| Dòng | Hiện tại | Thay bằng |
|------|----------|-----------|
| L60 | `bg-bg-card rounded-xl shadow-xs p-4` | `card-base p-4` |
| L64 | `text-sm font-semibold text-text` | `section-heading` |
| L68 | `text-xs text-text-muted` | `text-caption` |

### 3.4 — `employee-form-modal.tsx`

**Import thêm:**
```tsx
import { SelectForm } from "@/components/ui/select/SelectForm";
```

| Dòng | Hiện tại | Thay bằng |
|------|----------|-----------|
| L143,170 | `text-sm font-semibold text-text mb-3` | `section-heading mb-3` |
| L144,171,200 | `grid grid-cols-1 lg:grid-cols-2 gap-3` | `form-grid-2col` |
| L151-153 | native `<select>` Giới tính | `<SelectForm label="Giới tính" value={form.gender} onChange={(v) => setField("gender", v)} options={GENDER_OPTIONS} />` |
| L174-177 | native `<select>` Phòng ban | `<SelectForm label="Phòng ban" value={form.department} onChange={(v) => setField("department", v)} options={DEPARTMENT_OPTIONS} placeholder="Chọn phòng ban" error={errors.department} />` |
| L185-187 | native `<select>` Vai trò | `<SelectForm label="Vai trò" value={form.role} onChange={(v) => setField("role", v as EmployeeRole)} options={ROLE_OPTIONS} />` |
| L158,163,204 | `<p className="text-xs text-error mt-1">` | `<p className="error-text">` |
| L72-76 | toast.error trùng validation | Xóa 2 dòng toast |

> **Lưu ý `form-grid-2col`:** Token breakpoint tại `sm (640px)`, inline dùng `lg (1024px)`. Kiểm tra visual — nếu sm không phù hợp form modal width, GIỮ inline `grid grid-cols-1 lg:grid-cols-2 gap-3`.

### Verify Phase 3:
- Mobile 375px: gap giữa cards, badges 1 hàng, badge có màu đúng
- Desktop: breadcrumb ChevronRight, hover → text-primary
- Form modal: 3 SelectForm Radix hoạt động, keyboard nav OK
- `npm run build` pass

---

## PHASE 4 (Optional): Contract Module Breadcrumb Migration
**Effort:** 5 phút

Migrate `top-action-bar.tsx` L56-65 và `form/index.tsx` L125-135 sang `<Breadcrumb>` component. Không bắt buộc cùng đợt.

---

## QUY TẮC CHUNG
1. Thực hiện ĐÚNG THỨ TỰ Phase 1 → 2 → 3 → (4 optional)
2. Mỗi phase xong → verify trước khi qua phase tiếp
3. KHÔNG thay đổi business logic
4. Chỉ tạo 2 thứ mới: `breadcrumb.tsx` FC + `.section-heading` CSS
5. Tất cả còn lại dùng token/component CÓ SẴN
6. LUÔN đọc `tasks/pre-code-checklist.md` và `tasks/lessons.md` trước khi edit code

---

## TOKEN COVERAGE CHECKLIST (100%)

| # | Component | Token trước → sau | Phase |
|---|-----------|-------------------|-------|
| 1 | Breadcrumb | inline nav → `<Breadcrumb>` FC | 1 |
| 2 | Section headings (5 chỗ) | inline → `.section-heading` | 2 |
| 3 | Card wrappers (3 chỗ) | inline → `card-base` | 3 |
| 4 | Role badge | inline → `<Badge variant>` | 3 |
| 5 | Status badge | inline → `<Badge variant dot>` | 3 |
| 6 | Selects (3 chỗ) | native → `<SelectForm>` | 3 |
| 7 | Error text (3 chỗ) | inline → `.error-text` | 3 |
| 8 | Form grid (3 chỗ) | inline → `.form-grid-2col` | 3 |
| 9 | Embedded heading | inline → `text-overline` | 3 |
| 10 | Label text (2 chỗ) | inline → `text-caption` | 3 |
| ✅ | Buttons | `btn btn-primary/secondary` | Đã chuẩn |
| ✅ | Labels | `label-base` | Đã chuẩn |
| ✅ | Inputs | `input-base` | Đã chuẩn |
| ✅ | Layout | `detail-grid/main/sidebar` | Đã chuẩn |
| ✅ | Main title | `text-h3` | Đã chuẩn |
