# Plan: Finance FAB Standardization (V2 SSOT)
Created: 2026-04-13T10:17:00
Status: 🟡 In Progress

## Overview
Thay thế \`finance-fab.tsx\` có hiệu ứng menu kềnh càng bằng Component \`<FAB>\` gốc của hệ thống (SSOT), kết hợp gọi một Drawer/Action Sheet chuyên nghiệp lướt từ dưới lên để hiện các hành động nhanh. Qua đó đạt 100% chuẩn V2 Design.

## Tech Stack
- UI Components: \`components/ui/fab.tsx\` (Dumb UI Component)
- State Mgt: Quản lý trạng thái mở Drawer tại Layout cha (tuân thủ nguyên tắc SWR & UI Component phân tách).

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Xây dựng Action Drawer | ✅ Complete | 100% |
| 02 | Tích hợp Layout & Cleanup code thừa | ✅ Complete | 100% |

## Quick Commands
- Bắt đầu Phase 1: \`/code phase-01\`
- Xem tiến độ: \`/next\`
