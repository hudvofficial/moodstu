# Phase 02: Drawer Event Timeline — SSOT Migration
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Xóa toàn bộ hardcode `EVENT_ORDER`, `EVENT_CONFIG` trong `drawer-event-timeline.tsx`, thay bằng import `EVENT_TYPE_MAP`, `EVENT_STATUS_MAP` từ contract-constants.

## Hiện trạng (BUG!)
```typescript
// ❌ WRONG: UPPER CASE tiếng Việt — DB trả snake_case
const EVENT_ORDER = ["NGÀY CHỤP", "NGÀY TỔ CHỨC", "HẬU KỲ", "GIAO SẢN PHẨM"];
const EVENT_CONFIG = {
  "NGÀY CHỤP": { label: "Ngày Chụp", icon: "📸", color: "text-blue-600" },
  ...
};
```
DB trả `ngay_chup` → code tìm `"NGÀY CHỤP"` → **KHÔNG MATCH** → fallback.

## Implementation Steps
1. [ ] Xóa `EVENT_ORDER` constant (line 33-38)
2. [ ] Xóa `EVENT_CONFIG` constant (line 40-48)
3. [ ] Xóa local `getStatusIcon()` + `getStatusLabel()` (line 50-69)
4. [ ] Import `EVENT_TYPE_MAP`, `EVENT_STATUS_MAP` từ contract-constants
5. [ ] Import `EventType`, `EventStatus` types từ contract
6. [ ] Sort: dùng `EVENT_TYPE_MAP[x].order` thay vì hardcode array
7. [ ] Config: dùng `EVENT_TYPE_MAP[event.event_type]` cho label/icon/color
8. [ ] Status: dùng `EVENT_STATUS_MAP[event.status]` cho icon/label

## Code sau khi fix
```typescript
import { EVENT_TYPE_MAP, EVENT_STATUS_MAP } from "@/types/contract-constants";
import type { EventType, EventStatus } from "@/types/contract";

// Sort by order from constants
const sortedEvents = [...events].sort((a, b) => {
  const orderA = EVENT_TYPE_MAP[a.event_type as EventType]?.order ?? 99;
  const orderB = EVENT_TYPE_MAP[b.event_type as EventType]?.order ?? 99;
  return orderA - orderB;
});

// Display config from constants
const config = EVENT_TYPE_MAP[event.event_type as EventType] || {
  label: event.title || event.event_type, icon: "📋", color: "text-text-secondary", order: 99,
};
```

## Files to Modify
- `components/contracts/drawer-event-timeline.tsx`

## Test Criteria
- [ ] Events sort đúng thứ tự (Chụp → Tổ chức → Hậu kỳ → Giao SP)
- [ ] Label/icon/color hiển thị đúng
- [ ] Status icon + label đúng
- [ ] Event type không có trong map → fallback graceful

---
Next Phase: phase-03 (Drawer Assignments)
