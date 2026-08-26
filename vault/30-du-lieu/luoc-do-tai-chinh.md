---
title: "Lược đồ DB — Tài chính"
tags: [du-lieu, schema, tai-chinh]
sinh-tu: "introspect DB thật (pooler) — regenerate bằng scripts/vault-gen-schema.mjs"
cap-nhat: 2026-08-07
---

# Lược đồ DB — Tài chính

> Sinh tự động từ **DB production thật** (không phải từ `types/database.types.ts`). Sau mỗi migration nhớ chạy cả `npm run db:types` — xem [[canh-bao-schema]].

Module liên quan: [[tai-chinh]]

| Bảng | Số dòng | RLS | Policy |
|---|---:|---|---:|
| `payments` | 51 | ✅ | 4 |
| `payment_plans` | 240 | ✅ | 6 |
| `payment_plan_allocations` | 51 | ✅ | 2 |
| `expenses` | 81 | ✅ | 4 |
| `expense_allocations` | 40 | ✅ | 0 |
| `receipts` | 4 | ✅ | 1 |
| `debts` | 0 | ✅ | 4 |
| `budgets` | 0 | ✅ | 1 |
| `financial_goals` | 0 | ✅ | 1 |
| `goal_contributions` | 0 | ✅ | 1 |
| `fixed_costs` | 0 | ✅ | 4 |
| `finance_monthly_closes` | 0 | ✅ | 1 |
| `finance_close_tasks` | 0 | ✅ | 1 |
| `transaction_categories` | 14 | ✅ | 4 |
| `credit_cards` | 3 | ✅ | 1 |
| `investments` | 0 | ✅ | 1 |
| `investment_maintenance_logs` | 0 | ✅ | 1 |

## `payments`

51 dòng · RLS bật · 4 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `receipt_code` | text |  |  |
| `contract_id` | uuid |  |  |
| `customer_id` | uuid |  |  |
| `amount` | numeric | NOT NULL |  |
| `payment_method` | payment_method_enum | NOT NULL | `'tien_mat'` |
| `payment_date` | date | NOT NULL | `CURRENT_DATE` |
| `payment_stage` | text |  |  |
| `category_id` | uuid |  |  |
| `image_url` | text |  |  |
| `notes` | text |  |  |
| `approved_by` | uuid |  |  |
| `created_by` | uuid |  |  |
| `deleted_at` | timestamptz |  |  |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |
| `is_contract_adjustment` | bool | NOT NULL | `false` |
| `voided_at` | timestamptz |  |  |
| `voided_by` | uuid |  |  |
| `void_reason` | text |  |  |
| `contract_adjustment_item_id` | uuid |  |  |

**Trỏ ra:** `contract_adjustment_item_id` → `contract_items.id` (ON DELETE SET NULL) · `category_id` → `transaction_categories.id` · `customer_id` → `customers.id` · `contract_id` → `contracts.id`

**Bị trỏ tới bởi:** `payment_plan_allocations.payment_id` · `payment_plans.receipt_id`

**Trigger:** `audit_payments` → `log_audit_action()` · `emit_realtime_signal` → `emit_realtime_signal()` · `trg_restore_inventory_on_contract_payment_void` → `restore_inventory_on_contract_payment_void()` · `update_payments_updated_at` → `update_updated_at_column()`

**CHECK:** `CHECK ((amount > (0)))`

<details><summary>14 index</summary>

- `btree (payment_date DESC, created_at DESC) WHERE (deleted_at IS NULL)`
- `UNIQUE btree (id)`
- `UNIQUE btree (receipt_code)`
- `btree (contract_id)`
- `btree (customer_id)`
- `btree (payment_date)`
- `btree (contract_id, created_at DESC) WHERE (deleted_at IS NULL)`
- `btree (contract_id, payment_date DESC) WHERE (deleted_at IS NULL)`
- `btree (payment_date DESC, created_at DESC) WHERE ((deleted_at IS NULL) AND (contract_id IS NOT NULL))`
- `btree (receipt_code) WHERE ((deleted_at IS NULL) AND (contract_id IS NOT NULL) AND (receipt_code IS NOT NULL))`
- `btree (contract_id, voided_at) WHERE (contract_id IS NOT NULL)`
- `btree (contract_adjustment_item_id) WHERE (contract_adjustment_item_id IS NOT NULL)`
- `btree (contract_id, payment_date DESC) WHERE (deleted_at IS NULL)`
- `btree (contract_id, is_contract_adjustment) WHERE (deleted_at IS NULL)`

</details>

