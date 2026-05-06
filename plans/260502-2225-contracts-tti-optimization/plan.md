# Plan: Contracts TTI Optimization — 2.3s → <400ms
Created: 2026-05-02T22:25
Status: 🟢 Implemented

## Overview
Tối ưu Time-To-Interactive của module `/contracts` từ ~2.3s xuống <400ms.
5 tầng fix: Skeleton streaming → Auth speedup → Thin shell → Single RPC → Realtime consolidation.

## Tech Stack
- Framework: Next.js 16.1.6 (App Router, RSC)
- Auth: Supabase Auth (getClaims local JWT)
- Database: PostgreSQL via Supabase RPC
- Cache: SWR v2
- Realtime: Supabase Realtime channels

## Phases

| Phase | Name | Status | Progress | Est. |
|-------|------|--------|----------|------|
| 01 | Instant Skeleton — `loading.tsx` | ✅ Done | 100% | 15m |
| 02 | Auth Waterfall Kill — `getClaims()` | ⚠️ Code done, project config pending | 80% | 30m |
| 03 | Thin Server Shell — SWR-first | ✅ Done | 100% | 1h |
| 04 | Single RPC — `get_contract_list_v2` | ✅ Done | 100% | 2h |
| 05 | Realtime Channel Consolidation | ✅ Done | 100% | 1h |

**Tổng:** 15 tasks | Ước tính: ~5 giờ

## Projected Impact

```
                              TRƯỚC        SAU
Perceived TTI (skeleton):    1200ms+       ~55ms
Data Ready:                   -           ~355ms
Full Interactive:            2300ms       ~405ms
```

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`

## Implementation Notes
- Phase 02: `getAuthenticatedUserContext()` already uses `getClaims()` by default in the current codebase. The contracts route guard was kept to avoid widening access. Project anon JWT header is currently `HS256`, so Supabase may still need an Auth roundtrip for verified claims until the project uses asymmetric JWT signing keys.
- Phase 04: `getContractList()` now tries `get_contract_list_v2()` first and safely falls back to the legacy query if the RPC fails.
- Phase 05: contract list and detail now use one multi-table realtime channel per screen.

## QA Notes — 2026-05-03
- RPC correctness passed for default, search, status, service, page 2, oldest, amount desc, amount asc.
- Remote RPC benchmark on current prod-sized dataset: avg 98ms, p50 94ms, p95 119ms across 25 calls.
- Realtime static verification: `/contracts` list has 0 `useRealtime()` calls and 1 `useRealtimeMulti()` with 6 table configs; detail has 0 `useRealtime()` calls and 1 `useRealtimeMulti()` with 9 table configs.
- Remaining limit: benchmark with 100+ contracts needs staging/seed data; current remote DB sample used by the test has 2 contracts.
