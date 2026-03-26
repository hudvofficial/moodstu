# 🏥 Audit Report — Standalone Rentals Text Tokens & Mobile/Desktop

**Ngày:** 2026-03-26
**Scope:** Text token compliance + Mobile/Desktop tách bạch — `standalone-rentals-client.tsx`

---

## Summary
- 🔴 Critical Issues: 0
- 🟡 Warnings: 4
- 🟢 Suggestions: 2

---

## ✅ Đã Đúng (Tách bạch Mobile/Desktop)

| Thành phần | Mobile | Desktop | Verdict |
|------------|--------|---------|---------|
| **Filters** | `lg:hidden` + `TabsFilter variant="pills"` | `hidden lg:flex` + `TabsFilter` default | ✅ Tách riêng |
| **View Toggle** | Icon only (`List`, `Calendar` 16px) | Text + icon (`"Danh sách"`, `"Lịch"`) | ✅ Tách riêng |
| **Data list** | `RentalCard` → `card-interactive` | `RentalRow` → `<table>` | ✅ Tách riêng |
| **Content guard** | `lg:hidden space-y-2` | `hidden lg:block` | ✅ Đúng pattern |

---

## 🟡 Warnings

### W1: Table KHÔNG dùng shared `TableWrapper/TH/TD/TR` components

**File:** `standalone-rentals-client.tsx` L493-517
**Triệu chứng:** Dùng `<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>`, `<tr>` native HTML thay vì shared components từ `@/components/ui/table`.

**So sánh tokens:**

| Element | Standalone Rentals (inline) | Gold Standard SSOT (`table.tsx`) | Sai lệch |
|---------|----------------------------|----------------------------------|----------|
| `<th>` | `py-3 px-4 text-caption text-text-muted uppercase font-medium` | `px-6 py-4 text-tiny font-bold uppercase tracking-[0.15em]` | ⚠️ Padding nhỏ hơn, font-weight nhẹ hơn, thiếu letter-spacing, khác text token |
| `<td>` | `py-3 px-4 text-body-sm font-medium` | `px-6 py-5 text-sm font-semibold` | ⚠️ Padding nhỏ hơn, font-weight nhẹ hơn |
| `<tr>` | `border-b border-border-light hover:bg-bg-hover` | `hover:bg-bg-hover/50` (no border) | ⚠️ Dùng border (vi phạm V2 no-border rule) |
| Wrapper | `bg-bg-card rounded-xl shadow-xs overflow-hidden` | `bg-bg-card rounded-xl shadow-sm` | ✅ Gần đúng (shadow-xs vs shadow-sm) |

**Cách sửa:** Thay native HTML bằng `TableWrapper`, `THead`, `TBody`, `TH`, `TD`, `TR` từ `@/components/ui/table`.

---

### W2: Stats bar dùng `border border-border-light` — vi phạm V2 no-border rule

**File:** `standalone-rentals-client.tsx` L375
**Code:** `bg-bg-card rounded-xl shadow-xs w-max border border-border-light`
**Rule vi phạm:** Lesson #64 — V2 TUYỆT ĐỐI KHÔNG DÙNG BORDER — CHỈ SHADOW.
**Cách sửa:** Bỏ `border border-border-light`, giữ `shadow-xs` (hoặc nâng lên `shadow-sm` để tăng contrast).

---

### W3: Calendar view dùng `border` trên day cells + legend separator

**File:** `standalone-rentals-client.tsx` L240, L265
- L240: `border border-border-light rounded` trên mỗi ô ngày
- L265: `border-t border-border/30` cho legend separator
**Rule vi phạm:** Lesson #64 — V2 no-border rule.
**Cách sửa:**
- Day cells: `bg-bg-hover/30 rounded` (thay border bằng bg nhẹ) hoặc giữ nguyên nếu border cần thiết cho calendar grid.
- Legend separator: `bg-border/30 h-px` thay vì `border-t`.

> [!NOTE]
> Calendar grid là ngoại lệ tiềm năng — grid cần visual separation rõ ràng. Anh quyết định có giữ border trên calendar cells không.

---

### W4: Table header dùng inline `uppercase` (Lesson #51: Sentence case)

**File:** `standalone-rentals-client.tsx` L497-502
**Code:** 6 `<th>` đều có class `uppercase font-medium`
**Rule:** Lesson #51 — Labels dùng Sentence case, KHÔNG uppercase.
**Tuy nhiên:** Gold Standard `TH` component cũng dùng `uppercase tracking-[0.15em]` → đây là **table header exception** (khác với form labels).
**Verdict:** ⚠️ Nếu dùng shared `TH` component thì tự khắc nhất quán. Không cần fix riêng.

---

## 🟢 Suggestions

### S1: RentalCard và RentalRow dùng cùng text tokens — không tách bạch size
- Mobile card: `text-body-sm`, `text-caption` — cùng token với desktop row
- Desktop có nhiều không gian hơn → có thể dùng `text-body` (thay `text-body-sm`) cho readability trên màn rộng
- **Effort:** Low — chỉ thay đổi nếu dùng shared `TD` component (đã có `text-sm font-semibold`)

### S2: Breadcrumb dùng inline markup thay vì shared `Breadcrumb` component
- L366-372: Viết tay `<nav>` + `<ChevronRight>` thay vì dùng `<Breadcrumb items={[...]}>`
- `module-blueprint.md` Block 7 chỉ rõ dùng shared `Breadcrumb` component
- **Effort:** ~5 min

---

## 📋 Tổng kết Fix Priority

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| W1 | Table → shared components | ~15 min | Đồng bộ tokens + spacing + hover + no-border |
| W2 | Stats bar bỏ border | ~1 min | V2 consistency |
| W3 | Calendar border review | ~5 min | V2 consistency (có ngoại lệ) |
| S2 | Breadcrumb shared component | ~5 min | Module blueprint compliance |

**Tổng: ~25 phút**

---

## Next Steps
(Chi tiết trong Menu Action Plan ở tin nhắn)
