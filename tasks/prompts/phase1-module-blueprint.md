# Phase 1: Tạo Module Blueprint (`tasks/module-blueprint.md`)

## CONTEXT
Dự án Next.js + Tailwind + Supabase. Đã triển 3 modules (Dashboard, Contracts, Employees).
Contracts = gold standard. Cần tạo "cuốn sổ tay" để triển modules mới không bug.
File này AI BẮT BUỘC đọc khi tạo module mới.

## TASK — Tạo `tasks/module-blueprint.md` với 8 sections:

---

### Section 1: File Scaffold
```markdown
## 1. File Scaffold — Cấu trúc bắt buộc cho mọi module

### Routes (app/(protected)/[module]/)
- `page.tsx` — Server Component. Fetch data → pass props vào Client Component
- `loading.tsx` — Skeleton loader (BẮT BUỘC)
- `[id]/page.tsx` — Detail page (Server fetch → Client render)

### Components (components/[module]/)
- `[module]-list-page.tsx` — Client wrapper: hooks, filters, SWR
- `[module]-table.tsx` — Data table (desktop)
- `[module]-card.tsx` — Card view (mobile) — nếu cần
- `[module]-detail-page.tsx` — Detail view
- `[module]-form-modal.tsx` — Create/Edit form (dùng openModal)
- `[module]-filters.tsx` — Filter dropdowns
- `[module]-stats-bar.tsx` — Stats summary (dùng shared StatsBar)

### Server Actions (app/actions/)
- `[module]-mutations.ts` — CRUD (create, update, delete)
- `[module]-queries.ts` — Data fetching (list, detail, search)

### Types (types/)
- `[module].ts` — Interface/Type definitions
- `[module]-constants.ts` — Display maps, enum labels, status colors

### Naming Convention:
- Files: kebab-case (`employee-mutations.ts`)
- Components: PascalCase (`EmployeeFormModal`)
- Types: PascalCase (`EmployeeDetail`)
- Constants: UPPER_SNAKE (`GENDER_OPTIONS`)
- DB enums: snake_case (`cho_xu_ly`, KHÔNG tiếng Việt)
```

---

### Section 2: Component Catalog — Shared UI có sẵn

```markdown
## 2. Component Catalog — DÙNG CÁI NÀY, KHÔNG TỰ VIẾT

| Component | Import | Khi nào dùng |
|-----------|--------|-------------|
| `<Badge variant={v} dot>` | `@/components/ui/badge` | Status labels, role tags |
| `<Breadcrumb items={[...]}>`| `@/components/ui/breadcrumb` | Page navigation |
| `<SelectForm options={[...]}>`| `@/components/ui/select/SelectForm` | Dropdown (thay native select) |
| `<UnifiedModal>` | `@/components/ui/unified-modal` | Modal (qua openModal()) |
| `<StatsBar items={[...]}>`| `@/components/ui/stats-bar` | Summary numbers trên list page |
| `<TabsFilter>` | `@/components/ui/tabs-filter` | Tab filters |
| `<SearchBar>` | `@/components/ui/search-bar` | Search input |
| `<CurrencyInput>` | `@/components/ui/currency-input` | Input tiền tệ (format tự động) |
| `<DatePicker>` | `@/components/ui/date-picker` | Chọn ngày |
| `<Drawer>` | `@/components/ui/drawer` | Mobile bottom sheet |
| `<ConfirmDialog>` | `@/components/ui/confirm-dialog` | Xác nhận delete/cancel |
| `<Skeleton>` | `@/components/ui/skeleton` | Loading placeholder |
| `<UxStates>` | `@/components/ui/ux-states` | Empty/Error states |
| `<Pagination>` | `@/components/ui/pagination` | Phân trang |
| `<FilterSelect>` | `@/components/ui/filter-select` | Filter pills/dropdown |
| `<FAB>` | `@/components/ui/fab` | Floating Action Button mobile |

❌ KHÔNG tự viết component khi đã có sẵn ở trên
✅ CHỈ tạo mới nếu thật sự chưa tồn tại trong components/ui/
```

---

### Section 3: CSS Token Catalog

```markdown
## 3. CSS Token Catalog — SSOT Classes

### Typography (app/styles/typography.css)
| Token | Dùng cho |
|-------|---------|
| `.text-display` | Số lớn (dashboard KPI) |
| `.text-h1` | Page title |
| `.text-h2` | Section title lớn |
| `.text-h3` | Card title |
| `.text-body` | Body text |
| `.text-body-sm` | Small body |
| `.text-caption` | Muted small text |
| `.text-label` | Form labels |
| `.text-overline` | UPPERCASE subheading |
| `.text-amount` | Currency display |
| `.section-heading` | Card/form sub-section titles |

### Forms (app/styles/forms.css)
| Token | Dùng cho |
|-------|---------|
| `.input-base` | Mọi input field |
| `.label-base` | Mọi form label |
| `.error-text` | Error message dưới input |
| `.form-grid-2col` | 2 cột responsive grid |

### Pages (app/styles/pages.css)
| Token | Dùng cho |
|-------|---------|
| `.card-base` | Card wrapper |
| `.detail-grid` | Detail page layout (main + sidebar) |
| `.detail-main` | Main content column |
| `.detail-sidebar` | Sidebar column |

### Components (app/styles/components.css)
| Token | Dùng cho |
|-------|---------|
| `.breadcrumb` | Breadcrumb nav |
| `.btn` | Button base |
| `.btn-primary` `.btn-outline` `.btn-ghost` `.btn-danger` | Button variants |

### Badges (app/styles/pages.css)
| Token | Dùng cho |
|-------|---------|
| `.badge` | Badge base |
| `.badge-success` `.badge-warning` `.badge-error` `.badge-info` | Status variants |

❌ KHÔNG viết `text-sm font-semibold text-text` → dùng `.section-heading`
❌ KHÔNG viết `bg-white rounded-2xl shadow-sm p-6` → dùng `.card-base`
```

