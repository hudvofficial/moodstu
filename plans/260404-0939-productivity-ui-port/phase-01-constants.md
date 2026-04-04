# Phase 01: Constants & Types

Status: ⬜ Pending
Dependencies: None

## Objective

Thêm constants cho workload filter tabs và sort/role options — chuẩn bị data layer trước khi touch UI.

## Files to Modify

- `types/productivity-constants.ts`

## Implementation Steps

### 1. Workload Filter Tabs

```ts
export const WORKLOAD_FILTER_TABS = [
  { label: "Tất cả", value: "all" },
  { label: "Quá tải", value: "overloaded" },
  { label: "Cao", value: "high" },
  { label: "Trung bình", value: "medium" },
  { label: "Thấp", value: "low" },
];
```

> Tương đương Contract `STATUS_TABS` nhưng domain = workload levels

### 2. Sort Options (cho SelectPill)

```ts
export const PRODUCTIVITY_SORT_OPTIONS = [
  { value: "default", label: "Sắp xếp" },
  { value: "overdue_desc", label: "Quá hạn nhiều" },
  { value: "hours_desc", label: "On-set nhiều" },
  { value: "cost_desc", label: "Chi phí cao" },
];
```

> Tương đương Contract `MOBILE_SORT_OPTIONS` nhưng sort theo productivity metrics

### 3. Role Filter Options (cho SelectPill)

```ts
export const PRODUCTIVITY_ROLE_OPTIONS = [
  { value: "all", label: "Vai trò" },
  { value: "photographer", label: "Photographer" },
  { value: "videographer", label: "Videographer" },
  { value: "editor", label: "Editor" },
  { value: "assistant", label: "Assistant" },
  { value: "makeup", label: "Makeup" },
];
```

> Tương đương Contract `MOBILE_SERVICE_OPTIONS` nhưng domain = employee roles

## Test Criteria

- [ ] TypeScript compile OK (no errors)
- [ ] Existing imports không bị break

---

Next Phase: phase-02-filter-layout.md
