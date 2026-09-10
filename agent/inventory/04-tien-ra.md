---
title: "Kiểm kê — Tiền ra & sổ kỳ"
lat-cat: 04-tien-ra
cap-nhat: 2026-09-01
trang-thai: sinh-tu-dong
nguon: pg_class · pg_proc · pg_policies · pg_trigger · pg_constraint · quét mã nguồn
---

> ⚙️ **Sinh bởi `scripts/vault-gen-kiem-ke.mjs` từ database production. ĐỪNG sửa tay.**
> Cột *vận hành thực tế* ở đây là dữ kiện đo được (ai ghi, ai đọc, còn sống hay không).
> Phần diễn giải *thiết kế ban đầu ↔ thực tế lệch nhau chỗ nào* nằm ở [[00-lech-thiet-ke]].

# Kiểm kê — Tiền ra & sổ kỳ

13 bảng · 18 hàm DB

## Bảng dữ liệu

### `budgets`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 1

**Policy:** authenticated_budgets:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `category_name` | character varying | không | — |
| `budget_amount` | numeric | không | `0` |
| `period_month` | integer | không | — |
| `period_year` | integer | không | — |
| `notes` | text | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |
| `deleted_at` | timestamp with time zone | có | — |

**Trigger:** `emit_realtime_signal`→emit_realtime_signal()

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (1):** `get_budget_vs_actual`

**Chạm từ mã nguồn (1):** `app/actions/goal-budget-actions.ts`


### `credit_cards`

**Số dòng (ước):** 4 · **RLS:** bật · **Policy:** 1

**Policy:** authenticated_credit_cards:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `bank_name` | character varying | không | — |
| `card_label` | character varying | có | — |
| `last_4` | character varying | có | — |
| `statement_day` | integer | không | `1` |
| `due_day` | integer | không | `15` |
| `due_next_month` | boolean | có | `false` |
| `credit_limit` | numeric | có | `0` |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |
| `deleted_at` | timestamp with time zone | có | — |

**Bị trỏ tới bởi (1):** `debts`

**Trigger:** `emit_realtime_signal`→emit_realtime_signal()

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (5):** `app/(protected)/settings/credit-cards/page.tsx` · `app/actions/debt-actions.ts` · `app/actions/finance-operations-queries.ts` · `scripts/smoke-settings.mjs` · `tests/e2e/settings-realtime-crud.spec.ts`


### `debts`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 4

**Policy:** debts_delete:DELETE, debts_insert:INSERT, debts_select:SELECT, debts_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `type` | character varying | không | — |
| `entity_type` | character varying | không | — |
| `entity_id` | uuid | có | — |
| `entity_name` | character varying | không | — |
| `amount` | numeric | không | — |
| `paid_amount` | numeric | có | `0` |
| `remaining` | numeric | có | `0` |
| `due_date` | date | có | — |
| `status` | character varying | có | `'open'::character varying` |
| `notes` | text | có | — |
| `created_by` | uuid | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |
| `deleted_at` | timestamp with time zone | có | — |
| `installment_total` | integer | có | — |
| `installment_paid` | integer | có | `0` |
| `installment_amount` | numeric | có | — |
| `platform` | text | có | — |
| `card_id` | uuid | có | — |
| `contract_id` | uuid | có | — |
| `debt_date` | date | có | — |
| `payment_date` | date | có | — |

**Trỏ ra:** `created_by`→`auth.users` · `card_id`→`credit_cards` (SET NULL) · `contract_id`→`contracts` (SET NULL)

**Bị trỏ tới bởi (2):** `receipts` · `expenses`

**Trigger:** `emit_realtime_signal`→emit_realtime_signal() · `update_debts_updated_at`→update_updated_at_column()

**CHECK:** `CHECK ((amount > (0)))` · `CHECK (((status)= ANY ((ARRAY['open', 'partial', 'closed'))))` · `CHECK (((type)= ANY ((ARRAY['receivable', 'payable'))))`

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (2):** `finance_debt_stats` · `get_finance_intelligence`

