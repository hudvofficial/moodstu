# T-20260825 — Hủy đơn in: gỡ nhánh "hoàn kho" chết, hợp nhất 2 đường hủy, dọn tàn dư kho/cọc (+ tuỳ chọn DROP object DB)

**Owner:** claude (spec) · **Trạng thái:** spec, chờ user duyệt · **ADR:** đề xuất ADR-016 (mục 2, ghi vào `DECISIONS.md` sau khi duyệt) · **Depends on:** `T-20260825-printing-drawer-fixes` (đã merged `d91def7`)
**Module:** in-an-lab · **Yêu cầu gốc (user, 2026-08-25):** *"trace kĩ 'nhánh hoàn kho trong cancelOrder() là dead code (kho vật tư đã rời in ấn)' rồi viết spec"*.

**Locks (Phase A — code):**
- `app/actions/printing-mutations.ts`
- `app/actions/printing-workflow-mutations.ts` (**xoá file**)
- `components/printing/cancel-order-modal.tsx`
- `components/printing/printing-detail-drawer.tsx`
- `components/contracts/detail/print-orders-block.tsx` (1 dòng key)
- `types/printing.ts`
- `tests/e2e/printing-drawer-fixes-verify.spec.ts` (mở rộng test 2)

**Locks (Phase B — DB, tuỳ chọn):** `supabase/migrations/20260825HHMMSS_drop_printing_inventory_payment_legacy.sql` (mới), `types/database.types.ts` (sinh lại), `scripts/vault-gen-schema.mjs`, `scripts/verify-migration.mjs`, `scripts/migrate-direct.mjs` (banner), `vault/30-du-lieu/*` (sinh lại).

**KHÔNG đụng:** module Vật tư (`components/inventory/**`, `app/actions/inventory-*` — `stock-in-modal`/`stock-out-modal` dùng `fetchInventoryPickerItems` cho việc của họ, giữ nguyên); các cột trên `printing_orders` (kể cả `inventory_status`, `deposit_amount`, `paid_amount`, `final_amount`, `delivered_at`, `delivered_date`) — xem mục 6 vì sao không drop; `record_lab_payment_atomic`/`printing_integrity_report`/`finance_lab_debt_summary` (không tham chiếu gì tới các object bị gỡ — đã kiểm `pg_proc`).

---

## 0. Kết luận ngắn

Nhánh "hoàn kho" trong `cancelOrder()` (`app/actions/printing-workflow-mutations.ts:66-134`) là **dead code tuyệt đối** — không phải "hiện chưa dùng" mà là **không thể chạy tới với bất kỳ dữ liệu nào, hiện tại lẫn tương lai**, vì chuỗi *kho vật tư ↔ đơn in* đã đứt ở **cả hai đầu** (mục 1). Đồng thời phát hiện cùng hàm này là **đường hủy đơn thứ 2** tồn tại song song với dropdown, mỗi đường ghi một bộ side-effect khác nhau — đúng lớp lỗi "2 nơi định nghĩa 1 luật" mà ADR-015 vừa vá (mục 1g).

Đề xuất: **Phase A (code, bắt buộc)** — xoá `cancelOrder()` + file, hợp nhất hủy đơn về `updatePrintingOrderStatus` (SSOT), gỡ picker vật tư câm khỏi drawer, dọn 8 field + 6 type chết. **Phase B (DB, tuỳ chọn — khuyến nghị làm, migration riêng để bỏ được)** — DROP 7 object DB không còn ai tham chiếu (0 dòng, 0 caller, 1 hàm đã hỏng sẵn).

## 1. Trace — bằng chứng (đo 2026-08-25, DB production qua `scripts/db-q.mjs`, chỉ đọc)

### 1a. Đầu ra: không nơi nào còn tạo ra trạng thái mà nhánh hoàn kho chờ
`cancelOrder()` chỉ chạy hoàn kho khi `printing_orders.inventory_status ∈ {stocked_out, reserved}`. Grep toàn bộ `app/ components/ lib/ hooks/ types/ supabase/migrations/`: **writer duy nhất** của cột này còn lại trong code là chính `cancelOrder()` set `'cancelled'`. Hai hàm từng set `reserved` (`startProduction`) và `stocked_out` (`completeProduction`) đã bị xoá ở ADR-014 (`0f9a3cb`). DB: `inventory_status` = **31 `none` / 1 `cancelled`** trên 32 dòng (30 active + 2 soft-deleted). Dòng `cancelled` duy nhất là `IN-260615-00019` (`huy_don`, soft-deleted) — **đơn duy nhất từng đi qua `cancelOrder()`** (khớp `cancelled_at IS NOT NULL` = 1, `cancellation_reason IS NOT NULL` = 1).

