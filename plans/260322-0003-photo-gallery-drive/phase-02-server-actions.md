# Phase 02: Server Actions (Backend)
Status: ✅ Complete
Dependencies: Phase 01 ✅

## Objective
Tạo server actions xử lý: parse Drive link → gọi API lấy danh sách file → lưu metadata vào DB

## Implementation Steps

### 1. Utility: Parse Google Drive Link
- [x] Hàm `parseDriveFolderUrl(url)` → ĐÃ CÓ trong `lib/google-drive.ts` (Phase 01)

### 2. Server Action: Sync Drive Folder
- [x] `syncDriveFolder(galleryId)` — withAdmin
  - Fetch files mới từ Drive (dùng `fetchDriveFiles`)
  - So sánh drive_file_id → chỉ INSERT ảnh mới, giữ selection cũ
  - Update sort_order tiếp nối

### 3. Server Action: Gallery CRUD
- [x] `createGallery(contractId, title, driveUrl)` — withAdmin
  - Parse URL → fetch files → INSERT gallery + bulk INSERT images
  - Auto-generate accessUrl (12 chars random)
  - Rollback gallery nếu insert images fail
- [x] `getGalleryByContract(contractId)` — withAuth
  - JOIN gallery_images, sorted by sort_order
- [x] `deleteGallery(galleryId)` — withAdmin
  - Delete images first (FK) → delete gallery
- [x] `shareGallery(galleryId)` — withAdmin
  - status='shared', shared_at=now()
- [x] `getSelectedImages(galleryId)` — withAuth
  - Filter is_selected=true, order by sort_order

### 4. Server Action: Public Gallery (Không cần auth)
- [x] `getPublicGallery(accessUrl)` — NO auth (anon client, RLS filtered)
- [x] `toggleImageSelection(imageId, selected)` — NO auth (RLS protected)
- [x] `updateClientNote(imageId, note)` — NO auth (bonus action)

## Files Created
- `app/actions/gallery-actions.ts` ✅ (426 lines, 9 actions)

## Test Criteria
- [x] Parse đúng folder ID từ link (lib/google-drive.ts)
- [x] TypeScript build clean (0 errors)
- [x] Dev server chạy OK
- [ ] Integration test (cần API key để test thực tế)

## Notes
- Admin actions dùng `withAdmin` (role check) thay vì `withAuth`
- Public actions dùng `createClient()` (anon/user client) → RLS policies filter
- Thêm `updateClientNote` (bonus) — khách ghi chú trên ảnh
- Sort type dùng `{ sort_order: number }` thay GalleryImage interface (tránh TS conflict với Supabase inferred types)

---
Next Phase: phase-03-admin-ui.md
