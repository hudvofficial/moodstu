# Plan: Nâng cấp khối In ấn (PrintOrdersBlock) trong Chi tiết Hợp đồng

> **Trạng thái:** Đã verify với codebase (2026-06-15). Plan này executable — Claw code thẳng theo từng task, không cần điều tra lại.
> **Mục tiêu:** Biến khối "In ấn" trong contract detail từ list tóm tắt → Production Card: hiện sản phẩm + tổng tiền, "Copy gửi Lab", cảnh báo công nợ **khách** khi giao, link file in (cột DB mới), **badge công nợ lab read-only**, và **chặn các bước đổi-kho/thanh-toán-lab → route sang `/printing`**.

---

## 0. Sự thật đã verify — ĐỪNG điều tra lại

| Điều | Bằng chứng |
| :--- | :--- |
| Block hiện chỉ show `order_code` / lab / `expected_date` / status — không có items, không có total | [print-orders-block.tsx:149-178](components/contracts/detail/print-orders-block.tsx:149) |
| `items` là **cột JSONB** trên `printing_orders` (KHÔNG phải bảng con) | [database.types.ts:3462](types/database.types.ts:3462) |
| Shape item = `PrintingItem { item_id?, name, quantity, unitPrice }` — đã có sẵn, **dùng `unitPrice` (camelCase)** | [types/printing.ts:7](types/printing.ts:7) |
| `total_amount` **đã** nằm trong SELECT lẫn type `PrintingOrder` → chỉ thiếu hiển thị | [contract-queries.ts:614](app/actions/contract-queries.ts:614) · [contract.ts:281](types/contract.ts:281) |
| `da_giao` hiện đi thẳng, KHÔNG check công nợ; chỉ `gap_su_co`/`huy_don`/rollback mới bắt nhập lý do | [print-orders-block.tsx:36](components/contracts/detail/print-orders-block.tsx:36) |
| Đã có sẵn cơ chế chặn-status + modal (`pendingChange` + `UnifiedModal`) để tái dùng | [print-orders-block.tsx:40-100](components/contracts/detail/print-orders-block.tsx:40), [:185](components/contracts/detail/print-orders-block.tsx:185) |
| `remaining_amount` có trên `Contract`; tên khách = `customers.full_name` | [contract.ts:87](types/contract.ts:87) · [crm.ts:61](types/crm.ts:61) |
| Block render ở parent tại **2 call site** (Desktop + Mobile) | [detail-layout-sections.tsx:170](components/contracts/detail/detail-layout-sections.tsx:170), [:365](components/contracts/detail/detail-layout-sections.tsx:365) |
| Create/update đơn in đi qua **atomic RPC** + Zod schema; nhưng `updatePrintingOrderStatus` dùng plain `.update()` | [printing-mutations.ts:64](app/actions/printing-mutations.ts:64), [:115](app/actions/printing-mutations.ts:115), [:222](app/actions/printing-mutations.ts:222) |
| `printing_orders` **không có** cột url/file nào | [database.types.ts:3454-3472](types/database.types.ts:3454) |
| `payment_status` = studio đã trả tiền in cho **Lab** (vì item `unitPrice` = lab `cost_price`); DB `unpaid`/`partial`/`paid` | [printing-order-form.tsx:109](components/contracts/detail/printing-order-form.tsx:109) · [printing-constants.ts:27](types/printing-constants.ts:27) |
| Dropdown gọi `updatePrintingOrderStatus` = **chỉ đổi status + ghi history**, KHÔNG giữ/trừ kho, KHÔNG ghi TT lab | [printing-mutations.ts:147-261](app/actions/printing-mutations.ts:147) |
| Nghiệp vụ kho/tiền lab đúng ở workflow mutations: `startProduction` (giữ kho) · `completeProduction` (trừ kho) · `recordDeposit/Final` (TT lab) · `cancelOrder` (hoàn+nhả) | [printing-workflow-mutations.ts:156](app/actions/printing-workflow-mutations.ts:156), [:278](app/actions/printing-workflow-mutations.ts:278) |
| `VALID_TRANSITIONS` cho dropdown đi gần hết lifecycle → có thể đẩy đơn bỏ qua kho/tiền | [printing-mutations.ts:19-33](app/actions/printing-mutations.ts:19) |
| `/printing` KHÔNG deep-link 1 đơn (list + drawer client-state, không đọc searchParams) | [printing/page.tsx](app/(protected)/printing/page.tsx) |
| `inventory_status` được workflow ghi vào `printing_orders` NHƯNG thiếu trong `database.types.ts` (types stale) | [printing-workflow-mutations.ts:235](app/actions/printing-workflow-mutations.ts:235) |

