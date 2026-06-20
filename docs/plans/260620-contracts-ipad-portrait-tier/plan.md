# Implementation Plan: Contracts Edit — iPad Portrait Tier

> **Date:** 2026-06-20
> **Status:** 🟡 In Progress
> **Author:** @hudvofficial (auto-generated)
> **Parent plan:** `docs/plans/260617-tablet-ux-foundation/plan.md`

## Overview

Desktop layout cho `/contracts/[id]/edit` đã được fix xong (Hướng A trước đó).
Tuy nhiên plan tablet foundation hiện tại gộp chung 768-1023px làm 1 tier "tablet", chưa phân biệt được **iPad Portrait 820px** (hẹp hơn landscape 1024+).

Plan này tách thêm 1 sub-tier **tablet-portrait (820-1023)** để:
- Single column (không nhét 2-col 6/4 vào viewport 820 vì sẽ bị nén)
- Container max-width vừa phải (max-w-2xl ~672px) để form rộng rãi, dễ đọc
- FormActions vẫn fixed bottom (mobile-like) vì không có chỗ cho sticky panel

## Scope

| In | Out |
|---|---|
| `/contracts/[id]/edit` | Module khác (CRM, Lịch, ...) |
| `/contracts/create` | iPad Landscape (đã có ở PoC trước) |
| Thêm `useIsTabletPortrait` hook | Tái cấu trúc FormActions |
| Refactor `FullpageFormShell` cho tier riêng | Sidebar (đã OK) |

## Task List

### Phase 1: Foundation hook (SSOT)
- [ ] Task 1.1: Thêm `useIsTabletPortrait()` vào `hooks/use-mobile.ts` (range 820-1023)
- [ ] Task 1.2: Thêm `BREAKPOINTS.ipadPortrait = 820` + `mediaQueries.tabletPortrait` vào `lib/breakpoints.ts`

### Phase 2: Refactor FullpageFormShell
- [ ] Task 2.1: Import `useDeviceTier()` từ `@/hooks/use-mobile`
- [ ] Task 2.2: Thêm prop `tier?: "phone" | "tablet-portrait" | "tablet-landscape" | "desktop"` (default: auto)
- [ ] Task 2.3: 4 layout modes:
  - **phone** (<820): 1 col, max-w-2xl mx-auto, pb-24 cho fixed footer
  - **tablet-portrait** (820-1023): 1 col, max-w-2xl mx-auto, pb-24, padding lớn hơn (px-6)
  - **tablet-landscape** (1024-1279): 2 col grid 10, ratio 6/4, sidebar sticky
  - **desktop** (≥1280): 2 col grid 12, ratio 8/4, sidebar sticky
- [ ] Task 2.4: Giữ nguyên logic `rightPanel` ẩn/hiện theo tier

### Phase 3: Apply cho create page
- [ ] Task 3.1: Bỏ wrapper `max-w-5xl mx-auto` ở `/contracts/create/page.tsx` (giống edit)

### Phase 4: Verify
- [ ] Task 4.1: `tsc --noEmit` pass
- [ ] Task 4.2: `eslint .` pass
- [ ] Task 4.3: Manual screenshot 3 viewport (Desktop 1440, iPad Ngang 1180, iPad Dọc 820)
- [ ] Task 4.4: Chạy `playwright test tests/e2e/contracts-tablet-ipad.spec.ts`

## Risks

| Risk | Mitigation |
|---|---|
| Phá vỡ layout Desktop hiện tại | Default tier vẫn giữ logic cũ; chỉ thêm case mới |
| Hydration mismatch khi dùng JS hook | Fallback null cho tới khi mounted (giống TierSwitch) |
| iPad Portrait KHÔNG thấy sidebar (mobile-like) | OK vì plan tablet foundation đã force icon-only sidebar w-20 trên tablet |
| `useDeviceTier()` default là lg cutoff → Portrait thành tablet | OK vì em sẽ check `window.innerWidth` trực tiếp thay vì qua tier |

## Architecture Decision

**Vì sao dùng CSS responsive (md:/lg:/xl:) thay vì `<TierSwitch>`?**

FullpageFormShell là wrapper chung. Mỗi page dùng nó sẽ tự quyết định tier layout.
- ✅ Đơn giản hơn: không cần tách 3 component con
- ✅ Tận dụng CSS responsive native, không mount/unmount
- ✅ `useDeviceTier()` chỉ cần khi PHẢI swap component hoàn toàn (vd list view: cards vs table)
- ✅ Form cùng 1 component, chỉ đổi layout → CSS đủ dùng

Em sẽ dùng CSS responsive + 1 prop `tier` optional để caller override (nếu sau này cần).
