@[/code] Phase 5 Bước 6c — Filter Pills Visual Upgrade + Separator

## MỤC TIÊU
Nâng cấp visual cho mobile filter row trên cả Contracts và Employees:
1. **Active pill màu đậm**: `bg-primary text-white` thay vì `bg-surface border`
2. **Inactive pill có background**: `bg-elevated border` (nền kem nhẹ — giống SelectPill)
3. **Dấu `|` separator** giữa status pills và filter dropdowns

## ĐỌC TRƯỚC (BẮT BUỘC)
- tasks/pre-code-checklist.md
- tasks/lessons.md
- tasks/gates/before-edit.md

## GATE: VISUAL VERIFY
1. Mở browser `/contracts` mobile 375px → screenshot pills hiện tại
2. Mở browser `/employees` mobile 375px → screenshot pills hiện tại
3. Ghi lại visual target → trình anh duyệt

---

## PHÂN TÍCH HIỆN TẠI

### TabsFilter variant="pills" (contracts mobile):
```
Active:   bg-surface shadow-sm border border-border     → quá nhẹ
Inactive: text-text-secondary (chỉ text, không nền)     → không có affordance
```

### SelectPill (CSS class `.select-trigger-pill` — select.css line 115):
```
Default:  bg-elevated, border border-border, text-secondary  → CÓ nền kem ✅
Active:   color-mix primary 10%, color-primary               → nhẹ nhàng
Hover:    bg-hover                                           → hover rõ
```

### Mục tiêu — Đồng bộ TabsFilter pills với SelectPill:
```
TabsFilter pills active:   bg-primary text-white           → nổi bật rõ ràng
TabsFilter pills inactive: bg-elevated border-border        → giống SelectPill default
Separator:                 border-l border-border mx-1      → ngăn cách nhẹ
```

---

## THAY ĐỔI CODE

### File 1: `components/ui/tabs-filter.tsx`

**Chỉ thay style cho variant="pills":**

TRƯỚC (line 48-51):
```tsx
isPills
  ? isActive
    ? "bg-surface shadow-sm text-text-main border border-border"
    : "text-text-secondary hover:text-text-main"
```

SAU:
```tsx
isPills
  ? isActive
    ? "bg-primary text-white shadow-sm"
    : "bg-elevated text-text-secondary border border-border hover:bg-hover hover:text-text-main"
```

**Giải thích:**
- Active: nền nâu đậm `bg-primary` (#8B5E3C) + chữ trắng → nổi bật Apple-style
- Inactive: nền kem `bg-elevated` + viền `border-border` → giống SelectPill, có affordance
- Hover inactive: `bg-hover` → feedback khi chạm

### File 2: `contracts-list-client.tsx`

**Thêm separator `|` giữa TabsFilter và SelectPill:**

TRƯỚC (line 160-182):
```tsx
<div className="lg:hidden flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide">
  <TabsFilter ... variant="pills" />
  <SelectPill ... placeholder="Dịch vụ" />
  <SelectPill ... placeholder="Sắp xếp" />
</div>
```

SAU:
```tsx
<div className="lg:hidden flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide">
  <TabsFilter ... variant="pills" />
  {/* Separator */}
  <div className="h-5 border-l border-border shrink-0" />
  <SelectPill ... placeholder="Dịch vụ" />
  <SelectPill ... placeholder="Sắp xếp" />
</div>
```

### File 3: `employees/employee-filters.tsx` (NẾU employees mobile cũng dùng pills)

Kiểm tra employees mobile filter row trước. Nếu employees cũng có SelectPill trên mobile, thêm separator tương tự.

⚠️ **LƯU Ý**: Employees mobile hiện dùng `variant="tabs"` (segmented control). CÂN NHẮC:
- Option A: Giữ employees = tabs, chỉ contracts = pills (khác layout giữa 2 module)
- Option B: Chuyển employees mobile cũng sang pills + separator (đồng bộ hoàn toàn)

→ **HỎI ANH** trước khi quyết: Employees mobile giữ segmented hay đổi sang pills?

---

## KHÔNG THAY ĐỔI

- `variant="tabs"` style → giữ nguyên (desktop segmented control)
- `SelectPill` CSS (select.css) → giữ nguyên
- Desktop layout → giữ nguyên

---

## VERIFY

```bash
# 1. Check style pills active
grep -n "bg-primary text-white" components/ui/tabs-filter.tsx
# Kết quả: 1 match trong isPills active ✅

# 2. Check separator
grep -n "border-l border-border" components/contracts/contracts-list-client.tsx
# Kết quả: 1 match ✅

# 3. Dev server 0 errors

# 4. Browser mobile 375px — /contracts:
#   - Active pill: nền nâu đậm + chữ trắng ✅
#   - Inactive pills: nền kem nhẹ + viền ✅
#   - Separator `|` giữa status vs filter ✅
#   - Click filter → data đúng ✅
#   - SelectPill visual đồng bộ với inactive pills ✅

# 5. Browser mobile 375px — /employees:
#   - KHÔNG bị ảnh hưởng (nếu giữ variant="tabs") ✅

# 6. Desktop — KHÔNG bị ảnh hưởng ✅
```
