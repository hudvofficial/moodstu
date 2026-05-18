# Phase 01: Progressive Disclosure — Couple Fields

Status: ⬜ Pending  
Dependencies: None  
Effort: ~1 dòng sửa

## Objective

Ẩn CoupleDetailFields (10 input fields Cô dâu + Chú rể) cho đến khi user đã chọn hoặc tạo khách hàng.

## Vấn đề hiện tại

File: `ContractCustomerSection.tsx`

**State: Chưa chọn KH** (line 86-226):
```tsx
// Line 222-224 — CoupleDetailFields hiện LUÔN khi showCoupleFields = true
{showCoupleFields && (
  <CoupleDetailFields formData={formData} updateField={updateField} />
)}
```

`showCoupleFields` chỉ check `service_type` (default = "studio" → TRUE).  
Không check `customer.selectedCustomer` → 10 empty fields hiện ngay khi mở form.

**State: Đã chọn KH** (line 39-83):
```tsx
// Line 79-81 — Đã đúng, chỉ hiện khi có customer
{showCoupleFields && (
  <CoupleDetailFields formData={formData} updateField={updateField} />
)}
```

## Implementation

### Thay đổi duy nhất

File: `components/contracts/form/ContractCustomerSection.tsx`  
Line: 222

```diff
- {showCoupleFields && (
+ {showCoupleFields && customer.selectedCustomer && (
    <CoupleDetailFields formData={formData} updateField={updateField} />
  )}
```

### Logic flow sau khi fix

1. User mở form → **Chỉ thấy search bar** (không có couple fields)
2. User gõ tên → dropdown kết quả
3. User chọn KH cũ → `customer.selectedCustomer` = truthy → `CoupleDetailFields` xuất hiện (auto-filled từ `useEffect` line 90-107 trong `useContractForm.ts`)
4. User tạo KH mới → modal → save → `onCustomerCreated` → `selectCustomer` → `selectedCustomer` set → `CoupleDetailFields` xuất hiện

### Không ảnh hưởng

- Edit mode: `loadContractForEdit` gọi `customer.prefillCustomer()` → `selectedCustomer` luôn có → couple fields hiện đúng
- Auto-fill logic: `useEffect` trong `useContractForm.ts` vẫn chạy bình thường (triggered by `customer.selectedCustomer` change)
- Data flow: Không thay đổi. Couple data vẫn được submit qua `formData` fields

## Test Criteria

- [ ] Mở `/contracts/create` → CoupleDetailFields KHÔNG hiện dưới search bar
- [ ] Chọn KH có bride_name từ search → CoupleDetailFields hiện + auto-filled
- [ ] Tạo KH mới → CoupleDetailFields hiện (trống, sẵn sàng fill)
- [ ] Clear KH (bấm "Đổi") → CoupleDetailFields biến mất
- [ ] Chọn lại KH khác → CoupleDetailFields update với data mới
- [ ] Edit mode (`/contracts/[id]/edit`) → CoupleDetailFields hiện đúng

---
Next Phase: phase-02-remove-standalone-button.md
