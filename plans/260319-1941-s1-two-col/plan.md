# Plan: S1 Two-Column Grid (Mobile Only)
Created: 2026-03-19T19:41
Status: 🟡 In Progress

## Overview
S1 "Thông tin hợp đồng" hiện tại có 2 grid containers với layout khác nhau.
Gộp thành 1 grid `grid-cols-2` đều trên mobile. Desktop giữ nguyên `sm:grid-cols-3`.

## Current Layout (Mobile 375px)

```
Row 1 (grid-cols-2):  | Loại GD    | Loại DV    |
                      | Ngày HĐ   |            |  ← 1 ô trống

Row 2 (grid-cols-1):  | Ngày chụp               |
                      | Ngày giao               |  ← tốn space
                      | Nhân viên               |
```

**6 hàng = lãng phí chiều cao**

## Target Layout (Mobile 375px)

```
Single grid (grid-cols-2):
| Loại GD       | Loại DV      |
| Ngày HĐ       | Ngày chụp    |
| Ngày giao SP   | Nhân viên    |
```

**3 hàng = tiết kiệm ~50% chiều cao**

## Phases

| Phase | Name | Status | Files |
|-------|------|--------|-------|
| 01 | Merge grids | ⬜ Pending | `ContractInfoSection.tsx` |
| 02 | Verify | ⬜ Pending | (browser check) |

## Scope Guard
- ❌ KHÔNG sửa desktop (giữ sm:grid-cols-3)
- ❌ KHÔNG sửa Description, Contract code sections
- ✅ CHỈ gộp Row 1 + Row 2 thành 1 grid

## Implementation Detail

### File: `ContractInfoSection.tsx` (dòng 45-96)

**Strategy:** Gộp 2 `<div className="grid ...">` thành 1 `<div>` duy nhất.

**Before:**
```tsx
{/* Row 1: grid-cols-2 sm:grid-cols-3 */}
<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
  <SimpleSelect ... />   // Loại GD
  <GroupedSelect ... />   // Loại DV
  <DatePicker ... />      // Ngày HĐ
</div>

{/* Row 2: grid-cols-1 sm:grid-cols-3 */}
<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
  <DatePicker ... />      // Ngày chụp
  {showDeliveryDate && <DatePicker ... />}  // Ngày giao (conditional)
  <Field ... />           // Nhân viên
</div>
```

**After:**
```tsx
{/* All fields: 2 cols mobile, 3 cols desktop */}
<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
  <SimpleSelect ... />   // Loại GD
  <GroupedSelect ... />   // Loại DV
  <DatePicker ... />      // Ngày HĐ
  <DatePicker ... />      // Ngày chụp
  {showDeliveryDate && <DatePicker ... />}  // Ngày giao
  <Field ... />           // Nhân viên
</div>
```

### Desktop Impact: ZERO
- `sm:grid-cols-3` = 3 cột trên ≥640px → y hệt trước (6 items ÷ 3 = 2 rows)
- Chỉ khác: không có 2 container riêng → nhưng visual output GIỐNG NHAU

### Mobile Impact: POSITIVE
- `grid-cols-2` = 2 cột → 6 items ÷ 2 = 3 rows (compact hơn)
- Khi `showDeliveryDate = false`: 5 items → 3 rows (1 ô trống, acceptable)

## Test Criteria
- [ ] Mobile 375px: 2 cột đều, compact
- [ ] Desktop: 3 cột, giữ nguyên
- [ ] showDeliveryDate=false: 5 items layout correct
- [ ] showDeliveryDate=true: 6 items layout correct
