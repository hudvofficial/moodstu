# Phase 09b: Restore Receipt Row Actions + QR + Print (V1→V2 Port)
Status: ⬜ Pending
Dependencies: Phase 09a (SSOT tokens), Phase 08 (lint baseline)

## Objective
Port V1 `ReceiptActions`, `QRPaymentModal`, và `PrintVoucherClient` behavior sang V2 SSOT.
- **Không** copy V1 UI nguyên bản.
- **Port** behavior: View/QR/Print/Edit/Delete per-row actions.
- **V2 SSOT**: lucide icons, `<Button>`, `<UnifiedModal>`, `card-base`, `form-actions`, etc.

## V1 Reference Analysis

| V1 File | Behavior | V2 Port Strategy |
|---------|----------|-----------------|
| `ReceiptActions.tsx` (95 lines) | 4 actions: View, QR, Print, Delete — dùng Material Symbols + native `<button>` | → `ReceiptRowActions` — lucide icons + `<Button>`, thêm Edit |
| `QRPaymentModal.tsx` (262 lines) | 3-tier QR: static image → VietQR API → fallback "chưa cấu hình" + Copy/Share/Download | → `ReceiptQrPaymentModal` — `<UnifiedModal>`, `<Button>`, bank_info từ studio_info |
| `PrintVoucherClient.tsx` (354 lines) | A4 landscape 2-copy + A5 PDF export, `window.print()`, `html2pdf.js` | → V2 detail page đã có (274 lines) — tạo thêm `/print` route + control bar |
| `print/page.tsx` (36 lines) | Server fetch receipt + studio_info → pass to PrintVoucherClient | → Same pattern: parallel `getReceiptDetail()` + `getStudioInfo()` |

## V2 Existing State

| Resource | Status |
|----------|--------|
| `getStudioInfo()` | ✅ Exists (`app/actions/settings-queries.ts:69`) |
| `getReceiptDetail(id)` | ✅ Exists (`app/actions/finance-operations-queries.ts:451`) |
| `readMoney()` | ✅ Exists (`lib/finance-utils.ts:101`) |
| `html2pdf.js` | ❌ NOT in package.json — dùng `window.print()` only |
| `BankInfo` type | ✅ Exists (`types/settings.ts`) — has `bank_name, account_number, account_name, branch` |
| Receipt detail page | ✅ Exists (`app/(protected)/finance/receipts/[id]/page.tsx`, 274 lines) |
| Print route | ❌ NOT exists yet |
| Breadcrumb fix needed | ⚠️ Lines 68, 80, 84 → `/finance` should be `/finance/receipts` |

## BankInfo Extension for VietQR

V2 `BankInfo` type currently:
```typescript
interface BankInfo {
  bank_name?: string;     // "Vietcombank"
  account_number?: string; // "0123456789"
  account_name?: string;   // "MOOD STUDIO"
  branch?: string;         // "CN HCM"
}
```

**Thêm optional fields** (JSONB → không cần migration):
```typescript
interface BankInfo {
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  branch?: string;
  // ── VietQR extension ──
  bank_bin?: string;         // VietQR bank BIN code (e.g. "970436" for VCB)
  qr_code_url?: string;      // Studio static QR image URL
}
```

**VietQR URL generation:**
```
https://img.vietqr.io/image/{bank_bin}-{account_number}-compact2.png?amount={amount}&addInfo={description}&accountName={account_name}
```

---

## Implementation Steps

### Step 1: Extend BankInfo type

**File:** `types/settings.ts`
**Lines:** 1-6

```diff
 export interface BankInfo {
   bank_name?: string;
   account_number?: string;
   account_name?: string;
   branch?: string;
+  /** VietQR bank BIN code (e.g. "970436" for Vietcombank). Tra cứu: https://api.vietqr.io/v2/banks */
+  bank_bin?: string;
+  /** Static QR image URL — ưu tiên hơn VietQR auto-generate */
+  qr_code_url?: string;
 }
```

### Step 2: Create `ReceiptRowActions` component

**File:** `components/finance/receipts/receipt-row-actions.tsx` [NEW]
**Estimated:** ~75 lines

**Props:**
```typescript
interface ReceiptRowActionsProps {
  id: string;
  amount: number;
  contractCode?: string | null;
  customerName?: string | null;
  bankInfo: BankInfo | null;
  disabled?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}
```

