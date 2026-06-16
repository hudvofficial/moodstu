# plan.md — Hoàn thiện Production Card (In ấn) trong Contract Detail

> **Dành cho Claw multi-agent (code + review).** Plan này self-contained — không cần đọc lại lịch sử chat.
> **Bối cảnh:** Claw đã code xong **tầng dữ liệu** nhưng **tầng UI chưa làm** + **không build được** + **RPC mặc định (v2) bị bug cột**. Plan này xử lý phần còn lại.

---

## ⚡ TL;DR điều phối
- **WP-A** (fix RPC v2) ∥ **WP-B** (UI block) chạy **song song** (khác file).
- **WP-B** vừa làm feature, vừa **vá lỗi build hiện tại** (parent đang truyền props mà block chưa khai báo).
- **WP-C** (apply + verify migration) sau khi A xong.
- **Gate cuối**: build + lint + render @768/@1023.

---

## 0. Trạng thái hiện tại

### ✅ ĐÃ XONG — chỉ VERIFY, KHÔNG làm lại
| Hạng mục | File | Ghi chú |
| :--- | :--- | :--- |
| Inline query select `items`/`payment_status`/`print_file_url` + chuẩn hoá `unit_price`→`unitPrice` | [contract-queries.ts:614](app/actions/contract-queries.ts:614) + parsedPrintOrders | OK |
| Type `PrintingOrder` thêm `items`/`print_file_url`, import `PrintingItem` (SSOT) | [types/contract.ts:283](types/contract.ts:283) | OK |
| `database.types.ts` thêm `print_file_url` (Row/Insert/Update) | [database.types.ts:3473](types/database.types.ts:3473) | OK |
| **RPC v3** (items/print_file_url/labs `{id,name}`) | [migration 140000:138-152](supabase/migrations/20260615140000_fix_contract_detail_v3_rpc_printing.sql) | **Đúng** |
| Action ghi nhẹ `updatePrintOrderFileUrl` (validate http/https, scope `contract_id`, invalidate) | [printing-actions.ts](app/actions/printing-actions.ts) | OK (tốt hơn plan gốc) |
| Parent truyền `customerName`/`contractCode`/`remainingAmount` (2 call site) | [detail-layout-sections.tsx:170](components/contracts/detail/detail-layout-sections.tsx:170), [:370](components/contracts/detail/detail-layout-sections.tsx:370) | OK — chờ WP-B nhận props |
| Migration cột `print_file_url` | [migration 130000](supabase/migrations/20260615130000_add_print_file_url_to_printing_orders.sql) | `ADD COLUMN IF NOT EXISTS` OK |

### ❌ CÒN LẠI / LỖI phải xử lý (nội dung plan này)
1. **🔴 Build vỡ + feature trống:** `print-orders-block.tsx` **chưa động tới** → parent truyền 3 props block không khai báo (lỗi type), và toàn bộ UI (items/tổng/copy/cảnh báo/badge lab/link file/route) chưa có. → **WP-B**.
2. **🔴 RPC v2 (mặc định) bug cột `labs`:** trả `jsonb_build_object('id', l.id, 'lab_name', l.name)` nhưng bảng `labs` **không có cột `name`** (chỉ `lab_name`) → gọi v2 **lỗi SQL** → rơi fallback 8-query mỗi load. → **WP-A**.
3. **🟡 Verify migration đã apply lên DB chưa** (cột + RPC). → **WP-C**.

---

## 1. Sự thật đã verify (đừng điều tra lại)
| Điều | Bằng chứng |
| :--- | :--- |
| Bảng `labs` chỉ có cột `lab_name`, **không có `name`** | [database.types.ts:2967](types/database.types.ts:2967) |
| `getContractDetail` chọn RPC theo flag: `NEXT_PUBLIC_RPC_V3==="true"`→v3, **else v2 (default)**; RPC lỗi/null → fallback 8-query | [contract-queries.ts:486-523](app/actions/contract-queries.ts:486) |
| `payment_status` = studio đã trả tiền in cho **Lab** chưa; DB `unpaid`/`partial`/`paid` | [printing-constants.ts:27](types/printing-constants.ts:27) |
| Item shape = `PrintingItem { item_id?, name, quantity, unitPrice }` | [types/printing.ts:7](types/printing.ts:7) |
| `total_amount` server-authoritative (RPC tính) → **đừng** tự sum ở client để hiển thị tổng | [printing-mutations.ts:35-39](app/actions/printing-mutations.ts:35) |
| Dropdown gọi `updatePrintingOrderStatus` = chỉ đổi status, KHÔNG giữ/trừ kho/ghi TT lab; nghiệp vụ đúng ở workflow mutations (`startProduction`/`completeProduction`/`recordDeposit/Final`/`cancelOrder`) | [printing-mutations.ts:147](app/actions/printing-mutations.ts:147), [printing-workflow-mutations.ts:156](app/actions/printing-workflow-mutations.ts:156) |
| `/printing` KHÔNG deep-link 1 đơn (list + drawer client-state) | [printing/page.tsx](app/(protected)/printing/page.tsx) |
| `inventory_status` workflow ghi vào DB nhưng thiếu trong `database.types.ts` (types stale) | [printing-workflow-mutations.ts:235](app/actions/printing-workflow-mutations.ts:235) |

