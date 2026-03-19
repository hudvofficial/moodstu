# Plan: V2 Design System — Production-Grade CSS SSOT

Created: 2026-03-16
Status: 🟡 In Progress
Approach: **Token → Class → Migration → Enforcement**

---

## Bối cảnh

V1 có design system (835 dòng globals.css) với shared classes. V2 chỉ có tokens (93 dòng) mà KHÔNG có utility classes → mỗi component hardcode riêng → lỗi liên tục.

## Ràng buộc từ lessons.md

- `globals.css` < 100 dòng → tách `design-system.css` riêng
- Không `font-serif`, `italic`, `uppercase` (lesson #50, #51)
- Typography đúng `design-specs.md` (Inter, 7 cấp)
- Earth-tone palette only (lesson #22)

## Kiến trúc 3 tầng (như Stripe/Linear)

```
Tầng 1: @theme tokens (globals.css)     ← Giá trị gốc (đã có)
Tầng 2: Utility classes (design-system.css) ← Class dùng tokens
Tầng 3: Components (.tsx)               ← Chỉ dùng classes, KHÔNG hardcode
```

---

## Phases

| # | Phase | Status | Scope |
|---|-------|--------|-------|
| 01 | Typography tokens + classes | ✅ | `globals.css` + `design-system.css` |
| 02 | Layout + Form classes | ✅ | `design-system.css` |
| 03 | Card + Button + Badge classes | ✅ | `design-system.css` |
| 04 | Animation + Skeleton classes | ✅ | `design-system.css` |
| 05 | Interaction states | ✅ | `design-system.css` |
| 06 | Dark mode prep | ✅ | `design-system.css` |
| 07 | Import + Build verify | ✅ | `globals.css` |
| 08 | Migration: Layout components | ✅ | `header.tsx`, `sidebar.tsx`, `CrmLayoutClient.tsx` |
| 09 | Migration: UI components | ✅ | `unified-modal.tsx`, `ux-states.tsx`, `login-transition.tsx` |
| 10 | Migration: Pages | ✅ | `dashboard/page.tsx`, `login/page.tsx` |
| 11 | Migration: CRM components | ✅ | `LeadStats.tsx`, `CustomerStats.tsx`, `LeadDetail.tsx`, `CustomerDetail.tsx` |
| 12 | Dev reference guide + Enforcement | ✅ | `docs/css-classes.md`, `tasks/lessons.md` |

---

## Phase 01: Typography Tokens + Classes

### 1A. Thêm tokens vào `globals.css` @theme (4 dòng)

```css
/* Thêm vào @theme block hiện có */
--font-size-display: 36px;
--font-size-h1: 28px;
--font-size-h2: 22px;
--font-size-h3: 18px;
--font-size-body: 16px;
--font-size-body-sm: 14px;
--font-size-caption: 12px;
--font-size-label: 13px;
```

### 1B. Tạo `app/design-system.css` — Typography classes

```css
/* ═══════════════════════════════════════════
   Mood Studio V2 — Design System Classes
   SSOT cho typography, layout, cards, animations
   Import từ globals.css
   ═══════════════════════════════════════════ */

/* ── TYPOGRAPHY ── */
/* Đúng design-specs.md + responsive via clamp() */

.text-display {
  font-size: clamp(28px, 4vw, var(--font-size-display));
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--color-text-primary);
}

.text-h1 {
  font-size: clamp(22px, 3vw, var(--font-size-h1));
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.01em;
  color: var(--color-text-primary);
}

.text-h2 {
  font-size: clamp(18px, 2.5vw, var(--font-size-h2));
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.01em;
  color: var(--color-text-primary);
}

.text-h3 {
  font-size: var(--font-size-h3);
  font-weight: 600;
  line-height: 1.4;
  color: var(--color-text-primary);
}

.text-body {
  font-size: var(--font-size-body);
  font-weight: 400;
  line-height: 1.5;
  color: var(--color-text-primary);
}

.text-body-sm {
  font-size: var(--font-size-body-sm);
  font-weight: 400;
  line-height: 1.4;
  color: var(--color-text-secondary);
}

.text-caption {
  font-size: var(--font-size-caption);
  font-weight: 400;
  line-height: 1.3;
  color: var(--color-text-muted);
}

.text-label {
  font-size: var(--font-size-label);
  font-weight: 500;
  line-height: 1.2;
  color: var(--color-text-secondary);
}

/* Page-level title (Header module name) */
.text-page-title {
  font-size: clamp(18px, 2.5vw, var(--font-size-h2));
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.01em;
  color: var(--color-text-primary);
}

/* Page subtitle (Header module description) */
.text-page-subtitle {
  font-size: var(--font-size-caption);
  font-weight: 400;
  line-height: 1.3;
  color: var(--color-text-muted);
}
```

**Files sửa:** `globals.css` (thêm 8 tokens), tạo mới `design-system.css`

---

## Phase 02: Layout + Form Classes

```css
/* ── LAYOUT ── */
.main-container {
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
  padding: var(--spacing-base);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}
@media (min-width: 1024px) {
  .main-container {
    padding: var(--spacing-xl);
    gap: var(--spacing-xl);
  }
}

/* ── SECTION ── */
.section-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-body-sm);
  font-weight: 700;
  color: var(--color-primary);
  padding-bottom: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  border-bottom: 1px dashed var(--color-border);
}

/* ── FORM ── */
.label-base {
  display: block;
  font-size: var(--font-size-label);
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
  margin-left: 4px;
  /* Sentence case — KHÔNG uppercase (lesson #51) */
}

.input-base {
  width: 100%;
  padding: 10px var(--spacing-base);
  min-height: 44px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  font-size: var(--font-size-body-sm);
  color: var(--color-text-primary);
  outline: none;
  transition: border-color 150ms ease-out, box-shadow 150ms ease-out;
}
.input-base::placeholder {
  color: var(--color-text-muted);
}
.input-base:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(139, 94, 60, 0.1);
}
.input-base:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

**Files sửa:** `design-system.css` only

---

## Phase 03: Card + Button + Badge Classes

```css
/* ── CARDS ── */
.card-base {
  background: var(--color-bg-card);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.card-interactive {
  background: var(--color-bg-card);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  transition: transform 200ms ease-out, box-shadow 200ms ease-out;
  cursor: pointer;
}
.card-interactive:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
.card-interactive:active {
  transform: scale(0.98);
}

.stats-card {
  background: var(--color-bg-card);
  padding: var(--spacing-base);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  transition: transform 200ms ease-out, box-shadow 200ms ease-out;
  position: relative;
  overflow: hidden;
}
.stats-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

/* ── BUTTONS ── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: 10px var(--spacing-base);
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: var(--font-size-body-sm);
  transition: all 150ms ease-out;
  cursor: pointer;
  border: none;
  outline: none;
}
.btn:active {
  transform: scale(0.98);
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
  box-shadow: var(--shadow-sm);
}
.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-dark);
  box-shadow: var(--shadow-md);
}

.btn-secondary {
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}
.btn-secondary:hover:not(:disabled) {
  background: var(--color-bg-hover);
  border-color: var(--color-text-muted);
}

.btn-danger {
  background: var(--color-error);
  color: white;
  box-shadow: var(--shadow-sm);
}
.btn-danger:hover:not(:disabled) {
  opacity: 0.9;
  box-shadow: var(--shadow-md);
}

.btn-ghost {
  background: transparent;
  color: var(--color-text-secondary);
}
.btn-ghost:hover:not(:disabled) {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

/* ── BADGES ── */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 9999px;
  font-size: var(--font-size-caption);
  font-weight: 600;
  white-space: nowrap;
}
.badge-success { background: rgba(76, 175, 80, 0.1); color: #2e7d32; }
.badge-warning { background: rgba(255, 152, 0, 0.1); color: #e65100; }
.badge-error   { background: rgba(244, 67, 54, 0.1); color: #c62828; }
.badge-info    { background: rgba(33, 150, 243, 0.1); color: #1565c0; }
.badge-neutral { background: var(--color-bg-hover); color: var(--color-text-secondary); }
.badge-primary { background: rgba(139, 94, 60, 0.1); color: var(--color-primary); }
.badge-accent  { background: rgba(201, 169, 110, 0.15); color: #8B6914; }
```

**Files sửa:** `design-system.css` only

---

## Phase 04: Animation + Skeleton Classes

```css
/* ── ENTRANCE ANIMATIONS ── */
@keyframes entrance-fade-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.entrance { animation: entrance-fade-up 0.4s ease-out both; }
.entrance-1 { animation-delay: 0ms; }
.entrance-2 { animation-delay: 60ms; }
.entrance-3 { animation-delay: 120ms; }
.entrance-4 { animation-delay: 180ms; }
.entrance-5 { animation-delay: 240ms; }
.entrance-6 { animation-delay: 300ms; }
.entrance-7 { animation-delay: 360ms; }
.entrance-8 { animation-delay: 420ms; }

/* ── STAGGER LIST ── */
@keyframes stagger-fade-up {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.stagger-item { animation: stagger-fade-up 0.3s ease-out both; }
.stagger-item:nth-child(1) { animation-delay: 20ms; }
.stagger-item:nth-child(2) { animation-delay: 40ms; }
.stagger-item:nth-child(3) { animation-delay: 60ms; }
.stagger-item:nth-child(4) { animation-delay: 80ms; }
.stagger-item:nth-child(5) { animation-delay: 100ms; }
.stagger-item:nth-child(6) { animation-delay: 120ms; }
.stagger-item:nth-child(7) { animation-delay: 140ms; }
.stagger-item:nth-child(8) { animation-delay: 160ms; }
.stagger-item:nth-child(n+9) { animation-delay: 180ms; }

/* ── CARD ENTRANCE ── */
@keyframes card-entrance {
  from { opacity: 0; transform: scale(0.97) translateY(6px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
.card-entrance { animation: card-entrance 0.25s ease-out both; }

/* ── BRANDED SKELETON SHIMMER ── */
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton {
  border-radius: var(--radius-sm);
  background: linear-gradient(90deg,
    rgba(139, 94, 60, 0.04) 25%,
    rgba(139, 94, 60, 0.08) 50%,
    rgba(139, 94, 60, 0.04) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 2s ease-in-out infinite;
}
.skeleton-text  { height: 16px; border-radius: 4px; }
.skeleton-title { height: 24px; width: 66%; border-radius: 4px; }
.skeleton-card  {
  background: var(--color-bg-card);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

/* ── SCROLLBAR UTILITIES ── */
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

/* ── MODAL BACKDROP (Performance — no blur) ── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  transition: opacity 200ms ease-out;
  backdrop-filter: none;
}
```

**Files sửa:** `design-system.css` only

---

## Phase 05: Interaction States

```css
/* ── FOCUS RING (override globals.css) ── */
.focus-ring:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ── ICON BOX (Stats cards, sidebar) ── */
.icon-box {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  transition: transform 200ms ease-out;
}
.stats-card:hover .icon-box,
.card-interactive:hover .icon-box {
  transform: scale(1.1);
}

/* ── LINK ── */
.link-base {
  color: var(--color-primary);
  font-weight: 600;
  text-decoration: none;
  transition: opacity 150ms ease-out;
}
.link-base:hover {
  opacity: 0.8;
  text-decoration: underline;
}

/* ── DISABLED STATE (global) ── */
.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
```

**Files sửa:** `design-system.css` only

---

## Phase 06: Dark Mode Prep

Chỉ **chuẩn bị cấu trúc**, KHÔNG implement full dark mode.

```css
/* Thêm comment block trong design-system.css */
/* ═══ DARK MODE (prep — activate khi cần) ═══ */
/*
.dark {
  --color-bg-base: #1A1612;
  --color-bg-card: #241E18;
  --color-bg-sidebar: #1E1914;
  --color-bg-hover: #2E2620;
  --color-bg-input: #2A231C;
  --color-text-primary: #F0EBE4;
  --color-text-secondary: #A69580;
  --color-text-muted: #7A6B5A;
  --color-border: #3A3028;
  --color-border-light: #2E2620;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
}

.dark .skeleton {
  background: linear-gradient(90deg,
    rgba(255,255,255,0.04) 25%,
    rgba(255,255,255,0.08) 50%,
    rgba(255,255,255,0.04) 75%
  );
}
*/
```

→ Khi cần bật dark mode, chỉ uncomment + toggle `.dark` class trên `<html>`.

**Files sửa:** `design-system.css` (comment block only)

---

## Phase 07: Import + Build Verify

### Steps:
1. Thêm `@import "./design-system.css";` vào `globals.css` dòng 2
2. `globals.css` vẫn < 100 dòng (hiện 93 + 9 tokens + 1 import = ~103 → cần tối ưu: gộp tokens compact)
3. Kill port + `npm run dev`
4. Verify: no build errors, no CSS conflicts

**Files sửa:** `globals.css` (1 dòng import + 8 dòng tokens)

---

## Phase 08-11: Migration (theo batch)

### Chiến lược: Đổi className, KHÔNG đổi cấu trúc JSX

#### Phase 08: Layout components (3 files)

| File | Dòng | Trước | Sau |
|------|------|-------|-----|
| `header.tsx:28` | H1 | `text-xl font-bold text-dark leading-none tracking-tight` | `text-page-title` |
| `header.tsx:32` | Subtitle | `text-[11px] text-text-muted` | `text-page-subtitle` |
| `CrmLayoutClient.tsx:26` | H1 | `text-2xl font-bold text-text-primary tracking-tight` | `text-h1` |

#### Phase 09: UI components (3 files)

| File | Dòng | Trước | Sau |
|------|------|-------|-----|
| `unified-modal.tsx:116` | H3 | `text-xl font-bold text-dark tracking-tight leading-none` | `text-h3` |
| `ux-states.tsx:32` | H3 | `text-xl font-bold text-dark mb-2` | `text-h3 mb-2` |
| `login-transition.tsx:26` | P | `text-lg font-semibold text-text-primary tracking-tight` | `text-h3` |

#### Phase 10: Pages (2 files)

| File | Dòng | Trước | Sau |
|------|------|-------|-----|
| `dashboard/page.tsx:7` | H1 | `text-3xl font-bold text-dark leading-tight tracking-tight` | `text-h1` |
| `login/page.tsx:114` | H1 | `text-2xl font-bold tracking-tight text-dark block w-full` | `text-h1 block w-full` |
| `login/page.tsx:121` | H2 | `text-xl font-semibold text-text-primary block w-full` | `text-h2 block w-full` |

#### Phase 11: CRM components (4 files)

| File | Dòng | Trước | Sau |
|------|------|-------|-----|
| `LeadStats.tsx:34` | Value | `text-xl lg:text-2xl font-bold tracking-tight` | `text-h2` (giữ dynamic color) |
| `CustomerStats.tsx:49` | Value | `text-xl lg:text-2xl font-bold tracking-tight` | `text-h2` (giữ dynamic color) |
| `LeadDetail.tsx:81` | H2 | `text-lg font-bold text-text-primary` | `text-h3` |
| `CustomerDetail.tsx:106` | H2 | `text-lg font-bold text-text-primary` | `text-h3` |

---

## Phase 12: Dev Reference Guide + Enforcement

### 12A. Tạo `docs/css-classes.md` — Cheat sheet

```markdown
# V2 Design System — CSS Classes Reference

## 📝 Typography (PHẢI dùng, KHÔNG hardcode)

| Class | Khi nào dùng | Tương đương |
|-------|-------------|-------------|
| `.text-display` | Hero sections | 36px/700 |
| `.text-h1` | Page title | 28px/600 |
| `.text-h2` | Section title | 22px/600 |
| `.text-h3` | Card title, modal title | 18px/600 |
| `.text-body` | Content text | 16px/400 |
| `.text-body-sm` | Secondary content | 14px/400 |
| `.text-caption` | Timestamps, footnotes | 12px/400 |
| `.text-label` | Form labels | 13px/500 |
| `.text-page-title` | Header module name | 22px/700 |
| `.text-page-subtitle` | Header module desc | 12px/400 |

## ❌ KHÔNG BAO GIỜ viết:
- `text-xl font-bold text-dark` → dùng `.text-h3`
- `text-2xl font-bold tracking-tight` → dùng `.text-h1`
- `text-[11px] font-medium uppercase` → dùng `.text-label`
```

### 12B. Update `tasks/lessons.md` — Thêm lesson

```
53. **DÙNG CSS CLASSES, KHÔNG HARDCODE** — Typography, buttons, cards, badges
    đều có class trong design-system.css. PHẢI dùng `.text-h1`, `.card-base`...
    KHÔNG viết `text-xl font-bold text-dark tracking-tight`. Grep codebase
    tìm `text-(xl|2xl|3xl).*font-bold` = hardcode cần fix.
```

---

## Migration Tracker

| Component | Hardcode | Migrated | Status |
|-----------|:--------:|:--------:|:------:|
| header.tsx | 2 | 0 | ⬜ |
| CrmLayoutClient.tsx | 1 | 0 | ⬜ |
| unified-modal.tsx | 1 | 0 | ⬜ |
| ux-states.tsx | 1 | 0 | ⬜ |
| login-transition.tsx | 1 | 0 | ⬜ |
| dashboard/page.tsx | 1 | 0 | ⬜ |
| login/page.tsx | 2 | 0 | ⬜ |
| LeadStats.tsx | 1 | 0 | ⬜ |
| CustomerStats.tsx | 1 | 0 | ⬜ |
| LeadDetail.tsx | 1 | 0 | ⬜ |
| CustomerDetail.tsx | 2 | 0 | ⬜ |
| **Total** | **14** | **0** | **0%** |

---

## Quick Commands
- Start Phase 01: `/code phase-01`
- Check progress: `/next`
