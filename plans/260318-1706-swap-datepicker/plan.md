# Plan: Swap Native Date → Shared DatePicker

**Created:** 2026-03-18 17:06
**Status:** ✅ Complete
**Complexity:** Simple (1 phase)

---

## 🏥 Audit Results — Full Project Scan

### ❌ Native `<input type="date">` (CẦN SWAP → DatePicker)

| # | File | Line | Field | Context |
|---|------|------|-------|---------|
| 1 | `ContractInfoSection.tsx` | 76 | `contract_date` | Ngày hợp đồng |
| 2 | `ContractInfoSection.tsx` | 88 | `work_date` | Ngày chụp / làm việc |
| 3 | `ContractInfoSection.tsx` | 98 | `delivery_date` | Ngày giao sản phẩm |
| 4 | `CustomerFormModal.tsx` | 189 | `wedding_date` | Ngày cưới (modal tạo KH) |

### ✅ Đã dùng DatePicker đúng

| File | Context |
|------|---------|
| `contracts-list-client.tsx` | Filter từ ngày / đến ngày |

### 📊 Tổng kết

- **4 violations** — native `type="date"` cần swap
- **1 correct** — đã dùng shared DatePicker
- **0** datetime-local violations
- **2 files** cần sửa (thay vì 1 file như dự kiến ban đầu)

---

## Phase 01: Swap All Native Date Inputs

### Files to modify:
1. `components/contracts/form/ContractInfoSection.tsx` — 3 inputs
2. `components/contracts/form/modals/CustomerFormModal.tsx` — 1 input

### Implementation Steps:

#### File 1: ContractInfoSection.tsx
1. Import `DatePicker` from `@/components/ui/date-picker`
2. Swap `contract_date` input → `<DatePicker label="Ngày hợp đồng">`
3. Swap `work_date` input → `<DatePicker label="Ngày chụp / làm việc">`
4. Swap `delivery_date` input → `<DatePicker label="Ngày giao sản phẩm">`
5. Remove `<Field>` wrapper cho 3 trường (DatePicker tự có label)

#### File 2: CustomerFormModal.tsx
6. Import `DatePicker` from `@/components/ui/date-picker`
7. Swap `wedding_date` input → `<DatePicker label="Ngày cưới">`
8. Remove `<FormField>` wrapper cho trường này

### DatePicker API:
```tsx
<DatePicker
  value={formData.contract_date}       // string "yyyy-MM-dd"
  onChange={(v) => updateField("contract_date", v)}
  label="Ngày hợp đồng"
  placeholder="Chọn ngày"
/>
```

### Build + Visual verify

## Test Criteria:
- [ ] 0 remaining `type="date"` in project (except date-picker.tsx itself)
- [ ] 4 DatePicker instances working correctly
- [ ] Format hiển thị dd/MM/yyyy (Vietnamese)
- [ ] Build pass (exit code 0)
