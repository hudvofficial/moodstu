# Phase 03: FAB + Quick Actions
**Status:** ⬜ Pending
**Effort:** 3-4 giờ
**Dependencies:** Phase 01 (QuickNav)

## Objective

Port FinanceFAB — Floating Action Button system cho quick actions.
V1 FAB có 3 chức năng: Phiếu thu nhanh, Phiếu chi nhanh, AI Insight popup.
V2 bỏ AI popup (đã có Moodie AI), giữ quick create + thêm context-aware actions.

---

## Implementation Steps

### Step 1: Tạo FinanceFAB component
- [ ] Floating button (bottom-right, above mobile nav)
- [ ] Click → expand 2 action buttons (phiếu thu, phiếu chi)
- [ ] Backdrop blur overlay khi expanded
- [ ] Animation: scale + translate (V1 pattern)

**V1 Logic (port):**
```
FAB system = 3 layers:
1. Main toggle button (+) → rotate 45° khi open
2. Action buttons (receipt = green, expense = red)
3. AI Insight button (psychology icon) → popup card
```

**V2 tối ưu:**
- Bỏ AI Insight FAB (Moodie AI sidebar đã cover)
- Giữ 2 quick action buttons
- Dùng Lucide icons: `plus`, `receipt-text` (thu), `wallet` (chi)
- CSS animation thay Tailwind utilities cho perf
- Position: `bottom-24 md:bottom-10 right-6` (above mobile bottom nav)

**Files:**
- `[NEW] components/finance/finance-fab.tsx`

---

### Step 2: Quick Create Receipt Modal
- [ ] Tạo modal tạo phiếu thu nhanh (minimal form)
- [ ] Reuse existing ReceiptModal nếu có, hoặc tạo compact version
- [ ] Fields: Số tiền, Khách hàng (select), Phương thức, Ghi chú
- [ ] Submit → call existing `createReceipt` server action

**Check existing V2 modals:**
- Xem `components/finance/receipt/` có modal chưa
- Nếu có → reuse
- Nếu không → tạo compact quick-create version

**Files:**
- `[NEW or REUSE] components/finance/quick-create-receipt-modal.tsx`

---

### Step 3: Quick Create Expense Modal
- [ ] Tạo modal tạo phiếu chi nhanh (minimal form)
- [ ] Fields: Số tiền, Danh mục (select), Người nhận, Phương thức, Ghi chú
- [ ] Submit → call existing `createExpense` server action

**Files:**
- `[NEW or REUSE] components/finance/quick-create-expense-modal.tsx`

---

### Step 4: Mount FAB on Finance Layout
- [ ] Import FinanceFAB vào `finance/layout.tsx`
- [ ] Chỉ render trên client side (dynamic import, ssr: false)
- [ ] FAB hiển thị trên MỌI finance sub-pages (hub + receipts + expenses...)

**Files:**
- `[MODIFY] app/(protected)/finance/layout.tsx` — add FAB

---

### Step 5: Context-aware enhancements (optional)
- [ ] FAB badge: hiện số lượng pending collections
- [ ] Khi đang ở /finance/receipts → FAB chỉ show "Tạo phiếu thu"
- [ ] Khi đang ở /finance/expenses → FAB chỉ show "Tạo phiếu chi"

**Files:**
- `[MODIFY] components/finance/finance-fab.tsx` — add pathname awareness

---

## Test Criteria

- [ ] FAB hiển thị bottom-right trên mọi finance page
- [ ] Click FAB → expand 2 action buttons với animation
- [ ] Click "Phiếu thu" → mở modal, submit thành công, data refresh
- [ ] Click "Phiếu chi" → mở modal, submit thành công, data refresh
- [ ] Click backdrop → collapse FAB
- [ ] Mobile: FAB không bị che bởi bottom nav
- [ ] Desktop: FAB vị trí chuẩn
- [ ] Không có TypeScript errors

---
End of Plan.
