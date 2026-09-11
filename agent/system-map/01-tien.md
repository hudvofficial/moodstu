# Bản đồ kiến trúc — DÒNG TIỀN & TÀI CHÍNH (mood-studio)

> Quy ước đường dẫn: gốc `mood-studio/`. Migration ghi tên file, số dòng là dòng trong file đó.
> Mọi khẳng định đều kèm `file:dòng`. Thứ không có bằng chứng nằm ở §8.
> **Không chạm DB.** Toàn bộ nội dung suy từ file trong repo + `types/database.types.ts` (sinh từ DB thật, mtime 2026-08-26 22:51).

---

## 1. Bảng dữ liệu

| Bảng | Vai trò | Cột quan trọng | AI GHI VÀO | Bằng chứng |
|---|---|---|---|---|
| `payments` | **Tiền VÀO theo hợp đồng** (sổ tiền vào) | `contract_id`, `amount`, `payment_date`, `payment_stage`, `receipt_code`, `deleted_at`, `voided_at/voided_by/void_reason`, `is_contract_adjustment`, `contract_adjustment_item_id` | INSERT: `process_contract_payment_v2` (`20260527120000_fix_payment_race_condition.sql:137-165`) · xoá mềm + `voided_*`: `void_contract_payment_v2` (`20260505093000_contract_payment_flexible_stages.sql:649-655`) · trigger `trg_restore_inventory_on_contract_payment_void` hoàn kho khi xoá mềm (`20260507123000_inventory_contract_addon_reports.sql:115-119`) | schema `vault/30-du-lieu/luoc-do-tai-chinh.md:34-87` |
| `payment_plans` | **Kế hoạch thu — KHÔNG phải tiền** | `contract_id`, `stage_key` (`deposit`/`final`/`outside`), `stage_name`, `amount`, `due_date`, `status`, `sort_order`, `receipt_id` | Sinh: `create_default_payment_schedule_v2` — M4 chỉ còn Cọc + Tất toán (`20260827100000_payment_plans_m4_bo_dot_1_2.sql:73-107`) · đổi status: `process_contract_payment_v2` / `sync_payment_plan_statuses_v2` | `vault/30-du-lieu/luoc-do-tai-chinh.md:89-124` |
| `payment_plan_allocations` | Phân bổ phiếu thu vào đợt (SSOT của `payment_plans.status`) | `contract_id`, `payment_plan_id`, `payment_id`, `amount`; UNIQUE `(payment_plan_id, payment_id)` | INSERT: `process_contract_payment_v2` **bản đang chạy trên DB** (`agent/DECISIONS.md:144`) — file migration mới nhất trong repo KHÔNG có (§8) · DELETE: `void_contract_payment_v2` (`20260505093000:668-670`) | `vault/30-du-lieu/luoc-do-tai-chinh.md:126-153` |
| `expenses` | **SỔ TIỀN RA — chỉ ghi khi tiền rời két** (ADR-016) | `expense_date`, `amount`, `payee_type` (`lab`·`vendor`·`supplier`·`employee`·`other`), `payee_id`, `contract_id`, `category_id`, `approved_by`, `deleted_at`, `legacy_source/legacy_source_id`, (cột chết `printing_order_id`, `work_task_id`, `debt_id`) | INSERT: `record_payee_payment_atomic` (`20260827130000_luong_cung_m5.sql:200-202`) · `createExpense` (`app/actions/expense-actions.ts:67-104`) · `generateMonthlyFixedCosts` → mô tả `[Auto-Fixed]` (`app/actions/expense-actions.ts:259`) · `createContractRefundExpense` (`app/actions/contract-refund-actions.ts:178-192`) · `inventory_stock_in_atomic` gọi lại `record_payee_payment_atomic` (`20260825200000_cashflow_m1_expense_allocations.sql:776-780`). Xoá mềm: `void_payee_payment_atomic` (`20260827130000:261`), `deleteExpense` (`app/actions/expense-actions.ts:197-203`). Cột `payee_type`/`payee_id`/index thêm ở `20260825200000:37-44` | CHECK `payee_type` `20260825200000:43` |
| `expense_allocations` | Phân bổ phiếu chi vào **bản ghi gốc** (biến phiếu chi thành "trả nợ") | `expense_id`, `target_type` ∈ `printing_order`·`work_task`·`inventory_transaction`·`employee_salary`, `target_id`, `amount` | **DUY NHẤT** `record_payee_payment_atomic` (`20260827130000:215` và `224`). Không có đường xoá — huỷ = xoá mềm `expenses`, mọi truy vấn join `expenses.deleted_at IS NULL` | tạo bảng `20260825200000:46-57`; CHECK target_type `vault/30-du-lieu/luoc-do-tai-chinh.md:226` |
| `receipts` | **Tiền VÀO bán lẻ / thu khác** (`contract_id IS NULL` = bán lẻ) | `receipt_date`, `receipt_amount`, `receipt_type`, `contract_id`, `category_id`, `deleted_at` | INSERT: `create_sale_receipt_atomic` (`20260507103000_inventory_sale_stockout_source_contract.sql:314-330`) · bán thêm HĐ: `create_contract_inventory_addon_sale_atomic`. Trigger `trg_restore_inventory_on_receipt_void` (`20260507123000:92-96`) | `vault/30-du-lieu/luoc-do-tai-chinh.md:236-289` |
| `contracts` (cột tiền) | Doanh thu cam kết + công nợ phải thu | `total_amount`, `paid_amount`, `remaining_amount`, `payment_status`, `discount_amount`, `work_date` (ngày chụp), `contract_date` (ngày ký), `status` | `save_contract_atomic`, `recalc_contract_totals` (chỉ được ALTER/GRANT trong repo — `20260421153000_contracts_production_hardening.sql:581,588`; gọi từ `app/actions/dress-mutations.ts:437,553`), `process_contract_payment_v2` (`20260527120000:167-174`), `void_contract_payment_v2` (`20260505093000:691-698`) | — |
| `work_tasks` | **Sổ CAM KẾT** chi phí ekip + thợ ngoài | `cost`, `status` (`hoan_thanh`/`da_huy`…), `vendor_id` (thợ ngoài), `assigned_to` (ekip), `event_id`, `contract_id`, `deadline` | Module Nhân sự / Hợp đồng (`app/actions/work-task-actions.ts`). **Không còn trigger sinh phiếu chi** — `work_task_vendor_expense_sync` + `trg_sync_vendor_expense` + `upsert_vendor_expense` đã DROP (`20260825200000:175-178`) | — |
| `printing_orders` | **Sổ CAM KẾT** chi phí lab | `total_amount`, `order_date`, `status`, `payment_status` (**dẫn xuất**), `lab_id`, `contract_id` | Tạo/sửa: `create_printing_order_atomic` (`20260825200000:645`, **không** sinh phiếu chi — dòng 667), `update_printing_order_atomic` (`:671`, gọi `recompute_printing_payment_status` dòng 696). `payment_status` chỉ do `recompute_printing_payment_status` ghi (`20260825200000:229-236`) | — |
| `inventory_transactions` | `stock_in` = phải trả NCC phôi · `stock_out.total_cost` = **giá vốn (COGS)** | `transaction_type`, `total_cost`, `unit_cost`, `quantity`, `source_type` (`retail_sale`/`contract_fulfillment`/`contract_addon_sale`), `contract_id`, `receipt_id`, `is_rollback` | `inventory_stock_in_atomic` (`20260825200000:767-769`), `create_sale_receipt_atomic` (`20260507103000:346-368`), `inventory_stock_out_atomic` | — |
| `employee_salaries` | Sheet **lương cứng tháng** (accrual overhead, ADR-016 M5) | `base_salary`, `product_salary` (=0 từ M3), `bonus`, `penalty`, `advance_payment`, `total_salary`, `net_salary`, `paid_amount`, `remaining_amount`, `monthly_salary` (**cột chết**) | Sinh: `generateMonthlySalaryAction` — chỉ người có `salary_info.base_salary > 0` (`app/actions/salary-actions.ts:408-441`) · `recalculateEmployeeSalary` (`:56-70`) · `paid_amount`/`remaining_amount` **dẫn xuất** bởi `sync_employee_salary_paid` (`20260827130000:109-118`) | ADR-016 M5 `agent/DECISIONS.md:147-148` |
| `monthly_salaries` | Tổng sheet lương tháng (không phải tiền) | `total_salary`, `total_employees`, `*_total` | `generateMonthlySalaryAction` (`app/actions/salary-actions.ts:446-448`), `recalculateEmployeeSalary` (`:81-84`), migration M3 tính lại BL-2026-06 (`20260826180000:399-407`) | — |
| `finance_monthly_closes` | Khoá sổ theo kỳ `YYYY-MM` | `period`, `status` (`draft`/`locked`), `snapshot_metrics`, `locked_at/by` | `createMonthlyClose` / `advanceCloseTask` / `cancelMonthlyClose` (`app/actions/finance-close-actions.ts:160,225,364`) | `vault/30-du-lieu/luoc-do-tai-chinh.md:456-480` |
| `finance_close_tasks` | 8 bước quy trình chốt sổ | `close_id`, `step_number` (1..8), `status` | `createMonthlyClose` (`finance-close-actions.ts:198`), `advance_close_task` (`20260411160002_finance_close_rpcs.sql:8`) | — |
| `transaction_categories` | Danh mục thu/chi (`type` ∈ `thu`/`chi`) | `category_code`, `name`, `type` | `finance-category-actions.ts`; đọc bởi `resolve_printing_expense_category_id` (`20260428130000_printing_audit_fix.sql:115`), `resolve_vendor_expense_category_id` (`20260528000003:116`), `ensureRefundCategory` (`app/actions/contract-refund-actions.ts:63-95`) | — |
| `debts` | Công nợ **thủ công** (0 dòng) | `type` (`receivable`/`payable`), `remaining`, `due_date`, `status` | `app/actions/debt-actions.ts`. Chỉ được **cộng thêm** vào `finance_debt_stats` (`20260826180000:283-290, 301-302, 306-307`) | `vault/80-van-hanh/so-lieu-van-hanh.md:73` (bảng rỗng) |
| `fixed_costs` | Danh mục chi phí cố định — **KHÔNG phải tiền** | `monthly_amount`, `start_date`, `end_date` | `fixed-cost-actions.ts`. Chi phí cố định thật = phiếu chi `[Auto-Fixed]` (ADR-016 M2 §3, `agent/DECISIONS.md:133`) | — |
| `budgets`, `financial_goals`, `goal_contributions`, `investments`, `investment_maintenance_logs`, `credit_cards` | Kế hoạch / tài sản — **không nằm trên đường tiền vào–ra** (0 dòng trừ `credit_cards` = 3) | — | `goal-budget-actions.ts`, `investment-actions.ts` | `vault/30-du-lieu/luoc-do-tai-chinh.md:14-32` |

