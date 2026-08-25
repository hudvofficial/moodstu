# T-20260825 — `/printing`: vá 6 bug ở 2 drawer + dropdown trạng thái (review sau ADR-014)

**Owner:** claude (fallback — user duyệt "ok duyệt theo đề xuất, bạn trực tiếp tiến hành triển khai code") · **Trạng thái:** đã implement + verify xanh (2026-08-25), branch `claude/printing-drawer-fixes`, **chờ user merge → main + push** · **ADR:** `agent/DECISIONS.md` ADR-015 (đã ghi, Accepted) · **Kết quả thực thi:** mục 13 cuối file
**Module:** in-an-lab · **Bối cảnh:** user yêu cầu "check kĩ drawer /printing" (2026-08-25) sau khi gửi ảnh dropdown trạng thái đơn `IN-260609-00016`. Review tìm ra 6 bug độc lập nhau về nguyên nhân nhưng cùng nằm trong luồng "đổi trạng thái đơn in" đã được thiết kế lại ở ADR-014 (`T-20260824-printing-workflow-redesign`, đã **MERGED** `0f9a3cb`).

**Locks:**
- `types/printing-constants.ts`
- `components/ui/status-select.tsx`
- `app/actions/printing-mutations.ts`
- `app/actions/printing-queries.ts`
- `app/actions/printing-workflow-mutations.ts`
- `components/contracts/detail/print-orders-block.tsx`
- `components/printing/printing-list-page.tsx`
- `components/printing/printing-detail-drawer.tsx`
- `components/printing/printing-card.tsx`
- `components/printing/printing-table.tsx`
- `lib/utils/printing-group-utils.ts`
- `components/printing/cancel-order-modal.tsx`
- `components/printing/status-reason-modal.tsx` (mới)
- `types/printing.ts` (xoá 1 type chết)

**KHÔNG đụng:** migration SQL, `record_lab_payment_atomic`/`finance_lab_debt_summary`/`printing_lab_overview` (đã đúng, không chạm), `lab-payment-modal.tsx`, `payment-history-section.tsx`, `cancel-banner.tsx` (contracts, domain khác — refund khách hàng thật, không liên quan).

**1 task duy nhất** dù chạm nhiều file: cả 6 mục đều bắt nguồn từ cùng 1 đợt review, đa số đụng chung `types/printing-constants.ts` (nguồn chân lý) nên tách task sẽ tạo `locks` giao nhau — theo đúng tiền lệ `T-20260824-printing-workflow-redesign` (1 task, nhiều mục con). Mỗi mục dưới đây review/verify độc lập được.

---

## 0. Sửa bookkeeping trước (không phải code)

`agent/TASKS.yaml` dòng 138-166: entry `T-20260824-printing-workflow-redesign` vẫn ghi `status: ci` + "chờ user merge" — **đã lỗi thời**. `git log` xác nhận commit `0f9a3cb` (+ `25f2856`, `5106732`) đã nằm trên `main`/`origin/main`, và `agent/CURRENT_STATE.md:85` đã tự ghi "MERGED". Chuyển entry này từ `active:` sang `done:`, `status: merged`, `merged_commit: 0f9a3cb` — làm việc này TRƯỚC vì nếu không, `locks` của task đó (đang liệt là active) giao chồng với task mới này (luật AGENT_RULES §3.2).

---

## 1. Kiến trúc chung (ADR-015 — cần user duyệt)

3 quyết định xuyên suốt các mục bên dưới:

**(a) Gộp "reason required" + "rollback" + "overdue" thành nguồn chân lý duy nhất trong `types/printing-constants.ts`** — cùng nguyên tắc đã áp cho `PRINTING_VALID_TRANSITIONS` ở ADR-014 ("tránh lặp lại đúng lớp bug lệch từ vựng"). Lý do bắt buộc: mục 2 dưới đây cho thấy đúng lớp bug đó **đã tái diễn** — logic "cần lý do khi hủy đơn" tồn tại độc lập ở 2 nơi (`printing-mutations.ts` server-side, `print-orders-block.tsx` client-side), và bản client-side **thiếu `huy_don`** — cùng dạng lỗi với bug `payment_status` mà ADR-014 đã vá.

**(b) Drawer chọn theo *key* (id/contractCode) + `useEffect` đồng bộ lại từ SWR cache, không giữ nguyên snapshot object trong `useState`.** `PrintingGroupDrawer`/`PrintingDetailDrawer` hiện nhận `group`/`order` là bản chụp đông cứng lúc mở — không có cơ chế nào đồng bộ lại khi `ordersPage.orders` (SWR) đổi, kể cả khi chính thao tác trong drawer đó gây ra thay đổi. Chọn giải pháp "thêm `useEffect` đồng bộ lại theo id" thay vì "đổi hẳn state sang lưu id rồi derive" — diff nhỏ hơn, không phải sửa lại toàn bộ handler/JSX đang dùng `editingOrder`/`selectedContractGroup` làm object, và tự nhiên an toàn hơn ở edge case đơn bị lọc khỏi trang hiện tại (xem mục 5).

