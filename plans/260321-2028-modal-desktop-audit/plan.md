# Plan: Contract Detail — Modal & Quick Actions Bug Fix
Created: 2026-03-21T20:36
Status: ⬜ Pending

## Tổng quan

Contract detail page có nhiều bug UI cần fix đồng bộ V2 SSOT.

---

## 🔴 BUG 1: Modal bottom corners vuông trên desktop

### Root cause
TW4 class combos `rounded-t-2xl lg:rounded-xl` và `rounded-t-2xl lg:rounded-t-xl lg:rounded-b-xl`
đều FAIL do cách TW4 xử lý utility ordering trong CSS layers.

### Fix: Custom CSS class thay TW combo (100% reliable)

**File: `app/styles/pages.css`** — Thêm class:
```css
.modal-card-radius {
  border-top-left-radius: var(--radius-xl);
  border-top-right-radius: var(--radius-xl);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}
@media (min-width: 1024px) {
  .modal-card-radius {
    border-radius: var(--radius-lg);
  }
}
```

**File: `components/ui/unified-modal.tsx` line 166:**
```tsx
// TRƯỚC
"rounded-t-2xl lg:rounded-t-xl lg:rounded-b-xl",
// SAU
"modal-card-radius",
```

### Impact: FIX TẤT CẢ modal cùng lúc (1 chỗ sửa)

---

## 🔴 BUG 2: Native datepicker — phải dùng SSOT DatePicker

### Context
Project ĐÃ CÓ `components/ui/date-picker.tsx` — custom DatePicker với:
- Design tokens (font, color, radius, spacing)
- Mobile: bottom sheet calendar
- Desktop: portal popover calendar
- Format dd/MM/yyyy (locale vi)

Nhiều nơi đã dùng đúng: `ContractInfoSection`, `add-event-modal`, `event-task-modal`, `contracts-list-client`.

**3 modal form quên dùng, đang dùng `<input type="date">` native:**

### Fix 1: `payment-receipt-form.tsx` line 182-187
```tsx
// TRƯỚC
<label className="label-base mb-1 block">Ngày thu</label>
<input
  type="date"
  value={paymentDate}
  onChange={(e) => setPaymentDate(e.target.value)}
  className="input-base w-full"
/>

// SAU
<DatePicker
  label="Ngày thu"
  value={paymentDate}
  onChange={setPaymentDate}
/>
```
+ Thêm import: `import DatePicker from "@/components/ui/date-picker";`

### Fix 2: `printing-order-form.tsx` line 147-153
```tsx
// TRƯỚC
<label className="label-base mb-1 block">Ngày dự kiến nhận</label>
<input
  type="date"
  value={expectedDate}
  onChange={(e) => setExpectedDate(e.target.value)}
  className="input-base w-full"
/>

// SAU
<DatePicker
  label="Ngày dự kiến nhận"
  value={expectedDate}
  onChange={setExpectedDate}
/>
```
+ Thêm import: `import DatePicker from "@/components/ui/date-picker";`

### Fix 3: `inventory-reservation-form.tsx` line 222-228
```tsx
// TRƯỚC
<label className="label-base mb-1 block">Ngày bắt đầu</label>
<input
  type="date"
  value={startDate}
  onChange={(e) => setStartDate(e.target.value)}
  className="input-base w-full"
/>

// SAU
<DatePicker
  label="Ngày bắt đầu"
  value={startDate}
  onChange={setStartDate}
/>
```
+ Thêm import: `import DatePicker from "@/components/ui/date-picker";`

---

## FILES SỬA

| # | File | Thay đổi |
|---|------|----------|
| 1 | `app/styles/pages.css` | Thêm `.modal-card-radius` class |
| 2 | `components/ui/unified-modal.tsx` | Line 166: swap TW → `.modal-card-radius` |
| 3 | `components/contracts/detail/payment-receipt-form.tsx` | Swap native date → DatePicker + import |
| 4 | `components/contracts/detail/printing-order-form.tsx` | Swap native date → DatePicker + import |
| 5 | `components/contracts/detail/inventory-reservation-form.tsx` | Swap native date → DatePicker + import |

## KHÔNG SỬA (ngoài scope)
- Quick Actions card — cần confirm bug cụ thể từ anh
- Logic/behavior của modal — chỉ fix visual

## VERIFY
1. Build pass (`npm run dev`)
2. Desktop: modal 4 góc bo đều
3. Mobile: modal chỉ bo trên (bottom sheet)
4. DatePicker popup trên cả 3 form: styled theo design system
