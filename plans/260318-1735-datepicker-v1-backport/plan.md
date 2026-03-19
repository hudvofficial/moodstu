# Plan: DatePicker V1 Backport — UX Improvements

**Created:** 2026-03-18 17:35
**Status:** ✅ Complete
**Complexity:** Simple (1 phase, 1 file)

---

## Overview

Backport 4 UX improvements từ V1 DatePicker vào V2.
Core logic giữ nguyên — chỉ sửa visual/animation.

## File duy nhất:
- `components/ui/date-picker.tsx`

---

## Phases

| # | Task | Status | Est |
|---|------|--------|-----|
| 01 | Animation open/close | ⬜ | 3min |
| 02 | Focus ring khi open | ⬜ | 2min |
| 03 | Desktop calendar border | ⬜ | 2min |
| 04 | Darker mobile handle bar | ⬜ | 1min |
| 05 | Build + Visual verify | ⬜ | 3min |

**Tổng:** ~11min

---

## Chi tiết

### Task 01: Animation open/close

**V1 code:**
```tsx
// Desktop popover
<div className="animate-modal-content" ...>

// Mobile backdrop
className="... animate-in fade-in duration-200"

// Mobile sheet
className="... animate-in slide-in-from-bottom duration-300"
```

**V2 hiện tại:** Không có animation → thêm vào.

**Lưu ý:** Check xem V2 có animation utility classes không (Tailwind animate plugin hoặc CSS keyframes).

### Task 02: Focus ring khi open

**V1:**
```tsx
className={`... ${isOpen 
  ? "border-primary ring-2 ring-primary/20 bg-primary/5" 
  : "border-border hover:border-primary/50"
}`}
```

**V2 hiện tại:** Dùng inline style → chuyển sang Tailwind classes + thêm ring.

### Task 03: Desktop calendar border  

**V1:** `border border-border` trên calendar panel desktop
**V2 hiện tại:** Desktop non-compact không có border → thêm.

### Task 04: Darker mobile handle bar

**V1:** `bg-border-dark` 
**V2:** `bg-border` → đổi sang darker variant.

### Task 05: Build + Visual verify

- `npx next build` 
- Kill port + npm run dev
- Screenshot so sánh trước/sau

## Test Criteria:
- [ ] Calendar popover có animation khi mở
- [ ] Mobile bottom sheet có slide-in animation
- [ ] Trigger button có ring effect khi calendar mở  
- [ ] Calendar panel desktop có visible border
- [ ] Mobile handle bar đậm hơn, dễ thấy
- [ ] Build pass (exit code 0)
