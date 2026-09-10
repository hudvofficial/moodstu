---
title: "Kiểm kê — Hợp đồng"
lat-cat: 01-hop-dong
cap-nhat: 2026-09-01
trang-thai: sinh-tu-dong
nguon: pg_class · pg_proc · pg_policies · pg_trigger · pg_constraint · quét mã nguồn
---

> ⚙️ **Sinh bởi `scripts/vault-gen-kiem-ke.mjs` từ database production. ĐỪNG sửa tay.**
> Cột *vận hành thực tế* ở đây là dữ kiện đo được (ai ghi, ai đọc, còn sống hay không).
> Phần diễn giải *thiết kế ban đầu ↔ thực tế lệch nhau chỗ nào* nằm ở [[00-lech-thiet-ke]].

# Kiểm kê — Hợp đồng

9 bảng · 28 hàm DB

## Bảng dữ liệu

### `addon_history`

**Số dòng (ước):** 2 · **RLS:** bật · **Policy:** 1

**Policy:** addon_history_all:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `addon_name` | character varying | không | — |
| `addon_category` | USER-DEFINED | có | — |
| `last_price` | numeric | có | `0` |
| `usage_count` | integer | có | `1` |
| `last_used_at` | timestamp with time zone | có | `now()` |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (2):** `app/actions/addon-actions.ts` · `lib/services/addon-sync-service.ts`


### `checklist_templates`

**Số dòng (ước):** 62 · **RLS:** bật · **Policy:** 1

**Policy:** checklist_templates_authenticated:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `service_type` | character varying | không | — |
| `event_stage` | character varying | không | — |
| `category` | character varying | không | — |
| `item_name` | character varying | không | — |
| `sort_order` | integer | có | `0` |
| `is_active` | boolean | có | `true` |
| `created_at` | timestamp with time zone | có | `now()` |

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (1):** `app/actions/checklist-actions.ts`


### `contract_checklists`

**Số dòng (ước):** 333 · **RLS:** bật · **Policy:** 6

**Policy:** contract_checklists_authenticated_read:SELECT, contract_checklists_delete:DELETE, contract_checklists_insert:INSERT, contract_checklists_select:SELECT, contract_checklists_service_role_all:ALL, contract_checklists_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `contract_id` | uuid | không | — |
| `event_stage` | character varying | có | `''::character varying` |
| `category` | character varying | không | — |
| `item_name` | character varying | không | — |
| `is_completed` | boolean | có | `false` |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |

**Trỏ ra:** `contract_id`→`contracts` (CASCADE)

**Trigger:** `emit_realtime_signal`→emit_realtime_signal() · `trg_update_contract_checklists_updated_at`→update_contract_checklists_updated_at()

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (3):** `get_contract_detail_v2` · `get_contract_detail_v3` · `get_contract_list_v2`

**Chạm từ mã nguồn (4):** `app/actions/checklist-actions.ts` · `app/actions/contract-queries.ts` · `lib/client-direct/contract-drawer.ts` · `scripts/perf-operational-probe.mjs`


### `contract_events`

**Số dòng (ước):** 217 · **RLS:** bật · **Policy:** 6

**Policy:** contract_events_authenticated_read:SELECT, contract_events_delete:DELETE, contract_events_insert:INSERT, contract_events_select:SELECT, contract_events_service_role_all:ALL, contract_events_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `contract_id` | uuid | không | — |
| `event_type` | USER-DEFINED | không | — |
| `title` | character varying | có | — |
| `event_date` | timestamp with time zone | có | — |
| `end_date` | timestamp with time zone | có | — |
| `location` | character varying | có | — |
| `status` | character varying | có | `'chua_lam'::character varying` |
| `notes` | text | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |
| `phase` | text | có | `'pre_wedding'::text` |
| `sort_order` | integer | có | `0` |
| `deadline` | timestamp with time zone | có | — |
| `start_time` | time without time zone | có | — |
| `end_time` | time without time zone | có | — |
| `is_manual_date` | boolean | có | `false` |
| `deleted_at` | timestamp with time zone | có | — |
| `google_event_id` | text | có | — |
| `google_sync_status` | text | không | `'not_required'::text` |
| `google_sync_error` | text | có | — |
| `google_synced_at` | timestamp with time zone | có | — |
| `sync_to_google` | boolean | không | `true` |