**Actions (order: View → QR → Print → Edit → Delete):**
```tsx
import Link from "next/link";
import { Eye, QrCode, Printer, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// View
<Button variant="ghost" size="sm" asChild title="Xem chi tiết" aria-label="Xem chi tiết phiếu thu">
  <Link href={`/finance/receipts/${id}`}>
    <Eye className="w-4 h-4" />
  </Link>
</Button>

// QR (conditional: amount > 0)
{amount > 0 && (
  <Button variant="ghost" size="sm" onClick={() => setShowQR(true)} title="QR thanh toán" aria-label="Mã QR thanh toán">
    <QrCode className="w-4 h-4" />
  </Button>
)}

// Print
<Button variant="ghost" size="sm" asChild title="In phiếu thu" aria-label="In phiếu thu">
  <Link href={`/finance/receipts/${id}/print`} target="_blank">
    <Printer className="w-4 h-4" />
  </Link>
</Button>

// Edit
<Button variant="ghost" size="sm" onClick={onEdit} disabled={disabled} title="Sửa phiếu thu" aria-label="Sửa phiếu thu">
  <Edit2 className="w-4 h-4" />
</Button>

// Delete
<Button variant="ghost" size="sm" onClick={onDelete} disabled={disabled} className="text-error" title="Xóa phiếu thu" aria-label="Xóa phiếu thu">
  <Trash2 className="w-4 h-4" />
</Button>
```

**Layout:**
```tsx
<div className="flex items-center gap-0.5">
  {/* 5 buttons, each 32x32 → cluster width: ~170px stable */}
  ...
  <ReceiptQrPaymentModal isOpen={showQR} onClose={() => setShowQR(false)} ... />
</div>
```

### Step 3: Create `ReceiptQrPaymentModal`

**File:** `components/finance/receipts/receipt-qr-payment-modal.tsx` [NEW]
**Estimated:** ~180 lines

**Behavior ported from V1 QRPaymentModal (262 lines):**

1. **3-tier QR resolution:**
   - Tier 1: `bankInfo.qr_code_url` (static studio QR image) → `<Image>` or `<img>`
   - Tier 2: `bankInfo.bank_bin` + `account_number` → generate VietQR URL
   - Tier 3: No config → "Chưa cấu hình QR" fallback with link to Settings

2. **Actions (NO mark-paid, NO create receipt/payment):**
   - Copy bank info → `navigator.clipboard`
   - Share → `navigator.share` with fallback to clipboard
   - Download QR → anchor download

3. **V2 SSOT mapping:**

| V1 Element | V2 Replacement |
|------------|----------------|
| `<UnifiedModal>` V1 | `<UnifiedModal>` V2 — same concept |
| `material-symbols-outlined` icons | lucide: `QrCode, Copy, Check, Share2, Download, Settings` |
| `<button className="btn-secondary">` | `<Button variant="secondary">` |
| `<button className="btn-success">` | `<Button variant="primary">` (no btn-success in V2) |
| `bg-emerald-50`, `text-emerald-600` | `bg-success/10`, `text-success` (SSOT tokens) |
| `text-[10px]`, `text-[9px]` fixed | `text-caption`, `text-micro` (SSOT tokens) |
| `rounded-soft-lg` V1 | `rounded-lg` (V2 radius tokens) |
| `bg-surface` V1 | `bg-elevated` (V2 semantic bg) |

4. **Modal structure:**
```tsx
<UnifiedModal isOpen={isOpen} onClose={onClose} title="QR Thanh toán" size="sm"
  footer={hasPaymentConfig ? (
    <div className="form-actions">
      <Button variant="secondary" onClick={handleShare} className="gap-1.5">
        <Share2 className="w-4 h-4" /> Chia sẻ
      </Button>
      <Button onClick={handleDownload} className="gap-1.5">
        <Download className="w-4 h-4" /> Tải QR
      </Button>
    </div>
  ) : undefined}
>
  {hasPaymentConfig ? (
    // QR image + amount + bank info + copy button + transfer description
  ) : (
    // Fallback: Icon + message + "Đi tới Cài đặt" button
  )}
</UnifiedModal>
```

### Step 4: Fetch payment config in page.tsx (1 lần)

**File:** `app/(protected)/finance/receipts/page.tsx`
**Lines:** 17-21

**Thêm `getStudioInfo()` vào Promise.all:**
```diff
-  const [receipts, categories, contracts] = await Promise.all([
+  const [receipts, categories, contracts, studioResult] = await Promise.all([
     fetchReceipts({ page: 1, pageSize: 12, month, year }),
     fetchFinanceCategories("Thu"),
     fetchContractOptions(),
+    getStudioInfo(),
   ]);

+  const bankInfo = studioResult.success && studioResult.data
+    ? (studioResult.data.bank_info || null)
+    : null;
```

