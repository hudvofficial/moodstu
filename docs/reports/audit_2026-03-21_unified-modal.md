# 🏥 Audit Report — UnifiedModal
**Ngày:** 2026-03-21  
**Phạm vi:** `components/ui/unified-modal.tsx` (233 lines)  
**Phương pháp:** Visual audit (browser 1440px) + Code analysis  

---

## Summary

- 🔴 Critical Issues: **2**
- 🟡 Warnings: **5**  
- 🟢 Suggestions: **2**

---

## 🔴 Critical Issues (Phải sửa ngay)

### C1. Inline `style={{}}` trên container chính — Vi phạm SSOT (#56, #67)

**File:** `unified-modal.tsx:152, 173-178`

**Vấn đề:**
```tsx
// Line 152 — Wrapper dùng inline style hoàn toàn
style={{ position: "fixed", inset: 0, zIndex: 9999 }}

// Line 173-178 — Modal card dùng inline style cho layout
style={{
  maxWidth: MAX_WIDTH_MAP[size],
  marginLeft: "auto",
  marginRight: "auto",
  ...swipeStyle,
}}
```

**Nguy hiểm:**
- `position: fixed; inset: 0; z-index: 9999` là layout cố định, không cần động — nên là CSS class
- `marginLeft/Right: auto` là centering logic — nên dùng Tailwind `mx-auto`
- `maxWidth` qua JS object là hợp lý (dynamic), nhưng `margin` và `position/inset/z-index` hoàn toàn static → vi phạm lesson #56 SSOT

**Cách sửa:**
- Tạo CSS class `.modal-overlay` trong `utilities.css` hoặc `components.css` cho `position: fixed; inset: 0; z-index: 9999`
- Thay `marginLeft/Right: auto` bằng Tailwind `mx-auto` trong className
- Chỉ giữ inline cho dynamic values: `maxWidth` (từ size prop) và `swipeStyle` (từ gesture)

---

### C2. Footer dùng `border-t border-border` — Vi phạm quy tắc V2 NO BORDER (#64)

**File:** `unified-modal.tsx:224`

```tsx
<div className="shrink-0 px-6 py-4 sm:px-8 border-t border-border flex gap-3 justify-end">
```

