# Phase M2: Swipe Navigation + Touch Polish

Status: ⬜ Pending
Dependencies: Phase M1

## Objective

Thêm swipe trái/phải trên MobileMonthGrid để chuyển tháng. Polish touch experience.

## Implementation Steps

### 1. Swipe handler trên calendar-wrapper

- [ ] Wrap `MobileMonthGrid` trong div có `onTouchStart` / `onTouchEnd`
- [ ] Tính `deltaX = touchEnd.clientX - touchStart.clientX`
- [ ] Nếu `deltaX > 50` → `setCurrentDate(prevMonth)`
- [ ] Nếu `deltaX < -50` → `setCurrentDate(nextMonth)`
- [ ] Không cần thư viện — native touch events

### 2. Visual feedback khi swipe

- [ ] Optional: translate animation nhẹ khi swipe (CSS transition)
- [ ] Haptic feedback nếu có (navigator.vibrate)

### 3. Touch target audit

- [ ] Tất cả nút/icon ≥ 44x44px (Apple HIG minimum)
- [ ] Event dots trong MobileMonthGrid đủ lớn để tap
- [ ] DayDrawer close button đủ lớn

## Files to Modify

- `components/calendar/calendar-wrapper.tsx` — add swipe handler wrapper
- `components/calendar/views/mobile-month-grid.tsx` — ensure touch targets

## Test Criteria

- [ ] Swipe phải → tháng trước
- [ ] Swipe trái → tháng sau
- [ ] Tap ngày → DayDrawer opens (không bị swipe conflict)
- [ ] Desktop: swipe handler KHÔNG ảnh hưởng
- [ ] Build passes

---

Next Phase: → phase-m3-google-badge.md
