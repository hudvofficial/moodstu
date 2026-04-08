# Phase 01: Scroll Wheel + Slide Animation
Status: ✅ Complete
Dependencies: None

## Objective
Thêm 2 tính năng V1 còn thiếu trong V2:
1. Desktop: lăn chuột trên MonthGrid → chuyển tháng (debounce 300ms)
2. Cả hai: chuyển tháng có slide animation trái/phải

## Files Modified

### 1. `components/calendar/calendar-wrapper.tsx`
- ✅ Thêm `slideDirection` state + `slideTimerRef` + `scrollTimeoutRef`
- ✅ Thêm `handleWheel` handler (debounce 300ms, chỉ active khi viewMode === 'month')
- ✅ Gắn `onWheel={handleWheel}` vào desktop container
- ✅ Patch `handleTouchEnd` để set `slideDirection` khi swipe mobile
- ✅ Truyền `slideDirection` prop xuống `<MonthGrid>`
- ✅ Cleanup refs on unmount

### 2. `components/calendar/views/month-grid.tsx`
- ✅ Thêm prop `slideDirection` vào `MonthGridProps`
- ✅ Gắn `slide-left`/`slide-right` class vào grid body
- ✅ Thêm `key={format(currentDate, 'yyyy-MM')}` để trigger re-mount animation

### 3. CSS — Không sửa
- `.slide-left` và `.slide-right` đã có sẵn trong `animations.css`

## Implementation Steps
1. [x] Thêm `slideDirection` state + `slideTimerRef` vào `calendar-wrapper.tsx`
2. [x] Tạo `handleWheel` handler với debounce 300ms
3. [x] Gắn `onWheel` vào desktop container
4. [x] Patch `handleTouchEnd` để set `slideDirection` khi swipe mobile
5. [x] Truyền `slideDirection` prop xuống `<MonthGrid>`
6. [x] Cập nhật `MonthGridProps` interface thêm `slideDirection`
7. [x] Gắn `slide-left`/`slide-right` class + `key` vào grid body
8. [x] Cleanup refs on unmount

## Verification
- [x] TypeScript: `npx tsc --noEmit` — Exit code 0

---
Next Phase: phase-02-verification.md