---

## 1. KHÔNG được làm (guardrails)

1. **KHÔNG** định nghĩa lại type item — import `PrintingItem` từ `@/types/printing` (SSOT).
2. **KHÔNG** tự tính tổng `quantity*unitPrice` ở client để hiển thị — dùng thẳng `order.total_amount` (server/RPC là nguồn đúng; xem ràng buộc CLAUDE.md "không patch giá trị server tính lại").
3. **KHÔNG** sửa `create_printing_order_atomic` / `update_printing_order_atomic` / `printing.schema.ts` / `printing-order-form.tsx` cho việc thêm link file (xem Task 2.5 — đi đường nhẹ).
4. **KHÔNG** wire workflow mutations (`startProduction` / `completeProduction` / `recordDepositPayment`…) vào card. Các bước có side-effect (cọc/giữ-trừ kho/tất toán/hủy) → **route sang `/printing`** (Task 2.7). Card chỉ tự làm `da_giao` + `gap_su_co`.
5. Badge công nợ lab / tồn kho là **read-only** trong card — sửa thanh toán/kho ở `/printing`.
6. **KHÔNG** "dọn" code lân cận. Chỉ động đúng phần task yêu cầu.

---

## 2. GIAI ĐOẠN 1 — Hiện sản phẩm + tổng tiền

### Task 1.1 — Thêm `items` vào SELECT
**File:** [app/actions/contract-queries.ts:614](app/actions/contract-queries.ts:614)
Thêm `items` **và `payment_status`** vào chuỗi select của `printing_orders` (giữ nguyên phần còn lại):
```ts
.select(
  `id, order_code, status, payment_status, total_amount, items, order_date, expected_date, received_date, notes, labs (id, name:lab_name)`
)
```
> `payment_status` (DB: unpaid/partial/paid) cần cho **badge công nợ lab** (Task 2.6) — type `PrintingOrder` đã có sẵn field này ([contract.ts:280](types/contract.ts:280)) nên KHÔNG cần đổi type cho nó. Bonus: vá luôn dead-path của badge cũ ([print-orders-block.tsx:154](components/contracts/detail/print-orders-block.tsx:154)).

### Task 1.2 — Thêm `items` vào type `PrintingOrder`
**File:** [types/contract.ts](types/contract.ts)
- Thêm import (cạnh `import type { Customer } from "./crm";` ~dòng 10):
```ts
import type { PrintingItem } from "./printing";
```
- Trong `interface PrintingOrder` ([:276](types/contract.ts:276)), thêm field (sau `total_amount`):
```ts
  items: PrintingItem[] | null;
```
> Không có circular import: `types/printing.ts` chỉ import từ `./printing-constants`.

### Task 1.3 — Render danh sách sản phẩm + tổng tiền
**File:** [print-orders-block.tsx](components/contracts/detail/print-orders-block.tsx)
- Thêm state collapse (sau dòng 49, cạnh các `useState` khác):
```tsx
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const toggleExpanded = (id: string) =>
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
```
- Trong card mỗi order, **chèn ngay sau** block lab/date (sau `</div>` đóng dòng [:178](components/contracts/detail/print-orders-block.tsx:178), trước `</div>` đóng card [:179](components/contracts/detail/print-orders-block.tsx:179)):
```tsx
                {order.items && order.items.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {(expandedOrders.has(order.id) ? order.items : order.items.slice(0, 3)).map((item, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 text-caption">
                        <span className="text-text-primary truncate">
                          {item.name} <span className="text-text-muted">×{item.quantity}</span>
                        </span>
                        <span className="text-text-muted tabular-nums shrink-0">
                          {new Intl.NumberFormat("vi-VN").format((item.quantity || 0) * (item.unitPrice || 0))}đ
                        </span>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(order.id)}
                        className="text-micro text-interactive hover:underline"
                      >
                        {expandedOrders.has(order.id) ? "Thu gọn" : `Xem thêm ${order.items.length - 3} mục`}
                      </button>
                    )}
                  </div>
                )}
                {typeof order.total_amount === "number" && order.total_amount > 0 && (
                  <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-1.5">
                    <span className="text-micro text-text-muted uppercase tracking-wide">Tổng</span>
                    <span className="text-body-sm font-bold text-text-primary tabular-nums">
                      {new Intl.NumberFormat("vi-VN").format(order.total_amount)}đ
                    </span>
                  </div>
                )}
```
> Dùng đúng token có sẵn trong file: `text-text-primary`, `text-text-muted`, `text-interactive`, `border-border`.

