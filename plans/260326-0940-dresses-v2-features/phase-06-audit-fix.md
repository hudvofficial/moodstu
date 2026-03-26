# Phase 06: Audit Fix — Foundation + Cleanup (~15 min)

## Context
- Plan: plans/260326-0940-dresses-v2-features/phase-06-audit-fix.md
- Audit Report: Đã scan full 10 files `components/dresses/` + shared components
- Bug 1: EmptyState word-wrap — MỖI CHỮ MỘT DÒNG (confirmed bằng screenshot `/dresses?status=reserved` + `/dresses/rentals`)
- Bug 2: `DRESS_STATUS_MAP` dùng `"muted"/"danger"` nhưng CSS chỉ có `badge-neutral`/`badge-error` → badge unstyled cho maintenance/retired
- Bug 3: `dress-card.tsx` dùng raw CSS `badge-${variant}` thay vì shared `<Badge>` component
- Bug 4: `RESERVATION_STATUS` map duplicate ở 2 files
- Fix: `BadgeVariant` type chưa export từ `badge.tsx`
- Contract pattern (Gold Standard): `CONTRACT_STATUS_MAP` define variant đúng Badge format từ đầu, dùng `<Badge>` component, không cần adapter

## SSOT Token-Element Map (PHẢI TUÂN THỦ)
| Element | Token/Class |
|---------|------------|
| EmptyState title | `text-h3 mb-2 w-full` |
| EmptyState description | `text-sm text-text-muted max-w-sm w-full leading-relaxed mb-8` |
| Badge variants (chỉ được dùng) | `"success" \| "warning" \| "error" \| "info" \| "neutral" \| "primary" \| "accent"` |
| Card status badge | `<Badge variant={statusConfig.variant}>` (shared component, KHÔNG raw CSS) |
| Reservation status | Import `RESERVATION_STATUS_MAP` from `@/types/dress-constants` |

## Files cần sửa (đúng thứ tự)

### Step 1: `components/ui/ux-states.tsx` (Fix EmptyState word-wrap)
- L32: `<h3 className="text-h3 mb-2">` → `<h3 className="text-h3 mb-2 w-full">`
- L33: `<p className="text-sm text-text-muted max-w-sm leading-relaxed mb-8">` → `<p className="text-sm text-text-muted max-w-sm w-full leading-relaxed mb-8">`
- KHÔNG sửa gì khác trong file này

### Step 2: `components/ui/badge.tsx` (Export BadgeVariant type)
- L3: `type BadgeVariant = ...` → `export type BadgeVariant = ...`
- KHÔNG sửa gì khác

### Step 3: `types/dress-constants.ts` (Fix variants + centralize RESERVATION_STATUS)
- Thêm import: `import type { BadgeVariant } from "@/components/ui/badge";`
- L13-16: Đổi `StatusConfig` interface:
```typescript
interface StatusConfig {
  label: string;
  variant: BadgeVariant;  // WAS: "success" | "info" | "warning" | "muted" | "danger"
}
```
- L22: `maintenance: { label: "Bảo trì", variant: "muted" }` → `variant: "neutral"`
- L23: `retired: { label: "Ngừng dùng", variant: "danger" }` → `variant: "error"`
- Thêm trước `// ─── PAGE SIZE` section:
```typescript
// ─── RESERVATION STATUS → Display ────────────────────────────

export const RESERVATION_STATUS_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
  reserved: { label: "Đã đặt", variant: "info" },
  rented:   { label: "Đang thuê", variant: "warning" },
  returned: { label: "Đã trả", variant: "neutral" },
};
```

### Step 4: `components/dresses/dress-drawer.tsx` (Remove VARIANT_MAP adapter)
- Xóa L29-37 (comment `// ─── VARIANT MAPPING` + `VARIANT_MAP` object)
- L46-47: Thay logic variant mapping:
```typescript
// TRƯỚC:
const statusConfig = DRESS_STATUS_MAP[(dress.status as DressStatus) || "available"];
const badgeVariant = VARIANT_MAP[statusConfig.variant] || "neutral";
// SAU:
const statusConfig = DRESS_STATUS_MAP[(dress.status as DressStatus) || "available"];
```
- L50: `<Badge variant={badgeVariant}>` → `<Badge variant={statusConfig.variant}>`

### Step 5: `components/dresses/dress-card.tsx` (Raw CSS → Badge component)
- Thêm import: `import { Badge } from "@/components/ui/badge";`
- L47-51: Thay raw span:
```tsx
// TRƯỚC:
<div className="absolute top-2 left-2">
  <span className={`badge badge-${statusConfig.variant}`}>
    {statusConfig.label}
  </span>
</div>
// SAU:
<div className="absolute top-2 left-2">
  <Badge variant={statusConfig.variant}>
    {statusConfig.label}
  </Badge>
</div>
```

### Step 6: `components/dresses/dress-drawer-content.tsx` (Remove duplicate map)
- Thêm import: `import { RESERVATION_STATUS_MAP } from "@/types/dress-constants";`
- Xóa L25-31 (comment `// ─── RESERVATION STATUS MAP` + local `RESERVATION_STATUS` object)
- Tìm tất cả `RESERVATION_STATUS[` → đổi thành `RESERVATION_STATUS_MAP[`

### Step 7: `components/dresses/rental-history-client.tsx` (Remove duplicate map)
- Thêm import: `import { RESERVATION_STATUS_MAP } from "@/types/dress-constants";`
- Xóa L23-29 (comment `// ─── STATUS CONFIG` + local `RESERVATION_STATUS` object)
- Tìm tất cả `RESERVATION_STATUS[` → đổi thành `RESERVATION_STATUS_MAP[`

## Verify
1. `npx tsc --noEmit` — zero errors
2. Kill port 3000, `npm run dev`
3. Browser: `/dresses?status=reserved` → EmptyState text wrap 1 dòng bình thường (KHÔNG word-per-line)
4. Browser: `/dresses/rentals` → EmptyState text wrap 1 dòng bình thường
5. Browser: `/dresses` → card badge "Sẵn sàng" hiển thị đúng (dùng `<Badge>` component)
6. Browser: Click card → drawer mở → badge + reservation section OK
7. Screenshot before/after so sánh

## KHÔNG ĐƯỢC
- Sửa file ngoài 7 files trên
- Thêm feature mới
- Đổi logic business
- Đổi layout/design
- Install package mới
