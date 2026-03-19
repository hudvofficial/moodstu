# Phase 02: Customer Couple Cards (Earth-Tone)

**Status:** ⬜ Pending
**Dependencies:** Phase 01
**Files:** ContractCustomerSection.tsx, design-system.css

---

## Objective

Thêm visual cards cho thông tin cô dâu / chú rể giống Stitch design,
nhưng dùng earth-tone palette thay vì pink/blue (đồng bộ V2).

## Stitch Reference

```html
<!-- Stitch: Pink card (cô dâu) -->
<div class="p-5 border border-pink-100 bg-pink-50/30 rounded-xl">
  <span class="text-pink-700">Thông tin Cô dâu</span>
  <!-- Fields: Họ tên, SĐT, Chiều cao, Cân nặng, Size giày -->
</div>

<!-- Stitch: Blue card (chú rể) -->
<div class="p-5 border border-blue-100 bg-blue-50/30 rounded-xl">
  <span class="text-blue-700">Thông tin Chú rể</span>
</div>
```

## V2 Earth-Tone Adaptation

Dùng subtle warm tones thay pink/blue:
- Cô dâu: `bg-rose-50/40 border-rose-200/50` (subtle rose — still wedding-themed)
- Chú rể: `bg-sky-50/40 border-sky-200/50` (subtle blue — contrast with rose)

> Lý do giữ rose/sky nhẹ: Đây là wedding studio, pink/blue cho couple là
> ngữ nghĩa domain (không phải style arbitrary). Chỉ giảm intensity.

## Implementation Steps

### Step 1: Thêm couple card classes vào design-system.css

```css
/* Couple Cards — Wedding Domain Colors */
.couple-card-bride {
  padding: var(--space-5);
  border: 1px solid rgba(251, 113, 133, 0.2);  /* rose-400/20 */
  background: rgba(255, 241, 242, 0.4);         /* rose-50/40 */
  border-radius: var(--radius-lg);
}
.couple-card-groom {
  padding: var(--space-5);
  border: 1px solid rgba(125, 211, 252, 0.2);  /* sky-300/20 */
  background: rgba(240, 249, 255, 0.4);         /* sky-50/40 */
  border-radius: var(--radius-lg);
}
```

- [ ] Thêm classes vào `app/design-system.css`

### Step 2: Refactor ContractCustomerSection.tsx

Hiện tại: Customer search → bridge/groom name inputs (plain)

Cần đổi thành:
```tsx
{/* Couple info (chỉ hiện khi shouldShowCoupleFields) */}
{showCoupleFields && (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    {/* Cô dâu card */}
    <div className="couple-card-bride space-y-3">
      <div className="flex items-center gap-2">
        <Heart size={16} className="text-rose-400" />
        <span className="text-body-sm font-semibold text-rose-700">Thông tin Cô dâu</span>
      </div>
      <Field label="Họ và tên">
        <input className="input-base" ... />
      </Field>
    </div>
    
    {/* Chú rể card */}
    <div className="couple-card-groom space-y-3">
      <div className="flex items-center gap-2">
        <User size={16} className="text-sky-500" />
        <span className="text-body-sm font-semibold text-sky-700">Thông tin Chú rể</span>
      </div>
      <Field label="Họ và tên">
        <input className="input-base" ... />
      </Field>
    </div>
  </div>
)}
```

- [ ] Import `Heart`, `User` from lucide-react
- [ ] Wrap bride/groom inputs vào couple cards
- [ ] Giữ nguyên existing logic (showCoupleFields, onChange handlers)
- [ ] Mobile: stack 1 column, Desktop: 2 columns side-by-side

### Step 3: Verify icons

- [ ] `Heart` icon cho cô dâu (lucide-react, NOT Material Symbols)
- [ ] `User` icon cho chú rể

## Test Criteria

- [ ] Couple cards hiển thị khi `showCoupleFields = true`
- [ ] Cards có subtle rose/sky background + border
- [ ] Icons đúng (lucide Heart + User)
- [ ] Labels đúng ("Thông tin Cô dâu", "Thông tin Chú rể")
- [ ] Mobile: stacked 1 column
- [ ] Desktop: side-by-side 2 columns
- [ ] Inputs vẫn dùng `.input-base` (SSOT)

---
Next Phase: Phase 03 (Financial Summary Redesign)