**Bảng đã bị DROP (không còn tồn tại):** `lab_payments`, `lab_payment_allocations`, `vendor_payments`, `vendor_payment_allocations` (+ 4 bảng `_legacy`) — `20260826130000_cashflow_m2b_drop_legacy.sql:31-40`. Xác nhận: 0 định nghĩa trong `types/database.types.ts`; trong `app/` chỉ còn tên trong **comment** (`app/actions/lab-queries.ts:136`, `app/actions/printing-queries.ts:380,400`, `app/actions/vendor-actions.ts:270`, `components/finance/finance-realtime-refresh.tsx:16`). `order_payments`, `inventory_reservations` cũng đã drop (ADR-017, `20260826200000_drop_printing_inventory_payment_legacy.sql`).

---

## 2. RPC & hàm DB

Cột "Định nghĩa mới nhất trong repo" = file migration có timestamp lớn nhất **thực sự `CREATE`** hàm đó (đã lọc bỏ file chỉ *gọi tên* hàm).

| Hàm | Đọc/ghi bảng | Atomic | Gọi từ đâu | Trạng thái + định nghĩa mới nhất |
|---|---|---|---|---|
| `vn_date(timestamptz)` | — (helper đổi timestamptz → ngày VN) | — | mọi hàm sổ kỳ | **Sống** · `20260826120000_cashflow_m2_ba_so.sql:19` |
| `finance_period_ledger(start,end)` | ĐỌC `payments`, `receipts`, `expenses`+`expense_allocations`, `contracts`, `work_tasks`+`contract_events`, `printing_orders`, `inventory_transactions`, `employee_salaries` | đọc | `finance_month_summary`, `finance_pnl_by_month`, `finance_reports_snapshot` | **Sống** · `20260827130000_luong_cung_m5.sql:8-99` (bản M2 `20260826120000:28` đã bị REPLACE) |
| `finance_month_summary(m,y)` | đọc `finance_period_ledger` ×2 (kỳ này + kỳ trước), `finance_payable_summary()`, `contracts`, `contract_events` | đọc | `app/actions/finance-dashboard-queries.ts:154` | **Sống** · `20260826180000_tien_ekip_va_can_thu.sql:212-272` (bản M2 `20260826120000:124` đã DROP+CREATE lại) |
| `finance_pnl_by_month(y)` | đọc `finance_period_ledger` ×12 | đọc | `app/actions/finance-dashboard-queries.ts:546` | **Sống** · `20260826120000:184-202` |
| `finance_reports_snapshot(start,end)` | đọc `finance_period_ledger` + `contracts`/`contract_items` | đọc | `app/actions/finance-reports-queries.ts:176`; Moodie `lib/moodie/tools.ts:548` | **Sống** · `20260826120000:209-309` |
| `finance_cashflow_timeline(start,end)` | ĐỌC THẲNG `payments` + `receipts`(contract_id IS NULL) + `expenses` | đọc | `app/actions/finance-cashflow-timeline.ts:29` | **Sống** · `20260826120000:314-342`. ⚠️ **KHÔNG gọi `finance_period_ledger`** (xem §5, §7) |
| `finance_ledger(page,size,m,y,type)` / `finance_ledger_range(...)` | đọc `payments`+`receipts`+`expenses` (danh sách giao dịch, có phân trang) | đọc | `app/actions/finance-dashboard-queries.ts:517, 499` | **Sống** · `20260612131500_fix_finance_ledger_return_types.sql:6` / `20260714060000_finance_ledger_range_return_types.sql:5` |
| `payable_remaining(target_type,target_id,payee_id)` | đọc `printing_orders`/`work_tasks`/`inventory_transactions`/`employee_salaries` + `expense_allocations` | đọc | `record_payee_payment_atomic` (`20260827130000:212`) | **Sống** · `20260826180000:26-43` (M1 `20260825200000:183` bị REPLACE — bản M1 chưa nhận ekip `assigned_to`) |
| `payable_items(payee_type,payee_id)` | đọc `printing_orders`(lab) · `work_tasks`(vendor + ekip) · `employee_salaries`(lương cứng) · `inventory_transactions`(supplier) + `expense_allocations` | đọc | `app/actions/payable-actions.ts:66`; FIFO trong `record_payee_payment_atomic` (`20260827130000:220`) | **Sống** · `20260827130000:124-160` |
| `finance_payable_summary()` | LATERAL `payable_items` cho từng `labs`/`vendors(tho_ngoai)`/`vendors(nha_cung_cap)`/`employees(active)` | đọc | `app/actions/payable-actions.ts:39`; `finance_month_summary`; `finance_debt_stats` | **Sống** · `20260826180000:84-104` |
| `finance_lab_debt_summary()` | wrapper lọc `payee_type='lab'` của `finance_payable_summary` | đọc | `app/actions/printing-reference-queries.ts:96`; `printing_lab_overview` | **Sống** · `20260825200000:349-354` |
| `finance_vendor_debt_summary()` | wrapper lọc `payee_type='vendor'` + join `vendors` | đọc | (giữ chữ ký cũ) | **Sống** · `20260825200000:356-362` |
| `record_payee_payment_atomic(payee_type,payee_id,amount,method,date,note,allocations,actor)` | **GHI** `expenses` + `expense_allocations`; PERFORM `recompute_printing_payment_status`, `sync_employee_salary_paid` | ✅ plpgsql, SECURITY DEFINER, chặn kỳ khoá | `app/actions/payable-actions.ts:112` · `app/actions/salary-actions.ts:182` · `record_lab_payment_atomic` · `inventory_stock_in_atomic` | **Sống** · `20260827130000:165-239` |
| `record_lab_payment_atomic(lab_id,…,payment_date)` | wrapper → `record_payee_payment_atomic('lab')`, map `printing_order_id`→`target_id` | ✅ | `app/actions/lab-mutations.ts:311` (modal `/printing`) | **Sống** · `20260825200000:305-315` |
| `record_vendor_payment_atomic(...)` | — | — | — | **ĐÃ DROP** · `20260826130000_cashflow_m2b_drop_legacy.sql:46`; 0 định nghĩa trong `types/database.types.ts` |
| `void_payee_payment_atomic(expense_id,actor)` | xoá mềm `expenses`; PERFORM `recompute_printing_payment_status` + `sync_employee_salary_paid` | ✅ `FOR UPDATE`, chặn kỳ khoá | `app/actions/payable-actions.ts:182` | **Sống** · `20260827130000:244-269` (bản M2 `20260826120000:375` chỉ cho `lab/vendor/supplier`; M5 thêm `employee`) |
| `payee_payment_history(payee_type,payee_id)` | đọc `expenses` + `expense_allocations` (kèm nhãn) | đọc | `app/actions/payable-actions.ts:149` | **Sống** · `20260826120000:348-369` |
| `recompute_printing_payment_status(order_id)` | GHI `printing_orders.payment_status` từ Σ `expense_allocations` | ✅ (UPDATE 1 dòng) | `record_payee_payment_atomic`, `void_payee_payment_atomic`, `update_printing_order_atomic`, `app/actions/expense-actions.ts:215` | **Sống** · `20260825200000:226-236` |
| `sync_employee_salary_paid(salary_id)` | GHI `employee_salaries.paid_amount/remaining_amount` từ Σ `expense_allocations(employee_salary)` | ✅ (UPDATE 1 dòng) | `record_payee_payment_atomic` (`:236`), `void_payee_payment_atomic` (`:265`) | **Sống** · `20260827130000:104-119`. Chưa có trong `types/database.types.ts` vì types sinh 26/08, trước M5 (27/08) |
| `contract_financials(uuid[])` | đọc `contracts`, `work_tasks`, `printing_orders`, `inventory_transactions`, `expenses(other)` | đọc | `app/actions/finance-dashboard-queries.ts:757`; `finance_contract_profit_report`; `get_contract_list_v2` | **Sống** · `20260825200000:367-384` (không migration nào sau đó CREATE lại) |
| `finance_contract_profit_report(status,from,to,page,size)` | đọc `contracts` + LATERAL `contract_financials` | đọc | `app/actions/finance-dashboard-queries.ts:444, 608` | **Sống** · `20260825200000:387-424` |
| `get_contract_list_v2(...)` | dùng `contract_financials` thay 3 LATERAL cũ | đọc | module Hợp đồng | **Sống** · `20260825200000:427` |
| `finance_debt_stats()` | đọc `contracts` + `contract_events(giao_san_pham)` + `debts` + `finance_payable_summary()` | đọc | `app/actions/finance-operations-queries.ts:581` (`/finance/debts`) | **Sống** · `20260826180000:278-323` |
| `get_receivable_aging()` | đọc `contracts` + `contract_events` — 5 bucket (`not_delivered`, `0_30`, `31_60`, `61_90`, `90_plus`) | đọc | `app/actions/finance-intelligence-queries.ts:105` | **Sống** · `20260826180000:328-366` |
| `finance_pending_collections(limit)` | đọc `contracts` + `customers` + `contract_events`; sắp đã-giao lên đầu | đọc | `app/actions/finance-dashboard-queries.ts:432`; `lib/api/dashboard.ts:850` | **Sống** · `20260826180000:372-393` |
| `process_contract_payment_v2(...)` | GHI `payments`, `contracts`, `payment_plans` (+ `payment_plan_allocations` **ở bản DB**) | ✅ `FOR UPDATE` contract trước validate; chặn kỳ khoá inline | `app/actions/payment-actions.ts:70` | **Sống**, nhưng **bản trong repo cũ hơn bản đang chạy** — `20260527120000_fix_payment_race_condition.sql:5-201` không có `payment_plan_allocations` (0 lần xuất hiện), trong khi `agent/DECISIONS.md:144` ghi bản DB có ghi phân bổ + gọi `sync_payment_plan_statuses_v2`. **Tin DB, không tin file.** |
| `void_contract_payment_v2(payment_id,reason,actor)` | xoá mềm `payments`, xoá `payment_plan_allocations`, `sync_payment_plan_statuses_v2`, tính lại `contracts` | ✅ `FOR UPDATE` payment + contract; chặn kỳ khoá | `app/actions/payment-actions.ts:135` | **Sống** · `20260505093000_contract_payment_flexible_stages.sql:585-706` |
| `sync_payment_plan_statuses_v2(contract_id)` | GHI `payment_plans.status` từ `payment_plan_allocations` | ✅ | `void_contract_payment_v2`; (bản DB của `process_contract_payment_v2`) | **Sống** · `20260505093000:129` |
| `contract_payment_status_v2(paid,remaining)` | thuần hàm | — | `void_contract_payment_v2` | **Sống** · `20260505093000:248` |
| `create_default_payment_schedule_v2(...)` | GHI `payment_plans` (chỉ `deposit` + `final`) | ✅ | tạo hợp đồng | **Sống** · `20260827100000_payment_plans_m4_bo_dot_1_2.sql:32-130` |
| `create_sale_receipt_atomic(receipt,items)` | GHI `receipts` + `inventory_transactions(stock_out, retail_sale)` + trừ `inventory_items.current_stock` | ✅ `FOR UPDATE` từng item, kiểm tồn, kiểm tổng khớp | `app/actions/receipt-actions.ts:305`; `app/actions/inventory-mutations.ts:418` | **Sống** · `20260507103000_inventory_sale_stockout_source_contract.sql:242-379` |
| `inventory_stock_in_atomic(...,p_paid,p_payment_method,p_paid_date)` | GHI `inventory_transactions(stock_in)` + `inventory_items` + (nếu `p_paid`) gọi `record_payee_payment_atomic('supplier')` | ✅ | `app/actions/inventory-mutations.ts:288` (`p_paid` dòng 299) | **Sống** · `20260825200000:744-784` |
| `create_printing_order_atomic` / `update_printing_order_atomic` / `delete_printing_order_atomic` | GHI `printing_orders`; **không** sinh phiếu chi | ✅ | module In ấn | **Sống** · `20260825200000:645`, `:671`, `:700` |
| `printing_lab_overview()` | đọc `labs` + `finance_lab_debt_summary()` + `expenses(payee_type='lab')` | đọc | `/printing/labs` | **Sống** · `20260826120000:432-459` |
| `vendor_cost_report(m,y)` | đọc `work_tasks`(hoan_thanh, ngày **sự kiện**) + `vendors` | đọc | `app/actions/vendor-reports-queries.ts:32` | **Sống** · `20260826120000:404-427` |
| `printing_integrity_report()` | 4 phép kiểm toàn vẹn phiếu chi ↔ đơn in | đọc | `app/actions/integrity-actions.ts` | **Sống** · `20260825200000:714-737` |
| `contract_payment_health_checks()` | 8 phép kiểm phiếu thu ↔ đợt thu | đọc | `/finance/debts` (integrity) | **Sống** · `20260505093000:714` |
| `is_period_locked(date)` | đọc `finance_monthly_closes` | đọc | `lib/finance-utils.ts:13`; inline trong `record_payee_payment_atomic` (`20260827130000:177`), `void_payee_payment_atomic` (`:259`), `process_contract_payment_v2` (`20260527120000:57-64`), `void_contract_payment_v2` (`20260505093000:629-636`) | **Sống** · `20260411160002_finance_close_rpcs.sql:92-101` |
| `advance_close_task(close_id,step,status,actor)` | GHI `finance_close_tasks` | ✅ | `app/actions/finance-close-actions.ts:228` | **Sống** · `20260411160002_finance_close_rpcs.sql:8` |
| `get_finance_intelligence()` · `get_finance_advanced_intelligence(m,y)` · `get_cashflow_forecast(days)` | công thức riêng (sức khoẻ / runway / hoà vốn) | đọc | `app/actions/finance-intelligence-queries.ts:54, 142, 71` | **Sống** · `20260827130000:275`, `:508`, `:853` — M5 vá "không cộng sheet lương lên tiền" nhưng **vẫn là công thức riêng** (ADR-016 M2 §6, `agent/DECISIONS.md:135`) |
| `finance_dashboard_metrics(m,y)` · `finance_revenue_by_month(y)` | — | — | — | **ĐÃ DROP** · `20260826120000:464-465`; 0 định nghĩa trong `types/database.types.ts` |
| `upsert_printing_expense` · `upsert_vendor_expense` · `trg_sync_vendor_expense()` + trigger `work_task_vendor_expense_sync` | — | — | — | **ĐÃ DROP** · `20260825200000:175-178`; 0 định nghĩa trong `types/database.types.ts` |

