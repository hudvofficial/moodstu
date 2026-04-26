# Plan: Đồng bộ màu sắc sự kiện Google Calendar
Created: 2026-04-08 15:56
Status: ✅ Complete

Update 2026-04-26:
- Google events render with native/fallback hex color on desktop cards and mobile grid.
- Employee/group metadata stays hidden for Google-sourced events.
- No separate toolbar sync button is part of this scope; Google sync remains automatic through existing calendar actions.

## Overview
Cập nhật giao diện thẻ sự kiện trên Calendar Grid để hiển thị đúng màu Solid gốc (Hex Code) của Google Calendar API.
Đồng thời, ẩn các thông tin (nhân sự, nhãn hợp đồng) dưới tiêu đề đối với các sự kiện lấy từ Google.

## Tech Stack
- Frontend: TailwindCSS, React, FullCalendar (Dnd-Kit)

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Frontend UI Cập nhật DraggableEvent & CalendarEventCard | ✅ Complete | 100% |
| 02 | Kiểm tra & Hoàn tất | ✅ Complete | 100% |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