## `payment_plans`

240 dòng · RLS bật · 6 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `contract_id` | uuid | NOT NULL |  |
| `stage_name` | text | NOT NULL |  |
| `amount` | numeric | NOT NULL |  |
| `due_date` | date |  |  |
| `status` | text |  | `'pending'` |
| `receipt_id` | uuid |  |  |
| `created_at` | timestamptz |  | `now()` |
| `stage_key` | text |  |  |
| `sort_order` | int | NOT NULL | `0` |

**Trỏ ra:** `receipt_id` → `payments.id` · `contract_id` → `contracts.id`

**Bị trỏ tới bởi:** `payment_plan_allocations.payment_plan_id`

**Trigger:** `emit_realtime_signal` → `emit_realtime_signal()`

**CHECK:** `CHECK ((amount >= (0)))` · `CHECK (((status)= ANY (ARRAY['pending', 'partial', 'paid', 'overdue', 'cancelled'])))`

<details><summary>7 index</summary>

- `UNIQUE btree (id)`
- `btree (contract_id)`
- `btree (contract_id, created_at)`
- `btree (status, due_date) WHERE (due_date IS NOT NULL)`
- `btree (contract_id, status, due_date)`
- `btree (contract_id, status, sort_order)`
- `btree (contract_id, due_date)`

</details>

## `payment_plan_allocations`

51 dòng · RLS bật · 2 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `contract_id` | uuid | NOT NULL |  |
| `payment_plan_id` | uuid | NOT NULL |  |
| `payment_id` | uuid | NOT NULL |  |
| `amount` | numeric | NOT NULL |  |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `created_by` | uuid |  |  |

**Trỏ ra:** `payment_id` → `payments.id` (ON DELETE CASCADE) · `payment_plan_id` → `payment_plans.id` (ON DELETE CASCADE) · `contract_id` → `contracts.id` (ON DELETE CASCADE)

**CHECK:** `CHECK ((amount > (0)))`

<details><summary>6 index</summary>

- `btree (payment_plan_id)`
- `UNIQUE btree (id)`
- `UNIQUE btree (payment_plan_id, payment_id)`
- `btree (payment_plan_id)`
- `btree (payment_id)`
- `btree (contract_id)`

</details>

## `expenses`

81 dòng · RLS bật · 4 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `expense_date` | date | NOT NULL | `CURRENT_DATE` |
| `payment_method` | payment_method_enum | NOT NULL | `'tien_mat'` |
| `category_id` | uuid |  |  |
| `contract_id` | uuid |  |  |
| `amount` | numeric | NOT NULL |  |
| `description` | text |  |  |
| `recipient` | text |  |  |
| `image_url` | text |  |  |
| `approved_by` | uuid |  |  |
| `created_by` | uuid |  |  |
| `deleted_at` | timestamptz |  |  |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |
| `printing_order_id` | uuid |  |  |
| `work_task_id` | uuid |  |  |
| `debt_id` | uuid |  |  |
| `payee_type` | text | NOT NULL | `'other'` |
| `payee_id` | uuid |  |  |
| `legacy_source` | text |  |  |
| `legacy_source_id` | uuid |  |  |

**Trỏ ra:** `printing_order_id` → `printing_orders.id` · `debt_id` → `debts.id` (ON DELETE SET NULL) · `work_task_id` → `work_tasks.id` (ON DELETE SET NULL) · `category_id` → `transaction_categories.id` · `contract_id` → `contracts.id`

**Bị trỏ tới bởi:** `expense_allocations.expense_id`

**Trigger:** `audit_expenses` → `log_audit_action()` · `emit_realtime_signal` → `emit_realtime_signal()` · `update_expenses_updated_at` → `update_updated_at_column()`

**CHECK:** `CHECK ((amount > (0)))` · `CHECK ((payee_type = ANY (ARRAY['lab', 'vendor', 'supplier', 'employee', 'other'])))`

<details><summary>14 index</summary>

- `btree (expense_date DESC, created_at DESC) WHERE (deleted_at IS NULL)`
- `btree (expense_date DESC, created_at DESC) WHERE ((deleted_at IS NULL) AND (approved_by IS NULL))`
- `btree (expense_date DESC, created_at DESC) WHERE ((deleted_at IS NULL) AND (approved_by IS NOT NULL))`
- `btree (contract_id) WHERE ((deleted_at IS NULL) AND (contract_id IS NOT NULL))`
- `UNIQUE btree (id)`
- `btree (expense_date)`
- `btree (contract_id)`
- `btree (payee_type, payee_id) WHERE (deleted_at IS NULL)`
- `btree (category_id) WHERE (category_id IS NOT NULL)`
- `btree (expense_date) WHERE (deleted_at IS NULL)`
- `btree (printing_order_id) WHERE ((deleted_at IS NULL) AND (printing_order_id IS NOT NULL))`
- `btree (work_task_id) WHERE ((deleted_at IS NULL) AND (work_task_id IS NOT NULL))`
- `btree (debt_id)`
- `btree (contract_id)`

