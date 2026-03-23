# Phase 01: DB Migration + Google API Setup
Status: ✅ Complete
Dependencies: None

## Objective
Bổ sung cột Drive vào DB tables hiện có + Setup Google Drive API key

## Implementation Steps

### 1. DB Migration
- [x] ALTER `galleries` — thêm `drive_folder_id VARCHAR(100)` để lưu folder ID từ link Drive
- [x] ALTER `galleries` — thêm `drive_folder_url TEXT` để lưu link gốc
- [x] ALTER `gallery_images` — thêm `file_name VARCHAR(500)` để lưu tên file gốc
- [x] ALTER `gallery_images` — thêm `drive_file_id VARCHAR(100)` để lưu file ID trên Drive
- [x] ALTER `gallery_images` — thêm `selected_at TIMESTAMPTZ` để ghi thời điểm chọn

### 2. Indexes
- [x] `idx_gallery_images_drive_file_id` — tìm nhanh theo drive file ID
- [x] `idx_galleries_contract_id` — tìm gallery theo contract
- [x] `idx_galleries_access_url` — unique partial index cho public URL

### 3. RLS Policies (Public Access)
- [x] `galleries_public_read` — anon SELECT WHERE status='shared'
- [x] `gallery_images_public_read` — anon SELECT qua gallery shared status
- [x] `gallery_images_public_select` — anon UPDATE (toggle heart) qua gallery shared status

### 4. Google API Setup
- [ ] Tạo Google Cloud project + enable Drive API v3
- [ ] Tạo API Key (restricted to Drive API read-only)
- [x] Thêm `GOOGLE_DRIVE_API_KEY` vào `.env.example`

### 5. Lib Helper
- [x] Tạo `lib/google-drive.ts` — parseDriveFolderUrl, getDriveThumbnailUrl, getDriveImageUrl, fetchDriveFiles

## Files Created/Modified
- Supabase migration: `add_drive_columns_to_galleries` ✅
- Supabase migration: `add_public_gallery_rls_policies` ✅
- `lib/google-drive.ts` ✅ (NEW)
- `.env.example` ✅ (MODIFIED)

## Test Criteria
- [x] Migration chạy OK, 5 cột mới xác nhận trong DB
- [x] 3 RLS policies xác nhận hoạt động (anon read + update)
- [ ] API key hoạt động (cần anh tạo trên Google Cloud Console)

## Notes
- Dùng `status = 'shared'` thay `published` (CHECK constraint chỉ cho draft/shared/completed)
- Google Drive API key cần anh tự tạo trên Google Cloud Console (em không có access)

---
Next Phase: phase-02-server-actions.md
