# 📘 Module Blueprint — Sổ tay triển khai module mới

> **BẮT BUỘC đọc file này TRƯỚC KHI tạo module mới.**
> Contracts = Gold Standard. Mọi module sau phải follow patterns dưới đây.

---

## 1. File Scaffold — Cấu trúc bắt buộc

```
[module]/
├── app/(protected)/[module]/
│   ├── page.tsx              ← Server Component (fetch → pass props)
│   ├── loading.tsx           ← Skeleton loader (BẮT BUỘC)
│   └── [id]/
│       └── page.tsx          ← Detail page (Server fetch → Client render)
│
├── components/[module]/
│   ├── [module]-list-page.tsx      ← Client wrapper (hooks + filters + SWR)
│   ├── [module]-table.tsx          ← Data table (desktop)
│   ├── [module]-card.tsx           ← Card view (mobile) — nếu cần
│   ├── [module]-detail-page.tsx    ← Detail view
│   ├── [module]-form-modal.tsx     ← Create/Edit form (dùng openModal)
│   ├── [module]-filters.tsx        ← Filter dropdowns
│   └── [module]-stats-bar.tsx      ← Stats summary (dùng shared StatsBar)
│
├── app/actions/
│   ├── [module]-mutations.ts       ← CRUD (create, update, delete)
│   └── [module]-queries.ts         ← Data fetching (list, detail, search)
│
└── types/
    ├── [module].ts                 ← Interface/Type definitions
    └── [module]-constants.ts       ← Display maps, enum labels, status colors
```

### Naming Convention

| Loại | Convention | Ví dụ |
|------|-----------|-------|
| Files | kebab-case | `employee-mutations.ts` |
| Components | PascalCase | `EmployeeFormModal` |
| Types/Interfaces | PascalCase | `EmployeeDetail` |
| Constants | UPPER_SNAKE | `GENDER_OPTIONS` |
| DB enums | snake_case | `cho_xu_ly` (KHÔNG tiếng Việt) |

---

## 2. Component Catalog — DÙNG CÁI NÀY, KHÔNG TỰ VIẾT

| Component | Import | Khi nào dùng |
|-----------|--------|-------------|
| `<Badge variant={v} dot>` | `@/components/ui/badge` | Status labels, role tags |
| `<Breadcrumb items={[...]}>` | `@/components/ui/breadcrumb` | Page navigation |
| `<SelectForm options={[...]}>` | `@/components/ui/select/SelectForm` | Dropdown (thay native `<select>`) |
| `<UnifiedModal>` | `@/components/ui/unified-modal` | Modal (qua `openModal()`) |
| `<StatsBar items={[...]}>` | `@/components/ui/stats-bar` | Summary numbers trên list page |
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

**Rules:**
- ❌ KHÔNG tự viết component khi đã có sẵn ở trên
- ✅ CHỈ tạo mới nếu thật sự chưa tồn tại trong `components/ui/`

---

## 3. CSS Token Catalog — SSOT Classes

### Typography (`app/styles/typography.css`)

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

### Forms (`app/styles/forms.css`)

| Token | Dùng cho |
|-------|---------|
| `.input-base` | Mọi input field |
| `.label-base` | Mọi form label |
| `.error-text` | Error message dưới input |
| `.form-grid-2col` | 2 cột responsive grid |

### Pages (`app/styles/pages.css`)

| Token | Dùng cho |
|-------|---------|
| `.card-base` | Card wrapper |
| `.detail-grid` | Detail page layout (main + sidebar) |
| `.detail-main` | Main content column |
| `.detail-sidebar` | Sidebar column |
| `.badge` | Badge base |
| `.badge-success` `.badge-warning` `.badge-error` `.badge-info` | Status variants |

### Components (`app/styles/components.css`)

| Token | Dùng cho |
|-------|---------|
| `.breadcrumb` | Breadcrumb nav |
| `.btn` | Button base |
| `.btn-primary` `.btn-outline` `.btn-ghost` `.btn-danger` | Button variants |

### Select (`app/styles/select.css`)

| Token | Dùng cho |
|-------|---------|
| `.select-content` | Dropdown panel |
| `.select-item` | Dropdown option |
| `.select-trigger-pill` | Pill-style select trigger |

