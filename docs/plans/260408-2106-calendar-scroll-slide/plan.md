# Plan: Calendar Scroll Wheel + Slide Animation (V1 Parity)
Created: 2026-04-08T21:06:00+07:00
Status: 🟡 In Progress (cần user manual test scroll wheel)
TypeScript: Pass — `tsc --noEmit` exit code 0
Build: Pass — `npm run build` exit code 0 (21:32)

## Overview
Port 2 tính năng V1 sang V2:
1. Scroll wheel chuyển tháng trên desktop (Google Calendar behavior)
2. Slide animation khi chuyển tháng (visual feedback)

## Tech Stack
- CSS: Đã có sẵn (`cal-slide-left`, `cal-slide-right`) trong `animations.css`
- React: state management cho `slideDirection` + `onWheel` handler

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01    | Scroll Wheel + Slide Animation | ✅ Complete | 100% |
| 02    | Verification | ✅ Complete (build/tsc), ⚠️ Manual test pending | 90% |

## Pending User Action
- [ ] Mở http://localhost:3000/calendar trên desktop browser
- [ ] Lăn chuột trên grid → xác nhận chuyển tháng + slide animation

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