---

## 3. Server action & route

| Server action (file:dòng) | Route / màn dùng | RPC gọi xuống |
|---|---|---|
| `createPaymentReceipt` `app/actions/payment-actions.ts:54` (rpc `:70`) | `/contracts/[id]` — modal thu tiền | `process_contract_payment_v2`; trước đó `checkPeriodLock` (`:66`) + `requirePaymentRecordAccess` (`:64`) |
| `voidContractPayment` `app/actions/payment-actions.ts:120` (rpc `:135`) | `/contracts/[id]`, `/finance/receipts` | `void_contract_payment_v2`; `requireContractDestructiveAccess` (`:133`) |
| `createSaleReceipt` `app/actions/receipt-actions.ts:280` (rpc `:305`) | `/finance/receipts` — bán lẻ vật tư | `create_sale_receipt_atomic` |
| `sellInventory` `app/actions/inventory-mutations.ts:418` | `/inventory` | `create_sale_receipt_atomic` |
| `stockIn` `app/actions/inventory-mutations.ts:288` (`p_paid` `:299`) | `/inventory` — nhập phôi | `inventory_stock_in_atomic` → (nếu đã trả) `record_payee_payment_atomic('supplier')` |
| `fetchPayables` `app/actions/payable-actions.ts:37` | **`/finance/payables`** (`app/(protected)/finance/payables/page.tsx:15`) | `finance_payable_summary` |
| `fetchPayableItems` `app/actions/payable-actions.ts:62` | modal trả tiền (`components/finance/payables/payee-payment-modal.tsx:87`) | `payable_items` |
| `recordPayeePayment` `app/actions/payable-actions.ts:100` (rpc `:112`) | modal trả tiền (`payee-payment-modal.tsx:152`) | `record_payee_payment_atomic`; `withAdmin` + `checkPeriodLock` (`:110`); revalidate 6 path (`:28-35`) |
| `fetchPayeePaymentHistory` `app/actions/payable-actions.ts:142` | drawer lịch sử (`payee-history-drawer.tsx`) | `payee_payment_history` |
| `voidPayeePayment` `app/actions/payable-actions.ts:175` (rpc `:182`) | drawer lịch sử | `void_payee_payment_atomic` |
| `recordLabPayment` `app/actions/lab-mutations.ts:299` (rpc `:311`) | `/printing`, `/printing/labs` — `LabPaymentModal` | `record_lab_payment_atomic` → `record_payee_payment_atomic('lab')` |
| `payEmployeeSalaryAction` `app/actions/salary-actions.ts:161` (rpc `:182`) | `/finance/salaries` | `record_payee_payment_atomic('employee')` với `allocations=[{target_id: salaryId}]` |
| `generateMonthlySalaryAction` `app/actions/salary-actions.ts:299` | `/finance/salaries` | — (ghi thẳng `employee_salaries`/`monthly_salaries`) |
| `createExpense` / `updateExpense` / `deleteExpense` / `approveExpense` `app/actions/expense-actions.ts:67 / 107 / 180 / 32` | `/finance/expenses` | `recompute_printing_payment_status` khi xoá (`:215`) |
| `generateMonthlyFixedCosts` `app/actions/expense-actions.ts:259` | `/finance/fixed-costs` | — (INSERT `expenses` mô tả `[Auto-Fixed]`) |
| `createContractRefundExpense` `app/actions/contract-refund-actions.ts:144` | `/contracts/[id]` (chỉ HĐ `da_huy`, guard `:164-166`) | — (INSERT `expenses` `payee_type` mặc định `other`) |
| `getMonthSummary` `app/actions/finance-dashboard-queries.ts:534` (rpc `:154`) | **`/finance`** (`components/finance/dashboard/finance-dashboard-client.tsx:174`) | `finance_month_summary` |
| `getRevenueByMonth` `:542` (rpc `:546`) | `/finance` chart 12 tháng (`finance-dashboard-client.tsx:181`) | `finance_pnl_by_month` |
| `getPendingCollections` `:594` (rpc `:432`) | `/finance` "Cần thu tiền" (`finance-dashboard-client.tsx:196`) | `finance_pending_collections` |
| `getContractProfitReport` `:601` | `/finance`, `/reports` | `finance_contract_profit_report` |
| `getContractFinanceDetails` `:719` (rpc `:757`) | drawer "Lợi nhuận HĐ" (`components/finance/dashboard/profit-detail-drawer.tsx`) | `contract_financials` |
| `fetchLedger` `:649` | `/finance/cashflow` | `finance_ledger` / `finance_ledger_range` |
| `getReportsSnapshot` `app/actions/finance-reports-queries.ts:171` (rpc `:176`) | **`/reports`** (`app/(protected)/reports/page.tsx`) | `finance_reports_snapshot` |
| Moodie `get_financial_summary` `lib/moodie/tools.ts:511` (rpc `:548`) | chat Moodie | `finance_reports_snapshot` |
| `getCashflowTimeline` `app/actions/finance-cashflow-timeline.ts:29` | `/finance/cashflow` biểu đồ | `finance_cashflow_timeline` |
| `fetchDebtStats` `app/actions/finance-operations-queries.ts:578` (rpc `:581`) | **`/finance/debts`** | `finance_debt_stats` |
| `getReceivableAging` `app/actions/finance-intelligence-queries.ts:105` | `/finance` (aging chart) | `get_receivable_aging` |
| `fetchSalaries` `app/actions/finance-operations-queries.ts:698` | **`/finance/salaries`** (`page.tsx:29`) | — (đọc thẳng bảng) |
| `createMonthlyClose` / `advanceCloseTask` / `cancelMonthlyClose` `app/actions/finance-close-actions.ts:160 / 225 / 364` | `/finance/closes` | `advance_close_task` (`:228`) |
| `queryPaymentReminders` `lib/api/dashboard.ts:841` (rpc `:850`) | `/dashboard` card "Cần thu tiền" (service role) | `finance_pending_collections` |
| `getVendorCostReport` `app/actions/vendor-reports-queries.ts:32` | báo cáo chi phí thợ | `vendor_cost_report` |
| `getPrintingOrderLabRemaining` `app/actions/printing-queries.ts:385` | drawer đơn in | — (đọc thẳng `expense_allocations` `:402-407`) |
| `mergeVendors` `app/actions/vendor-actions.ts` (reassign `expenses.payee_id` `:271-276`) | `/vendors` | — |

