# Plan: Fix Modal Desktop Corners + Native DatePicker
Created: 2026-03-21T21:10
Status: ⬜ Pending

## Bằng chứng (browser JS audit)
```json
{"btlr":"16px","btrr":"16px","bblr":"0px","bbrr":"0px"}
```
→ TW4 class `lg:rounded-b-xl` CÓ trong element nhưng computed = 0px.
→ TW4 class combo KHÔNG TIN ĐƯỢC cho responsive border-radius.

## Phases

| Phase | Nội dung | Files | Status |
|-------|----------|-------|--------|
| 01 | Fix modal radius — CSS class thay TW | `pages.css` + `unified-modal.tsx` | ⬜ |
| 02 | Swap native date → DatePicker SSOT | 3 form files | ⬜ |
| 03 | Verify build + visual | Browser | ⬜ |

---

## Phase 01: Fix Modal Radius (2 files)

### Step 1.1: `app/styles/pages.css`
Thêm class sau section animations (~line 359):

```css
/* Modal card radius — SSOT: mobile bottom-sheet / desktop dialog */
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

### Step 1.2: `components/ui/unified-modal.tsx` line 166
```diff
- "rounded-t-2xl lg:rounded-t-xl lg:rounded-b-xl",
+ "modal-card-radius",
```

---

## Phase 02: Swap Native DatePicker → SSOT (3 files)

### Step 2.1: `payment-receipt-form.tsx`
- Thêm import: `import DatePicker from "@/components/ui/date-picker";`
- Line ~182-187: Swap `<input type="date">` → `<DatePicker label="Ngày thu" value={paymentDate} onChange={setPaymentDate} />`

### Step 2.2: `printing-order-form.tsx`
- Thêm import: `import DatePicker from "@/components/ui/date-picker";`
- Line ~147-153: Swap `<input type="date">` → `<DatePicker label="Ngày dự kiến nhận" value={expectedDate} onChange={setExpectedDate} />`

### Step 2.3: `inventory-reservation-form.tsx`
- Thêm import: `import DatePicker from "@/components/ui/date-picker";`
- Line ~222-228: Swap `<input type="date">` → `<DatePicker label="Ngày bắt đầu" value={startDate} onChange={setStartDate} />`

---

## Phase 03: Verify
- [ ] Build pass
- [ ] Desktop: modal 4 góc bo đều (all modals)
- [ ] Mobile: modal chỉ bo trên (bottom sheet)
- [ ] DatePicker styled trên cả 3 form

## Tổng: 5 file, 0 dependency mới, 0 logic change
