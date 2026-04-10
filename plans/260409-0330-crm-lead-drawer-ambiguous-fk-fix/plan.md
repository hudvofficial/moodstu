# Plan: Crm Lead Drawer Ambiguous FK Fix
Created: 2026-04-09T03:30:00+07:00
Status: 🟡 In Progress

## Overview
Khắc phục lỗi "Loi server" hiển thị trên Lead Detail Drawer bằng cách fix Ambiguous Foreign Key trong `getLeadById` (do bảng `crm_leads` có cả `assigned_to` và `created_by` cùng references `employees`). Đồng thời nâng cấp bộ bắt lỗi trong `auth_utils.ts` để đọc được `PostgrestError` thay vì giấu dốt lỗi.

## Tech Stack
- Frontend: Next.js Server Actions, SWR
- Backend: Supabase PostgREST
- Database: PostgreSQL

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Cải thiện Error Handler (`auth_utils.ts`) | ✅ Complete | 100% |
| 02 | Khắc phục Ambiguous FK (`lead-actions.ts`) | ✅ Complete | 100% |
| 03 | Testing & Verification | ⬜ Pending | 0% |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
