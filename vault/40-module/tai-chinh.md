---
title: "Module Tài chính"
tags: [module, tai-chinh]
cap-nhat: 2026-08-07
---

# Module Tài chính

Module **nhiều màn hình nhất** (17 route, 116 component). Chỉ `admin` và `manager` vào được.

## Route

| Nhóm | Route |
|---|---|
| Tổng quan | `/finance`, `/finance/dashboard`, `/finance/cashflow` |
| Chứng từ | `/finance/receipts` (+ `[id]`, `[id]/print`), `/finance/expenses` (+ `[id]`, `[id]/print`) |
| Công nợ | `/finance/debts` (phải thu) · `/finance/payables` (phải trả: lab · thợ · NCC phôi — ADR-016 M2; `lab-debts`/`vendor-debts` redirect về đây) |
| Kế hoạch | `/finance/budget`, `/finance/goals`, `/finance/fixed-costs`, `/finance/investments` |
| Vận hành | `/finance/closes` (+ `[id]`), `/finance/categories`, `/finance/salaries` |

## Nguyên tắc số 1: số tiền luôn từ server

- **`revalidatePath` GIỮ NGUYÊN 100%.** Bỏ đi = số hiển thị cũ. Đây là ràng buộc cứng của dự án.
- `FinanceRealtimeRefresh` chỉ là **chuông báo tầng READ** — nghe tín hiệu → `router.refresh()` → trang `force-dynamic` render lại số từ server. Nó **không thay** `revalidatePath` và **không patch** cache tiền.
- **Tiền không bao giờ chảy qua realtime payload.** Bảng finance không vào publication, không grant — chỉ đẩy tín hiệu mỏng. → [[cache-va-realtime]]
- Không optimistic cho bất kỳ con số nào server tính lại.

## Khoá sổ theo tháng

Hàm `is_period_locked(p_date)`:
```sql
EXISTS (SELECT 1 FROM finance_monthly_closes
        WHERE period = to_char(p_date,'YYYY-MM') AND status='locked')
```
Kỳ khoá theo chuỗi `YYYY-MM`. Quy trình khoá đi qua `finance_close_tasks` + `advance_close_task`.
Hiện thực tế mới có **1 dòng** trong `finance_monthly_closes` — tính năng đã dựng nhưng dùng còn ít.

## Optimistic locking (đã có sẵn — đừng xây lại)

Kiểm tra 2026-06-10 cho thấy cơ chế chống ghi đè **đã tồn tại** ở hầu hết chứng từ:

| Action | Cơ chế |
|---|---|
| `updateReceipt` | **2 lớp** — app check + `UPDATE … eq("updated_at")` + bắt 0-row (mạnh nhất) |
| `updateExpense`, `updateGoal`, `updateInvestment`, `updateDebt` | app check `expectedUpdatedAt` |
| `updateFixedCost` | đã bổ sung theo mẫu receipts |

**Luật khi sửa Finance:** action update chứng từ **phải giữ khoá `updated_at`**. Thêm field mới vào form thì nhớ truyền `updated_at` kèm — quên là mất khoá.

Chống double-submit: mọi form finance đã `disabled={saving}` + đóng modal ngay.

## Phiếu chi = tiền thật (ADR-016, 2026-08-25)

`expenses` **chỉ** ghi khi tiền rời két — không còn dòng "trích trước" cho lab/thợ ngoài. Cột mới: `payee_type` (`lab`·`vendor`·`supplier`·`employee`·`other`), `payee_id`; bảng mới **`expense_allocations`** phân bổ phiếu chi vào đơn in / task / lô nhập / kỳ lương. `payee_type='other'` = chi trực tiếp (vào lợi nhuận); có phân bổ = trả nợ (không phải chi phí mới). Trả đối tác đi qua **một** RPC `record_payee_payment_atomic` (wrapper `record_lab_payment_atomic` cho `/printing`). Công nợ phải trả hợp nhất: `finance_payable_summary()` → màn `/finance/payables`. Lợi nhuận HĐ: `contract_financials(uuid[])` — nguồn duy nhất. Ngày ghi sổ theo ngày nhập trên phiếu, không theo `updated_at`. Chi tiết: [[luong-tien]].

## Ba số, một bộ sổ (ADR-016 M2, 2026-08-26)

Dashboard `/finance` hiện đúng 3 khối, mỗi khối một câu hỏi, **không trộn**:

| Khối | Câu hỏi | Nguồn | Ngày |
|---|---|---|---|
| **Két** | tháng này tiền vào/ra két bao nhiêu | `payments` + `receipts` (lẻ) − `expenses` (mọi payee) | ngày phiếu |
| **Lãi/lỗ** | tháng này lời hay lỗ | `contracts.total_amount` chụp trong tháng + bán lẻ − task (mọi task không huỷ, cùng luật `contract_financials`) − đơn in − COGS − chi `other` | ngày chụp / sự kiện / `order_date` / phiếu xuất / phiếu chi |
| **Công nợ** | ai nợ ai | `remaining_amount` (phải thu — tách **đã giao chưa thu** / **chờ giao** theo `giao_san_pham`, M3) · `finance_payable_summary()` (phải trả: lab · thợ · NCC · **ekip** theo task, M3) | hiện tại |

