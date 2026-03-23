# Phase 02: Infinite Scroll + Heart Filter + Remove Tabs
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
- Load 50 ảnh/batch thay vì 3,776 cùng lúc
- ❤️ filter bấm được (toggle selected/all)
- Xóa category tabs vô nghĩa (DSC08374...)

## Files to Modify
- `components/gallery/public-gallery-client.tsx`

## Implementation Steps

### Infinite Scroll
1. [ ] Thêm `BATCH_SIZE = 50`, `visibleCount` state, `sentinelRef`
2. [ ] Tạo `visibleImages = filteredImages.slice(0, visibleCount)`
3. [ ] IntersectionObserver trên sentinel div
4. [ ] Grid render `visibleImages` thay vì `filteredImages`
5. [ ] Thêm sentinel div + "Đang tải thêm..." / "Đã hiện hết"

### Heart Filter
6. [ ] Header L200: `<span>` → `<button>` với onClick toggle
7. [ ] `activeGroup` giữ lại nhưng chỉ "all" | "selected"
8. [ ] `filteredImages`: thêm case `"selected"` → `images.filter(i => i.is_selected)`
9. [ ] Toggle heart filter → reset `visibleCount` về `BATCH_SIZE`

### Remove Category Tabs
10. [ ] Xóa category tabs JSX (L207-219)
11. [ ] Xóa `groups` useMemo (L81-84)
12. [ ] Xóa `GROUP_LABELS` constant
13. [ ] Xóa `TabButton` component

## Không đổi (giữ nguyên)
- `selectedCount` → tính từ full `images[]`
- `ImageViewer` → nhận full `images[]`
- `SelectionSummary` → nhận full `images[]`
- Header `📷 {images.length}` → tổng thật

## Test Criteria
- [ ] Chỉ 50 ảnh render ban đầu
- [ ] Cuộn → load thêm 50
- [ ] ❤️ bấm → filter, bấm lại → về all
- [ ] Không còn tabs DSC08374...
- [ ] selectedCount + Viewer + Summary đếm đúng

---
Next Phase: phase-03-viewer.md
