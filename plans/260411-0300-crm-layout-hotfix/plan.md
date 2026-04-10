# Plan: CRM Layout Hotfix (Mobile Container Collapse)
Created: 2026-04-11T02:40:00+07:00
Status: 🟡 In Progress

## Overview
Khắc phục lỗi vỡ UI nghiêm trọng trên màn hình điện thoại/tablet (hoặc màn hình chia nhỏ). 
Hiện tượng: Danh sách thẻ Lead bị bóp chiều cao về 0 (chỉ còn line vài pixel) và các Widgets bị kéo lên khu vực nội dung chính, tạo khoảng trắng lớn.
Nguyên nhân gốc: Sử dụng `flex-1` trong container `flex-col` (ở chế độ mobile) dẫn đến `flex-basis: 0` cho chiều cao, khiến toàn bộ block danh sách bị sập.

## Tech Stack
- Frontend: Next.js + Tailwind v4 (CSS Flexbox)

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Crm Dashboard Layout Fix | ✅ Complete | 100% |
| 02 | Lead Compact Card Safety | ✅ Complete | 100% |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
