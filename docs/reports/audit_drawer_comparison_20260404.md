# Audit Report: Productivity Drawer vs Contract Drawer (Gold Standard)

**Date:** 2026-04-04  
**Scope:** Token compliance & SSOT adherence  
**Files audited:**

| Module        | Files                                                                                                  | Lines |
| ------------- | ------------------------------------------------------------------------------------------------------ | ----- |
| Productivity  | `productivity-detail-drawer.tsx`, `productivity-detail-content.tsx`, `productivity-detail-helpers.tsx` | 363   |
| Contract (GS) | `contract-drawer.tsx`, `drawer-tab-content.tsx`                                                        | 378   |
| Shared        | `ui/drawer.tsx`                                                                                        | 168   |

---

## Summary

- 🔴 Critical: 3
- 🟡 Warning: 4
- 🟢 Info: 2

---

## 🔴 Critical Issues

### C1. Productivity — task item dùng inline bg thay vì SSOT token

**File:** [productivity-detail-content.tsx](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/productivity/productivity-detail-content.tsx#L192)

```tsx
// ❌ INLINE — Productivity (line 192)
className = "rounded-xl bg-bg-base/50 px-3 py-3 shadow-xs";

// ✅ CHUẨN — Contract drawer (line 58)
className = "rounded-lg bg-bg-card px-3 py-3 shadow-xs";
```

**Vấn đề:** `bg-bg-base/50` là inline opacity hack, không có trong token system. Contract dùng `bg-bg-card` — đúng semantic token.

---

### C2. Productivity — thiếu typography tokens

**File:** [productivity-detail-content.tsx](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/productivity/productivity-detail-content.tsx)

Contract drawer xài typography token SSOT (`text-body-sm`, `text-tiny`, `text-caption`):

```tsx
// Contract — SSOT tokens
<span className="text-tiny font-bold text-primary/70">Dịch vụ</span>
<span className="text-body-sm font-bold text-primary">Wedding</span>
<h4 className="text-caption font-semibold text-text-secondary">Thanh toán</h4>
```

Productivity drawer chỉ dùng raw Tailwind:

```tsx
// Productivity — raw Tailwind ❌
<p className="text-sm text-text-secondary">  // text-sm ≠ text-body-sm
<p className="mt-2 text-2xl font-bold text-dark">  // text-2xl = inline size
<div className="text-sm text-text-muted">  // text-sm ≠ text-body-sm
```

**Token mapping cần áp dụng:**

| Productivity (hiện tại)   | Nên dùng (SSOT)                                             |
| ------------------------- | ----------------------------------------------------------- |
| `text-sm` (labels)        | `text-body-sm` (14px)                                       |
| `text-sm` (muted)         | `text-caption` (12px) hoặc `text-body-sm`                   |
| `text-2xl` (stat numbers) | `text-h3` (18px) hoặc giữ `text-2xl` vì đây là stat display |

---

### C3. Productivity — stat card thiếu semantic section tag

**File:** [productivity-detail-content.tsx](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/productivity/productivity-detail-content.tsx#L111)

```tsx
// ❌ Productivity — div soup
<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
  <div className="card-base p-4">...

// ✅ Contract — semantic section
<section className="card-base p-4">
```

**Vấn đề:** Accessibility — container nên dùng `<section>` cho screen readers, giống contract drawer.

---

## 🟡 Warnings

### W1. Contract drawer — border violations (V2 rule: shadows only)

**File:** [drawer-tab-content.tsx](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/contracts/drawer-tab-content.tsx)

```tsx
// ❌ Line 89: border trong pill cards
className = "... border border-primary/10";

// ❌ Line 95
className = "... border border-warning/10";

// ❌ Line 149: dashed border divider
className = "... border-t border-dashed border-border/50";
```

> Contract drawer (gold standard) cũng vi phạm V2 border rule. Nhưng đây KHÔNG thuộc scope productivity audit — chỉ ghi nhận.

---

### W2. Drawer.tsx — border-b trong header

**File:** [drawer.tsx](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/ui/drawer.tsx#L108)

```tsx
// Line 108 (Desktop) + Line 143 (Mobile)
className = "... border-b border-border";
```

Drawer SSOT component cũng dùng `border-b` cho header separator → vì đây là shared UI nên chấp nhận được (header separator = structural, không phải decorative).

---

### W3. Productivity — `text-dark` không phải SSOT token

```tsx
// Dùng nhiều lần trong productivity:
className = "font-semibold text-dark";
className = "text-2xl font-bold text-dark";
```

`text-dark` = `var(--color-dark)` = #3D2B1F (alias). Contract dùng `text-text-main` — đây là semantic token chính xác hơn. Cả hai đều resolve cùng color, nhưng `text-text-main` là chuẩn semantic.

---

### W4. Productivity — overdue section bg inline

**File:** [productivity-detail-helpers.tsx](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/productivity/productivity-detail-helpers.tsx#L49)

```tsx
className = "card-base bg-error/5 p-4 shadow-xs";
```

`bg-error/5` = inline override trên `card-base` (white). Chấp nhận được vì chưa có alert-card token, nhưng nên tạo `card-alert` token nếu pattern này lặp lại.

---

## 🟢 Info (Tốt)

### G1. Productivity — dùng đúng SSOT shared components

✅ `<Drawer>` — SSOT  
✅ `<Badge>` — SSOT  
✅ `<Button>` — SSOT  
✅ `<Skeleton>` — SSOT  
✅ `card-base` — CSS token  
✅ Lucide icons only

### G2. Productivity — file splitting chuẩn V2

✅ 3 files: drawer (61) + content (223) + helpers (79) — tất cả < 250 lines  
✅ Clean separation: shell → content → helpers

---

## Bảng so sánh tổng hợp

| Tiêu chí                 | Productivity        | Contract (GS)     | Verdict      |
| ------------------------ | ------------------- | ----------------- | ------------ |
| **Dùng `<Drawer>` SSOT** | ✅                  | ✅                | ✅ Match     |
| **Dùng `<Badge>` SSOT**  | ✅                  | ✅                | ✅ Match     |
| **Typography tokens**    | ❌ `text-sm`        | ✅ `text-body-sm` | 🔴 Fix       |
| **Stat number size**     | `text-2xl` (inline) | N/A               | 🟡 Chấp nhận |
| **Task item background** | ❌ `bg-bg-base/50`  | ✅ `bg-bg-card`   | 🔴 Fix       |
| **Semantic HTML**        | ❌ `<div>`          | ✅ `<section>`    | 🔴 Fix       |
| **Color token**          | `text-dark`         | `text-text-main`  | 🟡 Minor     |
| **Border violations**    | ✅ None             | ❌ 3 borders      | GS worse     |
| **File splitting**       | ✅ 3 files          | ✅ 6 files        | ✅ Both OK   |

---

## Fix Plan (nếu user approve)

### Phase 1: Token alignment (productivity-detail-content.tsx + helpers)

| #   | File                      | Thay đổi                                           | Priority |
| --- | ------------------------- | -------------------------------------------------- | -------- |
| F1  | `detail-content.tsx` L192 | `bg-bg-base/50` → `bg-bg-card`                     | 🔴       |
| F2  | `detail-content.tsx`      | `text-sm` → `text-body-sm` (labels/secondary text) | 🔴       |
| F3  | `detail-content.tsx`      | `text-dark` → `text-text-main`                     | 🟡       |
| F4  | `detail-content.tsx` L111 | `<div>` → `<section>` (stat grid, job groups)      | 🔴       |
| F5  | `detail-helpers.tsx`      | Giữ `bg-error/5` (chấp nhận inline cho alert)      | Skip     |

**Estimate:** ~15 phút, 2 files, chỉ class name changes — KHÔNG thay đổi logic.