**Redirect:** `/finance/lab-debts` → `/finance/payables` (`app/(protected)/finance/lab-debts/page.tsx:5`); `/finance/vendor-debts` → `/finance/payables` (`.../vendor-debts/page.tsx:5`).

---

## 4. Luồng nghiệp vụ

### (a) Tiền VÀO theo hợp đồng

```
Tạo HĐ ──save_contract_atomic──► contracts(total_amount, work_date, contract_date, status='cho_xu_ly')
   │                                    └─► create_default_payment_schedule_v2
   │                                          └─► payment_plans: CHỈ 'deposit'(Cọc) + 'final'(Tất toán)
   │                                              [20260827100000:73-107]  ← KẾ HOẠCH, KHÔNG PHẢI TIỀN
   ▼
Khách trả tiền
   │  UI /contracts/[id] → createPaymentReceipt (payment-actions.ts:54)
   │      ├─ requirePaymentRecordAccess (:64)
   │      └─ checkPeriodLock(paymentDate) (:66)   ← chặn kỳ đã 'locked'
   ▼
RPC process_contract_payment_v2  [FOR UPDATE contracts — 20260527120000:68-73]
   ├─► INSERT payments(amount, payment_date, receipt_code, approved_by)      [:137-164]
   ├─► INSERT payment_plan_allocations(payment_plan_id, payment_id, amount)  [bản DB — DECISIONS.md:144]
   ├─► UPDATE contracts.paid_amount / remaining_amount / payment_status      [:167-174]
   └─► payment_plans.status: pending → partial → paid  (sync_payment_plan_statuses_v2)

Trạng thái DẪN XUẤT LẠI:
  contracts.payment_status  ← v_paid vs v_total                     [20260527120000:129-134]
  contracts.remaining_amount → phải thu (§5)                        → finance_debt_stats / finance_pending_collections
  finance_period_ledger.cash_in_contract = Σ payments.amount theo payment_date   [20260827130000:22-23]
  finance_period_ledger.revenue_contract = Σ contracts.total_amount theo work_date [20260827130000:42-46]
```

### (b) Tiền VÀO bán lẻ

```
/finance/receipts hoặc /inventory ──createSaleReceipt / sellInventory──► checkPeriodLock
   ▼
RPC create_sale_receipt_atomic  [20260507103000:242]
   ├─ FOR UPDATE từng inventory_items, kiểm tồn + kiểm Σ items == receipt_amount [:310-312]
   ├─► INSERT receipts(receipt_date, receipt_amount, contract_id = NULL)          [:314-330]
   ├─► INSERT inventory_transactions(stock_out, source_type='retail_sale', unit_cost = average_unit_price, receipt_id)  [:346-368]
   └─► UPDATE inventory_items.current_stock -= qty                                [:370-374]

Dẫn xuất lại:
  ledger.cash_in_retail  = Σ receipts.receipt_amount (contract_id IS NULL) theo receipt_date [20260827130000:24-25]
  ledger.revenue_retail  = ĐÚNG BẰNG cash_in_retail (doanh thu bán lẻ ghi theo ngày thu)     [20260827130000:94]
  ledger.cost_cogs_retail= Σ stock_out.total_cost (source_type='retail_sale')                [20260827130000:70]

Huỷ phiếu thu bán lẻ: UPDATE receipts.deleted_at
   └─► trigger trg_restore_inventory_on_receipt_void → hoàn kho [20260507123000:92-96]
```

### (c) Tiền RA — MỘT cửa duy nhất cho 4 loại đối tác

