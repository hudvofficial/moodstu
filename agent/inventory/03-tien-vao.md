---
title: "Kiểm kê — Tiền vào"
lat-cat: 03-tien-vao
cap-nhat: 2026-09-01
trang-thai: sinh-tu-dong
nguon: pg_class · pg_proc · pg_policies · pg_trigger · pg_constraint · quét mã nguồn
---

> ⚙️ **Sinh bởi `scripts/vault-gen-kiem-ke.mjs` từ database production. ĐỪNG sửa tay.**
> Cột *vận hành thực tế* ở đây là dữ kiện đo được (ai ghi, ai đọc, còn sống hay không).
> Phần diễn giải *thiết kế ban đầu ↔ thực tế lệch nhau chỗ nào* nằm ở [[00-lech-thiet-ke]].

# Kiểm kê — Tiền vào

4 bảng · 14 hàm DB

## Bảng dữ liệu

### `payment_plan_allocations`

**Số dòng (ước):** 51 · **RLS:** bật · **Policy:** 2

**Policy:** payment_plan_allocations_authenticated_read:SELECT, payment_plan_allocations_service_role_all:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `contract_id` | uuid | không | — |
| `payment_plan_id` | uuid | không | — |
| `payment_id` | uuid | không | — |
| `amount` | numeric | không | — |
| `created_at` | timestamp with time zone | không | `now()` |
| `created_by` | uuid | có | — |

**Trỏ ra:** `contract_id`→`contracts` (CASCADE) · `payment_plan_id`→`payment_plans` (CASCADE) · `payment_id`→`payments` (CASCADE) · `created_by`→`auth.users` (SET NULL)

**CHECK:** `CHECK ((amount > (0)))`

**GHI qua RPC (3):** `backfill_payment_plan_ssot_v2` · `process_contract_payment_v2` · `void_contract_payment_v2`

**ĐỌC qua RPC (4):** `contract_payment_health_checks` · `get_contract_detail_v2` · `get_contract_detail_v3` · `sync_payment_plan_statuses_v2`

**Chạm từ mã nguồn (0):** — **không file nào truy vấn trực tiếp**


### `payment_plans`

**Số dòng (ước):** 121 · **RLS:** bật · **Policy:** 6

**Policy:** payment_plans_authenticated_read:SELECT, payment_plans_delete:DELETE, payment_plans_insert:INSERT, payment_plans_select:SELECT, payment_plans_service_role_all:ALL, payment_plans_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `contract_id` | uuid | không | — |
| `stage_name` | character varying | không | — |
| `amount` | numeric | không | — |
| `due_date` | date | có | — |
| `status` | character varying | có | `'pending'::character varying` |
| `receipt_id` | uuid | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `stage_key` | text | có | — |
| `sort_order` | integer | không | `0` |

**Trỏ ra:** `contract_id`→`contracts` · `receipt_id`→`payments`

**Bị trỏ tới bởi (1):** `payment_plan_allocations`

**Trigger:** `emit_realtime_signal`→emit_realtime_signal()

**CHECK:** `CHECK ((amount >= (0)))` · `CHECK (((status)= ANY (ARRAY['pending', 'partial', 'paid', 'overdue', 'cancelled')))`

**GHI qua RPC (6):** `backfill_payment_plan_ssot_v2` · `cancel_contract_cascade` · `create_default_payment_schedule_v2` · `delete_contract_cascade` · `process_contract_payment_v2` · `sync_payment_plan_statuses_v2`

**ĐỌC qua RPC (4):** `contract_payment_health_checks` · `get_contract_detail_v2` · `get_contract_detail_v3` · `run_integrity_scan`

**Chạm từ mã nguồn (8):** `app/actions/contract-lifecycle.ts` · `app/actions/contract-queries.ts` · `app/actions/payment-actions.ts` · `lib/client-direct/contract-drawer.ts` · `scripts/perf-operational-probe.mjs` · `scripts/smoke-dashboard.mjs` · `scripts/verify-contracts.mjs` · `scripts/verify-dashboard.mjs`


### `payments`

**Số dòng (ước):** 51 · **RLS:** bật · **Policy:** 4