**Trỏ ra:** `contract_id`→`contracts` (CASCADE)

**Bị trỏ tới bởi (1):** `work_tasks`

**Trigger:** `emit_realtime_signal`→emit_realtime_signal() · `update_contract_events_updated_at`→update_updated_at_column()

**CHECK:** `CHECK ((google_sync_status = ANY (ARRAY['not_required', 'pending', 'synced', 'failed', 'deleted', 'not_connected')))`

**GHI qua RPC (1):** `delete_contract_cascade`

**ĐỌC qua RPC (13):** `calendar_month_events` · `finance_debt_stats` · `finance_month_summary` · `finance_pending_collections` · `finance_period_ledger` · `get_contract_detail_v2` · `get_contract_detail_v3` · `get_contract_list_v2` · `get_employee_job_details` · `get_employee_productivity` · `get_receivable_aging` · `payable_items` … +1

**Chạm từ mã nguồn (28):** `app/actions/calendar-queries.ts` · `app/actions/contract-event-actions.ts` · `app/actions/contract-queries.ts` · `app/actions/gallery-drive-actions.ts` · `app/actions/work-task-actions.ts` · `lib/api/dashboard.ts` · `lib/client-direct/contract-drawer.ts` · `lib/contract-event-google-sync.ts` · `lib/moodie/core-engine.ts` · `lib/moodie/domain/gallery-context.ts` … +18


### `contract_items`

**Số dòng (ước):** 85 · **RLS:** bật · **Policy:** 4

**Policy:** contract_items_delete:DELETE, contract_items_insert:INSERT, contract_items_select:SELECT, contract_items_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `contract_id` | uuid | không | — |
| `type` | USER-DEFINED | không | `'dich_vu'::item_type_enum` |
| `is_addon` | boolean | có | `false` |
| `addon_category` | USER-DEFINED | có | — |
| `service_id` | uuid | có | — |
| `item_name` | character varying | không | — |
| `export_type` | USER-DEFINED | có | — |
| `quantity` | integer | có | `1` |
| `unit_price` | numeric | có | `0` |
| `original_price` | numeric | có | — |
| `discount_amount` | numeric | có | `0` |
| `total_amount` | numeric | có | `0` |
| `dress_id` | uuid | có | — |
| `notes` | text | có | — |
| `added_by` | uuid | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |
| `deleted_at` | timestamp with time zone | có | — |

**Trỏ ra:** `contract_id`→`contracts` (CASCADE) · `service_id`→`services` · `dress_id`→`dresses` · `added_by`→`auth.users`

**Bị trỏ tới bởi (2):** `dress_reservations` · `payments`

**Trigger:** `update_contract_items_updated_at`→update_updated_at_column()

**CHECK:** `CHECK ((discount_amount >= (0)))` · `CHECK ((quantity > 0))` · `CHECK ((total_amount >= (0)))` · `CHECK ((unit_price >= (0)))`

**GHI qua RPC (11):** `add_fulfillment_transaction_atomic` · `create_contract_inventory_addon_sale_atomic` · `create_dress_contract_reservation_atomic` · `delete_contract_cascade` · `delete_fulfillment_transaction_atomic` · `process_contract_payment_v2` · `release_dress_reservation_atomic` · `save_contract_atomic` · `update_dress_reservation_status_atomic` · `update_fulfillment_transaction_atomic` · `void_contract_payment_v2`

**ĐỌC qua RPC (9):** `contract_payment_health_checks` · `delete_dress_atomic` · `delete_service_atomic` · `finance_contract_profit_report` · `finance_reports_snapshot` · `finance_service_distribution` · `get_contract_detail_v2` · `get_contract_detail_v3` · `recalc_contract_totals`

**Chạm từ mã nguồn (17):** `app/actions/contract-lifecycle.ts` · `app/actions/dress-mutations.ts` · `app/actions/finance-dashboard-queries.ts` · `lib/services/dress-sync-service.ts` · `tests/e2e/cashflow-m1.spec.ts` · `tests/e2e/cashflow-m2.spec.ts` · `tests/e2e/cashflow-m3.spec.ts` · `tests/e2e/contract-mobile-detail-perf.spec.ts` · `tests/e2e/contract-multi-day-schedule.spec.ts` · `tests/e2e/contract-nav-jank.spec.ts` … +7


