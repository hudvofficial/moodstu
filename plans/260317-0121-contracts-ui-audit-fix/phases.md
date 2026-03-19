# Phase 01: Global CSS Reset + Shared Utils
Status: ⬜ Pending
Dependencies: None

## Objective
- Thêm global CSS reset cho `select` element (kill browser default border)
- Tách `formatCurrency()` và `formatDate()` duplicate → `lib/format.ts`

## Tasks
1. [ ] **globals.css** — Thêm `select { border: none; outline: none; }` 
2. [ ] **lib/format.ts** — Tạo file shared: `formatCurrency()`, `formatDate()`, `formatCompact()`
3. [ ] **Xóa inline `style={{ border: 'none' }}`** từ contracts-dropdown-filters.tsx (Phase 01 fix global CSS thay thế)

## Files to Create/Modify
- `app/globals.css` — Thêm 1 rule
- `lib/format.ts` — Tạo mới
- `components/contracts/contracts-dropdown-filters.tsx` — Xóa inline styles

---

# Phase 02: Fix UI Shared Components
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Fix `border` → `shadow` trong 2 shared components: `ui/table.tsx` và `ui/select.tsx`

## Tasks
1. [ ] **table.tsx L23** — `border border-border` → `shadow-sm` (TableWrapper)
2. [ ] **table.tsx L37** — `border-b border-border` → bỏ (THead)
3. [ ] **table.tsx L45** — `divide-y divide-border/50` → bỏ (TBody)
4. [ ] **select.tsx L64** — `border-primary` → `ring-2 ring-primary/30` (focus)
5. [ ] **select.tsx L77** — `border border-border` → `shadow-lg` (dropdown)
6. [ ] **select.tsx L79** — `border-b border-border` → bỏ (search divider)

## Files to Modify
- `components/ui/table.tsx`
- `components/ui/select.tsx`

---

# Phase 03: Fix Contract Components
Status: ⬜ Pending
Dependencies: Phase 01, Phase 02

## Objective
Fix `border` trong missing-info-badge, progress-badge, contracts-dropdown-filters

## Tasks — missing-info-badge.tsx
1. [ ] **L58** — `border border-success/20` → bỏ ("Đầy đủ" badge)
2. [ ] **L79** — `border border-error/20` → bỏ ("Thiếu tin" badge)
3. [ ] **L88** — `border border-border` → bỏ (tooltip đã có shadow-xl)
4. [ ] **L90** — `border-t border-border/50` → `pt-3 mt-3` spacing only
5. [ ] **L115** — `border-l border-t border-border` (tooltip arrow) → bỏ border

## Tasks — progress-badge.tsx
6. [ ] **L113** — `border border-border` → `shadow-xs` ("Chưa có task")
7. [ ] **L128** — `border border-border/50` → bỏ (normal state)
8. [ ] **L165** — `border border-border` → bỏ (tooltip đã có shadow-xl)
9. [ ] **L216** — `border-l border-t border-border` (tooltip arrow) → bỏ border

## Tasks — contracts-dropdown-filters.tsx
10. [ ] **L38,54,79** — Xóa `border-none` class (global CSS đã xử lý)
11. [ ] **L39,55,80** — Xóa `style={{ border: 'none' }}` inline

## Tasks — contracts-table.tsx
12. [ ] **L88** — `border-collapse` → giữ (CSS table layout cần thiết)

## Files to Modify
- `components/contracts/missing-info-badge.tsx`
- `components/contracts/progress-badge.tsx`
- `components/contracts/contracts-dropdown-filters.tsx`

---

# Phase 04: Tạo FilterSelect Component
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Tạo lightweight FilterSelect thay thế native `<select>` hardcode

## Tasks
1. [ ] **Tạo `components/ui/filter-select.tsx`** — Compact select cho filter bars
2. [ ] **Refactor `contracts-dropdown-filters.tsx`** — Dùng FilterSelect thay native select
3. [ ] **Import formatCurrency** từ `lib/format.ts` thay duplicate
4. [ ] **Import formatDate** từ `lib/format.ts` thay duplicate

## Files to Create/Modify
- `components/ui/filter-select.tsx` — Tạo mới
- `components/contracts/contracts-dropdown-filters.tsx` — Refactor
- `components/contracts/contracts-table.tsx` — Import format.ts
- `components/contracts/contracts-stats.tsx` — Import format.ts

---

# Phase 05: Build + Verify
Status: ⬜ Pending
Dependencies: Phase 01-04

## Tasks
1. [ ] `npm run build` — Verify 0 errors
2. [ ] Grep check: `border-border|divide-border|inset_0_0_0_1px` = 0 kết quả trong contracts/

## Verification
- [ ] 0 border violations trong `components/contracts/`
- [ ] 0 border violations trong `components/ui/table.tsx`, `components/ui/select.tsx`
- [ ] All format functions use shared `lib/format.ts`
- [ ] No inline `style={{ border: 'none' }}` remaining