```
                     CAM KẾT (bản ghi gốc)                      TRẢ TIỀN (phiếu chi)
                     ─────────────────────                      ────────────────────
LAB          printing_orders.total_amount  ──┐
             (khi tạo đơn; KHÔNG sinh        │
              phiếu chi — 20260825200000:667)│
                                             │
THỢ NGOÀI    work_tasks.cost                 │   /finance/payables (1 modal, 4 loại)
             status='hoan_thanh',            ├──►  recordPayeePayment (payable-actions.ts:100)
             vendor_id NOT NULL              │        │  withAdmin + checkPeriodLock (:110)
                                             │        ▼
EKIP         work_tasks.cost                 │   RPC record_payee_payment_atomic  [20260827130000:165]
             status='hoan_thanh',            │        ├─ is_period_locked → EXCEPTION       [:177]
             assigned_to, vendor_id IS NULL  │        ├─ resolve recipient + category theo payee_type [:182-197]
                                             │        ├─► INSERT expenses(payee_type, payee_id,
NCC PHÔI     inventory_transactions.stock_in ┤        │       expense_date, amount, approved_by=actor) [:200-202]
             .total_cost                     │        ├─► với mỗi khoản: payable_remaining() kiểm quá hạn mức [:212-215]
                                             │        │     → INSERT expense_allocations(target_type,target_id,amount)
LƯƠNG CỨNG   employee_salaries.net_salary    │        │     (employee: target là employee_salaries.id → 'employee_salary',
             (sheet tháng, base+thưởng−phạt) ─┘        │      còn lại → work_task) [:209-211]
                                                      ├─ không truyền allocations ⇒ FIFO theo payable_items [:218-230]
                                                      ├─ Σ phân bổ ≠ amount ⇒ EXCEPTION            [:231]
                                                      ├─► PERFORM recompute_printing_payment_status [:233-235]
                                                      └─► PERFORM sync_employee_salary_paid        [:236-237]

CHI TRỰC TIẾP / VẬN HÀNH: không có cam kết — phiếu chi CHÍNH LÀ chi phí
   /finance/expenses → createExpense (expense-actions.ts:67) → INSERT expenses payee_type='other'
     · có contract_id  ⇒ ledger.cost_direct   [20260827130000:32]  ⇒ contract_financials.direct_cost
     · không contract_id, mô tả KHÔNG '[Auto-Fixed]' ⇒ ledger.cost_overhead [:33-34]
     · không contract_id, mô tả '[Auto-Fixed]'      ⇒ ledger.cost_fixed     [:35-36]

ĐƯỜNG RIÊNG (vẫn cùng RPC):
   /printing → recordLabPayment (lab-mutations.ts:311) → record_lab_payment_atomic (wrapper)
              → record_payee_payment_atomic('lab')                    [20260825200000:306-315]
   /finance/salaries → payEmployeeSalaryAction (salary-actions.ts:182)
              → record_payee_payment_atomic('employee', alloc=[dòng lương])
   /inventory nhập phôi p_paid=true → inventory_stock_in_atomic
              → record_payee_payment_atomic('supplier') TRONG CÙNG TRANSACTION [20260825200000:776-780]

Trạng thái DẪN XUẤT LẠI sau mỗi phiếu chi:
   printing_orders.payment_status = 'da_thanh_toan' nếu total − Σalloc ≤ 0.01, ngược lại 'chua_thanh_toan'
                                    [recompute_printing_payment_status, 20260825200000:229-236]
   employee_salaries.paid_amount = Σ alloc(employee_salary); remaining = max(net_salary − paid, 0)
                                    [sync_employee_salary_paid, 20260827130000:109-118]
   finance_payable_summary().remaining giảm (vì payable_items.allocated tăng)  [20260827130000:152-159]
   ledger.cash_out += amount; ledger.cash_out_settlement += amount (vì CÓ phân bổ) [20260827130000:29-30]
   ⇒ Phiếu chi CÓ phân bổ KHÔNG làm tăng chi phí lãi/lỗ — chỉ ra két.
```

### (d) Huỷ / void từng loại

```
HUỶ PHIẾU THU HĐ ─── voidContractPayment (payment-actions.ts:120, requireContractDestructiveAccess :133)
   └─► void_contract_payment_v2  [20260505093000:585]  FOR UPDATE payments + contracts
        ├─ kiểm kỳ khoá                                            [:629-636]
        ├─► payments: deleted_at + voided_at/by + void_reason       [:649-655]
        ├─► nếu là phiếu phát sinh → contract_items.deleted_at      [:657-666]
        ├─► DELETE payment_plan_allocations WHERE payment_id        [:668-670]
        ├─► sync_payment_plan_statuses_v2(contract_id)              [:674]
        ├─► contracts.paid = Σ payments chưa xoá; remaining, payment_status = contract_payment_status_v2 [:682-698]
        └─► trigger trg_restore_inventory_on_contract_payment_void → hoàn kho 'contract_addon_sale'
                                                                     [20260507123000:115-119]

HUỶ PHIẾU CHI TRẢ ĐỐI TÁC (lab · vendor · supplier · employee)
   ─── voidPayeePayment (payable-actions.ts:175) ──► void_payee_payment_atomic [20260827130000:244]
        ├─ FOR UPDATE expenses; đã huỷ rồi ⇒ EXCEPTION              [:257]
        ├─ payee_type ∉ 4 loại ⇒ EXCEPTION (phiếu 'other' KHÔNG huỷ đường này) [:258]
        ├─ kỳ khoá ⇒ EXCEPTION                                      [:259]
        ├─► expenses.deleted_at = now()   (expense_allocations GIỮ NGUYÊN — mọi truy vấn
        │     đều JOIN expenses WHERE deleted_at IS NULL nên phân bổ tự "biến mất")  [:261]
        ├─► recompute_printing_payment_status(target)               [:263-264]
        └─► sync_employee_salary_paid(target)  ⇒ nợ lương quay lại   [:265-266]
   ⇒ finance_payable_summary().remaining tăng trở lại; ledger.cash_out của kỳ đó giảm.

HUỶ PHIẾU CHI 'other' (chi trực tiếp / vận hành / hoàn tiền)
   ─── deleteExpense (expense-actions.ts:180)
        ├─ mô tả chứa '[Auto-' ⇒ chặn                               [:191-193]
        ├─ checkPeriodLock                                          [:194]
        ├─► UPDATE deleted_at WHERE deleted_at IS NULL AND approved_by IS NULL  [:197-203]
        │     ⇒ phiếu chi do record_payee_payment_atomic tạo LUÔN có approved_by=actor
        │       [20260827130000:200-202] ⇒ 0 dòng ⇒ báo lỗi "đã được duyệt" ⇒ KHÔNG xoá nhầm được
        └─► recompute_printing_payment_status cho alloc printing_order (an toàn thừa) [:209-215]

HUỶ ĐƠN IN  ─── updatePrintingOrderStatus to='huy_don' (ADR-017, DECISIONS.md:112-115)
   └─ đơn rời khỏi payable_items (điều kiện status NOT IN ('huy_don','da_huy')) [20260827130000:132]
      ⇒ nợ lab giảm. Phiếu chi đã trả cho đơn đó VẪN nằm trong expenses (đã ra két thật).
   └─ delete_printing_order_atomic CHẶN xoá nếu đơn đã có phiếu chi [20260825200000:706-709]

HUỶ HỢP ĐỒNG ─── cancel_contract_cascade → contracts.status='da_huy'
   ├─ rời khỏi revenue (ledger loại 'da_huy')                       [20260827130000:45]
   ├─ rời khỏi phải thu (finance_debt_stats/aging/pending loại 'da_huy') [20260826180000:296, 341, 386]
   └─ hoàn tiền khách: createContractRefundExpense (contract-refund-actions.ts:144)
        → INSERT expenses(contract_id, payee_type='other') — chỉ khi status='da_huy' [:164-166]
```

---

## 5. Nguồn chân lý

| Câu hỏi nghiệp vụ | Hàm DUY NHẤT được phép trả lời | Luật ngày ghi sổ | Bằng chứng |
|---|---|---|---|
| "Doanh thu tháng này?" | `finance_month_summary(m,y).revenue` (= `revenue_contract + revenue_retail`) | HĐ theo **`work_date`** (ngày chụp), fallback `contract_date`, loại `da_huy`; bán lẻ theo `receipt_date` | `20260827130000:42-46` (HĐ), `:24-25`+`:94` (bán lẻ); tổng `20260826180000:263` |
| "Doanh số **ký** tháng này?" | `finance_month_summary` không trả; dùng `finance_pnl_by_month(y).signed_revenue` / `finance_reports_snapshot.summary.signedRevenue` | theo `contract_date` | `20260827130000:48-52`, `20260826120000:199` |
| "Tháng này lời hay lỗ?" | `finance_month_summary(m,y).profit` = revenue − (`cost_task + cost_print + cost_cogs_contract + cost_cogs_retail + cost_direct + cost_overhead + cost_fixed + cost_salary_base`) | task theo `contract_events.event_date` (fallback `deadline`→`created_at`); đơn in theo `order_date`; COGS theo `receipts.receipt_date` (fallback `created_at`); chi theo `expense_date`; lương cứng prorate theo tháng của sheet | `20260826180000:255` (công thức), `20260827130000:53-90` (từng luật ngày) |
| "Két tháng này?" | `finance_month_summary(m,y).cash_in / cash_out / cash_net` | tất cả theo **ngày trên phiếu** (`payment_date`, `receipt_date`, `expense_date`) | `20260827130000:20-40`; `20260826180000:261-262` |
| "12 tháng của năm?" | `finance_pnl_by_month(y)` | như trên | `20260826120000:184-202` |
| "Báo cáo `/reports` + Moodie" | `finance_reports_snapshot(start,end)` | như trên | `20260826120000:209-309` |
| "**HĐ này lãi bao nhiêu?**" | `contract_financials(uuid[])` — revenue = `contracts.total_amount`; trừ Σ `work_tasks.cost` (mọi task ≠ `da_huy`), Σ `printing_orders.total_amount` (≠ huỷ), Σ COGS `stock_out` gắn HĐ, Σ `expenses` `payee_type='other'` gắn HĐ | **cam kết**, không phụ thuộc ngày | `20260825200000:367-384` |
| "Danh sách lãi/lỗ theo HĐ" | `finance_contract_profit_report` → gọi `contract_financials` | lọc theo `contract_date` | `20260825200000:410` |
| "Cột Lợi nhuận ở `/contracts`" | `get_contract_list_v2` → gọi `contract_financials` | — | `20260825200000:427` |
| "Drawer Lợi nhuận HĐ" | `getContractFinanceDetails` → `contract_financials` | — | `app/actions/finance-dashboard-queries.ts:757` |
| "**Còn phải thu bao nhiêu?**" | `finance_debt_stats().receivable` (= Σ `contracts.remaining_amount` + `debts` thủ công) · chi tiết trên dashboard: `finance_month_summary.receivable / receivable_due / receivable_waiting` | hiện tại; **đến hạn = đã có `contract_events.giao_san_pham` `hoan_thanh`**; tuổi nợ đếm từ ngày giao | `20260826180000:291-300, 309-319`; `:239-245` |
| "Tuổi nợ phải thu" | `get_receivable_aging()` (5 bucket, có `not_delivered`) | từ ngày giao | `20260826180000:343-353` |
| "HĐ nào cần thu?" | `finance_pending_collections(limit)` — đã giao lên đầu | — | `20260826180000:372-393`; dùng ở cả `/finance` và `/dashboard` (`lib/api/dashboard.ts:850`) |
| "**Còn phải trả bao nhiêu?**" | `finance_payable_summary()` (lab · thợ ngoài · NCC phôi · ekip) | hiện tại; khoản nợ thợ/ekip chỉ tính task `hoan_thanh` | `20260826180000:84-104`; `20260827130000:132-151` |
| "Nợ 1 đối tác gồm những khoản nào?" | `payable_items(payee_type, payee_id)` | ngày sự kiện / `order_date` / ngày nhập / tháng lương | `20260827130000:124-160` |
| "Đơn in này còn nợ lab bao nhiêu?" | `payable_remaining('printing_order', order_id, lab_id)`; UI drawer dùng `getPrintingOrderLabRemaining` | — | `20260826180000:26-43`; `app/actions/printing-queries.ts:402-407` |