**(c) Xoá hẳn phần "Hoàn tiền" (refund cho khách) khỏi `CancelOrderModal`/`cancelOrder()`**, không cố "vá" bằng cách nạp `paidAmount` thật. Lý do: đây không phải field quên nạp — theo đúng ADR-014 ("in ấn là Mood ⇄ Lab đối tác thuần tuý"), khách hàng **không hề trả tiền Mood qua đơn in** (tiền khách trả thuộc `payment_plans` ở module Hợp đồng, domain khác, ADR-014 đã chốt giữ nguyên không đụng). Khái niệm "hoàn tiền cho khách khi hủy đơn in" không còn cơ sở nghiệp vụ nào — đây là phần sót lại từ luồng "đặt cọc" đã bị xoá ở ADR-014 (`deposit-payment-modal.tsx`/`final-payment-modal.tsx` đã xoá cùng đợt đó, nhưng `cancel-order-modal.tsx` không nằm trong `locks` của task đó nên bị bỏ sót).

**Không làm (ngoài phạm vi):** nhánh "hoàn kho" trong `cancelOrder()` (dòng 75-143, `printing-workflow-mutations.ts`) cũng là dead code tương tự (kho vật tư đã bị xoá khỏi nghiệp vụ in ấn ở ADR-014, `inventory_status` không còn nơi nào set thành `reserved`/`stocked_out` nữa) nhưng KHÔNG có triệu chứng sai (chỉ là code không bao giờ chạy tới, không hiện gì sai) — theo CLAUDE.md §3 "dead code không liên quan → mention, đừng xoá", chỉ ghi nhận ở đây, không sửa trong task này.

---

## 2. `types/printing-constants.ts` — thêm 3 helper dùng chung + sửa màu `gap_su_co`

Thêm vào cuối file (sau `toUIPaymentStatus`):

```ts
// ─── REASON-REQUIRED TRANSITIONS (Trục A) ──────────────────────
// Nguồn chân lý DUY NHẤT cho "khi nào bắt buộc nhập lý do" — dùng chung server
// (printing-mutations.ts) + 2 client call site (printing-list-page.tsx,
// print-orders-block.tsx). Trước 2026-08-25, mỗi nơi tự định nghĩa riêng —
// print-orders-block.tsx thiếu "huy_don", printing-list-page.tsx thiếu cả 2 —
// khiến chọn "Hủy đơn"/"Gặp sự cố" từ dropdown luôn bị server từ chối (lệch
// đúng lớp bug payment_status mà ADR-014 đã vá).
export const PRINTING_REASON_REQUIRED_STATUSES: string[] = ["gap_su_co", "huy_don"];

const PRINTING_STATUS_ORDER = ["cho_xu_ly", "dang_in", "da_in", "hoan_thanh"];

/** True nếu `to` là bước LÙI so với `from` trong 4 bước tuyến tính Trục A. */
export function isPrintingStatusRollback(
  from: string | null | undefined,
  to: string,
): boolean {
  const fromIndex = PRINTING_STATUS_ORDER.indexOf(from || "cho_xu_ly");
  const toIndex = PRINTING_STATUS_ORDER.indexOf(to);
  return fromIndex >= 0 && toIndex >= 0 && toIndex < fromIndex;
}

/** True nếu chuyển `from` → `to` bắt buộc phải có lý do (báo sự cố, hủy đơn, hoặc lùi bước). */
export function printingStatusRequiresReason(
  from: string | null | undefined,
  to: string,
): boolean {
  return PRINTING_REASON_REQUIRED_STATUSES.includes(to) || isPrintingStatusRollback(from, to);
}

// ─── OVERDUE CHECK (Trục A) ─────────────────────────────────────
/**
 * True nếu đơn còn "pending" (isPendingPrintStatus) và đã quá `expectedDate`.
 * So theo NGÀY lịch local (không theo giờ) — trước đây 3 nơi gọi tự parse
 * `new Date(expectedDate)` (UTC vì chuỗi "YYYY-MM-DD" không có giờ) rồi so với
 * `new Date()` (giờ máy khách) → lệch múi giờ VN (UTC+7) tới 7 tiếng quanh mốc
 * đổi ngày: đơn hẹn ĐÚNG HÔM NAY bị báo "Quá hạn" từ 7h sáng thay vì 0h hôm sau.
 * Phát hiện khi rà lại /printing 2026-08-25.
 */
export function isPrintingOrderOverdue(
  status: PrintingOrderStatus,
  expectedDate: string | null,
): boolean {
  if (!isPendingPrintStatus(status) || !expectedDate) return false;
  const todayLocal = new Date().toLocaleDateString("en-CA"); // "YYYY-MM-DD" theo giờ máy khách
  return expectedDate.slice(0, 10) < todayLocal;
}
```