**Rules:**
- ❌ KHÔNG viết `text-sm font-semibold text-text` → dùng `.section-heading`
- ❌ KHÔNG viết `bg-white rounded-2xl shadow-sm p-6` → dùng `.card-base`
- ❌ KHÔNG viết `text-xs text-text-secondary` → dùng `.text-caption`

---

## 4. Page Pattern — Gold Standard từ Contracts

### Server Page (`page.tsx`)

```tsx
// app/(protected)/[module]/page.tsx
import { fetchModuleList } from "@/app/actions/[module]-queries";
import { ModuleListPage } from "@/components/[module]/[module]-list-page";

export default async function ModulePage() {
  const data = await fetchModuleList();
  return <ModuleListPage initialData={data} />;
}
```

### Client Component (`[module]-list-page.tsx`)

```tsx
"use client";
import { useState } from "react";
import useSWR from "swr";

export function ModuleListPage({ initialData }: Props) {
  const [filters, setFilters] = useState(defaultFilters);
  const { data } = useSWR(key, fetcher, { fallbackData: initialData });
  // ... filters, table, drawer
}
```

### Detail Page (`[id]/page.tsx`)

```tsx
import { fetchModuleDetail } from "@/app/actions/[module]-queries";
import { ModuleDetailPage } from "@/components/[module]/[module]-detail-page";
import { notFound } from "next/navigation";

export default async function DetailPageRoute({ params }: Props) {
  const { id } = await params;
  const data = await fetchModuleDetail(id);
  if (!data) notFound();
  return <ModuleDetailPage data={data} />;
}
```

### Loading Skeleton (`loading.tsx`)

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function ModuleLoading() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}
```

---

## 5. Hook Pattern — Form State Management

Gold standard: `useContractForm`

```tsx
// hooks/use[Module]Form.ts
export function useModuleForm(initialData?: ModuleType) {
  const [formData, setFormData] = useState<FormData>(
    initialData ? mapToForm(initialData) : defaultValues
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof FormData, value: unknown) => {
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

---

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

- ❌ `await createModule(data);` → KHÔNG check result = UI im lặng khi fail
- ✅ Check `result.success` → toast feedback
- ✅ Mọi action PHẢI return `{ success: boolean; data?: T; error?: string }`
- ✅ Mọi button submit PHẢI có loading state (`isSubmitting`)

---

## 7. Cross-module — Module A cần data Module B

### READ data module khác:

```tsx
// components/contracts/ cần employee list:
import { fetchEmployeeList } from "@/app/actions/employee-queries";
```

### WRITE data module khác:

```tsx
// components/contracts/ cần tạo customer:
import { createCustomer } from "@/app/actions/customer-actions";
```

### Rules:

- ❌ KHÔNG copy query logic vào module khác → import từ source module
- ❌ KHÔNG import component từ module khác trực tiếp
- ✅ Shared UI → `components/ui/`
- ✅ Module-specific UI → `components/[module]/`
- ✅ FK JOIN → luôn LEFT JOIN (nullable) tránh missing data crash page
- ✅ Cross-module WRITE → `revalidatePath` CẢ 2 module paths:
  ```tsx
  revalidatePath("/contracts");
  revalidatePath("/employees");
  ```

---

## 8. UX States — Mỗi page PHẢI có 3 states

### ① Loading State (BẮT BUỘC)

- `loading.tsx` ở route level → Skeleton cho page-level loading
- `<Skeleton>` component cho section-level loading
- Submit button có `isSubmitting` state → disable + spinner

### ② Empty State (BẮT BUỘC)

- Khi list rỗng → hiện message rõ ràng + CTA (nút tạo mới)
- Dùng `<UxStates type="empty" />` hoặc custom
- ❌ KHÔNG để bảng trống không có text giải thích

### ③ Error State (BẮT BUỘC)

- Khi fetch fail → hiện error message + retry button
- ❌ KHÔNG hiện trang trắng hoặc crash
- Form validation errors → hiện dưới input bằng `.error-text`

### ④ Responsive Verify (BẮT BUỘC)

- **Desktop (1440px)** — grid layout, bảng đầy đủ columns
- **Mobile (375px)** — 1 cột, card view thay bảng, FAB thay header button
- **Test CẢ 2 viewports** trước khi báo done
- Lesson #63: Dùng `max-lg:` override, KHÔNG đổi default classes
