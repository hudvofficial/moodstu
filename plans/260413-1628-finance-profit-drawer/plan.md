# Plan: Finance Profit Drawer
Created: 2026-04-13T16:28:00
Status: 🟡 In Progress

## Overview
Đồng bộ Báo cáo Lợi nhuận Hợp đồng từ V1 sang V2.
Bóc tách chi tiết: Doanh thu gói, Doanh thu phát sinh, CP Lương, CP In ấn, CP Vận hành.
Giao diện: Desktop Drawer + Mobile Card List tối ưu. SWR cho lazy loading chi tiết hợp đồng.

## Tech Stack
- Frontend: Next.js + SWR + Tailwind CSS (V2 Design Tokens)
- Backend: Supabase Server Actions
- Database: PostgreSQL (RPCs)
- TypeScript: Strict Type Checking

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Database Schema & Types | ✅ Complete | 100% |
| 02 | Backend API & RPC Actions | ✅ Complete | 100% |
| 03 | Frontend UI - Table & Mobile Mode | ⬜ Pending | 0% |
| 04 | Frontend UI - Detail Drawer | ⬜ Pending | 0% |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
