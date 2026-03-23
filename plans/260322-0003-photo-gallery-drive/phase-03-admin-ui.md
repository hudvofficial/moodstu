# Phase 03: Admin UI — Contract Detail Drive Block
Status: ✅ Complete
Dependencies: Phase 02 ✅

## Objective
Thay thế `FilesDrivePlaceholder` bằng UI thật — Admin dán link Drive, xem gallery, quản lý ảnh

## Implementation Steps

### 1. Component: DriveGalleryBlock (thay FilesDrivePlaceholder)
- [x] State: empty → input link → syncing → gallery loaded
- [x] Empty state: Title input + Drive URL input + "Đồng bộ" button
- [x] Loading: Loader2 spinner
- [x] Syncing: spinner + "Đang đồng bộ từ Google Drive..."

### 2. Component: GalleryStats Bar
- [x] Hiển thị: 🖼️ Tổng ảnh | ❤️ Ảnh đã chọn | 💬 Ghi chú
- [x] Dùng SSOT text-caption, text-primary

### 3. Component: GalleryGrid
- [x] Grid auto-fill (minmax 120px) — responsive 2-4 cột
- [x] Mỗi ảnh: thumbnail + tên file + icon ❤️ nếu đã chọn
- [x] Hover: scale 105% + file name tooltip
- [x] Lazy loading images
- [x] Error handling (ImageOff fallback)
- [x] Note indicator badge

### 4. Header Actions (trong DriveGalleryBlock)
- [x] Nút Đồng bộ lại (RefreshCw icon)
- [x] Nút Chia sẻ → shareGallery() → status='shared'
- [x] Nút Copy Link (sau khi shared)
- [x] Nút Xóa gallery (confirm dialog)

### 5. Component: FilterBar
- [x] Tab pills: Tất cả | ❤️ Đã chọn | Chưa chọn
- [x] Hiển thị count mỗi filter
- [x] Dùng SSOT tab-pill, tab-pill-compact, tab-pill-active, tab-pill-inactive

### 6. Bonus: Export Selected
- [x] Nút "Xuất tên file đã chọn" → copy to clipboard

### 7. Tích hợp vào Contract Detail
- [x] Swap import: FilesDrivePlaceholder → DriveGalleryBlock
- [x] Props: contractId={contract.id}

### 8. Design Token Compliance
- [x] card-base, btn-primary, btn-ghost, btn-icon
- [x] tab-pill, tab-pill-compact, tab-pill-active, tab-pill-inactive
- [x] text-body-sm, text-caption, badge-success
- [x] entrance animations, stagger-item
- [x] CSS variables (--color-border, --radius-sm, --font-size-caption)

## Files Created/Modified
- `components/contracts/detail/drive-gallery-block.tsx` ✅ (NEW — ~420 lines)
- `components/contracts/detail/gallery-grid.tsx` ✅ (NEW — ~130 lines)
- `components/contracts/detail/gallery-stats.tsx` ✅ (NEW — ~55 lines)
- `components/contracts/detail/contract-detail-client.tsx` ✅ (MODIFIED — swap import)

## Test Criteria
- [x] TypeScript build: 0 errors
- [x] Dev server chạy OK, page loads
- [ ] Visual test: dán link Drive → sync → hiện gallery (cần API key)
- [ ] Filter tabs hoạt động
- [ ] Copy link public gallery
- [ ] Responsive mobile/desktop

## Notes
- Dùng `<img>` thay `<Image>` cho Drive URLs (external, cần whitelist nếu dùng Next Image)
- Toast API: `toast(message, type)` — không phải `toast.error(message)`
- useEffect init pattern thay ref-in-render (React compiler compliance)

---
Next Phase: phase-04-public-gallery.md
