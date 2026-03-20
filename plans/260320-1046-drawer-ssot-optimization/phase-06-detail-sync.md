# Phase 06: Detail Page Event Timeline — SSOT Sync
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Detail page `event-timeline.tsx` đang dùng local `EVENT_TYPE_LABELS` map → chuyển sang shared SSOT.

## Hiện trạng
```typescript
// ❌ LOCAL map — duplicate logic
const EVENT_TYPE_LABELS: Record<string, string> = {
  ngay_chup: "Ngày Chụp",        // ← Đúng format nhưng duplicate
  ngay_to_chuc: "Ngày Tổ Chức",
  hau_ky: "Hậu Kỳ",
  giao_san_pham: "Giao Sản Phẩm",
};
```
Format đúng (snake_case) nhưng nên dùng từ shared constants.

## Implementation Steps
1. [ ] Xóa local `EVENT_TYPE_LABELS` (line 18-23)
2. [ ] Import `EVENT_TYPE_MAP, getEventTypeLabel` từ contract-constants
3. [ ] Thay `EVENT_TYPE_LABELS[event.event_type]` → `getEventTypeLabel(event.event_type as EventType)`
4. [ ] Check: `STATUS_CONFIG` ở line 26-43 → đã dùng `TaskStatus` type nhập từ contract → GIỮ NGUYÊN (vì dùng JSX icon, khác drawer)

## Files to Modify
- `components/contracts/detail/event-timeline.tsx`

## Test Criteria
- [ ] Labels hiển thị đúng trên detail page
- [ ] Không có duplicate constants

---
Next Phase: phase-07 (Auto-gen debug)
