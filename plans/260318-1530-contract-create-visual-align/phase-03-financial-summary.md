# Phase 03: Financial Summary Layout

**Status:** ⬜ Pending
**Dependencies:** Phase 01
**Files:** ContractFinancialSummary.tsx

---

## Objective

Align financial summary layout với Stitch: right-aligned summary box
thay vì card-base hiện tại. Thêm toggle VNĐ/% cho giảm giá.

## Stitch Reference

```html
<!-- Stitch desktop line 267-294 -->
<div class="flex flex-col items-end space-y-3 bg-slate-50/50 p-6 rounded-lg">
  <div class="flex justify-between w-full max-w-xs">
    <span>Tổng tạm tính:</span>
    <span>23.000.000 VND</span>
  </div>
  <!-- Chi phí phát sinh (input) -->
  <!-- Giảm giá (VNĐ/% toggle + input) -->
  <!-- Voucher (input) -->
  <div class="border-t pt-3">
    <span class="font-bold uppercase">TỔNG CỘNG:</span>
    <span class="text-primary font-bold">22.000.000 VND</span>
  </div>
</div>
```

## Implementation Steps

### Step 1: Redesign layout

- [ ] Summary box: right-aligned (`flex flex-col items-end`)
- [ ] Background: subtle `bg-bg-base/50` (earth-tone equiv of slate-50)  
- [ ] Padding: `p-6` rounded `radius-md`
- [ ] Width constraint: `max-w-xs` cho summary rows

### Step 2: Discount toggle (VNĐ / %)

```tsx
<div className="flex items-center gap-2">
  <span className="text-body-sm text-text-secondary">Giảm giá:</span>
  <div className="flex border border-main rounded-radius-sm overflow-hidden text-caption font-bold">
    <button 
      className={discountType === 'fixed' ? 'px-2 py-1 bg-interactive text-text-inverse' : 'px-2 py-1 bg-bg-card text-text-muted'}
      onClick={() => setDiscountType('fixed')}
    >VNĐ</button>
    <button 
      className={discountType === 'percent' ? 'px-2 py-1 bg-interactive text-text-inverse' : 'px-2 py-1 bg-bg-card text-text-muted'}
      onClick={() => setDiscountType('percent')}
    >%</button>
  </div>
</div>
```

- [ ] Add `discountType` state to useContractFinancials hook
- [ ] VNĐ = absolute discount, % = percentage discount
- [ ] Recalc total when type changes

### Step 3: Total row separator

- [ ] Divider line (`border-t border-main`) before total
- [ ] Total: `text-body font-bold text-interactive` (primary color)
- [ ] Label: Sentence case ("Tổng cộng" not "TỔNG CỘNG" — per design-specs rule)

## Test Criteria

- [ ] Summary box right-aligned on desktop
- [ ] Mobile: full width
- [ ] Discount toggle works (VNĐ ↔ %)
- [ ] Total recalculates correctly on toggle
- [ ] Divider line above total
- [ ] Total amount in primary color (#8B5E3C)
- [ ] All classes from SSOT (no inline Tailwind)

---
Next Phase: Phase 04 (FormActions + Save Draft)
