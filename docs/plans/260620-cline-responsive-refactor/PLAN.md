# PLAN: Refactor Cline's iPad Portrait Layout — Align với 3-tier System

**Date:** 2026-06-20  
**Lead:** Claude (planning + review)  
**Coder:** Codex 5.5  
**Status tổng thể:** 🔴 TODO

---

## Bối cảnh & Vấn đề

Cline (sáng 20/06) implement responsive layout cho iPad A16 Portrait theo hướng **thêm tier thứ 4 (820px)**, vi phạm constraint cứng trong CLAUDE.md:

> *"Responsive 3-tier (chốt 2026-06-06): Phone <768px · Tablet 768–1023px · Desktop ≥1024px"*

### Những gì Cline đã làm (unstaged, chưa commit):

| File | Thay đổi |
|------|----------|
| `lib/breakpoints.ts` | Thêm `ipadPortrait: 820` + `tabletPortrait` media query |
| `hooks/use-mobile.ts` | Thêm `useIsTabletPortrait()` hook |
| `app/styles/layout.css` | Thêm `.detail-shell-page` (4-tier breakpoints) + `.detail-sidebar-sticky` |
| `components/layout/fullpage-form-shell.tsx` | Dùng `.detail-shell-page`, thêm "5-tier" grid logic |
| `components/contracts/detail/detail-layout-sections.tsx` | Dùng `.detail-sidebar-sticky` |
| `app/(protected)/contracts/*/page.tsx` | Comment update (cosmetic) |
| `components/contracts/form/ContractFinancialSummary.tsx` | Styling tweak |
| `components/ui/safe-responsive-container.tsx` | Fix requestAnimationFrame ✅ |
| `hooks/use-scroll-direction.ts` | Chỉnh scroll behavior |
| `components/ui/table.tsx` | Minor tweak |
| `components/printing/printing-detail-drawer.tsx` | Minor tweak |
| E2E tests | Cập nhật test fixtures cho iPad layout |

### Root cause của vấn đề

1. **Device-specific breakpoint**: `ipadPortrait: 820` dựa trên tên thiết bị, không phải content. iPad A17 = 834px, Samsung Tab = khác → maintenance hell.
2. **Hybrid CSS paradigm**: Project dùng Tailwind v4 (`@theme` trong globals.css). `.detail-shell-page` dùng raw CSS media query thay vì `md:` utilities — tạo 2 paradigm song song.
3. **4-tier thay vì 3-tier**: Breakpoints 768/820/1024/1280/1536 phá vỡ mental model team.

### Những gì cần GIỮ (hợp lý)

- ✅ Ý tưởng unify layout token cho DETAIL/EDIT/CREATE (DRY)
- ✅ `.detail-sidebar-sticky` CSS class (consistent với pattern `.detail-grid` hiện có)
- ✅ `.detail-shell-page` CSS class concept (chỉ sửa breakpoints)
- ✅ Fix `SafeResponsiveContainer` với `requestAnimationFrame`
- ✅ Max-width cap cho form trên tablet (content readability)

---

## Hướng giải quyết

**Giữ CSS class `.detail-shell-page` + `.detail-sidebar-sticky`, nhưng:**
- Xóa breakpoint 820px → dùng `768px` (`md:`) làm threshold cho tablet
- Xóa `ipadPortrait` khỏi `lib/breakpoints.ts`
- Xóa `useIsTabletPortrait()` hook
- Cập nhật comment để phản ánh đúng 3-tier

**Lý do không dùng Tailwind utilities cho `.detail-shell-page`:**  
Project đã có pattern CSS classes (`detail-grid`, `detail-main`, `detail-sidebar`) trong `layout.css` — nhất quán hơn là dùng CSS class thay vì `@apply` hay inline utilities phức tạp.

**Breakpoint mapping sau refactor:**

| Tier | Width | Max-width container | Grid |
|------|-------|---------------------|------|
| Phone | < 768px | full | 1 col |
| Tablet | 768–1023px (`md:`) | max-w-2xl (672px) | 1 col (form quá hẹp cho 2 col) |
| Desktop | 1024–1279px (`lg:`) | max-w-5xl (1024px) | 2 col — 6/4 ratio |
| Large Desktop | 1280–1535px (`xl:`) | max-w-7xl (1280px) | 2 col — 8/4 ratio |
| Ultra-wide | ≥1536px (`2xl:`) | 88rem (1408px) | 2 col — 8/4 ratio |

---

## Tasks (Execute theo thứ tự — mỗi task độc lập với nhau)

### TASK 1 — Xóa ipadPortrait khỏi `lib/breakpoints.ts`
**Status:** ⬜ TODO  
**File:** `lib/breakpoints.ts`  
**Action:**
1. Xóa entry `ipadPortrait: 820` trong object `BREAKPOINTS`
2. Xóa block comment `// ─── 4-tier sub-band (820/1024)` và entry `tabletPortrait` trong object `mediaQueries`
3. Giữ nguyên tất cả entries còn lại

