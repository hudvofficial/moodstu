# Phase 01: Mobile Card Redesign
Status: ⬜ Pending
Dependencies: None

## Objective
Refactor `MobileCardList` component trong `contracts-table.tsx` để match Stitch design.
CHỈ sửa phần mobile (`lg:hidden`). Desktop giữ nguyên 100%.

## Stitch Layout (Source of Truth)
```
┌─────────────────────────────────────────────┐
│ MS-2026-001                    [ĐÃ CỌC]    │  ← Row 1: Mã HĐ + Status badge
│ Nguyễn Tuấn Kiệt & Trần Thị Mai           │  ← Row 2: Tên khách (bold)
│ [Cưới] 📅 15/04/2026                       │  ← Row 3: Service badge + date
│                                             │
│ 25.000.000 đ          Đã thu: 15.000.000 đ │  ← Row 4: Tổng tiền + Payment info
│ ███████████░░░░░░░░░                        │  ← Row 5: Payment progress bar
└─────────────────────────────────────────────┘
```

## Implementation Steps

### Step 1: Refactor Card Row 1 — Mã HĐ + Status Badge
- [ ] Di chuyển `c.contract_code` lên top-left (text-xs, text-text-muted)
- [ ] Di chuyển `<Badge variant={STATUS_VARIANT[c.status]}>` lên top-right
- [ ] Dùng shared `STATUS_VARIANT` map đã có

### Step 2: Card Row 2 — Tên khách hàng
- [ ] `c.customer_name` bold, text-sm, text-text-main
- [ ] Giữ `line-through` cho cancelled
- [ ] Truncate nếu quá dài

### Step 3: Card Row 3 — Service Badge + Date
- [ ] Dùng `getServiceBadgeColor()` từ SSOT (`constants/service-colors.ts`)
- [ ] Hiện service type trong badge nhỏ (rounded-full, text-tiny)
- [ ] Calendar icon (lucide `Calendar`) + date text (text-xs, text-text-muted)
- [ ] Dùng `formatDate()` từ `lib/utils.ts`

### Step 4: Card Row 4 — Footer: Tổng tiền + Payment info
- [ ] Trái: Tổng tiền (`formatCurrency()` + " đ"), font-semibold
- [ ] Phải: Logic hiển thị:
  - Nếu `remaining_amount === 0` → "✅ Đã thanh toán" (text-success)
  - Nếu `paid > 0` → "Đã thu: {formatCurrency(paid)}" (text-text-secondary)
  - Nếu `paid === 0` → "Chưa thu" (text-text-muted)
- [ ] Dùng `paid_amount` hoặc tính `total - remaining`

### Step 5: Card Row 5 — Payment Progress Bar
- [ ] Thanh mỏng (h-1, rounded-full) dưới footer
- [ ] Background: `bg-border/30`
- [ ] Fill: `bg-primary` width = `(paid / total) * 100%`
- [ ] Nếu đã thanh toán đủ: `bg-success`
- [ ] Dùng inline style `width: ${pct}%` (dynamic, ok cho progress bar)

### Step 6: Giữ nguyên logic hiện có
- [ ] `overdue-indicator` class giữ nguyên
- [ ] `onClick={() => onView(c.id)}` giữ nguyên
- [ ] `entrance entrance-${i}` animation giữ nguyên
- [ ] `isCancelled ? "opacity-50" : ""` giữ nguyên

## Files to Modify
- `components/contracts/contracts-table.tsx` — CHỈ function `MobileCardList` (L155-214)

## Files KHÔNG ĐƯỢC SỬA
- Desktop table (`DesktopTable` function) — KHÔNG CHẠM
- `contracts-list-client.tsx` — Phase 02
- Mọi file khác

## Shared Resources (Kế thừa, KHÔNG tạo mới)
- `constants/service-colors.ts` → `getServiceBadgeColor()`
- `lib/utils.ts` → `formatCurrency()`, `formatDate()`
- `components/ui/badge.tsx` → `<Badge>`
- `app/globals.css` → design tokens
- `app/design-system.css` → `.overdue-indicator`, `.card-base`

## Guard Rails
- [ ] ❌ KHÔNG thêm hardcode hex colors
- [ ] ❌ KHÔNG thêm inline `shadow-[...]`
- [ ] ❌ KHÔNG import thêm package mới
- [ ] ✅ Dùng Tailwind responsive prefix (`lg:hidden`, `max-lg:`)
- [ ] ✅ Mọi color phải từ SSOT hoặc design token

## Test Criteria
- [ ] Desktop table render giống TRƯỚC KHI sửa (screenshot compare)
- [ ] Mobile card match Stitch layout (5 rows)
- [ ] Cancelled contracts: opacity-50 + line-through
- [ ] Overdue: overdue-indicator class
- [ ] Build pass (exit code 0)
- [ ] No lint errors

---
Next Phase: phase-02-fab-page-layout.md
