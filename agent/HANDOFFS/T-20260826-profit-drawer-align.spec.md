# T-20260826-profit-drawer-align — Drawer "Lợi nhuận HĐ" về cùng khung với drawer vận hành hợp đồng (480px, cùng ngữ pháp thị giác), sửa 4 điểm lệch ADR-016

**Owner:** claude (fallback) · **Trạng thái:** spec — chờ user gật · **Branch:** `claude/profit-drawer-align` · **Module:** tai-chinh (component) + hop-dong (nơi mở) · **Không đụng DB.**

**Bối cảnh (user 26/08):** trên `/contracts`, bấm mã HĐ mở drawer vận hành (`components/contracts/contract-drawer.tsx`, `Drawer` mặc định **480px**); bấm cột Lợi nhuận mở `components/finance/dashboard/profit-detail-drawer.tsx` (`size="lg"` = **600px**, header/nhãn/khối theo kiểu cũ) → hai cửa sổ lệch nhau, "rối với người vận hành chuyên nghiệp". User chọn **hướng A**: giữ 2 drawer (2 việc), nhưng **thống nhất UI, nhất là chiều ngang**.

**Locks:**
- `components/finance/dashboard/profit-detail-drawer.tsx` (viết lại UI)
- `app/actions/finance-dashboard-queries.ts` — chỉ `getContractFinanceDetails`
- `types/finance-dashboard.ts` — chỉ `ContractProfitDetailData`, `PersonalTask`
- `tests/e2e/cashflow-m2.spec.ts` — thêm bước UI mở drawer lợi nhuận từ `/contracts`

**KHÔNG đụng:** `contract-drawer.tsx` / `drawer-tab-content.tsx` (chuẩn tham chiếu), `Drawer` SSOT, `profit-report-table.tsx`, `contracts-list-client.tsx` (nơi mở drawer giữ nguyên), RPC.

---

## 0. Mục tiêu đo được
1. Hai drawer mở trên `/contracts` cùng **480px** desktop (`Drawer` không truyền `size`), cùng bottom-sheet 85vh ở phone.
2. Header giống nhau: **title = mã HĐ** (không còn "Lợi nhuận HĐ: …"), **badge trạng thái** cùng nhãn/màu với drawer vận hành (`CONTRACT_STATUS_MAP` — "Chờ xử lý", không phải "CHỜ XỬ LÝ" của `financeStatusLabel`), nút đóng SSOT.
3. Khối đầu = **thẻ khách hàng** y hệt drawer vận hành (avatar chữ cái, tên, SĐT/địa chỉ) + 2 pill **NGÀY CHỤP** / **NGÀY KÝ** (thay "Ngày ký: …" — luật ngày ADR-016 §2).
4. Khối **LỢI NHUẬN** theo đúng ngữ pháp thẻ THANH TOÁN (caption uppercase + % bên phải, 3 cột chia vạch, thanh tiến độ) — số lấy từ **`contract_financials`** (một nguồn), không cộng lại phía client.
5. "Chi phí Lương" → **"Chi phí nhân sự"**, mỗi dòng ghi rõ `Ekip: <tên>` / `Thợ ngoài: <tên>` + chip trạng thái (Đang làm / Hoàn thành / Chưa làm) — task đang làm vẫn tính (cam kết, ADR-016 §3).
6. "Khuyến mãi −0 VND" → `0 VND` khi 0, `−x VND` khi > 0.
7. Footer nút **"Chi tiết hợp đồng"** (`btn btn-primary w-full`, `ExternalLink`) → `/contracts/[id]` như drawer vận hành.

