# Plan: Settings Module Standardization (V2 Gold Standard)
Created: 2026-04-02
Status: 🟡 In Progress

## Overview
Cải tổ toàn bộ module Settings để đạt chuẩn V2 Gold Standard:
- Layout full-width (main-container)
- Detail Grid 8/4 cho Studio Settings
- Audit Logs route hoạt động
- 100% SSOT tokens, 0% hardcoded inline

## Tech Stack
- Frontend: Next.js 14 + React 19 + Tailwind CSS v4
- Backend: Supabase Server Actions + Zod + Audit Logs
- SSOT: layout.css (main-container, detail-grid), forms.css, typography.css

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Container Standard | ✅ Complete | 100% |
| 02 | Detail Grid & Optimistic UI | ⬜ Pending | 0% |
| 03 | Audit Logs Route | ⬜ Pending | 0% |
| 04 | Component Cleanup & Icon Sync | ⬜ Pending | 0% |

## SSOT Token Map (Phase 01)
| Element hiện tại | Token SSOT thay thế |
|---|---|
| `px-4 py-4 lg:max-w-2xl lg:mx-auto space-y-4` | `main-container` |
| Suspense fallback hardcoded className | `main-container` |

## Quick Commands
👉 Bước tiếp theo: `/code phase-01`
