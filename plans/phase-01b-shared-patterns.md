# Plan: Foundation Completion — 13 Shared Patterns

**Created:** 2026-03-16
**Status:** ⬜ Pending
**Scope:** Bổ sung 13 shared patterns còn thiếu từ plan.md Phase 01
**Goal:** Foundation 60% → 100%

---

## Overview

Phase 01 (Foundation) ghi nhận cần carry-over patterns từ V1/Coffee nhưng chưa implement hết.
Plan này bổ sung toàn bộ 13 patterns còn thiếu, chia 3 tiers theo urgency.

## Architecture

```
lib/swr.ts          ← SWR config + cache keys factory (Coffee)
lib/cache.ts        ← Server-side cached query (V1)
hooks/
  use-realtime.ts   ← Supabase realtime hook (V1, adapted SWR)
  use-infinite-scroll.ts  ← IntersectionObserver (Coffee)
components/ui/
  tabs-filter.tsx   ← Pill-style filter tabs (Coffee)
  search-bar.tsx    ← Responsive search input (Coffee)
  badge.tsx         ← ENUM → Color Map (custom)
  skeleton.tsx      ← Loading shimmer (custom, dùng CSS classes)
  avatar.tsx        ← Initials fallback (custom)
  date-picker.tsx   ← Native date input wrapper (custom)
  pagination.tsx    ← Page navigator (custom)
  kpi-card.tsx      ← Dashboard stat card (custom)
  fab-button.tsx    ← Mobile floating action (custom)
```

---

## Phases

| # | Phase | Files | Est. | Status |
|---|-------|-------|------|--------|
| A | Tier 1 — Core (MUST HAVE) | 5 files | ~15 min | ✅ |
| B | Tier 2 — Important (SHOULD HAVE) | 3 files | ~10 min | ✅ |
| C | Tier 3 — Nice to have (BUILD WHEN NEEDED) | 5 files | ~10 min | ✅ |
| D | Verify + Update docs | build + BRIEF + plan.md | ~5 min | ✅ |

**Total:** ~40 min, 13 files

---

## Phase A: Tier 1 — Core (5 files)

### A1. `lib/swr.ts` — SWR Cache Keys Factory
- **Source:** Coffee `lib/swr.ts` (53 lines)
- **Adapt:** Đổi keys từ Coffee (products, categories) → V2 (contracts, customers, leads, payments, inventory, dashboard)
- **Keep:** swrConfig, revalidate(), revalidateMultiple(), prefetch()
- **Output:** `lib/swr.ts` (~60 lines)

### A2. `components/ui/tabs-filter.tsx` — Filter Tabs
- **Source:** Coffee `TabsFilter.tsx` (29 lines)
- **Adapt:** Đổi `bg-surface` → `bg-bg-card`, `text-text-secondary` → V2 tokens, add `count` optional
- **Design System:** Dùng `--color-primary`, `--color-bg-card`, `--color-border`
- **Output:** `components/ui/tabs-filter.tsx` (~35 lines)

### A3. `components/ui/search-bar.tsx` — Search Input
- **Source:** Coffee `SearchBar.tsx` (24 lines)
- **Adapt:** Đổi `bg-surface` → V2 tokens, dùng `.input-base` từ design-system.css
- **Output:** `components/ui/search-bar.tsx` (~25 lines)

### A4. `components/ui/badge.tsx` — ENUM → Status Badge
- **Source:** Custom (design-specs.md color map)
- **Design:** Dùng `.badge` + `.badge-*` classes từ design-system.css
- **API:** `<Badge variant="success">Hoàn thành</Badge>`
- **Variants:** success, warning, error, info, neutral, primary, accent
- **Output:** `components/ui/badge.tsx` (~40 lines)

### A5. Toast (Sonner) — Setup
- **Source:** sonner (already installed)
- **Action:** Add `<Toaster />` vào root layout, tạo wrapper nếu cần
- **Design:** Earth-tone styling
- **Output:** Update `app/(protected)/layout.tsx` (~5 lines)

---

## Phase B: Tier 2 — Important (3 files)

