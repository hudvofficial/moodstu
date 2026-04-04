# Plan: Printing Drawer Integration

Created: 260404-1102
Status: ✅ Complete

## Overview

Chuyển đổi UX của module Printing bằng cách thay thế `UnifiedModal` (hiển thị popup dialog giữa màn hình) bằng component UI chuẩn cốt lõi của hệ thống - `<Drawer>`. Chuyển đổi này mang lại một Side Panel sang trọng (rộng 650px) trên Desktop và màn trượt Bottom Sheet trên Mobile, xử lý vấn đề form dài bị tràn cuộn và đứt gãy trải nghiệm.

## Tech Stack

- Frontend: React (Next.js), Tailwind CSS
- Core UI: `components/ui/drawer.tsx`
- Target Files: `printing-form-modal.tsx` -> `printing-detail-drawer.tsx`, `printing-list-page.tsx`

## Phases

| Phase | Name                             | Status      | Progress |
| ----- | -------------------------------- | ----------- | -------- |
| 01    | Drawer Layout Component Setup    | ✅ Complete | 100%     |
| 02    | Responsive Grid & Sticky Footer  | ✅ Complete | 100%     |
| 03    | State Integration & Final Polish | ✅ Complete | 100%     |

## Quick Commands

- Bắt đầu triển khai Phase 1: `@/code phase-01`
- Update tiến độ hoặc xem bước tiếp theo: `@/next`
- Lưu lại nhận thức sau khi code: `@/save-brain`