## 1. Dữ liệu — `getContractFinanceDetails` (`finance-dashboard-queries.ts`)
- Select HĐ thêm: `work_date, contract_date, paid_amount, remaining_amount, customers(full_name, phone, address)`.
- Thêm vào `Promise.all`: `supabase.rpc("contract_financials", { p_contract_ids: [contractId] })` → dòng đầu.
- Tasks select thêm `status` (đã có `vendor_id, employees(full_name), vendors(full_name)`).
- Trả về (`types/finance-dashboard.ts`):
```ts
export interface PersonalTask {
  id: string; work_type: string; cost: number;
  status: string;                       // chua_lam | dang_lam | hoan_thanh
  assignee_name: string | null;         // tên NV hoặc thợ ngoài
  is_vendor: boolean;
}
export interface ContractProfitDetailData {
  contract: {
    id: string; contract_code: string; status: string;
    customer_name: string; customer_phone: string | null; customer_address: string | null;
    contract_date: string | null; work_date: string | null;
    total_amount: number; discount: number; subtotal: number;
    paid_amount: number; remaining_amount: number;
    created_at: string;                 // giữ cho tương thích (= contract_date fallback created_at)
  };
  financials: { revenue: number; task_cost: number; print_cost: number; cogs: number; direct_cost: number; total_cost: number; profit: number; profit_margin: number };
  details: ContractDetail[]; tasks: PersonalTask[]; orders: ProductionOrder[]; expenses: OperationalExpense[]; inventory: InventoryCostItem[];
}
```
`PersonalTask.employees` bị bỏ — chỉ drawer này dùng (grep xác nhận trước khi sửa).

## 2. UI — `profit-detail-drawer.tsx` (viết lại phần render, giữ SWR/error/skeleton)
`<Drawer isOpen onClose title={contract_code} titleBadge={<Badge variant={CONTRACT_STATUS_MAP[status]?.variant ?? "info"}>{getStatusLabel(status)}</Badge>}>` — **không** `size`. Nội dung `flex flex-col gap-5` (như `DrawerContent`):

1. **Thẻ khách hàng** `card-base p-4`: copy đúng markup avatar 10×10 `bg-primary/10` chữ cái đầu + tên `text-body-sm font-bold` + dòng `text-tiny text-text-muted` Phone/MapPin; bấm tên → `router.push('/contracts/[id]')`. Dưới: 2 pill `flex gap-2 mt-3` — trái `bg-warning/5 border-warning/10` nhãn `NGÀY CHỤP` (`text-tiny font-bold text-warning/70 uppercase`) giá trị `work_date` (`formatFinanceDate`, "—" nếu null); phải `bg-primary/5 border-primary/10` nhãn `NGÀY KÝ` giá trị `contract_date`.
2. **Thẻ LỢI NHUẬN** `card-base p-4`: header `text-caption font-semibold text-text-secondary uppercase tracking-wide` "Lợi nhuận" + phải `text-caption font-black` `{profit_margin}%` (success ≥ 0, error < 0). Lưới 3 cột `flex items-stretch` chia `w-px bg-border/50`: **Doanh thu** `total_amount` · **Chi phí** `total_cost` (error) · **Lợi nhuận** `profit` (success/error, dấu +). Thanh `h-1.5 rounded-full bg-border/30`: fill = `min(100, total_cost/revenue*100)` màu `bg-error/70` (phần chi phí ăn vào doanh thu). Caption dưới: `Đã thu {paid_amount} · Còn lại {remaining_amount}`.
3. **CẤU THÀNH DOANH THU** `card-base p-4`: header caption uppercase + tổng phải `total_amount`; danh sách `divide-y divide-border/50` (tên · `qty × đơn giá` · "(Phát sinh)"); footer lưới 2×2 `text-tiny` nhãn uppercase: Gói / Phát sinh / Khuyến mãi (`discount > 0 ? "−" + formatVnd : formatVnd(0)`, error chỉ khi > 0) / Doanh thu thuần.
4. **CHI PHÍ NHÂN SỰ** `card-base p-4`: tổng = `financials.task_cost` (error). Dòng: `getWorkTypeLabel(work_type)` + sub `Ekip: tên` / `Thợ ngoài: tên` (`is_vendor`) + chip `text-tiny` trạng thái (`Badge` `warning` Đang làm · `success` Hoàn thành · `neutral` Chưa làm). Caption cuối: `Ekip {Σ !is_vendor} · Thợ ngoài {Σ is_vendor}`. Empty → `CompactEmptyState` "Chưa giao việc có chi phí".
5. **CHI PHÍ IN ẤN** — tổng `financials.print_cost`; dòng giữ như hiện tại (`Số lượng · ST`).
6. **GIÁ VỐN VẬT TƯ** — tổng `financials.cogs`.
7. **CHI TRỰC TIẾP KHÁC** — tổng `financials.direct_cost`; dòng mô tả + ngày.
8. Footer `pt-2`: `Button unstyled className="btn btn-primary w-full gap-2"` `ExternalLink` "Chi tiết hợp đồng" → `router.push('/contracts/[id]')` (không `onClose` trước push — cùng lý do ghi ở `contract-drawer.tsx:162`).

