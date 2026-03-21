# Plan: ProgressBadge SSOT Normalization
Created: 2026-03-21T20:16
Status: ⬜ Pending

## Vấn đề
`components/contracts/progress-badge.tsx` (234 lines) có ~70% inline Tailwind.
Đặc biệt: tooltip status badges tự viết inline thay vì dùng `<Badge>` component.

## Scope
**CHỈ SỬA 1 FILE:** `components/contracts/progress-badge.tsx`
**KHÔNG SỬA:** logic, data flow, hover behavior, color semantics

---

## PHASES

| Phase | Nội dung | Status |
|-------|----------|--------|
| 01 | Tooltip group headers → `.text-overline` | ⬜ |
| 02 | Tooltip status badges → `<Badge>` component | ⬜ |
| 03 | Build verify + Visual compare | ⬜ |

---

## Phase 01: Group Headers → `.text-overline`

**Line 182** — hiện tại:
```tsx
<div className="text-tiny font-black uppercase tracking-widest text-primary/60 mb-1.5 flex items-center gap-2">
```

**Thay bằng:**
```tsx
<div className="text-overline text-primary/60 mb-1.5 flex items-center gap-2">
```

**Lý do:**
- `.text-overline` trong `typography.css` L72-79 đã có: `font-size: caption, font-weight: 500, uppercase, letter-spacing: 0.05em`
- Khác nhỏ: `.text-overline` dùng `font-weight: 500` vs inline `font-black` (900)
- `font-weight: 500` phù hợp hơn cho tooltip (nhỏ, secondary context)

## Phase 02: Status Badges → `<Badge>` component

**Lines 202-212** — hiện tại (inline):
```tsx
<span className={`text-tiny font-bold shrink-0 px-1 py-0.5 rounded ${
  taskDone
    ? "bg-success/10 text-success"
    : t.status === IN_PROGRESS_STATUS
      ? "bg-info/10 text-info"
      : "bg-warning/10 text-warning"
}`}>
  {getTaskStatusLabel(t.status as TaskStatus)}
</span>
```

**Thay bằng:**
```tsx
<Badge variant={
  taskDone ? "success"
    : t.status === IN_PROGRESS_STATUS ? "info"
    : "warning"
}>
  {getTaskStatusLabel(t.status as TaskStatus)}
</Badge>
```

**Lý do:**
- `<Badge>` component (`components/ui/badge.tsx`) đã có đầy đủ variant styles
- `.badge` class trong `pages.css` L209+ đã define: `inline-flex, items-center, gap, px, py, rounded, font-size, font-weight`
- Badge đã support `success`, `info`, `warning` variants → match 1:1 hiện tại
- Badge nhỏ gọn hơn inline → reduce code noise

**Import cần thêm:**
```tsx
import { Badge } from "@/components/ui/badge";
```
(Check: file hiện tại CHƯA import Badge)

## Phase 03: Build verify + Visual compare

1. Kill port → `npm run dev`
2. Mở browser → Navigate đến contract detail có tasks
3. Hover ProgressBadge → xem tooltip
4. So sánh visual trước/sau:
   - Group header font weight hơi nhẹ hơn (500 vs 900) — acceptable
   - Status badges dùng SSOT Badge → consistent với toàn app

---

## Ghi chú
- **KHÔNG SỬA** main badge container (L131-171) — đây là layout riêng, chưa có SSOT class phù hợp
- **KHÔNG SỬA** progress bar (L142-147) — đã dùng typography.css `.progress-track`/`.progress-fill` ở nơi khác nhưng component này có logic 3 màu (xanh + vàng + xám) → giữ inline cho linh hoạt
- **KHÔNG TẠO CSS class mới** — chỉ tận dụng classes + components đã có
