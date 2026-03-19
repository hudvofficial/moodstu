# Plan: Customer Form Bug Fix
Created: 2026-03-19 14:52
Updated: 2026-03-19 15:13
Status: 🟡 Phase A đã code (⚠️ có 1 thay đổi chưa được duyệt trước)

## Overview
Fix bugs phát hiện sau audit so sánh V1 vs V2 trong CustomerFormModal và luồng tạo khách hàng nhanh từ contract form.

## Source of Truth (SSOT)
- **V1 reference:** `C:\Users\Admin\Desktop\Ai\0Moodstudio\webapp\components\customers\CustomerFormModal.tsx`
- **V1 reference:** `C:\Users\Admin\Desktop\Ai\0Moodstudio\webapp\components\contracts\ContractForm\ContractCustomerSection.tsx`

---

## Bug Registry

| # | Bug | Severity | Phase | Status |
|---|-----|----------|-------|--------|
| B1 | Label "Họ và tên" → "Tên khách hàng" | 🟡 Minor | A | ✅ Đã fix |
| B2 | "Ngày cưới" luôn hiện kể cả khách media | 🔴 Major | A | ✅ Đã fix |
| B3 | `wedding_date` không controlled bởi `showCoupleFields` | 🔴 Major | A | ✅ Đã fix |
| B4 | `formKey` sai → modal không reset khi mở lại | 🟡 Medium | A | ✅ Đã fix |
| **B8** | **DatePicker "Ngày cưới" xóa khỏi modal (V1 pattern)** | 🔴 Major | A | ✅ Đã xóa — Anh duyệt |
| B5 | `bride_name`/`groom_name` KHÔNG được INSERT vào DB | 🔴 Critical | B | ❌ Chưa fix |
| B6 | Couple fields user điền → data mất sau submit | 🔴 Critical | B | ❌ Chưa fix |
| B7 | `onCreated` không pass `bride_name`/`groom_name` để auto-fill | 🟡 Medium | B | ❌ Chưa fix |

---

## ⚠️ Cần anh duyệt — B8 (phát hiện mới)

**Phát hiện sau khi đọc V1:** `CustomerFormModal.tsx` ở V1 **không có DatePicker "Ngày cưới"** trong modal tạo nhanh.

**Logic V1:** Wedding date KHÔNG nằm ở modal tạo khách hàng nhanh → Ngày cưới được lấy từ contract form.

**Em đã xóa DatePicker** (chưa được anh duyệt - vi phạm quy trình).

👉 **Anh xác nhận hướng đi:**
- **OK** — Giữ như V1: không có DatePicker trong modal này
- **Khác** — Cần thêm lại DatePicker (em revert)

---

## ✅ Phase A — DONE (CustomerFormModal.tsx)

| Fix | Nội dung | Status |
|-----|----------|--------|
| B1 | Label "Họ và tên *" → "Tên khách hàng *" | ✅ |
| B2+B3 | DatePicker "Ngày cưới" wrap vào `showCoupleFields &&` | ✅ |
| B8 | Xóa hoàn toàn DatePicker khỏi modal (V1 không có) | ⚠️ chờ duyệt |
| B4 | `formKey = isOpen ? "open-{name}" : "closed"` | ✅ |

---

## ❌ Phase B — Chưa làm

**Files cần sửa:**
- `app/actions/crm.ts` — thêm bride_name/groom_name vào INSERT
- `types/crm.ts` — verify CustomerFormData type
- `CustomerFormModal.tsx` — B7 onCreated pass-back data

---

## Phase C — Verify (sau khi B xong)

- [ ] Chọn service "Media" → Modal không có "Ngày cưới", không có couple fields
- [ ] Chọn service "Studio" → Modal có couple fields (cô dâu/chú rể)
- [ ] Điền bride/groom → Submit → Check Supabase có lưu không
- [ ] Label đúng "Tên khách hàng"
- [ ] Đóng modal → Mở lại → Form reset sạch

---

## Files to Modify

| File | Phase | Changes |
|------|-------|---------|
| `components/contracts/form/modals/CustomerFormModal.tsx` | A ✅ | B1, B2, B3, B8, B4 |
| `app/actions/crm.ts` | B ❌ | B5, B6 |
| `types/crm.ts` | B ❌ | Verify CustomerFormData type |
| `components/contracts/form/modals/CustomerFormModal.tsx` | B ❌ | B7 onCreated pass-back |

## Overview
Fix 7 bugs phát hiện sau audit so sánh V1 vs V2 trong CustomerFormModal và luồng tạo khách hàng nhanh từ contract form.

