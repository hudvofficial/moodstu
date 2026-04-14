# Plan: Receipt Modal & Print Decoupling
Created: 2026-04-14 11:52
Status: 🟡 In Progress

## Overview
Chuyển đổi giao diện Chi tiết Phiếu Thu từ 1 trang (Page RSC) sang Popup Modal dùng Unified SSOT Component, đồng thời trích xuất layout Bản In (Print) sang một đường dẫn độc lập chuyên dụng.

## Tech Stack
- Frontend: Next.js App Router (RSC + Client Components), TailwindCSS, UnifiedModal.
- Architecture: Decoupled Print Route + Fetch on Modal mount.

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Bóc tách & Tạo Component | ✅ Complete | 100% |
| 02 | Móc vào Table Row Actions | ✅ Complete | 100% |
| 03 | Thiết lập Dedicated Print Route | ✅ Complete | 100% |
| 04 | Testing & Tinh chỉnh CSS | ✅ Complete | 100% |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