---

## 2. Guardrails (KHÔNG được làm)
1. **KHÔNG** sửa `create_printing_order_atomic` / `update_printing_order_atomic` / `printing.schema.ts` / `printing-order-form.tsx`.
2. **KHÔNG** wire workflow mutations vào card. Bước có side-effect (`dat_coc`/`dang_in`/`da_in`/`hoan_thanh`/`huy_don`) → **route sang `/printing`**. Card chỉ tự làm `da_giao` + `gap_su_co`.
3. Badge công nợ lab / tồn kho **read-only** trong card.
4. **KHÔNG** tự tính tổng để hiển thị — dùng `order.total_amount`.
5. Badge tồn kho từ `inventory_status` **HOÃN** (cột thiếu trong types) — KHÔNG thêm trong đợt này.
6. **KHÔNG** "dọn"/refactor code lân cận ngoài phạm vi task.

---

## 3. WP-A — Fix RPC v2 bug cột `labs` *(Coder+Reviewer · song song với WP-B)*

**File:** [supabase/migrations/20260615140000_fix_contract_detail_v3_rpc_printing.sql](supabase/migrations/20260615140000_fix_contract_detail_v3_rpc_printing.sql)

Trong block **v2** (`get_contract_detail_v2`, mục `-- 7) Printing orders`), sửa subquery `labs` cho khớp v3 + type frontend (`labs.name`):

**Tìm (sai):**
```sql
      'labs', (
        SELECT CASE WHEN l.id IS NOT NULL THEN
          jsonb_build_object(
            'id', l.id,
            'lab_name', l.name
          )
        ELSE NULL END
        FROM labs l
        WHERE l.id = po.lab_id
      )
```
**Thay bằng (đúng):**
```sql
      'labs', (
        SELECT CASE WHEN l.id IS NOT NULL THEN
          jsonb_build_object(
            'id', l.id,
            'name', l.lab_name
          )
        ELSE NULL END
        FROM labs l
        WHERE l.id = po.lab_id
      )
```

**⚠️ Nếu migration 140000 ĐÃ apply lên DB:** sửa file thôi không đủ (migration chạy 1 lần). Tạo migration mới `supabase/migrations/20260616100000_fix_v2_labs_name.sql` = copy nguyên `CREATE OR REPLACE FUNCTION public.get_contract_detail_v2(...)` từ 140000 (đã sửa dòng labs ở trên) — `CREATE OR REPLACE` idempotent, an toàn chạy lại.

**Acceptance / Review WP-A:**
- [ ] v2 trả `labs: { id, name }` (key `name`, từ cột `l.lab_name`) — khớp v3 + `PrintingOrder.labs`.
- [ ] Gọi `SELECT get_contract_detail_v2('<contract_uuid_thật>')` **không lỗi** và `print_orders[].labs.name` có giá trị.
- [ ] So định nghĩa v2 trong 140000 với v2 đang chạy prod (`SELECT pg_get_functiondef('get_contract_detail_v2'::regproc)`) — đảm bảo **không revert** field nào thêm sau 2026-05-27 (chỉ khác đúng labs + items/print_file_url).

---

## 4. WP-B — Implement `print-orders-block.tsx` *(Coder+Reviewer)*

> **1 file duy nhất → 1 coding agent sở hữu** (các sub-feature đụng cùng file, không chia agent song song). Hoàn thành WP-B **vá luôn lỗi build** (Props nhận đủ 3 prop parent truyền).

