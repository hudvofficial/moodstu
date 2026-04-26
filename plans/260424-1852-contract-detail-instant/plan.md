# Plan: Contract Detail — Instant Navigation
Created: 2026-04-24T18:52
Status: ✅ Complete

Update 2026-04-26:
- Added client-side error state for cold-start/detail fetch failures (no infinite skeleton).
- `requireContractAccess()` now reuses cached employee context from `auth_utils`.
- Verified with `npx tsc --noEmit` and `npm run build`.

## Overview
Tối ưu tốc độ load trang "Chi tiết hợp đồng" từ ~2.5s xuống < 100ms (warm cache).
Kỹ thuật chính: Client-First Detail Page — dùng SWR cache từ drawer prefetch.

## Tech Stack
- Server Actions: contract-queries.ts
- Client: SWR hooks, useContractDetail, ContractDetailClient
- Auth: withAuth, requireContractAccess (React.cache)
- Realtime: 9 subscriptions (giữ nguyên)

## Phases

| Phase | Name | Status | Est. Impact | Files |
|-------|------|--------|-------------|-------|
| 00 | 🔴 Fix Regression: List Badges | ✅ Done | BUG FIX | 1 file |
| 01 | Client-First Detail Page | ✅ Done | ~2,000ms (warm cache → instant) | 3 files |
| 02 | Parallelize + Slim Query | ✅ Done | ~500ms (cold start) | 1 file |
| 03 | Cache Auth + Employee Hook | ✅ Done (in Phase 01) | ~350ms (cold start) | 2 files |

> ⚠️ **REGRESSION DETECTED:** Phase 02 cũ (session trước) bỏ `work_tasks` + `contract_checklists`
> khỏi list query → "Tiến độ" hiện "Chưa có task" + "Thông tin" hiện "—" cho tất cả HĐ.

## Performance Targets

| Scenario | Before | After |
|----------|--------|-------|
| Warm cache (từ drawer) | ~2,500ms | **< 100ms** |
| Cold start (URL trực tiếp) | ~2,500ms | **< 800ms** |
| Repeat visit (SWR cached) | ~2,500ms | **< 100ms** |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
