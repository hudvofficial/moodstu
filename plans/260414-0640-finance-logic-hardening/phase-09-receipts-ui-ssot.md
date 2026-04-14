# Phase 09: Finance Receipts UI Optimization + SSOT Token Compliance
Status: ⬜ Pending
Dependencies: Phase 02 (pipeline thay đổi createReceipt flow), Phase 08 (lint clean baseline)

## Objective
Đưa toàn bộ `components/finance/receipts/*` về compliance SSOT token map (`ssot-token-map.md`). Không chỉ pass lint — mục tiêu là UI nhất quán, vận hành thật ổn định, và zero token drift.

## SSOT Audit Results (Pre-fix)

| Check | Kết quả | Severity |
|-------|---------|----------|
| ❌ `type="number"` | `sale-item-selector.tsx:144` — `<Input type="number">` cho quantity | HIGH |
| ✅ No hardcoded hex | 0 results | OK |
| ✅ No `bg-white rounded` | 0 results | OK |
| ✅ No custom `modal-overlay` | 0 results (UnifiedModal used) | OK |
| ✅ No `useEffect` + `fetch` in list data | 0 results (SWR used for list + stats) | OK |
| ❌ `useEffect` + `.then()` fetch (modal) | `receipt-form-modal.tsx:102-106` — inventory fetch | MEDIUM |
| ❌ Hardcoded cache key | `receipts-client.tsx:50` — `receipt-stats-${month}-${year}` | MEDIUM |
| ⚠️ File > 250 lines | `receipt-form-modal.tsx: 263 lines` — borderline, xem xét tách | LOW |
| ✅ All modals use `<UnifiedModal>` | Confirmed | OK |
| ✅ Buttons use shared `<Button>` | Confirmed (all 7 files) | OK |
| ✅ Badges use `badge badge-*` | Confirmed | OK |
| ✅ Tables use `<TableWrapper>` | Confirmed | OK |
| ✅ Forms use `form-grid-2col`, `form-actions` | Confirmed | OK |
| ✅ Cards use `card-base` | Confirmed | OK |

---

## Implementation Steps

### Step 1: Fix `type="number"` → quantity control chuẩn

**File:** `components/finance/receipts/sale-item-selector.tsx`
**Line:** 143-150

**Hiện tại:**
```tsx
<Input
  type="number"
  min={1}
  max={inv?.current_stock || 999}
  value={item.quantity}
  onChange={(e) => updateQuantity(index, parseInt(e.target.value, 10) || 1)}
  className="w-full tabular-nums"
/>
```

**Fix → dùng `<Input type="text" inputMode="numeric">` + validation:**
```tsx
<Input
  type="text"
  inputMode="numeric"
  value={String(item.quantity)}
  onChange={(e) => {
    const val = parseInt(e.target.value.replace(/\D/g, ""), 10);
    if (!isNaN(val)) updateQuantity(index, val);
  }}
  onBlur={(e) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 1) updateQuantity(index, 1);
  }}
  className="w-full tabular-nums"
/>
```

**Lý do:**
- SSOT: "❌ `<input type="number">` — Dùng CurrencyInput hoặc quantity control chuẩn"
- `inputMode="numeric"` hiện bàn phím số trên mobile mà không phải spinner arrows
- `onBlur` guard: clamp về 1 nếu giá trị invalid
- Strip non-digits để tránh NaN

### Step 2: Move inventory fetch → SWR

**File:** `components/finance/receipts/receipt-form-modal.tsx`
**Lines:** 102-106

**Hiện tại:**
```tsx
useEffect(() => {
  if (isSale && inventoryOptions.length === 0) {
    fetchInventoryForSale().then(setInventoryOptions);
  }
}, [isSale, inventoryOptions.length]);
```

**Fix → useSWR conditional:**
```tsx
// Remove: useState for inventoryOptions
// Remove: useEffect for fetchInventoryForSale

// Add:
import { useSWR, cacheKeys } from "@/lib/swr";

// Inside component:
const { data: inventoryOptions = [] } = useSWR(
  isSale ? cacheKeys.inventory() : null,
  () => fetchInventoryForSale(),
);
```

**Cần thêm cacheKey tại `lib/swr.ts`:**
```typescript
// Đã có: inventory: () => "inventory"
// Reuse key inventory() vì fetchInventoryForSale query cùng table
// HOẶC nếu muốn tách: inventoryForSale: () => "inventory-for-sale"
```

