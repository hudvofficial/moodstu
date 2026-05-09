# Plan: Inventory Module Polish — SSOT + UI + Performance
Created: 2026-05-08T23:25
Status: 🟡 Planning

## Overview
Polish toàn diện module Inventory: siết SSOT token, fix UI inconsistency, tối ưu tốc độ.
3 nhóm: SSOT Cleanup → UI Fix → Performance Optimization.

## Tech Stack
- Framework: Next.js 16.x (App Router, RSC)
- Database: PostgreSQL via Supabase RPC
- Cache: SWR v2
- Realtime: Supabase Realtime channels
- Design System: SSOT tokens (contract-constants.ts)

## Phases

| Phase | Name | Status | Tasks | Est. |
|-------|------|--------|-------|------|
| 01 | SSOT Payment Method Centralize | ✅ Done | 7 | 45m |
| 02 | UI Consistency — Stock-out Modal | ✅ Done | 3 | 30m |
| 03 | Realtime Channel Consolidation | ✅ Done | 3 | 30m |
| 04 | Detail Page — Single RPC + Skeleton | ✅ Done | 5 | 2h |
| 05 | QA & Verification | ✅ Done | 4 | 30m |

**Tổng:** 22 tasks | Ước tính: ~4 giờ

## Projected Impact

```
                              TRƯỚC          SAU
SSOT violations (payment):    6 files        0
UI pattern consistency:       Mixed          100% SimpleSelect
Realtime channels (list):     2 separate     1 multi-table
Detail page round-trips:      3 queries      1 RPC
Detail perceived load:        Blank wait     Instant skeleton
```

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`

## Risk Assessment
- 🟢 Phase 01-02: Pure refactor, 0 breaking change, 0 DB migration
- 🟢 Phase 03: Behavioral equivalent (same data, fewer channels)
- 🟡 Phase 04: New RPC cần tạo migration, nhưng fallback-safe
- 🟢 Phase 05: Verification only
