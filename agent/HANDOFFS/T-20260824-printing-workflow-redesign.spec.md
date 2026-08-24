# T-20260824 — Thiết kế lại trạng thái đơn in: bỏ "đặt cọc"/"giao khách"/kho, công nợ Lab thành trục độc lập

**Owner:** claude (fallback, user chỉ định "bạn code triển khai luôn chứ không giao ai khác") · **Trạng thái:** đã implement + verify xanh (2026-08-24), branch `claude/printing-workflow-redesign` · **ADR:** `agent/DECISIONS.md` ADR-014
**Module:** in-an-lab · **Locks:**
- `supabase/migrations/20260824HHMMSS_printing_workflow_redesign.sql` (mới)
- `app/actions/printing-mutations.ts`
- `app/actions/printing-queries.ts`
- `app/actions/printing-workflow-mutations.ts`
- `types/printing-constants.ts`
- `types/printing.ts`
- `components/ui/status-select.tsx`
- `components/printing/printing-detail-drawer.tsx`
- `components/printing/printing-filters.tsx`
- `components/printing/deposit-payment-modal.tsx` (xoá)
- `components/printing/final-payment-modal.tsx` (xoá)
- `components/contracts/detail/print-orders-block.tsx`

**KHÔNG đụng:** `payment_plans`, `payment_stage_key_v2`, `useContractFinancials.ts`, `payment-receipt-form.tsx`, `types/contract-constants.ts` — đó là "đợt cọc" **khách trả Mood** ở module Hợp đồng, khác domain, đúng, giữ nguyên. Grep xác nhận 2 domain dùng 2 từ khác nhau: hợp đồng = `da_coc`, in ấn (đang xoá) = `dat_coc`.

---

## 0. Nghiệp vụ đúng (user xác nhận 2026-08-24)

> "chụp xong mình gửi lab, bên lab nhận đơn, lab đang in, rồi lab gửi hình cho mood studio là đồng nghĩa xong đơn đó, vấn đề còn lại sẽ là dòng tiền từ mood studio đang nợ lab" — "2 đã in nó vẫn còn là bên lab — khi nào studio nhận hình mới báo hoàn thành"

Hai trục **hoàn toàn tách biệt**, không trục nào gate trục kia:

**Trục A — Tiến độ sản xuất (4 bước):**
```
cho_xu_ly ──► dang_in ──► da_in ──► hoan_thanh
(chờ gửi lab)  (lab đang in)  (lab in xong,   (Mood đã nhận
                                vẫn ở bên lab)  hình từ lab)
```
+ nhánh phụ `huy_don` (hủy), `gap_su_co` (sự cố) — giữ nguyên như hiện tại.

**Trục B — Công nợ Lab (số dư động, không phải trạng thái):**
```
còn nợ = total_amount − SUM(lab_payment_allocations)
```
Ghi qua `record_lab_payment_atomic` (đã đúng, atomic, giữ nguyên 100%). Hiển thị dạng badge/số tiền cạnh đơn, **không còn là một ô trong hàng trạng thái**.

Bỏ hẳn khỏi Trục A: `dat_coc` ("đặt cọc" — không có khái niệm cọc Mood↔Lab), `da_giao` ("giao khách" — 0/27 đơn từng dùng, thuộc `contract_events.giao_san_pham` của hợp đồng, không phải đơn in). Gộp `da_nhan` (tên cũ) vào `hoan_thanh` (tên hiện tại) — hết trùng nghĩa.

## 1. Dữ liệu thật cần xử lý (đã đo, không suy đoán)

```
active (deleted_at IS NULL): cho_xu_ly 9 · dat_coc 2 · dang_in 4 · da_in 4 · hoan_thanh 5 · da_nhan 3
soft-deleted (giữ nguyên, KHÔNG migrate): da_nhan 1 · huy_don 1
```

**3 đơn `da_nhan`** → đổi thành `hoan_thanh` (cùng nghĩa, chỉ khác tên).

**2 đơn `dat_coc`** (`IN-260625-00120`, `IN-260702-00121`, cùng lab "Hồng Bảo"):
- `deposit_amount = 0`, `paid_amount = 0`, **0 dòng** `order_payments`, **0 dòng** `lab_payment_allocations` — **chưa từng có tiền thật**. Trạng thái "Đã đặt cọc" chỉ là nhãn đổi tay qua dropdown, không kiểm tiền (đúng bug đã tìm thấy ở mục 02 artifact).
- Hợp đồng gốc (`HĐ-2026-0029`, `HĐ-2026-0038`) đã `hoan_thanh` từ lâu → thực tế Mood chắc chắn đã nhận hình từ lab.
- **Quyết định:** chuyển cả 2 sang `hoan_thanh` (Trục A xong). **KHÔNG tạo `lab_payment_allocations` giả** — không có sự kiện trả tiền thật nào để ghi. `payment_status` giữ nguyên `chua_thanh_toan` (đã đúng sẵn). Kết quả: sau khi dọn, "Công nợ Lab" của lab Hồng Bảo sẽ lộ ra khoản nợ thật **435.000 + 370.000 = 805.000 ₫** đang bị che giấu bởi nhãn "Đã đặt cọc" sai — đây là phát hiện phụ có giá trị: khả năng cao Mood đang nợ Hồng Bảo khoản này mà quên.