**Sửa `PRINTING_STATUS_VARIANTS`** (dòng 68, hiện `gap_su_co: "error"`) → `gap_su_co: "warning"`. Lý do: `gap_su_co` (sự cố — có thể xử lý tiếp) và `huy_don` (hủy — chấm dứt) đang dùng chung variant `"error"` (đỏ), không phân biệt được bằng mắt ở badge. Đổi `gap_su_co` sang `"warning"` (cam, variant có sẵn trong `BadgeVariant`, không cần thêm CSS token mới) — khớp đúng ngữ nghĩa "cần chú ý" thay vì "đã chấm dứt".

---

## 3. `components/ui/status-select.tsx` — đồng bộ màu dot với badge

`PRINT_ORDER_STATUS_OPTIONS` dòng 44, entry `gap_su_co` hiện `color: "var(--color-status-error)"` → đổi thành `color: "var(--color-status-pending)"` (token có sẵn, cam, đã dùng cho `cho_xu_ly` — không xung đột vì 2 trạng thái không đồng thời hiện cạnh nhau trong cùng 1 dropdown theo `PRINTING_VALID_TRANSITIONS`). `huy_don` giữ nguyên `--color-status-error`.

---

## 4. `app/actions/printing-mutations.ts` — dùng chung constants, bỏ bản cục bộ lệch

Dòng 150-157 hiện tại:
```ts
  // Statuses that require a reason
  const REASON_REQUIRED: string[] = ["gap_su_co", "huy_don"];
  const isRollback = (from: string, to: string) => {
    const ORDER = ["cho_xu_ly", "dat_coc", "dang_in", "da_in", "da_giao", "hoan_thanh"];
    const fromIdx = ORDER.indexOf(from);
    const toIdx = ORDER.indexOf(to);
    return fromIdx >= 0 && toIdx >= 0 && toIdx < fromIdx;
  };
```
Thay bằng: xoá cả khối trên. Import thêm `printingStatusRequiresReason` vào dòng import hiện có (dòng 18):
```ts
import {
  PRINTING_VALID_TRANSITIONS as VALID_TRANSITIONS,
  printingStatusRequiresReason,
} from "@/types/printing-constants";
```
Dòng 179 hiện tại:
```ts
    const needsReason = REASON_REQUIRED.includes(parsedStatus.data) || isRollback(currentStatus, parsedStatus.data);
```
→
```ts
    const needsReason = printingStatusRequiresReason(currentStatus, parsedStatus.data);
```
(Tiện thể dọn luôn `dat_coc`/`da_giao` còn sót trong mảng `ORDER` cũ — đúng như spec ADR-014 mục 3 đã yêu cầu nhưng chưa được áp dụng khi implement; không đổi hành vi vì 2 giá trị đó không còn transition nào chạm tới, chỉ dọn cho khớp spec gốc.)

---

## 5. `components/contracts/detail/print-orders-block.tsx` — vá thiếu `huy_don` + dùng chung modal

**Xoá** `STATUS_ORDER` (dòng 30) + `isRollback` (dòng 32-36) + `requiresReason` (dòng 38-40) — thay bằng import `printingStatusRequiresReason` từ `@/types/printing-constants` (thêm vào import block đầu file).

**Dòng 122** (`if (requiresReason(previous, newStatus))`) → `if (printingStatusRequiresReason(previous, newStatus))`.

**Xoá state** `pendingChange`/`statusReason` (dòng 87-88) và **JSX modal inline** (dòng 443-475) — thay bằng component dùng chung `StatusReasonModal` (mục 7). Giữ nguyên interface `PendingStatusChange` (dòng 71-75) và state `pendingChange` **KHÔNG xoá** — vẫn cần để biết đơn nào đang chờ xác nhận, chỉ xoá `statusReason` (state text nội bộ giờ do `StatusReasonModal` tự quản) và khối JSX modal cũ.

`confirmPendingChange` (dòng 131-143) đổi chữ ký thành nhận `reason` từ callback thay vì đọc từ state `statusReason`:
```ts
  const confirmPendingChange = async (reason: string) => {
    if (!pendingChange) return;
    const change = pendingChange;
    setPendingChange(null);
    await applyStatusUpdate(change.orderId, change.next, change.previous, reason);
  };
```
JSX thay thế cho khối dòng 443-475 (đặt ở đúng vị trí cũ):
```tsx
      <StatusReasonModal
        isOpen={!!pendingChange}
        onClose={() => setPendingChange(null)}
        onConfirm={confirmPendingChange}
      />
```
Thêm import: `import { StatusReasonModal } from "@/components/printing/status-reason-modal";`. Xoá import `UnifiedModal`/`Textarea` nếu sau khi sửa không còn nơi nào khác trong file dùng (kiểm tra bằng grep trước khi xoá — file có nhiều JSX khác, khả năng cao `Textarea`/`UnifiedModal` vẫn dùng ở form thêm đơn/sửa file, giữ import nếu còn dùng).

---

## 6. `components/printing/status-reason-modal.tsx` (file mới) — modal nhập lý do dùng chung

