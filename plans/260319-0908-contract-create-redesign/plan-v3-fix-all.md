# Plan v3: Fix All — Stitch HTML 100% Alignment
Created: 2026-03-19T10:21
Status: 🟡 Pending approval
SSOT: `tmp/stitch_desktop.html` (302 lines, freshly downloaded)

---

## 7 Fixes — 3 Phases

### Phase A: Typography (ALL H3 + textarea rows)
**Files:** 5 files
**Stitch:** `text-lg font-bold` (lines 73, 121, 172, 229, 255, 288)
**Code hiện tại:** `text-body font-semibold` ← SAI

| File | Line ref (Stitch) | Change |
|------|-------------------|--------|
| `ContractInfoSection.tsx` | L73 | `text-body font-semibold` → `text-lg font-bold` |
| `ContractCustomerSection.tsx` | L121 | `text-body font-semibold` → `text-lg font-bold` (2 chỗ) |
| `ContractItemsSection.tsx` | L172 | `text-body font-semibold` → `text-lg font-bold` |
| `ContractFinancialSummary.tsx` | L229 | `text-body font-semibold` → `text-lg font-bold` |
| `ContractPaymentSection.tsx` | L255 | `text-body font-semibold` → `text-lg font-bold` |
| `index.tsx` (S6) | L288 | `text-body font-semibold` → `text-lg font-bold` |
| `ContractInfoSection.tsx` | L115 | textarea `rows={2}` → `rows={3}` |

### Phase B: Layout Structure (S2 search inline + S3 card wrap)
**Files:** 2 files

**B1. S2 search CÙNG HÀNG h3** (Stitch L119-132):
```html
<!-- Stitch: flex justify-between, search + button CÙNG HÀNG h3 -->
<div class="flex items-center justify-between">
  <h3>2. Khách hàng</h3>
  <div class="flex items-center gap-4 flex-1 max-w-md ml-8">
    <div class="relative flex-1">
      <input placeholder="Tìm kiếm khách hàng..."/>
    </div>
    <button>person_add Tạo khách hàng mới</button>
  </div>
</div>
```
- File: `ContractCustomerSection.tsx` (searching state)
- Hiện tại: h3 riêng, search bên dưới
- Fix: Gộp h3 + search + "Tạo mới" vào 1 flex row

**B2. S3 wrap trong card** (Stitch L169):
```html
<section class="bg-surface card-radius custom-shadow p-6 space-y-6">
```
- File: `ContractItemsSection.tsx`
- Hiện tại: `space-y-4` không card
- Fix: Wrap toàn bộ section trong `card-base p-6 space-y-6`

**B3. S3 count badge** (Stitch L173):
```html
<span class="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">2</span>
```
- Hiện tại: `(n)` inline text
- Fix: Pill badge

### Phase C: Header + Footer polish
**Files:** 2 files

**C1. Header h-14 → h-16** (Stitch L47):
- File: `index.tsx`
- `h-14` → `h-16`, `pt-[72px]` → `pt-[80px]`

**C2. Footer buttons** (Stitch L293-301):
```html
<!-- Hủy -->
<button class="px-6 py-2.5 text-slate-500 font-semibold hover:bg-slate-50 rounded-lg">

<!-- Lưu nháp -->
<button class="px-6 py-2.5 text-primary font-semibold border border-primary/20 hover:bg-primary/5 rounded-lg">

<!-- Tạo HĐ -->
<button class="px-8 py-2.5 bg-primary text-white font-bold rounded-lg shadow-lg shadow-primary/20 hover:brightness-110">
```
- File: `FormActions.tsx`
- Fix: Exact padding + hover:brightness-110 + shadow-primary/20

---

## Execution Order
```
Phase A (typography) → Phase B (layout) → Phase C (polish)
```

## Files Modified
- `ContractInfoSection.tsx` — H3 font + rows
- `ContractCustomerSection.tsx` — H3 font + search inline
- `ContractItemsSection.tsx` — H3 font + card wrap + badge
- `ContractFinancialSummary.tsx` — H3 font
- `ContractPaymentSection.tsx` — H3 font
- `index.tsx` — H3 font (S6) + header h-16
- `FormActions.tsx` — button padding

## Rules
- 100% shared classes, no inline style
- Preserve ALL existing logic
- Kill port 3000 only (không kill MCP)
- Verify visual sau mỗi phase
