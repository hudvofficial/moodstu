# List Filter Pattern (nuqs)

> **Ngày tạo:** 2026-03-19  
> **Áp dụng cho:** Tất cả list pages trong Mood Studio V2

---

## Vấn đề giải quyết

`router.push()` trong Next.js App Router gây server re-render → tab click lag 200-800ms.

**Giải pháp:** `nuqs` — URL search params state manager. Tab switch INSTANT.

---

## Architecture

```
User click tab "Hoàn thành"
        ↓
useContractFilters.setStatus("hoan_thanh")
        ↓
useListFilters → nuqs.setQueryStates({ status: "hoan_thanh" })
        ↓ (instant, synchronous)
URL: /contracts?status=hoan_thanh  ← visual feedback ngay
        ↓ (async, background)
SWR key thay đổi → fetch data mới → list update
```

---

## Khi dùng cho module mới

### Bước 1: Tạo filter hook riêng cho module

```ts
// hooks/useCRMFilters.ts
import { useListFilters } from "./useListFilters";

const CRM_FILTER_DEFAULTS = {
  status:   "all",
  stage:    "all",
  assignee: "all",
  sort:     "newest",
  page:     "1",
  q:        "",
} as const;

export function useCRMFilters() {
  const { params, setParam, setParams } = useListFilters(CRM_FILTER_DEFAULTS);

  return {
    filters: {
      status:   params.status,
      stage:    params.stage,
      assignee: params.assignee,
      sort:     params.sort,
      page:     Number(params.page) || 1,
      q:        params.q,
    },
    isPending: false,
    setStatus:   (v: string) => setParams({ status: v, page: "1" }),
    setStage:    (v: string) => setParams({ stage: v, page: "1" }),
    setAssignee: (v: string) => setParam("assignee", v),
    setSort:     (v: string) => setParam("sort", v),
    setPage:     (n: number) => setParam("page", String(n)),
  };
}
```

### Bước 2: Dùng trong list component

```tsx
// components/crm/CRMListClient.tsx
const { filters, setStatus, setSort } = useCRMFilters();
const { leads } = useCRMLeads(filters); // SWR hook nhận filters

// Tab filter:
<TabsFilter
  activeTab={filters.status}
  onChange={setStatus}  // ← instant tab switch
  tabs={STATUS_TABS}
/>

// Pill filter:
<SelectPill
  value={filters.stage}
  onChange={setStage}
  options={STAGE_OPTIONS}
/>
```

---

## Quy tắc

| Rule | Detail |
|------|--------|
| **Luôn reset page khi đổi filter** | `setParams({ status: v, page: "1" })` |
| **Dùng `setParams` cho batch update** | Tránh 2 URL push riêng biệt |
| **Giữ defaults là stable constant** | Không truyền inline object vào `useListFilters` |
| **Giá trị "all" = inactive** | Tab "all" = không có filter, xóa khỏi URL |

---

## Files tham khảo

- `hooks/useListFilters.ts` — generic hook (nuqs wrapper)
- `hooks/useContractFilters.ts` — contracts implementation (pattern mẫu)
- `components/ui/select/SelectPill.tsx` — filter pill component
- `app/layout.tsx` — NuqsAdapter đã mount ở đây

---

## Modules cần áp dụng (tương lai)

| Module | Filter hook cần tạo |
|--------|---------------------|
| `/crm` | `useCRMFilters` |
| `/finance` | `useFinanceFilters` |
| `/inventory` | `useInventoryFilters` |
| `/schedules` | `useScheduleFilters` |
| `/reports` | `useReportFilters` |
