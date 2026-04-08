# Plan: Fix Lunar Converter UI
Created: 260408-1651
Status: 🟡 In Progress

## Overview
Tối ưu hóa UI của modal SolarLunarConverter. Xóa bỏ các giá trị CSS fix cứng, chuyển sang sử dụng toàn bộ Token chuẩn của hệ thống (Design System) để đồng bộ giao diện. Chỉnh sửa logic CSS Grid để input "Năm" không bị cắt mất chữ số. Khắc phục lỗi modal bị cấn sát viền (trên/dưới).

## Tech Stack
- Frontend: Next.js + TailwindCSS + Radix UI (UnifiedModal)

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Frontend UI Fix | ✅ Complete | 100% |
| 01b | Spin Button Xóa Sổ & Căn Giữa | ✅ Complete | 100% |
| 02 | V-GATE Audit & Verification | ⬜ Pending | 0% |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