**Verify:** `grep -n "ipadPortrait\|tabletPortrait\|820" lib/breakpoints.ts` → phải ra 0 kết quả

---

### TASK 2 — Xóa `useIsTabletPortrait()` khỏi `hooks/use-mobile.ts`
**Status:** ⬜ TODO  
**File:** `hooks/use-mobile.ts`  
**Action:**
1. Xóa toàn bộ function `useIsTabletPortrait()` (JSDoc + function body)
2. Kiểm tra: không có nơi nào import `useIsTabletPortrait` trong codebase (grep trước khi xóa)

**Verify:** `grep -rn "useIsTabletPortrait" .` → 0 kết quả ngoài file đã xóa

---

### TASK 3 — Sửa `.detail-shell-page` trong `app/styles/layout.css`
**Status:** ⬜ TODO  
**File:** `app/styles/layout.css`  
**Action:** Thay thế toàn bộ block `2b. DETAIL SHELL PAGE` (hiện dùng 820px) bằng:

```css
/* ══════════════════════════════════════
   2b. DETAIL SHELL PAGE (3-tier)
   Wrapper chung cho DETAIL / EDIT / CREATE forms
   Max-width theo 3-tier: full / 672 / 1024 / 1280 / 1408
   Mobile-first: full-width; tablet (≥768) trở lên thì center + cap width
   ══════════════════════════════════════ */

.detail-shell-page {
  width: 100%;
  margin-left: auto;
  margin-right: auto;
}

/* Tablet (768-1023px): 1-col form — cap 672px cho readability */
@media (min-width: 768px) and (max-width: 1023.98px) {
  .detail-shell-page {
    max-width: 42rem; /* 672px */
    padding-left: var(--spacing-lg, 1.5rem);
    padding-right: var(--spacing-lg, 1.5rem);
  }
}

/* Desktop (1024-1279px): 2-col layout — cap 1024px */
@media (min-width: 1024px) and (max-width: 1279.98px) {
  .detail-shell-page {
    max-width: 64rem; /* 1024px */
  }
}

/* Large desktop (1280-1535px): cap 1280px */
@media (min-width: 1280px) and (max-width: 1535.98px) {
  .detail-shell-page {
    max-width: 80rem; /* 1280px */
  }
}

/* Ultra-wide (≥1536px): cap 1408px */
@media (min-width: 1536px) {
  .detail-shell-page {
    max-width: 88rem; /* 1408px */
  }
}
```

**Verify:** `grep -n "820" app/styles/layout.css` → 0 kết quả

---

### TASK 4 — Sửa `components/layout/fullpage-form-shell.tsx`
**Status:** ⬜ TODO  
**File:** `components/layout/fullpage-form-shell.tsx`  
**Action:** Sửa JSDoc comment table và inline comments:
1. Đổi JSDoc table từ "5-TIER" → "4-TIER" (phone/tablet/desktop/ultra-wide — không có tablet-portrait)
2. Sửa row "tablet-portrait" thành "tablet" với min-width 768px
3. Xóa mention "Tier 2 migration" — thay bằng "3-tier alignment"
4. Xóa inline comment nói về `min-[820px]:max-lg:max-w-2xl`
5. Giữ nguyên tất cả logic code (className, grid, etc.) — chỉ sửa comments

**JSDoc table mới:**
```
| Tier         | Width range  | Container            | Grid                     | Right panel |
|--------------|--------------|----------------------|--------------------------|-------------|
| phone        | < 768        | full                 | single col               | hidden      |
| tablet       | 768 – 1023   | max-w-2xl (672)      | single col               | hidden      |
| desktop      | 1024 – 1279  | max-w-5xl (1024)     | 2-col 10 grid, ratio 6/4 | sticky      |
| large-desktop| 1280 – 1535  | max-w-7xl (1280)     | 2-col 12 grid, ratio 8/4 | sticky      |
| ultra-wide   | ≥ 1536       | max-w-[88rem] (1408) | 2-col 12 grid, ratio 8/4 | sticky      |
```

**Verify:** `grep -n "820\|ipadPortrait\|tablet-portrait\|Tier 2\|5-tier\|5-TIER" components/layout/fullpage-form-shell.tsx` → 0 kết quả

---

### TASK 5 — Verify không có file nào còn reference 820 hoặc ipadPortrait
**Status:** ⬜ TODO  
**Action (grep check, không sửa code):**
```bash
grep -rn "820\|ipadPortrait\|tabletPortrait\|useIsTabletPortrait" \
  --include="*.ts" --include="*.tsx" --include="*.css" \
  --exclude-dir=node_modules --exclude-dir=.next \
  .
```
Nếu còn kết quả nào (ngoài E2E tests và docs) → báo cáo để fix thêm.

