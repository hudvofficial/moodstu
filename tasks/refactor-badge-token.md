# Plan: Refactor Badge & Tab Pill → Design System Token
Created: 2026-03-18T10:27
Status: ✅ Complete

## Overview
Gom các badge/pill hardcoded rải rác về dùng token chuẩn V2 trong `design-system.css`.

**Vấn đề (Lesson #18, #53):**
- `top-action-bar.tsx` tự chế object `BADGE_STYLE` (bg-blue-50 text-blue-700...) thay vì dùng `<Badge>` component có sẵn.
- `summary-card.tsx` tự chế `badgeBg` + `dotColor` objects — duplicate logic giống y `<Badge>`.
- `mobile-tab-nav.tsx` hardcode inline class cho tab pills — chưa có token class.

**Giải pháp:**
- Phase 01: Tạo token `.tab-pill` trong `design-system.css`. ✅
- Phase 02: Refactor `top-action-bar.tsx` → dùng `<Badge>` component. ✅
- Phase 03: Refactor `summary-card.tsx` → dùng `<Badge>` component. ✅
- Phase 04: Refactor `mobile-tab-nav.tsx` → dùng `.tab-pill` token class. ✅

## Contraints
- KHÔNG thay đổi visual output — chỉ chuyển từ inline → token.
- KHÔNG thay đổi logic, layout, hay behavior.
- **Toàn hệ thống bo nhẹ 4 góc (6px)** — KHÔNG bo tròn (rounded-full).
- Badge `.badge` base: `border-radius: 6px` — giữ nguyên.
- Tab Pill `.tab-pill` base: `border-radius: 6px` — đồng bộ với badge (KHÔNG rounded-full).

## Tech Stack
- CSS: design-system.css (token SSOT)
- Component: components/ui/badge.tsx (React wrapper)
- TailwindCSS v4

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Tạo .tab-pill token trong design-system.css | ✅ Complete | 100% |
| 02 | top-action-bar.tsx → <Badge> component | ✅ Complete | 100% |
| 03 | summary-card.tsx → <Badge> component | ✅ Complete | 100% |
| 04 | mobile-tab-nav.tsx → .tab-pill token | ✅ Complete | 100% |

---

## Phase 01: Tạo `.tab-pill` token trong design-system.css
Status: ⬜ Pending

### Mục tiêu
Tạo token class `.tab-pill` cho dạng navigation pill (rounded-full, dùng cho tab nav).

### Công việc
- [ ] Mở `app/design-system.css`
- [ ] Thêm `.tab-pill` base class (display, padding, border-radius, font, transition)
- [ ] Thêm `.tab-pill-active` modifier (bg-interactive, text-white, border-interactive)
- [ ] Thêm `.tab-pill-inactive` modifier (bg-bg-card, text-text-secondary, border-border, hover states)

### Spec CSS
```css
.tab-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  padding: 8px 16px;           /* py-2 px-4 */
  border-radius: 6px;           /* bo nhẹ — đồng bộ toàn hệ thống */
  font-size: var(--font-size-body-sm);
  font-weight: 700;
  border: 1px solid transparent;
  transition: all 200ms ease-out;
  cursor: pointer;
  flex-shrink: 0;
}

.tab-pill:active {
  transform: scale(0.95);
}

.tab-pill-active {
  background: var(--color-interactive);
  color: #fff;
  border-color: var(--color-interactive);
}

.tab-pill-inactive {
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  border-color: var(--color-border);
}

.tab-pill-inactive:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-hover);
}
```

### Files
- `app/design-system.css` — thêm section "TAB PILLS" sau section BADGES

---

## Phase 02: top-action-bar.tsx → `<Badge>` component
Status: ⬜ Pending

### Mục tiêu
Xóa object `BADGE_STYLE` hardcoded, thay bằng `<Badge>` component chuẩn V2.

### Công việc
- [ ] Import `Badge` từ `@/components/ui/badge`
- [ ] Xóa const `BADGE_STYLE` (L16-21)
- [ ] Replace `<span className={...badgeStyle}>` (L96-102) bằng `<Badge variant={statusInfo.variant} dot>`
- [ ] Verify: desktop header badge render đúng

### Before → After
```tsx
// ❌ BEFORE (hardcoded)
const BADGE_STYLE: Record<string, string> = {
  info: "bg-blue-50 text-blue-700 border-blue-200",
  warning: "bg-accent/10 text-accent border-accent/20",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  error: "bg-red-50 text-red-700 border-red-200",
};
// ...
<span className={`px-3 py-1 text-xs font-bold rounded-full border ${badgeStyle}`}>
  {paymentLabel || statusInfo.label}
</span>

// ✅ AFTER (token)
<Badge variant={statusInfo.variant}>
  {paymentLabel || statusInfo.label}
</Badge>
```

### Files
- `components/contracts/detail/top-action-bar.tsx`

### ⚠️ Lưu ý
- User đã confirm: toàn hệ thống bo nhẹ 6px. Badge component `.badge` đã đúng `border-radius: 6px`. Không cần override.

---

## Phase 03: summary-card.tsx → `<Badge>` component
Status: ⬜ Pending

### Mục tiêu
Xóa objects `badgeBg` + `dotColor` hardcoded, thay bằng `<Badge>` component.

### Công việc
- [ ] Import `Badge` từ `@/components/ui/badge`
- [ ] Xóa const `badgeBg` và `dotColor` (nếu chỉ dùng cho status badge)
- [ ] Replace mobile status pill (L44-53) bằng `<Badge variant={statusInfo.variant} dot>`
- [ ] Replace desktop status badge (L78-87) bằng `<Badge variant={statusInfo.variant} dot>`
- [ ] Service type badge (L54-57: `bg-slate-100 text-slate-600`) → `<Badge variant="neutral">`
- [ ] Verify: cả mobile và desktop render đúng

### Files
- `components/contracts/detail/summary-card.tsx`

### ⚠️ Lưu ý
- User đã confirm: đổi từ `rounded-full` → `border-radius: 6px` (dùng token `.badge` chuẩn, không override).

---

## Phase 04: mobile-tab-nav.tsx → `.tab-pill` token class
Status: ⬜ Pending

### Mục tiêu
Thay inline classes bằng `.tab-pill` token class từ Phase 01.

### Công việc
- [ ] Thay inline class string (L85-90) bằng `.tab-pill` + conditional `.tab-pill-active` / `.tab-pill-inactive`
- [ ] Verify: tab nav pills render đúng, active state đúng màu

### Before → After
```tsx
// ❌ BEFORE (inline hardcode)
className={`whitespace-nowrap px-4 py-2 rounded-full text-body-sm font-bold
  transition-all duration-200 active:scale-95 shrink-0 border
  ${isActive
    ? "bg-interactive text-white border-interactive"
    : "bg-bg-card text-text-secondary border-border hover:text-text-primary hover:bg-bg-hover"
  }`}

// ✅ AFTER (token)
className={`tab-pill ${isActive ? "tab-pill-active" : "tab-pill-inactive"}`}
```

### Files
- `components/contracts/detail/mobile-tab-nav.tsx`

---

## Quick Commands
- Bắt đầu: `/code phase-01`
- Check progress: `/next`
