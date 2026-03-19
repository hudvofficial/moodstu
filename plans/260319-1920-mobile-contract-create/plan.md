# Plan: Mobile Responsive — /contracts/create
Created: 2026-03-19T19:21
Status: 🟡 In Progress

## Overview
Fix mobile layout cho trang tạo/sửa hợp đồng. Hiện tại mobile (375px) bị vỡ layout do grid 12 cột cố định + sidebar hiện sai. Cần chuyển sang 1 cột trên mobile, giữ nguyên desktop.

## Audit Reference
- Trait-by-trait audit: `audit_mobile_create_trait.md`
- Stitch screen: `ff4733fd5c184da4b14279ad1a95c1e2` — "Create Contract Mobile V2 Luxury Form"

## Root Cause
`app/styles/pages.css` — `.detail-grid`, `.detail-main`, `.detail-sidebar` không responsive.
CSS class override Tailwind responsive (lesson #57).

## Phases

| Phase | Name | Status | Files |
|-------|------|--------|-------|
| 01 | CSS Grid Responsive | ✅ Complete | `app/styles/pages.css` |
| 02 | S4+S5 Mobile Inline | ✅ Complete | `components/contracts/form/index.tsx` |
| 03 | Footer Polish | ✅ Complete | `components/contracts/form/FormActions.tsx` |
| 04 | Verify | ✅ Complete | (browser check) |

## Scope Guard
- ❌ KHÔNG sửa desktop layout
- ❌ KHÔNG sửa sub-components (S1, S2, S3 — đã OK)
- ❌ KHÔNG refactor fullpage-form-shell.tsx
- ✅ CHỈ fix responsive CSS + mobile inline S4/S5 + footer polish