---

### TASK 6 — Cập nhật E2E tests nếu cần
**Status:** ⬜ TODO (pending kết quả Task 5)  
**Files:** 
- `tests/e2e/contracts-tablet-ipad.spec.ts`
- `tests/e2e/printing-ui-tablet.spec.ts`

**Action:** Nếu tests hardcode viewport 820px thì đổi về 768px (đúng với tablet tier). Nếu tests test behavior đúng (layout, visibility) thì giữ nguyên — chỉ đổi viewport width.

---

## Review Checklist (Claude review sau mỗi task Codex hoàn thành)

- [ ] `lib/breakpoints.ts`: Không còn `ipadPortrait`, `tabletPortrait`, số `820`
- [ ] `hooks/use-mobile.ts`: Không còn `useIsTabletPortrait`
- [ ] `layout.css`: `.detail-shell-page` dùng `768px` thay vì `820px`; giá trị max-width không đổi
- [ ] `fullpage-form-shell.tsx`: Comment đúng 4-tier; code logic không bị break
- [ ] Build pass: `pnpm build` không có error
- [ ] Responsive verify: @768px (tablet start), @1023px (tablet end), @1024px (desktop start)

---

## Success Criteria

1. `grep -rn "ipadPortrait\|820px\|tabletPortrait\|useIsTabletPortrait"` trong source (excl. node_modules, .next, E2E) → **0 kết quả**
2. `pnpm build` → **pass, 0 error**
3. Form DETAIL/EDIT/CREATE render đúng trên:
   - Phone 375px: full width, 1 col
   - Tablet 768px: max-w-2xl, 1 col, sidebar ẩn
   - Desktop 1024px: max-w-5xl, 2 col, sidebar sticky
4. CLAUDE.md constraint thoả mãn: 3-tier system nguyên vẹn

---

### TASK 7 — Align `.detail-grid` grid ratio với form shell
**Status:** ⬜ TODO  
**File:** `app/styles/layout.css`  
**Vấn đề:** `.detail-grid` CSS class dùng fixed 12-col 8/4 ở mọi desktop width. Form shell (`fullpage-form-shell.tsx`) dùng 10-col 6/4 tại `lg:` (1024-1279px) và 12-col 8/4 tại `xl:` (1280px+). Kết quả: detail sidebar hẹp hơn (341px vs 410px) và left content quá rộng ở lg viewport.

**Action:** Tìm block `/* Desktop: grid 12 cột (≥1024px) */` và thay toàn bộ:

```css
/* Desktop (1024-1279px): 10-col grid, 6/4 ratio — khớp với form shell lg: */
@media (min-width: 1024px) {
  .detail-grid {
    display: grid;
    grid-template-columns: repeat(10, minmax(0, 1fr));
    gap: var(--spacing-lg, 24px);
  }
  .detail-main {
    grid-column: span 6 / span 6;
  }
  .detail-sidebar {
    display: flex;
    grid-column: span 4 / span 4;
  }
}

/* Large desktop (1280px+): 12-col grid, 8/4 ratio — khớp với form shell xl: */
@media (min-width: 1280px) {
  .detail-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: var(--spacing-xl, 32px);
  }
  .detail-main {
    grid-column: span 8 / span 8;
  }
}
```

**Verify:**
- Mở contract detail @1100px → sidebar rộng hơn trước (4/10 col = 410px vs cũ 4/12 = 341px)
- Mở contract detail @1400px → grid 8/4 trên 12 col, gap rộng hơn
- `pnpm build` pass

---

## Review Checklist (Claude review sau mỗi task Codex hoàn thành)

- [ ] `lib/breakpoints.ts`: Không còn `ipadPortrait`, `tabletPortrait`, số `820` ✅
- [ ] `hooks/use-mobile.ts`: Không còn `useIsTabletPortrait` ✅
- [ ] `layout.css`: `.detail-shell-page` dùng `768px` thay vì `820px` ✅
- [ ] `layout.css`: `.detail-grid` dùng 10-col 6/4 tại lg, 12-col 8/4 tại xl ⬜
- [ ] `fullpage-form-shell.tsx`: Comment đúng 4-tier; code logic không bị break ✅
- [ ] Build pass: `pnpm build` không có error ✅
- [ ] Visual verify: detail @1100px sidebar rộng hơn cũ ⬜

---

## Ghi chú cho Codex

- Chỉ sửa đúng những file và dòng được chỉ định
- Không refactor code xung quanh
- Không xóa logic — chỉ xóa breakpoint 820 và rename comments
- Sau mỗi task, báo cáo exact lines đã đổi để reviewer check
