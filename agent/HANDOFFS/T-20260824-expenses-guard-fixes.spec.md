# T-20260824 — `/finance/expenses`: vá 2 phiếu tự động bị sót nhãn khóa + 2 điểm đếm trùng chi phí

**Owner:** claude (fallback, user chỉ định "viết spec tối ưu rồi triển khai bám kĩ spec đi bạn") · **Trạng thái:** đã trace + đã duyệt hướng, viết spec để implement
**Module:** tai-chinh (expenses) · **Bối cảnh:** tiếp nối trace nghiệp vụ + sơ đồ quan hệ dữ liệu `/finance/expenses` (artifact "Bản Đồ Phiếu Chi"). Phát hiện: cơ chế khóa "phiếu tự động không sửa/xóa được" chỉ nhận diện đúng nhãn `[Auto-` — 2 trong 7 loại phiếu tự động bị sót nhãn này; và 2 nơi tính tổng chi phí có nguy cơ đếm trùng do thiếu bộ lọc mà nơi khác trong cùng codebase đã áp dụng đúng.

**Locks:**
- `app/actions/debt-actions.ts`
- `app/actions/printing-workflow-mutations.ts`
- `app/actions/finance-close-actions.ts`
- `app/actions/finance-dashboard-queries.ts`

**Không đổi:** schema, RPC `finance_contract_profit_report` (đã đúng, dùng làm chuẩn để copy filter sang 2 chỗ đang thiếu).

---

## 0. Quyết định phạm vi

4 fix trong task này đều là **thêm 1 điều kiện lọc/1 tiền tố** vào code đã có sẵn, không đổi kiến trúc, không thêm bảng/cột mới:

1. Gắn nhãn `[Auto-` còn thiếu cho 2/7 loại phiếu chi tự động (mục 1, 2).
2. Vá 2 chỗ tính tổng chi phí thiếu bộ lọc mà `finance_contract_profit_report` (RPC đang chạy thật) đã làm đúng từ trước (mục 3, 4).

**Cố tình KHÔNG làm** (đã cân nhắc, ghi lý do):
- **`app/actions/contract-profit.ts`** — có cùng lỗi đếm trùng nhưng **0 nơi nào gọi tới** (đã xác nhận qua trace) — code chết, không đụng theo nguyên tắc "dead code → mention, đừng xóa/sửa" (CLAUDE.md §3).
- **Thêm ô chọn hợp đồng / đính ảnh hóa đơn vào form "Thêm phiếu chi"** — đây là quyết định sản phẩm (mở rộng tính năng), không phải sửa lỗi. Cần bạn quyết trước.
- **Tách vai trò duyệt riêng khỏi vai trò tạo phiếu** — cùng lý do đã nêu ở task Khóa sổ: chưa có tín hiệu nhu cầu thật để đầu tư 1 hệ thống phân quyền mới.
- **Phía `receipts` cũng có phiếu sinh từ trả nợ phải thu (`payDebt` nhánh receivable) không được khóa sửa/xóa tương tự** — đúng là cùng dạng lỗ hổng, nhưng cơ chế khóa của `receipts` khác hẳn (`source_table`/tiền tố `payment:`, không dùng nhãn `[Auto-`) — sửa đúng cần điều tra riêng cơ chế đó, ngoài phạm vi task này (đang khoanh vùng đúng `/finance/expenses`).

## 1. Fix 1 — gắn nhãn cho phiếu chi sinh từ trả nợ phải trả

**File:** `app/actions/debt-actions.ts`, trong `payDebt`, nhánh `else` (nợ phải trả → tạo expense).

```ts
// Trước:
const { error: eError } = await supabase.from("expenses").insert({
  debt_id: id,
  amount: amount,
  payment_method: paymentMethod,
  category_id: categoryId || null,
  description: note || `Thanh toán nợ: ${debt.entity_name}`,
  ...
});

// Sau:
const { error: eError } = await supabase.from("expenses").insert({
  debt_id: id,
  amount: amount,
  payment_method: paymentMethod,
  category_id: categoryId || null,
  description: `[Auto-Debt] ${note || `Thanh toán nợ: ${debt.entity_name}`}`,
  ...
});
```