```tsx
"use client";

import { useState } from "react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

/**
 * Modal nhập lý do bắt buộc khi đổi trạng thái đơn in sang "Gặp sự cố"/"Hủy đơn"
 * hoặc lùi bước (xem printingStatusRequiresReason, types/printing-constants.ts).
 * SSOT UI cho cả /printing (printing-list-page.tsx) và /contracts/[id]
 * (print-orders-block.tsx) — trước đây mỗi trang tự viết 1 bản, lệch nhau
 * (T-20260825 review).
 */
export function StatusReasonModal({ isOpen, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    const trimmed = reason.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
    setReason("");
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Nhập lý do thay đổi trạng thái"
      description="Bắt buộc khi báo sự cố, hủy đơn, hoặc chuyển lùi quy trình."
      size="md"
      footer={(
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleClose}>Hủy</Button>
          <Button type="button" onClick={handleConfirm} disabled={!reason.trim()}>Xác nhận</Button>
        </div>
      )}
    >
      <Textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="VD: In sai màu, khách đổi yêu cầu, thao tác nhầm cần quay lại..."
        rows={4}
        autoFocus
      />
    </UnifiedModal>
  );
}
```
(Nội dung y hệt modal cũ trong `print-orders-block.tsx` dòng 443-475, chỉ tách file + đổi state `reason` từ local ra ngoài qua `onConfirm`.)

---

## 7. `components/printing/printing-list-page.tsx` — vá bug P0 kép (reason bị bỏ sót + 2 drawer snapshot đông cứng)

**7a. Reason bị bỏ sót** — thêm state + sửa `handleStatusChange` (dòng 178-219):

Đổi tên hàm hiện tại thành `performStatusChange`, thêm tham số `reason`:
```ts
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    order: PrintingOrderRow;
    nextStatus: PrintingOrderStatus;
  } | null>(null);

  const performStatusChange = async (
    order: PrintingOrderRow,
    nextStatus: PrintingOrderStatus,
    reason?: string,
  ) => {
    if (!order.contractId) {
      toast("Đơn in này không có hợp đồng để cập nhật", "error");
      return;
    }
    const contractId = order.contractId;

    const patchOrderStatus = (status: PrintingOrderStatus) => {
      void mutateOrders((current) => {
        if (!current?.success) return current;
        return {
          ...current,
          data: {
            ...current.data,
            orders: current.data.orders.map((item) =>
              item.id === order.id ? { ...item, status } : item,
            ),
          },
        };
      }, { revalidate: false });
    };

    await runOptimisticMutation({
      apply: () => patchOrderStatus(nextStatus),
      rollback: () => patchOrderStatus(order.status),
      action: () => updatePrintingOrderStatus(order.id, nextStatus, contractId, reason),
      onSuccess: async () => {
        toast("Cập nhật trạng thái thành công", "success");
        await Promise.all([
          invalidateContractAfterWrite(contractId),
          handleSaved(),
        ]);
      },
      onError: (error) => {
        toast(error instanceof Error ? error.message : "Không thể cập nhật trạng thái", "error");
      },
    });
  };

  const handleStatusChange = async (
    order: PrintingOrderRow,
    newStatus: string,
  ) => {
    const nextStatus = newStatus as PrintingOrderStatus;
    if (printingStatusRequiresReason(order.status, nextStatus)) {
      setPendingStatusChange({ order, nextStatus });
      return;
    }
    await performStatusChange(order, nextStatus);
  };

  const confirmPendingStatusChange = async (reason: string) => {
    if (!pendingStatusChange) return;
    const { order, nextStatus } = pendingStatusChange;
    setPendingStatusChange(null);
    await performStatusChange(order, nextStatus, reason);
  };
```
Thêm JSX (cạnh `<PrintingGroupDrawer .../>` hiện có, cùng cấp):
```tsx
      <StatusReasonModal
        isOpen={!!pendingStatusChange}
        onClose={() => setPendingStatusChange(null)}
        onConfirm={confirmPendingStatusChange}
      />
```
Thêm import: `printingStatusRequiresReason` từ `@/types/printing-constants`, `StatusReasonModal` từ `@/components/printing/status-reason-modal`.

**7b. `selectedContractGroup` đông cứng** — thêm `useEffect` ngay sau chỗ khai báo `contractGroups` (dòng 167-170 hiện tại, `const contractGroups = useMemo(...)`):
```ts
  useEffect(() => {
    if (!selectedContractGroup) return;
    const fresh = contractGroups.find((g) => g.contractCode === selectedContractGroup.contractCode);
    if (fresh && fresh !== selectedContractGroup) setSelectedContractGroup(fresh);
  }, [contractGroups, selectedContractGroup]);
```

**7c. `editingOrder` đông cứng** — thêm `useEffect` tương tự, đặt cạnh 7b:
```ts
  useEffect(() => {
    if (!editingOrder) return;
    const fresh = ordersPage.orders.find((item) => item.id === editingOrder.id);
    if (fresh && fresh !== editingOrder) setEditingOrder(fresh);
  }, [ordersPage.orders, editingOrder]);
```
Cả 2 effect **không** reset khi group/order biến mất khỏi trang hiện tại (do lọc/phân trang) — cố tình giữ bản cuối cùng biết được thay vì đóng drawer đột ngột hoặc rơi về màn "tạo mới" giữa chừng khi user đang thao tác.

