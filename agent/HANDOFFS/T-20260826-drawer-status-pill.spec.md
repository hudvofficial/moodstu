# T-20260826-drawer-status-pill — Một pill trạng thái dùng chung cho drawer vận hành và drawer lợi nhuận (đổi được trạng thái ở cả hai)

**Owner:** claude (fallback) · **Trạng thái:** spec — chờ user gật · **Branch:** `claude/drawer-status-pill` (làm **sau** `T-20260826-drawer-typography-ssot` để không đụng cùng file hai lần) · **Module:** hop-dong + tai-chinh · **Không đụng DB.**

**Bối cảnh.** Sau `T-20260826-profit-drawer-align`, header hai drawer còn khác một chi tiết: drawer vận hành dùng `ContractStatusBadge` (hàm **nội bộ** trong `contract-drawer.tsx`, bọc `SelectStatus variant="compact"` — chấm màu + nhãn + mũi tên, **đổi được trạng thái**, có `ConfirmDialog` cảnh báo nợ/việc dở); drawer lợi nhuận dùng `Badge` chỉ đọc (in hoa). User muốn giống hệt.

**Locks:**
- `components/contracts/contract-status-badge.tsx` (mới — tách từ `contract-drawer.tsx` L221–319, export)
- `components/contracts/contract-drawer.tsx` (xoá hàm nội bộ + 4 import kéo theo, import từ file mới)
- `components/finance/dashboard/profit-detail-drawer.tsx` (dùng pill mới, refresh SWR sau đổi)
- `tests/e2e/cashflow-m2.spec.ts` (bước đổi trạng thái từ drawer lợi nhuận)

**KHÔNG đụng:** `SelectStatus`, `handleContractStatusUpdate` (`lib/contracts/update-contract-status-ui.ts`), `CONTRACT_STATUS_MAP`.

---

## 0. Mục tiêu đo được
1. Header hai drawer render **cùng một component** `ContractStatusBadge`; ảnh @1366 hai pill giống nhau pixel-level (chấm màu, nhãn sentence case, mũi tên).
2. Đổi trạng thái từ drawer lợi nhuận → server ghi (qua `handleContractStatusUpdate` như drawer vận hành, kể cả dialog cảnh báo nợ/việc dở) → pill đổi ngay (optimistic), drawer lợi nhuận **revalidate** số (`finance_contract_details_<id>`), bảng lợi nhuận `/finance` + list `/contracts` cập nhật badge.
3. Không còn `Badge` trạng thái HĐ trong `profit-detail-drawer.tsx`.

## 1. Tách component — `components/contracts/contract-status-badge.tsx`
Chuyển nguyên `ContractStatusBadge` (+ `getStatusVariant`, imports `useState`, `SelectStatus`, `ConfirmDialog`, `handleContractStatusUpdate`, `useQueryClient`, `Badge`, `CONTRACT_STATUS_MAP`, `getStatusLabel`) sang file mới, `export function ContractStatusBadge`. Thêm prop tuỳ chọn:
```ts
interface ContractStatusBadgeProps {
  contractId: string | null;
  currentStatus: string;
  /** Gọi sau khi server xác nhận đổi trạng thái thành công (drawer lợi nhuận dùng để revalidate SWR) */
  onUpdated?: (newStatus: ContractStatus) => void;
}
```
Trong `onUpdate`: `handleContractStatusUpdate` hiện không trả kết quả → đọc `lib/contracts/update-contract-status-ui.ts`; nếu hàm trả `Promise<boolean|void>` thì gọi `onUpdated` khi không rơi vào `onFailure` (đặt cờ `failed` trong closure `onFailure`, sau `await` nếu `!failed` → `onUpdated?.(newStatus)`). Không đổi chữ ký `handleContractStatusUpdate`.
`contract-drawer.tsx`: xoá L214–319 + import không còn dùng; `import { ContractStatusBadge } from "./contract-status-badge"`.

## 2. Drawer lợi nhuận
- `titleBadge = <ContractStatusBadge contractId={contractId} currentStatus={data.contract.status} onUpdated={() => { mutate(swrKey); revalidateByPrefixes(["finance-profit", "finance-dashboard"]); }} />` (`mutate` từ `useSWR` của drawer; `revalidateByPrefixes` từ `@/lib/swr`). Khi `data` chưa có → `contractId` vẫn có → pill hiện trạng thái tạm `"cho_xu_ly"`? **Không** — chỉ render pill khi `data` (tránh nháy sai trạng thái); lúc loading header không badge (như hiện tại).
- Bỏ import `Badge`, `CONTRACT_STATUS_MAP`, `getStatusLabel` nếu không còn dùng.
- `/contracts` list đã tự cập nhật qua `queryClient.invalidateQueries(contractKeys.lists())` trong `handleContractStatusUpdate` (đọc để xác nhận); `/finance` bảng lợi nhuận dùng SWR key `finance-profit:*` → `revalidateByPrefixes(["finance-profit"])`.

## 3. Verify
- `npx eslint` 4 file · `npx tsc --noEmit` · `npm run build`.
- Playwright `cashflow-m2` UI: sau khi mở drawer lợi nhuận của HĐ seed (status `dang_thuc_hien`) → bấm pill → chọn "Hoàn thành" → nếu dialog cảnh báo (HĐ seed còn nợ 5.000.000) → bấm "Đồng ý hoàn thành" → pill hiện "Hoàn thành"; đóng drawer; dòng seed trên `/contracts` badge "HOÀN THÀNH"; DB `contracts.status = 'hoan_thanh'` (cleanup xoá HĐ nên không cần hoàn tác). Drawer vận hành: mở cùng HĐ → pill hiện "Hoàn thành" (cùng component).
- Screenshot header 2 drawer @1366 → artifact.
- `npm run verify:contracts`.

## 4. Docs
`vault/40-module/hop-dong.md` (nếu có mục drawer): `ContractStatusBadge` là SSOT pill trạng thái HĐ, dùng ở cả drawer lợi nhuận. `agent/TASKS.yaml`, `agent/CURRENT_STATE.md`.

## 5. Kết quả
_(điền khi xong)_
