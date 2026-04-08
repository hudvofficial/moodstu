# Plan: Lịch Âm Mobile & Chỉnh Icon Header (Fix)
Created: 2026-04-08T18:45
Status: 🟡 In Progress

## Overview
Dựa trên kết quả Audit, bản patch này sẽ giải quyết 2 vấn đề về UI/UX trên Mobile Calendar:
1. **Lịch Âm bị thiếu:** Bổ sung logic hiển thị lịch Âm (`getLunarDate`) cho `mobile-month-grid.tsx` tương đương bản Desktop.
2. **Icon Header bị mỏng:** Tăng độ dày (`strokeWidth`) vàng thay đổi kích thước icon trên `calendar-toolbar.tsx` cho phù hợp yêu cầu.

## Tech Stack
- Frontend: Next.js + TailwindCSS + Lucide Icons + `lunar-calendar.ts`

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Cập nhật Component | ✅ Complete | 100% |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