### `contract_notes`

**Số dòng (ước):** 2 · **RLS:** bật · **Policy:** 6

**Policy:** contract_notes_authenticated_read:SELECT, contract_notes_delete:DELETE, contract_notes_insert:INSERT, contract_notes_select:SELECT, contract_notes_service_role_all:ALL, contract_notes_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `contract_id` | uuid | không | — |
| `content` | text | không | — |
| `created_by` | uuid | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |

**Trỏ ra:** `contract_id`→`contracts` (CASCADE) · `created_by`→`auth.users`

**Trigger:** `emit_realtime_signal`→emit_realtime_signal()

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (1):** `get_contract_list_v2`

**Chạm từ mã nguồn (3):** `app/actions/contract-queries.ts` · `app/actions/note-actions.ts` · `lib/client-direct/contract-drawer.ts`


### `contracts`

**Số dòng (ước):** 64 · **RLS:** bật · **Policy:** 6

**Policy:** contracts_authenticated_read:SELECT, contracts_delete:DELETE, contracts_insert:INSERT, contracts_select:SELECT, contracts_service_role_all:ALL, contracts_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `contract_code` | character varying | không | — |
| `transaction_type` | USER-DEFINED | không | `'hop_dong'::transaction_type_enum` |
| `customer_id` | uuid | không | — |
| `service_type` | USER-DEFINED | không | — |
| `status` | character varying | không | `'cho_xu_ly'::character varying` |
| `payment_status` | character varying | không | `'chua_thanh_toan'::character varying` |
| `contract_date` | date | không | `CURRENT_DATE` |
| `work_date` | timestamp with time zone | có | — |
| `delivery_date` | date | có | — |
| `total_amount` | numeric | không | `0` |
| `discount_amount` | numeric | có | `0` |
| `paid_amount` | numeric | có | `0` |
| `remaining_amount` | numeric | có | `0` |
| `description` | text | có | — |
| `notes` | text | có | — |
| `created_by` | uuid | có | — |
| `assigned_to` | uuid | có | — |
| `updated_by` | uuid | có | — |
| `deleted_at` | timestamp with time zone | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |
| `cancel_reason` | text | có | — |
| `cancelled_at` | timestamp with time zone | có | — |
| `cancelled_by` | uuid | có | — |

**Trỏ ra:** `customer_id`→`customers` · `created_by`→`auth.users` · `updated_by`→`auth.users` · `cancelled_by`→`auth.users`

**Bị trỏ tới bởi (18):** `expenses` · `contract_items` · `contract_events` · `dress_reservations` · `payments` · `payment_plans` · `work_tasks` · `schedules` · `gallery_selection_batches` · `galleries` · `printing_orders` · `contract_notes` · `contract_checklists` · `inventory_transactions` · `receipts` · `dress_rentals` · `debts` · `payment_plan_allocations`

**Trigger:** `audit_contracts`→log_audit_action() · `emit_realtime_signal`→emit_realtime_signal() · `trg_contract_payment_status_v2`→trg_contract_payment_status_v2() · `update_contracts_updated_at`→update_updated_at_column()

**CHECK:** `CHECK ((((contract_date IS NULL) OR (work_date IS NULL) OR (work_date >= contract_date)) AND ((work_date IS NULL) OR (delivery_date IS NULL) OR (delivery_date >= work_date)) AND ((contract_date IS NULL) OR (delivery_date IS NULL) OR (delivery_date >= contract_date)))) NOT VALID` · `CHECK ((discount_amount >= (0)))` · `CHECK ((paid_amount >= (0)))` · `CHECK ((total_amount >= (0)))`

**GHI qua RPC (10):** `add_fulfillment_transaction_atomic` · `cancel_contract_cascade` · `create_contract_inventory_addon_sale_atomic` · `delete_contract_cascade` · `delete_fulfillment_transaction_atomic` · `process_contract_payment_v2` · `recalc_contract_totals` · `save_contract_atomic` · `update_fulfillment_transaction_atomic` · `void_contract_payment_v2`

