@[/code] Phase 5 Bước 3 — Extract StatsBar → shared component (P1)

## MỤC TIÊU
Tạo `components/ui/stats-bar.tsx` (shared) thay thế 2 layout trùng lặp giữa `compact-stats.tsx` và `employee-stats-bar.tsx`.

## ĐỌC TRƯỚC (BẮT BUỘC)
- tasks/pre-code-checklist.md
- tasks/lessons.md
- tasks/gates/before-edit.md
- Audit report: stats_bar_audit_report.md

## GATE: VISUAL VERIFY (BẮT BUỘC)
1. Mở browser `/contracts` → screenshot stats bar desktop + mobile
2. Mở browser `/employees` → screenshot stats bar desktop + mobile
3. So sánh 2 screenshots → ghi ra giống/khác
4. Viết plan ngắn → trình anh duyệt trước khi code

---

## CONTEXT: Khác biệt giữa 2 file hiện tại

| Aspect | compact-stats.tsx (contracts) | employee-stats-bar.tsx |
|--------|-------------------------------|----------------------|
| Items desktop | 4 (total, active, revenue, completed) | 3 (total, active, topDept) |
| Items mobile | 5 (thêm "nợ") | 3 (giống desktop) |
| Mobile card width | `min-w-[160px] px-5 py-5` | `min-w-[120px] px-4 py-4` |
| Trend badge | Có (±X%) | Không |
| `formatCompact()` | Có (currency short format) | Không |
| Desktop layout | flex gap-5, dividers, icon 9x9 | **Y HỆT** |

**Kết luận:** Desktop layout 100% giống nhau. Mobile layout ~95% giống (chỉ khác width/padding). Trend badge là optional feature.

---

## BƯỚC 3a: Tạo `components/ui/stats-bar.tsx`

### Interface

```tsx
import type { LucideIcon } from "lucide-react";

export interface StatItem {
  icon: LucideIcon;
  label: string;
  value: string;
  iconBg?: string;   // default: "bg-primary/10"
  iconColor?: string; // default: "text-primary"
  trend?: number;     // optional: ±X% trend badge
}

export interface StatsBarProps {
  items: StatItem[];
  mobileItems?: StatItem[];  // nếu mobile cần items khác desktop
  mobileCardClass?: string;  // default: "min-w-[140px] px-4 py-4"
  className?: string;
}
```

### Layout (copy exact từ compact-stats — Gold Standard)

**Desktop:**
```tsx
<div className="hidden lg:flex items-center gap-5 overflow-x-auto no-scrollbar">
  {items.map((item, i) => (
    <div key={item.label} className="flex items-center gap-3 shrink-0">
      {i > 0 && <div className="w-px h-6 bg-text-muted/20 mr-1" />}
      <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${item.iconBg || "bg-primary/10"}`}>
        <item.icon className={`w-4.5 h-4.5 ${item.iconColor || "text-primary"}`} />
      </div>
      <span className="text-body font-bold text-text-main">{item.value}</span>
      <span className="text-sm text-text-muted">{item.label}</span>
      {item.trend !== undefined && item.trend !== 0 && (
        <span className={`text-xs font-semibold ${item.trend > 0 ? "text-success" : "text-error"}`}>
          {item.trend > 0 ? "+" : ""}{item.trend}%
        </span>
      )}
    </div>
  ))}
</div>
```

**Mobile:**
```tsx
<div className="lg:hidden flex gap-3 px-2 mb-4 overflow-x-auto scrollbar-hide">
  {(mobileItems || items).map((item) => (
    <div key={item.label} className={mobileCardClass || "min-w-[140px] bg-bg-card px-4 py-4 rounded-lg shadow-sm flex flex-col gap-1.5"}>
      <span className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold">{item.label}</span>
      <span className={`text-amount ${item.iconColor || "text-primary"}`}>{item.value}</span>
    </div>
  ))}
</div>
```

---

## BƯỚC 3b: Refactor `compact-stats.tsx` → dùng `<StatsBar />`

GIỮ LẠI: `formatCompact()`, items logic, mobileItems logic
XÓA: inline desktop + mobile JSX layout
THAY BẰNG:

```tsx
import { StatsBar } from "@/components/ui/stats-bar";

// ...items, mobileItems logic giữ nguyên...

return (
  <StatsBar
    items={items}
    mobileItems={mobileItems}
    mobileCardClass="min-w-[160px] bg-bg-card px-5 py-5 rounded-lg shadow-sm flex flex-col gap-2"
  />
);
```

## BƯỚC 3c: Refactor `employee-stats-bar.tsx` → dùng `<StatsBar />`

GIỮ LẠI: items logic, topDept calculation
XÓA: inline desktop + mobile JSX layout
THAY BẰNG:

```tsx
import { StatsBar } from "@/components/ui/stats-bar";

// ...items logic giữ nguyên...

return <StatsBar items={items} />;
```

---

## VERIFY

```bash
# 1. Dev server 0 errors
npm run dev

# 2. Browser: /contracts → stats bar desktop GIỐNG TRƯỚC
# 3. Browser: /employees → stats bar desktop GIỐNG TRƯỚC
# 4. Browser: Mobile viewport 375px → cả 2 trang mini cards GIỐNG TRƯỚC
# 5. Grep: layout class chỉ ở StatsBar shared
grep -rn "hidden lg:flex items-center gap-5" components/ --include="*.tsx"
# Kết quả: chỉ components/ui/stats-bar.tsx
```