**Quyết định:** Reuse `cacheKeys.inventory()` vì cùng source data (inventory_items table). SWR sẽ dedupe nếu inventory page đã loaded.

### Step 3: Register receipt stats cache key

**File:** `lib/swr.ts`
**Scope:** `cacheKeys` object

**Thêm:**
```typescript
financeReceiptStats: (month: number, year: number) =>
  `finance-receipt-stats:${year}-${month}`,
```

**File:** `components/finance/receipts/receipts-client.tsx`
**Line:** 50

**Hiện tại:**
```tsx
const statsKey = `receipt-stats-${month}-${year}`;
```

**Fix:**
```tsx
const statsKey = cacheKeys.financeReceiptStats(month, year);
```

**Cũng thêm mutate stats key vào `refresh()`:**
```tsx
const refresh = () => {
  void mutate(key);
  void mutate(statsKey); // ← THÊM
  void mutate(cacheKeys.financeDashboard(month, year));
  void mutate(cacheKeys.financeLedger(1, month, year, "all"));
};
```

### Step 4: Receipt form modal — assess file split

**File:** `components/finance/receipts/receipt-form-modal.tsx`
**Current:** 263 lines → borderline 250 limit

**Sau Step 2 (xóa useEffect + useState inventoryOptions):** ~255 lines

**Quyết định:** Tách sale section thành component nếu vượt 250 sau Step 2.

**Nếu cần tách:**
```
receipt-form-modal.tsx (~200 lines): form layout + submit logic
receipt-form-sale-section.tsx (~50 lines): SaleItemSelector wrapper + isSale conditional
```

**SaleSection component:**
```tsx
// receipt-form-sale-section.tsx
interface SaleFormSectionProps {
  isSale: boolean;
  saleItems: SaleItem[];
  onSaleItemsChange: (items: SaleItem[]) => void;
  onTotalChange: (total: number) => void;
}

export function SaleFormSection({ isSale, saleItems, onSaleItemsChange, onTotalChange }: SaleFormSectionProps) {
  const { data: inventoryOptions = [] } = useSWR(
    isSale ? cacheKeys.inventory() : null,
    () => fetchInventoryForSale(),
  );

  if (!isSale) return null;

  return (
    <SaleItemSelector
      items={saleItems}
      onChange={onSaleItemsChange}
      inventoryOptions={inventoryOptions}
      onTotalChange={onTotalChange}
    />
  );
}
```

### Step 5: Mobile FAB button + loading/disabled states

**File:** `components/finance/receipts/receipts-client.tsx`

**Hiện tại:** Mobile KHÔNG có nút "Thêm phiếu thu" (chỉ `hidden lg:flex` wrapper → CTA button).

**Fix:** Thêm mobile CTA hoặc FAB:
```tsx
{/* MOBILE CTA — bottom of header */}
<div className="lg:hidden">
  <Button type="button" onClick={openNewModal} variant="primary" className="w-full gap-2">
    <Plus className="w-4 h-4" />
    Thêm phiếu thu
  </Button>
</div>
```

**Vị trí:** Sau header `<div>` block (line 134), trước stats section.

### Step 6: Delete button loading state

**File:** `components/finance/receipts/receipt-desktop-table.tsx` + `receipt-mobile-list.tsx`

**Hiện tại:** `disabled={deletingId === item.id}` nhưng không có visual loading indicator.

**Fix:** Thêm spinner class khi deleting:
```tsx
<Button
  type="button"
  variant="ghost"
  size="sm"
  onClick={() => onDelete(item.id)}
  disabled={deletingId === item.id}
  className={`text-error ${deletingId === item.id ? "animate-pulse" : ""}`}
>
  <Trash2 className="w-4 h-4" />
</Button>
```

### Step 7: Sale item row stability

**File:** `components/finance/receipts/sale-item-selector.tsx`

**Issue:** Khi quantity/price thay đổi, row height có thể shift nếu total number width thay đổi.

**Fix:** Thêm `min-w-[80px]` cho total column:
```tsx
<div className="flex justify-end mt-2 text-body-sm font-medium text-text-primary tabular-nums min-w-[80px] text-right">
  = {formatVnd(lineTotal)}
</div>
```

**Và quantity input fixed width:**
```tsx
<Input
  // ...
  className="w-full tabular-nums text-center"  // center align numbers
/>
```

---

## Files to Create/Modify

