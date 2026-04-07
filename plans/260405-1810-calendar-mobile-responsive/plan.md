# Plan: Calendar Mobile Responsive

Created: 2026-04-05 18:10
Status: 🟡 In Progress

## Overview

V2 Calendar trên mobile viewport (375px) đang không sử dụng được:

- Toolbar desktop render thẳng → tràn màn hình
- Filter labels + CTA button quá dài
- Thiếu swipe navigation giữa các tháng
- Thiếu Google sync button + source badge "G"

V2 đã có sẵn: `MobileMonthGrid`, `DayDrawer` (bottom sheet), `Drawer` (auto bottom sheet), `isSmallScreen` toggle.

## V1 Reference

- Production: https://admin.moodwedding.com/schedules
- V1 mobile có: compact toolbar, bottom nav, bottom sheet day detail, Board view

## Phases

| Phase | Name                       | Status     | Files                                                                    |
| ----- | -------------------------- | ---------- | ------------------------------------------------------------------------ |
| M1    | Mobile Toolbar Compact     | ⬜ Pending | `calendar-toolbar.tsx`                                                   |
| M2    | Swipe Navigation + Touch   | ⬜ Pending | `calendar-wrapper.tsx`, `mobile-month-grid.tsx`                          |
| M3    | Google Sync + Source Badge | ⬜ Pending | `calendar-toolbar.tsx`, `calendar-event-card.tsx`, `draggable-event.tsx` |

## Quick Commands

- Start Phase M1: `/code phase-m1`
- Check progress: `/next`
