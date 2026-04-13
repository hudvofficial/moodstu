# Plan: Finance Dashboard V2 Blueprint Standardization
Created: 2026-04-13T12:20:00+07:00
Status: 🟡 In Progress

## Overview
Đưa màn hình Tổng quan Tài chính (`/finance`) về đúng chuẩn **V2 Module Blueprint**. Giải quyết triệt để sự thiếu đồng bộ về Layout (không dùng `main-container`), Component (dùng `SimpleSelect` thay vì `SelectPill`, tự viết `CompactBar` thay vì dùng shared `StatsBar`), và trùng lặp tính năng (nút bấm inline bừa bãi).

## Tech Stack
- Frontend: Next.js + Tailwind React (SSOT V2 Tokens)
- Core Shared Components: `<SelectPill>`, `<StatsBar>`, `<TabsFilter>`

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Cấu trúc Layout (Architecture) | ✅ Complete | 100% |
| 02 | Chuẩn hóa Bộ lọc (Filters) | ✅ Complete | 100% |
| 03 | Chuẩn hóa Thẻ Số (Stats Bar) | ⬜ Pending | 0% |
| 04 | Tối ưu Banner & Dọn dẹp | ⬜ Pending | 0% |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
