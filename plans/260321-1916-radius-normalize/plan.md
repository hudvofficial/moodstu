# Plan: Radius + Button Normalize — Chuẩn hóa toàn bộ hệ thống
Created: 2026-03-21T19:41
Status: 🟡 In Progress

## Quyết định Design
- Mood Studio v2 = SaaS quản lý, earth-tone, chuyên nghiệp
- Token scale: 6 → 8 → 12 → 16px (Stripe + Apple hybrid)
- "Bo nhẹ 4 góc" — không pill, không sharp

## Token SSOT
```css
--radius-sm: 6px;   /* buttons, inputs, small elements */
--radius-md: 8px;   /* cards, content blocks */
--radius-lg: 12px;  /* modals, dropdowns, large containers */
--radius-xl: 16px;  /* pills, tags, special elements */
```

---

## 🩺 AUDIT REPORT

### BUG 1: `btn-primary/outline` THIẾU base `.btn` styles
**Mức độ: 🔴 CRITICAL — ảnh hưởng visual toàn bộ modals**

| Pattern | Nơi dùng | Vấn đề |
|---------|----------|--------|
| `btn-primary` THIẾU `.btn` | 5 files, 6 instances | Không có border-radius, padding, font |
| `btn-outline` THIẾU `.btn` | 6 files, 10 instances | Có radius riêng NHƯNG thiếu base layout |

**Files bị ảnh hưởng:**
- `payment-receipt-form.tsx` (L272, L279)
- `printing-order-form.tsx` (L160, L235, L242)
- `inventory-reservation-form.tsx` (L260, L267)
- `notes-timeline.tsx` (L201)
- `top-action-bar.tsx` (L152, L164, L175)
- `contract-actions-menu.tsx` (L91, L101, L139, L146, L187, L194)
- `print-contract-client.tsx` (L86, L95, L103)

**Files ĐÚNG (dùng `btn btn-*`):** 15 files — dùng đúng chuẩn

### BUG 2: CSS có variant classes thiếu base layout
**Mức độ: 🟡 WARNING**

| CSS Class | Có border-radius? | Có padding/display? |
|-----------|-------------------|---------------------|
| `.btn` (base) | ✅ var(--radius-sm) | ✅ Đầy đủ |
| `.btn-primary` | ❌ THIẾU | ❌ THIẾU — kế thừa .btn |
| `.btn-secondary` | ❌ THIẾU | ❌ THIẾU — kế thừa .btn |
| `.btn-danger` | ❌ THIẾU | ❌ THIẾU — kế thừa .btn |
| `.btn-ghost` | ❌ THIẾU | ❌ THIẾU — kế thừa .btn |
| `.btn-interactive` | ✅ var(--radius-lg) | ❌ THIẾU — kế thừa .btn |
| `.btn-outline` | ✅ var(--radius-sm) | ✅ Có riêng |
| `.btn-cta` | ✅ var(--radius-md) | ✅ Có riêng |

### BUG 3: Hardcoded border-radius còn sót *(đã fix)*
- ✅ `pages.css:202` — 6px → var(--radius-sm)
- ✅ `pages.css:227` — 6px → var(--radius-sm)
- ✅ `components.css:127` — 8px → var(--radius-md)
- ℹ️ `9999px` = rounded-full → OK (dots, pills)
- ℹ️ `4px` = skeleton text → OK (nhỏ hơn sm)

### BUG 4: Radius token values đã update *(đã fix)*
- ✅ --radius-md: 10px → 8px
- ✅ --radius-lg: 14px → 12px
- ✅ --radius-xl: 20px → 16px
- ✅ --radius-content: XÓA → gộp vào md

### BUG 5: Tailwind v4 syntax sai *(đã fix)*
- ✅ Arbitrary radius wildcard class pattern was replaced by fixed radius utilities (41 files)

---

## PHASES

| Phase | Nội dung | Files | Status |
|-------|----------|-------|--------|
| 01 | ✅ Token values update | globals.css | ✅ Done |
| 02 | ✅ radius-content → radius-md | 14 files | ✅ Done |
| 03 | ✅ TW4 syntax fix | 41 files | ✅ Done |
| 04 | ✅ CSS hardcode → token | 3 files | ✅ Done |
| **05** | **⬜ CSS: btn variants kế thừa base** | **pages.css** | ⬜ Pending |
| **06** | **⬜ TSX: thiếu `.btn` base class** | **7 files** | ⬜ Pending |
| 07 | ⬜ Build + Visual verify | - | ⬜ Pending |

---

## Phase 05: CSS — Btn variants kế thừa .btn base
**Approach:** Grouping selector — mọi `.btn-*` tự có base styles

```css
/* TRƯỚC — variant cần dùng KÈM .btn */
.btn { display: inline-flex; ... border-radius: var(--radius-sm); }
.btn-primary { background: ...; }

/* SAU — variant TỰ ĐỦ base styles */
.btn,
.btn-primary,
.btn-secondary,
.btn-danger,
.btn-ghost {
  display: inline-flex; ...
  border-radius: var(--radius-sm);
}
.btn-primary { background: ...; color: white; }
```

**Ưu điểm:**
- Không cần sửa 20+ TSX files
- Backward compatible (chỗ đã dùng `btn btn-primary` vẫn OK)
- Single source of truth

**Files cần sửa:** `app/styles/pages.css` (line 119-191)

## Phase 06: TSX — Thêm `.btn` base class cho consistency
**Dù Phase 05 đã fix visual, vẫn nên chuẩn hóa code:**

Batch replace trong 7 files:
- `"btn-primary` → `"btn btn-primary`
- `"btn-outline` → `"btn btn-outline`

**Files:**
1. `payment-receipt-form.tsx`
2. `printing-order-form.tsx`
3. `inventory-reservation-form.tsx`
4. `notes-timeline.tsx`
5. `top-action-bar.tsx`
6. `contract-actions-menu.tsx`
7. `print-contract-client.tsx`

## Phase 07: Build + Visual Verify
- Kill port → npm run dev
- Mở browser check modals
- Screenshot so sánh trước/sau
