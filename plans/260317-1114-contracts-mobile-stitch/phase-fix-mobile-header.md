# Plan: Fix Mobile Contract Detail — Stitch 1:1
Created: 2026-03-18T01:46
Status: ✅ Complete
Audit: `audit-mobile-header-scroll.md`

## Overview
So sánh 1:1 toàn bộ mobile Contract Detail (375px) với Stitch SSOT.
Tìm được 3 Critical + 5 Warning. Chia 3 phases fix. ALL DONE.

## Phases

| Phase | Name | Status | Tasks | Files |
|-------|------|--------|-------|-------|
| 01 | Fix Header + CSS Token | ✅ Complete | 4/4 | top-action-bar, contract-detail-client, design-system |
| 02 | Fix MobileTabNav scroll + opacity | ✅ Complete | 5/4 (+1 bonus) | mobile-tab-nav |
| 03 | Style refinements (dots + bottom bar) | ✅ Complete | 4/4 | workflow-stepper, mobile-bottom-bar |

---

## Phase 01: Fix Header + CSS Token ✅
- [x] **1.1** CSS token `--header-mobile-h: 3.5rem` + `.mobile-header-spacer`
- [x] **1.2** Mobile header: `sticky top-0` → `fixed top-0 left-0 right-0`
- [x] **1.3** Mobile header: `font-bold` → `font-semibold` (Stitch weight 600)
- [x] **1.4** Spacer class `mobile-header-spacer` vào contract-detail-client

## Phase 02: Fix MobileTabNav ✅
- [x] **2.1** `window.scrollY` → `el.offsetTop` + `scrollEl.scrollTo`
- [x] **2.2** IntersectionObserver `root: scrollEl` (bind #main-scroll)
- [x] **2.3** `bg-bg-primary/95 backdrop-blur-sm` → `bg-bg-primary` (solid)
- [x] **2.4** `sticky top-14` → `sticky top-0` (header giờ là fixed ngoài flow)

## Phase 03: Style Refinements ✅
- [x] **3.1** Workflow dots: `bg-emerald-500` → `bg-interactive`
- [x] **3.2** Workflow line: `bg-emerald-500` → `bg-interactive`
- [x] **3.3** Workflow text: `text-emerald-600` → `text-interactive`
- [x] **3.4** Bottom bar: `bg-bg-primary/95` → `bg-bg-primary`
