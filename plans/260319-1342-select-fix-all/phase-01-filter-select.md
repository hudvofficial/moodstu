# Phase 01: Migrate FilterSelect → SelectPill (Desktop filter bar)
Status: ⬜ Pending
Dependencies: SelectPill đã có ✅, nuqs đã có ✅

## Objective
Đồng bộ desktop filter bar với mobile.
Thay `FilterSelect` (native HTML select) bằng `SelectPill` (Radix).

## Context
Hiện tại:
- Mobile: SelectPill (Radix) ✅
- Desktop: FilterSelect (native <select>) ❌ → phải sửa

Screenshot anh gửi chính là desktop view dùng FilterSelect.

## Files to Modify

### 1. `components/contracts/contracts-dropdown-filters.tsx`
- Xóa import FilterSelect
- Import SelectPill từ `@/components/ui/select`
- Thay 3 FilterSelect → 3 SelectPill

Mapping:
```
<FilterSelect options={TIME_OPTIONS}    value={time}    onChange={onTimeChange}    />
→ <SelectPill  options={TIME_OPTIONS}    value={time}    onChange={onTimeChange}    />

<FilterSelect options={SERVICE_OPTIONS} value={service} onChange={onServiceChange} />
→ <SelectPill  options={SERVICE_OPTIONS} value={service} onChange={onServiceChange} />

<FilterSelect options={SORT_OPTIONS}    value={sort}    onChange={onSortChange}    />
→ <SelectPill  options={SORT_OPTIONS}    value={sort}    onChange={onSortChange}    />
```

### 2. `components/ui/filter-select.tsx`
- Sau khi không còn ai dùng → có thể xóa hoặc deprecate

## Test Criteria
- [ ] Desktop /contracts: 3 dropdowns mở ra Radix dropdown (không phải native browser select)
- [ ] Click "Tháng trước" → filter áp dụng instant (nuqs)
- [ ] Desktop + Mobile đều dùng cùng 1 component (SelectPill)
- [ ] Active state pill hoạt động đúng

---
Next Phase: phase-02-status-select.md
