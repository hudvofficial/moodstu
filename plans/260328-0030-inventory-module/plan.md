# Plan: Inventory Module (Kho Vật Tư Tiêu Hao)

Created: 2026-03-28
Status: 🟡 In Progress
Spec: [inventory.md](../../docs/specs/inventory.md)

## Overview

Module **độc lập**, quản lý vật tư tiêu hao (khung ảnh, album, standee, hoa, giấy in...).
Tách biệt hoàn toàn khỏi Dresses module. Follow Gold Standard (`module-blueprint.md`).

## V1 → V2 Migration Notes

- V1 source: `C:\Users\Admin\Desktop\Ai\0Moodstudio\webapp\app\actions\inventory.ts` (323L)
- V2 cải tiến: Zod validation, soft delete, optimistic locking, audit log, auto-gen item code
- V2 loại bỏ: `cachedQuery` server-side (dùng SWR client), hard delete, `withAdmin`

## Phases

| Phase | Name | Status | Files | Est. |
|-------|------|--------|-------|------|
| 01 | Schema (DB) | ✅ Complete | 2 migrations | Done |
| 02 | Actions (Backend) | ✅ Complete | 5 files | Done |
| 03 | UI (Frontend) | ⬜ Pending | 13 files | ~2 sessions |
| 04 | Verify (Testing) | ⬜ Pending | 0 files | ~0.5 session |

## Quick Commands

- Start Phase 2: `/code phase-02`
- Check progress: `/next`
- Save context: `/save-brain`
