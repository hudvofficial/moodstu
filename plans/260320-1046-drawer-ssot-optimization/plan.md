# Plan: Contract Drawer — SSOT & Full Optimization
Created: 2026-03-20T10:46:30+07:00
Status: 🟡 In Progress

## Overview
Fix toàn bộ Contract Drawer system: loại bỏ hardcode, đồng bộ shared constants (SSOT), fix bugs, và đảm bảo data pipeline hoạt động end-to-end.

## Nguyên tắc
- **ZERO hardcode**: Mọi enum/labels đều từ `types/contract-constants.ts`
- **DB enum = snake_case**: `ngay_chup`, `hau_ky`, `chup_anh`...
- **Contract-constants.ts = SSOT**: 1 file duy nhất cho display labels
- **V1 patterns**: Tham khảo V1 proven patterns, port sang V2 chuẩn

## Phases

| Phase | Name | Status | Files |
|-------|------|--------|-------|
| 01 | Shared Constants SSOT | ✅ Complete | `types/contract-constants.ts` |
| 02 | Drawer Event Timeline fix | ✅ Complete | `drawer-event-timeline.tsx` |
| 03 | Drawer Assignments fix | ✅ Complete | `drawer-assignments.tsx` |
| 04 | Drawer Checklist fix (race + sync) | ✅ Complete | `drawer-checklist.tsx` |
| 05 | Drawer Notes SWR upgrade | ✅ Complete | `drawer-notes.tsx` |
| 06 | Detail page sync | ✅ Complete | `detail/event-timeline.tsx` |
| 07 | Auto-gen debug + backfill | ✅ Complete (logging) | `contract-mutations.ts` |
| 08 | Contract-drawer.tsx typing | ✅ Complete | `contract-drawer.tsx` |

## Quick Commands
- ~~Start: `/code phase-01`~~ ✅ ALL PHASES COMPLETE
- Check progress: `/next`
