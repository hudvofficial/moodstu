# Plan: Expenses Module Parity & UI Synchronization
Created: 260414-1505
Status: 🟡 In Progress

## Overview
Đồng bộ toàn diện phân hệ Phiếu Chi (Expenses) theo chuẩn Production (Gold Standard) vừa áp dụng cho hệ thống Phiếu Thu (Receipts).

## Tech Stack
- Frontend: Next.js, Framer Motion, Tailwind CSS
- DB/Backend: Supabase, Server Actions (Optimistic Lock, Soft Delete)
- Audit: SWR key separation, TypeScript Strict.

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Server Action & Query Hardening | ✅ Complete | 100% |
| 02 | Types & Edit / Modal Flow | ✅ Complete | 100% |
| 03 | Desktop & Mobile UI Actions | ✅ Complete | 100% |
| 04 | Detail & Print Routes | ✅ Complete | 100% |
| 05 | Polish & Code verification | ✅ Complete | 100% |
| 06 | UI Refinements (Print & Table) | ✅ Complete | 100% |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