**File:** `components/contracts/detail/print-orders-block.tsx` — **thay toàn bộ** bằng nội dung dưới (giữ nguyên hành vi optimistic + modal lý do cũ, thêm: Props mới, badge công nợ lab read-only, list sản phẩm + tổng, copy gửi Lab, cảnh báo nợ khách khi `da_giao`, route bước side-effect → `/printing`, sửa link file inline).

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Printer, Calendar, Plus, Copy, Link2, ExternalLink, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { formatDate } from "@/lib/utils";
import type { PrintingOrder } from "@/types/contract";
import StatusSelect, { PRINT_ORDER_STATUS_OPTIONS } from "@/components/ui/status-select";
import { updatePrintOrderStatus, updatePrintOrderFileUrl } from "@/app/actions/printing-actions";
import { toast } from "@/lib/toast-utils";

// ═══════════════════════════════════════════
// PrintOrdersBlock — Production Card (In ấn)
// Read-mostly: sản phẩm/tổng/công nợ lab/link file + copy gửi Lab.
// Bước có side-effect (cọc/kho/tất toán/hủy) → route sang /printing.
// ═══════════════════════════════════════════

interface Props {
  orders: PrintingOrder[];
  contractId: string;
  customerName?: string;
  contractCode?: string;
  remainingAmount?: number;
  onStatusChange?: () => void;
  onAdd?: () => void;
}

const STATUS_ORDER = ["cho_xu_ly", "dat_coc", "dang_in", "da_in", "da_giao", "hoan_thanh"];

// Bước có tác dụng phụ (tồn kho / thanh toán lab) → phải xử lý ở /printing
const SIDE_EFFECT_STATUSES = new Set(["dat_coc", "dang_in", "da_in", "hoan_thanh", "huy_don"]);

function isRollback(from: string | null | undefined, to: string) {
  const fromIndex = STATUS_ORDER.indexOf(from || "cho_xu_ly");
  const toIndex = STATUS_ORDER.indexOf(to);
  return fromIndex >= 0 && toIndex >= 0 && toIndex < fromIndex;
}

function requiresReason(from: string | null | undefined, to: string) {
  // huy_don nay route sang /printing → chi con gap_su_co + rollback can ly do in-card
  return to === "gap_su_co" || isRollback(from, to);
}

function labPaymentBadge(paymentStatus?: string | null): { label: string; variant: "success" | "warning" } {
  switch (paymentStatus) {
    case "paid": return { label: "Đã TT lab", variant: "success" };
    case "partial": return { label: "TT lab 1 phần", variant: "warning" };
    default: return { label: "Chưa TT lab", variant: "warning" };
  }
}

function formatVnd(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n);
}

function buildLabMessage(order: PrintingOrder, customerName?: string, contractCode?: string): string {
  const lines: string[] = [];
  lines.push(`📋 ĐƠN IN: ${order.order_code || "—"}`);
  if (contractCode) lines.push(`HĐ: ${contractCode}`);
  if (customerName) lines.push(`Khách: ${customerName}`);
  if (order.labs?.name) lines.push(`Lab: ${order.labs.name}`);
  lines.push("", "SẢN PHẨM:");
  (order.items || []).forEach((it, i) => lines.push(`${i + 1}. ${it.name} — SL: ${it.quantity}`));
  if (order.print_file_url) lines.push("", `File in: ${order.print_file_url}`);
  if (order.expected_date) lines.push(`Hẹn: ${formatDate(order.expected_date)}`);
  if (order.notes) lines.push(`Note: ${order.notes}`);
  return lines.join("\n");
}

interface PendingStatusChange {
  orderId: string;
  previous: string;
  next: string;
}

