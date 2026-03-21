# Phase 01: Fix Token Compliance + Redesign Header
Status: ⬜ Pending
Dependencies: None

## Objective
Sửa header "Lịch trình sự kiện" trong `event-timeline.tsx`:
1. Bỏ tất cả inline values (`text-[11px]!`, `py-0.5!`, etc.)
2. Redesign header theo mockup mới
3. Sync cả 2 state: có events + empty state

## Implementation Steps

### 1. Header Layout (has events)
- [ ] **Icon box**: Calendar trong box nền nhạt
  - Token: `icon-box` hoặc custom `w-9 h-9 rounded-lg bg-primary/10 grid place-items-center`
  - Icon: `CalendarDays size={18}` + `text-primary`
- [ ] **Title block** (2 dòng):
  - Dòng 1: `text-body-sm font-bold text-text-primary` + Badge `badge badge-neutral` + text `{count} SỰ KIỆN` (uppercase)
  - Dòng 2: `text-caption` → `Dự án: Mood Studio · {year}`
- [ ] **Button**: `btn btn-outline` (token có sẵn — 8px 16px, border, rounded-lg)
  - Text: `+ Thêm lịch`
  - Icon: `Plus size={14}`

### 2. Empty State Header
- [ ] Cùng layout như trên nhưng badge hiện `0 SỰ KIỆN`

### 3. Cleanup
- [ ] Remove ALL inline overrides (`!py-*`, `!px-*`, `!text-[*]`, `!rounded-*`, `!gap-*`)
- [ ] Verify không còn `text-[` hoặc `!` prefix nào

## Files to Modify
- `components/contracts/detail/event-timeline.tsx` — header section only

## Token Reference
```
btn btn-outline → padding: 8px 16px, border: 1px solid border, rounded: 8px, font: body-sm/500
badge badge-neutral → padding: 2px 10px, rounded: 6px, font: caption/600, bg: hover
text-caption → font: caption, color: muted
text-body-sm → font: body-sm
icon-box → 40x40, rounded-md, grid place-items-center
```

## Test Criteria
- [ ] Không còn giá trị inline nào (`text-[*]`, `!` prefix)
- [ ] Button dùng `btn btn-outline` token
- [ ] Badge hiện tổng số + chữ in hoa "SỰ KIỆN"
- [ ] Subtitle hiện dưới title
- [ ] TypeScript clean (no errors)
- [ ] Visual match mockup trên browser
