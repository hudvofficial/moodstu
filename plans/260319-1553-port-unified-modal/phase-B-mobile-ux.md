# Phase B: Mobile UX — Bottom Sheet + Swipe-to-Dismiss
**Status:** ⬜ Pending
**Dependencies:** Phase A hoàn thành

## Objective
Implement đúng tiêu chí V2 từ stitch-master-brief §3.3:
- **Mobile:** Full-screen bottom sheet, slide-up animation
- **Desktop:** Center modal, scale-in animation
- Swipe-to-dismiss trên mobile (threshold + velocity + snap-back)
- Close animation trước khi unmount (không "biến mất" đột ngột)

## ⚠️ CSS Strategy — V2 System (KHÔNG copy V1 class names)

**Audit `pages.css` đã cho thấy:**

| V1 class | Tồn tại V2? | Thay thế V2 |
|----------|------------|------------|
| `animate-slide-up-full` | ❌ | `.animate-slide-up` (keyframe `slide-up` đã có) |
| `animate-slide-down-full` | ❌ | Cần thêm keyframe `slide-down` vào `pages.css` |
| `animate-modal-content` | ❌ | `.card-entrance` (keyframe `card-entrance` đã có) |
| `animate-modal-content-out` | ❌ | Cần thêm keyframe `modal-out` vào `pages.css` |
| `animate-backdrop-in` | ✅ | Dùng thẳng |
| `z-overlay`, `z-modal` | ❌ | Dùng `z-9999` Tailwind v4 |
| `bg-elevated`, `bg-surface` | ❌ | Dùng CSS var: `bg-(--color-bg-card)`, `bg-(--color-bg-surface)` |
| `rounded-soft-xl` | ❌ | `rounded-2xl` Tailwind |
| `border-border` | ❌ | `border-(--color-border)` hoặc `border-primary/10` |

**Nguyên tắc:** Dùng CSS var system của V2, không hardcode hex, không dùng V1 class.

---

## Implementation Steps

### B1 — Thêm 2 keyframes còn thiếu vào `app/styles/pages.css`
```css
/* Modal close animation — mobile */
@keyframes slide-down {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(100%); }
}
.animate-slide-down { animation: slide-down 0.25s cubic-bezier(0.16, 1, 0.3, 1) both; }

/* Modal close animation — desktop */
@keyframes modal-out {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(0.97); }
}
.animate-modal-out { animation: modal-out 0.2s ease-in both; }
```
- [ ] Append vào cuối section `6. ANIMATIONS` trong `pages.css`
- [ ] **KHÔNG tạo file CSS mới** — giữ SSOT tại `pages.css`

### B2 — Bottom Sheet Layout (unified-modal.tsx)
```tsx
// Outer wrapper: items-end mobile → items-center desktop
className="fixed inset-0 z-9999 flex items-end lg:items-center justify-center lg:p-4"

// Inner modal: rounded top-only mobile, rounded-all desktop
className={`
  relative w-full ${SIZE_MAP[size]}
  rounded-t-2xl lg:rounded-2xl
  max-h-[98dvh] lg:max-h-[90vh]
  bg-(--color-bg-card)
  shadow-2xl flex flex-col overflow-hidden
  will-change-transform
  ${contentAnimation}
`}
```
- [ ] `items-end` mobile → bottom sheet từ dưới lên
- [ ] `lg:items-center` → center trên desktop
- [ ] `rounded-t-2xl lg:rounded-2xl` — corner đúng per-device

