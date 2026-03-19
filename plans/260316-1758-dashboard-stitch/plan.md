# Plan: Dashboard (Stitch UI)
Created: 2026-03-16T17:58:00+07:00
Status: 🟡 In Progress

## Overview
Xây dựng Dashboard tổng quan dựa trên thiết kế Stitch "Mood Studio Management Dashboard" (Desktop/Tablet) và "Mood Studio Mobile Dashboard" (Mobile). Dashboard cung cấp cái nhìn toàn cảnh về doanh thu, KPI kinh doanh, hợp đồng sắp tới và các khoản cần thanh toán.

## Tech Stack
- Frontend: Next.js (RSC cho KPIs), Tailwind CSS (Earth-Tone)
- Charts: Recharts (Line, Pie donut)
- Backend: Supabase RPC (Atomic Calculations)
- Fetching: SWR (Client cho charts)

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Thu thập Dữ liệu (Backend RPC) | ✅ Complete | 100% |
| 02 | Dựng UI Desktop / Tablet       | ✅ Complete | 100% |
| 03 | Tối ưu UI Mobile responsive    | ✅ Complete | 100% |
| 04 | Tích hợp & Render Data         | ⬜ Pending | 0% |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