Thêm `useEffect` vào import React (dòng 3, hiện `import React, { Suspense, useMemo, useState, useCallback } from "react";` → thêm `useEffect`).

---

## 8. `components/printing/printing-detail-drawer.tsx` — vá badge/panel "Còn lại"/"Thanh toán lab" đọc sai nguồn + hẹp lại effect deps

**8a. Nguồn dữ liệu sai** — `getOrderPaymentSummary` (đọc view `order_payment_summary` ← bảng `order_payments`, mô hình "khách đặt cọc/tất toán cho Mood" đã bị ADR-014 khai tử cho đơn in) không phản ánh Trục B (Mood nợ Lab, bảng `lab_payment_allocations`). Với mọi đơn tạo/chạy dưới nghiệp vụ mới, `order_payments` không có dòng deposit/final nào → `remaining` luôn ≈ `total_amount`, tức là bằng đúng con số sai đang hiện (mục 8b của review 2026-08-25) — không phải do quên trừ, mà do đọc sai bảng.

Thêm hàm mới trong `app/actions/printing-queries.ts` (đặt cạnh `getOrderPaymentSummary`, dòng ~381):
```ts
/**
 * Số dư Trục B (Mood nợ Lab) cho ĐÚNG 1 đơn — total_amount trừ SUM đã phân bổ
 * qua lab_payment_allocations (record_lab_payment_atomic). Thay cho
 * getOrderPaymentSummary (đọc order_payments — mô hình "khách cọc cho Mood",
 * ADR-014 đã khai tử cho đơn in, luôn trả remaining ≈ total_amount sai).
 */
export async function getPrintingOrderLabRemaining(
  orderId: string,
): Promise<ActionResult<{ totalAmount: number; allocatedAmount: number; remainingAmount: number }>> {
  return withPrintingAccess(async (supabase: SupabaseClient<Database>) => {
    const { data: order, error: orderError } = await supabase
      .from("printing_orders")
      .select("total_amount")
      .eq("id", orderId)
      .is("deleted_at", null)
      .single();

    if (orderError || !order) {
      throw new Error("Không tìm thấy đơn in");
    }

    const { data: allocations, error: allocError } = await supabase
      .from("lab_payment_allocations")
      .select("amount")
      .eq("printing_order_id", orderId);

    if (allocError) {
      throw new Error(`Không thể lấy dữ liệu công nợ lab: ${allocError.message}`);
    }

    const totalAmount = Number(order.total_amount || 0);
    const allocatedAmount = (allocations || []).reduce(
      (sum, a) => sum + Number(a.amount || 0),
      0,
    );

    return {
      totalAmount,
      allocatedAmount,
      remainingAmount: Math.max(0, totalAmount - allocatedAmount),
    };
  });
}
```
**Xoá `getOrderPaymentSummary`** (dòng 381-404) — xác nhận grep toàn repo chỉ có 1 nơi gọi (`printing-detail-drawer.tsx:154`, sửa ở mục 8b), an toàn xoá. **Xoá luôn type `OrderPaymentSummary`** (`types/printing.ts` dòng 155-164) — không còn importer nào (đã grep xác nhận).

**8b. `printing-detail-drawer.tsx`** — đổi import (dòng 31):
```ts
import { getPrintingOrderLabRemaining } from "@/app/actions/printing-queries";
```
Đổi state (dòng 135):
```ts
  const [labDebt, setLabDebt] = useState<{ remainingAmount: number } | null>(null);
```
Đổi effect (dòng 150-168) — gọi hàm mới + **hẹp dependency từ `order` (object) sang `order?.id`** (nguyên tắc đã áp đúng ở effect dòng 140-148 ngay phía trên, comment sẵn có "tránh reset mỗi lần realtime update" — effect này cũng cần tránh gọi lại API mỗi khi mục 7c làm `order` đổi reference nhưng cùng id):
```ts
  useEffect(() => {
    if (!isOpen) return;

    if (order) {
      getPrintingOrderLabRemaining(order.id)
        .then((result) => {
          if (result.success) {
            setLabDebt({ remainingAmount: result.data.remainingAmount });
          }
        })
        .catch(() => {});
    }

    fetchInventoryPickerItems({ activeOnly: true, limit: 100 })
      .then((result) => {
        setInventoryItems(result.items);
      })
      .catch(() => {});
  }, [isOpen, order?.id]);
```
Đổi render "Còn lại" (dòng 597-601, `paymentSummary` → `labDebt`):
```tsx
                {labDebt && labDebt.remainingAmount > 0 && (
                  <div className="rounded-2xl bg-warning/10 px-3 py-2 text-right">
                    <p className="text-xs font-bold uppercase tracking-wider text-warning">Còn lại</p>
                    <p className="text-sm font-bold text-warning">{formatCurrency(labDebt.remainingAmount)}</p>
                  </div>
                )}
```
**Sửa badge "Thanh toán lab"** (dòng 637-643) — hiện `order.totalAmount` (luôn = tổng đơn, không trừ đã trả), đổi sang số dư thật, fallback về `order.totalAmount` trong lúc `labDebt` chưa tải xong:
```tsx
                          {order.paymentStatus === "chua_thanh_toan" && (
                            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-bold text-warning">
                              {formatCurrency(labDebt?.remainingAmount ?? order.totalAmount)}
                            </span>
                          )}
```
(Xoá comment cũ dòng 638-639 nói "số dư tối đa (chưa trừ phần đã trả)" — không còn đúng sau khi sửa, số hiện ra bây giờ CHÍNH XÁC, không phải ước lượng tối đa nữa.)