Drawer **"Lợi nhuận HĐ"** (`components/finance/dashboard/profit-detail-drawer.tsx`, mở từ `/finance`, `/reports`, cột Lợi nhuận `/contracts`) dùng **cùng khung** với drawer vận hành hợp đồng: `Drawer` mặc định 480px, header = mã HĐ + badge trạng thái, thẻ khách hàng + pill NGÀY CHỤP/NGÀY KÝ, thẻ LỢI NHUẬN theo ngữ pháp thẻ THANH TOÁN; số lấy từ `contract_financials` qua `getContractFinanceDetails` (T-20260826-profit-drawer-align). Đừng đặt `size="lg"` cho drawer nào mở cạnh drawer hợp đồng.

Một hàm sổ kỳ **`finance_period_ledger(start, end)`** là nguồn chung cho `finance_month_summary` (3 khối), `finance_pnl_by_month` (chart 12 tháng), `finance_reports_snapshot` (`/reports`, Moodie) và `finance_cashflow_timeline` — `verify:reports` assert 4 hàm cho cùng số. `finance_dashboard_metrics` và `finance_revenue_by_month` **đã DROP** (két bị gọi là "lợi nhuận", tiền thu bị gọi là "doanh thu"). `fixed_costs` và `monthly_salaries.total_salary` **không** phải tiền → không vào két; chi phí cố định thật = phiếu chi `[Auto-Fixed]`, lương cứng = `employee_salaries.monthly_salary` (0 hiện tại; M5). Chi tiết luật ngày: [[luong-tien]].

## Bảng

[[luoc-do-tai-chinh]] — 17 bảng. Đáng nhớ:

- `payments` + `payment_plans` + `payment_plan_allocations` — thanh toán hợp đồng
- `receipts` (phiếu thu) · `expenses` (phiếu chi, tiền thật) · `expense_allocations` (phân bổ)
- `lab_payments`, `lab_payment_allocations`, `vendor_payments`, `vendor_payment_allocations` — **đã drop** (4 view + 4 bảng `_legacy`, M2b 26/08/2026, `supabase/migrations/20260826130000_cashflow_m2b_drop_legacy.sql`); dữ liệu đã di trú vào `expenses` + `expense_allocations` từ M1, bản sao `docs/reports/backup_2026-08-26_*.json`
- `debts` · `credit_cards` · `fixed_costs`
- `financial_goals` + `goal_contributions` · `budgets`
- `finance_monthly_closes` + `finance_close_tasks`
- `transaction_categories` — danh mục thu/chi
- `investments` + `investment_maintenance_logs`

`payment_plans` có **view `payment_plan_states`** đi kèm — khi hai bên lệch, view là bản dẫn xuất, bảng là gốc.

## RPC chính

Đọc: `finance_month_summary` (3 khối), `finance_pnl_by_month`, `finance_period_ledger` (sổ kỳ dùng chung), `finance_reports_snapshot`, `finance_cashflow_timeline`, `finance_ledger` / `finance_ledger_range`, `finance_payable_summary` (lab · thợ · NCC · ekip), `payable_items`, `payee_payment_history`, `vendor_cost_report`, `finance_debt_stats` (M3: phải thu = hợp đồng theo mốc giao), `finance_pending_collections` (M3/M4: cả card "Cần thu tiền" trên `/dashboard` — `lib/api/dashboard.ts` `queryPaymentReminders`, service role — đọc hàm này: đã giao lên đầu = đến hạn, còn lại chờ giao), `get_receivable_aging` (M3: `not_delivered` + tuổi nợ từ ngày giao), `get_finance_intelligence`, `get_cashflow_forecast`, `get_budget_vs_actual`, `get_expense_breakdown`.

Ghi: `process_contract_payment_v2`, `void_contract_payment_v2`, `create_sale_receipt_atomic`, `record_payee_payment_atomic`, `void_payee_payment_atomic`, `contribute_to_goal`, `undo_contribution_atomic`, `advance_close_task`.

Danh sách đầy đủ + cảnh báo `SECURITY DEFINER`: [[rpc-va-enum]]

## Bẫy đã cháy

**Chi phí vendor bị đếm thiếu suốt gần 3 tuần.** `CASE` ép enum `work_type` sang `'hau_ky_phim'` → lỗi `22P02`, **lỗi bị nuốt** → accrual expense chết âm thầm từ 28/05, phát hiện 15/06.
Hai bài học: (1) **query data trước khi tin giả thuyết "double-count"**; (2) `CASE` trên enum phải ép `enum::text`.

## Liên quan

[[luong-tien]] · [[hop-dong]] · [[nha-cung-cap]] · [[in-an-lab]] · [[nhan-su]] · [[cache-va-realtime]]
