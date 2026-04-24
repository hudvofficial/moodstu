# Plan: V2 Performance Port — Áp dụng kỹ thuật tối ưu từ V1
Created: 2026-04-24T08:51
Status: 🟡 In Progress

## Overview
Port các kỹ thuật tối ưu hiệu năng đã proven từ V1 (0Moodstudio) sang V2 (mood-studio).
Dựa trên audit report: `v1_vs_v2_perf_audit.md`

## Scope
- ✅ 8 kỹ thuật thiếu (đã loại Offline Banner — V2 đã có `OfflineIndicator`)
- ❌ Không bao gồm: Unit Testing (quá lớn, tách plan riêng)
- ❌ Không bao gồm: Migrate SWR → React Query (quá rủi ro, giữ SWR)

## Phases

| Phase | Name | Status | Impact | Effort |
|-------|------|--------|--------|--------|
| 01 | Quick Wins (TopLoader + DNS + Font Cache) | ⬜ Pending | 🔥🔥 | Tiny |
| 02 | Cold-Start UX (Smart Splash Screen) | ⬜ Pending | 🔥🔥 | Small |
| 03 | PWA Hardening (Supabase REST NetworkFirst) | ⬜ Pending | 🔥🔥 | Tiny |
| 04 | SWR Persist Layer (IndexedDB cold-start survival) | ⬜ Pending | 🔥🔥🔥 | Medium |
| 05 | Smart Prefetch on Hover (nhẹ nhàng, SWR-based) | ⬜ Pending | 🔥🔥 | Medium |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
