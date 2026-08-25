# T-20260825-contracts-list-financials — Thêm Chi phí / Lợi nhuận vào `/contracts` list

## 0. Bối cảnh & yêu cầu

User (screenshot bảng `/contracts`, 10 cột: Mã HĐ, Khách hàng, Ngày ký, Sự kiện, Tổng cộng, Còn nợ,
Thông tin, Tiến độ, Trạng thái, Thao tác): **"table hiển thị thiếu thông tin: Chi phí và lợi nhuận /
tối ưu UI dựng mình xem."**

Trace xác nhận: `get_contract_list_v2` (RPC nuôi `/contracts` list qua `getContractListFromRpc` →
`getContractList`) hiện **không có** field chi phí/lợi nhuận nào. RPC `finance_contract_profit_report`
(nuôi widget "Lợi nhuận theo hợp đồng" ở `/finance/dashboard`) đã tính đúng, có anti-double-count
(loại `work_tasks` có `vendor_id` — vendor cost đã nằm ở `expenses [Auto-Vendor]`; loại `expenses`
`[Auto-Print]%` — đã nằm trong `print_cost` riêng). Tái dùng nguyên công thức đó, không phát minh lại.

## 1. Vấn đề quyền hạn (quan trọng, tự phát hiện khi trace)

`get_contract_list_v2` chỉ gate bằng `requireContractAccess` (module `contracts`). Role `sale` có
`contracts` nhưng **KHÔNG** có `finance` (`types/roles.ts`). Nếu thêm cost/profit vô điều kiện vào
RPC này, **mọi user có quyền xem hợp đồng** (kể cả sale) sẽ nhận được số chi phí nội bộ + biên lợi
nhuận qua payload — kể cả khi UI ẩn cột, số vẫn lộ qua Network tab. Đây là rò rỉ dữ liệu tài chính
nhạy cảm, không phải chỉ là vấn đề UI.

**Quyết định:** RPC luôn tính (rẻ, đã có sẵn 3 LATERAL join tương tự cho `work_tasks`/`checklists`/
`notes`/`events`). Tầng action (`getContractListFromRpc`) nhận thêm `hasFinanceAccess: boolean`
(suy ra từ role đã resolve sẵn ở `requireContractAccess`, không query DB thêm lần nào) — nếu false,
**xóa hẳn** `total_cost`/`profit`/`profit_margin` khỏi từng object trước khi trả về client (không chỉ
set `undefined` — xóa key hẳn để chắc chắn không serialize ra ngoài). UI dựa vào **sự có mặt của key**
để quyết định có render cột Lợi nhuận hay không — không cần truyền `role` riêng qua nhiều lớp component.

## 2. Migration — mở rộng `get_contract_list_v2`

File mới: `supabase/migrations/20260825160000_contract_list_add_financials.sql`.

Thêm 3 LATERAL join (copy nguyên predicate từ `finance_contract_profit_report`,
`supabase/migrations/20260528000002_vendor_expense_profit_fix.sql`) vào CTE `rows`:

```sql
LEFT JOIN LATERAL (
  SELECT SUM(COALESCE(wt.cost, 0)) AS amount
  FROM public.work_tasks wt
  WHERE wt.contract_id = c.id AND wt.vendor_id IS NULL
) task_cost ON TRUE
LEFT JOIN LATERAL (
  SELECT SUM(COALESCE(po.total_amount, 0)) AS amount
  FROM public.printing_orders po
  WHERE po.contract_id = c.id AND po.deleted_at IS NULL
) print_cost ON TRUE
LEFT JOIN LATERAL (
  SELECT SUM(COALESCE(ex.amount, 0)) AS amount
  FROM public.expenses ex
  WHERE ex.contract_id = c.id AND ex.deleted_at IS NULL
    AND (ex.description IS NULL OR ex.description NOT LIKE '[Auto-Print]%')
) expense_cost ON TRUE
```

Thêm vào `jsonb_build_object`:
```sql
'total_cost', COALESCE(task_cost.amount, 0) + COALESCE(print_cost.amount, 0) + COALESCE(expense_cost.amount, 0),
'profit', c.total_amount - (COALESCE(task_cost.amount, 0) + COALESCE(print_cost.amount, 0) + COALESCE(expense_cost.amount, 0)),
'profit_margin', CASE WHEN c.total_amount = 0 THEN 0
  ELSE ROUND(((c.total_amount - (COALESCE(task_cost.amount, 0) + COALESCE(print_cost.amount, 0) + COALESCE(expense_cost.amount, 0))) / c.total_amount) * 100, 1)
  END
```

