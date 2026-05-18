# Plan: Contracts Audit Fix & Optimization
Created: 2026-05-18 19:07 +07
Status: 🟡 In Progress

## Overview
Kế hoạch khắc phục và tối ưu hóa các vấn đề hiệu năng và cấu trúc (được phát hiện trong quá trình Audit) của module Hợp đồng. 
Mục tiêu: Đảm bảo không sập server do OOM, giao diện mượt mà không bị treo, và code dễ bảo trì hơn.

## Tech Stack
- Frontend: Next.js Server Components, React Suspense
- Backend: Next.js Server Actions, Supabase (Aggregate Queries)
- Cache/Background: Next.js `after()`

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | 🚀 Quick Win: Thêm Loading Skeleton | ✅ Complete | 100% |
| 02 | 🔴 Sửa lỗi Critical: OOM & Main Thread Block | ✅ Complete | 100% |
| 03 | 🟡 Tái cấu trúc: Tách file & Chống Type Mù | ✅ Complete | 100% |
| 04 | ✅ Kiểm thử & Bàn giao | ✅ Complete | 100% |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