---

## 9. `components/printing/cancel-order-modal.tsx` — xoá "Hoàn tiền" chết (theo quyết định 1c)

**Xoá:**
- Import `CurrencyInput`, `SelectForm` (dòng 6-7) nếu sau khi xoá không còn dùng nơi khác trong file (kiểm tra lại — file chỉ dùng 2 import này cho phần Hoàn tiền, khả năng cao xoá được cả 2).
- `PAYMENT_METHODS` const (dòng 22-27).
- State `refundAmount`/`refundMethod` (dòng 38-39).
- Validate refund trong `handleSubmit` (dòng 49-59: check `refundAmount < 0` và `refundAmount > paidAmount`).
- Tham số `refundAmount`/`refundMethod` khi gọi `cancelOrder()` (dòng 66-67) — gọi `cancelOrder({ orderId: order.id, reason: reason.trim() })`, bỏ 2 field.
- `paidAmount` const (dòng 90) + toàn bộ "Order Info" row "Đã thanh toán" (dòng 137-142) — không còn dữ liệu hợp lệ (xem quyết định 1c).
- Toàn bộ khối JSX "Refund Section" (dòng 160-212, `{paidAmount > 0 && (...)}`).
- Toast message dòng 74 "Đã hủy đơn và hoàn trả kho thành công" → sửa còn "Đã hủy đơn thành công" (bỏ "và hoàn trả kho" — nhánh hoàn kho là dead code theo mục 1, không nên hứa hẹn trong thông báo cho user thật).

**Giữ nguyên:** `hasInventory`/cảnh báo hoàn kho (dòng 89, 108-117) — vẫn đúng lý thuyết dù hiện tại luôn `false` (không thuộc phạm vi task này, xem mục 1 "Không làm").

**`app/actions/printing-workflow-mutations.ts`** — bỏ tham số `refundAmount`/`refundMethod` khỏi `cancelOrder()`:
- Xoá khỏi input type (dòng 55-56) và destructure (dòng 59, bỏ `refundAmount = 0, refundMethod = "cash"`).
- Xoá khối "2. Handle refund if needed" (dòng 145-176).
- Dòng 208 (`newData: { status: "huy_don", refund_amount: refundAmount }`) → bỏ field `refund_amount`.
- Dòng 213-217 (`if (refundAmount > 0) { revalidatePath("/finance/expenses"); }` + return `refunded: refundAmount`) → xoá cả nhánh revalidate finance/expenses (không còn tạo expense) và field `refunded` trong return.
- Return message dòng 222 "Đã hủy đơn và hoàn trả kho" → "Đã hủy đơn".
- `toPaymentMethodEnum` (dòng 27-31) — kiểm tra còn nơi nào khác trong file dùng không (không còn, vì chỉ refund dùng) → xoá luôn nếu không còn call site nào sau khi xoá refund.

---

## 10. `components/printing/printing-card.tsx`, `printing-table.tsx`, `lib/utils/printing-group-utils.ts` — dùng `isPrintingOrderOverdue`

**`printing-card.tsx`** dòng 34:
```ts
  const isOverdue = isPrintingOrderOverdue(order.status, order.expectedDate);
```
Thêm `isPrintingOrderOverdue` vào import từ `types/printing-constants` (dòng 11-15).

**`printing-table.tsx`** dòng 193-196:
```ts
  const isOverdue = isPrintingOrderOverdue(order.status, order.expectedDate);
```
Thêm import tương tự (dòng 21-25).

**`lib/utils/printing-group-utils.ts`** dòng 63-65:
```ts
    if (isPrintingOrderOverdue(order.status, order.expectedDate)) {
      group.overdueCount += 1;
    }
```
Thêm `isPrintingOrderOverdue` vào import dòng 2 (`import { isPendingPrintStatus, isPrintingOrderOverdue } from "@/types/printing-constants";`). Dòng 60 (`const isPending = isPendingPrintStatus(order.status);`) **giữ nguyên** — vẫn cần cho khối "Nearest Expected Date" (dòng 67-72) và "Count completed" (dòng 74-77) ngay bên dưới.

---

## 11. Verify (gate bắt buộc trước khi báo xong)