### 1b. Đầu vào: picker "Liên kết vật tư" là UI câm từ ngày đầu
`printing-detail-drawer.tsx:514-535` có `<SelectForm label="Liên kết vật tư (tùy chọn)">` ghi `item.item_id`, `handleSubmit` (dòng 246) gửi `item_id` lên. Nhưng **`printingItemSchema` (`lib/validations/printing.schema.ts:33-40`) chỉ khai `name/quantity/unitPrice`** — zod `safeParse` strip key lạ → `parsed.data.items` không bao giờ chứa `item_id` → `create_printing_order_atomic`/`update_printing_order_atomic` không bao giờ nhận. DB xác nhận: **0/32 đơn** có bất kỳ item nào mang `item_id` trong `items` jsonb. Đây chính là điều ADR-014 đã ghi nhận ("reservation luôn rỗng vì form không có `item_id`") — giờ trace ra tới gốc: form CÓ, schema STRIP. Hệ quả phụ: mỗi lần mở drawer tốn 1 request `fetchInventoryPickerItems({limit:100})` (dòng 169) để nạp dropdown vô dụng.

### 1c. Bảng/cột kho phía đơn in: rỗng từ khi tạo
| Object (tạo ở `20260524000001_printing_workflow_phase1_fixed.sql`) | Đo được |
|---|---|
| `inventory_reservations` (bảng) | **0 dòng** từ khi tạo; 0 trigger; writer duy nhất trong app = `cancelOrder()` (chỉ `UPDATE status='cancelled'`, không bao giờ INSERT) |
| `inventory_transactions WHERE source_type='printing_order'` | **0 dòng** (bảng có 9 dòng: stock_in 4, retail_sale 4, internal_use 1); `is_rollback=true`: **0**; `reservation_id IS NOT NULL`: **0** |
| `inventory_available_stock` (view, đọc `inventory_reservations`) | 0 reader trong app (chỉ còn trong `database.types.ts`) |
| `expire_old_reservations()` | comment "Run periodically via cron" — **pg_cron chưa cài** (`pg_extension` = 0), chưa từng được lên lịch |
| `check_inventory_conflict(p_item_id uuid, p_start_date date, p_end_date date, p_exclude_reservation_id uuid)` | Thân hàm đọc `inventory_reservations.inventory_item_id/start_date/end_date` — **3 cột không tồn tại** (cột thật: `id, item_id, order_id, reserved_quantity, reserved_at, expires_at, status, notes, created_by, created_at, updated_at`) → gọi là lỗi ngay; **0 caller** (module váy dùng `is_dress_available`) |
| `order_payments` (bảng) + `order_payment_summary` (view) | **0 dòng**; writer cuối (`refund` trong `cancelOrder`) đã xoá ở ADR-015; reader cuối (`getOrderPaymentSummary`) đã xoá ở ADR-015 |

Grant hiện tại: cả 4 object trên cấp **ALL** (INSERT/UPDATE/DELETE/TRUNCATE/…) cho `authenticated` (RLS 3 policy/bảng chặn bớt, view thì không) — thêm 1 lý do dọn.

### 1d. UI cảnh báo hoàn kho không bao giờ hiện
`cancel-order-modal.tsx:68` `hasInventory = order.inventoryStatus === "reserved" || … "stocked_out"` — `mapPrintingOrderRow` (`printing-queries.ts:83-110`) **không nạp** `inventoryStatus` → luôn `undefined` → khối cảnh báo dòng 87-94 là JSX chết.

