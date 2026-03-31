# Audit Report — 2026-03-31 (Material Symbols & SSOT Quick Scan)

## Summary
- 🔴 Critical Issues: **1** (Material Symbols font dependency — 500KB+ bloat)
- 🟡 Warnings: **2** (Inline typography violations, legacy icon class trong non-builder file)
- 🟢 Info: **1** (Build health OK)
- ✅ Build: **PASS** (exit code 0, tất cả routes compile thành công)

---

## 🔴 Critical: Material Symbols vẫn còn trong **7 source files**

**Tác động:** Font Material Symbols tải ~500KB, gây chậm LCP/FCP và FOUC (Flash of Unstyled Content).

**Phạm vi:** 100% nằm trong `components/services/` — KHÔNG lan sang module khác.

| # | File | Số lượng icons | Dòng |
|---|------|---------------|------|
| 1 | `builder/BuilderMode.tsx` | 3 | 173, 235, 245 |
| 2 | `builder/BundleCanvas.tsx` | 5 | 43, 56, 83, 99, 162 |
| 3 | `builder/ComponentSelector.tsx` | 3 | 73, 109, 116 |
| 4 | `builder/QuoteModernView.tsx` | 5 | 31, 44, 64, 130, 180 |
| 5 | `builder/RuleManager.tsx` | 3 | 73, 85, 278 |
| 6 | `builder/SmartSuggestions.tsx` | 3 | 55, 118, 130 |
| 7 | `category-manager-modal.tsx` | 1 | 249 (`material-symbols-rounded`) |
| | **TỔNG** | **23 icons** | |

> File #7 (`category-manager-modal.tsx`) dùng `material-symbols-rounded` (variant khác), cũng cần migrate.

**Cách sửa:** Phase 6A đã có mapping Lucide sẵn trong handover. Thực thi swap 1:1 theo bảng đã lập.

---

## 🟡 Warning 1: Inline Typography trong 6 builder files (~40 violations)

**Tác động:** Vi phạm SSOT. Nếu thay đổi design tokens, các file này KHÔNG tự đồng bộ.

| Pattern vi phạm | Nên dùng | Số lượng ước tính |
|-----------------|----------|-------------------|
| `text-sm font-bold` | `.text-label` hoặc `.text-body-sm` | ~15 |
| `text-xs font-bold` | `.text-label` | ~10 |
| `text-lg font-bold` | `.text-h4` hoặc `.section-heading` | ~3 |
| `text-2xl font-black` | `.text-h2` | ~2 |
| `text-6xl` (icon size) | Lucide `size={48}` | ~2 |
| `uppercase tracking-widest` | `.text-overline` (chỉ cho QuoteView) | ~3 |
| `text-[14px]` / `text-[20px]` / `text-[24px]` | Lucide `size={}` prop | ~5 |

**Files ảnh hưởng (xếp theo mức độ nặng):**
1. `QuoteModernView.tsx` — ~12 violations (nhiều nhất, bao gồm `uppercase tracking-widest`)
2. `BundleCanvas.tsx` — ~10 violations
3. `ComponentSelector.tsx` — ~7 violations
4. `RuleManager.tsx` — ~6 violations
5. `SmartSuggestions.tsx` — ~4 violations
6. `BuilderMode.tsx` — ~4 violations

---

## 🟡 Warning 2: `category-manager-modal.tsx` dùng variant `material-symbols-rounded`

- Dòng 249: `<span className="material-symbols-rounded text-base">{cat.icon}</span>`
- File ngoài builder, dùng variant `rounded` thay vì `outlined`.
- Category icons có thể là dynamic (lưu từ DB) → cần chiến lược mapping khác (VD: Lucide icon map object).

---

## 🟢 Info: Không có Material Symbols ngoài Services module

- `app/` directory: Sạch
- `app/layout.tsx`: Chỉ dùng `localFont` (Inter Variable) — không import Google Material font
- `app/styles/*.css`: Không có `.material-symbols` CSS rules
- Các module khác (contracts, dashboard, dresses, employees, inventory): Sạch

**Kết luận:** Sau khi xong Phase 6A-C, có thể an toàn xóa mọi reference Material Symbols mà không ảnh hưởng module khác.

---

## 🟢 Info: Build Health

```
Build: PASS (exit code 0)
24 routes compiled thành công
Không có TypeScript errors
Không có warnings blocking
```

---

## Next Steps

| Ưu tiên | Task | Effort |
|----------|------|--------|
| **P0** | Phase 6A: Swap 23 Material icons sang Lucide (7 files) | ~15 phút |
| **P1** | Phase 6B: Chuẩn hóa ~40 inline typography sang SSOT tokens | ~20 phút |
| **P2** | Phase 6C: Xóa Material Symbols font dependency khỏi project | ~5 phút |
| **P3** | Xử lý `category-manager-modal.tsx` icon strategy (dynamic icons) | ~10 phút |