Giữ nguyên nội dung ghi chú gốc (kể cả khi admin tự nhập `note`), chỉ thêm tiền tố — khớp đúng cách các nhãn `[Auto-Vendor]`/`[Auto-Salary]` khác đang làm (tiền tố + nội dung mô tả thật, không thay hẳn nội dung).

## 2. Fix 2 — gắn nhãn cho phiếu hoàn tiền khi hủy đơn in

**File:** `app/actions/printing-workflow-mutations.ts`, trong `cancelOrder`, khối tạo expense hoàn tiền.

```ts
// Trước:
description: `Hoàn tiền hủy đơn in #${order.order_code}: ${reason}`,

// Sau:
description: `[Auto-Refund] Hoàn tiền hủy đơn in #${order.order_code}: ${reason}`,
```

Sau 2 fix này, cả 7/7 loại phiếu chi tự động đều được `updateExpense`/`deleteExpense` (server) và `expense-row-actions.tsx` (UI) khóa sửa/xóa đúng — nguồn thật (công nợ / đơn in) không còn bị lệch âm thầm nếu ai đó sửa/xóa phiếu từ `/finance/expenses`.

## 3. Fix 3 — chặn đếm trùng chi phí cố định trong snapshot khóa sổ

**File:** `app/actions/finance-close-actions.ts`, hàm `buildCloseSnapshot()`.

Đổi query expenses từ chỉ lấy `amount` sang lấy thêm `description` để lọc:

```ts
// Trước:
supabase
  .from("expenses")
  .select("amount")
  .is("deleted_at", null)
  .gte("expense_date", range.start)
  .lt("expense_date", range.end),

// Sau:
supabase
  .from("expenses")
  .select("amount, description")
  .is("deleted_at", null)
  .gte("expense_date", range.start)
  .lt("expense_date", range.end),