Không cần migrate `da_giao` (0 dòng active) hay `gap_su_co`/`da_huy` (0 dòng active).

## 2. Migration SQL — `supabase/migrations/20260824HHMMSS_printing_workflow_redesign.sql`

```sql
-- 1. Gộp trạng thái legacy 'da_nhan' vào 'hoan_thanh' (cùng nghĩa: Mood đã nhận hình từ lab).
UPDATE public.printing_orders
SET status = 'hoan_thanh', updated_at = now()
WHERE status = 'da_nhan' AND deleted_at IS NULL;

-- 2. 2 đơn 'dat_coc' không có tiền thật đứng sau (deposit_amount=0, 0 dòng order_payments/
--    lab_payment_allocations) và hợp đồng gốc đã hoan_thanh từ lâu → chuyển thẳng sang
--    hoan_thanh (Trục A xong). KHÔNG tạo payment giả — công nợ Lab (805.000đ, lab Hồng Bảo)
--    sẽ tự lộ ra qua finance_lab_debt_summary() sau migration, xử lý bằng "Thanh toán lab" thật.
UPDATE public.printing_orders
SET status = 'hoan_thanh', updated_at = now()
WHERE id IN ('78b0dc36-7e26-41bb-94c4-13e21ae8fda1', '2ea52890-3f34-4d7e-8bfd-f470f530e471')
  AND deleted_at IS NULL;

-- 3. Khoá vocabulary — chỉ áp cho dòng active (deleted_at IS NULL), không đụng dữ liệu
--    lịch sử đã xoá mềm (1 dòng da_nhan + 1 dòng huy_don soft-deleted, giữ nguyên).
ALTER TABLE public.printing_orders
  ADD CONSTRAINT printing_orders_status_check
  CHECK (deleted_at IS NOT NULL OR status IN
    ('cho_xu_ly','dang_in','da_in','hoan_thanh','huy_don','gap_su_co'));

ALTER TABLE public.printing_orders
  ADD CONSTRAINT printing_orders_payment_status_check
  CHECK (deleted_at IS NOT NULL OR payment_status IN
    ('chua_thanh_toan','da_thanh_toan'));

-- 4. printing_stats() — bỏ cột dat_coc/da_giao/da_nhan/da_huy (không còn ý nghĩa), sửa
--    unpaid_cost đọc đúng từ vựng thật (bug gốc: đang hỏi 'unpaid'/'partial' — 0 dòng khớp).
CREATE OR REPLACE FUNCTION public.printing_stats()
 RETURNS TABLE(total bigint, cho_xu_ly bigint, dang_in bigint, da_in bigint, hoan_thanh bigint, huy_don bigint, total_cost numeric, unpaid_cost numeric)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    COUNT(*)::bigint AS total,
    COUNT(*) FILTER (WHERE status = 'cho_xu_ly')::bigint AS cho_xu_ly,
    COUNT(*) FILTER (WHERE status = 'dang_in')::bigint AS dang_in,
    COUNT(*) FILTER (WHERE status = 'da_in')::bigint AS da_in,
    COUNT(*) FILTER (WHERE status = 'hoan_thanh')::bigint AS hoan_thanh,
    COUNT(*) FILTER (WHERE status = 'huy_don')::bigint AS huy_don,
    COALESCE(SUM(total_amount) FILTER (WHERE status <> 'huy_don'), 0)::numeric AS total_cost,
    COALESCE(SUM(total_amount) FILTER (
      WHERE payment_status = 'chua_thanh_toan' AND status <> 'huy_don'
    ), 0)::numeric AS unpaid_cost
  FROM public.printing_orders
  WHERE deleted_at IS NULL;
$function$;
```

**Verify trước khi apply (bắt buộc):**
```sql
-- Phải trả về 0 dòng — nếu không, có dữ liệu active ngoài dự kiến, DỪNG lại hỏi Claude.
SELECT status, count(*) FROM printing_orders WHERE deleted_at IS NULL
  AND status NOT IN ('cho_xu_ly','dat_coc','dang_in','da_in','hoan_thanh','da_nhan') GROUP BY 1;
```
Áp qua `node scripts/migrate-direct.mjs 20260824HHMMSS_printing_workflow_redesign.sql` (theo `CLAUDE.md` — script chuẩn của repo, không chạy tay qua `db-q.mjs`). Sau khi apply, chạy `npm run db:types` (bắt buộc — đổi cột `printing_stats()`).

## 3. `app/actions/printing-mutations.ts`

