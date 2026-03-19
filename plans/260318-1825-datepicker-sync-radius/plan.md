# Plan: DatePicker — Đồng bộ Radius + Label với Input Base

**Created:** 2026-03-18 18:25
**Status:** 🟡 In Progress
**Complexity:** Simple (1 file, 2 dòng)

---

## Vấn đề

Nhìn screenshot hiện tại:

```
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│ Loại giao dịch    ▼ │ │ Loại dịch vụ *    ▼ │ │ Ngày hợp đồng     📅│ ← KHÁC GÓC
│ Hợp đồng            │ │ Studio              │ │ 18/03/2026          │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
  ↑ radius-sm = 6px      ↑ radius-sm = 6px      ↑ rounded-lg = 8px ❌

 Ngày chụp / làm việc    Ngày giao sản phẩm     Nhân viên phụ trách
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│ Chọn ngày          📅│ │ Chọn ngày          📅│ │ Tên nhân viên...    │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
  ↑ Label bị lệch                                 ↑ label-base chuẩn
```

### Bug 1: Border-radius không đồng bộ

| Component | Style hiện tại | Giá trị thực |
|-----------|---------------|--------------|
| `<select>` (input-base) | `border-radius: var(--radius-sm)` | **6px** |
| `<input>` (input-base) | `border-radius: var(--radius-sm)` | **6px** |
| DatePicker trigger | `rounded-lg` (Tailwind) | **8px** ❌ |

**Root cause:** DatePicker trigger dùng Tailwind `rounded-lg` thay vì SSOT token `var(--radius-sm)`.

### Bug 2: Label bị lệch / trigger bị đẩy lên

| Component | Label class | Thuộc tính |
|-----------|-------------|------------|
| `<Field>` wrapper | `.label-base` | `font-size: var(--font-size-label); font-weight: 500; color: var(--color-text-secondary); margin-bottom: 4px; margin-left: 4px; display: block;` |
| DatePicker | `.text-label mb-1 block` | `font-size: var(--font-size-label); font-weight: 500; color: var(--color-text-secondary); line-height: 1.2;` + `mb-1=4px` |

**Khác biệt chính:**
- `.label-base` có `margin-left: 4px` → label thụt vào 4px 
- `.text-label` KHÔNG có `margin-left` → label sát trái
- `.label-base` KHÔNG có `line-height: 1.2` (dùng default ~1.5)
- `.text-label` có `line-height: 1.2` → label chiếm ít chiều cao hơn → trigger bị đẩy lên

---

## Fix chính xác

### File: `components/ui/date-picker.tsx`

**Fix 1 — Border radius (line ~408):**

```diff
- className={`w-full px-3 py-2.5 min-h-[44px] text-left text-xs leading-4 rounded-lg bg-elevated ...`}
+ className={`w-full px-3 py-2.5 min-h-[44px] text-left text-xs leading-4 bg-elevated ...`}
+ style={{ borderRadius: "var(--radius-sm)" }}
```

Bỏ `rounded-lg` → dùng inline `var(--radius-sm)` = 6px = match input-base.

**Fix 2 — Label class (line ~398):**

```diff
- <label className="text-label mb-1 block">
+ <label className="label-base">
```

Đổi sang dùng `label-base` — cùng class với `<Field>` wrapper → margin-left, font-size, font-weight, margin-bottom đều match.

---

## Calendar panel border-radius (bonus)

Calendar panel cũng dùng `rounded-lg` — nhưng đây là popover riêng, KHÔNG nằm cùng hàng với input nên **KHÔNG cần đổi** (popover có thể bo tròn khác).

---

## Test Criteria

- [ ] DatePicker trigger có cùng border-radius (6px) với select/input cạnh nó
- [ ] Label "Ngày hợp đồng" cùng font/spacing/margin với "Loại giao dịch" 
- [ ] Trigger button thẳng hàng (vertically aligned) với các input-base cạnh nó
- [ ] Build pass (exit code 0)
- [ ] Visual verify bằng screenshot