**Chạm từ mã nguồn (4):** `app/actions/debt-actions.ts` · `app/actions/finance-operations-queries.ts` · `scripts/smoke-settings.mjs` · `tests/integration/finance-mutations.test.ts`


### `expense_allocations`

**Số dòng (ước):** 42 · **RLS:** bật · **Policy:** 0 ⚠️ bật RLS nhưng 0 policy ⇒ anon key bị chặn hoàn toàn

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `expense_id` | uuid | không | — |
| `target_type` | text | không | — |
| `target_id` | uuid | không | — |
| `amount` | numeric | không | — |
| `created_at` | timestamp with time zone | không | `now()` |
| `created_by` | uuid | có | — |

**Trỏ ra:** `expense_id`→`expenses` (CASCADE)

**CHECK:** `CHECK ((amount > (0)))` · `CHECK ((target_type = ANY (ARRAY['printing_order', 'work_task', 'inventory_transaction', 'employee_salary')))`

**GHI qua RPC (1):** `record_payee_payment_atomic`

**ĐỌC qua RPC (9):** `delete_printing_order_atomic` · `finance_period_ledger` · `payable_items` · `payable_remaining` · `payee_payment_history` · `printing_integrity_report` · `recompute_printing_payment_status` · `sync_employee_salary_paid` · `void_payee_payment_atomic`

**Chạm từ mã nguồn (8):** `app/actions/expense-actions.ts` · `app/actions/lab-queries.ts` · `app/actions/printing-queries.ts` · `tests/e2e/cashflow-m1.spec.ts` · `tests/e2e/cashflow-m2.spec.ts` · `tests/e2e/cashflow-m3.spec.ts` · `tests/e2e/cashflow-m5.spec.ts` · `tests/e2e/printing-drawer-fixes-verify.spec.ts`


### `expenses`

**Số dòng (ước):** 85 · **RLS:** bật · **Policy:** 4

**Policy:** expenses_delete:DELETE, expenses_insert:INSERT, expenses_select:SELECT, expenses_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `expense_date` | date | không | `CURRENT_DATE` |
| `payment_method` | USER-DEFINED | không | `'tien_mat'::payment_method_enum` |
| `category_id` | uuid | có | — |
| `contract_id` | uuid | có | — |
| `amount` | numeric | không | — |
| `description` | text | có | — |
| `recipient` | character varying | có | — |
| `image_url` | text | có | — |
| `approved_by` | uuid | có | — |
| `created_by` | uuid | có | — |
| `deleted_at` | timestamp with time zone | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |
| `printing_order_id` | uuid | có | — |
| `work_task_id` | uuid | có | — |
| `debt_id` | uuid | có | — |
| `payee_type` | text | không | `'other'::text` |
| `payee_id` | uuid | có | — |
| `legacy_source` | text | có | — |
| `legacy_source_id` | uuid | có | — |

**Trỏ ra:** `contract_id`→`contracts` · `category_id`→`transaction_categories` · `created_by`→`auth.users` · `approved_by`→`auth.users` · `work_task_id`→`work_tasks` (SET NULL) · `debt_id`→`debts` (SET NULL) · `printing_order_id`→`printing_orders`

**Bị trỏ tới bởi (1):** `expense_allocations`

**Trigger:** `audit_expenses`→log_audit_action() · `emit_realtime_signal`→emit_realtime_signal() · `update_expenses_updated_at`→update_updated_at_column()

**CHECK:** `CHECK ((amount > (0)))` · `CHECK ((payee_type = ANY (ARRAY['lab', 'vendor', 'supplier', 'employee', 'other')))`

**GHI qua RPC (2):** `record_payee_payment_atomic` · `void_payee_payment_atomic`

**ĐỌC qua RPC (20):** `contract_financials` · `delete_printing_order_atomic` · `finance_cashflow_timeline` · `finance_expense_stats` · `finance_ledger` · `finance_ledger_range` · `finance_payable_summary` · `finance_period_ledger` · `get_budget_vs_actual` · `get_cashflow_forecast` · `get_expense_breakdown` · `get_finance_advanced_intelligence` … +8

