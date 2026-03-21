# Plan: SSOT Token Sync — Đồng bộ Design System v2
Created: 2026-03-21T19:03
Status: 🟡 In Progress

## Overview
Bổ sung tokens còn thiếu vào `globals.css` và đồng bộ toàn bộ components
trong `/contracts/detail/` sử dụng tokens thay vì hardcode Tailwind.

## Vấn đề hiện tại
Design System v2 thiếu tokens cho:
- Border radius 12px (dùng 20+ chỗ nhưng không có token)
- Animation scale (0.95, 0.96, 0.98 hardcode rải rác)
- Icon container sizes (40px, 48px)
- Icon sizes (20px, 22px, 24px)

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Thêm tokens mới vào globals.css | ✅ Complete | 100% |
| 02 | Fix quick-actions-grid.tsx | ✅ Complete | 100% |
| 03 | Fix CSS classes (btn, components) | ✅ Complete | 100% |
| 04 | Sweep contracts/detail/*.tsx | ✅ Complete | 100% |

---

## Phase 01: Thêm tokens mới vào `globals.css`

### File: `app/globals.css` (trong `@theme {}`)

### Tokens thêm mới:

```css
/* ── Border Radius (bổ sung) ── */
--radius-content: 12px;       /* content blocks, list items, inner containers */

/* ── Animation Scale ── */
--scale-press: 0.98;          /* default button press */
--scale-press-sm: 0.96;       /* lighter press (icon buttons) */
--scale-press-xs: 0.95;       /* strong press (FAB, floating) */

/* ── Icon Containers ── */
--icon-container-sm: 40px;    /* mobile icon circle */
--icon-container-md: 48px;    /* desktop icon circle */

/* ── Icon Sizes ── */
--icon-size-sm: 20px;         /* compact/mobile */
--icon-size-md: 22px;         /* default desktop */
--icon-size-lg: 24px;         /* prominent */
```

### Tasks:
- [ ] Task 1: Thêm 8 tokens mới vào @theme block
- [ ] Task 2: Build verify

---

## Phase 02: Fix `quick-actions-grid.tsx`

### Thay đổi:

| Dòng | Trước | Sau |
|------|-------|-----|
| L43 | `rounded-xl` | `rounded-[var(--radius-content)]` |
| L46 | `scale-[0.96]` | `scale-[var(--scale-press-sm)]` |
| L49 | `w-10 h-10 rounded-xl` | `w-[var(--icon-container-sm)] h-[var(--icon-container-sm)] rounded-[var(--radius-content)]` |
| L55 | `text-xs` | `text-caption` |
| L76 | `rounded-xl` | `rounded-[var(--radius-content)]` |
| L79 | `scale-[0.96]` | `scale-[var(--scale-press-sm)]` |
| L82 | `w-12 h-12 rounded-2xl` | `w-[var(--icon-container-md)] h-[var(--icon-container-md)] rounded-[var(--radius-lg)]` |

### Tasks:
- [ ] Task 1: Apply 7 thay đổi trên
- [ ] Task 2: Build + verify visual

---

## Phase 03: Fix CSS classes (`pages.css`, `components.css`)

### `pages.css` — button scale:
| Dòng | Trước | Sau |
|------|-------|-----|
| L134 | `scale(0.98)` | `scale(var(--scale-press))` |

### `components.css` — scale:
| Dòng | Trước | Sau |
|------|-------|-----|
| L142 | `scale(0.98)` | `scale(var(--scale-press))` |

### Tasks:
- [ ] Task 1: Fix 2 chỗ scale trong CSS
- [ ] Task 2: Build verify

---

## Phase 04: Sweep `contracts/detail/*.tsx` — `rounded-xl`

### Scope: 12 files, 20+ instances

Thay tất cả `rounded-xl` → `rounded-[var(--radius-content)]`:
- service-details-block.tsx (1)
- print-orders-block.tsx (1)
- payment-receipt-form.tsx (1)
- notes-timeline.tsx (1)
- mobile-bottom-bar.tsx (2)
- inventory-reservation-form.tsx (2)
- event-timeline.tsx (1)
- event-task-modal.tsx (2)
- customer-info-block.tsx (2)
- costumes-block.tsx (1)
- contract-actions-menu.tsx (2)
- checklist-manager.tsx (2)
- cancel-banner.tsx (1)

### Tasks:
- [ ] Task 1: Batch replace rounded-xl in all files
- [ ] Task 2: Build + full verify

---

## Quick Commands
- Code Phase 1: `/code`

## Risk Assessment
- **Low risk**: Thêm tokens không ảnh hưởng gì hiện tại
- **Medium risk**: Phase 02-04 thay đổi visual nhẹ (12px → 12px = same!)
- **Lưu ý**: `rounded-xl` = 12px, `--radius-content` = 12px → **không đổi visual**