**Policy:** payments_delete:DELETE, payments_insert:INSERT, payments_select:SELECT, payments_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `receipt_code` | character varying | có | — |
| `contract_id` | uuid | có | — |
| `customer_id` | uuid | có | — |
| `amount` | numeric | không | — |
| `payment_method` | USER-DEFINED | không | `'tien_mat'::payment_method_enum` |
| `payment_date` | date | không | `CURRENT_DATE` |
| `payment_stage` | character varying | có | — |
| `category_id` | uuid | có | — |
| `image_url` | text | có | — |
| `notes` | text | có | — |
| `approved_by` | uuid | có | — |
| `created_by` | uuid | có | — |
| `deleted_at` | timestamp with time zone | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |
| `is_contract_adjustment` | boolean | không | `false` |
| `voided_at` | timestamp with time zone | có | — |
| `voided_by` | uuid | có | — |
| `void_reason` | text | có | — |
| `contract_adjustment_item_id` | uuid | có | — |

**Trỏ ra:** `contract_id`→`contracts` · `customer_id`→`customers` · `category_id`→`transaction_categories` · `created_by`→`auth.users` · `approved_by`→`auth.users` · `contract_adjustment_item_id`→`contract_items` (SET NULL)

**Bị trỏ tới bởi (2):** `payment_plans` · `payment_plan_allocations`

**Trigger:** `audit_payments`→log_audit_action() · `emit_realtime_signal`→emit_realtime_signal() · `trg_restore_inventory_on_contract_payment_void`→restore_inventory_on_contract_payment_void() · `update_payments_updated_at`→update_updated_at_column()

**CHECK:** `CHECK ((amount > (0)))`

**GHI qua RPC (6):** `add_fulfillment_transaction_atomic` · `create_contract_inventory_addon_sale_atomic` · `delete_fulfillment_transaction_atomic` · `process_contract_payment_v2` · `update_fulfillment_transaction_atomic` · `void_contract_payment_v2`

**ĐỌC qua RPC (21):** `backfill_payment_plan_ssot_v2` · `contract_payment_health_checks` · `dashboard_critical_kpis` · `dashboard_revenue_chart` · `delete_contract_cascade` · `finance_cashflow_timeline` · `finance_ledger` · `finance_ledger_range` · `finance_period_ledger` · `finance_receipt_document_stats` · `finance_receipt_documents` · `get_cashflow_forecast` … +9

**Chạm từ mã nguồn (17):** `app/actions/contract-mutations.ts` · `app/actions/contract-queries.ts` · `app/actions/finance-close-actions.ts` · `app/actions/finance-dashboard-queries.ts` · `app/actions/finance-operations-queries.ts` · `app/actions/finance-reports-queries.ts` · `lib/api/dashboard.ts` · `scripts/perf-operational-probe.mjs` · `scripts/smoke-contracts.mjs` · `scripts/smoke-dashboard.mjs` … +7


### `receipts`

**Số dòng (ước):** 5 · **RLS:** bật · **Policy:** 1

**Policy:** authenticated_receipts:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `receipt_date` | date | không | — |
| `receipt_type` | character varying | không | — |
| `payment_type` | character varying | không | `'cash'::character varying` |
| `contract_id` | uuid | có | — |
| `contract_code` | character varying | có | — |
| `receipt_amount` | numeric | không | `0` |
| `previous_paid` | numeric | có | `0` |
| `total_amount` | numeric | có | `0` |
| `remaining_amount` | numeric | có | `0` |
| `notes` | text | có | — |
| `status` | character varying | có | `'confirmed'::character varying` |
| `category_id` | uuid | có | — |
| `category_name` | character varying | có | — |
| `customer_name` | character varying | có | — |
| `customer_phone` | character varying | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |
| `deleted_at` | timestamp with time zone | có | — |
| `created_by` | uuid | có | — |
| `updated_by` | uuid | có | — |
| `debt_id` | uuid | có | — |

**Trỏ ra:** `contract_id`→`contracts` · `debt_id`→`debts` (SET NULL) · `created_by`→`auth.users` · `updated_by`→`auth.users`

**Bị trỏ tới bởi (1):** `inventory_transactions`

**Trigger:** `emit_realtime_signal`→emit_realtime_signal() · `trg_restore_inventory_on_receipt_void`→restore_inventory_on_receipt_void()

**GHI qua RPC (4):** `add_fulfillment_transaction_atomic` · `create_sale_receipt_atomic` · `delete_fulfillment_transaction_atomic` · `update_fulfillment_transaction_atomic`

**ĐỌC qua RPC (11):** `dashboard_critical_kpis` · `dashboard_revenue_chart` · `finance_cashflow_timeline` · `finance_ledger` · `finance_ledger_range` · `finance_period_ledger` · `finance_receipt_document_stats` · `finance_receipt_documents` · `get_cashflow_forecast` · `get_finance_advanced_intelligence` · `get_finance_intelligence`