---

### Section 4: Page Pattern (Server → Client)

```markdown
## 4. Page Pattern — Gold Standard từ Contracts

### Server Page (page.tsx)
```tsx
// app/(protected)/[module]/page.tsx
import { Suspense } from "react";
import { fetchModuleList } from "@/app/actions/[module]-queries";
import { ModuleListPage } from "@/components/[module]/[module]-list-page";
import { ModuleListSkeleton } from "@/components/[module]/[module]-skeleton";

export default async function ModulePage() {
  const data = await fetchModuleList();
  return (
    <Suspense fallback={<ModuleListSkeleton />}>
      <ModuleListPage initialData={data} />
    </Suspense>
  );
}
```

### Client Component ([module]-list-page.tsx)
```tsx
"use client";
import { useState } from "react";
import useSWR from "swr";

export function ModuleListPage({ initialData }: Props) {
  const [filters, setFilters] = useState(defaultFilters);
  const { data } = useSWR(key, fetcher, { fallbackData: initialData });
  // ... render
}
```

### Detail Page ([id]/page.tsx)
```tsx
import { fetchModuleDetail } from "@/app/actions/[module]-queries";
import { ModuleDetailPage } from "@/components/[module]/[module]-detail-page";
import { notFound } from "next/navigation";

export default async function ModuleDetailPageRoute({ params }: Props) {
  const data = await fetchModuleDetail(params.id);
  if (!data) notFound();
  return <ModuleDetailPage data={data} />;
}
```
```

---

### Section 5: Hook Pattern

```markdown
## 5. Hook Pattern — Form State Management

Gold standard: Contracts module `useContractForm`

```tsx
// hooks/use[Module]Form.ts
export function useModuleForm(initialData?: ModuleType) {
  const [formData, setFormData] = useState<ModuleFormData>(
    initialData ? mapToForm(initialData) : defaultValues
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof ModuleFormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: "" })); // Clear error on change
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.requiredField) newErrors.requiredField = "Bắt buộc";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    const result = await createOrUpdateModule(formData);
    setIsSubmitting(false);
    if (!result.success) toast.error(result.error);
    else toast.success("Thành công!");
  };

  return { formData, updateField, errors, isSubmitting, handleSubmit };
}
```
```

---

### Section 6: Error Handling + Toast

```markdown
## 6. Error Handling — Mọi mutation PHẢI có feedback

### Component gọi action:
```tsx
const result = await createModule(data);
if (result.success) {
  toast.success("Đã tạo thành công");
  closeModal();
} else {
  toast.error(result.error || "Có lỗi xảy ra");
}
```

### Rules:
- ❌ `await createModule(data);` — KHÔNG check result = UI im lặng khi fail
- ✅ Check `result.success` → toast feedback
- ✅ Mọi action PHẢI return `{ success: boolean; data?: T; error?: string }`
```

---

### Section 7: Cross-module Rules

```markdown
## 7. Cross-module — Module A cần data Module B

### READ:
Module A cần hiển thị data Module B → import query function từ Module B
```tsx
// Trong components/contracts/ cần employee list:
import { fetchEmployeeList } from "@/app/actions/employee-queries";
```

### WRITE:
Module A cần tạo/sửa data Module B → import mutation từ Module B
```tsx
import { createEmployee } from "@/app/actions/employee-mutations";
```

### Rules:
- ❌ KHÔNG copy query logic vào module khác
- ❌ KHÔNG import component từ module khác trực tiếp
- ✅ Shared UI → `components/ui/`
- ✅ Module-specific UI → `components/[module]/`
- ✅ FK JOIN → luôn LEFT JOIN (nullable) tránh missing data crash
- ✅ Cross-module write → revalidatePath CẢ 2 module paths
```

---

### Section 8: UX States Checklist

```markdown
## 8. UX States — Mỗi page PHẢI có 3 states

### Loading State (BẮT BUỘC):
- `loading.tsx` — Skeleton cho page-level loading
- `<Skeleton>` component cho section-level loading

### Empty State (BẮT BUỘC):
- Khi list rỗng → hiện message + CTA (nút tạo mới)
- Dùng `<UxStates type="empty" />` hoặc custom

### Error State (BẮT BUỘC):
- Khi fetch fail → hiện error message + retry button
- KHÔNG hiện trang trắng

### Responsive Verify (BẮT BUỘC):
- Desktop (1440px) — grid layout, bảng đầy đủ
- Mobile (375px) — 1 cột, card view thay bảng
- Test CẢ 2 viewports trước khi báo done
```

---

## LƯU Ý QUAN TRỌNG:
- File này là **reference document**, KHÔNG phải code
- Viết bằng Markdown, clear và scannable
- KHÔNG dùng code fence cho toàn bộ file — chỉ dùng code fence cho code examples
- Mục đích: AI đọc 1 file này = biết HẾT cần gì khi triển module mới
