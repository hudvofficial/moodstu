@[/code] Phase 5 Bước 6b — TabsFilter variant="pills" + Restore 1-row layout

## MỤC TIÊU
Thêm `variant="pills"` cho `TabsFilter` để contracts mobile quay lại style cũ:
- 1 hàng cuộn ngang (pills + dropdowns cùng hàng)
- Pills rời, KHÔNG container bao ngoài
- KHÔNG thanh scroll visible
- Vẫn shared code (TabsFilter component)

## ĐỌC TRƯỚC (BẮT BUỘC)
- tasks/pre-code-checklist.md
- tasks/lessons.md
- tasks/gates/before-edit.md

## GATE: VISUAL VERIFY (BẮT BUỘC)
1. Mở browser `/contracts` mobile 375px → screenshot layout hiện tại (2 hàng — cần rollback)
2. Viết plan ngắn → trình anh duyệt trước khi code

---

## 2 VARIANTS

| Thuộc tính | `variant="tabs"` (default) | `variant="pills"` (MỚI) |
|---|---|---|
| Container | `bg-elevated p-1 rounded-md shadow-xs` | **KHÔNG** — chỉ `inline-flex gap-2` |
| Scroll riêng | Có `overflow-x-auto scrollbar-hide` | **KHÔNG** — để parent scroll |
| Active style | `bg-surface shadow-sm` | `bg-surface shadow-sm border border-border` |
| Inactive style | `hover:bg-surface/50` | Chỉ text, không hover bg |
| Dùng bởi | Employees (cả 2), Contracts desktop | Contracts mobile |

---

## ⚠️ LƯU Ý QUAN TRỌNG: Tránh Nested Scroll

```
❌ SAI — 2 scroll lồng nhau:
Parent div (overflow-x-auto)
  └── TabsFilter (overflow-x-auto)  ← CONFLICT!
  └── SelectPill
  └── SelectPill

✅ ĐÚNG — 1 scroll duy nhất:
Parent div (overflow-x-auto scrollbar-hide)
  └── TabsFilter variant="pills" (inline-flex, KHÔNG overflow)
  └── SelectPill
  └── SelectPill
```

Khi `variant="pills"`:
- TabsFilter **BỎ** `max-lg:overflow-x-auto` và `max-lg:scrollbar-hide`
- Chỉ render `inline-flex items-center gap-2` → pills nằm trong parent scroll

---

## THAY ĐỔI CODE

### File 1: `components/ui/tabs-filter.tsx`

**Thêm prop `variant` + điều kiện render:**

```tsx
interface TabsFilterProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (value: string) => void;
  className?: string;
  variant?: "tabs" | "pills";  // MỚI — default "tabs"
}

export function TabsFilter({
  tabs, activeTab, onChange, className = "", variant = "tabs"
}: TabsFilterProps) {
  const isPills = variant === "pills";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2",
        // Container — chỉ tabs mới có background + scroll riêng
        !isPills && "bg-elevated p-1 rounded-md shadow-xs",
        !isPills && "max-lg:flex max-lg:overflow-x-auto max-lg:scrollbar-hide",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.value === activeTab;
        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0",
              isPills
                ? isActive
                  ? "bg-surface shadow-sm text-text-main border border-border"
                  : "text-text-secondary hover:text-text-main"
                : isActive
                  ? "bg-surface shadow-sm text-text-main"
                  : "text-text-secondary hover:text-text-main hover:bg-surface/50"
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn("ml-1", isActive ? "opacity-80" : "opacity-50")}>
                ({tab.count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

### File 2: `contracts-list-client.tsx`

**Thay mobile block (hiện tại 2 hàng flex-wrap) → 1 hàng cuộn ngang:**

XÓA:
```tsx
{/* ── MOBILE: Status tabs + Filter pills (shared TabsFilter) ── */}
<div className="lg:hidden flex items-center justify-between gap-3 flex-wrap">
  <TabsFilter
    tabs={STATUS_TABS}
    activeTab={filters.status}
    onChange={setStatus}
  />
  <div className="flex items-center gap-2">
    <SelectPill ... />
    <SelectPill ... />
  </div>
</div>
```

THAY BẰNG:
```tsx
{/* ── MOBILE: Status pills + Dropdowns (1 hàng cuộn ngang) ── */}
<div className="lg:hidden flex items-center gap-2 overflow-x-auto scrollbar-hide">
  <TabsFilter
    tabs={STATUS_TABS}
    activeTab={filters.status}
    onChange={setStatus}
    variant="pills"
  />
  <SelectPill
    value={filters.service}
    onChange={setService}
    defaultValue="all"
    placeholder="Dịch vụ"
    options={MOBILE_SERVICE_OPTIONS}
  />
  <SelectPill
    value={filters.sort}
    onChange={setSort}
    defaultValue="newest"
    placeholder="Sắp xếp"
    options={MOBILE_SORT_OPTIONS}
  />
</div>
```

---

## KHÔNG THAY ĐỔI

- `employee-filters.tsx` → giữ `variant="tabs"` (default)
- Desktop contracts TabsFilter → giữ `variant="tabs"` (default)
- `STATUS_TABS` constant → giữ nguyên

---

## VERIFY

```bash
# 1. TabsFilter hỗ trợ variant prop
grep -n "variant" components/ui/tabs-filter.tsx

# 2. Contracts mobile dùng variant="pills"
grep -n 'variant="pills"' components/contracts/contracts-list-client.tsx
# Kết quả: 1 match ✅

# 3. KHÔNG có nested overflow
# TabsFilter pills → inline-flex only (không overflow-x-auto)
# Parent div → overflow-x-auto scrollbar-hide (duy nhất)

# 4. Dev server 0 errors
npm run dev

# 5. Browser mobile 375px — /contracts:
#   - 1 HÀNG cuộn ngang ✅
#   - Pills rời, KHÔNG container nền ✅
#   - KHÔNG thanh scroll visible ✅
#   - Active pill viền nhẹ ✅
#   - Click filter → data đúng ✅
#   - Cuộn ngang → thấy thêm pills + dropdowns ✅

# 6. Browser mobile 375px — /employees:
#   - Segmented control (variant="tabs") KHÔNG bị ảnh hưởng ✅

# 7. Browser desktop — /contracts + /employees:
#   - Desktop TabsFilter KHÔNG bị ảnh hưởng ✅
```
