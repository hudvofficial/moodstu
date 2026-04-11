# Plan: CRM Analytics Widget Migration
Created: 2026-04-11 09:50
Status: ✅ Complete

## Overview
Tối ưu hóa UI/UX của trang CRM Lead List:
- Loại bỏ nút toggle "Phân tích".
- Chuyển biểu đồ "Phễu chuyển đổi" (Sales Funnel) sang trạng thái hiển thị cố định ở cột widgets bên phải, kết hợp cùng biểu đồ "Nguồn khách" (Source) đã có sẵn.

## Tech Stack
- Frontend: Next.js, TailwindCSS, Lucide React
- Pattern: SSOT Widgets Sidebar

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | UI Layout Migration & Refactor | ✅ Complete | 100% |

## Notes
- Tính năng này được migrate trực tiếp từ thành phần `LeadAnalytics` rườm rà cũ sang một Widget tập trung gọn nhẹ `WidgetSalesFunnel`.
- Đảm bảo tính nhất quán với Apple HIG/Stripe design standard (cấu trúc Sidebar Widgets 2 cột).
