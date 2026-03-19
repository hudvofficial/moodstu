# Phase 01c: Form Components Sync — Design System SSOT

**Status:** ✅ Complete
**Lesson ref:** #53 — "DÙNG CSS CLASSES TỪ design-system.css, KHÔNG HARDCODE"
**Scope:** Đồng bộ TẤT CẢ form components về `.input-base` + `.label-base` + `.btn`
**Goal:** Mọi component dùng 1 nguồn sự thật duy nhất → thay đổi 1 chỗ = cả app đổi

---

## Vấn đề gốc

Components được code ở **thời điểm khác nhau** → mỗi cái tự hardcode styles riêng:
- `Select` + `CurrencyInput` — code TRƯỚC design system → sai font-size, border-radius, font-weight
- `Input` — code CÙNG LÚC design system → gần đúng nhưng chưa dùng CSS class
- `DatePicker` + `SearchBar` — code SAU → đúng chuẩn ✅

**Hệ quả:** Select text bự hơn Input, border-radius lệch, bg không nhất quán.

---

## Design System SSOT (design-system.css)

```css
.label-base {
  font-size: var(--font-size-label);     /* 11px */
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
  margin-left: 4px;
}

.input-base {
  padding: 10px var(--spacing-base);     /* 10px 16px */
  min-height: 44px;
  border-radius: var(--radius-sm);       /* 12px */
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  font-size: var(--font-size-body-sm);   /* 14px */
  color: var(--color-text-primary);
  /* + focus/placeholder/disabled states */
}

.btn { border-radius: var(--radius-sm); font-size: var(--font-size-body-sm); }
```

---

## Phases

| # | Task | File | Thay đổi | Status |
|---|------|------|----------|--------|
| 1 | Input → `.input-base` + `.label-base` | `components/ui/input.tsx` | Thay TW classes → CSS class | ✅ |
| 2 | Select → `.input-base` + `.label-base` | `components/ui/select.tsx` | Thay TW classes → CSS class | ✅ |
| 3 | CurrencyInput → `.input-base` + `.label-base` | `components/ui/currency-input.tsx` | Thay TW classes → CSS class | ✅ |
| 4 | Thêm `.select-trigger` vào design-system.css | `app/design-system.css` | Class cho select trigger | ✅ |
| 5 | Thêm `.error-text` vào design-system.css | `app/design-system.css` | Error message style chung | ✅ |
| 6 | Verify build + visual check | — | npm run dev | ✅ |
| 7 | Update lessons.md | `tasks/lessons.md` | Ghi bài học | ✅ |

**Total:** 5 files sửa, ~30 phút

---

## Chi tiết thay đổi

### Task 1: `Input` → `.input-base`

**Trước (hardcode TW):**
```tsx
<label className="text-xs font-medium text-text-secondary ml-1">
<input className="flex w-full rounded-xl border border-border bg-bg-base/50 px-4 py-3 text-sm..."
<p className="text-[11px] text-error font-medium ml-1">
```

**Sau (CSS class):**
```tsx
<label className="label-base">
<input className={cn("input-base", error && "border-error focus:ring-error/20", className)}
<p className="error-text">
```

**⚠️ KHÔNG đổi logic**, chỉ đổi class references.

---

### Task 2: `Select` → `.input-base`

**Trước (sai lệch):**
```tsx
// Trigger — 5 vấn đề:
<button className="h-12 px-5 bg-bg-card border border-border rounded-2xl..."
<span className="font-semibold truncate">  // ← font-size=16px, weight=600

// Label
<label className="text-xs font-medium text-text-secondary ml-1">

// Error
<p className="text-[11px] font-bold text-error ml-1">
```

**Sau (đồng bộ):**
```tsx
// Trigger — dùng .input-base + override cho select behavior
<button className={cn("input-base flex items-center justify-between", ...)}
<span className="truncate">  // ← inherit font-size=14px, weight=400 từ .input-base

// Label
<label className="label-base">

// Error
<p className="error-text">
```

**⚠️ Giữ nguyên:** dropdown logic, search, animation, z-index.

---

### Task 3: `CurrencyInput` → `.input-base`

**Trước:**
```tsx
<label className="text-xs font-medium text-text-secondary ml-1">
<input className="w-full h-12 px-5 bg-bg-card border border-border rounded-2xl...font-semibold"
<p className="text-[11px] font-bold text-error ml-1">
```

**Sau:**
```tsx
<label className="label-base">
<input className={cn("input-base text-right pr-12", ...)}
<p className="error-text">
```

**⚠️ Giữ nguyên:** VNĐ suffix, currency format logic.

---

### Task 4: Thêm classes vào `design-system.css`

```css
/* Select trigger — extends .input-base */
.select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  text-align: left;
}

/* Error text — form validation messages */
.error-text {
  font-size: var(--font-size-caption);
  font-weight: 500;
  color: var(--color-error);
  margin-top: 4px;
  margin-left: 4px;
}

/* Input error state */
.input-error {
  border-color: var(--color-error);
}
.input-error:focus {
  box-shadow: 0 0 0 3px rgba(244, 67, 54, 0.1);
}
```

---

### Task 5: Verify

- [ ] `npm run dev` — no errors
- [ ] Visual: Input vs Select vs CurrencyInput cùng font-size, border-radius, height
- [ ] Focus state: cùng primary ring
- [ ] Error state: cùng red border + text

---

## ⚠️ Rules

1. **KHÔNG đổi logic** — chỉ đổi CSS class references
2. **KHÔNG đổi props API** — component API giữ nguyên
3. **1 file CSS SSOT** — design-system.css là "truth"
4. **Test visual** — sau khi sync phải nhìn giống nhau
5. **Grep check** — sau khi xong, grep `h-12 px-5 bg-bg-card.*rounded-2xl` → phải = 0 kết quả
