# Plan: CRM Drawer → Gold Standard (Printing 1:1)
Created: 2026-04-10T13:18
Updated: 2026-04-10T15:07
Status: 🟢 Hoàn tất

## Overview
Tái cấu trúc **LeadDetailDrawer** và **CustomerDetailDrawer** để đạt 1:1 parity với **PrintingDetailDrawer** (Gold Standard) về Visual UI, UX Flow, Component Architecture — trên CẢ mobile (375px) VÀ desktop (1440px).

**Nguyên tắc #1:** TUYỆT ĐỐI dùng SSOT tokens + shared components có sẵn. KHÔNG inline viết riêng.

## Benchmark (SSOT)
- **Gold Standard:** `components/printing/printing-detail-drawer.tsx`
- **Audit Brief:** `audit_crm_drawer_brief.md`

---

## 🔑 SSOT LOOKUP TABLE (Bắt buộc tuân thủ mọi phase)

### A. CSS Tokens (từ `app/styles/`)

| Nhu cầu UI | ✅ SSOT Token | ❌ KHÔNG DÙNG |
|------------|--------------|--------------|
| Card container | `card-base` (cards.css) | `bg-surface shadow-xs rounded-xl` inline |
| Card tương tác | `card-interactive` (cards.css) | `hover:shadow-md hover:translate-y-[-2px]` inline |
| Stats highlight | `stats-card` (cards.css) | `bg-linear-to-br from-primary/5 p-5 rounded-2xl` inline |
| Label | `label-base` (forms.css) | `text-xs font-semibold text-text-muted uppercase` inline |
| Input/Select | `input-base` (forms.css) | `border rounded-lg p-2 bg-surface` inline |
| 2-col desktop grid | `form-grid-2col` (forms.css) | `grid grid-cols-2 gap-4` inline |
| Form buttons row | `form-actions` (forms.css) | `flex justify-end gap-3 pt-2` inline |
| Section heading | `form-section-heading` (forms.css) | `text-xl font-semibold text-text` inline |
| Section title | `section-title` (tables.css) | custom heading classes |

### B. Shared Components (từ `components/ui/`)

| Nhu cầu | ✅ Component SSOT | ❌ KHÔNG DÙNG |
|---------|-------------------|--------------|
| Status badge | `<Badge variant="success">` (badge.tsx) | `<span className="px-2.5 py-1 text-xs rounded-full bg-green-100">` inline |
| Status→Variant | `getStatusVariant(status)` (badge.tsx) | Manual `STATUS_BADGE_COLORS[status]` custom map |
| Confirm popup | `<ConfirmDialog>` | Custom modal |
| Drawer | `<Drawer width="650px" titleBadge={...}>` | Custom sheet |
| Loading | `<Skeleton>` (skeleton.tsx) | `<div className="animate-pulse bg-bg-muted/40">` inline |

### C. Performance Patterns (từ `lib/swr.ts`)

| Pattern | ✅ SSOT Cách làm | ❌ KHÔNG DÙNG |
|---------|-----------------|--------------|
| Detail cache key | `cacheKeys.leadDetail(id)` | `"lead-detail-" + id` hardcode |
| List cache key | `cacheKeys.leads()` | `"leads"` hardcode |
| Customer detail | `cacheKeys.customerDetail(id)` | `"customer:" + id` hardcode |
| Fetcher | `useSWR(key, fetcher)` | `useEffect + useState` manual |
| Mutate after save | `globalMutate(cacheKeys.leadDetail(id))` | `router.refresh()` full-page |
| Zero-loading | `useSWR(key, fetcher, { fallbackData })` | Skeleton luôn hiện |
| Config | `swrConfig` export (swr.ts) | Custom config per-component |

---

## Responsive Coverage

| Layer | Mobile (375px) | Desktop (1440px) |
|-------|---------------|-----------------|
| Drawer width | Full-screen (`w-full`) | `650px` (Printing chuẩn) |
| Info layout | 1 cột DataRow | `form-grid-2col` cho cặp trường ngắn |
| Hero header | Tên + Badge + SĐT | Tên + Badge + SĐT + Email inline |
| Footer | Sticky bottom, full-width buttons | Sticky, [Huỷ] trái / [Đóng+Chốt] cụm phải |
| CareLog | Compact chat bar | Compact chat bar (giống mobile) |

---

## Phases

| Phase | Name | Scope | Status |
|-------|------|-------|--------|
| 01 | LeadDetailDrawer Refactor | UI + SWR + SSOT tokens | ✅ Completed |
| 02 | CustomerDetailDrawer Refactor | UI + SWR + SSOT tokens | ✅ Completed |
| 03 | LeadCareLog Compact | Nén form nhật ký | ✅ Completed |
| 04 | Verify & Lint | ESLint + Browser mobile + desktop | ✅ Completed |
| 05 | Edit Logic Sync | Gộp LeadFormModal vào Drawer + Tối ưu SWR | ✅ Completed |
| 06 | Drawer Size Customization | Tokenize Drawer Widths (480px, 600px) | ✅ Completed |

## Quick Commands
- Start: `/code phase-06`
- Check progress: `/next`
