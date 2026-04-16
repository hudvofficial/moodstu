# Plan: Phục hồi Business Logic Bảng Lương (Từ V1 lên V2)
Created: 260416-0535
Status: 🟡 In Progress

## Overview
Do quá trình chuyển đổi sang Server Actions của V2, module Bảng Lương đã trở thành Read-only và bị vô hiệu hóa toàn bộ năng lực Nghiệp vụ Kế toán từ V1 (Missing: In phiếu lương, Theo dõi đã trả/còn lại, Cảnh báo trước khởi tạo, Thanh toán/Xóa nợ). Khôi phục lại sức mạnh V1 dựa trên chuẩn UI/Architect của V2.

## Tech Stack
- Frontend: Next.js + TailwindCSS + SelectPill + V2 SSOT Modals
- Backend: Supabase Server Actions
- Database: monthly_salaries, employee_salaries

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Cấu trúc lại Schema & API (Tích hợp Tracking) | ⬜ Pending | 0% |
| 02 | Pre-flight Warnings (Cảnh báo thông minh) | ⬜ Pending | 0% |
| 03 | Tracking Công Nợ & Cột Logic UI (Đã thanh toán) | ⬜ Pending | 0% |
| 04 | Chức năng Phụ trợ (In Phiếu Lương, Thanh toán, Xóa) | ⬜ Pending | 0% |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
