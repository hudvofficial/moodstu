# Plan: Gallery Performance Fix
Created: 2026-03-23T23:34
Status: 🟡 In Progress

## Overview
Gallery public render 3,776 ảnh cùng lúc → Google Drive rate-limit, DOM lag, UX kém.
6 fixes, 3 files, 0 thư viện mới, 0 DB changes.

## Phases

| Phase | Name | Status | File |
|-------|------|--------|------|
| 01 | RAW Filter (Server) | ⬜ Pending | `gallery-actions.ts` |
| 02 | Infinite Scroll + Heart Filter + Remove Tabs | ⬜ Pending | `public-gallery-client.tsx` |
| 03 | Viewer UX (Mobile + Desktop) | ⬜ Pending | `image-viewer.tsx` |
| 04 | Verify | ⬜ Pending | Browser test |

## Quick Commands
- Start: `/code phase-01`
- Check progress: `/next`
