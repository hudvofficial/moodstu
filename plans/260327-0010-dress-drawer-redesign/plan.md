# Plan: Dress Drawer Layout Redesign
Created: 2026-03-27 00:10
Status: 🟡 In Progress

## Overview
Refactor `DressDrawerContent` InfoSection từ layout stack dọc → flex row ngang (ảnh + info cùng hàng), theo đúng Stitch mockup screen `88d6fe1f6be04071b2f44545a1dd6477`.

## Design Source
- **Stitch HTML:** [stitch_drawer_mockup.html](file:///C:/Users/Admin/.gemini/antigravity/brain/854e9fac-a9ce-4b8b-856c-f44c71522da3/stitch_drawer_mockup.html)
- **SSOT Tokens:** `components.css`, `typography.css`, `pages.css`, `forms.css`

## Scope
- ✅ InfoSection layout (image + info side-by-side)
- ✅ Action buttons (stack → 1 hàng ngang)
- ✅ Token sync (SSOT compliance)
- ❌ KHÔNG đổi logic/data/server actions
- ❌ KHÔNG đổi Sections 3-4 layout (Rental history, Reservations)

## Phases

| Phase | Name | Status | Tasks |
|-------|------|--------|-------|
| 01 | V-GATE: Screenshot + Compare | ✅ Complete | 3 |
| 02 | Refactor InfoSection + Buttons | ✅ Complete | 7 |
| 03 | Verify + Build | ✅ Complete | 4 |

## Quick Commands
- Start: `/code phase-01`
- Check progress: `/next`