### ✅ Verify Giai đoạn 1
- `npm run build` pass (TS không lỗi type `items`).
- Render contract detail có đơn in nhiều sản phẩm → thấy list + nút "Xem thêm" + dòng Tổng. Đơn 0 sản phẩm → không vỡ layout.
- Responsive @768px + @1023px OK (3-tier).

---

## 3. GIAI ĐOẠN 2 — Copy gửi Lab + cảnh báo công nợ + link file

### Task 2.1 — Mở rộng Props của PrintOrdersBlock
**File:** [print-orders-block.tsx:21-26](components/contracts/detail/print-orders-block.tsx:21)
```tsx
interface Props {
  orders: PrintingOrder[];
  contractId: string;
  customerName?: string;
  contractCode?: string;
  remainingAmount?: number;
  onStatusChange?: () => void;
  onAdd?: () => void;
}
```
Và destructure thêm `customerName, contractCode, remainingAmount` ở [:46](components/contracts/detail/print-orders-block.tsx:46).

### Task 2.2 — Truyền props ở parent (2 call site)
**File:** [detail-layout-sections.tsx](components/contracts/detail/detail-layout-sections.tsx) — sửa **cả** Desktop ([:170](components/contracts/detail/detail-layout-sections.tsx:170)) lẫn Mobile ([:365](components/contracts/detail/detail-layout-sections.tsx:365)):
```tsx
          <PrintOrdersBlock
            orders={printOrders}
            contractId={contract.id}
            customerName={contract.customers?.full_name}
            contractCode={contract.contract_code}
            remainingAmount={contract.remaining_amount}
            onStatusChange={onMuteRealtime}
            onAdd={() => onQuickAction("print")}
          />
```
> Verify nhanh: `contract.contract_code` là field trên type `Contract` (grep `contract_code` trong [types/contract.ts](types/contract.ts) nếu cần).

### Task 2.3 — Nút "Copy gửi Lab"
**File:** [print-orders-block.tsx](components/contracts/detail/print-orders-block.tsx)
- Thêm `Copy` vào import lucide ([:4](components/contracts/detail/print-orders-block.tsx:4)): `import { Printer, Calendar, Plus, Copy } from "lucide-react";`
- Thêm helper (ngoài component, cạnh `requiresReason` ~[:38](components/contracts/detail/print-orders-block.tsx:38)):
```tsx
function buildLabMessage(order: PrintingOrder, customerName?: string, contractCode?: string): string {
  const lines: string[] = [];
  lines.push(`📋 ĐƠN IN: ${order.order_code || "—"}`);
  if (contractCode) lines.push(`HĐ: ${contractCode}`);
  if (customerName) lines.push(`Khách: ${customerName}`);
  if (order.labs?.name) lines.push(`Lab: ${order.labs.name}`);
  lines.push("", "SẢN PHẨM:");
  (order.items || []).forEach((it, i) => lines.push(`${i + 1}. ${it.name} — SL: ${it.quantity}`));
  if (order.print_file_url) lines.push("", `File in: ${order.print_file_url}`);
  if (order.expected_date) lines.push(`Hẹn: ${order.expected_date}`);
  if (order.notes) lines.push(`Note: ${order.notes}`);
  return lines.join("\n");
}
```
- Thêm handler trong component (cạnh các handler khác):
```tsx
  const handleCopyForLab = async (order: PrintingOrder) => {
    try {
      await navigator.clipboard.writeText(buildLabMessage(order, customerName, contractCode));
      toast("Đã copy thông tin gửi Lab", "success");
    } catch {
      toast("Không thể copy, thử lại", "error");
    }
  };
```
- Thêm nút cạnh `order_code` ([:150-159](components/contracts/detail/print-orders-block.tsx:150)) — bọc tên đơn + nút trong 1 flex:
```tsx
                  <div className="min-w-0 flex items-center gap-1.5">
                    <p className="text-body-sm font-semibold text-text-primary truncate">
                      {order.order_code || "Đơn in"}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleCopyForLab(order)}
                      className="shrink-0 text-text-muted hover:text-interactive"
                      aria-label="Copy gửi Lab"
                      title="Copy gửi Lab"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
```
(Badge "Đã cọc" giữ nguyên bên dưới.)