**ĐỌC qua RPC (34):** `backfill_payment_plan_ssot_v2` · `calendar_month_events` · `contract_financials` · `contract_payment_health_checks` · `contract_stats` · `contract_stats_simple` · `create_printing_order_atomic` · `dashboard_critical_kpis` · `dashboard_service_breakdown` · `finance_contract_profit_report` · `finance_debt_stats` · `finance_ledger` … +22

**Chạm từ mã nguồn (51):** `app/actions/contract-event-actions.ts` · `app/actions/contract-lifecycle.ts` · `app/actions/contract-mutations.ts` · `app/actions/contract-queries.ts` · `app/actions/contract-refund-actions.ts` · `app/actions/customer-actions.ts` · `app/actions/finance-dashboard-queries.ts` · `app/actions/finance-operations-queries.ts` · `app/actions/finance-reports-queries.ts` · `app/actions/gallery-drive-actions.ts` … +41


### `event_templates`

**Số dòng (ước):** 11 · **RLS:** bật · **Policy:** 1

**Policy:** Authenticated users can read event_templates:SELECT

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `service_type` | USER-DEFINED | không | — |
| `event_type` | USER-DEFINED | không | — |
| `event_name` | text | không | — |
| `default_days_offset` | integer | có | `0` |
| `sort_order` | integer | có | `0` |
| `is_active` | boolean | có | `true` |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (1):** `app/actions/contract-event-actions.ts`


### `work_tasks`

**Số dòng (ước):** 166 · **RLS:** bật · **Policy:** 6

**Policy:** work_tasks_authenticated_read:SELECT, work_tasks_delete:DELETE, work_tasks_insert:INSERT, work_tasks_select:SELECT, work_tasks_service_role_all:ALL, work_tasks_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `contract_id` | uuid | không | — |
| `event_id` | uuid | có | — |
| `work_type` | USER-DEFINED | không | — |
| `assigned_to` | uuid | có | — |
| `status` | character varying | có | `'chua_lam'::character varying` |
| `deadline` | timestamp with time zone | có | — |
| `start_date` | timestamp with time zone | có | — |
| `completion_date` | timestamp with time zone | có | — |
| `cost` | numeric | có | `0` |
| `notes` | text | có | — |
| `created_by` | uuid | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |
| `start_time` | text | có | — |
| `end_time` | text | có | — |
| `vendor_id` | uuid | có | — |

**Trỏ ra:** `contract_id`→`contracts` · `event_id`→`contract_events` · `created_by`→`auth.users` · `assigned_to`→`employees` · `vendor_id`→`vendors`

**Bị trỏ tới bởi (1):** `expenses`

**Trigger:** `emit_realtime_signal`→emit_realtime_signal() · `update_work_tasks_updated_at`→update_updated_at_column()

**CHECK:** `CHECK ((((assigned_to IS NULL) AND (vendor_id IS NULL)) OR ((assigned_to IS NOT NULL) AND (vendor_id IS NULL)) OR ((assigned_to IS NULL) AND (vendor_id IS NOT NULL))))`

**GHI qua RPC (2):** `cancel_contract_cascade` · `delete_contract_cascade`

**ĐỌC qua RPC (13):** `calendar_month_events` · `contract_financials` · `finance_period_ledger` · `get_contract_detail_v2` · `get_contract_detail_v3` · `get_contract_list_v2` · `get_employee_job_details` · `get_employee_productivity` · `payable_items` · `payable_remaining` · `payee_payment_history` · `printing_integrity_report` … +1

**Chạm từ mã nguồn (35):** `app/actions/calendar-mutations.ts` · `app/actions/calendar-task-actions.ts` · `app/actions/contract-event-actions.ts` · `app/actions/contract-lifecycle.ts` · `app/actions/contract-mutations.ts` · `app/actions/contract-queries.ts` · `app/actions/finance-dashboard-queries.ts` · `app/actions/finance-reports-queries.ts` · `app/actions/salary-actions.ts` · `app/actions/task-assign-actions.ts` … +25


## Hàm DB