| File | Action | Changes |
|------|--------|---------|
| `components/finance/receipts/sale-item-selector.tsx` | MODIFY | `type="number"` → `inputMode="numeric"`, total min-width |
| `components/finance/receipts/receipt-form-modal.tsx` | MODIFY | useEffect→SWR inventory, possible split |
| `components/finance/receipts/receipt-form-sale-section.tsx` | NEW (conditional) | Tách sale section nếu modal > 250 lines |
| `components/finance/receipts/receipts-client.tsx` | MODIFY | Stats cache key SSOT, mobile CTA, mutate stats |
| `components/finance/receipts/receipt-desktop-table.tsx` | MODIFY | Delete loading indicator |
| `components/finance/receipts/receipt-mobile-list.tsx` | MODIFY | Delete loading indicator |
| `lib/swr.ts` | MODIFY | Add `financeReceiptStats()` cache key |

---

## Verification Plan

### SSOT Compliance Checklist (from ssot-token-map.md)
```bash
# 1. No type="number"
Select-String -Path "components\finance\receipts\*.tsx" -Pattern 'type="number"'
# Expected: 0 results

# 2. No hardcoded hex colors
Select-String -Path "components\finance\receipts\*.tsx" -Pattern '#[0-9a-fA-F]{3,6}'
# Expected: 0 results

# 3. No inline modal overlays
Select-String -Path "components\finance\receipts\*.tsx" -Pattern 'modal-overlay'
# Expected: 0 results

# 4. All amounts use CurrencyInput
Select-String -Path "components\finance\receipts\*.tsx" -Pattern 'type="number"'
# Expected: 0 results

# 5. No useEffect+fetch for list data
Select-String -Path "components\finance\receipts\*.tsx" -Pattern 'useEffect.*fetch|\.then\(set'
# Expected: 0 results

# 6. File size < 250 lines
Get-ChildItem "components\finance\receipts\*.tsx" | ForEach-Object { "$($_.Name): $(Get-Content $_ | Measure-Object -Line | Select-Object -Expand Lines) lines" }
# Expected: all < 250

# 7. Cache keys registered in lib/swr.ts
Select-String -Path "components\finance\receipts\*.tsx" -Pattern 'receipt-stats-'
# Expected: 0 results (should use cacheKeys.financeReceiptStats)
```

### Automated
```bash
npx tsc --noEmit --incremental false --pretty false
npx eslint components/finance/receipts/ --max-warnings 0
```

### Manual Verification
- [ ] Desktop `/finance/receipts` — table renders, page/filter works, empty state correct
- [ ] Mobile `/finance/receipts` — CTA button visible, cards render, scroll smooth
- [ ] Modal: Tạo phiếu thu thường → save ok
- [ ] Modal: Tạo phiếu thu hợp đồng → "còn phải thu" card shows
- [ ] Modal: Tạo phiếu bán vật tư → inventory selector loads, quantity input accepts numbers only, total auto-calc
- [ ] Modal: Mobile overflow — form scrollable, footer sticky
- [ ] Delete receipt → button shows loading pulse, receipt disappears, stats update
- [ ] Empty state → skeleton → data loads → no layout shift

---

## SSOT Token Summary (What This Phase Touches)

| SSOT Token | Used In | Status |
|------------|---------|--------|
| `<Button>` (shared) | All 7 files | ✅ Already compliant |
| `<UnifiedModal>` | receipt-form-modal | ✅ Already compliant |
| `<CurrencyInput>` | sale-item-selector, receipt-form-modal | ✅ Compliant (unit_cost + receipt_amount) |
| `<Input>` (no type=number) | sale-item-selector | 🔧 FIX: Step 1 |
| `badge badge-*` | desktop-table, mobile-list | ✅ Already compliant |
| `card-base` | mobile-list, stats, receipts-client | ✅ Already compliant |
| `form-grid-2col` + `form-actions` | receipt-form-modal, sale-item-selector | ✅ Already compliant |
| `tabular-nums` | desktop-table, mobile-list, sale-item-selector | ✅ Already compliant |
| `entrance entrance-*` | receipts-client | ✅ Already compliant |
| `useSWR` + `cacheKeys` | receipts-client | 🔧 FIX: Step 2-3 |
| `<SkeletonTable>` | receipts-client | ✅ Already compliant |
| `<TableWrapper>` | desktop-table | ✅ Already compliant |
| `tag-badge` | mobile-list | ✅ Already compliant |

---
✅ Phase 09 Complete → Full SSOT compliance for Finance Receipts UI
