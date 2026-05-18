# Plan: Optimize Contract Detail Performance (Zero Downtime)
Created: 260509-1316
Status: 🟡 In Progress

## Overview
Tối ưu hóa độ trễ (latency) khi tải chi tiết hợp đồng bằng cách chuyển 8 truy vấn song song thành 1 RPC duy nhất, đồng thời bật Server-Side Rendering (SSR) cho trang chi tiết để loại bỏ thời gian chờ tải Skeleton (Cold start), mà không làm thay đổi bất kỳ logic giao diện hay dữ liệu nào của user.

## Tech Stack
- Database: PostgreSQL (Supabase RPC)
- Backend/Frontend: Next.js Server Actions, SWR.

## Core Strategy (Safe Logic)
Chiến lược là "Thay ruột, giữ vỏ":
1. Trả về đúng 100% cấu trúc object JSON mà UI đang mong đợi. UI sẽ không biết là dữ liệu đến từ 8 query hay 1 RPC.
2. Viết RPC mới, không sửa hay xóa dữ liệu cũ. Giữ nguyên hàm cũ để fallback nếu RPC lỗi.

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Database Schema (RPC) | ⬜ Pending | 0% |
| 02 | Backend API (Action) | ⬜ Pending | 0% |
| 03 | Frontend (SSR + Hydration) | ⬜ Pending | 0% |
| 04 | Testing & Verification | ⬜ Pending | 0% |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