**VALID_TRANSITIONS** (thay nguyên khối, khoảng dòng 21-33):
```ts
const VALID_TRANSITIONS: Record<string, string[]> = {
  cho_xu_ly: ["dang_in", "huy_don", "gap_su_co"],
  dang_in: ["da_in", "huy_don", "gap_su_co"],
  da_in: ["hoan_thanh", "huy_don", "gap_su_co", "dang_in"], // dang_in = rework, giữ như cũ
  hoan_thanh: [],
  huy_don: [],
  gap_su_co: ["cho_xu_ly", "dang_in", "da_in", "hoan_thanh", "huy_don"],

  // Legacy — vẫn nhận diện để đọc dữ liệu cũ không vỡ, nhưng terminal, không cho đi tiếp.
  da_nhan: [],
  da_huy: [],
};
```

**`isRollback` helper** (khoảng dòng 166) — bỏ `dat_coc`/`da_giao` khỏi mảng `ORDER`:
```ts
const ORDER = ["cho_xu_ly", "dang_in", "da_in", "hoan_thanh"];
```

Không đổi gì khác trong file này — `updatePrintingOrderStatus` (thân hàm) giữ nguyên 100%, chỉ 2 hằng số trên thay đổi ý nghĩa theo enum mới.

## 4. `app/actions/printing-workflow-mutations.ts`

**Xoá hoàn toàn 3 export:** `startProduction` (dòng 171-291), `completeProduction` (dòng 294-477), `recordDepositPayment` (dòng 54-168). Lý do: kho vật tư không thuộc in ấn (0/27 đơn từng chạm `inventory_reservations`); đặt cọc không tồn tại trong nghiệp vụ Mood↔Lab.

**Xoá `recordFinalPayment`** (dòng 480-613) — tất toán gắn với "giao khách" (`order.status !== "da_giao"` guard) đã không còn ý nghĩa; tiền đơn in chỉ còn 1 chiều (Mood trả Lab, qua `record_lab_payment_atomic`).

**Giữ nguyên `cancelOrder`** (dòng 615-790, rollback kho + hoàn tiền) — vẫn hợp lệ cho nhánh hủy đơn, không đụng.

**Giữ nguyên `toPaymentMethodEnum`, `getOrderWithValidation`** — dùng chung cho `cancelOrder`.

Sau khi xoá, file chỉ còn: helper `toPaymentMethodEnum`, `getOrderWithValidation`, và `cancelOrder`.

## 5. `types/printing-constants.ts`

```ts
export const PRINTING_ORDER_STATUSES = [
  "cho_xu_ly",
  "dang_in",
  "da_in",
  "hoan_thanh",
  "huy_don",
  "gap_su_co",
  "da_nhan",   // LEGACY — chỉ để đọc dữ liệu audit-log cũ, không còn ghi mới
  "da_huy",    // LEGACY — như trên
] as const;
```
(xoá `dat_coc`, `da_giao` khỏi mảng)

**`PRINTING_STATUS_LABELS`** — xoá 2 entry `dat_coc`/`da_giao`.

**Xoá hoàn toàn** `DB_PAYMENT_STATUSES`, `DBPaymentStatus`, `toDBPaymentStatus` — đã xác nhận **0 nơi gọi** trong toàn bộ `app/`+`components/`, là tàn dư của từ vựng tiếng Anh cũ.

**`toUIPaymentStatus`** — thay bằng bản đơn giản (2 vocab giờ trùng nhau, không cần quy đổi phức tạp nữa):
```ts
export function toUIPaymentStatus(
  dbStatus: string | null | undefined,
): PrintingPaymentStatus {
  return dbStatus === "da_thanh_toan" ? "da_thanh_toan" : "chua_thanh_toan";
}
```
Bỏ tham số `orderStatus` thứ 2 (không cần fallback theo trạng thái sản xuất nữa — sau migration `payment_status` luôn đúng, đã kiểm bằng `CHECK` constraint ở migration). **Cập nhật call site** `app/actions/printing-queries.ts` dòng ~100: `toUIPaymentStatus(row.payment_status, row.status)` → `toUIPaymentStatus(row.payment_status)`.

## 6. `types/printing.ts` — `PrintingStats`

```ts
export interface PrintingStats {
  total: number;
  choXuLy: number;
  dangIn: number;
  daIn: number;
  hoanThanh: number;
  huyDon: number;
  totalCost: number;
  unpaidCost: number;
}
```
(xoá `datCoc`, `daGiao`, `daNhan`, `daHuy`)

## 7. `app/actions/printing-queries.ts`

**Bộ lọc `paymentStatus`** — 2 chỗ giống hệt nhau (dòng ~171-178 và ~286-291), thay cả hai bằng:
```ts
if (filters.paymentStatus && filters.paymentStatus !== "all") {
  query = query.eq("payment_status", filters.paymentStatus); // "chua_thanh_toan" | "da_thanh_toan" — khớp thẳng, không cần quy đổi
}
```
(bỏ hẳn nhánh `if/else` với `.or("payment_status.eq.paid,...")`/`.in("payment_status",["unpaid","partial"])` — đây chính là bug gây KPI/tab lọc sai)