### B3 — isClosing State + Close Animation (V2 CSS classes)
```tsx
const CLOSE_DURATION = 250 // ms

const [isClosing, setIsClosing] = useState(false)

const handleClose = useCallback(() => {
  if (isClosing) return
  setIsClosing(true)
  setTimeout(() => {
    setIsClosing(false)
    onClose()
  }, CLOSE_DURATION)
}, [onClose, isClosing])

// Dùng V2 CSS classes (không phải V1):
const contentAnimation = isSwiping
  ? '' // Không animation khi đang swipe
  : isClosing
    ? 'animate-slide-down lg:animate-modal-out'    // V2 classes (mới thêm)
    : 'animate-slide-up lg:card-entrance'          // V2 classes (đã có)

const backdropAnimation = isClosing
  ? 'opacity-0 transition-opacity duration-200'
  : 'animate-backdrop-in'                          // V2 class (đã có)
```
- [ ] Wrap `onClose` trong `handleClose` với delay 250ms
- [ ] Tất cả close triggers (backdrop, X button, ESC, swipe) đều dùng `handleClose`

### B4 — Drag Handle (Mobile)
```tsx
{showDragHandle && (
  <div
    className="lg:hidden flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
    onTouchStart={handleTouchStart}
    onTouchMove={handleTouchMove}
    onTouchEnd={handleTouchEnd}
  >
    <div className={`w-10 h-1 rounded-full transition-colors ${
      isSwiping ? 'bg-text-muted' : 'bg-border'
    }`} />
  </div>
)}
```
- [ ] `showDragHandle` prop (default: `true`) — configurable

### B5 — Swipe-to-Dismiss (Mobile)
```tsx
const SWIPE_DISMISS_THRESHOLD = 100 // px
const SWIPE_VELOCITY_THRESHOLD = 0.5 // px/ms

const [swipeY, setSwipeY] = useState(0)
const swipeRef = useRef({ startY: 0, startTime: 0, isSwiping: false })

// handleTouchStart → record startY + startTime
// handleTouchMove → setSwipeY(deltaY) nếu deltaY > 0 (chỉ vuốt xuống)
// handleTouchEnd:
//   - distance > 100px || velocity > 0.5 → handleClose()
//   - else → setSwipeY(0) (snap back)

// Transform style:
const swipeStyle: React.CSSProperties = isSwiping
  ? { transform: `translateY(${swipeY}px)`, transition: 'none' }
  : swipeY === 0 && !isClosing
    ? { transition: 'transform 0.25s ease-out' } // snap-back
    : {}

// Backdrop opacity giảm theo swipe:
const backdropOpacity = isSwiping
  ? Math.max(0.1, 1 - swipeY / 400)
  : undefined
```
- [ ] Gắn handlers vào drag handle + header
- [ ] Backdrop opacity style chỉ set khi `isSwiping` (không ghi đè animation)

## Files

| File | Hành động | Ghi chú |
|------|-----------|---------|
| `app/styles/pages.css` | Thêm 2 keyframes | Append vào section ANIMATIONS |
| `components/ui/unified-modal.tsx` | Sửa (B2+B3+B4+B5) | Dùng V2 CSS classes |

## Test Criteria
- [ ] Mobile: modal slide up từ dưới (`.animate-slide-up`)
- [ ] Desktop: modal scale-in (`.card-entrance`)
- [ ] Đóng mobile: slide down (`.animate-slide-down`) trước unmount
- [ ] Đóng desktop: scale-out (`.animate-modal-out`) trước unmount
- [ ] Backdrop fade in/out đúng
- [ ] Drag handle visible mobile, hidden desktop
- [ ] Vuốt xuống >100px → dismiss
- [ ] Vuốt nhanh → dismiss (velocity threshold)
- [ ] Vuốt nhẹ → snap back mượt
- [ ] Backdrop dim theo swipe distance
- [ ] Header cũng swipeable (onTouchStart/Move/End)

---
Next: phase-C-api-enhancement.md

## Context
stitch-master-brief §3.3:
> "Mobile: Full-screen bottom sheet, slide-up animation"
> "Desktop: Center modal, max-width 640px, scale-in animation"

V2 hiện tại vi phạm cả 2: center modal trên mobile, không có animation nào.
V1 đã làm đúng với `items-end lg:items-center` và `animate-slide-up-full lg:animate-modal-content`.