### Task 2.4 — Cảnh báo công nợ khi chuyển `da_giao`
**File:** [print-orders-block.tsx](components/contracts/detail/print-orders-block.tsx)
- Thêm state (cạnh `pendingChange`):
```tsx
  const [deliveryWarning, setDeliveryWarning] = useState<{ orderId: string; previous: string } | null>(null);
```
- Trong `handleStatusUpdate` ([:75](components/contracts/detail/print-orders-block.tsx:75)), chèn check **ngay sau** dòng `if (!previous || previous === newStatus) return;`:
```tsx
    if (newStatus === "da_giao" && (remainingAmount ?? 0) > 0) {
      setDeliveryWarning({ orderId, previous });
      return;
    }
```
- Handler confirm:
```tsx
  const confirmDelivery = async () => {
    if (!deliveryWarning) return;
    const { orderId, previous } = deliveryWarning;
    setDeliveryWarning(null);
    await applyStatusUpdate(orderId, "da_giao", previous);
  };
```
- Thêm modal (cạnh `UnifiedModal` của pendingChange [:185](components/contracts/detail/print-orders-block.tsx:185)):
```tsx
      <UnifiedModal
        isOpen={!!deliveryWarning}
        onClose={() => setDeliveryWarning(null)}
        title="⚠️ Hợp đồng chưa thanh toán đủ"
        description={`Khách còn nợ ${new Intl.NumberFormat("vi-VN").format(remainingAmount ?? 0)}đ. Vẫn xác nhận đã giao sản phẩm?`}
        size="md"
        footer={(
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setDeliveryWarning(null)}>Hủy</Button>
            <Button type="button" onClick={confirmDelivery}>Vẫn giao</Button>
          </div>
        )}
      >
        <p className="text-body-sm text-text-muted">Kiểm tra lại công nợ trước khi bàn giao cho khách.</p>
      </UnifiedModal>
```
> Cảnh báo (không chặn cứng) — đúng yêu cầu. `da_giao` là forward move nên không đụng `requiresReason`; đặt check ở đầu hàm là đủ.

### Task 2.5 — Cột `print_file_url` trong DB (đường nhẹ, KHÔNG đụng RPC)

> **Quyết định scope (anh đã chốt "thêm cột file vào DB"):** thêm cột thật, nhưng GHI qua action nhẹ `.update()` + sửa link **inline trên card** (vì link file thường thêm lúc gần giao, không phải lúc tạo đơn). Né được việc sửa 2 hàm Postgres atomic + Zod + form tạo. *Alternative nặng (nếu sau này muốn nhập link ngay lúc tạo): thêm param vào `create/update_printing_order_atomic` + `printing.schema.ts` + `printing-order-form.tsx` + drawer `/printing` — KHÔNG làm trong đợt này.*

**2.5a — Migration.** Tạo `supabase/migrations/20260615130000_add_print_file_url_to_printing_orders.sql`:
```sql
ALTER TABLE printing_orders ADD COLUMN IF NOT EXISTS print_file_url text;
```
Apply: `npm run migrate:latest 20260615130000_add_print_file_url_to_printing_orders.sql` (PHẢI truyền tên file — script no-arg chạy file cũ hardcoded). Verify bằng `pg_columns`/`information_schema`, đừng tin success message.

**2.5b — database.types.ts.** Thêm `print_file_url: string | null` vào `Row`, và `print_file_url?: string | null` vào `Insert` + `Update` của `printing_orders` ([database.types.ts:3454-3493](types/database.types.ts:3454)). (Sửa tay vì CLI chưa auth để regen.)

**2.5c — SELECT.** Thêm `print_file_url` vào chuỗi select Task 1.1 ([contract-queries.ts:614](app/actions/contract-queries.ts:614)).

**2.5d — type `PrintingOrder`.** Thêm `print_file_url: string | null;` ([contract.ts:276](types/contract.ts:276)).