Bỏ `ProfitDetailSection` icon-heading kiểu cũ và thẻ "Stripe style" `bg-bg-sidebar/50`; số tiền dùng `formatVnd`; ngày `formatFinanceDate`. Không dùng `financeStatusLabel/Variant` cho trạng thái HĐ (đó là nhãn finance, uppercase).

## 3. Verify
- `npx tsc --noEmit` · `npx eslint` 3 file · `npm run build`.
- Playwright (`--workers=1`, local `next start` :3100 rồi prod): mở rộng `cashflow-m2.spec.ts` test UI — sau `/finance/payables`: `page.goto('/contracts')` → dòng seed `s.contractCode` → bấm ô lợi nhuận `row.getByText(/\+3\.500\.000/)` → drawer: `getByRole('dialog')` chứa `s.contractCode`, "Ngày chụp", "05/07/2026", "Chi phí nhân sự", "Thợ ngoài", "+3.500.000"; đo `boundingBox().width` của dialog desktop = **480** ± 1; đóng → bấm "Chi tiết hợp đồng"? (không — chỉ đo width) → mở drawer vận hành cùng dòng ("Chi tiết" / mã HĐ) → width = 480.
- Screenshot desktop 1366 + phone 375 hai drawer cạnh nhau (scratchpad) → xem bằng mắt trước push.
- `npm run verify:contracts` (không đổi hành vi, chỉ chắc không vỡ import).

## 4. Docs sau khi xanh
`vault/40-module/tai-chinh.md` (mục "Ba số": drawer lợi nhuận = 480px, cùng khung drawer HĐ; số từ `contract_financials`), `agent/TASKS.yaml`, `agent/CURRENT_STATE.md`. Không cần ADR.

## 5. Kết quả (2026-08-26, branch `claude/profit-drawer-align`)

| Gate | Kết quả |
|---|---|
| Code | `profit-detail-drawer.tsx` viết lại (Drawer mặc định 480px, header mã HĐ + `Badge` `CONTRACT_STATUS_MAP`, thẻ khách hàng + pill NGÀY CHỤP/NGÀY KÝ, thẻ LỢI NHUẬN theo ngữ pháp THANH TOÁN, 5 thẻ chi tiết, footer "Chi tiết hợp đồng"); `getContractFinanceDetails` thêm `work_date/contract_date/paid/remaining/customer phone+address`, gọi `contract_financials` (số từ RPC), task thêm `status/assignee_name/is_vendor`; types `PersonalTask`, `ContractFinancials`, `ContractProfitDetailData` |
| `npx tsc --noEmit` · `npx eslint` 4 file · `npm run build` | 0 lỗi (1 lỗi type `TASK_STATUS_MAP` variant `muted` → map sang `neutral`) |
| `npm run verify:contracts` | xanh |
| Playwright local (`next start` :3100, `--workers=1`) | **`cashflow-m2` 3/3** — bước mới: từ `/contracts` bấm ô lợi nhuận → dialog chứa mã HĐ, "Ngày chụp" 05/07/2026, "Thợ ngoài: E2E Thợ M2…", "+3.500.000"; **width dialog = 480**; bấm mã HĐ → drawer vận hành **width = 480** |
| Render | desktop 1366: 2 drawer cùng khung 480px, cùng header/thẻ (ảnh `scratchpad/drawer-{ops,profit}-desktop.png`); phone 375: cùng bottom-sheet, thẻ cùng kiểu (`drawer-{ops,profit}-phone.png`) |
| Production | _(sau merge: chạy `cashflow-m2` trên prod)_ |

Ghi nhận (không sửa trong task): pill trạng thái ở drawer vận hành là `SelectStatus` (đổi được trạng thái, chữ thường + chevron); drawer lợi nhuận dùng `Badge` SSOT (in hoa, chỉ đọc) — cùng màu/nhãn nguồn `CONTRACT_STATUS_MAP`. Muốn giống hệt thì export `ContractStatusBadge` từ `contract-drawer.tsx` và dùng chung (cho phép đổi trạng thái từ drawer lợi nhuận) — cần user quyết vì đụng file ngoài locks.
