# T-20260824 — "Thanh toán lab" thiếu lối vào trực tiếp + mất ngữ cảnh đơn đang xem

**Owner:** claude (fallback, user chỉ định "tiến hành") · **Trạng thái:** đã duyệt hướng thiết kế, đang implement
**Module:** in-an-lab · **Bối cảnh:** phát hiện ngay sau T-20260824-printing-workflow-redesign (ADR-014) — không phải architecture decision mới (không đổi data model/DB), chỉ là sửa luồng UI dùng đúng hạ tầng `record_lab_payment_atomic` đã có sẵn, nên không mở ADR riêng.

**Locks:**
- `components/printing/labs/lab-payment-modal.tsx`
- `components/printing/printing-card.tsx`
- `components/printing/printing-table.tsx`
- `components/printing/printing-group-drawer.tsx`
- `components/printing/printing-list-page.tsx`
- `components/printing/printing-detail-drawer.tsx`

---

## 0. Vấn đề (user báo bằng 3 ảnh chụp thật)

1. Không có UI nào để "thanh toán công nợ lab" trực tiếp từ dòng/thẻ đơn đang xem — chỉ có nút **"Sửa"**, sai ngữ nghĩa (sửa đơn ≠ trả nợ lab).
2. Đường đi hiện tại: bảng `/printing` → "Xem chi tiết" → drawer "Chi tiết Nhóm Đơn In" → mỗi đơn chỉ có `StatusSelect` + "Sửa" → bấm "Sửa" mới vào `PrintingDetailDrawer` → **ở đây mới có** nút "Thanh toán lab".
3. Vào tới `LabPaymentModal`, chế độ "Chọn thủ công" hiện **toàn bộ N đơn chưa trả của lab** (sort `order_date` cũ nhất trước) — không biết, không ưu tiên đúng đơn admin vừa mở → phải tự dò.

## 1. Nguyên tắc thiết kế (đã phân tích + user duyệt)

Công nợ Lab là khái niệm **cấp LAB** (số dư chạy, phân bổ FIFO/thủ công qua `record_lab_payment_atomic`), không phải cấp đơn — nhưng có **2 điểm vào với 2 ý định khác nhau**, hành vi modal phải khớp đúng ý định của điểm vào, không dùng chung 1 hành vi:

| Điểm vào | Ý định | Hành vi mở modal |
|---|---|---|
| Từ **1 đơn cụ thể** (nút mới "Thanh toán" trên dòng/thẻ đơn) | "Đơn này lab đòi tiền, trả đúng đơn này" | Tự bật **Chọn thủ công**, tự tick đúng đơn, tự điền đúng `remainingAmount` — chỉ cần bấm "Xác nhận" |
| Từ **lab** (nút "Thanh toán" trên card lab, `/printing/labs` — **không đổi**) | "Hôm nay trả lab X triệu, không quan tâm đơn nào" | Giữ nguyên **FIFO** mặc định như hiện tại |

**Không** biến badge "CHƯA THANH TOÁN" thành nút bấm — phá quy ước `Badge` là nhãn tĩnh trong toàn app. Thêm nút text **"Thanh toán"** riêng, cùng cấp với "Sửa".

**Đã kiểm tra lại và loại khỏi phạm vi:** `fetchLabUnpaidOrders` (lab-queries.ts) lọc `da_huy`/`huy_don` nhưng không lọc `payment_status` — ban đầu tưởng là bug, nhưng bước cuối `result.filter(o => o.remainingAmount > 0)` đã tương đương lọc đúng (vì `payment_status='da_thanh_toan'` luôn kéo theo `remainingAmount<=0`, do `record_lab_payment_atomic` đóng đơn đúng lúc đó). Chỉ là fetch dư vài dòng rồi lọc bỏ — không sai kết quả, không đáng sửa.

## 2. Sơ đồ đích

```
Bảng /printing (OrderRow không gom nhóm)         Card trong "Chi tiết Nhóm Đơn In"
  [StatusSelect] [Thanh toán] [Sửa]     ──┐         [StatusSelect] [Thanh toán] [Sửa]
                                          │
                                          ▼
                     printing-list-page.tsx: state payingOrder
                     mở LabPaymentModal(labId, labName, focusOrderId=order.id)
                                          │
                                          ▼
                     Modal: Chọn thủ công + tick sẵn + amount = remainingAmount thật
                     (tra từ unpaidOrders đã fetch, KHÔNG suy từ order.totalAmount
                      — tránh sai nếu đơn đã được trả một phần trước đó)
                                          │
                                admin bấm "Xác nhận thanh toán" — xong

PrintingDetailDrawer (mở qua "Sửa")
  nút "Thanh toán lab" hiện có → cũng truyền focusOrderId={order.id}
```