</details>

## `expense_allocations`

40 dòng · RLS bật · 0 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `expense_id` | uuid | NOT NULL |  |
| `target_type` | text | NOT NULL |  |
| `target_id` | uuid | NOT NULL |  |
| `amount` | numeric | NOT NULL |  |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `created_by` | uuid |  |  |

**Trỏ ra:** `expense_id` → `expenses.id` (ON DELETE CASCADE)

**CHECK:** `CHECK ((amount > (0)))` · `CHECK ((target_type = ANY (ARRAY['printing_order', 'work_task', 'inventory_transaction', 'employee_salary'])))`

<details><summary>3 index</summary>

- `UNIQUE btree (id)`
- `btree (target_type, target_id)`
- `btree (expense_id)`

</details>

## `receipts`

4 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `receipt_date` | date | NOT NULL |  |
| `receipt_type` | text | NOT NULL |  |
| `payment_type` | text | NOT NULL | `'cash'` |
| `contract_id` | uuid |  |  |
| `contract_code` | text |  |  |
| `receipt_amount` | numeric | NOT NULL | `0` |
| `previous_paid` | numeric |  | `0` |
| `total_amount` | numeric |  | `0` |
| `remaining_amount` | numeric |  | `0` |
| `notes` | text |  |  |
| `status` | text |  | `'confirmed'` |
| `category_id` | uuid |  |  |
| `category_name` | text |  |  |
| `customer_name` | text |  |  |
| `customer_phone` | text |  |  |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |
| `deleted_at` | timestamptz |  |  |
| `created_by` | uuid |  |  |
| `updated_by` | uuid |  |  |
| `debt_id` | uuid |  |  |

**Trỏ ra:** `debt_id` → `debts.id` (ON DELETE SET NULL) · `contract_id` → `contracts.id`

**Bị trỏ tới bởi:** `inventory_transactions.receipt_id`

**Trigger:** `emit_realtime_signal` → `emit_realtime_signal()` · `trg_restore_inventory_on_receipt_void` → `restore_inventory_on_receipt_void()`

<details><summary>15 index</summary>

- `btree (receipt_date DESC, created_at DESC) WHERE (deleted_at IS NULL)`
- `btree (receipt_type, receipt_date DESC, created_at DESC) WHERE (deleted_at IS NULL)`
- `gin (contract_code gin_trgm_ops) WHERE (deleted_at IS NULL)`
- `gin (customer_name gin_trgm_ops) WHERE (deleted_at IS NULL)`
- `gin (category_name gin_trgm_ops) WHERE (deleted_at IS NULL)`
- `btree (deleted_at)`
- `gin (notes gin_trgm_ops) WHERE (deleted_at IS NULL)`
- `btree (receipt_date) WHERE (deleted_at IS NULL)`
- `btree (contract_id) WHERE ((deleted_at IS NULL) AND (contract_id IS NOT NULL))`
- `btree (receipt_type) WHERE (deleted_at IS NULL)`
- `UNIQUE btree (id)`
- `btree (contract_id)`
- `btree (receipt_date)`
- `btree (id) WHERE (deleted_at IS NULL)`
- `btree (debt_id)`

</details>

## `debts`

0 dòng · RLS bật · 4 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `type` | text | NOT NULL |  |
| `entity_type` | text | NOT NULL |  |
| `entity_id` | uuid |  |  |
| `entity_name` | text | NOT NULL |  |
| `amount` | numeric | NOT NULL |  |
| `paid_amount` | numeric |  | `0` |
| `remaining` | numeric |  | `0` |
| `due_date` | date |  |  |
| `status` | text |  | `'open'` |
| `notes` | text |  |  |
| `created_by` | uuid |  |  |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |
| `deleted_at` | timestamptz |  |  |
| `installment_total` | int |  |  |
| `installment_paid` | int |  | `0` |
| `installment_amount` | numeric |  |  |
| `platform` | text |  |  |
| `card_id` | uuid |  |  |
| `contract_id` | uuid |  |  |
| `debt_date` | date |  |  |
| `payment_date` | date |  |  |

