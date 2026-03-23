# Phase 05: Admin Filter + Export
Status: ✅ Complete
Dependencies: Phase 04 ✅

## Objective
Admin filter ảnh khách đã chọn → export danh sách tên file để dùng trong Lightroom/Bridge

## Implementation Steps

### 1. Filter Enhanced trên Admin Gallery
- [x] Tab "❤️ Đã chọn" — chỉ hiện ảnh khách thả tim  
- [x] Tab "💬 Ghi chú" — chỉ hiện ảnh có note (dynamic, ẩn nếu 0)
- [x] Hiện tên file gốc rõ ràng dưới mỗi ảnh
- [x] Sort: theo thứ tự gốc / tên file A→Z / mới chọn nhất

### 2. Export File Names
- [x] Nút "Copy tên file" → clipboard (1 file/dòng)
- [x] Nút "Xuất CSV" → download file CSV (STT, Tên file, Ngày chọn, Ghi chú)
- [x] CSV có BOM header cho Excel tiếng Việt đúng

### 3. Thống Kê
- [x] GalleryStats: tổng ảnh / đã chọn / ghi chú
- [x] Timeline: "Lần chọn cuối: DD/MM/YYYY HH:mm" (khi filter "Đã chọn")

### 4. Re-sync Drive
- [x] Nút "Đồng bộ lại" (đã có từ Phase 03)
- [x] So sánh drive_file_id → chỉ thêm mới, giữ selection cũ

## Files Modified
- `components/contracts/detail/drive-gallery-block.tsx` ✅ (Enhanced — CSV, sort, noted tab, timeline)
- `components/contracts/detail/gallery-grid.tsx` ✅ (Added 'noted' filter)

---
Next Phase: phase-06-testing.md
