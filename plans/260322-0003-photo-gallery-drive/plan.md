# Plan: Photo Gallery từ Google Drive
Created: 2026-03-22T00:03
Status: 🟡 In Progress

## Overview
Tính năng cho phép Admin dán link Google Drive folder vào hợp đồng → App lấy metadata ảnh (file ID, tên file) → Tạo public gallery → Khách xem + thả tim ❤️ → Admin filter ảnh được chọn.

## Brainstorm Context
- Tham khảo ShotPik (đối thủ trực tiếp — VN)
- Quy trình: Admin up ảnh Drive → dán link → khách chọn → admin filter
- KHÔNG tốn storage — chỉ lưu metadata
- Ảnh hiển thị trực tiếp từ Google Drive thumbnail URL

## DB Tables Hiện Có
✅ `galleries` — Đã có: id, contract_id, title, access_url, password, status, selection_deadline, shared_at, created_by
✅ `gallery_images` — Đã có: id, gallery_id, image_url, thumbnail_url, sort_order, is_selected, client_note

## Cần Bổ Sung DB
- `galleries`: thêm `drive_folder_id` (VARCHAR) — ID folder Google Drive
- `gallery_images`: thêm `file_name` (VARCHAR) — tên file gốc trên Drive
- `gallery_images`: thêm `drive_file_id` (VARCHAR) — ID file trên Drive

## Tech Stack
- Frontend: Next.js + Vanilla CSS (design tokens từ globals.css)
- Backend: Server Actions (withAuth pattern)
- Database: Supabase PostgreSQL (galleries + gallery_images)
- External: Google Drive API v3 (chỉ đọc, 1 lần khi sync)
- Image Display: Google Drive thumbnail URL (không download/proxy)

## Phases

| Phase | Name | Status | Tasks | Est. |
|-------|------|--------|-------|------|
| 01 | DB Migration + Google API Setup | ⬜ Pending | 5 | 1 session |
| 02 | Server Actions (Backend) | ⬜ Pending | 6 | 1 session |
| 03 | Admin UI — Contract Detail Drive Block | ⬜ Pending | 7 | 1-2 sessions |
| 04 | Public Gallery Page (Khách xem + chọn) | ⬜ Pending | 8 | 2 sessions | 
| 05 | Admin Filter + Export | ⬜ Pending | 5 | 1 session |
| 06 | Testing + Polish | ⬜ Pending | 4 | 1 session |

**Tổng: ~35 tasks | ~6-7 sessions**

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
