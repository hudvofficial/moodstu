# Plan: Services Module V2 Migration
Created: 2026-03-30T13:33:00+07:00
Status: 🟡 In Progress
Spec: [services.md](../../docs/specs/services.md)

## Overview
Migrate Services module từ V1 → V2 Gold Standard. Đảm bảo **V2 = V1 + tối ưu + đồng bộ**.
18 features từ V1 đều phải có mặt, không thiếu.

## Tech Stack
- Frontend: Next.js 15 + SWR + nuqs
- Backend: Server Actions (withAuth + Zod + fireAuditLog)
- Database: Supabase PostgreSQL (RLS)
- UI: SSOT Design System (TableSuite, UnifiedModal, CSS tokens)

## Phases

| Phase | Name | Tasks | Status | Progress |
|-------|------|-------|--------|----------|
| 1a | Core Infrastructure | 6 | ✅ Complete | 100% |
| 1b | List Page (Desktop + Mobile) | 8 | ⬜ Pending | 0% |
| 1c | Form + CRUD | 8 | ⬜ Pending | 0% |
| 1d | Quote System | 3 | ⬜ Pending | 0% |
| 2 | Bundle & Advanced | 7 | ⬜ Pending | 0% |

**Tổng:** 32 tasks | Ước tính: 4-5 sessions

## V1 Feature Parity Tracker

| # | V1 Feature | Phase | Status |
|---|-----------|-------|--------|
| 1 | Services CRUD (create/edit/delete) | 1a+1c | ✅ (backend) |
| 2 | Service List (table + grid views) | 1b | ⬜ |
| 3 | ServiceRow Desktop (expand/collapse) | 1b | ⬜ |
| 4 | ServiceRow Mobile (flex compact) | 1b | ⬜ |
| 5 | ServiceCard (grid card) | 1b | ⬜ |
| 6 | Stats Strip (4 metrics) | 1b | ⬜ |
| 7 | Category Filter (chip pills) | 1b | ⬜ |
| 8 | View Toggle (list ↔ grid) | 1b | ⬜ |
| 9 | Search (mobile icon + desktop inline) | 1b | ⬜ |
| 10 | Category Manager (CRUD modal) | 1c | ⬜ |
| 11 | Service Code Auto-gen (SV-NNNN) | 1a | ✅ |
| 12 | Content Editor (JSON sections) | 1c | ⬜ |
| 13 | Service Form (info + price + content) | 1c | ⬜ |
| 14 | Quote Modal (popup báo giá) | 1d | ⬜ |
| 15 | Quote View (full-page print) | 1d | ⬜ |
| 16 | Quote Preview (in-form live) | 1d | ⬜ |
| 17 | Bundle Section (manual mode) | 2 | ⬜ |
| 18 | Empty State | 1b | ⬜ |

## Quick Commands
- Start Phase 1a: `/code phase-1a`
- Check progress: `/next`
- Spec reference: `docs/specs/services.md`

## SSOT Protocols (Bắt buộc trước mọi code)
1. **AUTO-SCAN**: grep 3 commands (before-edit.md §3)
2. **APPROVAL GATE**: Request cho new tokens/components
3. **V-GATE**: Browser screenshot BEFORE fixing UI