**Chạm từ mã nguồn (18):** `app/actions/contract-refund-actions.ts` · `app/actions/debt-actions.ts` · `app/actions/expense-actions.ts` · `app/actions/finance-category-actions.ts` · `app/actions/finance-close-actions.ts` · `app/actions/finance-dashboard-queries.ts` · `app/actions/finance-operations-queries.ts` · `app/actions/finance-reports-queries.ts` · `app/actions/goal-budget-actions.ts` · `app/actions/lab-queries.ts` … +8


### `finance_close_tasks`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 1

**Policy:** service_role_close_tasks:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `close_id` | uuid | không | — |
| `step_number` | integer | không | — |
| `step_name` | text | không | — |
| `status` | text | không | `'chua_bat_dau'::text` |
| `assignee_id` | uuid | có | — |
| `started_at` | timestamp with time zone | có | — |
| `completed_at` | timestamp with time zone | có | — |
| `notes` | text | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |

**Trỏ ra:** `close_id`→`finance_monthly_closes` (CASCADE) · `assignee_id`→`auth.users`

**CHECK:** `CHECK (((step_number >= 1) AND (step_number <= 8)))`

**GHI qua RPC (1):** `advance_close_task`

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (1):** `app/actions/finance-close-actions.ts`


### `finance_monthly_closes`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 1

**Policy:** service_role_closes:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `period` | text | không | — |
| `status` | text | không | `'draft'::text` |
| `snapshot_metrics` | jsonb | có | `'{}'::jsonb` |
| `locked_by` | uuid | có | — |
| `locked_at` | timestamp with time zone | có | — |
| `notes` | text | có | — |
| `created_by` | uuid | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |

**Trỏ ra:** `locked_by`→`auth.users` · `created_by`→`auth.users`

**Bị trỏ tới bởi (1):** `finance_close_tasks`

**GHI qua RPC (1):** `advance_close_task`

**ĐỌC qua RPC (4):** `create_contract_inventory_addon_sale_atomic` · `is_period_locked` · `process_contract_payment_v2` · `void_contract_payment_v2`

**Chạm từ mã nguồn (4):** `app/actions/finance-close-actions.ts` · `app/actions/finance-operations-queries.ts` · `lib/finance-utils.ts` · `tests/integration/finance-mutations.test.ts`


### `financial_goals`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 1

**Policy:** authenticated_goals:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `name` | character varying | không | — |
| `target_amount` | numeric | không | `0` |
| `current_amount` | numeric | không | `0` |
| `deadline` | date | có | — |
| `icon` | character varying | có | `'savings'::character varying` |
| `color` | character varying | có | `'emerald'::character varying` |
| `status` | character varying | có | `'active'::character varying` |
| `notes` | text | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |
| `deleted_at` | timestamp with time zone | có | — |

**Bị trỏ tới bởi (1):** `goal_contributions`

**Trigger:** `emit_realtime_signal`→emit_realtime_signal()

**CHECK:** `CHECK (((status)= ANY ((ARRAY['active', 'completed', 'cancelled'))))`

**GHI qua RPC (3):** `contribute_to_goal` · `decrement_goal_amount` · `undo_contribution_atomic`

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (2):** `app/actions/finance-operations-queries.ts` · `app/actions/goal-budget-actions.ts`


### `fixed_costs`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 4

**Policy:** fixed_costs_delete:DELETE, fixed_costs_insert:INSERT, fixed_costs_select:SELECT, fixed_costs_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `cost_code` | character varying | không | — |
| `cost_name` | character varying | không | — |
| `cost_type` | character varying | có | — |
| `description` | text | có | — |
| `monthly_amount` | numeric | có | `0` |
| `deposit_amount` | numeric | có | `0` |
| `start_date` | date | có | — |
| `end_date` | date | có | — |
| `created_by` | uuid | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |
| `deleted_at` | timestamp with time zone | có | — |

**Trỏ ra:** `created_by`→`auth.users`

