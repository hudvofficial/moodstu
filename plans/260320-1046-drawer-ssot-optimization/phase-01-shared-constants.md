# Phase 01: Shared Constants — SSOT
Status: ⬜ Pending
Dependencies: None

## Objective
Mở rộng `types/contract-constants.ts` — thêm `EVENT_TYPE_MAP`, `WORK_TYPE_MAP`, `TASK_STATUS_MAP`, `EVENT_STATUS_MAP` theo pattern snake_case → Vietnamese display.

## Hiện trạng
- `CONTRACT_STATUS_MAP` ✅ đã có (snake_case → display)
- `PAYMENT_STATUS_MAP` ✅ đã có
- `SERVICE_TYPE_MAP` ✅ đã có
- `EVENT_TYPE_MAP` ❌ THIẾU — drawer hardcode UPPER CASE sai format
- `WORK_TYPE_MAP` ❌ THIẾU — drawer hardcode UPPER CASE sai format
- `TASK_STATUS_MAP` ❌ THIẾU — cần cho assignments
- `EVENT_STATUS_MAP` ❌ THIẾU — cần cho event timeline

## DB Enum Values (Source of Truth)
```
event_type_enum: ngay_chup, ngay_to_chuc, hau_ky, giao_san_pham
work_type_enum: concept, kich_ban, chup_anh, quay_phim, makeup, tro_ly, cameraman, hau_ky_anh, dung_phim, retouch, premiere, bien_tap, khac
task_status_enum: chua_lam, dang_lam, hoan_thanh, da_huy
```

## Implementation Steps

### Step 1: Thêm EventType type vào `types/contract.ts`
```typescript
export type EventType = "ngay_chup" | "ngay_to_chuc" | "hau_ky" | "giao_san_pham";
export type WorkType = "concept" | "kich_ban" | "chup_anh" | "quay_phim" | "makeup" | "tro_ly" | "cameraman" | "hau_ky_anh" | "dung_phim" | "retouch" | "premiere" | "bien_tap" | "khac";
export type TaskStatus = "chua_lam" | "dang_lam" | "hoan_thanh" | "da_huy";
export type EventStatus = "chua_lam" | "dang_lam" | "hoan_thanh" | "da_huy";
```

### Step 2: Thêm maps vào `types/contract-constants.ts`
```typescript
// EVENT_TYPE_MAP (snake_case DB → display + icon + color + sortOrder)
export const EVENT_TYPE_MAP: Record<EventType, {
  label: string; icon: string; color: string; order: number;
}> = {
  ngay_chup: { label: "Ngày Chụp", icon: "📸", color: "text-blue-600", order: 1 },
  ngay_to_chuc: { label: "Ngày Tổ Chức", icon: "💒", color: "text-purple-600", order: 2 },
  hau_ky: { label: "Hậu Kỳ", icon: "✏️", color: "text-amber-600", order: 3 },
  giao_san_pham: { label: "Giao Sản Phẩm", icon: "📦", color: "text-green-600", order: 4 },
};

// WORK_TYPE_MAP (snake_case DB → display)
export const WORK_TYPE_MAP: Record<WorkType, string> = {
  concept: "Concept",
  kich_ban: "Kịch bản",
  chup_anh: "Chụp ảnh",
  quay_phim: "Quay phim",
  makeup: "Trang điểm",
  tro_ly: "Trợ lý",
  cameraman: "Cameraman",
  hau_ky_anh: "Hậu kỳ Ảnh",
  dung_phim: "Dựng phim",
  retouch: "Retouch",
  premiere: "Premiere",
  bien_tap: "Biên tập",
  khac: "Khác",
};

// TASK_STATUS_MAP (snake_case DB → display + variant)
export const TASK_STATUS_MAP: Record<TaskStatus, {
  label: string; variant: string;
}> = {
  chua_lam: { label: "Chờ", variant: "text-text-muted" },
  dang_lam: { label: "Đang làm", variant: "text-warning" },
  hoan_thanh: { label: "Xong", variant: "text-success" },
  da_huy: { label: "Hủy", variant: "text-error" },
};

// EVENT_STATUS_MAP (snake_case DB → icon type)
export const EVENT_STATUS_MAP: Record<EventStatus, {
  label: string; iconType: "check" | "clock" | "circle";
}> = {
  chua_lam: { label: "Chờ", iconType: "circle" },
  dang_lam: { label: "Đang thực hiện", iconType: "clock" },
  hoan_thanh: { label: "Hoàn thành", iconType: "check" },
  da_huy: { label: "Đã hủy", iconType: "circle" },
};

// Helper functions
export function getEventTypeLabel(type: EventType): string {
  return EVENT_TYPE_MAP[type]?.label || type;
}
export function getWorkTypeLabel(type: WorkType): string {
  return WORK_TYPE_MAP[type] || type;
}
export function getTaskStatusLabel(status: TaskStatus): string {
  return TASK_STATUS_MAP[status]?.label || status;
}
```

## Files to Modify
- `types/contract.ts` — Thêm EventType, WorkType, TaskStatus, EventStatus types
- `types/contract-constants.ts` — Thêm 4 maps + 3 helper functions

## Test Criteria
- [ ] TypeScript compile không lỗi
- [ ] Import từ file khác hoạt động

---
Next Phase: phase-02 (Drawer Event Timeline)
