# Phase C: API Enhancement — Size System + Footer Slot + Focus Trap
**Status:** ⬜ Pending
**Dependencies:** Phase B hoàn thành

## Objective
Mở rộng API của UnifiedModal để linh hoạt hơn cho toàn hệ thống:
- Size system 7 preset (sm→full) — không hardcode max-width
- Footer slot riêng — sticky, không cuộn cùng content
- Focus trap (Tab cycling) — a11y chuẩn WAI-ARIA
- Backward compatible — consumer hiện tại không cần đổi gì

## Context
Các module Finance, CRM, Inventory cần modal sizes khác nhau:
- Confirm dialog: `sm` (384px)
- Quick forms: `md` (448px)
- Customer/Contract forms: `lg` hoặc `xl`
- Complex forms: `2xl` hoặc `3xl`

Footer slot sticky là best practice — không để footer bị scroll mất trên mobile form dài.

## Implementation Steps

### C1 — Size System (7 preset)
```tsx
const SIZE_MAP = {
  sm: 'max-w-sm',    // 384px — Confirm, QR
  md: 'max-w-md',    // 448px — Quick forms
  lg: 'max-w-lg',    // 512px — DEFAULT
  xl: 'max-w-xl',    // 576px — Complex forms
  '2xl': 'max-w-2xl', // 672px — Large forms
  '3xl': 'max-w-3xl', // 768px — Task assignment
  full: 'max-w-4xl',  // 896px — Full editors
} as const

// Prop: size?: keyof typeof SIZE_MAP (default: 'lg')
```
- [ ] Thêm `SIZE_MAP` constant
- [ ] Thêm `size` prop với default `'lg'`
- [ ] Thay thế hardcode `max-w-[32rem]` bằng `SIZE_MAP[size]`
- [ ] Backward compatible: default `lg` = xấp xỉ `32rem` hiện tại

### C2 — Footer Slot
```tsx
// Prop: footer?: React.ReactNode

// Render (sau body, trước đóng modal):
{footer && (
  <div className="shrink-0 px-6 py-4 border-t border-border flex gap-3 justify-end">
    {footer}
  </div>
)}

// Body phải có flex + overflow-y-auto:
<div className="flex-1 overflow-y-auto px-6 pb-6">
  {children}
</div>
```
- [ ] Thêm `footer?: React.ReactNode` prop
- [ ] Modal container dùng `flex flex-col`
- [ ] Body: `flex-1 overflow-y-auto` — scroll được
- [ ] Footer: `shrink-0` — sticky ở dưới, không scroll

### C3 — Focus Trap (WAI-ARIA)
```tsx
const handleTabKey = useCallback((e: React.KeyboardEvent) => {
  if (e.key !== 'Tab') return
  const modal = e.currentTarget as HTMLElement
  const focusable = modal.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  if (focusable.length === 0) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}, [])

// Gắn vào: outer dialog div onKeyDown={handleTabKey}
// Thêm: role="dialog" aria-modal="true" aria-label={title}
```
- [ ] Thêm `handleTabKey` callback
- [ ] Gắn vào outer wrapper `onKeyDown`
- [ ] Thêm ARIA attributes: `role="dialog"`, `aria-modal="true"`

## Backward Compatibility Check

| Consumer hiện tại | Dùng props | Sau Phase C |
|-------------------|-----------|-------------|
| `CustomerFormModal.tsx` | `isOpen, onClose, title, children` | ✅ Không đổi gì |
| `CreateServiceModal.tsx` | `isOpen, onClose, title, children` | ✅ Không đổi gì |
| `ItemModal.tsx` | `isOpen, onClose, title, children` | ✅ Không đổi gì |
| Các modal khác | `isOpen, onClose, title, children` | ✅ Không đổi gì |

## Files

| File | Hành động |
|------|-----------|
| `components/ui/unified-modal.tsx` | Sửa (C1 + C2 + C3) |

## Test Criteria
- [ ] `size="sm"` → modal nhỏ hơn
- [ ] `size="2xl"` → modal rộng hơn
- [ ] Default (không truyền size) → `lg` như cũ
- [ ] `footer={<>...</>}` → footer render sticky dưới cùng
- [ ] Body scroll → footer không di chuyển
- [ ] Tab key → focus cycling trong modal
- [ ] Shift+Tab → focus đi ngược
- [ ] Tất cả consumer hiện tại hoạt động bình thường

---
Phase cuối. Sau Phase C: verify toàn bộ app, update brain.json.
