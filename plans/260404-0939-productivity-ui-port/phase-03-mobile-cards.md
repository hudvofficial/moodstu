# Phase 03: Mobile Card Alignment

Status: ⬜ Pending
Dependencies: Phase 02

## Objective

Refactor mobile card theo 5-row vertical pattern của Contract, tối ưu cho context nhân sự.

## Files to Modify

- `components/productivity/productivity-mobile-cards.tsx`

## Current vs Target

### Current (4-row — avatar heavy):

```
┌────────────────────────────────────┐
│ [Avatar] Tên Nhân Sự    [Badge]   │  ← Row 1: avatar + name + workload badge
│ 18h on-set · 6 việc · 2 xong     │  ← Row 2: inline stats
│ ⚠ 3 quá hạn         12.200.000   │  ← Row 3: alert + cost
│ ████████████░░░░   75%  >         │  ← Row 4: progress bar + chevron
└────────────────────────────────────┘
```

### Target (5-row — Contract pattern):

```
┌────────────────────────────────────┐
│ Photographer              [CAO]   │  ← Row 1: role text + workload badge
│ Lê Hoàng Nam                      │  ← Row 2: name bold (giống Contract h3)
│ 18h on-set · 6 việc · 2 xong     │  ← Row 3: inline stats (giữ nguyên)
│ ⚠ 3 quá hạn         12.200.000   │  ← Row 4: alert + cost (giữ nguyên)
│ ████████████░░░░   75%  >         │  ← Row 5: progress bar (giữ nguyên)
└────────────────────────────────────┘
```

## Implementation Steps

### 1. Row 1: Bỏ avatar → Role text + Badge

```tsx
{
  /* Row 1: Role + Workload Badge — matches Contract Row 1 (code + status) */
}
<div className="flex items-center justify-between mb-2">
  <span className="text-xs text-text-muted">{formatRole(employee.role)}</span>
  <Badge variant={WORKLOAD_BADGE_VARIANTS[employee.workload_level]}>
    {WORKLOAD_LABELS[employee.workload_level]}
  </Badge>
</div>;
```

### 2. Row 2: Full Name bold

```tsx
{
  /* Row 2: Full Name — matches Contract Row 2 (customer name) */
}
<h3 className="text-sm font-bold text-text-main mb-1.5 truncate">
  {employee.full_name}
</h3>;
```

### 3. Row 3-5: Giữ nguyên

- Row 3: Inline stats (đã tốt)
- Row 4: Alert + Cost (đã tốt)
- Row 5: Workload bar + % + Chevron (đã tốt)

### 4. Cleanup

- Remove `getInitials` import (không còn avatar)
- Remove avatar `<div>` (40x40 circle)

## Visual Comparison

| Aspect      | Contract Card           | Productivity Card (new) |
| ----------- | ----------------------- | ----------------------- |
| Row 1 left  | Mã HĐ (text-xs muted)   | Role (text-xs muted)    |
| Row 1 right | Status badge            | Workload badge          |
| Row 2       | Customer name (h3 bold) | Employee name (h3 bold) |
| Row 3       | Service + Date          | Stats inline            |
| Row 4       | Amount + Payment        | Alert + Cost            |
| Row 5       | Payment progress        | Workload progress       |

## Test Criteria

- [ ] Mobile cards hiển thị 5-row layout mới
- [ ] Không còn avatar circle
- [ ] Entrance animations vẫn hoạt động
- [ ] Tap card → drawer mở đúng
- [ ] Visual density tương đương Contract cards

---

Next Phase: phase-04-verify.md