**Trỏ ra:** `contract_id` → `contracts.id` (ON DELETE SET NULL) · `card_id` → `credit_cards.id` (ON DELETE SET NULL)

**Bị trỏ tới bởi:** `expenses.debt_id` · `receipts.debt_id`

**Trigger:** `emit_realtime_signal` → `emit_realtime_signal()` · `update_debts_updated_at` → `update_updated_at_column()`

**CHECK:** `CHECK ((amount > (0)))` · `CHECK (((status)= ANY ((ARRAY['open', 'partial', 'closed']))))` · `CHECK (((type)= ANY ((ARRAY['receivable', 'payable']))))`

<details><summary>9 index</summary>

- `UNIQUE btree (id)`
- `btree (status) WHERE ((status)::text <> 'closed'::text)`
- `btree (entity_type, entity_id)`
- `btree (card_id) WHERE (card_id IS NOT NULL)`
- `btree (contract_id) WHERE (contract_id IS NOT NULL)`
- `btree (platform) WHERE (platform IS NOT NULL)`
- `btree (id) WHERE (deleted_at IS NULL)`
- `btree (type, due_date, status) WHERE (deleted_at IS NULL)`
- `btree (card_id) WHERE ((deleted_at IS NULL) AND (card_id IS NOT NULL))`

</details>

## `budgets`

0 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `category_name` | text | NOT NULL |  |
| `budget_amount` | numeric | NOT NULL | `0` |
| `period_month` | int | NOT NULL |  |
| `period_year` | int | NOT NULL |  |
| `notes` | text |  |  |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |
| `deleted_at` | timestamptz |  |  |

**Trigger:** `emit_realtime_signal` → `emit_realtime_signal()`

<details><summary>4 index</summary>

- `UNIQUE btree (id)`
- `UNIQUE btree (category_name, period_month, period_year)`
- `btree (id) WHERE (deleted_at IS NULL)`
- `btree (period_year, period_month, category_name) WHERE (deleted_at IS NULL)`

</details>

## `financial_goals`

0 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `name` | text | NOT NULL |  |
| `target_amount` | numeric | NOT NULL | `0` |
| `current_amount` | numeric | NOT NULL | `0` |
| `deadline` | date |  |  |
| `icon` | text |  | `'savings'` |
| `color` | text |  | `'emerald'` |
| `status` | text |  | `'active'` |
| `notes` | text |  |  |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |
| `deleted_at` | timestamptz |  |  |

**Bị trỏ tới bởi:** `goal_contributions.goal_id`

**Trigger:** `emit_realtime_signal` → `emit_realtime_signal()`

**CHECK:** `CHECK (((status)= ANY ((ARRAY['active', 'completed', 'cancelled']))))`

<details><summary>3 index</summary>

- `UNIQUE btree (id)`
- `btree (id) WHERE (deleted_at IS NULL)`
- `btree (created_at DESC) WHERE (deleted_at IS NULL)`

</details>

## `goal_contributions`

0 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `goal_id` | uuid | NOT NULL |  |
| `amount` | numeric | NOT NULL | `0` |
| `contribution_date` | date |  | `CURRENT_DATE` |
| `notes` | text |  |  |
| `created_at` | timestamptz |  | `now()` |

**Trỏ ra:** `goal_id` → `financial_goals.id` (ON DELETE CASCADE)

<details><summary>2 index</summary>

- `UNIQUE btree (id)`
- `btree (goal_id)`

</details>

## `fixed_costs`

0 dòng · RLS bật · 4 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `cost_code` | text | NOT NULL |  |
| `cost_name` | text | NOT NULL |  |
| `cost_type` | text |  |  |
| `description` | text |  |  |
| `monthly_amount` | numeric |  | `0` |
| `deposit_amount` | numeric |  | `0` |
| `start_date` | date |  |  |
| `end_date` | date |  |  |
| `created_by` | uuid |  |  |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |
| `deleted_at` | timestamptz |  |  |

**Trigger:** `emit_realtime_signal` → `emit_realtime_signal()` · `update_fixed_costs_updated_at` → `update_updated_at_column()`

<details><summary>4 index</summary>

- `UNIQUE btree (id)`
- `UNIQUE btree (cost_code)`
- `btree (id) WHERE (deleted_at IS NULL)`
- `btree (start_date, end_date) WHERE (deleted_at IS NULL)`

</details>

## `finance_monthly_closes`