### Hàm nào ĐỌC `finance_period_ledger`

| Hàm | Gọi `finance_period_ledger`? | Bằng chứng |
|---|---|---|
| `finance_month_summary` | ✅ 2 lần (kỳ này + kỳ trước) | `20260826180000:229-230` |
| `finance_pnl_by_month` | ✅ LATERAL × 12 | `20260826120000:200` |
| `finance_reports_snapshot` | ✅ | `20260826120000:219` |
| `finance_cashflow_timeline` | ✅ qua `finance_cash_entries` — **#23, 11/09/2026** | `20260911160000` |

### Chỗ TỰ CỘNG LẠI (vi phạm / rủi ro kiến trúc)

> **CẬP NHẬT 11/09/2026 — #23 đã đóng mục 1 và 2.** Phần tiền của sổ kỳ tách ra hàm dùng chung `finance_cash_entries(start, end)`; `finance_cashflow_timeline` đọc nó, `buildCloseSnapshot` đọc `finance_period_ledger` (`fixedCost` nay = `cash_out_fixed`, tức phiếu chi `[Auto-Fixed]` thật). Cửa an toàn: `finance_cashflow_timeline_legacy` giữ 1 kỳ + `npm run verify:cashflow-ledger`. **Còn lại ngoài sổ kỳ:** `depreciationCost` (khấu hao, không phải tiền mặt) → **#29**.

1. **`buildCloseSnapshot` — `app/actions/finance-close-actions.ts:30-137` — vi phạm nặng nhất.**
   Snapshot chốt sổ tự cộng tiền **trong TypeScript**, không gọi `finance_month_summary`/`finance_period_ledger`:
   - `operatingOutflow` = Σ `expenses` **loại trừ** `[Auto-Fixed]` (`:83-86`), rồi cộng `fixedCost` lấy từ bảng **`fixed_costs.monthly_amount`** (`:91-97`, tổng ở `:100`) — trái ADR-016 M2 §3 "`fixed_costs` không phải tiền, không vào két/lãi-lỗ" (`agent/DECISIONS.md:133`) và **khác luật của `finance_period_ledger`** (ledger đếm chính phiếu chi `[Auto-Fixed]` vào cả `cash_out` lẫn `cost_fixed` — `20260827130000:35-36`).
   - `netProfit = netCashflow − depreciationCost` (`:121`) — tức **két trừ khấu hao rồi gọi là "lợi nhuận"**: đúng lớp lỗi mà ADR-016 M2 đã DROP `finance_dashboard_metrics` để diệt (`agent/DECISIONS.md:131`).
   - ADR-016 M2 §6 đã ghi nhận nợ này và hẹn M5 (`agent/DECISIONS.md:135`); M5 chỉ vá phần lương (`:150`), phần `fixed_costs` + `netProfit` **vẫn còn**.
2. `finance_cashflow_timeline` (`20260826120000:324-336`) — tự cộng lại 3 bảng thay vì đọc ledger. Hiện **khớp số** vì dùng đúng bộ lọc, và `scripts/verify-reports.mjs:164-165` assert `Σ timeline == snapshot.cashflowSummary`; nhưng đây là công thức thứ hai, đổi ledger mà quên nó là lệch ngay.
3. `calculateFallbackSnapshot` (`app/actions/finance-reports-queries.ts:194`) — công thức thứ hai cho `/reports`. **Chỉ chạy khi RPC thiếu VÀ `NODE_ENV !== 'production'`** (`:187-189`) → không ảnh hưởng prod, nhưng vẫn là 2 sự thật trong repo (nó đọc `fixed_costs` + `monthly_salaries` prorate — `:50-101`).
4. `get_finance_intelligence` / `get_finance_advanced_intelligence` / `get_cashflow_forecast` (`20260827130000:275, 508, 853`) — công thức riêng cho card sức khoẻ / runway / hoà vốn. M5 mới bỏ phần "cộng sheet lương lên tiền"; nhãn "biên lợi nhuận" tính theo két vẫn chưa đúng (ADR-016 M2 §6, `agent/DECISIONS.md:135`).
5. `getServiceDistributionFallback` (`app/actions/finance-dashboard-queries.ts:174-201`) — lọc theo `contract_date`, **khác luật ngày** của `finance_reports_snapshot.serviceDistribution` (theo `work_date`, `20260826120000:225`). Chỉ là fallback, nhưng hai màn có thể ra hai con số.
6. `fetchLedgerFallback` (`app/actions/finance-dashboard-queries.ts:241`) — danh sách giao dịch, **không** phải nguồn tổng; chỉ chạy khi RPC thiếu.

---

## 6. Bất biến