### 1e. Type chết kéo theo (`types/printing.ts`)
`PrintingItem.item_id` (1b); `PrintingOrderRow.{depositAmount, finalAmount, paidAmount, remainingAmount, inventoryStatus, cancelledAt, cancellationReason, deliveredAt}` (dòng 43-51, comment "Phase 1: Enhanced payment & inventory tracking") — **0 nơi nạp** (grep `mapPrintingOrderRow` + toàn repo), reader duy nhất còn lại là 1d; `OrderPaymentType`, `InventoryAvailableStock`, `RecordDepositPaymentInput`, `StartProductionInput`, `CompleteProductionInput`, `CancelOrderInput` — **0 importer** (grep toàn repo, chỉ còn dòng khai báo). `PaymentMethod` **giữ** (lab payment dùng).

### 1f. Kết luận dead-code
Để nhánh hoàn kho chạy, cần đồng thời: (i) `items[].item_id` tới được DB — **bị schema chặn**; (ii) một action đặt `inventory_status` = reserved/stocked_out — **đã xoá**; (iii) có dòng `inventory_reservations`/`inventory_transactions(printing_order)` — **chưa từng có**. Cả 3 điều kiện đều sai độc lập với nhau. Đúng như ADR-014 chốt nghiệp vụ: in ấn là Mood ⇄ Lab, **không có kho vật tư nội bộ** cho đơn in.

### 1g. Phát hiện kèm — 2 đường hủy đơn, 2 bộ side-effect
| | Dropdown "Hủy đơn" (`updatePrintingOrderStatus`, sau ADR-015 đã hỏi lý do) | Nút "Hủy đơn" trong drawer → `CancelOrderModal` → `cancelOrder()` |
|---|---|---|
| Kiểm transition | `PRINTING_VALID_TRANSITIONS` (SSOT) | Tự kiểm `hoan_thanh/huy_don` (bản sao thứ 2 của luật) |
| `status` | `huy_don` | `huy_don` |
| `cancelled_at`, `cancellation_reason` | **không ghi** | ghi |
| `inventory_status` | không đổi | `'cancelled'` (vô nghĩa, xem 1a) |
| `printing_order_status_history` (66 dòng, "velocity analytics & audit trail") | **ghi** (reason vào cột `reason`) | **không ghi** |
| `fireAuditLog` | INFO | WARNING |
| Cache | client optimistic + `handleSaved` | `revalidatePath("/printing")` + `/printing/[id]` (route không tồn tại) |

→ Hủy từ dropdown thì mất `cancellation_reason` ở cột chính; hủy từ modal thì mất dòng lịch sử. Không đường nào "đúng đủ".

## 2. Kiến trúc đề xuất (ADR-016 — cần user duyệt)

**(a) Một đường hủy duy nhất.** `updatePrintingOrderStatus` là SSOT cho MỌI đổi trạng thái kể cả hủy: khi `to === 'huy_don'` ghi thêm `cancelled_at = now()` + `cancellation_reason = reason` (reason đã bắt buộc theo `printingStatusRequiresReason`), audit mức `WARNING` (giữ ngữ nghĩa cũ của `cancelOrder`). `CancelOrderModal` **giữ UI** (banner cảnh báo + thông tin đơn — tốt hơn `StatusReasonModal` trơn cho hành động không hoàn tác) nhưng **gọi `updatePrintingOrderStatus`**. Xoá `cancelOrder()` → `printing-workflow-mutations.ts` rỗng → **xoá file** (đúng dự đoán ở header file sau ADR-014: "chỉ còn `cancelOrder`").

**(b) Gỡ toàn bộ vết kho khỏi đơn in ở tầng code** (picker, `item_id`, `inventoryStatus`, cảnh báo hoàn kho) — không "sửa cho picker chạy" vì nghiệp vụ ADR-014 không có kho cho đơn in; giữ picker chỉ để có vẻ "linh hoạt" là speculative (CLAUDE.md §2).

**(c) Phase B tách riêng, tuỳ chọn:** DROP 7 object DB rỗng/không tham chiếu. Tách để user có thể chỉ merge Phase A. Khuyến nghị làm: rẻ (1 migration, 0 dữ liệu mất), hết grant ALL thừa cho `authenticated`, hết hàm hỏng sẵn, banner `migrate-direct.mjs` hết in "Created: order_payments table…" mỗi lần chạy (đã gây nhiễu khi áp migration REVOKE hôm nay). **Không** drop cột trên `printing_orders` (mục 6).

