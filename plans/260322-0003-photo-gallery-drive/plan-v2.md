# Plan V2: Quản Lý File Ảnh & Drive (Nâng Cấp)
Created: 2026-03-22T08:26
Status: ✅ DONE
Based on: BRIEF-v2.md

## Overview
Nâng cấp module gallery từ "1 folder inline" → "Quản lý File ảnh & Drive" hoàn chỉnh.
3 loại link (gốc/đã sửa/chọn in), tracking retouch, download proxy, gộp RAW/JPG.

## Tech Stack
- Frontend: Next.js + Vanilla CSS (design tokens từ globals.css)
- Backend: Server Actions (withAuth pattern)
- Database: Supabase PostgreSQL (galleries + gallery_images)
- External: Google Drive API v3 (đọc + download proxy)
- Download: Server-side proxy (Edge Function hoặc API Route)

## Phases

| Phase | Name | Status | Tasks | Est. |
|-------|------|--------|-------|------|
| 01 | DB Migration (folder_type + file_group) | ✅ Complete | 4/4 | 30 phút |
| 02 | Server Actions (multi-folder + download proxy) | ✅ Complete | 8/8 | 1 session |
| 03 | Admin UI — "Quản lý File ảnh & Drive" block | ✅ Complete | 7/7 | 1 session |
| 04 | Gallery Full Page + Gộp RAW/JPG | ✅ Complete | 8/8 | 1 session |
| 05 | Download Feature (mobile + desktop) | ✅ Complete | 6/6 | 1 session |
| 06 | Tracking Retouch + Ngày trả file | ✅ Complete | 5/5 | (done in P02+P03) |
| 07 | Testing + Polish | ✅ Complete | 4/4 | 1 session |

**Tổng: ~42 tasks | ~6-8 sessions**

---

## Phase 01: DB Migration

### Objective
Thêm các columns mới để hỗ trợ multi-folder và file grouping.

### Tasks
- [ ] 1.1. Thêm `folder_type` (varchar, nullable) vào `galleries` — enum: "goc" | "da_sua" | "chon_in"
- [ ] 1.2. Đảm bảo `drive_folder_id` + `drive_folder_url` đã có (từ phase trước)
- [ ] 1.3. Thêm `file_group` (varchar, nullable) vào `gallery_images` — base filename cho gộp trùng
- [ ] 1.4. Đảm bảo `drive_file_id` + `file_name` đã có (từ phase trước)

### Files
- Migration SQL via Supabase MCP

---

## Phase 02: Server Actions

### Objective
Backend cho multi-folder, download proxy, và auto-detect subfolder.

### Tasks
- [ ] 2.1. `createMultiFolderGalleries()` — từ 1 parent folder URL → detect subfolder → tạo 3 galleries
- [ ] 2.2. `createSingleFolderGallery()` — dán link thủ công cho 1 folder type
- [ ] 2.3. `updateDriveFolderUrl()` — sửa link cho 1 gallery (nút "Sửa")
- [ ] 2.4. `syncDriveFolder()` — cập nhật: thêm `file_group` = base filename (DSC09882)
- [ ] 2.5. `getGalleriesByContract()` — trả về tất cả galleries (thay vì chỉ 1)
- [ ] 2.6. `downloadDriveFile()` — API Route: proxy download file gốc từ Drive → stream cho client
- [ ] 2.7. `getRetouchProgress()` — đếm is_selected vs file count folder "da_sua"
- [ ] 2.8. `getDeliveryDate()` — lấy deadline từ contract_events WHERE event_type = "hau_ky"

### Files
- `app/actions/gallery-actions.ts` (sửa)
- `app/api/drive-download/[fileId]/route.ts` (tạo mới — download proxy)

---

## Phase 03: Admin UI — Block gọn  

### Objective
Redesign DriveGalleryBlock: compact, hiện link + stats, không grid ảnh.

### Tasks
- [ ] 3.1. Redesign `DriveGalleryBlock` → compact card layout (giống hình app cũ)
- [ ] 3.2. Header: "Quản lý File ảnh & Drive" + nút "Tìm & Gán Link Drive"
- [ ] 3.3. Row cho mỗi folder type: icon + label + URL input + nút "Sửa"
- [ ] 3.4. Stats row: "Ngày trả file: 15/04" + "File ảnh sửa: 45/120 (37%)"
- [ ] 3.5. Progress bar cho tracking retouch
- [ ] 3.6. Modal "Gán Link Drive": nhập 1 parent URL hoặc 3 URL riêng
- [ ] 3.7. Bấm tên folder → navigate đến gallery full page