Toàn bộ phần còn lại của function giữ nguyên 100% (additive, đúng nguyên tắc "file dùng chung chỉ
additive"). JS fallback (`getContractList`'s hand-built query khi RPC lỗi) **không** mở rộng theo —
nhánh này vốn đã thiếu `contract_events` so với RPC (đã là partial-parity path có sẵn), UI xử lý
graceful khi field vắng mặt nên không có state sai.

## 3. Tầng action — `app/actions/contract-queries.ts`

- `getContractListFromRpc(supabase, filters, hasFinanceAccess)`: sau khi map
  `attachChecklistSummaryFromArray`, nếu `!hasFinanceAccess` thì `delete` 3 key
  `total_cost`/`profit`/`profit_margin` khỏi từng contract.
- `getContractList`: đổi `await requireContractAccess(...)` → `const { role } = await
  requireContractAccess(...)`, tính `const hasFinanceAccess = canAccess(role, "finance")`, truyền
  vào `getContractListFromRpc`.
- `getContractPageBootstrap`: cùng thay đổi (gọi `getContractListFromRpc` trực tiếp).
- Import thêm `canAccess` từ `@/types/roles`.

## 4. Type — `types/contract.ts`

Thêm vào `interface Contract` (optional — vắng mặt khi không có quyền finance):
```ts
total_cost?: number;
profit?: number;
profit_margin?: number;
```

## 5. UI — thiết kế "tối ưu" (bảng đã đặc 10 cột, tránh phình rộng)

**Quyết định UI:** Thêm ĐÚNG 1 cột mới "Lợi nhuận" (không phải 2 cột riêng Chi phí + Lợi nhuận) —
gộp Chi phí làm dòng phụ nhỏ bên trong cùng ô, giống pattern đã có sẵn ở `contracts-tablet-table.tsx`
(gộp "Tổng cộng / Còn nợ" 1 ô 2 dòng). Vị trí: chèn giữa "Tổng cộng" và "Còn nợ" (Lợi nhuận phái sinh
trực tiếp từ Tổng cộng, đặt cạnh nhau hợp lý hơn Còn nợ — vốn là khái niệm công nợ khách, khác trục).

Ô hiển thị 2 dòng, tái dùng đúng convention màu/dấu đã có ở `profit-report-table.tsx`
(`item.profit >= 0 ? "text-success" : "text-error"`, dấu `+` khi dương):
```
Chi phí 12.500.000 ₫     (dòng nhỏ, text-muted)
+8.200.000 ₫             (dòng chính, bold, success/error theo dấu)
```

Cột **chỉ render khi** `"profit" in contracts[0]` (helper `hasFinancials()`, dựa trên field có mặt
hay không — không cần truyền role riêng qua props). Không có quyền finance → bảng giữ nguyên 10 cột
như hiện tại, không đổi gì (an toàn tuyệt đối, không cần thử nghiệm thêm điều kiện role ở nhiều nơi).

**Click vào ô Lợi nhuận** (stopPropagation, không kích hoạt `onView` mở drawer chi tiết hợp đồng) →
mở lại **nguyên component đã có** `ContractProfitDetailDrawer`
(`components/finance/dashboard/profit-detail-drawer.tsx`, đang dùng ở `/finance/dashboard`) — breakdown
đầy đủ Lương/In ấn/Kho theo đúng data đã build sẵn qua `getContractFinanceDetails(contractId)`. Không
viết lại logic breakdown — tái dùng 100%. (Component này tự gate `requireFinanceAccess` bên trong nên
an toàn double-checked nếu lỡ tay hiện cột cho role sai.)

### 5.1 Desktop (`contracts-table.tsx` → `DesktopTable`/`DesktopTableRow`)
Thêm `<TH>Lợi nhuận</TH>` sau "Tổng cộng", trước "Còn nợ" (điều kiện `hasFinancials`). Thêm
`onViewProfit?: (id: string) => void` prop, cell `onClick` gọi kèm `e.stopPropagation()`. Memo
comparator thêm so `prev.c.profit === next.c.profit && prev.c.total_cost === next.c.total_cost`.

### 5.2 Tablet (`contracts-tablet-table.tsx`)
Không thêm cột mới (đã rất chật — `min-w-[800px]`, cột sticky 2 đầu). Thêm dòng phụ thứ 3 trong ô
"Tổng cộng / Còn nợ" hiện có: `Lợi nhuận ±X` (nhỏ, màu theo dấu), click riêng dòng này mở drawer.
Chi phí KHÔNG hiện ở tablet (đủ chỗ cho 1 số, không phải 2) — muốn xem chi tiết bấm vào để mở drawer.

### 5.3 Mobile (`contracts-table.tsx` → `MobileCardRow`)
Thêm 1 dòng nhỏ dưới dòng "Tổng tiền" hiện có: `Lợi nhuận: ±X` (màu theo dấu), bấm mở drawer
(stopPropagation so với `onClick` của card).

### 5.4 Container (`contracts-list-client.tsx`)
State mới `selectedProfitContractId`, handler `handleViewProfit` (giống pattern `selectedContractId`
đã có), truyền `onViewProfit={handleViewProfit}` xuống `<ContractsTable>`. Render
`<ContractProfitDetailDrawer contractId={selectedProfitContractId || ""} open={...}
onOpenChange={...} />` cạnh `<ContractDrawer>` hiện có.

## 6. Verify

- `npx eslint <files đổi>` → 0.
- `npx tsc --noEmit` → 0.
- `npm run build` → 0.
- Playwright (seed E2E admin — có quyền finance): render `/contracts`, xác nhận cột Lợi nhuận xuất
  hiện đúng vị trí, số khớp `finance_contract_profit_report` cho cùng hợp đồng (đối chiếu qua
  `node scripts/db-q.mjs`), click ô Lợi nhuận mở đúng `ContractProfitDetailDrawer` breakdown, không
  vô tình mở `ContractDrawer` (stopPropagation hoạt động).
- Playwright thứ 2 (seed E2E role `sale` — KHÔNG có quyền finance): render `/contracts`, xác nhận
  bảng vẫn đúng 10 cột như cũ, KHÔNG có cột Lợi nhuận, và raw network response của
  `getContractList`/`getContractPageBootstrap` KHÔNG chứa `total_cost`/`profit`/`profit_margin` (grep
  response body) — bằng chứng thật cho việc chặn rò rỉ, không chỉ tin tưởng UI ẩn.
- Deploy: `git push origin main` → production, lặp lại 2 verify trên với `BASE_URL=https://stu.moodwedding.com`.

## 7. Kết quả thực thi

_(điền sau khi verify xong)_