**Trigger:** `emit_realtime_signal`→emit_realtime_signal() · `update_fixed_costs_updated_at`→update_updated_at_column()

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (2):** `get_cashflow_forecast` · `get_finance_intelligence`

**Chạm từ mã nguồn (5):** `app/actions/expense-actions.ts` · `app/actions/finance-close-actions.ts` · `app/actions/finance-operations-queries.ts` · `app/actions/finance-reports-queries.ts` · `app/actions/fixed-cost-actions.ts`


### `goal_contributions`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 1

**Policy:** authenticated_contributions:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `goal_id` | uuid | không | — |
| `amount` | numeric | không | `0` |
| `contribution_date` | date | có | `CURRENT_DATE` |
| `notes` | text | có | — |
| `created_at` | timestamp with time zone | có | `now()` |

**Trỏ ra:** `goal_id`→`financial_goals` (CASCADE)

**GHI qua RPC (2):** `contribute_to_goal` · `undo_contribution_atomic`

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (2):** `app/actions/finance-operations-queries.ts` · `app/actions/goal-budget-actions.ts`


### `investment_maintenance_logs`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 1

**Policy:** authenticated_maintenance_logs:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `investment_id` | uuid | không | — |
| `maintenance_date` | date | không | — |
| `description` | text | có | — |
| `cost` | numeric | có | `0` |
| `performed_by` | character varying | có | — |
| `created_at` | timestamp with time zone | có | `now()` |

**Trỏ ra:** `investment_id`→`investments` (CASCADE)

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (1):** `app/actions/investment-actions.ts`


### `investments`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 1

**Policy:** authenticated_investments:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `name` | character varying | không | — |
| `category` | character varying | không | `'equipment'::character varying` |
| `purchase_date` | date | không | — |
| `purchase_price` | numeric | không | `0` |
| `useful_life_months` | integer | có | `36` |
| `depreciation_method` | character varying | có | `'straight_line'::character varying` |
| `salvage_value` | numeric | có | `0` |
| `status` | character varying | có | `'active'::character varying` |
| `condition` | character varying | có | `'good'::character varying` |
| `serial_number` | character varying | có | — |
| `location` | character varying | có | — |
| `notes` | text | có | — |
| `next_maintenance_date` | date | có | — |
| `maintenance_interval_days` | integer | có | — |
| `linked_revenue` | numeric | có | `0` |
| `sold_price` | numeric | có | — |
| `sold_date` | date | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |
| `deleted_at` | timestamp with time zone | có | — |

**Bị trỏ tới bởi (1):** `investment_maintenance_logs`

**Trigger:** `emit_realtime_signal`→emit_realtime_signal()

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (3):** `app/actions/finance-close-actions.ts` · `app/actions/finance-operations-queries.ts` · `app/actions/investment-actions.ts`


### `transaction_categories`

**Số dòng (ước):** 14 · **RLS:** bật · **Policy:** 4

**Policy:** transaction_categories_delete:DELETE, transaction_categories_insert:INSERT, transaction_categories_select:SELECT, transaction_categories_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `category_code` | character varying | không | — |
| `name` | character varying | không | — |
| `type` | character varying | không | — |
| `is_default` | boolean | có | `false` |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |

**Bị trỏ tới bởi (2):** `payments` · `expenses`

**Trigger:** `emit_realtime_signal`→emit_realtime_signal() · `update_transaction_categories_updated_at`→update_updated_at_column()

**CHECK:** `CHECK (((type)= ANY ((ARRAY['thu', 'chi'))))`

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (9):** `finance_ledger` · `finance_ledger_range` · `finance_receipt_documents` · `get_budget_vs_actual` · `get_expense_breakdown` · `get_finance_advanced_intelligence` · `record_payee_payment_atomic` · `resolve_printing_expense_category_id` · `resolve_vendor_expense_category_id`