| Hàm | Trả về | Quyền | Tính chất | Bảng chạm | Gọi từ mã nguồn |
|---|---|---|---|---|---|
| `calendar_month_events(p_month integer, p_year integer)` | `TABLE(event_source text, id uuid, event_type text, event_date text, end_date text, employee_id uuid, contract_id uuid, status text, google_event_id text, color_id text, location text, notes text, work_type text, assigned_to uuid, start_date text, start_time text, end_time text, deadline text, event_id uuid, contract_code text, customer_name text)` | invoker | STABLE | contract_events, contracts, customers, schedules, work_tasks | 3 file |
| `cancel_contract_cascade(p_contract_id uuid, p_reason text, p_user_id uuid)` | `void` | **DEFINER** | VOLATILE | contracts, dress_reservations, payment_plans, printing_orders, work_tasks | 1 file |
| `contract_financials(p_contract_ids uuid[])` | `TABLE(contract_id uuid, revenue numeric, task_cost numeric, print_cost numeric, cogs numeric, direct_cost numeric, total_cost numeric, profit numeric, profit_margin numeric)` | **DEFINER** | STABLE | contracts, expenses, inventory_transactions, printing_orders, work_tasks | 7 file |
| `contract_stats()` | `TABLE(total bigint, active bigint, pending bigint, completed bigint, revenue numeric, outstanding numeric, growth_total integer)` | invoker | STABLE | contracts | 4 file |
| `contract_stats_simple()` | `TABLE(total bigint, active bigint, pending bigint, completed bigint, this_month bigint, last_month bigint)` | invoker | STABLE | contracts | 1 file |
| `create_contract_inventory_addon_sale_atomic(p_contract_id uuid, p_item_id uuid, p_quantity integer, p_sale_unit_pr)` | `jsonb` | **DEFINER** | VOLATILE | contract_items, contracts, finance_monthly_closes, inventory_items, inventory_transactions, payments | 1 file |
| `dashboard_critical_kpis(p_month integer, p_year integer)` | `TABLE(current_revenue numeric, previous_revenue numeric, total_debt numeric, current_contracts bigint, previous_contracts bigint, current_completed bigint, previous_completed bigint)` | invoker | STABLE | contracts, payments, receipts | 3 file |
| `dashboard_service_breakdown(p_month integer, p_year integer, p_can_view_financials boolean)` | `TABLE(service_type text, contract_count bigint, revenue numeric)` | invoker | STABLE | contracts | 4 file |
| `delete_contract_cascade(p_contract_id uuid, p_user_id uuid)` | `void` | **DEFINER** | VOLATILE | contract_events, contract_items, contracts, dress_reservations, payment_plans, payments +2 | 1 file |
| `finance_contract_profit_report(p_status text, p_from date, p_to date, p_page integer, p_page_size int)` | `TABLE(id uuid, contract_code text, customer_name text, contract_date date, status text, total_amount numeric, paid_amount numeric, remaining_amount numeric, package_revenue numeric, addon_revenue numeric, discount numeric, task_cost numeric, print_cost numeric, expense_cost numeric, total_cost numeric, profit numeric, profit_margin numeric, total_count integer)` | **DEFINER** | VOLATILE | contract_items, contracts, customers | 3 file |
| `finance_debt_stats()` | `TABLE(receivable numeric, payable numeric, overdue numeric, net_debt numeric, aging jsonb)` | **DEFINER** | STABLE | contract_events, contracts, debts | 5 file |
| `finance_month_summary(p_month integer, p_year integer)` | `TABLE(cash_in numeric, cash_in_contract numeric, cash_in_retail numeric, cash_out numeric, cash_out_settlement numeric, cash_out_other numeric, cash_net numeric, cash_net_prev numeric, revenue numeric, revenue_contract numeric, revenue_retail numeric, cost_total numeric, cost_task numeric, cost_print numeric, cost_cogs numeric, cost_direct numeric, cost_overhead numeric, cost_salary_base numeric, profit numeric, profit_prev numeric, profit_margin numeric, contracts_shot bigint, contracts_missing_work_date bigint, receivable numeric, receivable_due numeric, receivable_waiting numeric, payable numeric, payable_lab numeric, payable_vendor numeric, payable_supplier numeric, payable_employee numeric)` | **DEFINER** | STABLE | contract_events, contracts | 6 file |
| `finance_pending_collections(p_limit integer)` | `TABLE(id uuid, contract_code text, customer_id uuid, customer_name text, customer_phone text, status text, total_amount numeric, paid_amount numeric, remaining_amount numeric, contract_date date, work_date timestamp with time zone, delivered_at date)` | **DEFINER** | STABLE | contract_events, contracts, customers | 4 file |
| `finance_period_ledger(p_start date, p_end date)` | `TABLE(cash_in_contract numeric, cash_in_retail numeric, cash_out numeric, cash_out_settlement numeric, cash_out_salary numeric, cash_out_fixed numeric, revenue_contract numeric, revenue_retail numeric, signed_revenue numeric, signed_contracts bigint, contracts_shot bigint, contracts_completed bigint, cost_task numeric, cost_print numeric, cost_cogs_contract numeric, cost_cogs_retail numeric, cost_direct numeric, cost_overhead numeric, cost_fixed numeric, cost_salary_base numeric)` | **DEFINER** | STABLE | contract_events, contracts, employee_salaries, expense_allocations, expenses, inventory_transactions +4 | 1 file |
| `finance_reports_snapshot(p_start_date date, p_end_date date)` | `jsonb` | **DEFINER** | STABLE | contract_items, contracts | 4 file |
| `finance_service_distribution(p_month integer, p_year integer)` | `TABLE(name text, value integer, revenue numeric)` | invoker | STABLE | contract_items, contracts, services | 1 file |
| `get_contract_balance(p_contract_id uuid)` | `json` | **DEFINER** | VOLATILE | contracts, payments | **0 — không ai gọi** |
| `get_contract_list_v2(p_status text, p_search text, p_service_type text, p_sort text, p_time)` | `jsonb` | **DEFINER** | VOLATILE | contract_checklists, contract_events, contract_notes, contracts, customers, work_tasks | 5 file |
| `get_customer_ltv(p_ids uuid[])` | `TABLE(customer_id uuid, ltv numeric)` | **DEFINER** | STABLE | contracts | **0 — không ai gọi** |
| `get_employee_job_details(p_employee_id uuid, p_start_date date, p_end_date date)` | `TABLE(contract_id uuid, contract_code text, client_name text, service_type text, event_date date, work_type text, status text, deadline date, cost numeric)` | **DEFINER** | STABLE | contract_events, contracts, customers, work_tasks | 3 file |
| `get_employee_productivity(p_start_date date, p_end_date date)` | `TABLE(employee_id uuid, full_name text, role employee_role_enum, onsite_hours numeric, active_tasks integer, completed_tasks integer, post_production_active integer, overdue_tasks integer, total_cost numeric)` | **DEFINER** | STABLE | contract_events, contracts, employees, work_tasks | 3 file |
| `get_finance_advanced_intelligence(p_month integer, p_year integer)` | `jsonb` | **DEFINER** | STABLE | contracts, crm_leads, customers, dress_rentals, dresses, expenses +5 | 1 file |
| `get_receivable_aging()` | `json` | **DEFINER** | VOLATILE | contract_events, contracts | 3 file |
| `payable_items(p_payee_type text, p_payee_id uuid)` | `TABLE(target_type text, target_id uuid, item_date date, label text, committed numeric, allocated numeric, remaining numeric)` | invoker | STABLE | contract_events, contracts, employee_salaries, expense_allocations, expenses, inventory_items +3 | 5 file |
| `payee_payment_history(p_payee_type text, p_payee_id uuid)` | `TABLE(expense_id uuid, expense_date date, amount numeric, payment_method text, note text, created_at timestamp with time zone, created_by uuid, allocations jsonb)` | **DEFINER** | STABLE | contracts, employee_salaries, expense_allocations, expenses, inventory_items, inventory_transactions +2 | 6 file |
| `recalc_contract_totals(p_contract_id uuid)` | `void` | **DEFINER** | VOLATILE | contract_items, contracts, payments | 1 file |
| `save_contract_atomic(p_contract jsonb, p_customer jsonb, p_items jsonb, p_actor_id uuid, p_)` | `json` | **DEFINER** | VOLATILE | contract_items, contracts, customers, payments | 4 file |
| `vendor_cost_report(p_month integer, p_year integer)` | `TABLE(vendor_id uuid, vendor_name text, vendor_phone text, service_type text, job_count bigint, total_cost numeric, contracts text[])` | **DEFINER** | STABLE | contract_events, contracts, vendors, work_tasks | 2 file |

Thân đầy đủ từng hàm: `vault/30-du-lieu/than-ham/`.
