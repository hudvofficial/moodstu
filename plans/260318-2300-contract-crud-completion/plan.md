# Plan: Contract CRUD Completion — Port V1 Missing Features

Created: 2026-03-18T23:00:00+07:00
Status: ✅ Approved — Ready to Execute
Brief: [Gap Analysis](file:///C:/Users/Admin/.gemini/antigravity/brain/d090de3e-95ef-4d96-b857-c0cc8ab7b026/contract_crud_gap_analysis.md)
Deep Dive: [V1 Flow Analysis](file:///C:/Users/Admin/.gemini/antigravity/brain/d090de3e-95ef-4d96-b857-c0cc8ab7b026/v1_contract_detail_flow_analysis.md)
Optimization: [V2 Audit](file:///C:/Users/Admin/.gemini/antigravity/brain/d090de3e-95ef-4d96-b857-c0cc8ab7b026/v2_optimization_audit.md)

## Overview

Port 10 tính năng V1 còn thiếu sang V2, chia 3 wave theo priority.
Backend contract-lifecycle.ts đã có đủ (cancel/delete/reactivate) — chủ yếu là port UI + forms.

### Quy tắc Code
- KHÔNG inline styles → dùng CSS tokens từ design-system.css
- KHÔNG hardcode colors → dùng CSS variables
- KHÔNG `any` types → full TypeScript
- KHÔNG Material Symbols → Lucide-react only
- Max 250 lines/file → split sớm
- V1 = logic source, V2 design-system.css = style source

### 🔴 V2 Optimization Mandate (4 nguyên tắc bắt buộc)
1. **ZERO client Supabase** — Tất cả read/write qua Server Actions (`withAuth()`)
   - V1 dùng `createClient()` client-side → V2 TUYỆT ĐỐI không copy
2. **Reuse existing data** — `getContractById()` đã có, SWR hooks đã có
   - KHÔNG tạo thêm query function trùng lặp
   - Mở rộng `getContractById()` nếu cần thêm data (payment_plans, notes...)
3. **SWR invalidate sau mọi mutation** — `mutate()` + `contractKeys`
   - Pattern: `await action() → mutate() → toast.success()`
4. **ZERO inline — tất cả shared** (ref: master plan + mcoffe pattern)
   - KHÔNG viết logic fetch/mutation inline trong component
   - Server actions → `app/actions/*.ts` (shared, reusable)
   - SWR hooks → `lib/hooks/use-*.ts` (shared cache layer)
   - UI components → `components/ui/*.tsx` (shared design system)
   - Forms → nhận data qua props từ SWR, KHÔNG tự fetch
   - Helpers → `revalidateContractCaches()`, `prefetchContract()` (shared utils)

### V1→V2 Naming Map (CRITICAL — phải translate)
| V1 Table/Field | V2 Table/Field | Notes |
|----------------|----------------|-------|
| contract_details | contract_items | Khác schema |
| work_progress | work_tasks | Khác schema |
| receipts | payments | Khác field names |
| dress_rentals | inventory_reservations | V2 = generic inventory |
| wedding_dresses | inventory_items | V2 = generic inventory |
| status = "Đã hủy" | status = "da_huy" | |
| status = "Hoàn thành" | status = "hoan_thanh" | |
| status = "Đã thu" | status = "paid" | Payment plan |
| createClient() (client) | withAuth() (server) | V2 pattern |

## Tech Stack
- Frontend: Next.js 16, React 19, SWR, Tailwind v4, Lucide-react
- Backend: Server Actions + Supabase service_role
- PDF: html2pdf.js (V1 pattern)
- Design: design-system.css tokens, `components/ui/*` shared

## Phases

| Phase | Name | Status | Effort | Wave |
|-------|------|--------|:------:|:----:|
| 00 | DB + Types + SWR | ✅ Done | 15m | Pre |
| 01 | Cancel/Delete UI on Detail | ✅ Done | 1-2h | W1 |
| 02 | Print Contract Page | ✅ Done | 2-3h | W1 |
| 03 | Quick Actions Wiring | ✅ Done | 1h | W2 |
| 04 | Payment Receipt Form | ✅ Done | 1-2h | W2 |
| 05 | Printing Order Form | ✅ Done | 1h | W2 |
| 06 | Status Update Dropdown | ✅ Done | 30m | W2 |
| 07 | Nice-to-have (Dress/Notes/Realtime) | ✅ Done | 2-3h | W3 |

**Tổng estimate:** ~8-11h | Wave 1 (critical): ~3-4h

---

## Phase 00: DB + Types Verification (Pre-check)
Status: ✅ Done

### 00A: DB Tables Check
Verify V2 Supabase has all tables needed.
- [x] `printing_orders` — ✅ exists (0 rows)
- [x] `inventory_reservations` + `inventory_items` — ✅ exists
- [x] `contract_notes` — ❌ MISSING (Phase 07B, W3 — not blocking)
- [x] `transaction_categories` — ✅ exists (10 rows)
- [x] `studio_info` — ✅ exists (1 row)
- [x] `labs` — ✅ exists (0 rows)
- [x] `payment_plans` — ✅ exists (0 rows)

### 00B: Types Expansion (`types/contract.ts`)
Thêm types V2 chưa có:
- [x] `PaymentPlan` — stage_name (DB column), amount, due_date, status, receipt_id
- [x] `StudioInfo` — name, address, hotline, representative, logo_url, bank_info (JSONB)
- [ ] `ContractNote` — SKIP (table chưa có, Phase 07B tạo sau)

### 00C: Extend `getContractById()` query
- [x] Add `payment_plans` to parallel query bundle
- [x] Expose via SWR hook `useContractDetail()` → paymentPlans field

### 00D: SWR Utilities (ref: mcoffe `lib/swr.ts`)
- [ ] Add `revalidateMultiple()` helper to `use-contracts.ts`
  ```ts
  export async function revalidateContractCaches(contractId: string) {
    await Promise.all([
      mutate(contractKeys.detail(contractId)),
      mutate(contractKeys.list({})),
      mutate(contractKeys.stats()),
    ]);
  }
  ```
- [ ] Add `prefetch()` — pre-warm cache khi hover contract row trên list
  ```ts
  export function prefetchContract(id: string) {
    mutate(contractKeys.detail(id), getContractById(id), { revalidate: false });
  }
  ```

> **If DB table missing:** Need migration before that phase.

---

## Phase 01: Cancel/Delete UI on Detail
Status: ✅ Done
Dependencies: `contract-lifecycle.ts` (backend ✅ done)
V1 Source: `ContractCancelDeleteActions.tsx` (410 LOC, 2 variants)

### V1 Logic Flow (MUST preserve)
```
Top Bar layout (V1):  [← Back] [Xuất file] [In HĐ] [Chỉnh sửa] [Huỷ HĐ] [Xoá]
                       ↑ always  ↑ always   ↑ always ↑ !cancelled  ↑ !cancelled ↑ !hasReceipts && !cancelled

Cancel Modal:
  1. Show contract code + customer name (context)
  2. Warning box (amber): "Công việc chưa hoàn thành, đơn in, lịch thanh toán → tự động hủy"
  3. Textarea: Lý do hủy (required, placeholder: "VD: Khách huỷ do thay đổi kế hoạch...")
  4. Footer: [Đóng] [Xác nhận huỷ] (red, disabled until reason filled)
  5. →  cancelContract(id, reason) from contract-lifecycle.ts
  6. → toast.success + router.refresh + SWR invalidate

Delete Modal:
  1. ONLY shown when !hasReceipts (payments count === 0)
  2. DANGER box (red): "🚨 KHÔNG THỂ HOÀN TÁC — toàn bộ dữ liệu bị xoá vĩnh viễn"
  3. Input: nhập chính xác mã HĐ (contractCode) để xác nhận
  4. Footer: [Đóng] [Xoá vĩnh viễn] (disabled until confirmCode === contractCode)
  5. → deleteContract(id) from contract-lifecycle.ts
  6. → redirect("/contracts")

Cancel Banner: (variant="banner", ĐÃ CÓ trong V2 cancel-banner.tsx ✅)
  - Hiện khi isCancelled + lý do + ngày hủy + nút "Khôi phục HĐ"
```

### Tasks
- [x] 01A: Tạo `components/contracts/detail/contract-actions-menu.tsx` (~200 LOC)
  - Cancel modal: UnifiedModal + textarea + warning
  - Delete modal: UnifiedModal + code input + danger
  - Props: contractId, contractCode, customerName, hasReceipts, isCancelled
- [x] 01B: Nối vào `top-action-bar.tsx` desktop — thay MoreHorizontal placeholder
  - Pass customerName + hasReceipts from contract-detail-client.tsx
- [x] 01C: Mobile — actions also render in mobile header via same component
- [x] 01D: ⚡ V2 OPTIMIZATION — SWR invalidate after actions:
  - Cancel → `revalidateContractCaches(contractId)` + `router.refresh()`
  - Delete → `router.push("/contracts")` (no mutate needed, page unmounts)
- [x] 01E: Tạo `lib/toast-utils.ts` — shared toast utility (lightweight DOM-based)

Also created:
- `+ lib/toast-utils.ts` — shared toast + toastResult utility

### Files
- `components/contracts/detail/contract-actions-menu.tsx` — **Tạo mới**
- `components/contracts/detail/top-action-bar.tsx` — Sửa
- `components/contracts/detail/mobile-bottom-bar.tsx` — Sửa
- `components/contracts/detail/contract-detail-client.tsx` — Sửa: pass hasReceipts + mutate

---

## Phase 02: Print Contract Page
Status: ✅ Done
Dependencies: Phase 00 (studio_info check)
V1 Source: `PrintContractClient.tsx` (551 LOC), `PrintButton.tsx` (43 LOC), `print/page.tsx` (93 LOC)

### V1 Logic Flow (MUST preserve)
```
Server page:
  - getContractDetails(id): contract + customer + contract_items + payment_plans
  - getStudioInfo(): studio logo, name, address, hotline
  - Detect mode: searchParams.isExportMode === "true"

Client component:
  - Preload html2pdf.js module on mount
  - If isExportMode + isPdfReady → auto-trigger download after 1s

  Mode "In HĐ" (default):
    → Container: A4 Landscape (297mm × 210mm)
    → 2 copies side-by-side (left: Khách, right: Studio)
    → Đường cắt dashed ở giữa
    → Button: "In ngay" → window.print()
    → CSS: @page { size: A4 landscape; margin: 0; }

  Mode "Xuất file":
    → Container: A5 Portrait (148mm × 195mm)
    → 1 copy only
    → Button: "Tải PDF (A5)" → html2pdf.js
    → Filename: HOP-DONG-{contractCode}.pdf
    → Options: scale:2, jpegQuality:1, A5 portrait, pagebreak avoid-all

Template sections (per copy):
  1. Header: Logo (tinted #2E5C46 via Canvas) | Studio info | "Hợp đồng dịch vụ" + code + date
  2. Customer Info: grid 2-col (Khách, SĐT, Địa chỉ, Cô dâu, Chú rể)
     - Bride/Groom CHỈ hiện khi service_type.startsWith("Gói Cưới")
  3. Services Table: STT | Dịch vụ/Sản phẩm | SL | Đơn giá | Thành tiền
     - Subtotal, Discount (if > 0), Tổng TT, Đã TT, Còn lại
  4. Payment Schedule: dot timeline (green/orange/gray per index)
  5. Signatures: 2-col (Khách hàng | Studio)
  6. Lưu ý: 3 bullet points (fixed text)
  7. Footer: website | thank you | page number
```

### Tasks
- [x] 02A: `npm install html2pdf.js` dependency
- [x] 02B: Tạo `app/(protected)/contracts/[id]/print/page.tsx` — server fetch
  - ⚡ V2 OPT: REUSE `getContractById()` — đã có contract + items + customer
  - CHỈ thêm `getStudioInfo()` server action mới (1 query)
  - KHÔNG viết fetchPrintData() riêng (V1 anti-pattern)
- [x] 02C: Tạo `components/contracts/print/contract-template.tsx` — A5 layout (~250 LOC)
  - V2 tokens, Lucide icons, inline style (print CSS isolation)
  - V2 service_type enum: `"ngay_cuoi"` thay vì `startsWith("Gói Cưới")`
- [x] 02D: Tạo `components/contracts/print/print-contract-client.tsx` — wrapper (~150 LOC)
  - Print controls bar, mode detection, handleDownload
- [x] 02E: Add "Xuất file" button to `top-action-bar.tsx` (link with ?isExportMode=true)
- [x] 02F: Server action `getStudioInfo()` in `app/actions/studio.ts`

### Files
- `app/(protected)/contracts/[id]/print/page.tsx` — **Tạo mới**
- `components/contracts/print/contract-template.tsx` — **Tạo mới**
- `components/contracts/print/print-contract-client.tsx` — **Tạo mới**
- `app/actions/studio.ts` — **Tạo mới** (getStudioInfo only)
- `components/contracts/detail/top-action-bar.tsx` — Sửa: add Xuất file button

---

## Phase 03: Quick Actions Wiring
Status: ✅ Done
Dependencies: Phase 04 + 05 (forms phải có trước)
V1 Source: `ContractActions.tsx` (171 LOC)

### V1 Logic Flow
```
ContractActions nhận: contractId, remainingAmount
  - 3 buttons: Váy/Vest, Đặt in, Thu tiền
  - Thu tiền label thay đổi:
    → remainingAmount > 0 → "Thu tiền" (green)
    → remainingAmount <= 0 → "Phát sinh" (amber)

Click "Đặt in" → UnifiedModal full-screen → PrintingOrderForm
Click "Váy/Vest" → Inline expand (animate-slide-up) → DressSelector
Click "Thu tiền" → Inline expand (animate-slide-up) → PaymentReceiptForm

V2 hiện có: QuickActionsGrid (6 buttons, onAction placeholder)
  - event, drive, payment, print, costume, note
```

### Tasks
- [x] 03A: Update `quick-actions-grid.tsx` — already had onAction prop
- [x] 03B: Update `contract-detail-client.tsx` — handleQuickAction switch/case
  - "payment" → open PaymentReceiptForm modal
  - "print" → open PrintingOrderForm modal
  - "costume" / "event" / "drive" / "note" → toast("đang phát triển")

### Files
- `components/contracts/detail/quick-actions-grid.tsx` — Sửa
- `components/contracts/detail/contract-detail-client.tsx` — Sửa

---

## Phase 04: Payment Receipt Form
Status: ✅ Done
Dependencies: Phase 00 (verify transaction_categories, payment_plans)
V1 Source: `PaymentReceiptForm.tsx` (371 LOC)

### V1 Logic Flow (CRITICAL business logic)
```
Init:
  1. Fetch transaction_categories WHERE type = "Thu"
  2. Fetch payment_plans for this contract
  3. Auto-select: initialPlanId OR first unpaid plan
     → Pre-fill amount from plan.amount
     → Pre-fill payment_term from plan.milestone_name

Form fields:
  1. Số tiền (CurrencyInput) — pre-filled from selected plan
  2. Ngày thu (DatePicker) — default: today
  3. Đợt thanh toán (select):
     - Each plan option: ✅ if đã thu (disabled), 👈 if next unpaid
     - "Thanh toán khác / Phát sinh" custom option
  4. Hình thức: Tiền mặt | Chuyển khoản | Quẹt thẻ
  5. Ghi chú (textarea) — required if isFullyPaid

Special modes:
  - isFullyPaid (remainingAmount <= 0):
    → Amber theme instead of green
    → Title: "Tạo phiếu phát sinh"
    → "Lý do phát sinh" required
    → Checkbox: "Cập nhật giá trị HĐ" (tăng total_amount)

Validation:
  - amount > 0
  - If fully paid → notes required
  - Overpayment guard: confirm dialog if amount > remaining

Submit → createContractPayment(server action)
  → Creates receipt + updates contract paid/remaining
  → If linked payment_plan → mark as "Đã thu"
  → If updateTotal → increase contract.total_amount
```

### Tasks
- [x] 04A: Tạo `components/contracts/detail/payment-receipt-form.tsx` (~250 LOC)
  - ⚡ V2 OPT: Get paymentPlans from SWR (Phase 00C adds to getContractById)
  - Props receive: paymentPlans[], remainingAmount, contractId
- [x] 04B: Server action `createPaymentReceipt()` in `app/actions/payment-actions.ts`
  - Atomic: insert payment + recalculate amounts + update payment_status + mark plan
- [x] 04C: Modal wrapper via quick action integration (Phase 03)
- [x] 04D: ⚡ SWR invalidate: `revalidateContractCaches()` after payment created

### Files
- `components/contracts/detail/payment-receipt-form.tsx` — **Tạo mới**
- `app/actions/payment-actions.ts` — **Tạo mới**

---

## Phase 05: Printing Order Form
Status: ✅ Done
Dependencies: Phase 00 (verify printing_orders, labs)
V1 Source: `PrintingOrderForm.tsx`

### V1 Logic Flow
```
Fetch: labs (all active printing labs)
Form: select lab, specify items (product name, size, quantity, cost)
Submit: insert printing_orders record
  → contract_id, lab_id, product details, status: "Chờ xử lý"
```

### Tasks
- [x] 05A: Tạo `components/contracts/detail/printing-order-form.tsx`
  - ⚡ V2 OPT: Labs list via server action `getLabs()`, NOT client Supabase
- [x] 05B: Server action `createPrintingOrder()` + `getLabs()` in `app/actions/printing-actions.ts`
- [x] 05C: ⚡ SWR invalidate: `revalidateContractCaches()` after order created

### Files
- `components/contracts/detail/printing-order-form.tsx` — **Tạo mới**
- `app/actions/printing-actions.ts` — **Tạo mới** (createPrintingOrder + getLabs)

---

## Phase 06: Status Update Dropdown
Status: ✅ Done
Dependencies: Phase 05
V1 Source: `StatusUpdate.tsx` (103 LOC)

### V2 Logic (adapted from V1)
```
Props: id, table, currentStatus, options[]
  - Color-coded select (V2 semantic tokens)
  - ALL status updates via server action updateItemStatus()

Special: inventory_reservations + "returned":
  → Server action also updates inventory_items availability (return to inventory)
  → V2 uses inventory_reservations NOT dress_rentals

printing_orders: server action updatePrintOrderStatus()
```

### Tasks
- [x] 06A: Tạo `components/ui/status-select.tsx` — shared, color-coded, reusable
- [x] 06B: Server actions: `updatePrintOrderStatus()` + `updateReservationStatus()` in `printing-actions.ts`
  - ⚡ V2: inventory return logic when status = "returned"
- [x] 06C: Integrate vào `print-orders-block.tsx` + pass contractId
- [x] 06D: Integrate vào `costumes-block.tsx` + pass contractId
- [x] 06E: ⚡ SWR invalidate after status change

### Files
- `components/ui/status-select.tsx` — **Tạo mới**
- `app/actions/printing-actions.ts` — Sửa: add updateItemStatus
- `components/contracts/detail/print-orders-block.tsx` — Sửa
- `components/contracts/detail/costumes-block.tsx` — Sửa

---

## Phase 07: Nice-to-have
Status: ✅ Done
Dependencies: All previous phases

### 07A: Inventory Reservation Form (V1: DressSelector → V2: Inventory)
```
⚡ V2 ADAPTATION (V1 dùng dress_rentals, V2 dùng inventory_reservations):
  - Server action: getAvailableItems() → inventory_items WHERE available
  - Select item → auto-fill price
  - Checkbox: "Đây là mục phát sinh" (default: checked)
    → If checked: server action cộng contract_items + update contract amounts
  - Server action: addInventoryReservation()
    → Insert inventory_reservations + update item availability
  - ZERO client Supabase
```

### 07B: Notes Timeline (V1: 216 LOC)
```
V2 Pattern:
  - Chat-style: collapsible, auto-scroll to bottom
  - Optimistic UI: temp-id insert → server confirm/rollback
  - Server actions: addContractNote(), deleteContractNote() (NEW)
  - KHÔNG dùng client Supabase
```

### 07C: Realtime Listener
- Supabase channel via client (acceptable — realtime is client-only)

### 07D: Contract Drawer
- Side drawer from contracts list for quick preview

### Tasks
- [x] 07A: Tạo `components/contracts/detail/inventory-reservation-form.tsx`
  - Server action `addInventoryReservation()` + `getAvailableItems()` in `app/actions/inventory-actions.ts`
  - V2 pattern: inventory_items/inventory_reservations, addon logic, contract total update
- [x] 07B: Tạo `components/contracts/detail/notes-timeline.tsx`
  - Server actions `addContractNote()`, `deleteContractNote()`, `getContractNotes()` in `app/actions/note-actions.ts`
  - Chat-style, collapsible, optimistic UI, auto-scroll
  - DB migration: `contract_notes` table created
- [ ] 07C: Realtime listener (deferred — not essential for MVP)
- [ ] 07D: Contract drawer (deferred — not essential for MVP)

---

## Dependencies & Execution Order

```
Phase 00 (DB Check)         ← FIRST (verify tables before coding)
  ↓
Phase 01 (Cancel/Delete UI) ← independent, W1
Phase 02 (Print Page)       ← independent, W1
Phase 04 (Payment Form)     ← independent, W2
Phase 05 (Printing Form)    ← independent, W2
  ↓
Phase 06 (Status Update)    ← needs Phase 05
Phase 03 (Quick Actions)    ← needs Phase 04 + 05
  ↓
Phase 07 (Nice-to-have)     ← last, W3
```

**Recommended order:** 00 → 01 → 02 → 04 → 05 → 06 → 03 → 07
