# Plan: Hybrid Event System
Created: 2026-03-21 15:01
Status: 🟡 In Progress

## Overview
Cho phép admin thêm event tùy chỉnh vào lịch trình hợp đồng (Hybrid Model).
- Template auto-generate 80% events (đã có)
- Admin tùy chỉnh 20% còn lại (CẦN BUILD)
- Admin giao task cho nhân viên (đã có)

## Context từ Audit
- ✅ 7 components đã sẵn sàng (task CRUD, assign, overlap, auto-sync)
- 🔴 2 critical gaps (addContractEvent action + UI button)
- 🟡 1 warning (deleteContractEvent)
- Dùng `is_manual_date` + `title` có sẵn, KHÔNG cần DB migration

## Tech Stack
- Backend: Server Actions (withAuth pattern)
- Frontend: React components (event-timeline, add-event-modal)
- Database: Supabase (contract_events table — NO schema change)

## Phases

| Phase | Name | Status | Progress | Est. |
|-------|------|--------|----------|------|
| 01 | Backend Actions | ✅ Complete | 100% | 30 min |
| 02 | Add Event Modal | ✅ Complete | 100% | 45 min |
| 03 | Wire UI + Integration | ✅ Complete | 100% | 20 min |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