**2 chỗ map `PrintingStats`** (dòng ~241-253 và ~330-343) — bỏ 4 dòng `datCoc`/`daGiao`/`daNhan`/`daHuy`:
```ts
return {
  total: Number(row.total ?? 0),
  choXuLy: Number(row.cho_xu_ly ?? 0),
  dangIn: Number(row.dang_in ?? 0),
  daIn: Number(row.da_in ?? 0),
  hoanThanh: Number(row.hoan_thanh ?? 0),
  huyDon: Number(row.huy_don ?? 0),
  totalCost: Number(row.total_cost ?? 0),
  unpaidCost: Number(row.unpaid_cost ?? 0),
};
```
(áp cùng mẫu cho cả 2 vị trí — 1 trong `getPrintingStats`, 1 trong `getPrintingBootstrap`)

**`toUIPaymentStatus(row.payment_status, row.status)`** (dòng ~100) → `toUIPaymentStatus(row.payment_status)` (khớp chữ ký mới ở mục 5).

## 8. `components/ui/status-select.tsx`

`PRINT_ORDER_STATUS_OPTIONS` — xoá 2 entry `dat_coc`/`da_giao`:
```ts
export const PRINT_ORDER_STATUS_OPTIONS = [
  { value: "cho_xu_ly",   label: "Chờ xử lý",    color: "var(--color-status-warning)" },
  { value: "dang_in",     label: "Đang in",      color: "var(--color-status-info)" },
  { value: "da_in",       label: "Đã in — bên lab", color: "var(--color-status-primary)" },
  { value: "hoan_thanh",  label: "Hoàn thành",   color: "var(--color-status-success)" },
  { value: "gap_su_co",   label: "Gặp sự cố",    color: "var(--color-status-error)" },
  { value: "huy_don",     label: "Hủy đơn",      color: "var(--color-status-error)" },

  // ─── Legacy (Backward Compatibility) ───
  { value: "da_nhan",     label: "Đã nhận",      color: "var(--color-status-success)" },
  { value: "da_huy",      label: "Đã hủy",       color: "var(--color-status-error)" },
] as const;
```
Nhãn `da_in` đổi thành **"Đã in — bên lab"** (thay vì "Đã in" trơn) — làm rõ ý nghĩa mới: lab đã in xong nhưng hình vẫn ở bên lab, chưa về Mood. Đây là điểm bạn nhấn mạnh, giữ đúng nguyên văn.

## 9. `components/printing/printing-filters.tsx`

**`PAYMENT_OPTIONS`** — bỏ comment sai + đổi giá trị sang tiếng Việt thật:
```ts
const PAYMENT_OPTIONS = [
  { value: "all", label: "Thanh toán" },
  { value: "chua_thanh_toan", label: "Còn nợ lab" },
  { value: "da_thanh_toan", label: "Đã thanh toán" },
];
```
(bỏ tuỳ chọn "Trả 1 phần" — với `chua_thanh_toan`/`da_thanh_toan` nhị phân, không còn trạng thái "một phần" riêng; số tiền còn nợ cụ thể xem trực tiếp trong đơn qua Trục B, không cần thêm 1 tab)

**`statusTabs`** — xoá tab `dat_coc`/`da_giao`, đổi field tương ứng theo `PrintingStats` mới:
```ts
const statusTabs = [
  { label: "Tất cả", value: "all", count: stats.total },
  { label: "Chờ xử lý", value: "cho_xu_ly", count: stats.choXuLy },
  { label: "Đang in", value: "dang_in", count: stats.dangIn },
  { label: "Đã in", value: "da_in", count: stats.daIn },
  { label: "Hoàn thành", value: "hoan_thanh", count: stats.hoanThanh },
  { label: "Hủy đơn", value: "huy_don", count: stats.huyDon },
];
```

## 10. `components/printing/printing-detail-drawer.tsx`

**Xoá import:** `DepositPaymentModal`, `FinalPaymentModal` (dòng 28-29), `startProduction`, `completeProduction` khỏi import từ `printing-workflow-mutations` (dòng 34-35).

**Xoá state:** `showFinalPaymentModal` và mọi `setShowFinalPaymentModal` (dòng 143, 159, 353) — `showDepositModal` cũng xoá nếu tồn tại tương tự (grep xác nhận trước khi xoá, tên biến có thể là `showDepositModal`).

**`getNextStepAction`** (dòng 61-83) — viết lại theo Trục A 4 bước, bỏ hẳn action `"deposit"`/`"start_production"`/`"complete_production"`/`"final_payment"`, tất cả chuyển trạng thái đi qua `onStatusChange` (đường `updatePrintingOrderStatus` đã đúng, atomic ở tầng ứng dụng theo state machine):