1. `npx eslint` toàn bộ file trong `locks` — 0 lỗi mới.
2. `npx tsc --noEmit` — 0 lỗi mới (đổi chữ ký `cancelOrder`, `getOrderPaymentSummary` → `getPrintingOrderLabRemaining` có thể lộ chỗ gọi sai kiểu).
3. `npm run build` — exit 0.
4. `npm run verify:printing` — xanh.
5. `npm run verify:contracts` — xanh (đụng `print-orders-block.tsx`).
6. Render thật (Roo, chrome-devtools) trên **cả 2 trang**:
   - `/printing`: mở `PrintingGroupDrawer` của 1 hợp đồng có ≥2 đơn, đổi trạng thái 1 đơn ngay trong drawer đang mở sang "Gặp sự cố" → modal nhập lý do hiện ra, xác nhận → **badge trong chính drawer đang mở đổi ngay, không cần đóng/F5**; header "Đã hoàn thành X/Y" cập nhật theo. Lặp lại với "Hủy đơn".
   - `/printing`: mở `PrintingDetailDrawer` (nút "Sửa") của 1 đơn `dang_in`, bấm nút next-step "Lab đã in xong" → badge trạng thái + label nút next-step trong CHÍNH drawer đang mở đổi ngay (không cần đóng/mở lại).
   - `/printing`: đơn có `payment_status = chua_thanh_toan` VÀ đã có 1 khoản `lab_payment_allocations` một phần (dùng đơn thật của lab Hồng Bảo nếu còn, hoặc tạo 1 khoản thanh toán một phần qua "Thanh toán lab" trước rồi mở lại drawer) → badge "Thanh toán lab" hiện đúng số CÒN THIẾU, không phải tổng đơn gốc.
   - `/contracts/[id]`: đổi trạng thái 1 đơn in sang "Hủy đơn" từ dropdown thẻ hợp đồng → modal nhập lý do hiện ra (trước đây fail thẳng, không có modal nào).
   - Dropdown trạng thái: đơn `dang_in` → mở dropdown, xác nhận chấm tròn "Gặp sự cố" hiện màu cam (không trùng màu đỏ "Hủy đơn").
   - `CancelOrderModal` (nút "Hủy đơn" ở `PrintingDetailDrawer`): không còn mục "Hoàn tiền"/"Đã thanh toán" nào hiện ra.
7. Không mutate dữ liệu đơn in thật khi test — seed 1 đơn E2E riêng hoặc dùng đơn nháp rồi xoá, theo đúng cách `T-20260824-printing-workflow-redesign` đã làm.

---

## 12. Ngoài phạm vi (ghi nhận, không làm trong task này)

- Nhánh "hoàn kho" chết trong `cancelOrder()` (mục 1 "Không làm").
- `LabPaymentModal` "Chọn thủ công" — layout đã vá ở `T-20260824` mục 14f, không liên quan review lần này.
- Badge "còn nợ lab" ở mức TOÀN LAB (không phải từng đơn) — đã đúng sẵn qua `finance_lab_debt_summary()`, không đụng.

## 13. Kết quả thực thi (Claude fallback, 2026-08-25, branch `claude/printing-drawer-fixes`)

**2 điểm lệch spec, có lý do đo được:**

1. **Mục 7b/7c (ADR-015b) — `useMemo` derive thay vì `useEffect` + `setState`.** Lint repo bật `react-hooks/set-state-in-effect` (React Compiler) ở mức **error** → bản `useEffect` bị eslint chặn (2 errors, tsc vẫn xanh). Đổi sang: state chỉ giữ **snapshot** (`editingOrderSnapshot` / `selectedGroupSnapshot`, setter giữ nguyên tên nên mọi call site không đổi), object đưa xuống drawer derive bằng `useMemo` tra theo `id` / `contractCode` từ SWR, fallback `?? snapshot` khi item biến mất khỏi trang → giữ đúng edge case spec yêu cầu, không tốn 1 render thừa như effect. ADR-015 mục (b) trong `DECISIONS.md` đã ghi theo bản `useMemo` này.
2. **Mục 8b — thêm 1 dòng `setLabDebt(null)` vào effect reset** (`printing-detail-drawer.tsx`, effect `[isOpen, order?.id]` có sẵn): fallback `labDebt?.remainingAmount ?? order.totalAmount` ở badge sẽ lộ số nợ của đơn TRƯỚC trong lúc chờ fetch đơn mới nếu không reset. Effect fetch dùng biến `orderId` thay `order?.id` trực tiếp để hết warning `exhaustive-deps` (warning còn lại duy nhất là ở effect reset — pre-existing, đã ghi nhận từ T-20260824).