## 3. Phase A — diff từng file

### 3.1 `app/actions/printing-mutations.ts` — `updatePrintingOrderStatus`
Sau khối issue-tracking (hiện tại ~dòng 197-206, kết thúc bằng `updateData.issue_reported_by = null; }`), thêm:
```ts
    // ADR-016: hủy đơn đi qua đúng 1 đường (dropdown + CancelOrderModal đều gọi hàm này).
    // Trước đây cancelOrder() ghi 2 cột này nhưng không ghi status_history; dropdown thì ngược lại.
    if (parsedStatus.data === "huy_don") {
      updateData.cancelled_at = now;
      updateData.cancellation_reason = reason?.trim() || null;
    }
```
`fireAuditLog` (hiện tại ~dòng 238-246) thêm 1 dòng `severity` — `lib/audit.ts:43` khai `severity?: Severity` (mặc định `"INFO"`, giá trị `"WARNING"` đã dùng ở dòng 132):
```ts
    fireAuditLog({
      action: "UPDATE",
      tableName: "printing_orders",
      recordId: id,
      description: `Cap nhat trang thai don in ${current.order_code || id}`,
      severity: parsedStatus.data === "huy_don" ? "WARNING" : "INFO",
      oldData: { status: currentStatus },
      newData: { status: parsedStatus.data },
      source: "server_action",
    });
```
Không đổi gì khác (transition check, status_history, `received_date` cho `da_nhan` giữ nguyên).

### 3.2 `components/printing/cancel-order-modal.tsx`
- Dòng 8: `import { cancelOrder } from "@/app/actions/printing-workflow-mutations";` → `import { updatePrintingOrderStatus } from "@/app/actions/printing-mutations";`
- Trong `startTransition` (dòng 42-48):
```ts
        const result = await updatePrintingOrderStatus(
          order.id,
          "huy_don",
          order.contractId ?? "", // tham số thứ 3 hiện là `_contractId` (void) — giữ chữ ký
          reason.trim(),
        );
```
  Giữ `if (!result.success) throw new Error(result.error || "Không thể hủy đơn");` và toast "Đã hủy đơn thành công".
- Xoá `const hasInventory = …` (dòng 68) và khối JSX `{hasInventory && (<ul>…</ul>)}` (dòng 87-94). Comment đầu component (ADR-015) đổi đoạn "Phần cũ gate theo order.paidAmount…" thành 1 dòng: `// ADR-016: gọi thẳng updatePrintingOrderStatus (SSOT) — cancelOrder()/nhánh hoàn kho đã xoá.`

### 3.3 `app/actions/printing-workflow-mutations.ts` — **xoá file**
Importer duy nhất là 3.2 (đã grep `app components lib hooks tests`). Sau 3.2 không còn ai import.

### 3.4 `components/printing/printing-detail-drawer.tsx`
- Dòng 32: xoá `import { fetchInventoryPickerItems } from "@/app/actions/inventory-queries";`
- Dòng 39: xoá `import type { InventoryItem } from "@/types/inventory";`
- Dòng 89: xoá `const NO_INVENTORY_LINK = "__none__";`
- Dòng 138: xoá `const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);`
- Effect `[isOpen, orderId]` (hiện ~dòng 158-181): xoá khối
```ts
    fetchInventoryPickerItems({ activeOnly: true, limit: 100 })
      .then((result) => {
        setInventoryItems(result.items);
      })
      .catch(() => {});
```
  (giữ nguyên phần `getPrintingOrderLabRemaining`).
- `handleSubmit` dòng 246: xoá `item_id: item.item_id || undefined,`
- JSX dòng 514-535: xoá toàn bộ `<SelectForm label="Liên kết vật tư (tùy chọn)" … />`. Wrapper `<div className="space-y-4">` giữ (còn `<Input label="Tên sản phẩm">`). `SelectForm` vẫn dùng cho chọn hợp đồng/lab — **giữ import**.

