# Phase E: Nuclear Performance Fix
Status: ⬜ Pending
Dependencies: Phase D (đã done nhưng chưa đủ)

## Objective
Modal phải mở **gần instant** — ngang Coffee Modal (44 dòng, proven smooth).

## Root Cause Analysis (Final)

### Tại sao Phase D chưa đủ?

Phase D fix 3 thứ nhưng bỏ sót 2 nguyên nhân CHÍNH:

| Nguyên nhân | Phase D fix? | Tác động thực tế |
|-------------|-------------|-------------------|
| Auto-focus useEffect | ✅ Đã xóa | Nhưng `autoFocus` prop VẪN CÒN ở CustomerFormModal dòng 142 |
| Animation 300→200ms | ✅ Đã giảm | Nhưng animation bắt đầu từ `opacity:0` → 2-3 frame trống |
| Scrollbar compensation | ✅ Đã thêm | Nhưng scroll lock vẫn gây reflow (overflow:hidden trên html+body) |

### So sánh Coffee Modal vs UnifiedModal hiện tại

```
COFFEE MODAL (smooth)              UNIFIED MODAL (lag)
─────────────────────              ─────────────────────
Click → render → thấy ngay          Click → render → Portal mount
                                    → useEffect scroll lock (REFLOW!)
                                    → useEscape init
                                    → useSwipeDismiss init
                                    → Animation opacity:0 (TRỐNG 2-3 frames)
                                    → autoFocus keyboard popup
                                    
44 dòng, 0 hooks                   240 dòng, 6+ hooks
Không scroll lock                   overflow:hidden trên html+body
Không portal                        createPortal to body
```

Coffee Modal KHÔNG có scroll lock → vẫn mượt → **scroll lock KHÔNG cần thiết**.

---

## Implementation Steps

### N1: Xóa scroll lock hoàn toàn
**File:** `components/ui/unified-modal.tsx`
**Dòng:** 80-97

```tsx
// XÓA TOÀN BỘ BLOCK NÀY:
React.useEffect(() => {
  if (!isOpen) return;
  const scrollY = window.scrollY;
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }
  return () => {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
    window.scrollTo(0, scrollY);
  };
}, [isOpen]);
```

**Tại sao an toàn:**
- Coffee Modal không có scroll lock → proven smooth
- V1 Moodstudio CÓ scroll lock nhưng V1 cũng lag (chỉ là user chấp nhận)
- Modal có backdrop che toàn bộ page → user không scroll page được anyway
- `position: fixed` trên modal overlay đã chặn scroll tự nhiên

**Thay thế bằng:** Backdrop `position: fixed inset-0` đã đủ ngăn scroll.

---

### N2: Đổi animation desktop → instant-feel
**File:** `components/ui/unified-modal.tsx`
**Dòng:** contentAnimation logic

**Hiện tại:**
```tsx
: "animate-slide-up lg:card-entrance"
// card-entrance = 0.25s, bắt đầu opacity:0 → 2-3 frame TRỐNG
```

**Đổi thành:**
```tsx
: "animate-slide-up lg:animate-popover-in"
// popover-in = 0.18s, scale(0.96) → 1, nhỏ gọn hơn card-entrance
```

Hoặc tốt hơn: tạo animation MỚI cho modal, siêu nhẹ:

**File:** `app/styles/pages.css` — thêm animation mới:
```css
@keyframes modal-in {
  from { opacity: 0; transform: scale(0.98); }
  to   { opacity: 1; transform: scale(1); }
}
.animate-modal-in { animation: modal-in 0.15s ease-out both; }
```

**Lý do:** 
- `scale(0.98)` thay vì `scale(0.97)` → ít chuyển động hơn → cảm giác instant
- `0.15s` thay vì `0.25s` → nhanh hơn 40%
- Vẫn có animation nhưng gần như instant

---

### N3: Mobile slide-up bắt đầu opacity:1
**File:** `app/styles/pages.css` — sửa keyframe slide-up

**Hiện tại:**
```css
@keyframes slide-up {
  from { opacity: 0; transform: translateY(100%); }
  to   { opacity: 1; transform: translateY(0); }
}
```

**Đổi thành:**
```css
@keyframes slide-up {
  from { opacity: 1; transform: translateY(100%); }
  to   { opacity: 1; transform: translateY(0); }
}
```

**Lý do:**
- Bỏ opacity transition → modal hiện NGAY từ frame 1
- User thấy modal slide lên từ dưới NGAY LẬP TỨC
- Không còn 2-3 frame trống đầu

**⚠️ Impact check:** `animate-slide-up` cũng dùng ở `date-picker.tsx`
→ Date picker cũng sẽ không fade-in nữa
→ Đây là cải thiện, không phải regression (date picker cũng cần snappy)

---

### N4: Bỏ autoFocus khỏi CustomerFormModal
**File:** `components/contracts/form/modals/CustomerFormModal.tsx`
**Dòng:** 142

**Hiện tại:**
```tsx
<input ... autoFocus />
```

**Đổi thành:**
```tsx
<input ... />
```

**Lý do:**
- Mobile: `autoFocus` trigger bàn phím ảo ngay khi modal mở → lag
- Desktop: user click nút "Tạo khách hàng"→ modal mở → click vào ô input
- Tab cycling vẫn hoạt động → user có thể Tab tới input

---

## Files to Modify

| File | Thay đổi | Dòng ước tính |
|------|----------|---------------|
| `components/ui/unified-modal.tsx` | Xóa scroll lock, đổi animation class | -18 dòng, +1 dòng |
| `app/styles/pages.css` | Sửa slide-up keyframe, thêm modal-in | +5 dòng, sửa 1 dòng |
| `components/contracts/form/modals/CustomerFormModal.tsx` | Bỏ autoFocus | sửa 1 dòng |

**Tổng: 3 files, ~25 dòng thay đổi**

---

## Test Criteria
- [ ] Desktop: click "Tạo khách hàng mới" → modal hiện NGAY (< 100ms cảm nhận)
- [ ] Desktop: page phía sau KHÔNG bị shift khi modal mở
- [ ] Desktop: scroll page KHÔNG xảy ra khi modal đang mở (backdrop chặn)
- [ ] Mobile: modal slide lên NGAY từ frame 1 (không có flash trống)
- [ ] Mobile: bàn phím KHÔNG tự popup khi modal mở
- [ ] Swipe dismiss vẫn hoạt động trên mobile
- [ ] Tab cycling vẫn hoạt động
- [ ] Close animation vẫn smooth
- [ ] Date picker vẫn hoạt động (dùng chung animate-slide-up)

## Rollback
```bash
git checkout 69fd63c -- components/ui/unified-modal.tsx app/styles/pages.css components/contracts/form/modals/CustomerFormModal.tsx
```
