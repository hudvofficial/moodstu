# Phase 02: Filter Logic & Page Layout

Status: ⬜ Pending
Dependencies: Phase 01

## Objective

Port Contract filter pattern (StatusTabs + SelectPills) sang Productivity page, tối ưu cho workload filtering.

## Files to Modify

- `components/productivity/productivity-page-client.tsx`

## Implementation Steps

### 1. Thêm filter state

```ts
const [workloadFilter, setWorkloadFilter] = useState("all");
const [roleFilter, setRoleFilter] = useState("all");
```

### 2. Mobile filter row (dưới stats bar)

Port pattern từ Contract mobile (`lg:hidden`):

```
<div className="lg:hidden flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide">
  <TabsFilter tabs={WORKLOAD_FILTER_TABS} variant="pills" ... />
  <div separator />
  <SelectPill options={PRODUCTIVITY_SORT_OPTIONS} ... />
  <SelectPill options={PRODUCTIVITY_ROLE_OPTIONS} ... />
</div>
```

> Y hệt Contract line 164-187 nhưng:
>
> - `STATUS_TABS` → `WORKLOAD_FILTER_TABS`
> - Service SelectPill → Role SelectPill
> - Sort options → Productivity sort options

### 3. Desktop filter row

Port pattern từ Contract desktop (`hidden lg:flex`):

```
<div className="hidden lg:flex lg:items-center lg:justify-between gap-3">
  <TabsFilter tabs={workloadTabsWithCounts} ... />
  <div pills>
    <SelectPill sort />
    <SelectPill role />
  </div>
</div>
```

> Y hệt Contract line 190-206 nhưng:
>
> - `tabsWithCounts` → `workloadTabsWithCounts` (đếm nhân sự per level)
> - `ContractsDropdownFilters` → inline 2 SelectPills (đơn giản hơn)

### 4. Filter logic trong useMemo

Mở rộng `teamEmployees` useMemo:

```ts
const teamEmployees = useMemo(() => {
  let result = overview.employees;

  // Workload filter (mới)
  if (workloadFilter !== "all") {
    result = result.filter(e => e.workload_level === workloadFilter);
  }

  // Role filter (mới)
  if (roleFilter !== "all") {
    result = result.filter(e => e.role === roleFilter);
  }

  // Search (giữ nguyên)
  const query = searchQuery.trim().toLowerCase();
  if (query) { ... }

  return sortEmployees(result, sortKey, sortDirection);
}, [searchQuery, overview.employees, sortDirection, sortKey, workloadFilter, roleFilter]);
```

### 5. Workload tabs with counts

```ts
const workloadTabsWithCounts = WORKLOAD_FILTER_TABS.map((tab) => ({
  ...tab,
  count:
    tab.value === "all"
      ? overview.employees.length
      : overview.employees.filter((e) => e.workload_level === tab.value).length,
}));
```

> Tương đương Contract `tabsWithCounts` (line 91-99)

## SSOT Components dùng

- `TabsFilter` (variant `pills` cho mobile) — **ĐÃ CÓ**
- `SelectPill` — **ĐÃ CÓ**
- ⚠️ **KHÔNG tạo component mới**

## Test Criteria

- [ ] Mobile: filter row cuộn ngang mượt
- [ ] Desktop: tabs + pills hiển thị đúng 1 hàng
- [ ] Click workload tab → danh sách filter đúng
- [ ] SelectPill sort/role hoạt động
- [ ] Period tabs (Tuần/Tháng/Quý) vẫn hoạt động bình thường

---

Next Phase: phase-03-mobile-cards.md
