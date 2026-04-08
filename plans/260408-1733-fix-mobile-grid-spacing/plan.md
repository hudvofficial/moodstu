# Plan: Fix Mobile Calendar Grid Bottom Space
Created: 2026-04-08T17:34:00+07:00
Status: 🟡 In Progress

## Overview
Khắc phục tình trạng "lưới lịch di động (mobile month grid) hiển thị vùng trống bị thừa ở dưới đuôi". Việc này đạt được bằng cách loại bỏ margin-bottom cứng ngắc, áp dụng kỹ thuật lưới `percentage-based grid tracks` (giống màn hình Desktop) và nẹp `absolute inset-0` để ngăn Flexible Container phình cao một cách thiếu kiểm soát trên các trình duyệt iOS/Webkit.

## Tech Stack
- Frontend: Next.js + TailwindCSS V4
- Components: `mobile-month-grid.tsx`

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Chế tác Grid Percentages & Loại bỏ Margin | ✅ Complete | 100% |
| 02 | V-GATE: Chụp Mobile View Audit | ✅ Complete | 100% |

## Quick Commands
- Chạy Phase 1: `/code phase-01`
- Chạy Audit V-GATE: `/code phase-02`
- Lưu context: `/save-brain`