**Pass xuống:**
```tsx
<ReceiptsClient
  ...
+ bankInfo={bankInfo}
/>
```

### Step 5: Wire `ReceiptRowActions` into desktop table + mobile list

**File:** `components/finance/receipts/receipts-client.tsx`
- Add `bankInfo: BankInfo | null` to props interface
- Pass `bankInfo` to `ReceiptDesktopTable` and `ReceiptMobileList`

**File:** `components/finance/receipts/receipt-desktop-table.tsx`
- Replace inline Edit2/Trash2 buttons (lines 59-82) → `<ReceiptRowActions>`

**File:** `components/finance/receipts/receipt-mobile-list.tsx`
- Replace inline Edit2/Trash2 buttons (lines 47-68) → `<ReceiptRowActions>`

**Table column adjustment:**
```tsx
// TH "Thao tác" → keep right-aligned
// TD → min-w-[170px] for 5-action cluster stability
<TD className="text-right">
  <ReceiptRowActions
    id={item.id}
    amount={item.receipt_amount}
    contractCode={item.contract_code}
    customerName={item.customer_name}
    bankInfo={bankInfo}
    disabled={deletingId === item.id}
    onEdit={() => onEdit(item)}
    onDelete={() => onDelete(item.id)}
  />
</TD>
```

**Mobile card:**
```tsx
// action bar → full width row at bottom of card
<div className="flex items-center justify-end gap-0.5 pt-2 border-t border-border">
  <ReceiptRowActions ... />
</div>
```

### Step 6: Create print route

**File:** `app/(protected)/finance/receipts/[id]/print/page.tsx` [NEW]
**Estimated:** ~55 lines

**Pattern: copy from `contracts/[id]/print/page.tsx`:**
```tsx
import { getReceiptDetail } from "@/app/actions/finance-operations-queries";
import { getStudioInfo } from "@/app/actions/settings-queries";
import { notFound } from "next/navigation";
import { PrintReceiptClient } from "@/components/finance/receipts/print-receipt-client";

export default async function PrintReceiptPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const [receiptResult, studioResult] = await Promise.all([
    getReceiptDetail(id),
    getStudioInfo(),
  ]);

  if (!receiptResult.success || !receiptResult.data) notFound();
  // soft-deleted check: getReceiptDetail already filters deleted_at IS NULL
  if (!studioResult.success) notFound();

  return (
    <PrintReceiptClient
      receipt={receiptResult.data}
      studioInfo={studioResult.data}
    />
  );
}
```

### Step 7: Create `PrintReceiptClient`

**File:** `components/finance/receipts/print-receipt-client.tsx` [NEW]
**Estimated:** ~200 lines

**Port from V1 PrintVoucherClient (354 lines) — simplify:**

1. **NO `html2pdf.js`** (not in V2 dependencies) → `window.print()` only
2. **Control bar** (no-print fixed top):
   - Close button: lucide `X` + `<Button>`
   - Print button: lucide `Printer` + `<Button variant="primary">`
   - Đổi layout sang: V1 A4 landscape 2-copy → V2 **A5 portrait single** (simpler, mobile-friendly)
3. **Voucher template** — port VoucherTemplate from V1:
   - Header: logo + studio info (from `studioInfo` prop)
   - Title: "PHIẾU THU" + date + receipt code
   - Content fields: Người nộp, Nội dung, Số tiền (readMoney), Ghi chú
   - Signatures: 3 columns (Người nộp, Kế toán, Thủ quỹ)
   - Footer: moodwedding.com + receipt ID
4. **V2 SSOT mapping**:

| V1 Element | V2 Replacement |
|------------|----------------|
| `<button>` native | `<Button>` shared |
| `material-symbols-outlined` | lucide: `X, Printer, Download` |
| `bg-gray-900` control bar | `bg-neutral-900` or `bg-[#1a1a1a]` (print-only page, OK) |
| `bg-elevated` V1 | `bg-white` (print page = paper white) |
| `formatCurrency()` V1 | `formatVnd()` V2 |
| `text-text-main` V1 | `text-text-primary` V2 |
| `rounded-soft-md` V1 | `rounded-md` V2 |

### Step 8: Fix breadcrumb navigation in detail page

**File:** `app/(protected)/finance/receipts/[id]/page.tsx`
**Lines:** 37, 68, 80, 84