| # | Phát biểu bất biến | Căn cứ | SQL kiểm (KHÔNG chạy ở đây) |
|---|---|---|---|
| 1 | Phiếu chi trả đối tác (`payee_type ≠ 'other'`) luôn có Σ phân bổ **bằng đúng** số tiền phiếu | RPC ép: `abs(v_alloc_total − p_amount) > 0.01 ⇒ EXCEPTION` `20260827130000:231`; nhánh FIFO còn dư ⇒ EXCEPTION `:229` | `SELECT e.id, e.amount, COALESCE(SUM(a.amount),0) alloc FROM expenses e LEFT JOIN expense_allocations a ON a.expense_id=e.id WHERE e.deleted_at IS NULL AND e.payee_type<>'other' GROUP BY e.id,e.amount HAVING abs(e.amount-COALESCE(SUM(a.amount),0))>0.01;` |
| 2 | Không khoản nào bị trả quá cam kết (over-allocate) | `payable_remaining` kiểm trước khi INSERT `20260827130000:212-214`; kiểm sẵn có trong `printing_integrity_report` check `order_overallocated` `20260825200000:725-726` | `SELECT po.id, po.total_amount, SUM(a.amount) FROM printing_orders po JOIN expense_allocations a ON a.target_type='printing_order' AND a.target_id=po.id JOIN expenses e ON e.id=a.expense_id AND e.deleted_at IS NULL WHERE po.deleted_at IS NULL GROUP BY po.id,po.total_amount HAVING SUM(a.amount)-0.01>COALESCE(po.total_amount,0);` |
| 3 | `printing_orders.payment_status` luôn **dẫn xuất** từ Σ phân bổ, không ai ghi tay | chỉ `recompute_printing_payment_status` ghi cột này `20260825200000:229-236`; check `payment_status_mismatch` `20260825200000:728-731` | `SELECT po.id, po.payment_status, COALESCE(po.total_amount,0)-COALESCE(SUM(a.amount),0) con_lai FROM printing_orders po LEFT JOIN expense_allocations a ON a.target_type='printing_order' AND a.target_id=po.id LEFT JOIN expenses e ON e.id=a.expense_id AND e.deleted_at IS NULL WHERE po.deleted_at IS NULL AND COALESCE(po.status,'') NOT IN ('huy_don','da_huy') AND COALESCE(po.total_amount,0)>0 GROUP BY po.id,po.payment_status,po.total_amount HAVING (po.payment_status='da_thanh_toan' AND COALESCE(po.total_amount,0)-COALESCE(SUM(a.amount),0)>0.01) OR (po.payment_status='chua_thanh_toan' AND COALESCE(po.total_amount,0)-COALESCE(SUM(a.amount),0)<=0.01);` |
| 4 | **Không còn phiếu chi "trích trước" sống** (ADR-016) | 3 hàm + 1 trigger đã DROP `20260825200000:175-178`; check `legacy_accrual_expense_active` `20260825200000:722-723`; 43 dòng cũ xoá mềm `20260825200000:121-138` | `SELECT count(*) FROM expenses WHERE deleted_at IS NULL AND (printing_order_id IS NOT NULL OR work_task_id IS NOT NULL OR description LIKE '[Auto-Print]%' OR description LIKE '[Auto-Vendor]%');` (mong đợi 0) |
| 5 | Mọi phân bổ trỏ tới bản ghi gốc **tồn tại** | check `allocation_to_missing_target` `20260825200000:734-737` | `SELECT a.* FROM expense_allocations a JOIN expenses e ON e.id=a.expense_id AND e.deleted_at IS NULL WHERE (a.target_type='printing_order' AND NOT EXISTS(SELECT 1 FROM printing_orders x WHERE x.id=a.target_id)) OR (a.target_type='work_task' AND NOT EXISTS(SELECT 1 FROM work_tasks x WHERE x.id=a.target_id)) OR (a.target_type='inventory_transaction' AND NOT EXISTS(SELECT 1 FROM inventory_transactions x WHERE x.id=a.target_id)) OR (a.target_type='employee_salary' AND NOT EXISTS(SELECT 1 FROM employee_salaries x WHERE x.id=a.target_id));` |
| 6 | `employee_salaries.paid_amount` = Σ phân bổ `employee_salary` chưa huỷ; `remaining_amount` = `max(net_salary − paid, 0)` | `sync_employee_salary_paid` `20260827130000:109-118`, gọi ở cả record (`:236`) và void (`:265`) | `SELECT s.id, s.paid_amount, s.remaining_amount, s.net_salary, COALESCE(x.alloc,0) FROM employee_salaries s LEFT JOIN (SELECT a.target_id, SUM(a.amount) alloc FROM expense_allocations a JOIN expenses e ON e.id=a.expense_id AND e.deleted_at IS NULL WHERE a.target_type='employee_salary' GROUP BY 1) x ON x.target_id=s.id WHERE abs(COALESCE(s.paid_amount,0)-COALESCE(x.alloc,0))>0.01 OR abs(COALESCE(s.remaining_amount,0)-GREATEST(COALESCE(s.net_salary,0)-COALESCE(x.alloc,0),0))>0.01;` |
| 7 | Mọi phiếu thu HĐ chưa huỷ đều có ít nhất 1 dòng `payment_plan_allocations` | ADR-016 M4 §3 đo 51/51 (`agent/DECISIONS.md:144`); `contract_payment_health_checks()` `20260505093000:714` | `SELECT count(*) FROM payments p WHERE p.deleted_at IS NULL AND p.contract_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM payment_plan_allocations a WHERE a.payment_id=p.id);` (mong đợi 0) |
| 8 | `contracts.paid_amount` = Σ `payments.amount` chưa xoá của HĐ đó | `void_contract_payment_v2` tính lại đúng công thức này `20260505093000:682-687` | `SELECT c.id, c.paid_amount, COALESCE(SUM(p.amount),0) FROM contracts c LEFT JOIN payments p ON p.contract_id=c.id AND p.deleted_at IS NULL WHERE c.deleted_at IS NULL GROUP BY c.id,c.paid_amount HAVING abs(COALESCE(c.paid_amount,0)-COALESCE(SUM(p.amount),0))>0.01;` |
| 9 | `contracts.remaining_amount` = `max(total_amount − paid_amount, 0)` — đây là **nguồn phải thu** | `20260527120000:126`, `20260505093000:689` | `SELECT id, total_amount, paid_amount, remaining_amount FROM contracts WHERE deleted_at IS NULL AND abs(COALESCE(remaining_amount,0)-GREATEST(COALESCE(total_amount,0)-COALESCE(paid_amount,0),0))>0.01;` |
| 10 | `expenses.payee_type` chỉ nhận 5 giá trị; `expense_allocations.target_type` chỉ nhận 4 | CHECK `20260825200000:43`; CHECK `vault/30-du-lieu/luoc-do-tai-chinh.md:226` | `SELECT DISTINCT payee_type FROM expenses;` và `SELECT DISTINCT target_type FROM expense_allocations;` |
| 11 | Phiếu chi do RPC tạo **không sửa/xoá được** qua màn Phiếu chi (vì `approved_by` NOT NULL) | RPC set `approved_by = p_actor_id` `20260827130000:200-202`; `updateExpense` lọc `.is("approved_by", null)` `app/actions/expense-actions.ts:148`; `deleteExpense` `:202` | `SELECT count(*) FROM expenses WHERE payee_type<>'other' AND approved_by IS NULL AND deleted_at IS NULL;` (mong đợi 0) |
| 12 | Σ lợi nhuận theo tháng = Σ lợi nhuận theo hợp đồng (cùng luật cam kết cho task) | chủ ý ghi trong ledger `20260827130000:54`; cùng bộ lọc `wt.status <> 'da_huy' AND cost > 0` với `contract_financials` `20260825200000:373` | `SELECT (SELECT SUM(cost) FROM work_tasks WHERE status<>'da_huy' AND COALESCE(cost,0)>0) AS tong_task_ledger, (SELECT SUM(f.task_cost) FROM contracts c, LATERAL contract_financials(ARRAY[c.id]) f WHERE c.deleted_at IS NULL) AS tong_task_hd;` (lệch = task không gắn HĐ hoặc HĐ đã xoá mềm) |
| 13 | Không thao tác tiền nào vào được kỳ đã `locked` | `is_period_locked` chặn ở cả 4 RPC ghi tiền (`20260827130000:177, 259`; `20260527120000:57-64`; `20260505093000:629-636`) + `checkPeriodLock` ở tầng action (`lib/finance-utils.ts:12-31`) | `SELECT e.id, e.expense_date FROM expenses e JOIN finance_monthly_closes c ON c.period = to_char(e.expense_date,'YYYY-MM') AND c.status='locked' WHERE e.deleted_at IS NULL AND e.created_at > c.locked_at;` |
| 14 | 4 bảng thanh toán cũ + 2 hàm dashboard cũ **không còn tồn tại** | `20260826130000:31-46`; `20260826120000:464-465`; `types/database.types.ts` 0 định nghĩa | `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE '%lab_payment%' OR tablename LIKE '%vendor_payment%';` và `SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND proname IN ('finance_dashboard_metrics','finance_revenue_by_month','upsert_vendor_expense','upsert_printing_expense','record_vendor_payment_atomic');` (mong đợi rỗng) |
| 15 | Tiền **không** chảy qua realtime payload | `payments`/`receipts`/`payment_plans` bị DROP khỏi publication `20260714040000_realtime_signal_only_hardening.sql:8-41`; client chỉ nghe `realtime_signals` (`components/finance/finance-realtime-refresh.tsx:31-38` qua `realtimeSignalConfig` `hooks/use-realtime-signal.ts:6-12`) | `SELECT tablename FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename IN ('payments','receipts','payment_plans','expenses','expense_allocations','contracts');` (mong đợi rỗng) |

---

## 7. Mâu thuẫn tài liệu