```ts
interface NextStepAction {
  label: string;
  nextStatus: PrintingOrderStatus;
}

function getNextStepAction(status: PrintingOrderStatus): NextStepAction | null {
  switch (status) {
    case "cho_xu_ly":
      return { label: "Gửi lab — bắt đầu in", nextStatus: "dang_in" };
    case "dang_in":
      return { label: "Lab đã in xong", nextStatus: "da_in" };
    case "da_in":
      return { label: "Đã nhận từ lab — Hoàn thành", nextStatus: "hoan_thanh" };
    default:
      return null;
  }
}
```

**`handleNextStep`** (thân hàm dùng `nextStepAction.action`) — đơn giản hoá vì giờ chỉ còn 1 nhánh hành động (không còn `switch` theo action, luôn gọi `onStatusChange`):
```ts
const handleNextStep = async () => {
  if (!order || !nextStepAction || !onStatusChange) return;
  setLoading(true);
  try {
    await onStatusChange(order, nextStepAction.nextStatus);
  } catch (error: any) {
    toast(error.message || "Lỗi chuyển trạng thái", "error");
  } finally {
    setLoading(false);
  }
};
```

**Xoá JSX render** của `<DepositPaymentModal .../>` (~dòng 738-750) và `<FinalPaymentModal .../>` (~dòng 751-764). **Giữ nguyên** `<CancelOrderModal .../>` và `<LabPaymentModal .../>` (~dòng 772+) — đây chính là entry-point Trục B đã đúng sẵn, không đụng.

**Thêm hiển thị số dư nợ cạnh nút "Thanh toán lab"** (~dòng 678-687, nơi render nút `WalletCards` "Thanh toán lab") — hiện nút này không hiện số tiền, thêm badge nhỏ bên cạnh dùng `order.totalAmount - (đã phân bổ)`. **Cần kiểm tra:** `PrintingOrderRow`/`order` hiện có field số tiền đã phân bổ cho lab chưa (`getOrderPaymentSummary` chỉ trả `remaining` cho *khách trả Mood* — khác domain). Nếu chưa có, thêm 1 field `labRemaining` vào `mapPrintingOrderRow` (`printing-queries.ts`) tính bằng subquery `SUM(lab_payment_allocations.amount)` — hoặc dùng thẳng `order.totalAmount` kèm nhãn "Còn nợ lab (tối đa)" nếu muốn tối giản, tuỳ Codex đánh giá khi implement, KHÔNG bắt buộc phải chính xác tuyệt đối ở bản đầu — ưu tiên đúng 2 mục 1-9 trước, mục này có thể tách task riêng nếu phát sinh phức tạp.

## 11. `components/contracts/detail/print-orders-block.tsx`

**`STATUS_ORDER`** (dòng 28) → `["cho_xu_ly", "dang_in", "da_in", "hoan_thanh"]`.

**`SIDE_EFFECT_STATUSES`** (dòng 29) — bỏ `"dat_coc"`/`"da_giao"` nếu có trong set (kiểm tra nội dung thật trước khi sửa — spec dựa trên tên biến, không dựa trên giá trị đã đọc đầy đủ).

**Dòng 129, 161** (`if (newStatus === "da_giao" ...)`, `applyStatusUpdate(orderId, "da_giao", previous)`) — 2 chỗ này gắn với luồng "Đã giao khách" đang xoá. Đọc kỹ ngữ cảnh quanh 2 dòng này trước khi sửa (chưa trace hết trong spec này) — nếu là nút hành động độc lập "Đánh dấu đã giao khách", cân nhắc **giữ lại như một hành động ghi chú riêng** (không phải trạng thái đơn in) hoặc bỏ hẳn nếu trùng với `contract_events.giao_san_pham`. Codex/Roo phát hiện mơ hồ ở đây → viết HANDOFF trả Claude, không tự quyết kiến trúc.

**Dòng 255-256** (`isLate`, `isMissingFile` — mảng loại trừ có `"da_giao"`) → bỏ `"da_giao"` khỏi mảng, giữ `"hoan_thanh"`, `"huy_don"`.

## 12. Xoá file

`components/printing/deposit-payment-modal.tsx`, `components/printing/final-payment-modal.tsx` — xác nhận **0 nơi khác** import (đã grep toàn repo), an toàn xoá hẳn.

## 13. Verify (gate bắt buộc trước khi báo xong)

1. `node scripts/migrate-direct.mjs <tên migration>` — áp thành công, không lỗi CHECK constraint.
2. Query xác nhận: `SELECT status, payment_status, count(*) FROM printing_orders WHERE deleted_at IS NULL GROUP BY 1,2` — chỉ còn 4 giá trị status hoạt động (`cho_xu_ly/dang_in/da_in/hoan_thanh`), 2 giá trị payment_status.
3. `npm run db:types` — cập nhật `database.types.ts` khớp `printing_stats()` mới.
4. `npx eslint <toàn bộ file trong locks>` — 0 error mới.
5. `npm run build` — exit 0.
6. Render thật `/printing` (Roo, chrome-devtools): KPI "Chưa thanh toán" hiện đúng số (>0, khớp query DB), tab lọc "Còn nợ lab" trả về đúng số đơn thật, không còn 2 tab `dat_coc`/`da_giao` trong danh sách filter.
7. Render `/contracts/[id]` với 1 hợp đồng có đơn in — nút chuyển trạng thái đúng 4 bước, nút "Thanh toán lab" vẫn hoạt động (`record_lab_payment_atomic` không đổi).
8. `finance_lab_debt_summary()` sau migration — công nợ lab "Hồng Bảo" phải phản ánh đúng 2 đơn cũ (805.000₫ nếu chưa trả) cộng dồn với công nợ khác của lab đó.