export default function PrintOrdersBlock({
  orders,
  contractId,
  customerName,
  contractCode,
  remainingAmount,
  onStatusChange,
  onAdd,
}: Props) {
  const router = useRouter();
  const [localOrders, setLocalOrders] = useState(orders);
  const [pendingChange, setPendingChange] = useState<PendingStatusChange | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [deliveryWarning, setDeliveryWarning] = useState<{ orderId: string; previous: string } | null>(null);
  const [routeNotice, setRouteNotice] = useState<string | null>(null);
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [fileInput, setFileInput] = useState("");

  // Sync khi parent refresh (Realtime / số đơn đổi)
  if (orders !== localOrders && orders.length !== localOrders.length) {
    setLocalOrders(orders);
  }

  const toggleExpanded = (id: string) =>
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const applyStatusUpdate = async (orderId: string, newStatus: string, previous: string, reason?: string) => {
    setLocalOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
    onStatusChange?.();
    const result = await updatePrintOrderStatus(orderId, newStatus, contractId, reason);
    if (!result.success) {
      setLocalOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: previous } : o)));
      toast(result.error || "Lỗi cập nhật", "error");
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    const previous = localOrders.find((o) => o.id === orderId)?.status;
    if (!previous || previous === newStatus) return;

    // 1) Bước side-effect → mở /printing (giữ/trừ kho + thanh toán lab)
    if (SIDE_EFFECT_STATUSES.has(newStatus)) {
      setRouteNotice(newStatus);
      return;
    }

    // 2) Cảnh báo công nợ KHÁCH khi giao (không chặn cứng)
    if (newStatus === "da_giao" && (remainingAmount ?? 0) > 0) {
      setDeliveryWarning({ orderId, previous });
      return;
    }

    // 3) gap_su_co / rollback → cần lý do
    if (requiresReason(previous, newStatus)) {
      setPendingChange({ orderId, previous, next: newStatus });
      setStatusReason("");
      return;
    }

    await applyStatusUpdate(orderId, newStatus, previous);
  };

  const confirmPendingChange = async () => {
    if (!pendingChange) return;
    const reason = statusReason.trim();
    if (!reason) {
      toast("Vui lòng nhập lý do", "warning");
      return;
    }
    const change = pendingChange;
    setPendingChange(null);
    setStatusReason("");
    await applyStatusUpdate(change.orderId, change.next, change.previous, reason);
  };

  const confirmDelivery = async () => {
    if (!deliveryWarning) return;
    const { orderId, previous } = deliveryWarning;
    setDeliveryWarning(null);
    await applyStatusUpdate(orderId, "da_giao", previous);
  };

  const handleCopyForLab = async (order: PrintingOrder) => {
    try {
      await navigator.clipboard.writeText(buildLabMessage(order, customerName, contractCode));
      toast("Đã copy thông tin gửi Lab", "success");
    } catch {
      toast("Không thể copy, thử lại", "error");
    }
  };

  const startEditFile = (order: PrintingOrder) => {
    setEditingFile(order.id);
    setFileInput(order.print_file_url || "");
  };

  const saveFileUrl = async (orderId: string) => {
    const url = fileInput.trim() || null;
    setLocalOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, print_file_url: url } : o)));
    setEditingFile(null);
    const result = await updatePrintOrderFileUrl(orderId, url, contractId);
    if (!result.success) toast(result.error || "Lỗi lưu link", "error");
  };

  return (
    <div className="card-base p-4 lg:p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Printer size={16} className="text-primary" />
          <h3 className="text-body-sm font-bold text-text-primary">In ấn</h3>
        </div>
        <div className="flex items-center gap-2">
          {localOrders.length > 0 && (
            <span className="text-caption text-text-muted">{localOrders.length} đơn</span>
          )}
          {onAdd && (
            <Button type="button" variant="ghost" size="sm" onClick={onAdd} className="!px-2 !py-1 text-caption font-medium text-interactive hover:bg-interactive-light">
              <Plus size={14} className="mr-0.5" />
              Thêm
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {localOrders.length === 0 ? (
        <div className="py-6 text-center">
          <Printer size={28} className="text-text-muted/40 mx-auto mb-2" />
          <p className="text-caption text-text-muted">Chưa có đơn in ấn</p>
          {onAdd && (
            <Button type="button" variant="ghost" size="sm" onClick={onAdd} className="mt-2 text-caption font-medium text-interactive hover:bg-interactive-light">
              <Plus size={14} className="mr-1" />
              Tạo đơn in
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {localOrders.map((order) => {
            const labPay = labPaymentBadge(order.payment_status);
            const items = order.items || [];
            const expanded = expandedOrders.has(order.id);
            const shownItems = expanded ? items : items.slice(0, 3);
            return (
              <div key={order.id} className="p-2.5 rounded-md bg-bg-hover">
                {/* Row 1: code + copy + status */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
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
                    <Badge variant={labPay.variant} className="mt-1 text-micro">
                      {labPay.label}
                    </Badge>
                  </div>
                  <StatusSelect
                    current={order.status || "cho_xu_ly"}
                    options={[...PRINT_ORDER_STATUS_OPTIONS]}
                    variant="compact"
                    onUpdate={(newStatus) => handleStatusUpdate(order.id, newStatus)}
                  />
                </div>

                {/* Row 2: lab + date */}
                <div className="flex items-center gap-3 text-caption text-text-muted">
                  {order.labs?.name && <span>Lab: {order.labs.name}</span>}
                  {order.expected_date && (
                    <span className="flex items-center gap-1">
                      <Calendar size={10} />
                      {formatDate(order.expected_date)}
                    </span>
                  )}
                </div>

                {/* Sản phẩm in */}
                {items.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {shownItems.map((item, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 text-caption">
                        <span className="text-text-primary truncate">
                          {item.name} <span className="text-text-muted">×{item.quantity}</span>
                        </span>
                        <span className="text-text-muted tabular-nums shrink-0">
                          {formatVnd((item.quantity || 0) * (item.unitPrice || 0))}đ
                        </span>
                      </div>
                    ))}
                    {items.length > 3 && (
                      <button type="button" onClick={() => toggleExpanded(order.id)} className="text-micro text-interactive hover:underline">
                        {expanded ? "Thu gọn" : `Xem thêm ${items.length - 3} mục`}
                      </button>
                    )}
                  </div>
                )}

                {/* Tổng (server-authoritative) */}
                {typeof order.total_amount === "number" && order.total_amount > 0 && (
                  <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-1.5">
                    <span className="text-micro text-text-muted uppercase tracking-wide">Tổng</span>
                    <span className="text-body-sm font-bold text-text-primary tabular-nums">
                      {formatVnd(order.total_amount)}đ
                    </span>
                  </div>
                )}

                {/* Link file in (inline edit, ghi qua action nhẹ) */}
                <div className="mt-2">
                  {editingFile === order.id ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={fileInput}
                        onChange={(e) => setFileInput(e.target.value)}
                        placeholder="Dán link file in (https://...)"
                        className="h-8 text-caption"
                        autoFocus
                      />
                      <Button type="button" size="sm" onClick={() => saveFileUrl(order.id)} className="!px-2 !py-1 text-caption">Lưu</Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditingFile(null)} className="!px-2 !py-1 text-caption">Hủy</Button>
                    </div>
                  ) : order.print_file_url ? (
                    <div className="flex items-center gap-2 text-caption">
                      <a href={order.print_file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-interactive hover:underline truncate">
                        <ExternalLink size={12} className="shrink-0" />
                        File in
                      </a>
                      <button type="button" onClick={() => startEditFile(order)} className="text-text-muted hover:text-interactive" aria-label="Sửa link file">
                        <Pencil size={12} />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => startEditFile(order)} className="flex items-center gap-1 text-micro text-interactive hover:underline">
                      <Link2 size={12} />
                      Thêm link file
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: lý do (gap_su_co / rollback) */}
      <UnifiedModal
        isOpen={!!pendingChange}
        onClose={() => { setPendingChange(null); setStatusReason(""); }}
        title="Nhập lý do thay đổi trạng thái"
        description="Bắt buộc khi báo sự cố hoặc chuyển lùi quy trình."
        size="md"
        footer={(
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => { setPendingChange(null); setStatusReason(""); }}>Hủy</Button>
            <Button type="button" onClick={confirmPendingChange}>Xác nhận</Button>
          </div>
        )}
      >
        <Textarea
          value={statusReason}
          onChange={(e) => setStatusReason(e.target.value)}
          placeholder="VD: In sai màu, khách đổi yêu cầu, thao tác nhầm cần quay lại..."
          rows={4}
          autoFocus
        />
      </UnifiedModal>

      {/* Modal: cảnh báo công nợ khách khi giao */}
      <UnifiedModal
        isOpen={!!deliveryWarning}
        onClose={() => setDeliveryWarning(null)}
        title="⚠️ Hợp đồng chưa thanh toán đủ"
        description={`Khách còn nợ ${formatVnd(remainingAmount ?? 0)}đ. Vẫn xác nhận đã giao sản phẩm?`}
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

      {/* Modal: route bước side-effect sang /printing */}
      <UnifiedModal
        isOpen={!!routeNotice}
        onClose={() => setRouteNotice(null)}
        title="Cần xử lý ở trang In ấn"
        description="Bước này cập nhật tồn kho và thanh toán Lab — cần thực hiện ở trang In ấn để chạy đúng nghiệp vụ (giữ/trừ kho, ghi nhận thanh toán)."
        size="md"
        footer={(
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setRouteNotice(null)}>Đóng</Button>
            <Button type="button" onClick={() => { setRouteNotice(null); router.push("/printing"); }}>Mở trang In ấn</Button>
          </div>
        )}
      >
        <p className="text-body-sm text-text-muted">Tìm mã đơn ở danh sách In ấn để mở và xử lý.</p>
      </UnifiedModal>
    </div>
  );
}
```

**Acceptance / Review WP-B:**
- [ ] `npm run build` **xanh** (Props nhận đủ `customerName`/`contractCode`/`remainingAmount` parent đang truyền → hết lỗi type).
- [ ] Verify các API dùng tồn tại đúng chữ ký: `Input`, `Button(size/variant)`, `Badge(variant)`, `StatusSelect`, `toast(msg,type)`, `updatePrintOrderFileUrl` (đã export ở [printing-actions.ts](app/actions/printing-actions.ts)). Lệch thì chỉnh cho khớp, KHÔNG đổi hành vi.
- [ ] Render đơn nhiều sản phẩm → list + "Xem thêm"; đơn 0 sản phẩm → không vỡ; line price legacy (thiếu `unitPrice`) hiển thị `0đ` (KHÔNG `NaN`).
- [ ] Badge công nợ lab đúng: paid→"Đã TT lab"(success) · partial→"TT lab 1 phần"(warning) · còn lại→"Chưa TT lab"(warning).
- [ ] Copy gửi Lab → clipboard đúng format (mã/HĐ/khách/lab/sản phẩm/file/hẹn/note).
- [ ] Chọn `dat_coc`/`dang_in`/`da_in`/`hoan_thanh`/`huy_don` → hiện modal route, **KHÔNG** đổi status; "Mở trang In ấn" → `/printing`.
- [ ] Chọn `da_giao` khi `remainingAmount>0` → modal cảnh báo, "Vẫn giao" mới apply; trả đủ → apply thẳng.
- [ ] Thêm/sửa link file → optimistic + gọi `updatePrintOrderFileUrl`; reload giữ; link mở tab mới (`rel="noopener noreferrer"`).
- [ ] Responsive @768 + @1023 không vỡ layout.

---

## 5. WP-C — Apply & verify migration *(Verifier · sau WP-A)*
- [ ] Apply migration đúng cách (nhớ **truyền tên file**, không tin success message — verify bằng catalog).
- [ ] Cột tồn tại:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'printing_orders' AND column_name = 'print_file_url';
```
- [ ] RPC v2 (default) chạy không lỗi + có lab name:
```sql
SELECT (get_contract_detail_v2('<contract_uuid_thật>')::jsonb #> '{print_orders,0,labs,name}');
```
- [ ] Mở 1 contract detail thật → **không** thấy log `get_contract_detail_v2 unavailable; using 8-query fallback` (nếu thấy = v2 vẫn lỗi).

---

## 6. Dependency & parallel (cho điều phối multi-agent)
```
WP-A (RPC v2 sql)  ─┐
                    ├─►  WP-C (apply+verify DB)  ─┐
WP-B (block tsx)   ─┘ (độc lập file, song song A) ├─►  GATE cuối
                                                  ─┘
```
- **A ∥ B**: khác file, chạy song song.
- **C** sau A (cần v2 đã sửa) + sau khi migration cột sẵn sàng.
- **GATE cuối** sau A+B+C.

## 7. Gate cuối (bắt buộc trước khi báo done)
- [ ] `npm run build` xanh · `npm run lint` sạch (file đụng).
- [ ] Render contract detail có đơn in: items + tổng + badge lab + copy + link file OK; modal route + cảnh báo nợ OK.
- [ ] Đo Network: mở detail **không** rơi fallback 8-query (RPC trả thẳng).
- [ ] @768 + @1023 OK.
- [ ] Deploy = `git push origin main` (KHÔNG `vercel --prod`).

## 8. Review checklist tổng (cho review agent)
- [ ] **Không** đụng atomic RPC create/update / `printing.schema.ts` / form tạo đơn (Guardrail 1).
- [ ] **Không** wire workflow mutation vào card; side-effect đều route `/printing` (Guardrail 2).
- [ ] Badge read-only, không cho sửa thanh toán/kho in-card (Guardrail 3).
- [ ] Tổng dùng `order.total_amount`, không tự sum (Guardrail 4).
- [ ] v2 & v3 RPC trả `labs:{id,name}` đồng nhất; v2 không lỗi runtime.
- [ ] Không refactor ngoài phạm vi (Guardrail 6).