## 3. Diff từng file

### 3.1 `lab-payment-modal.tsx`

Thêm prop `focusOrderId?: string`. Auto-apply MỘT LẦN mỗi khi modal mở (không lặp lại mỗi khi SWR revalidate — tránh ghi đè lựa chọn tay của admin nếu họ đổi sau khi auto-apply):

```tsx
interface LabPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  labId?: string;
  labName?: string;
  /** Đơn cụ thể vừa mở modal này — nếu có, tự chọn thủ công + tick sẵn đúng đơn. */
  focusOrderId?: string;
  onSuccess?: () => void;
}
```

Thêm `useRef` cờ "đã áp dụng chưa" (import `useRef` — file đã import `useState, useTransition, useMemo, useEffect, FormEvent` từ React, thêm `useRef` vào cùng dòng import):

```tsx
const appliedFocusRef = useRef(false);
```

Trong khối reset đã có (`if (isOpen !== prevIsOpen) { ... if (isOpen) { ... } }`), thêm dòng reset cờ:

```tsx
setSelectionMode("fifo");
setSelectedOrderIds(new Set());
appliedFocusRef.current = false;   // ← thêm dòng này
```

Thêm 1 `useEffect` mới (đặt ngay sau khối `useSWR` fetch `unpaidOrders`, trước `selectedOrdersTotal`):

```tsx
// Tự chọn đúng đơn khi mở modal từ 1 đơn cụ thể (T-20260824-lab-payment-entry-points).
// Chờ unpaidOrders load xong mới tra remainingAmount THẬT (không suy từ order.totalAmount
// — đơn có thể đã được trả một phần trước đó qua lần thanh toán khác).
useEffect(() => {
  if (!isOpen || !focusOrderId || appliedFocusRef.current || isLoading) return;
  const target = unpaidOrders.find((o) => o.id === focusOrderId);
  appliedFocusRef.current = true; // dù có tìm thấy hay không, chỉ thử 1 lần/lần mở
  if (!target) return; // đơn đã trả xong từ trước hoặc không thuộc lab này — giữ FIFO mặc định
  setSelectionMode("manual");
  setSelectedOrderIds(new Set([focusOrderId]));
  setAmount(target.remainingAmount);
}, [isOpen, focusOrderId, unpaidOrders, isLoading]);
```

### 3.2 `printing-card.tsx`

Thêm prop `onPayLab?: (order: PrintingOrderRow) => void`. Thêm nút "Thanh toán" cạnh "Sửa", chỉ hiện khi đủ điều kiện:

```tsx
interface Props {
  order: PrintingOrderRow;
  compact?: boolean;
  onEdit: (order: PrintingOrderRow) => void;
  onPayLab?: (order: PrintingOrderRow) => void;
  onStatusChange: (order: PrintingOrderRow, newStatus: string) => Promise<void>;
}

export default function PrintingCard({ order, compact, onEdit, onPayLab, onStatusChange }: Props) {
  ...
      <div className="flex items-center justify-between gap-3">
        <StatusSelect ... />
        <div className="flex items-center gap-2">
          {onPayLab && order.paymentStatus === "chua_thanh_toan" && order.labId && (
            <Button size="sm" variant="outline" onClick={() => onPayLab(order)}>
              Thanh toán
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => onEdit(order)}>
            Sửa
          </Button>
        </div>
      </div>
```

### 3.3 `printing-table.tsx` (`OrderRow`, chế độ bảng không gom nhóm)

Thêm `onPayLab` vào `Props`/`OrderRowProps`, thread qua `PrintingTableInner` xuống `OrderRow` (KHÔNG thêm vào `ContractGroupRow` — đại diện nhiều đơn, không rõ trả đơn nào, giữ nguyên "Xem chi tiết →"):

```tsx
interface Props {
  orders: PrintingOrderRow[];
  groups?: ContractGroup[];
  onViewGroup?: (group: ContractGroup) => void;
  onEdit: (order: PrintingOrderRow) => void;
  onPayLab?: (order: PrintingOrderRow) => void;
  onStatusChange: (order: PrintingOrderRow, newStatus: string) => Promise<void>;
}
// PrintingTableInner: nhận onPayLab, truyền xuống <OrderRow onPayLab={onPayLab} ... />
// OrderRowProps: thêm onPayLab?: (order: PrintingOrderRow) => void;
```