**Chạm từ mã nguồn (7):** `app/actions/contract-refund-actions.ts` · `app/actions/expense-actions.ts` · `app/actions/finance-category-actions.ts` · `app/actions/finance-operations-queries.ts` · `app/actions/goal-budget-actions.ts` · `app/actions/payment-actions.ts` · `tests/integration/finance-mutations.test.ts`


## Hàm DB

| Hàm | Trả về | Quyền | Tính chất | Bảng chạm | Gọi từ mã nguồn |
|---|---|---|---|---|---|
| `advance_close_task(p_close_id uuid, p_step_number integer, p_new_status text, p_actor_id )` | `void` | **DEFINER** | VOLATILE | finance_close_tasks, finance_monthly_closes | 1 file |
| `contribute_to_goal(p_goal_id uuid, p_amount numeric, p_notes text)` | `void` | invoker | VOLATILE | financial_goals, goal_contributions | 1 file |
| `decrement_goal_amount(p_goal_id uuid, p_amount numeric)` | `void` | invoker | VOLATILE | financial_goals | **0 — không ai gọi** |
| `finance_expense_stats(p_month integer, p_year integer)` | `TABLE(total_expenses bigint, total_amount numeric, approved_count bigint, pending_count bigint)` | invoker | STABLE | expenses | 1 file |
| `finance_ledger(p_page integer, p_page_size integer, p_month integer, p_year integer, )` | `TABLE(id uuid, source_table text, direction text, transaction_date date, amount numeric, code text, customer_name text, category_name text, payment_method text, description text, status text, total_count integer)` | invoker | STABLE | contracts, customers, expenses, payments, receipts, transaction_categories | 2 file |
| `get_budget_vs_actual(p_month integer, p_year integer)` | `json` | **DEFINER** | VOLATILE | budgets, expenses, transaction_categories | 1 file |
| `get_cashflow_forecast(p_days integer)` | `json` | **DEFINER** | VOLATILE | contracts, employee_salaries, expenses, fixed_costs, monthly_salaries, payments +1 | 1 file |
| `get_expense_breakdown(p_month integer, p_year integer)` | `json` | **DEFINER** | VOLATILE | expenses, transaction_categories | 1 file |
| `get_finance_intelligence()` | `json` | **DEFINER** | VOLATILE | debts, expenses, fixed_costs, monthly_salaries, payments, receipts | 1 file |
| `is_period_locked(p_date date)` | `boolean` | invoker | STABLE | finance_monthly_closes | 3 file |
| `payable_remaining(p_target_type text, p_target_id uuid, p_payee_id uuid)` | `numeric` | invoker | STABLE | employee_salaries, expense_allocations, expenses, inventory_items, inventory_transactions, printing_orders +1 | 1 file |
| `printing_integrity_report()` | `TABLE(check_name text, issue_count bigint)` | **DEFINER** | STABLE | employee_salaries, expense_allocations, expenses, inventory_transactions, printing_orders, work_tasks | 2 file |
| `recompute_printing_payment_status(p_order_id uuid)` | `void` | invoker | VOLATILE | expense_allocations, expenses, printing_orders | 1 file |
| `record_payee_payment_atomic(p_payee_type text, p_payee_id uuid, p_amount numeric, p_payment_method)` | `jsonb` | **DEFINER** | VOLATILE | employee_salaries, employees, expense_allocations, expenses, labs, transaction_categories +1 | 11 file |
| `resolve_printing_expense_category_id()` | `uuid` | **DEFINER** | VOLATILE | system_settings, transaction_categories | **0 — không ai gọi** |
| `sync_employee_salary_paid(p_salary_id uuid)` | `void` | invoker | VOLATILE | employee_salaries, expense_allocations, expenses | 1 file |
| `undo_contribution_atomic(p_contribution_id uuid)` | `json` | **DEFINER** | VOLATILE | financial_goals, goal_contributions | 1 file |
| `void_payee_payment_atomic(p_expense_id uuid, p_actor_id uuid)` | `jsonb` | **DEFINER** | VOLATILE | expense_allocations, expenses | 4 file |

Thân đầy đủ từng hàm: `vault/30-du-lieu/than-ham/`.