## 14b. Kết quả thực thi (Claude fallback, 2026-08-24, branch `claude/printing-workflow-redesign`)

**2 file phát sinh ngoài locks ban đầu** (phát hiện qua grep exhaustive sau khi đọc full file, compile-breaking nếu bỏ sót — không phải scope creep, là hệ quả trực tiếp của việc đổi `PrintingStats`/`PRINTING_ORDER_STATUSES`):
- `components/printing/printing-stats-bar.tsx` — 2 metric card dùng `stats.datCoc`/`stats.daGiao`. Đổi nhãn: "Cần xử lý" → **"Chờ gửi lab"** (chỉ còn `choXuLy`), "Sẵn sàng giao" → **"Đang ở lab"** (`daIn` — đúng nghĩa mới: lab đã in xong, hình vẫn ở bên lab).
- `components/printing/printing-list-page.tsx` — `EMPTY_STATS` default object, bỏ 4 field chết.

**1 điểm tự quyết thêm** (đúng nhất quán với redesign, không phải đọc sai spec): `print-orders-block.tsx` có cơ chế `SIDE_EFFECT_STATUSES` chặn hầu hết chuyển trạng thái từ thẻ hợp đồng, bắt route sang `/printing` — lý do gốc là các trạng thái đó từng gắn side effect kho/tiền. Sau khi xoá hết side effect đó (mục 4), cơ chế chặn hết lý do tồn tại → gỡ hẳn `SIDE_EFFECT_STATUSES`, modal "Cần xử lý ở trang In ấn", modal cảnh báo giao hàng khi chưa thanh toán đủ (gắn với `da_giao` đã xoá), và `useRouter` (chỉ dùng cho modal đó). Giờ mọi trạng thái đổi được thẳng từ thẻ hợp đồng — khớp thực tế: không còn side effect nào để phải "route đi nơi khác".

**Migration production đã áp** (`supabase/migrations/20260824120000_printing_workflow_redesign.sql`, qua `scripts/migrate-direct.mjs`, transaction — 1 lần retry vì `CREATE OR REPLACE FUNCTION` không đổi được OUT parameters, phải `DROP FUNCTION` trước, lần đầu tự rollback sạch, không để lại gì):
- 3 đơn `da_nhan` (legacy) + 2 đơn `dat_coc` (không tiền thật — xem mục 1) → `hoan_thanh`.
- 2 `CHECK` constraint mới trên `printing_orders` (status, payment_status), scoped `deleted_at IS NOT NULL OR ...` để không đụng 2 dòng lịch sử đã xoá mềm.
- `printing_stats()` viết lại, bỏ 4 cột chết, sửa `unpaid_cost` đọc đúng từ vựng thật.
- `npm run db:types` chạy sau migration — `database.types.ts` khớp.

| Gate | Kết quả |
|---|---|
| Query xác nhận sau migration | 27 đơn active: `cho_xu_ly` 9 · `dang_in` 4 · `da_in` 4 · `hoan_thanh` 10 (5 gốc + 3 da_nhan + 2 dat_coc) |
| `printing_stats()` | `unpaid_cost = 7.916.400` — **khớp chính xác** `finance_lab_debt_summary()` (lab Hồng Bảo, 25 đơn, remaining 7.916.400) |
| `npx eslint` (11 file trong locks + 2 file phát sinh) | 0 error, 1 warning pre-existing (không do task này) |
| `npm run build` | exit 0, PWA artifact pass |
| Render thật (`next start` prod + Playwright, seed 1 user E2E rồi xoá — **không mutate dữ liệu đơn in thật**, chỉ đọc) | `/printing`: KPI "Công nợ" **7.916.400 VND** (đúng, trước đây 0₫), tabs "Chờ gửi lab"/"Đang ở lab" đúng nhãn, không còn text "Đã đặt cọc"/"Đã giao"; `/contracts/[id]` đơn `dang_in` (`IN-260609-00016`) hiện dropdown trạng thái **ngay trong thẻ hợp đồng** (không còn bị chặn route); đơn migrate (`IN-260702-00121`) hiện đúng **"Hoàn thành"** |