**Nguy hiểm:**
- V2 design system TUYỆT ĐỐI cấm `border-t`, `border-b`, `divide-y` (lesson #64)
- Nên dùng separator pattern: `bg-border/30 h-px` hoặc shadow-based separation

**Cách sửa:**
- Xóa `border-t border-border`
- Thêm pseudo-element hoặc sibling `<div className="h-px bg-border/30" />` phía trên footer
- Hoặc dùng `shadow-[0_-1px_0_0_var(--color-border-light)]` cho hiệu ứng separator nhẹ

---

## 🟡 Warnings (Nên sửa)

### W1. Hardcode spacing values — Không dùng spacing tokens

**File:** `unified-modal.tsx:196, 218, 224`

```tsx
// Header
className="shrink-0 flex items-start justify-between px-6 pt-5 pb-4 sm:px-8"

// Body  
className="flex-1 overflow-y-auto px-6 pb-6 sm:px-8 overflow-x-hidden"

// Footer
className="shrink-0 px-6 py-4 sm:px-8 border-t border-border flex gap-3 justify-end"
```

**Vấn đề:**
- `px-6` (24px) và `sm:px-8` (32px) là hardcoded Tailwind values
- `pt-5` (20px), `pb-4` (16px), `pb-6` (24px), `py-4` (16px) — mỗi section padding khác nhau, không theo hệ thống spacing `4-8-12-16-24-32`
- Không sai nhưng nếu muốn đồng bộ, nên tạo CSS variables hoặc class SSOT cho modal internal spacing

---

### W2. Desktop chưa tận dụng không gian — Layout vẫn giống mobile "nới rộng"

**File:** `unified-modal.tsx:163-178` (modal card)

**Vấn đề từ UI thực tế:**
- Desktop 1440px → modal chỉ rộng ~450px (size `lg` = 512px max), lọt thỏm giữa backdrop
- Footer buttons (trong consumer forms) thường dùng `flex-1` → bị kéo full-width trong modal hẹp → trông như mobile phóng to

**Nên xem xét:**
- Trên desktop, modal content có thể tận dụng `form-grid-2col` có sẵn trong `forms.css`
- Tuy nhiên đây là trách nhiệm của **consumer** (payment-receipt-form, etc.), không phải UnifiedModal core
- UnifiedModal nên có comment/docs hướng dẫn consumer dùng `form-grid-2col` trên desktop

---

### W3. Close button hardcode styles — Không dùng SSOT class

**File:** `unified-modal.tsx:209`

```tsx
className="shrink-0 p-2 bg-(--color-bg-hover) rounded-full text-text-muted 
  hover:text-dark transition-all hover:rotate-90 active:scale-90"
```

**Vấn đề:**
- Close button style hoàn toàn inline Tailwind — không có CSS class SSOT
- Nếu cần thay đổi style close button, phải sửa trực tiếp trong component
- Nên tạo `.modal-close-btn` class trong CSS

---

### W4. Drag handle hardcode dimensions

**File:** `unified-modal.tsx:186-189`

```tsx
<div className={cn(
  "w-10 h-1 rounded-full transition-colors",
  isSwiping ? "bg-text-muted" : "bg-border"
)} />
```

- `w-10 h-1` là hardcode — tuy nhỏ nhưng nên extract nếu muốn nhất quán với các bottom sheet khác

---

### W5. Scroll lock dùng inline DOM manipulation

**File:** `unified-modal.tsx:84-88`

```tsx
document.documentElement.style.overflow = "hidden";
document.body.style.overflow = "hidden";
// cleanup
document.documentElement.style.overflow = "";
document.body.style.overflow = "";
```

- Trực tiếp manipulate `style.overflow` — hoạt động tốt nhưng là imperative pattern
- Có thể tốt hơn nếu dùng CSS class toggle (thêm/xóa class `overflow-hidden` trên body)
- Tuy nhiên pattern hiện tại đã proven từ V1 → **không cần thay đổi nếu không gặp bug**

---

## 🟢 Suggestions (Tùy chọn — để tốt hơn)

### S1. Tạo CSS class SSOT cho modal structure

Hiện UnifiedModal mix Tailwind utilities + inline styles. Có thể tạo semantic classes:

```css
/* components.css hoặc tách modal.css */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
@media (min-width: 1024px) {
  .modal-overlay {
    justify-content: center;
    align-items: center;
  }
}

.modal-card {
  position: relative;
  width: 100%;
  z-index: 10;
  background: var(--color-bg-card);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  max-height: 98dvh;
}
@media (min-width: 1024px) {
  .modal-card {
    border-radius: var(--radius-lg);
    max-height: 90vh;
    margin: 0 auto;
  }
}

.modal-header { ... }
.modal-body { ... }
.modal-footer { ... }
.modal-close-btn { ... }
```

**Lợi ích:**
- Thay đổi modal design 1 chỗ → apply toàn hệ thống
- Loại bỏ hoàn toàn inline style (trừ dynamic values)
- Consistent với pattern `design-system.css` đã có

---

### S2. Desktop-optimized layout hints cho consumers

Thêm docs/comments hướng dẫn consumer dùng responsive layout trong modal:

```tsx
// Ví dụ: trong modal body, consumer nên dùng:
<div className="form-grid-2col">  {/* 1col mobile, 2col desktop */}
  <Field ... />
  <Field ... />
</div>
```

---

## 📊 Tổng kết vi phạm theo Lesson

| Lesson | Mô tả | Vi phạm tại |
|--------|--------|-------------|
| #56 | Không inline style, tạo CSS class SSOT | Line 152, 173-178 |
| #64 | V2 không dùng border — chỉ shadow | Line 224 |
| #67 | Dùng token/class đã có, không hardcode | Header/Body/Footer spacing |
| #53 | Dùng CSS classes từ design-system.css | Close button, drag handle |

---

## Next Steps

Anh muốn làm gì tiếp?

1️⃣ Xem thử Stitch design reference cho modal  
2️⃣ Lên plan fix Critical + Warnings (em viết plan → anh duyệt → mới code)   
3️⃣ Bỏ qua, lưu báo cáo  
4️⃣ 🔧 FIX ALL — Tự động sửa tất cả lỗi có thể sửa  

Gõ số (1-4) để chọn:
