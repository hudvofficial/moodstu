# Phase 02: V1 Dropdown Filters
Status: ⬜ Pending  
Dependencies: Phase 01

## Objective
Port 3 dropdown filters từ V1 vào cùng dòng với tabs:
1. **"Tháng này ▾"** — Time range filter (Tất cả, Tháng này, Tháng trước, Năm nay)
2. **"Dịch vụ ▾"** — Service type filter (Studio, Ngày Cưới, Combo, Baby, etc.)
3. **"≡ Lọc nâng cao"** — Toggle expand panel (DatePicker from/to + Apply)

## Layout Sau Khi Xong

```
┌─ Filter Row ──────────────────────────────────────────────┐
│ [Tất cả 12] [Đang 4] [Chờ 1] [HT 6] [Hủy]              │
│                      [Tháng này ▾] [Dịch vụ ▾] [≡ Nâng cao] │
└───────────────────────────────────────────────────────────┘
```

## Implementation Steps

### 1. Update `useContractFilters` hook
- [ ] Thêm params: `time`, `service` 
- [ ] Thêm setters: `setTime`, `setService`
- [ ] Default: `time = "this_month"`, `service = "all"`

### 2. Tạo `ContractsDropdownFilters` component
- [ ] File: `components/contracts/contracts-dropdown-filters.tsx` (~80 lines)
- [ ] 3 elements: Time select + Service select + Advanced button
- [ ] Styling: rounded-lg, border, earth-tone palette
- [ ] Dùng Lucide icons: `ChevronDown` cho dropdowns, `SlidersHorizontal` cho advanced
- [ ] **KHÔNG dùng** Material Symbols (V1 lesson #13)

### 3. Tạo advanced filter panel
- [ ] Conditionally rendered below filter row
- [ ] 2 DatePickers (Từ ngày + Đến ngày) + Apply button
- [ ] Grid 4 cols desktop, 1 col mobile
- [ ] Port logic từ V1 `ContractsFilters.tsx` lines 242-272

### 4. Update `contracts-list-client.tsx`
- [ ] Import `ContractsDropdownFilters`
- [ ] Place cùng row với `TabsFilter` (flex justify-between)
- [ ] Bỏ `SearchBar` trong page content (header đã có search global)
- [ ] Wire filter params vào filteredContracts logic

### 5. Update filter logic
- [ ] `time` filter: compute date range → filter `contract_date`
- [ ] `service` filter: filter bằng `service_type` field trong contracts
- [ ] Cả 2 filters kết hợp cộng dồn (AND logic)

## Files to Create/Modify
- `hooks/useContractFilters.ts` — **MODIFY** (add time, service params)
- `components/contracts/contracts-dropdown-filters.tsx` — **CREATE**
- `components/contracts/contracts-list-client.tsx` — **MODIFY** (wire filters, remove SearchBar)

## V1 Reference
- `0Moodstudio/webapp/components/contracts/ContractsFilters.tsx`
  - Time options: lines 177-180
  - Service options: lines 203-215
  - Advanced panel: lines 242-272

## Test Criteria
- [ ] 3 dropdown filters hiện bên phải, cùng dòng với tabs
- [ ] Time filter thay đổi → contracts list cập nhật
- [ ] Service filter thay đổi → contracts list cập nhật
- [ ] "Lọc nâng cao" toggle → panel DatePicker xuất hiện
- [ ] Apply button hoạt động
- [ ] Mobile: dropdowns responsive (scroll hoặc wrap)
- [ ] Build thành công, không TypeScript errors

---
Previous Phase: phase-01-compact-stats.md