**Số liệu phụ đáng chú ý — báo user:** sau migration, công nợ Lab **Hồng Bảo** lộ ra **7.916.400 ₫** trên **25 đơn**, `total_paid = 0` toàn bộ (chưa từng thanh toán qua `record_lab_payment_atomic` lần nào cho lab này). Lớn hơn nhiều số 5.567.000 ước tính ở artifact trước — vì `printing_stats()` cũ loại trừ luôn cả đơn `hoan_thanh` khỏi "chưa thanh toán" (đúng chỗ hổng: coi "xong sản xuất" = "đã trả lab", sai theo đúng nghiệp vụ 2 trục mà user vừa chỉnh). Đây là dữ liệu thật, không phải lỗi hiển thị mới — cần user xác nhận có đúng thực tế còn nợ hay không.

**Nợ nhỏ ghi nhận:** `print-orders-block.tsx` prop `remainingAmount` giờ không còn dùng (chỉ phục vụ modal đã xoá) — để nguyên trong `Props`/destructure vì `@typescript-eslint/no-unused-vars` đang tắt (không lỗi lint/build) và xoá hẳn sẽ phải sửa cả `contract-detail-client.tsx` (ngoài locks). Dọn khi có task khác chạm file đó.

**Còn lại cần user:** merge `claude/printing-workflow-redesign` → `main` + `git push origin main` (= deploy). Claude không tự push main cho task chạm production DB + tài chính.

## 14c. Follow-up cùng ngày — dropdown trạng thái không lọc (user phát hiện qua ảnh chụp)

User hỏi trực tiếp "mấy cái trạng thái này chuẩn chưa" kèm ảnh dropdown hiện cả `Hoàn thành` (nhảy cóc từ `dang_in`) lẫn 2 giá trị legacy `Đã nhận`/`Đã hủy`. Trace: `SelectStatus` (component dùng chung, `components/ui/select/SelectStatus.tsx`) render nguyên `options` được truyền vào, không tự lọc theo trạng thái hiện tại — 3 nơi gọi (`print-orders-block.tsx`, `printing-card.tsx`, `printing-table.tsx`) đều truyền thẳng `[...PRINT_ORDER_STATUS_OPTIONS]` (toàn bộ 8 giá trị). Hành vi này **có từ trước** (không phải do task này gây ra), nhưng bug rõ hơn hẳn sau khi rút gọn danh sách còn 8 mục (trước là 10, giữa các mục hoạt động nên ít nổi bật) — và trực tiếp mâu thuẫn với comment chính mình viết ("da_nhan/da_huy — chỉ để đọc dữ liệu cũ, không còn ghi mới").

**Sửa (cùng branch/commit tiếp theo, không mở task riêng — quy mô nhỏ, additive):**
- `types/printing-constants.ts`: thêm `PRINTING_VALID_TRANSITIONS` — **nguồn chân lý duy nhất**, tránh lặp lại đúng lớp bug lệch từ vựng đã sửa.
- `app/actions/printing-mutations.ts`: xoá `VALID_TRANSITIONS` cục bộ, import từ constants.
- `components/ui/status-select.tsx`: thêm `selectablePrintOrderStatusOptions(current)` — lọc `PRINT_ORDER_STATUS_OPTIONS` còn `{current} ∪ VALID_TRANSITIONS[current]`.
- 3 call site đổi `options={[...PRINT_ORDER_STATUS_OPTIONS]}` → `options={selectablePrintOrderStatusOptions(order.status)}`.

**Verify:** eslint 0 lỗi/0 warning · build exit 0 · render thật xác nhận dropdown đơn `dang_in` chỉ còn đúng 4 mục `["Đang in" (hiện tại), "Đã in — bên lab", "Gặp sự cố", "Hủy đơn"]` — hết "Hoàn thành" (nhảy cóc), hết 2 legacy. Render trên **production** (`stu.moodwedding.com`) sau deploy — không chỉ local.

## 14d. Follow-up thứ 2 cùng ngày — 2 chấm màu trạng thái vô hình (user hỏi lại "chắc chưa" kèm ảnh)

User hỏi lại lần nữa sau khi thấy dropdown đã lọc đúng — soi kỹ ảnh phát hiện dòng "Đã in — bên lab" **không có chấm tròn màu** như 3 dòng còn lại. Trace: `color: "var(--color-status-primary)"` (cho `da_in`) và `color: "var(--color-status-warning)"` (cho `cho_xu_ly`) trong `PRINT_ORDER_STATUS_OPTIONS` — **cả hai token đều chưa từng được định nghĩa** trong `app/globals.css` (chỉ có `--color-status-pending/info/printed/success/error`). CSS var không tồn tại + không có fallback → khai báo `background` bị bỏ qua → chấm tròn trong suốt.

**Xác nhận đây là bug có từ trước task này** — đọc lại bản gốc (trước khi Claude sửa hôm nay) thấy `da_in` đã dùng `--color-status-primary` từ Migration 2026-05-26, chỉ đổi *label* hôm nay ("Đã in" → "Đã in — bên lab"), giữ nguyên màu hỏng cũ. Không phải lỗi do redesign gây ra, nhưng nằm ngay trong mảng đang sửa nên vá luôn thay vì báo riêng.