### 3.5 `types/printing.ts`
- `PrintingItem`: xoá dòng `item_id?: string;  // Optional link to inventory_items table for reservation`.
- `PrintingOrderRow`: xoá comment `// Phase 1: Enhanced payment & inventory tracking` + 8 dòng `depositAmount?`, `finalAmount?`, `paidAmount?`, `remainingAmount?`, `inventoryStatus?`, `cancelledAt?`, `cancellationReason?`, `deliveredAt?`.
- Xoá `export type OrderPaymentType = …` (giữ `export type PaymentMethod = …` ngay dưới — lab payment dùng).
- Xoá `interface InventoryAvailableStock`, `RecordDepositPaymentInput`, `StartProductionInput`, `CompleteProductionInput`, `CancelOrderInput` (toàn bộ khối "PHASE 1: Action Inputs"). Giữ nguyên khối "LAB PAYMENT FLOW".

### 3.6 `components/contracts/detail/print-orders-block.tsx` dòng 328
`types/contract.ts:12` import `PrintingItem` từ `./printing` → sau 3.5 `item.item_id` là lỗi tsc. Đổi:
```tsx
<div key={`${item.name}-${index}`} …>
```

### 3.7 `tests/e2e/printing-drawer-fixes-verify.spec.ts` — mở rộng test 2 (submit hủy thật)
Thay đoạn cuối test 2 (từ `await cancelModal.getByRole("button", { name: "Hủy", exact: true }).click();` đến hết) bằng:
```ts
    await cancelModal.locator("textarea").fill("E2E: hủy từ modal");
    await cancelModal.getByRole("button", { name: "Xác nhận hủy đơn" }).click();
    await expect(page.getByText("Đã hủy đơn thành công").first()).toBeVisible({ timeout: 15_000 });
    await expect(cancelModal).toBeHidden();
    // Drawer đang mở tự đổi badge (ADR-015) + nút Hủy đơn/next-step ẩn
    await expect(detail.getByText("Hủy đơn", { exact: true }).first()).toBeVisible({ timeout: 15_000 });
    await expect(detail.getByRole("button", { name: /Lab đã in xong/ })).toHaveCount(0);
    // ADR-016: 1 đường hủy → đủ cả 2 bộ side-effect
    const rowC = await admin
      .from("printing_orders")
      .select("status, cancelled_at, cancellation_reason")
      .eq("id", seed.orderC!.id)
      .single();
    expect(rowC.data?.status).toBe("huy_don");
    expect(rowC.data?.cancelled_at).not.toBeNull();
    expect(rowC.data?.cancellation_reason).toBe("E2E: hủy từ modal");
    const hist = await admin
      .from("printing_order_status_history")
      .select("to_status, reason")
      .eq("order_id", seed.orderC!.id)
      .eq("to_status", "huy_don");
    expect(hist.data?.length).toBe(1);
    expect(hist.data?.[0]?.reason).toBe("E2E: hủy từ modal");
```
(`waitForOrderStatus` có sẵn dùng được thay `rowC` nếu muốn; cleanup đã xoá `printing_order_status_history` trước `printing_orders` nên không rò.)

## 4. Phase B — migration `supabase/migrations/20260825HHMMSS_drop_printing_inventory_payment_legacy.sql` (tuỳ chọn)

