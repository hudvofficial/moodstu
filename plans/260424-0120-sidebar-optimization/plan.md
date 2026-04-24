# Plan: Tối ưu hiệu năng Sidebar (Xóa Prewarm & Pending State)
Created: 24/04/2026
Status: 🟡 In Progress

## Overview
Dọn dẹp triệt để tình trạng nghẽn mạng và "đơ" UI khi click hoặc di chuột vào menu bên trái. Loại bỏ cơ chế prefetch bằng Server Actions và các state thừa ép Sidebar phải re-render.

## Tech Stack
- Frontend: Next.js App Router (sử dụng `<Link>` mặc định và `usePathname`).
- Data Fetching: Loại bỏ Server Actions gọi từ client-side cho mục đích prefetch.

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Gỡ bỏ Pending State trong Sidebar | ⬜ Pending | 0% |
| 02 | Vô hiệu hóa Prewarm Data | ⬜ Pending | 0% |

## Quick Commands
- Bắt đầu Phase 1: `/code phase-01`
- Bắt đầu Phase 2: `/code phase-02`
- Lưu context: `/save-brain`