```diff
 // Line 37: Not found fallback link
-<Link href="/finance" className="btn-secondary mt-2">
+<Link href="/finance/receipts" className="btn-secondary mt-2">

 // Line 68: Mobile back link
-  href="/finance"
+  href="/finance/receipts"

 // Line 80: Desktop breadcrumb "Tài chính"
-<Link href="/finance" className="hover:text-primary transition-colors">
+<Link href="/finance" className="hover:text-primary transition-colors">
   Tài chính
 </Link>

 // Line 84: Desktop breadcrumb "Phiếu thu" — currently goes to /finance, should be /finance/receipts
-<Link href="/finance" className="hover:text-primary transition-colors">
+<Link href="/finance/receipts" className="hover:text-primary transition-colors">
   Phiếu thu
 </Link>
```

---

## Files Summary

| File | Action | Est. Lines | Description |
|------|--------|-----------|-------------|
| `types/settings.ts` | MODIFY | +3 | Add `bank_bin`, `qr_code_url` to BankInfo |
| `components/finance/receipts/receipt-row-actions.tsx` | **NEW** | ~75 | Shared 5-action component |
| `components/finance/receipts/receipt-qr-payment-modal.tsx` | **NEW** | ~180 | QR modal with 3-tier fallback |
| `components/finance/receipts/print-receipt-client.tsx` | **NEW** | ~200 | Print voucher template + controls |
| `app/(protected)/finance/receipts/[id]/print/page.tsx` | **NEW** | ~35 | Print route server component |
| `app/(protected)/finance/receipts/page.tsx` | MODIFY | +5 | Add `getStudioInfo()` fetch |
| `components/finance/receipts/receipts-client.tsx` | MODIFY | +5 | Add `bankInfo` prop passthrough |
| `components/finance/receipts/receipt-desktop-table.tsx` | MODIFY | -20/+5 | Replace inline actions → ReceiptRowActions |
| `components/finance/receipts/receipt-mobile-list.tsx` | MODIFY | -20/+5 | Replace inline actions → ReceiptRowActions |
| `app/(protected)/finance/receipts/[id]/page.tsx` | MODIFY | +3 | Fix breadcrumb navigation |

**Total: 4 new files, 6 modified files**

---

## Verification Plan

### SSOT Compliance
```bash
# No Material Symbols
Select-String -Path "components\finance\receipts\*.tsx" -Pattern "material-symbols"
# Expected: 0

# No native <button>
Select-String -Path "components\finance\receipts\*.tsx" -Pattern '<button'
# Expected: 0

# No hardcoded hex (except print page bg which is OK)
Select-String -Path "components\finance\receipts\*.tsx" -Pattern '#[0-9a-fA-F]{3,6}'
# Expected: 0 (or only in print-receipt-client control bar bg)

# All icons from lucide-react
Select-String -Path "components\finance\receipts\*.tsx" -Pattern "from.*react-icons|from.*@mui|from.*heroicons"
# Expected: 0
```

### Automated
```bash
npx tsc --noEmit --incremental false --pretty false
npx eslint components/finance/receipts app/(protected)/finance/receipts --max-warnings=0
```

### Manual
- [ ] Desktop `/finance/receipts`: each row has 5 icons — View, QR, Print, Edit, Delete
- [ ] Mobile `/finance/receipts`: each card has 5 action buttons at bottom
- [ ] Click View → navigates to `/finance/receipts/{id}` correctly
- [ ] Click QR → modal opens with amount/customer/description, QR image or fallback
- [ ] QR modal "Chia sẻ" → Web Share API or clipboard fallback
- [ ] QR modal "Tải QR" → image download
- [ ] QR modal with no bank config → shows "Chưa cấu hình" + "Đi tới Cài đặt" link
- [ ] Click Print → opens `/finance/receipts/{id}/print` in new tab
- [ ] Print page → voucher renders correctly with studio info
- [ ] Print page → `window.print()` works
- [ ] Print page with soft-deleted receipt → 404 not found
- [ ] Click Edit → opens receipt form modal (existing behavior)
- [ ] Click Delete → confirm dialog → soft-delete → refresh list
- [ ] Action button cluster does NOT shift row/card layout on desktop or mobile
- [ ] Breadcrumbs: detail page "Phiếu thu" link → `/finance/receipts` (not `/finance`)
- [ ] Mobile back button → `/finance/receipts`

---
Next Phase: [Phase 10 — Final Integration Test](phase-10-integration.md)