### B1. `hooks/use-realtime.ts` — Supabase Realtime
- **Source:** V1 `hooks/useRealtime.ts` (147 lines)
- **Adapt CRITICAL:** V1 dùng `useQueryClient` (React Query) → V2 dùng `mutate` (SWR)
- **Keep:** Auth check, debounce, ConnectionStatus, filter, channelName
- **Remove:** React Query import, queryClient references
- **Replace:** `queryClient.invalidateQueries()` → `revalidateMultiple()` from lib/swr.ts
- **Output:** `hooks/use-realtime.ts` (~120 lines)

### B2. `lib/cache.ts` — Server-side Cached Query
- **Source:** V1 `lib/cache.ts` (198 lines)
- **Adapt:** Giữ nguyên logic (đã proven), chỉ clean types
- **Keep:** cachedQuery(), invalidateCache(), swrQuery(), hit rate monitor
- **Output:** `lib/cache.ts` (~180 lines)

### B3. `components/ui/skeleton.tsx` — Loading Shimmer Component
- **Source:** Custom (dùng `.skeleton` CSS class từ design-system.css)
- **API:** `<Skeleton className="h-4 w-32" />`, `<SkeletonCard />`, `<SkeletonTable rows={5} />`
- **Output:** `components/ui/skeleton.tsx` (~45 lines)

---

## Phase C: Tier 3 — Nice to have (5 files)

### C1. `hooks/use-infinite-scroll.ts` — Infinite Scroll
- **Source:** Coffee `useInfiniteScroll.ts` (38 lines)
- **Adapt:** Copy nguyên, thêm "use client" directive
- **Output:** `hooks/use-infinite-scroll.ts` (~38 lines)

### C2. `components/ui/avatar.tsx` — Avatar with Initials
- **Source:** Custom
- **API:** `<Avatar name="Nguyễn Văn A" src="/photo.jpg" size="md" />`
- **Fallback:** Hiển thị chữ cái đầu nếu không có ảnh
- **Colors:** Dùng `--color-primary` background
- **Output:** `components/ui/avatar.tsx` (~40 lines)

### C3. `components/ui/date-picker.tsx` — Native Date Input
- **Source:** Custom (wrapper native input[type=date])
- **API:** `<DatePicker label="Ngày cưới" value={date} onChange={setDate} />`
- **Design:** Dùng `.label-base` + `.input-base` từ design-system.css
- **Output:** `components/ui/date-picker.tsx` (~35 lines)

### C4. `components/ui/pagination.tsx` — Page Navigator
- **Source:** Custom
- **API:** `<Pagination page={1} totalPages={10} onChange={setPage} />`
- **Design:** `.btn-ghost` cho page numbers, `.btn-primary` cho active
- **Output:** `components/ui/pagination.tsx` (~50 lines)

### C5. `components/ui/kpi-card.tsx` — Dashboard Stat Card
- **Source:** Custom
- **API:** `<KPICard label="Doanh thu" value="125M" icon={TrendingUp} trend="+12%" />`
- **Design:** `.stats-card` + `.icon-box` + `.text-h2` + `.text-label`
- **Output:** `components/ui/kpi-card.tsx` (~45 lines)

---

## Phase D: Verify + Update Docs

### D1. Build verify
- `npm run dev` — no errors
- Check 13 files exist + correct imports

### D2. Update BRIEF.md
- Move 13 patterns từ ⚠️ → ✅

### D3. Update plan.md
- Bỏ Shadcn/ui reference
- Phase 01 status: ✅ Complete (fully)

### D4. Update phase-01-foundation.md
- Add 13 new files to "Files Created" list

---

## ⚠️ Rules

1. **KHÔNG đổi logic V1/Coffee** — chỉ adapt colors + imports
2. **KHÔNG thêm dependencies mới** — sonner đã installed
3. **Max 250 lines/file** — theo lessons.md
4. **Dùng V2 tokens** — `--color-*` từ globals.css, classes từ design-system.css
5. **useRealtime: SWR adapter** — V1 dùng React Query → V2 PHẢI đổi sang SWR
6. **cachedQuery: giữ nguyên** — V1 logic proven, chỉ adapt import paths

---

## Quick Start

```
/code phase-A    ← Tier 1 (5 core patterns)
/code phase-B    ← Tier 2 (3 important patterns)
/code phase-C    ← Tier 3 (5 nice-to-have)
/code phase-D    ← Verify + docs
```