## Implementation Steps

### B1 — Bottom Sheet Layout
```tsx
// Outer wrapper:
className="fixed inset-0 z-9999 flex items-end lg:items-center justify-center lg:p-4"

// Inner modal:
className="relative w-full max-w-lg rounded-t-[24px] lg:rounded-2xl ..."
// Mobile: full-width, rounded top corners chỉ
// Desktop: max-w cố định, rounded tất cả
```
- [ ] `items-end` mobile → bottom sheet từ dưới lên
- [ ] `items-center lg:` → center trên desktop
- [ ] `rounded-t-[24px] lg:rounded-2xl` → corner đúng per-device
- [ ] `max-h-[98dvh] lg:max-h-[90vh]` — chiếm gần full height mobile

### B2 — isClosing State + Close Animation
```tsx
const CLOSE_DURATION = 250 // ms

const [isClosing, setIsClosing] = useState(false)

const handleClose = useCallback(() => {
  if (isClosing) return
  setIsClosing(true)
  setTimeout(() => {
    setIsClosing(false)
    onClose()
  }, CLOSE_DURATION)
}, [onClose, isClosing])

// Animation classes:
const contentAnimation = isClosing
  ? 'animate-slide-down-full lg:animate-modal-content-out'
  : 'animate-slide-up-full lg:animate-modal-content'
```
- [ ] Thêm `isClosing` state
- [ ] `handleClose` wrap `onClose` với delay animation
- [ ] Truyền `handleClose` vào backdrop, close button, ESC hook
- [ ] Thêm CSS keyframes vào `globals.css` (nếu chưa có)

### B3 — Swipe-to-Dismiss (Mobile)
```tsx
const SWIPE_DISMISS_THRESHOLD = 100 // px
const SWIPE_VELOCITY_THRESHOLD = 0.5 // px/ms

const [swipeY, setSwipeY] = useState(0)
const swipeRef = useRef({ startY: 0, startTime: 0, isSwiping: false })

// Handlers: handleTouchStart, handleTouchMove, handleTouchEnd
// Gắn vào: drag handle + header
// Logic:
//   - Chỉ vuốt xuống (deltaY > 0)
//   - Dismiss nếu: distance > 100px HOẶC velocity > 0.5px/ms
//   - Snap back nếu không đủ distance/velocity

// Backdrop dim theo swipeY:
const backdropOpacity = isSwiping ? Math.max(0.1, 1 - swipeY / 400) : undefined
```
- [ ] `swipeRef` để track startY + startTime + isSwiping
- [ ] `swipeY` state cho `transform: translateY(${swipeY}px)`
- [ ] Snap-back transition: `transition: 'transform 0.25s ease-out'`
- [ ] Backdrop opacity giảm theo swipe distance
- [ ] Drag handle clickable: `cursor-grab active:cursor-grabbing`

## CSS Keyframes cần thêm vào globals.css
```css
@keyframes slide-up-full {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
@keyframes slide-down-full {
  from { transform: translateY(0); }
  to { transform: translateY(100%); }
}
@keyframes modal-content {
  from { opacity: 0; transform: scale(0.95) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes modal-content-out {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.95); }
}
```

## Files

| File | Hành động |
|------|-----------|
| `components/ui/unified-modal.tsx` | Sửa (B1 + B2 + B3) |
| `app/globals.css` | Thêm keyframes (nếu chưa có) |

## Test Criteria
- [ ] Mobile: modal slide up từ dưới
- [ ] Desktop: modal scale-in từ center
- [ ] Đóng modal: slide down (mobile), scale-out (desktop) trước khi unmount
- [ ] Vuốt xuống >100px → modal dismiss
- [ ] Vuốt nhanh → modal dismiss (dù chưa đủ 100px)
- [ ] Vuốt không đủ → snap back
- [ ] Backdrop dim khi vuốt

---
Next: phase-C-api-enhancement.md
