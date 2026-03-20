# Phase 03: Drawer Assignments — SSOT Migration
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Xóa hardcode `WORK_TYPE_LABELS`, `STATUS_STYLES` trong `drawer-assignments.tsx`, thay bằng shared constants.

## Hiện trạng (BUG!)
```typescript
// ❌ WRONG format — DB enum là snake_case
const WORK_TYPE_LABELS = {
  PHOTO: "Chụp ảnh",    // DB: chup_anh
  VIDEO: "Quay phim",   // DB: quay_phim
  MAKEUP: "Trang điểm", // DB: makeup
  ...
};
```
DB trả `chup_anh` → code tìm `"PHOTO"` → **KHÔNG MATCH** → hiện raw enum.

## Implementation Steps
1. [ ] Xóa `WORK_TYPE_LABELS` constant (line 34-48)
2. [ ] Xóa `STATUS_STYLES` constant (line 54-59)
3. [ ] Xóa local `getWorkLabel()`, `getStatusStyle()`, `getStatusText()` (line 50-72)
4. [ ] Import `WORK_TYPE_MAP`, `TASK_STATUS_MAP` từ contract-constants
5. [ ] Import `WorkType`, `TaskStatus` types
6. [ ] Dùng `WORK_TYPE_MAP[task.work_type as WorkType]` cho label
7. [ ] Dùng `TASK_STATUS_MAP[task.status as TaskStatus]` cho status display

## Files to Modify
- `components/contracts/drawer-assignments.tsx`

## Test Criteria
- [ ] Work type labels hiển thị tiếng Việt đúng
- [ ] Status badges có đúng màu sắc
- [ ] Unknown work_type → fallback hiện raw value

---
Next Phase: phase-04 (Drawer Checklist)
