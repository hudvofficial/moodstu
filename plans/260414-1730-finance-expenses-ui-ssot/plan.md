# Plan: Finance Expenses UI SSOT
Created: 2026-04-14 17:30
Status: 🟡 In Progress

## Overview
Đồng bộ thiết kế giao diện của Phiếu chi (`/finance/expenses`) theo chuẩn SSOT hiện tại của Phiếu thu (`/finance/receipts`).
Bao gồm nâng cấp cấu trúc vùng chứa, thêm Component thống kê (ExpenseStatsBar), nâng cấp Component bộ lọc (ExpenseFilters/SelectPill), và hỗ trợ Mobile bằng nút bấm (FAB).

## Tech Stack
- Frontend: Next.js + TailwindCSS + Lucide Icons + SSOT UI Components
- Backend: Supabase RPC / Actions Queries
- Types: TypeScript

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Backend API (Stats Fetching) | ✅ Complete | 100% |
| 02 | Bổ sung Sub-components | ✅ Complete | 100% |
| 03 | Refactor Expenses Client Container | ✅ Complete | 100% |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