**Chạm từ mã nguồn (10):** `app/actions/debt-actions.ts` · `app/actions/finance-category-actions.ts` · `app/actions/finance-close-actions.ts` · `app/actions/finance-dashboard-queries.ts` · `app/actions/finance-operations-queries.ts` · `app/actions/finance-reports-queries.ts` · `app/actions/receipt-actions.ts` · `lib/api/dashboard.ts` · `scripts/smoke-dashboard.mjs` · `tests/integration/finance-mutations.test.ts`


## Hàm DB

| Hàm | Trả về | Quyền | Tính chất | Bảng chạm | Gọi từ mã nguồn |
|---|---|---|---|---|---|
| `backfill_payment_plan_ssot_v2()` | `json` | **DEFINER** | VOLATILE | contracts, payment_plan_allocations, payment_plans, payments | **0 — không ai gọi** |
| `contract_payment_health_checks()` | `TABLE(check_name text, issue_count bigint)` | **DEFINER** | STABLE | contract_items, contracts, payment_plan_allocations, payment_plans, payments | 1 file |
| `create_default_payment_schedule_v2(p_contract_id uuid, p_total numeric, p_initial_amount numeric, p_initi)` | `uuid` | **DEFINER** | VOLATILE | payment_plans | **0 — không ai gọi** |
| `dashboard_revenue_chart(p_month integer, p_year integer, p_months integer)` | `TABLE(month_index integer, month_label text, revenue numeric)` | invoker | STABLE | payments, receipts | 4 file |
| `finance_cashflow_timeline(p_start_date date, p_end_date date)` | `TABLE(date date, inflow numeric, outflow numeric)` | **DEFINER** | STABLE | expenses, payments, receipts | 3 file |
| `finance_ledger_range(p_page integer, p_page_size integer, p_from_date date, p_to_date date,)` | `TABLE(id uuid, source_table text, direction text, transaction_date date, amount numeric, code text, customer_name text, category_name text, payment_method text, description text, status text, total_count integer)` | **DEFINER** | STABLE | contracts, customers, expenses, payments, receipts, transaction_categories | 2 file |
| `finance_receipt_document_stats(p_month integer, p_year integer)` | `TABLE(total_receipts bigint, total_amount numeric, completed_count bigint, pending_count bigint)` | **DEFINER** | STABLE | contracts, payments, receipts | 1 file |
| `finance_receipt_documents(p_month integer, p_year integer, p_receipt_type text, p_search text, p)` | `TABLE(id text, source_table text, source_id uuid, receipt_date date, receipt_type text, payment_type text, contract_id uuid, contract_code text, customer_name text, receipt_amount numeric, total_amount numeric, remaining_amount numeric, category_id uuid, category_name text, status text, notes text, receipt_code text, created_at timestamp with time zone, updated_at timestamp with time zone, total_count bigint)` | **DEFINER** | STABLE | contracts, customers, payments, receipts, transaction_categories | 1 file |
| `get_contract_detail_v2(p_contract_id uuid)` | `jsonb` | invoker | VOLATILE | contract_checklists, contract_events, contract_items, contracts, customers, dress_reservations +9 | 10 file |
| `get_contract_detail_v3(p_contract_id uuid)` | `jsonb` | invoker | STABLE | contract_checklists, contract_events, contract_items, contracts, customers, dress_reservations +9 | 2 file |
| `process_contract_payment_v2(p_contract_id uuid, p_amount numeric, p_payment_method payment_method_)` | `json` | **DEFINER** | VOLATILE | contract_items, contracts, finance_monthly_closes, payment_plan_allocations, payment_plans, payments | 2 file |
| `run_integrity_scan()` | `void` | **DEFINER** | VOLATILE | integrity_reports, payment_plans | 1 file |
| `sync_payment_plan_statuses_v2(p_contract_id uuid)` | `void` | **DEFINER** | VOLATILE | payment_plan_allocations, payment_plans, payments | **0 — không ai gọi** |
| `void_contract_payment_v2(p_payment_id uuid, p_reason text, p_actor_id uuid)` | `json` | **DEFINER** | VOLATILE | contract_items, contracts, finance_monthly_closes, payment_plan_allocations, payments | 1 file |

Thân đầy đủ từng hàm: `vault/30-du-lieu/than-ham/`.