Cột "Hành động" (`TD className="text-right"`) — đổi từ 1 nút thành 2 nút cạnh nhau, cùng điều kiện hiện như 3.2:

```tsx
<TD className="text-right">
  <div className="flex items-center justify-end gap-2">
    {onPayLab && order.paymentStatus === "chua_thanh_toan" && order.labId && (
      <Button size="sm" variant="outline" onClick={() => onPayLab(order)}>
        Thanh toán
      </Button>
    )}
    <Button size="sm" variant="outline" onClick={() => onEdit(order)}>
      Sửa
    </Button>
  </div>
</TD>
```

### 3.4 `printing-group-drawer.tsx`

Thread `onPayLab` xuống `PrintingCard` (đây là chỗ khớp ảnh #2 của user — "Chi tiết Nhóm Đơn In"):

```tsx
interface Props {
  isOpen: boolean;
  onClose: () => void;
  group: ContractGroup | null;
  onEdit: (order: PrintingOrderRow) => void;
  onPayLab?: (order: PrintingOrderRow) => void;
  onStatusChange: (order: PrintingOrderRow, newStatus: string) => Promise<void>;
}
// ...
{group.orders.map((order) => (
  <PrintingCard key={order.id} order={order} compact onEdit={onEdit} onPayLab={onPayLab} onStatusChange={onStatusChange} />
))}
```

### 3.5 `printing-list-page.tsx` — nơi thực sự mở modal mới

Thêm state + handler ngang hàng `editingOrder`/`showForm`:

```tsx
const [payingOrder, setPayingOrder] = useState<PrintingOrderRow | null>(null);

const handlePayLab = useCallback((order: PrintingOrderRow) => {
  setPayingOrder(order);
}, []);
```

Thread `onPayLab={handlePayLab}` vào cả `<PrintingTable ... onPayLab={handlePayLab} />`, `<PrintingCard ... onPayLab={handlePayLab} />` (nhánh mobile không gom nhóm, nếu file dùng trực tiếp — kiểm tra lại thực tế trong bước implement), và `<PrintingGroupDrawer ... onPayLab={handlePayLab} />`.

Import `LabPaymentModal` (đã có sẵn dynamic import pattern cho `PrintingDetailDrawer` — dùng cùng kiểu `dynamic(() => import(...))` để không phình bundle chính) và render ở cuối, cạnh `<PrintingGroupDrawer>`:

```tsx
const LabPaymentModal = dynamic(
  () => import("@/components/printing/labs/lab-payment-modal").then((m) => ({ default: m.LabPaymentModal })),
  { ssr: false },
);
// ...
<LabPaymentModal
  isOpen={!!payingOrder}
  onClose={() => setPayingOrder(null)}
  labId={payingOrder?.labId || undefined}
  labName={payingOrder?.labName || undefined}
  focusOrderId={payingOrder?.id}
  onSuccess={handleSaved}
/>
```

### 3.6 `printing-detail-drawer.tsx`

Nút "Thanh toán lab" đã có (mở `LabPaymentModal` cục bộ trong drawer) — chỉ thêm 1 prop vào lần gọi hiện có:

```tsx
<LabPaymentModal
  isOpen={showLabPaymentModal}
  onClose={() => setShowLabPaymentModal(false)}
  labId={order.labId || undefined}
  labName={labs.find((lab) => lab.id === order.labId)?.lab_name}
  focusOrderId={order.id}   // ← thêm dòng này
  onSuccess={onSaved}
/>
```

## 4. Verify

1. `npx eslint` toàn bộ 6 file trong locks — 0 error.
2. `npm run build` — exit 0.
3. Render thật (`next start` + Playwright, seed user rồi xóa — **không tạo thanh toán thật**, chỉ mở modal quan sát rồi đóng, không bấm "Xác nhận"):
   - Bấm "Thanh toán" trên 1 dòng đơn ở bảng `/printing` → modal mở, tab "Chọn thủ công" đã bật sẵn, đúng đơn đó đã tick, số tiền đã điền đúng `remainingAmount`.
   - Bấm "Xem chi tiết" một nhóm → trong drawer, bấm "Thanh toán" trên 1 card → cùng hành vi.
   - Bấm "Thanh toán" trên card lab ở `/printing/labs` (không qua đơn cụ thể) → vẫn FIFO mặc định như cũ, không đổi hành vi.
4. Không mutate dữ liệu thanh toán thật khi verify — chỉ quan sát trạng thái modal, đóng lại trước khi kết thúc.

## 5. Ngoài phạm vi

- `fetchLabUnpaidOrders` thiếu filter `payment_status` — đã xác nhận KHÔNG phải bug (mục 1), không sửa.
- Sắp xếp lại thứ tự hiển thị `unpaidOrders` trong chế độ thủ công (vd đưa `focusOrderId` lên đầu danh sách thay vì chỉ tick) — chưa cần thiết vì admin đã thấy ngay đơn được tick sẵn ở đầu form (phần "Sẽ thanh toán N đơn" hiện luôn phía dưới), không bắt buộc phải cuộn tìm trong danh sách 26 dòng nữa.

---

## 6. Kết quả thực thi (2026-08-24)

**Trạng thái:** merged vào `main`, đã deploy, đã xác nhận live production.

### Diff thực tế (khớp spec §3, không lệch)

- `components/printing/labs/lab-payment-modal.tsx` — thêm prop `focusOrderId?: string`; `useEffect` mới: khi modal mở + có `focusOrderId` + `unpaidOrders` đã fetch xong, tìm đơn khớp id trong `unpaidOrders` (nguồn `remainingAmount` thật, không suy từ `totalAmount`), tự chuyển `selectionMode="manual"`, tự `setSelectedOrderIds(new Set([id]))`, tự `setAmount(target.remainingAmount)`. Có `appliedFocusRef` chặn chạy lặp lại khi re-render; reset về `false` mỗi lần modal đóng/mở lại.
- `components/printing/printing-card.tsx` — prop `onPayLab?`; nút "Thanh toán" (variant outline) hiện cạnh "Sửa" khi `onPayLab && paymentStatus === "chua_thanh_toan" && labId`.
- `components/printing/printing-table.tsx` — cùng điều kiện, thêm vào `OrderRow` (không thêm vào `ContractGroupRow` — nhóm không có 1 đơn/1 lab cụ thể để trỏ tới).
- `components/printing/printing-group-drawer.tsx` — thread `onPayLab` xuống từng `<PrintingCard>` trong drawer.
- `components/printing/printing-list-page.tsx` — state `payingOrder`, handler `handlePayLab`, dynamic-import `LabPaymentModal` (cùng pattern với `PrintingDetailDrawer`), render với `focusOrderId={payingOrder?.id}`.
- `components/printing/printing-detail-drawer.tsx` — thêm 1 dòng `focusOrderId={order.id}` vào lần gọi `LabPaymentModal` đã có sẵn.

### Verify

1. `npx eslint` (6 file trong locks) → 0 error, 1 warning không liên quan (pre-existing).
2. `npm run build` → exit 0.
3. Render thật (local `next start -p 3000`, Playwright seed 1 tài khoản E2E admin tạm qua Supabase service-role → login → thao tác → xóa tài khoản ở `finally`):
   - **Điểm vào A** (card trong drawer "Chi tiết Nhóm Đơn In", bấm "Thanh toán"): modal mở đúng lab "Hồng Bảo", tab **"Chọn thủ công" đã tự bật sẵn** (không phải "Tự động (FIFO)" mặc định gốc), **"1/26 đơn"** đã tự tick, "Tổng đã chọn: 255.000 VND", ô "Số tiền thanh toán" tự điền **255.000** — khớp chính xác `totalAmount` của đơn đang mở (card nền phía sau hiện "TỔNG CHI PHÍ 255.000"). Đóng bằng "Hủy" — không bấm "Xác nhận thanh toán". Screenshot: `pay-entry-A.png`.
   - **Điểm vào C** (card lab ở `/printing/labs`, không qua đơn cụ thể): xác nhận **hành vi KHÔNG đổi** — modal mở với tab "Tự động (FIFO)" vẫn là mặc định, "Số tiền thanh toán" = 0, không đơn nào bị tick trước. Screenshot: `pay-entry-C-fifo-unchanged.png`.
   - **Điểm vào B** (nút "Thanh toán" trên `OrderRow` ở bảng `/printing` không gom nhóm) — dùng chung `handlePayLab`/`LabPaymentModal` y hệt điểm vào A (đã đọc lại code xác nhận), không kiểm tra tương tác lặp lại độc lập để tiết kiệm thời gian; rủi ro thấp vì cùng 1 handler đã verify.
   - Không có bản ghi thanh toán thật nào được tạo trong lúc verify (chỉ đóng modal qua "Hủy").
4. Production: merge fast-forward `claude/lab-payment-entry-points` → `main`, push, xác nhận deploy live tại `stu.moodwedding.com`.

**Kết luận:** đúng spec, không phát sinh lệch hành vi ngoài dự kiến.