**Pre-check bắt buộc (phải trả 0 cho cả 3, nếu không DỪNG hỏi Claude):**
```sql
SELECT (SELECT count(*) FROM public.inventory_reservations) AS reservations,
       (SELECT count(*) FROM public.order_payments) AS order_payments,
       (SELECT count(*) FROM public.inventory_transactions WHERE reservation_id IS NOT NULL) AS txn_with_reservation;
```
Migration (thứ tự đúng dependency: view trước bảng, cột FK trước bảng đích):
```sql
-- T-20260825-printing-cancel-inventory-deadcode / ADR-016. Đo trước khi viết: 0 dòng, 0 caller,
-- pg_views/pg_proc không còn object nào khác tham chiếu. Nguồn gốc: 20260524000001 (phase1),
-- nghiệp vụ đã bỏ ở ADR-014 (không cọc, không kho cho đơn in).
DROP VIEW IF EXISTS public.order_payment_summary;          -- reader cuối xoá ở ADR-015
DROP VIEW IF EXISTS public.inventory_available_stock;      -- 0 reader; đọc inventory_reservations
DROP FUNCTION IF EXISTS public.expire_old_reservations();  -- chưa từng lên lịch (pg_cron chưa cài)
DROP FUNCTION IF EXISTS public.check_inventory_conflict(uuid, date, date, uuid); -- tham chiếu cột không tồn tại, 0 caller
ALTER TABLE public.inventory_transactions DROP COLUMN IF EXISTS reservation_id; -- 0 dòng non-null; idx_inventory_transactions_reservation rơi theo
DROP TABLE IF EXISTS public.inventory_reservations;        -- 0 dòng từ khi tạo; RLS 3 policy + 5 index rơi theo
DROP TABLE IF EXISTS public.order_payments;                -- 0 dòng; RLS 3 policy + 6 index rơi theo
```
Sau khi áp: `npm run db:types` (bắt buộc — gỡ 2 bảng, 2 view, cột `reservation_id` khỏi `database.types.ts`; grep xác nhận không code nào ngoài types file dùng `reservation_id`/`InventoryAvailableStock`). Sửa script: `scripts/vault-gen-schema.mjs:98` bỏ `"inventory_reservations"` khỏi nhóm `vat-tu`; `scripts/verify-migration.mjs:68` bỏ `{ type: 'table', name: 'inventory_reservations' }` (+ dòng `order_payments` tương ứng nếu có — đọc file khi implement); `scripts/migrate-direct.mjs:88-93` bỏ khối "📋 Created: order_payments table / inventory_reservations table / order_payment_summary view / inventory_available_stock view" (text cố định sai từ lâu); `scripts/check-schema.mjs:75,94` tương tự. Chạy `node scripts/vault-gen-schema.mjs` để vault khớp.

## 5. Verify (gate trước khi báo xong)

Phase A: (1) `npx eslint` file trong locks — 0 lỗi mới; (2) `npx tsc --noEmit` — 0 lỗi (đây là gate chính bắt sót `item_id`/`inventoryStatus`/`cancelOrder` còn tham chiếu ở đâu); (3) `npm run build` exit 0; (4) `npm run verify:printing` + `verify:contracts` xanh; (5) Playwright `tests/e2e/printing-drawer-fixes-verify.spec.ts` 3/3 trên `next start` prod (với test 2 mở rộng ở 3.7) — dùng `domcontentloaded`, không `networkidle`; (6) render thật drawer "Sửa đơn": hạng mục chỉ còn Tên/Số lượng/Đơn giá, không còn dropdown "Liên kết vật tư", Network tab **không** còn request `fetchInventoryPickerItems` khi mở drawer.
Phase B: pre-check 0/0/0 → `node scripts/migrate-direct.mjs <file>` → `npm run db:types` → `npx tsc --noEmit` 0 → `npm run verify:inventory` + `verify:printing` xanh → `node scripts/vault-gen-schema.mjs`.
Sau merge: chạy lại Playwright trên `stu.moodwedding.com` (tiền lệ ADR-015).

## 6. Không làm / ngoài phạm vi (ghi nhận)
- **Không drop cột trên `printing_orders`** (`inventory_status`, `deposit_amount`, `paid_amount`, `final_amount`, `delivered_at`, `delivered_date`): `pg_proc` cho thấy `finance_contract_profit_report` và `get_contract_detail_v2` có thân hàm chứa cả `paid_amount` lẫn `printing_orders` — chưa tách được là đọc `contracts.paid_amount` hay `printing_orders.paid_amount` nếu không đọc hết 2 hàm; lợi ích drop cột ≈ 0 (giá trị toàn 0/null, không ai ghi), rủi ro vỡ RPC > 0 → để nguyên. `cancelled_at`/`cancellation_reason` giờ được ghi lại bởi 3.1 nên là cột SỐNG.
- `PrintingOrderDetail.deliveredDate` + `delivered_date` trong `buildPrintingSelect` — vết "giao khách" (ADR-014 bỏ khỏi trạng thái) nhưng là đọc-only vô hại; task riêng nếu muốn.
- Thiết kế 2 modal hủy (`StatusReasonModal` cho dropdown, `CancelOrderModal` cho nút trong drawer) — sau ADR-016 cả hai cùng backend; hợp nhất UI là việc thẩm mỹ, không làm ở đây.
