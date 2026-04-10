# Plan: Chuyên đề Tối Ưu CRM (Phase 2)
Created: 2026-04-09T03:42:00+07:00
Status: 🟡 In Progress

## Overview
Xử lý dứt điểm 3 vấn đề tối ưu của hệ thống CRM Lead Drawer:
1. Đẩy quá trình tính toán thống kê (getLeadStats) xuống thẳng DB RPC để tiết kiệm RAM server.
2. Cho phép Sale nhận/nhả lead (unassign) về null.
3. Chống re-render thừa thải cho Frontend bằng cách gọi SWR mutate theo cụm khóa tĩnh.

## Tech Stack
- Frontend: Next.js Server Actions, SWR
- Backend: Supabase PostgREST, DB RPC.
- Database: PostgreSQL

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 00 | DB Schema Hotfix (Khóa ngoại) | ✅ Complete | 100% |
| 01 | Database Stats (RPC) | ✅ Complete | 100% |
| 02 | RBAC: Assign Logic | ✅ Complete | 100% |
| 03 | Frontend: SWR Optimization | ✅ Complete | 100% |
| 04 | Testing | ⬜ Pending | 0% |

## Quick Commands
- Start Phase 00 (Khẩn cấp): `/code phase-00`
- Start Phase 01: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