0 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `period` | text | NOT NULL |  |
| `status` | text | NOT NULL | `'draft'` |
| `snapshot_metrics` | jsonb |  | `'{}'` |
| `locked_by` | uuid |  |  |
| `locked_at` | timestamptz |  |  |
| `notes` | text |  |  |
| `created_by` | uuid |  |  |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |

**Bị trỏ tới bởi:** `finance_close_tasks.close_id`

<details><summary>2 index</summary>

- `UNIQUE btree (id)`
- `UNIQUE btree (period)`

</details>

## `finance_close_tasks`

0 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `close_id` | uuid | NOT NULL |  |
| `step_number` | int | NOT NULL |  |
| `step_name` | text | NOT NULL |  |
| `status` | text | NOT NULL | `'chua_bat_dau'` |
| `assignee_id` | uuid |  |  |
| `started_at` | timestamptz |  |  |
| `completed_at` | timestamptz |  |  |
| `notes` | text |  |  |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |

**Trỏ ra:** `close_id` → `finance_monthly_closes.id` (ON DELETE CASCADE)

**CHECK:** `CHECK (((step_number >= 1) AND (step_number <= 8)))`

<details><summary>3 index</summary>

- `UNIQUE btree (id)`
- `UNIQUE btree (close_id, step_number)`
- `btree (close_id)`

</details>

## `transaction_categories`

14 dòng · RLS bật · 4 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `category_code` | text | NOT NULL |  |
| `name` | text | NOT NULL |  |
| `type` | text | NOT NULL |  |
| `is_default` | bool |  | `false` |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |

**Bị trỏ tới bởi:** `expenses.category_id` · `payments.category_id`

**Trigger:** `emit_realtime_signal` → `emit_realtime_signal()` · `update_transaction_categories_updated_at` → `update_updated_at_column()`

**CHECK:** `CHECK (((type)= ANY ((ARRAY['thu', 'chi']))))`

<details><summary>3 index</summary>

- `UNIQUE btree (id)`
- `UNIQUE btree (category_code)`
- `btree (type, name)`

</details>

## `credit_cards`

3 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `bank_name` | text | NOT NULL |  |
| `card_label` | text |  |  |
| `last_4` | text |  |  |
| `statement_day` | int | NOT NULL | `1` |
| `due_day` | int | NOT NULL | `15` |
| `due_next_month` | bool |  | `false` |
| `credit_limit` | numeric |  | `0` |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |
| `deleted_at` | timestamptz |  |  |

**Bị trỏ tới bởi:** `debts.card_id`

**Trigger:** `emit_realtime_signal` → `emit_realtime_signal()`

<details><summary>3 index</summary>

- `UNIQUE btree (id)`
- `btree (id) WHERE (deleted_at IS NULL)`
- `btree (bank_name) WHERE (deleted_at IS NULL)`

</details>

## `investments`

0 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `name` | text | NOT NULL |  |
| `category` | text | NOT NULL | `'equipment'` |
| `purchase_date` | date | NOT NULL |  |
| `purchase_price` | numeric | NOT NULL | `0` |
| `useful_life_months` | int |  | `36` |
| `depreciation_method` | text |  | `'straight_line'` |
| `salvage_value` | numeric |  | `0` |
| `status` | text |  | `'active'` |
| `condition` | text |  | `'good'` |
| `serial_number` | text |  |  |
| `location` | text |  |  |
| `notes` | text |  |  |
| `next_maintenance_date` | date |  |  |
| `maintenance_interval_days` | int |  |  |
| `linked_revenue` | numeric |  | `0` |
| `sold_price` | numeric |  |  |
| `sold_date` | date |  |  |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |
| `deleted_at` | timestamptz |  |  |

**Bị trỏ tới bởi:** `investment_maintenance_logs.investment_id`

**Trigger:** `emit_realtime_signal` → `emit_realtime_signal()`

<details><summary>3 index</summary>

- `UNIQUE btree (id)`
- `btree (id) WHERE (deleted_at IS NULL)`
- `btree (purchase_date DESC) WHERE (deleted_at IS NULL)`

</details>

## `investment_maintenance_logs`

0 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `investment_id` | uuid | NOT NULL |  |
| `maintenance_date` | date | NOT NULL |  |
| `description` | text |  |  |
| `cost` | numeric |  | `0` |
| `performed_by` | text |  |  |
| `created_at` | timestamptz |  | `now()` |

**Trỏ ra:** `investment_id` → `investments.id` (ON DELETE CASCADE)

<details><summary>2 index</summary>

- `UNIQUE btree (id)`
- `btree (investment_id)`

</details>