### Files
- `components/contracts/detail/drive-gallery-block.tsx` (rewrite)
- `components/contracts/detail/drive-link-modal.tsx` (tạo mới)

---

## Phase 04: Gallery Full Page + Gộp RAW/JPG

### Objective
Trang gallery full page thay vì grid inline. Smart grouping ảnh trùng.

### Tasks
- [ ] 4.1. Tạo route `/contracts/[id]/gallery` (admin gallery page)
- [ ] 4.2. Query params: `?folder=goc|da_sua|chon_in` hoặc `?galleryId=xxx`
- [ ] 4.3. Gallery grid responsive (3 cột desktop, 2 cột mobile)
- [ ] 4.4. Lightbox xem ảnh full-screen (swipe trên mobile)
- [ ] 4.5. **Gộp RAW/JPG**: group by `file_group` → hiện 1 entry, badge "RAW+JPG"
- [ ] 4.6. Tab filter: Tất cả | JPG | RAW
- [ ] 4.7. Nút "← Quay lại hợp đồng"
- [ ] 4.8. Header sticky: tên folder + số ảnh + nút download

### Files
- `app/(admin)/contracts/[id]/gallery/page.tsx` (tạo mới)
- `components/contracts/detail/gallery-full-page.tsx` (tạo mới)

---

## Phase 05: Download Feature ⭐

### Objective
Khách tải ảnh gốc từ Drive thông qua link Mood — KHÔNG cần biết Drive.

### Tasks
- [ ] 5.1. API Route `/api/drive-download/[fileId]` — proxy: fetch từ Drive API → stream response
- [ ] 5.2. Nút download 1 ảnh: icon ⬇️ → trigger download file gốc
- [ ] 5.3. "Tải ảnh đã chọn (X ảnh)" — loop download từng file + progress
- [ ] 5.4. "Tải tất cả" — download toàn bộ folder lần lượt
- [ ] 5.5. Progress UI: "Đang tải 12/50..." + progress bar + cancel button
- [ ] 5.6. Mobile-optimized: file tự save vào điện thoại, toast "Đã tải DSC09882.JPG"

### Files
- `app/api/drive-download/[fileId]/route.ts` (tạo mới)
- `components/gallery/download-button.tsx` (tạo mới)
- `components/gallery/download-progress.tsx` (tạo mới)

---

## Phase 06: Tracking Retouch + Ngày trả file

### Objective
Auto-tracking tiến độ chỉnh sửa và deadline giao file.

### Tasks
- [ ] 6.1. Query event `hau_ky` từ `contract_events` → hiện "Ngày trả file: DD/MM"
- [ ] 6.2. Đếm ảnh `is_selected = true` (folder gốc) → "Khách chọn: 120 ảnh"
- [ ] 6.3. Đếm files trong folder "da_sua" → "Đã sửa: 45 ảnh"
- [ ] 6.4. Tính: progress = da_sua / selected, phụ thu = selected - goi
- [ ] 6.5. Hiện progress bar + stats trong DriveGalleryBlock

### Files
- `components/contracts/detail/drive-gallery-block.tsx` (bổ sung)
- `app/actions/gallery-actions.ts` (bổ sung)

---

## Phase 07: Testing + Polish

### Tasks
- [ ] 7.1. Test mobile: mở gallery, chọn ảnh, download trên iPhone/Android
- [ ] 7.2. Test desktop: flow admin gán link → sync → xem gallery
- [ ] 7.3. Test edge cases: folder rỗng, link sai, file bị xóa trên Drive
- [ ] 7.4. Performance: lazy load images, infinite scroll nếu > 200 ảnh

---

## Dependencies

```
Phase 01 (DB) → Phase 02 (Actions) → Phase 03 (Admin UI)
                                   → Phase 04 (Gallery Page)
                                   → Phase 05 (Download)
Phase 02 + 04 → Phase 06 (Tracking)
Phase 01-06 → Phase 07 (Testing)
```

## Quick Commands
- Start Phase 1: `/code phase-01`  
- Check progress: `/next`
- Save context: `/save-brain`
