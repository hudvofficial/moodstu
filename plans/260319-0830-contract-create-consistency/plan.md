# Plan: Contract Create — UI Consistency Fix

Created: 2026-03-19T08:30
Status: 🟡 Awaiting Approval

## Bối cảnh

Trang `/contracts/create` hiện tại có **6 vấn đề đồng bộ visual** so với Stitch mockup `590edbd1` và V2 design system. Issue C (border bride/groom) được anh exempt — **KHÔNG fix**.

## Stitch Reference

- **Desktop:** `590edbd1` — "Mood Studio Create Contract Modal"
- **Mobile:** `dedc3e9d` — "Mood Studio Mobile Create Contract Sheet"

## Issues & Plan

| # | Issue | File cần sửa | Fix |
|---|-------|-------------|-----|
| A | Cards thiếu shadow depth | `ContractInfoSection`, `ContractPaymentSection`, `ContractCustomerSection`, `ContractFinancialSummary`, form `index.tsx` | Đã dùng `card-base` rồi → check wrapper section. Nếu thiếu `card-base` thì thêm |
| B | "Loại giao dịch" dùng native `<select>` | `ContractInfoSection.tsx` | Thay native `<select>` → custom styled select (reuse `GroupedSelect` dạng flat hoặc tạo `SimpleSelect` shared component) |
| D | Bottom action buttons visual weight | `FormActions.tsx` | Chỉnh class: "Hủy" = ghost style nhỏ hơn, "Tạo HĐ" = primary prominent hơn |
| E | Label spacing | design-system.css | Check `label-base` class → đảm bảo `mb-1.5` hoặc `mb-1` consistent |
| F | Payment section native `<select>` | `ContractPaymentSection.tsx` | Tương tự B: thay native select → styled component |
| G | Mã HĐ position | form `index.tsx` | Di chuyển badge "Mã HĐ" sát dưới tiêu đề thay vì float phải |

## Phases

| Phase | Tên | Files | Thời gian | Status |
|:-----:|-----|-------|:---------:|:------:|
| 01 | SimpleSelect shared component | `components/ui/simple-select.tsx` | 15m | ⬜ Pending |
| 02 | Replace native selects (B + F) | `ContractInfoSection.tsx`, `ContractPaymentSection.tsx` | 15m | ⬜ Pending |
| 03 | Card shadow audit (A) | All form sections + `index.tsx` | 10m | ⬜ Pending |
| 04 | Button weights (D) + Label spacing (E) + Mã HĐ (G) | `FormActions.tsx`, `design-system.css`, `index.tsx` | 15m | ⬜ Pending |
| 05 | TSC + Visual Verify | Browser check | 10m | ⬜ Pending |

## Chi tiết từng Phase

### Phase 01: SimpleSelect shared component

**Mục tiêu:** Tạo `components/ui/simple-select.tsx` — dropdown styled component (không grouped) cho các select đơn giản.

**Logic:**
- Reuse pattern từ `GroupedSelect` nhưng đơn giản hơn (flat options, no groups)
- Dùng CSS classes SSOT: `input-base`, icon `ChevronDown`
- Props: `value`, `onChange`, `options: {value, label}[]`, `label?`, `placeholder?`
- Dropdown overlay sử dụng `bg-bg-card shadow-lg rounded-radius-md`
- Click outside → close

**NOTE:** Cân nhắc xem `GroupedSelect` có thể nhận `options` flat (không groups) không. Nếu có → **SKIP tạo component mới**, chỉ cần wrapper props. Check code `GroupedSelect` trước.

### Phase 02: Replace native selects

**Files:**
- `ContractInfoSection.tsx` line 49-57: `<select>` "Loại giao dịch" → `SimpleSelect`
- `ContractPaymentSection.tsx` line 81-89: `<select>` "Phương thức" → `SimpleSelect`
- `ContractPaymentSection.tsx` line 99-108: `<select>` "Giai đoạn" → `SimpleSelect`

### Phase 03: Card shadow audit

**Check từng file:**
- `ContractInfoSection.tsx` → đã có `card-base p-4` ✅
- `ContractCustomerSection.tsx` → check
- `ContractItemsSection.tsx` → check
- `ContractFinancialSummary.tsx` → check
- `ContractPaymentSection.tsx` → đã có `card-base p-4` ✅

Nếu section nào thiếu `card-base` wrapper → thêm. `card-base` trong `design-system.css` phải có `shadow-sm` (nếu chưa có → thêm).

### Phase 04: Button + Label + Mã HĐ

**FormActions.tsx:**
- "Hủy" → `btn btn-ghost text-text-secondary` (nhỏ hơn visual)
- "Lưu bản nháp" → giữ ghost + icon
- "Tạo hợp đồng" → `btn btn-interactive` (giữ nguyên, đã đúng)

**Label spacing (`design-system.css`):**
- Check `.label-base` → nên có `margin-bottom: 0.375rem` (6px) hoặc `mb-1.5`

**Mã HĐ position (`index.tsx`):**
- Hiện tại: `flex items-center justify-between` → mã HĐ float phải
- Sửa: Mã HĐ nằm dưới tiêu đề, cùng hàng hoặc trực tiếp bên dưới

## Quy tắc

- ❌ KHÔNG sửa card Cô dâu/Chú rể border (Issue C — exempt)  
- ✅ Dùng 100% CSS classes SSOT
- ✅ Dùng shared components có sẵn
- ✅ TSC check trước khi commit

## Tổng thời gian ước tính: ~1 giờ
