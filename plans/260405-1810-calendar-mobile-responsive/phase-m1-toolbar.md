# Phase M1: Mobile Toolbar Compact

Status: ⬜ Pending
Dependencies: None

## Objective

Làm cho toolbar calendar hoạt động tốt trên mobile 375px. Desktop giữ nguyên.

## V1 Reference Layout (Mobile)

```
Row 1: [ ← ]  T4, 2026  [ → ]         [≡ Filter]  [+]
Row 2: [Hôm nay] [Ngày] [Tuần] [Tháng]
```

## Implementation Steps

### 1. Desktop layout → wrap `hidden lg:flex`

- [ ] Wrap toàn bộ toolbar hiện tại trong `hidden lg:flex`
- [ ] Desktop KHÔNG thay đổi gì

### 2. Mobile toolbar → `flex lg:hidden`

- [ ] Row 1: Date navigation compact
  - `< T4, 2026 >` — chỉ hiện tháng + năm, font nhỏ hơn
  - Nút `←` `→` size touch-friendly (`w-10 h-10`)
  - Bên phải: icon filter `≡` + icon CTA `+`
- [ ] Row 2: View mode pills full-width
  - `[Hôm nay] [Ngày] [Tuần] [Tháng]` — scroll horizontal nếu không vừa
  - Active pill = primary bg

### 3. Mobile filter behavior

- [ ] Icon `≡` mở dropdown filter (reuse existing SelectPill logic)
  - Option A: Inline dropdown dưới toolbar
  - Option B: Bottom sheet filter (dùng Drawer)
- [ ] "Tất cả Trạng thái" → compact label "Trạng thái"
- [ ] "Tất cả Nhân sự" → compact label "Nhân sự"

### 4. Mobile CTA

- [ ] `Tạo lịch trình` → icon `+` tròn (primary bg, `w-10 h-10`)

## Files to Modify

- `components/calendar/calendar-toolbar.tsx` — add mobile layout branch

## Test Criteria

- [ ] Desktop 1440px: toolbar KHÔNG thay đổi (no regression)
- [ ] Mobile 375px: toolbar compact, 2 rows, touch-friendly
- [ ] Filter icon opens dropdown
- [ ] CTA `+` opens EventFormDrawer
- [ ] View mode switch works on mobile
- [ ] Build passes (`npm run build`)

---

Next Phase: → phase-m2-swipe.md