**2.5e — Action ghi nhẹ.** Trong [app/actions/printing-actions.ts](app/actions/printing-actions.ts) — file mà block đã import `updatePrintOrderStatus` — thêm action mới, **copy y hệt wrapper access/return của `updatePrintOrderStatus` trong file đó** (cùng client + `ActionResult` shape), chỉ đổi phần update:
```ts
export async function updatePrintOrderFileUrl(orderId: string, fileUrl: string | null, contractId: string) {
  // ... mở wrapper giống updatePrintOrderStatus trong file này ...
  const { error } = await supabase
    .from("printing_orders")
    .update({ print_file_url: fileUrl?.trim() || null })
    .eq("id", orderId);
  if (error) return { success: false, error: error.message };
  // ... revalidate giống updatePrintOrderStatus (invalidateContractAfterWrite / revalidatePath) ...
  return { success: true };
}
```

**2.5f — Sửa link inline trên card** ([print-orders-block.tsx](components/contracts/detail/print-orders-block.tsx)):
- Import: thêm `Link2` (lucide) và `Input` (`@/components/ui/input`); import `updatePrintOrderFileUrl` từ `@/app/actions/printing-actions`.
- State: `const [editingFile, setEditingFile] = useState<string | null>(null);` + `const [fileInput, setFileInput] = useState("");`
- Handler:
```tsx
  const saveFileUrl = async (orderId: string) => {
    const url = fileInput.trim() || null;
    setLocalOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, print_file_url: url } : o)));
    setEditingFile(null);
    const result = await updatePrintOrderFileUrl(orderId, url, contractId);
    if (!result.success) toast(result.error || "Lỗi lưu link", "error");
  };
```
- UI trong card (sau khối Tổng): nếu có `order.print_file_url` → hiện link mở tab mới + nút sửa; nếu không → nút "Thêm link file"; khi `editingFile === order.id` → `Input` + nút Lưu/Hủy. (Match style card hiện tại; optimistic update đã có ở handler.)

### Task 2.6 — Badge công nợ lab (read-only)
> `payment_status` = studio đã trả tiền in cho **Lab** chưa (vì `total_amount` = tổng `cost_price` lab). DB: `unpaid`/`partial`/`paid`. Đã fetch ở Task 1.1.

**File:** [print-orders-block.tsx](components/contracts/detail/print-orders-block.tsx)
- Helper (module scope, cạnh `requiresReason`):
```tsx
function labPaymentBadge(paymentStatus?: string | null): { label: string; variant: "success" | "warning" } {
  switch (paymentStatus) {
    case "paid": return { label: "Đã TT lab", variant: "success" };
    case "partial": return { label: "TT lab 1 phần", variant: "warning" };
    default: return { label: "Chưa TT lab", variant: "warning" };
  }
}
```
- Đầu callback `.map` ([:143](components/contracts/detail/print-orders-block.tsx:143)) tính: `const labPay = labPaymentBadge(order.payment_status);`
- **Thay** nguyên khối badge "Đã cọc" hiện tại ([print-orders-block.tsx:154-158](components/contracts/detail/print-orders-block.tsx:154)) bằng:
```tsx
                    <Badge variant={labPay.variant} className="mt-1 text-micro">
                      {labPay.label}
                    </Badge>
```
> Read-only — KHÔNG cho sửa thanh toán trong card (sửa ở `/printing`).
> *(Optional, hoãn v1: badge tồn kho từ `inventory_status` — cột này workflow ghi vào `printing_orders` nhưng KHÔNG có trong `database.types.ts`; PHẢI verify cột tồn tại trong DB rồi mới thêm vào Row + select, nếu chưa có thì bỏ badge kho.)*

### Task 2.7 — Chặn bước có side-effect → route sang `/printing`
> Dropdown gọi `updatePrintingOrderStatus` chỉ đổi status, KHÔNG giữ/trừ kho, KHÔNG ghi TT lab. Các bước `dat_coc`/`dang_in`/`da_in`/`hoan_thanh`/`huy_don` có side-effect → làm ở `/printing` qua workflow mutations. Chỉ `da_giao` (giao — thuần status) + `gap_su_co` (cờ sự cố) an toàn làm trong card.