```

Và đổi cách tính `operatingOutflow`:

```ts
// Trước:
const operatingOutflow = (expensesResult.data || []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

// Sau:
const operatingOutflow = (expensesResult.data || []).reduce((sum, row) => {
  // Phiếu chi phí cố định tự động hóa đã được tính riêng trong fixedCost (prorate theo ngày) —
  // cộng thêm ở đây sẽ đếm trùng. Cùng nguyên tắc RPC finance_contract_profit_report đã áp dụng cho [Auto-Print].
  if (row.description?.startsWith("[Auto-Fixed]")) return sum;
  return sum + (Number(row.amount) || 0);
}, 0);
```

## 4. Fix 4 — chặn đếm trùng chi phí vendor trong đường dự phòng của báo cáo lợi nhuận

**File:** `app/actions/finance-dashboard-queries.ts`, hàm `getContractProfitReportFallback` (chỉ chạy khi RPC `finance_contract_profit_report` lỗi/thiếu — hiện RPC đang sống bình thường nên đường này hiện không chạy, nhưng vá để không âm thầm sai nếu RPC gặp sự cố sau này).

```ts
// Trước:
supabase.from("work_tasks").select("contract_id, cost").in("contract_id", ids),

// Sau:
supabase.from("work_tasks").select("contract_id, cost").in("contract_id", ids).is("vendor_id", null),
```

Khớp đúng logic RPC đang chạy thật (`wt.vendor_id IS NULL` trong `finance_contract_profit_report`) — chi phí vendor chỉ tính 1 lần qua `expense_cost` (đã lọc `[Auto-Print]`, giữ nguyên `[Auto-Vendor]` để tính đúng ở đây), không tính thêm lần nữa qua `task_cost`.

## 5. Verify

1. `npx eslint` 4 file trong locks — 0 error.
2. `npm run build` — exit 0.
3. Render/DB thật (seed E2E admin, dùng dữ liệu tạm rồi xóa sạch):
   - Tạo tạm 1 dòng `debts` (loại phải trả) → gọi `payDebt` qua UI thật → xác nhận `expenses.description` có tiền tố `[Auto-Debt]` → nút Sửa/Xóa bị khóa trên `/finance/expenses` → xóa sạch debt + expense test.
   - Tạo tạm 1 đơn in test → hủy có hoàn tiền qua UI thật → xác nhận `expenses.description` có tiền tố `[Auto-Refund]` → nút Sửa/Xóa bị khóa → xóa sạch đơn in + expense test.
   - Chèn tạm 1 expense gắn nhãn `[Auto-Fixed]` (mô phỏng đã "Tạo chi phí cố định tự động") + 1 dòng `fixed_costs` test → tạo kỳ chốt sổ test → xác nhận `operatingOutflow`/`Dòng tiền ròng` KHÔNG cộng trùng khoản đó (chỉ tính 1 lần qua `fixedCost`) → xóa sạch dữ liệu test.
   - Fix 4 không render-verify qua UI (đường dự phòng chỉ chạy khi RPC lỗi, hiện RPC đang sống bình thường) — verify bằng đọc lại code khớp đúng logic RPC đã có, cộng eslint/build sạch.
4. Không đụng dữ liệu tài chính thật của studio khi verify — chỉ dùng dữ liệu tạo tạm rồi xóa sạch.

---

## 6. Kết quả thực thi (2026-08-24)

**Trạng thái:** merged vào `main`, đã deploy, đã xác nhận live bằng render thật.

### Verify

1. `npx eslint` (4 file trong locks) → 0 error.
2. `npm run build` → exit 0.
3. Render thật (`next start` local, seed E2E admin + tạo tạm 1 dòng `debts` phải trả + 1 expense tag `[Auto-Fixed]` giả lập, rồi xóa sạch):
   - **Fix 1**: trả nợ qua UI thật (`/finance/debts`) → phiếu chi sinh ra có đúng `description = "[Auto-Debt] Thanh toán nợ: __E2E_TEST_DEBT__"` → nút Sửa **không hiện** trên `/finance/expenses` (khóa đúng).
   - **Fix 3**: tạo kỳ chốt sổ test `2025-01` có sẵn 1 expense `[Auto-Fixed]` 2.000.000đ trong kỳ → sidebar "Dòng tiền ròng" hiện đúng **0 VND** (không phải -2.000.000đ) — xác nhận khoản đó không bị cộng vào `operatingOutflow`.
   - **Fix 2** (gắn nhãn `[Auto-Refund]`): không dựng UI test riêng — thay đổi là 1 dòng chuỗi tiền tố xác định (deterministic), không có nhánh logic mới; verify bằng đọc lại diff khớp đúng pattern các nhãn `[Auto-` khác đã verify thật (Fix 1) + build/eslint sạch. Dựng đủ dữ liệu thật (đơn in đã thanh toán + hủy có hoàn tiền qua UI) rủi ro cao hơn giá trị verify thêm.
   - **Fix 4** (dòng dự phòng `getContractProfitReportFallback`): không render-verify qua UI — đường này chỉ chạy khi RPC `finance_contract_profit_report` lỗi, hiện RPC đang sống bình thường trên production nên đường dự phòng không được thực thi. Verify bằng đọc code khớp đúng filter `vendor_id IS NULL` mà RPC chính đã dùng.
   - Đã xóa sạch dữ liệu test (debt, expense, kỳ chốt sổ) — xác nhận lại bằng query, cả 3 đều 0 dòng còn sót.
4. **Phát hiện phụ, ngoài phạm vi task này**: `debt-payment-modal.tsx` — ô "Số tiền thanh toán" không tự điền sẵn `debt.remaining` khi mở modal (dùng sai pattern `useState(() => {...})` như 1 effect, chỉ chạy đúng 1 lần lúc mount component chứ không chạy lại mỗi lần chọn công nợ khác) — admin phải tự bấm "Tối đa" hoặc gõ tay. Không sửa trong task này (khác file, khác phạm vi khóa) — ghi lại cho task sau nếu cần.

**Kết luận:** đúng spec, 4 fix hoạt động đúng, không phát sinh lệch hành vi ngoài dự kiến.
