# Plan: Printing Group Drawer Standardization

Created: 260404-1116
Status: 🟡 In Progress

## Overview

Lột xác giao diện Danh sách Đơn In (`/printing`) bằng cách xoá bỏ cấu trúc Accordion lồng ghép (Inline, Hardcode child rows) để chuyển sang chuẩn "Drawer-first" y hệt module `/contract`. Toàn bộ dữ liệu hiển thị gọn gàng, Dòng/Thẻ trên cùng sẽ là Hợp Đồng. Click vào sẽ mở Panel trượt chứa các đơn in con.

## Tech Stack

- Frontend: React (Next.js), Tailwind CSS
- Core Component: `components/ui/drawer.tsx`
- Target Files: `printing-table.tsx`, `printing-mobile-grouped.tsx`, `printing-list-page.tsx`

## Phases

| Phase | Name                                 | Status      | Progress |
| ----- | ------------------------------------ | ----------- | -------- |
| 01    | Accordion Cleanup (Desktop & Mobile) | ✅ Complete | 100%     |
| 02    | Develop PrintingGroupDrawer UI       | ✅ Complete | 100%     |
| 03    | State Wiring & Integration           | ✅ Complete | 100%     |

## Quick Commands

- Start Phase 1: `@/code phase-01`
- Check progress: `@/next`
- Save context: `@/save-brain`