**Sửa** (`components/ui/status-select.tsx`, không đụng CSS — dùng lại token có sẵn thay vì bịa mới):
- `cho_xu_ly`: `--color-status-warning` → `--color-status-pending` (đã định nghĩa, cam, đúng nghĩa "chờ").
- `da_in`: `--color-status-primary` → `--color-status-printed` (đã định nghĩa #9b59b6 tím, **trước đó không nơi nào dùng** — rất có thể chính là token dự định ban đầu cho "đã in"/"printed").

**Đối chiếu hệ màu song song `PRINTING_STATUS_VARIANTS`** (dùng cho `<Badge>`, cũng do Claude sửa hôm nay): kiểm `BadgeVariant` type (`components/ui/badge.tsx`) — `"warning"`/`"primary"` là variant **có thật**, có class Tailwind tương ứng, được TS ràng buộc kiểu → không dính lỗi tương tự. Chỉ chuỗi CSS var tự do (không gõ kiểu) mới lọt lỗi này qua build.

**Verify:** eslint 0 lỗi · build exit 0 · render thật (local, không phải production lần này — chỉ đổi CSS token, rủi ro thấp) — chấm tròn "Đã in — bên lab" hiện đúng màu tím, ảnh xác nhận với user.

## 14e. Follow-up thứ 3 cùng ngày — thanh "Tiến độ in ấn" tính sai đơn `da_in` là "đã xong"

User hỏi mở: *"thanh báo tiến độ bên in ấn UI tổng thể bên /printing bạn thấy đã thật sự tối ưu chưa?"* — không chỉ tay vào chỗ cụ thể, phải tự rà lại toàn trang.

**Tìm ra:** `isPendingPrintStatus()` (`types/printing-constants.ts`) — hàm quyết định 1 đơn có tính là "chưa xong" (nên bị đếm vào "chưa xong"/cờ "trễ") — chỉ coi `cho_xu_ly`/`dang_in`/`gap_su_co` là "pending". Thiếu `da_in` — mà theo đúng chốt của user hôm nay, `da_in` = **"lab đã in xong nhưng hình VẪN Ở BÊN LAB"**, tức **CHƯA xong** theo nghĩa Mood. 3 nơi dùng chung hàm này (`lib/utils/printing-group-utils.ts`, `printing-table.tsx`, `printing-card.tsx`) đều bị ảnh hưởng: đơn `da_in` bị đếm nhầm vào "xong" (thanh tiến độ xanh 100%), **không được xét cờ "trễ"**, và ngày dự kiến bị ẩn (hiện "—").

**Đo được trên dữ liệu thật trước khi sửa:** cả **5/5 đơn `da_in`** đang hoạt động đều đã quá hạn `expected_date` — có đơn trễ tới **3 tháng** (`IN-260526-00009`, hẹn 24/05, hôm nay 24/08) — nhưng UI hiện xanh "1/1 xong", không cảnh báo gì. Bug có từ trước (hàm này Claude chỉ bớt `dat_coc` hôm nay, không đụng phần còn lại), nhưng mâu thuẫn trực tiếp với chính định nghĩa `da_in` vừa chốt trong task này nên vá luôn.

**Sửa** (`types/printing-constants.ts`, 1 dòng): thêm `da_in` vào `isPendingPrintStatus`.

**Verify:** eslint 0 lỗi · build exit 0 · render thật (local) — đối chiếu ảnh chụp `/printing` với DB: 3/5 đơn `da_in` thật xuất hiện trên trang 1 (`HĐ-2026-0021`, `HĐ-2026-0017`, `HĐ-2026-0016`) đều hiện đúng **"0/1 xong" + "⚠ 1 trễ" + ngày dự kiến thật** — trước đây sẽ sai thành "1/1 xong" xanh, không cảnh báo, ngày ẩn.

**Ngoài phạm vi, ghi nhận:** đơn `huy_don` (hủy) hiện vẫn bị tính vào "đã xong" trong `completedCount` (không phải pending, không phải "xong" thật — model hiện tại chỉ nhị phân pending/completed, không có nhánh "đã hủy" riêng). Chưa ảnh hưởng thật vì hiện **0 đơn `huy_don`** đang hoạt động — nếu phát sinh đơn hủy trong tương lai, cần task riêng để tách 3 nhánh (pending / hoàn thành / hủy) thay vì nhị phân.

## 14. Ngoài phạm vi (ghi nhận, không làm trong task này)

- `printing_stats()` hiện không track `gap_su_co` (trạng thái này tồn tại trong `VALID_TRANSITIONS` nhưng không có cột riêng trong RPC thống kê) — gap có sẵn từ trước, không phải do redesign này gây ra, không sửa cùng lúc.
- Badge "còn nợ lab" chính xác theo từng đơn (mục 10) — có thể tách task riêng nếu phức tạp hơn dự kiến.
- Không đổi `record_lab_payment_atomic`, `finance_lab_debt_summary`, `printing_lab_overview`, `printing_integrity_report`, `upsert_printing_expense`, `create_printing_order_atomic` — đã đúng, đã atomic, không chạm.
