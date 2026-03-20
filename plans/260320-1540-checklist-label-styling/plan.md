# Plan: Checklist Labels & Styling Fix — v3 (SSOT-compliant)
Created: 2026-03-20T16:17:00+07:00
Status: 🟡 In Progress

## SSOT: `types/contract-constants.ts`
- `WORK_TYPE_MAP` — 13 work types (dùng cho checklist-block)
- `EVENT_TYPE_MAP` — 4 event types (dùng cho checklist-manager stages)
- `getWorkTypeLabel()` — helper đã có
- `getEventTypeLabel()` — helper đã có

## Supabase: `mnoqeluywookswpcykha`
- `work_tasks.work_type`: snake_case (`hau_ky_anh`, `dung_phim`...)
- `contract_checklists.event_stage`: snake_case (`ngay_chup`...)
- `contract_checklists.category`: Sentence case (`Trang phục`, `Concept`...)

## 3 Files cần sửa

### File 1: `checklist-block.tsx` (hiện bug `hau_ky_anh` raw)
- [ ] Task 1: XÓA local `WORK_TYPE_LABELS` (line 19-33)
- [ ] Task 2: Import `getWorkTypeLabel` từ SSOT
- [ ] Task 3: Line 128: `WORK_TYPE_LABELS[task.work_type] || task.work_type` → `getWorkTypeLabel(task.work_type)`

### File 2: `checklist-manager.tsx` (em đã sửa sai — duplicate SSOT)
- [ ] Task 4: XÓA local `STAGE_LABELS` + `getStageLabel()` (line 49-57 em vừa thêm)
- [ ] Task 5: Import `getEventTypeLabel` từ SSOT
- [ ] Task 6: Thay `getStageLabel(stage)` → `getEventTypeLabel(stage)` (2 chỗ: tab + header)

### File 3: `drawer-checklist.tsx` (đã sửa OK, không liên quan SSOT)
- [x] Header: "Chuẩn bị" ✅
- [x] Category: bỏ uppercase ✅  
- [x] Done group: ✓ xanh ✅

## Styling (đã sửa trong session trước, giữ nguyên)
- [x] checklist-manager: bỏ uppercase/tracking
- [x] checklist-manager: border → shadow-xs
- [x] drawer-checklist: bỏ uppercase

## Verify
- [ ] http://localhost:3000/contracts/93dec855-... → Checklist hiện "Hậu kỳ ảnh", "Dựng phim"
- [ ] http://localhost:3000/contracts/b9dcca30-... → Stage tabs hiện "Ngày Chụp"
- [ ] Drawer checklist hiện "Chuẩn bị" + categories Sentence case