**File:** [print-orders-block.tsx](components/contracts/detail/print-orders-block.tsx)
- Import: `import Link from "next/link";`
- Module scope:
```tsx
const SIDE_EFFECT_STATUSES = new Set(["dat_coc", "dang_in", "da_in", "hoan_thanh", "huy_don"]);
```
- State: `const [routeNotice, setRouteNotice] = useState<string | null>(null);`
- Trong `handleStatusUpdate` ([:75](components/contracts/detail/print-orders-block.tsx:75)), chèn **ngay sau** `if (!previous || previous === newStatus) return;` và **trước** check `da_giao` (Task 2.4):
```tsx
    if (SIDE_EFFECT_STATUSES.has(newStatus)) {
      setRouteNotice(newStatus);
      return;
    }
```
- Modal (cạnh các `UnifiedModal` khác):
```tsx
      <UnifiedModal
        isOpen={!!routeNotice}
        onClose={() => setRouteNotice(null)}
        title="Cần xử lý ở trang In ấn"
        description="Bước này cập nhật tồn kho và thanh toán Lab — cần thực hiện ở trang In ấn để chạy đúng nghiệp vụ (giữ/trừ kho, ghi nhận thanh toán)."
        size="md"
        footer={(
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setRouteNotice(null)}>Đóng</Button>
            <Link href="/printing" onClick={() => setRouteNotice(null)}>
              <Button type="button">Mở trang In ấn</Button>
            </Link>
          </div>
        )}
      >
        <p className="text-body-sm text-text-muted">Tìm mã đơn ở danh sách In ấn để mở và xử lý.</p>
      </UnifiedModal>
```
> **Hệ quả có chủ đích:** `huy_don` cũng route sang `/printing` (vì `cancelOrder` có hoàn cọc + nhả kho) — KHÁC behavior cũ (trước xử lý in-card kèm lý do). Đúng quyết định "bước side-effect → /printing".
> `/printing` chưa deep-link 1 đơn → v1 link thẳng `/printing`. *(Optional sau: `?search=<order_code>` + cho [printing-list-page.tsx](components/printing/printing-list-page.tsx) đọc URL.)*

### ✅ Verify Giai đoạn 2
- Migration applied (verify bằng query cột thật).
- `npm run build` pass.
- Copy gửi Lab → paste ra đúng format (mã/khách/SP/hẹn/note + link nếu có).
- Badge công nợ lab đúng theo `payment_status` (paid→Đã TT lab · partial→TT 1 phần · unpaid→Chưa TT lab).
- Chọn `dat_coc`/`dang_in`/`da_in`/`hoan_thanh`/`huy_don` từ dropdown → hiện modal route, KHÔNG đổi status; chọn `da_giao`/`gap_su_co` → chạy như cũ.
- Đổi status sang `da_giao` khi `remaining_amount > 0` → modal cảnh báo hiện, "Vẫn giao" mới apply; khi đã trả đủ → không hiện modal.
- Thêm/sửa link file → reload thấy giữ; Network thấy 1 update gọn.
- Responsive @768/@1023.

---

## 4. Thứ tự thực thi & gate
1. GĐ1 (Task 1.1→1.3) → **verify GĐ1** (build + render).
2. GĐ2 không-DB (Task 2.1→2.4) → verify copy + cảnh báo.
3. GĐ2 DB (Task 2.5a→2.5f) → verify migration + link file.
4. **Gate trước deploy:** build pass + render OK @768/@1023 → **deploy = `git push origin main`** (KHÔNG `vercel --prod`).

## 5. Danh sách file (đã chuẩn so với report gốc)
| File | Task |
| :--- | :--- |
| `app/actions/contract-queries.ts` | 1.1, 2.5c — select `items` + `payment_status` (+`print_file_url`) |
| `types/contract.ts` | 1.2, 2.5d — `items` + `print_file_url` |
| `components/contracts/detail/print-orders-block.tsx` | 1.3, 2.1, 2.3, 2.4, 2.5f, **2.6, 2.7** — UI + copy + cảnh báo + link + badge nợ lab + route /printing |
| `components/contracts/detail/detail-layout-sections.tsx` | **2.2 — (report gốc THIẾU)** truyền props, 2 call site |
| `supabase/migrations/2026061513..._add_print_file_url...sql` | 2.5a — cột mới |
| `types/database.types.ts` | 2.5b — Row/Insert/Update |
| `app/actions/printing-actions.ts` | 2.5e — action ghi nhẹ |