**Phát hiện ngoài scope qua gate `npm run verify:printing` — ĐỎ, có sẵn trên prod, không do task này:** `printing_stats is callable by anon`. Trace: migration ADR-014 `20260824120000_printing_workflow_redesign.sql:35-37` làm `DROP FUNCTION public.printing_stats()` + `CREATE FUNCTION` (bắt buộc vì đổi OUT parameters) nhưng **không áp lại** `REVOKE ALL ... FROM PUBLIC, anon, authenticated` + `GRANT ... TO service_role` của `20260428130000:789/802` → hàm SECURITY DEFINER này hiện anon gọi được (lộ số liệu tổng hợp đơn in: số đơn theo trạng thái, tổng chi phí, nợ lab). Đã soạn `supabase/migrations/20260825150000_printing_stats_revoke_anon.sql` (2 dòng, khôi phục đúng quyền cũ). **ĐÃ ÁP lên production** (user: "bạn áp luôn đi, mọi khi bạn vẫn tự áp migration luôn được mà" — 2026-08-25) qua `node scripts/migrate-direct.mjs` → chạy lại `npm run verify:printing`: **xanh** — 5/5 RPC read ok, **anon denied 4/4** (`printing_stats`, `finance_lab_debt_summary`, `printing_lab_overview`, `printing_integrity_report`), integrity report 7/7 check = 0 issue.

| Gate | Kết quả |
|---|---|
| `npx eslint` 14 file trong locks | **0 error**, 1 warning pre-existing (`printing-detail-drawer.tsx` effect reset, có từ trước) |
| `npx tsc --noEmit` | 0 lỗi |
| `npm run build` | exit 0, PWA artifact pass |
| `npm run verify:contracts` | **xanh** |
| `npm run verify:printing` | lần 1 **đỏ** (nguyên nhân có sẵn, xem trên) → áp migration REVOKE → lần 2 **xanh**: anon denied 4/4, integrity 7/7 = 0 |
| Render thật — `next start` prod :3100 + Playwright chromium 1366×768, `tests/e2e/printing-drawer-fixes-verify.spec.ts` (giữ lại làm regression), seed riêng 1 user + 1 HĐ + 1 lab + 3 đơn rồi dọn — DB kiểm sau 2 lượt: **0 dòng sót** ở 7 bảng | **3/3 PASS** (lần 1: 2/3, test 3 fail vì `page.goto` thẳng `/contracts/[id]` ngay sau login bị `net::ERR_ABORTED` — lỗi điều hướng harness, đổi sang đường đi của spec `printing-ui-tablet` có sẵn → pass) |

**Từng AC mục 11 (đo được, ảnh trong `test-results/pdf-*.png`):**
- Group drawer đang mở: A `cho_xu_ly` → chọn "Gặp sự cố" → modal lý do hiện → xác nhận → toast thành công → **trigger trong chính drawer đổi "Gặp sự cố" không đóng/F5**, DB `status=gap_su_co`, `issue_reason="E2E: in sai màu"`; B → "Hủy đơn" → modal → **header "Đã hoàn thành" đổi 0/3 → 1/3 ngay trong drawer**, DB `huy_don`. Trước fix: cả 2 thao tác rollback + toast lỗi "Vui lòng nhập lý do".
- Dot màu đo bằng `getComputedStyle`: `gap_su_co = rgb(243,156,18)` (cam) ≠ `huy_don = rgb(231,76,60)` (đỏ).
- Detail drawer: đơn C tổng 362.500đ đã trả lab 100.000đ (1 dòng `lab_payment_allocations` seed) → badge "Thanh toán lab" và panel "Còn nợ lab" đều **262.500đ** (trước fix: 362.500đ). Bấm "Gửi lab — bắt đầu in" → badge header "ĐANG IN" + nút đổi "Lab đã in xong" **tại chỗ**, DB `dang_in`.
- Modal "Hủy đơn in": 0 text "Hoàn tiền", 0 text "Đã thanh toán", còn "Tổng đơn".
- `/contracts/[id]` thẻ hợp đồng: A → "Hủy đơn" → modal lý do hiện (trước: fail thẳng vì `requiresReason` thiếu `huy_don`) → DB `huy_don`.

**Merge + deploy (user: "tiến hành merge + push luôn"):** ff `main` `0760426 → d91def7`, push 15:08Z; Vercel status (GitHub commit status API, không cần auth) `pending → success` sau ~140s.

**Verify PRODUCTION `stu.moodwedding.com` (cùng spec Playwright, seed riêng, dọn sạch — 0 dòng sót/7 bảng sau 2 lượt): 3/3 PASS.** Lượt 1 fail ở `page.goto(..., waitUntil: "networkidle")` timeout 45s — trên prod Speed Insights/Realtime giữ kết nối nên `networkidle` không bao giờ đạt (local `next start` không có); ảnh chụp lúc fail cho thấy trang đã render đủ (nhóm seed `E2E-PDF-… 3 đơn · 1 trễ`). Đổi 2 chỗ `goto` sang `waitUntil: "domcontentloaded"` (spec đã có element-wait riêng) → lượt 2 3/3 pass: group drawer đang mở tự đổi trạng thái + header 0/3→1/3, modal lý do hiện cho Gặp sự cố/Hủy đơn ở cả `/printing` lẫn `/contracts/[id]`, dot `rgb(243,156,18)` ≠ `rgb(231,76,60)`, badge nợ lab 262.500đ, next-step đổi tại chỗ, modal Hủy không còn "Hoàn tiền". **Bài học cho spec e2e chạy trên prod: không dùng `networkidle`.**