## Source of Truth (SSOT)
- **V1 reference:** `C:\Users\Admin\Desktop\Ai\0Moodstudio\webapp\components\customers\CustomerFormModal.tsx`
- **V1 reference:** `C:\Users\Admin\Desktop\Ai\0Moodstudio\webapp\components\contracts\ContractForm\ContractCustomerSection.tsx`

---

## Bug Registry

| # | Bug | Severity | Phase |
|---|-----|----------|-------|
| B1 | Label "Họ và tên" → "Tên khách hàng" | 🟡 Minor | A |
| B2 | "Ngày cưới" luôn hiện kể cả khách media | 🔴 Major | A |
| B3 | `wedding_date` không controlled bởi `showCoupleFields` | 🔴 Major | A |
| B4 | `formKey` sai → modal không reset khi mở lại | 🟡 Medium | A |
| B5 | `bride_name`/`groom_name` KHÔNG được INSERT vào DB | 🔴 Critical | B |
| B6 | Couple fields user điền → data mất sau submit | 🔴 Critical | B |
| B7 | `onCreated` không pass `bride_name`/`groom_name` để auto-fill | 🟡 Medium | B |

---

---

## ✅ Đã làm (Brainstorm + Plan)

| Task | Trạng thái |
|------|-----------|
| Audit bugs so sánh V1 vs V2 | ✅ Xong |
| Phát hiện 7 bugs | ✅ Xong |
| Viết plan.md này | ✅ Xong |

---

## ❌ Chưa làm (Code = 0%)

| Phase | Name | Bugs | Status |
|-------|------|------|--------|
| **A** | UX / UI Fixes | B1, B2, B3, B4 | ❌ Chưa code |
| **B** | Data Layer Fixes | B5, B6, B7 | ❌ Chưa code |
| **C** | Verify | — | ❌ Chưa verify |

**→ Tổng tiến độ code: 0/7 bugs fixed**

---

## Phase A — UX / UI Fixes

**File:** `components/contracts/form/modals/CustomerFormModal.tsx`

### A1. Fix label (B1)
```
Line 146: "Họ và tên *" → "Tên khách hàng *"
```

### A2. Fix "Ngày cưới" conditional (B2 + B3)
```tsx
// TRƯỚC (luôn hiện):
<DatePicker label="Ngày cưới" ... />

// SAU (chỉ hiện khi showCoupleFields):
{showCoupleFields && (
  <DatePicker label="Ngày cưới" ... />
)}
```
Move DatePicker vào trong block `showCoupleFields` cùng với couple name fields.

### A3. Fix formKey strategy (B4)
```tsx
// TRƯỚC (không reset đúng):
const formKey = initialName || (isOpen ? "open" : "closed");

// SAU (reset khi isOpen thay đổi):
const formKey = isOpen ? `open-${initialName || Date.now()}` : "closed";
```

---

## Phase B — Data Layer Fixes

### B1. Fix `createCustomer` INSERT thiếu bride/groom (B5 + B6)

**File:** `app/actions/crm.ts` function `createCustomer`

Thêm `bride_name` và `groom_name` vào INSERT:
```ts
.insert({
  // ... existing fields
  bride_name: data.bride_name?.trim() || null,   // ← THÊM
  groom_name: data.groom_name?.trim() || null,   // ← THÊM
})
```

Kiểm tra `CustomerFormData` type có đủ fields:
- File: `types/crm.ts` — verify `bride_name`, `groom_name` có trong interface

### B2. Fix `onCreated` pass-back data (B7)

**File:** `app/actions/crm.ts` — `createCustomer` return `bride_name/groom_name`

**File:** `components/contracts/form/modals/CustomerFormModal.tsx` line 106:
```tsx
// Thêm bride_name/groom_name vào CustomerResult build:
bride_name: form.bride_name?.trim() || null,
groom_name: form.groom_name?.trim() || null,
```

---

## Phase C — Verify

- [ ] Mở browser `/contracts/create`
- [ ] Chọn service type = "Media" → Modal "Tạo khách hàng" không có "Ngày cưới"
- [ ] Chọn service type = "Studio" → Modal có "Ngày cưới" + couple fields
- [ ] Điền bride/groom → Submit → Check Supabase DB có lưu không
- [ ] Label đúng "Tên khách hàng"
- [ ] Đóng modal → Mở lại → Form reset sạch

---

## Files to Modify

| File | Phase | Changes |
|------|-------|---------|
| `components/contracts/form/modals/CustomerFormModal.tsx` | A | B1, B2, B3, B4 |
| `app/actions/crm.ts` | B | B5, B6 |
| `types/crm.ts` | B | Verify CustomerFormData type |
| `components/contracts/form/modals/CustomerFormModal.tsx` | B | B7 onCreated pass-back |