| # | Vault/comment nói | Code nói | Kết luận |
|---|---|---|---|
| 1 | `vault/50-luong/vong-doi-hop-dong.md:45`: "Giao ngoài thì **`upsert_vendor_expense` sinh chi phí trích trước** ở `expenses`" | Hàm + trigger đã DROP: `20260825200000_cashflow_m1_expense_allocations.sql:175-178`; 0 định nghĩa trong `types/database.types.ts`; `vault/50-luong/luong-tien.md:45` ghi rõ đã bỏ | **Vault §3 sai/cũ.** Đây là mâu thuẫn đã biết mà đề bài nêu — xác nhận đúng. |
| 2 | `vault/50-luong/luong-tien.md:54`: "Bốn hàm đọc nó — **không hàm nào tự cộng lại**", liệt kê cả `finance_cashflow_timeline` | `finance_cashflow_timeline` **không gọi** `finance_period_ledger`; nó tự query `payments`+`receipts`+`expenses` (`20260826120000:324-336`). Ba hàm kia thì có (`20260826180000:229-230`, `20260826120000:200`, `:219`) | **Vault sai chi tiết** (số khớp nhờ cùng bộ lọc + `scripts/verify-reports.mjs:164-165`, nhưng "đọc nó" là không đúng). |
| 3 | `vault/50-luong/vong-doi-hop-dong.md:79`: "Lãi/lỗ: `finance_contract_profit_report` (doanh thu − chi phí vendor − in ấn − **vật tư**)" | `contract_financials` trừ **4** khoản: task (mọi task ≠ `da_huy`, gồm cả ekip nội bộ), đơn in, COGS kho, **phiếu chi `other` gắn HĐ** (`20260825200000:370-377`) | **Vault thiếu 1 khoản** (chi trực tiếp) và mô tả sai "chi phí vendor" (thực tế là mọi task). |
| 4 | `vault/50-luong/luong-tien.md:76`: "phải thu: … hoặc **`get_contract_balance`** cho 1 HĐ" | `get_contract_balance` **không có định nghĩa nào trong `supabase/migrations/`** và **không có call site nào** trong `app/`+`lib/` (grep toàn repo chỉ ra `types/database.types.ts:6242`, `vault/30-du-lieu/rpc-va-enum.md:46` và 2 file `plans/` cũ) | Hàm tồn tại trên DB nhưng **chết** — vault đang khuyên dùng một hàm không ai gọi và không có trong lịch sử migration. |
| 5 | `vault/40-module/tai-chinh.md:25` + `vault/50-luong/luong-tien.md:90`: "Bảng finance **không vào publication**, không grant" | Đúng cho hiện tại (`20260714040000:8-41` drop `payments`/`receipts`/`payment_plans` khỏi publication) | **Vault đúng** — nhưng comment trong code lại sai: `components/finance/finance-realtime-refresh.tsx:12-13` viết "receipts/payments/payment_plans: postgres_changes trực tiếp (đã trong publication)" trong khi ngay dưới (`:31-33`) dùng `realtimeSignalConfig` (nghe `realtime_signals`). **Comment code cũ hơn code.** |
| 6 | `vault/40-module/tai-chinh.md:36`: "Hiện thực tế mới có **1 dòng** trong `finance_monthly_closes`" | `vault/30-du-lieu/luoc-do-tai-chinh.md:27` (cùng vault, sinh từ DB) ghi `finance_monthly_closes` = **0 dòng**; `vault/80-van-hanh/so-lieu-van-hanh.md:73` xếp `finance_close_tasks` vào nhóm bảng rỗng | **Hai trang vault mâu thuẫn nhau.** Không kiểm được vì không chạm DB (§8). |
| 7 | `vault/40-module/tai-chinh.md:68` + `luong-tien.md:42`: lương cứng = "`employee_salaries.monthly_salary`" ở chỗ này, "`total_salary`" ở chỗ kia | Code M5 dùng **`total_salary`**; comment trong migration ghi rõ `monthly_salary` "không code nào ghi (M2 dùng nhầm → luôn 0)" (`20260827130000:85-86`) | `tai-chinh.md:68` (bản M2) **cũ**; `luong-tien.md:42` đúng. |
| 8 | `vault/40-module/tai-chinh.md:9`: "17 route" | Đếm được **19** thư mục route dưới `app/(protected)/finance/` (gồm 2 route redirect `lab-debts`, `vendor-debts`) | Sai lệch nhỏ, không ảnh hưởng tiền. |
| 9 | `vault/30-du-lieu/luoc-do-tai-chinh.md` header `cap-nhat: 2026-08-07` | Nội dung đã có `payee_type`/`payee_id`/`expense_allocations` (ADR-016, 25/08) | **Ngày trong frontmatter sai** — file đã regenerate sau 25/08 nhưng không cập nhật `cap-nhat`. Số dòng trong bảng (`expenses` 81, `expense_allocations` 40) là ảnh chụp sau M1, không phải 07/08. |

---

## 8. Chưa xác minh

1. **`process_contract_payment_v2` bản đang chạy trên prod.** File mới nhất trong repo (`20260527120000_fix_payment_race_condition.sql:5-201`) **không** ghi `payment_plan_allocations` và **không** gọi `sync_payment_plan_statuses_v2` (0 lần xuất hiện chuỗi `payment_plan_allocations` trong file). `agent/DECISIONS.md:144` khẳng định bản DB **có**. Tôi không chạy DB nên **không tự xác minh được** — mọi mô tả luồng (a) ở §4 về phân bổ đợt thu dựa trên ADR, không dựa trên file. Cũng chưa xác minh được đoạn "RPC tự tạo đợt `outside`" (`agent/DECISIONS.md:146`) — không có trong file repo.
2. **`recalc_contract_totals` và `get_contract_balance` không có `CREATE` trong `supabase/migrations/`** — chỉ có `ALTER`/`GRANT` (`20260421153000:581,588`) và một dòng trong `types/database.types.ts:6242`. Thân hàm nằm ngoài lịch sử migration của repo ⇒ không đọc được. Suy rộng: **lịch sử migration trong repo không đầy đủ** cho mọi object tài chính.
3. **Số dòng thực tế mọi bảng.** Không chạy `db-q.mjs`. Các con số ở `vault/30-du-lieu/luoc-do-tai-chinh.md` và `vault/80-van-hanh/so-lieu-van-hanh.md` là ảnh chụp cũ (mâu thuẫn #6 ở §7 không giải được).
4. **`types/database.types.ts` trễ 1 milestone.** mtime 2026-08-26 22:51 < M5 (`20260827130000`) ⇒ `sync_employee_salary_paid` = 0 kết quả trong file types **không** chứng minh hàm không tồn tại; ngược lại, việc `finance_dashboard_metrics`/`upsert_vendor_expense`/`record_vendor_payment_atomic` = 0 chỉ chứng minh chúng đã mất **tính đến 26/08**.
5. **`is_period_locked` có bao nhiêu overload.** `20260411160002:92` tạo `(DATE)`; không tìm thấy `DROP`/`CREATE` khác. Nhưng file đó dùng `GRANT EXECUTE ON FUNCTION public.is_period_locked` **không kèm chữ ký** (`:103-104`) — nếu DB có overload thì lệnh này sẽ lỗi; không kiểm được.
6. **Ảnh hưởng thật của lệch `net_salary` vs `total_salary`.** `finance_period_ledger.cost_salary_base` = Σ `employee_salaries.total_salary` (`20260827130000:87`, = base + bonus − penalty), còn `payable_items`/`sync_employee_salary_paid` dùng `net_salary` (`= total_salary − advance_payment`, `app/actions/salary-actions.ts:56-57`). Khi `advance_payment > 0` thì **accrual chi phí lương ≠ nợ lương phải trả**. Có bằng chứng code, **chưa xác minh** có dòng nào `advance_payment > 0` trên DB.
7. **Hoàn tiền HĐ đã huỷ tạo chi phí không có doanh thu đối ứng.** `createContractRefundExpense` ghi `expenses(contract_id, payee_type='other')` (`app/actions/contract-refund-actions.ts:178-192`) cho HĐ `status='da_huy'`; `finance_period_ledger.cost_direct` gom **mọi** phiếu chi `other` có `contract_id` **không lọc trạng thái HĐ** (`20260827130000:32`), trong khi `revenue_contract` **loại** `da_huy` (`:45`). ⇒ Về lý thuyết, hoàn tiền làm lỗ tháng đó mà không giảm doanh thu. Chưa xác minh có phiếu hoàn tiền nào tồn tại trên prod.
8. **`payable_items` nhánh `employee_salary` không lọc trạng thái/tháng.** Mọi dòng `employee_salaries` có `net_salary > 0` của nhân viên đều lên danh sách phải trả (`20260827130000:145-147`) — không có điều kiện "đã chốt sheet" hay giới hạn tháng. Chưa xác minh hệ quả thật vì chưa biết dữ liệu sheet hiện tại.
9. **`generateMonthlySalaryAction` lọc task bằng `.eq("status", "Hoàn thành")`** (`app/actions/salary-actions.ts:259` và `:355`) trong khi khắp DB dùng `'hoan_thanh'` (`20260827130000:137,142`). Nếu enum là `hoan_thanh` thì `taskMap`/cảnh báo payroll luôn rỗng. **Không ảnh hưởng tiền** (`product_salary` bị ép `= 0` ở `:421`), nhưng chưa xác minh giá trị enum thật của `work_tasks.status`.
10. **Không xác minh được thứ tự áp migration thực tế trên prod.** M2b (`20260826130000`) có ghi chú "KHÔNG áp cùng M2, điều kiện ≥ 2026-09-02" (`:5-6`) nhưng `agent/DECISIONS.md:139` nói đã áp 26/08. Tin ADR, nhưng không tự kiểm được.
11. **Chưa đọc:** `get_finance_intelligence` / `get_finance_advanced_intelligence` / `get_cashflow_forecast` chi tiết (3 hàm ~700 dòng ở `20260827130000:275-975`) — chỉ xác minh chúng tồn tại và là công thức riêng; **chưa** kiểm từng con số chúng trả về. Cũng chưa đọc `get_budget_vs_actual`, `get_expense_breakdown`, `finance_service_distribution`, `finance_receipt_documents`, `finance_receipt_document_stats`, `create_contract_inventory_addon_sale_atomic`, `cancel_contract_cascade`, `delete_contract_cascade`.
12. **Chưa đọc tầng UI chi tiết** của `/finance/expenses`, `/finance/receipts`, `/finance/closes`, `/finance/cashflow` — chỉ xác minh đường action → RPC. Riêng `payee_type` **không xuất hiện trong bất kỳ component nào** ở `components/finance/expenses/` (grep rỗng) ⇒ form phiếu chi thủ công luôn để mặc định `'other'`; nhưng `createExpenseSchema` **cho phép** truyền `lab/vendor/supplier/employee` (`lib/validations/finance.schema.ts:39`) — một phiếu chi như vậy sẽ vào `cash_out` mà **không** giảm công nợ (vì không có phân bổ). Chưa xác minh có dòng nào như vậy trên DB.
