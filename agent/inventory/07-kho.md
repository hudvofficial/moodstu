---
title: "Kiểm kê — Kho & tài sản"
lat-cat: 07-kho
cap-nhat: 2026-09-01
trang-thai: sinh-tu-dong
nguon: pg_class · pg_proc · pg_policies · pg_trigger · pg_constraint · quét mã nguồn
---

> ⚙️ **Sinh bởi `scripts/vault-gen-kiem-ke.mjs` từ database production. ĐỪNG sửa tay.**
> Cột *vận hành thực tế* ở đây là dữ kiện đo được (ai ghi, ai đọc, còn sống hay không).
> Phần diễn giải *thiết kế ban đầu ↔ thực tế lệch nhau chỗ nào* nằm ở [[00-lech-thiet-ke]].

# Kiểm kê — Kho & tài sản

4 bảng · 13 hàm DB

## Bảng dữ liệu

### `equipment`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 4

**Policy:** equipment_delete:DELETE, equipment_insert:INSERT, equipment_select:SELECT, equipment_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `equipment_code` | character varying | không | — |
| `equipment_name` | character varying | không | — |
| `equipment_type` | character varying | có | — |
| `manufacturer` | character varying | có | — |
| `image_url` | text | có | — |
| `supplier` | character varying | có | — |
| `purchase_date` | date | có | — |
| `quantity` | integer | có | `1` |
| `warranty_months` | integer | có | `0` |
| `purchase_price` | numeric | có | `0` |
| `depreciation_rate_yearly` | numeric | có | `0` |
| `months_used` | integer | có | `0` |
| `current_value` | numeric | có | `0` |
| `monthly_depreciation` | numeric | có | `0` |
| `condition` | character varying | có | `'good'::character varying` |
| `notes` | text | có | — |
| `current_holder` | uuid | có | — |
| `location` | character varying | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `created_by` | uuid | có | — |

**Trỏ ra:** `current_holder`→`employees` · `created_by`→`auth.users`

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (0):** — **không file nào truy vấn trực tiếp**

> 🔴 **Không đường ghi nào tìm thấy** — bảng này có thể đã chết hoặc chỉ nhận dữ liệu từ ngoài hệ thống.


### `inventory_items`

**Số dòng (ước):** 5 · **RLS:** bật · **Policy:** 1

**Policy:** service_role_full_access:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `item_code` | character varying | không | — |
| `name` | character varying | không | — |
| `category` | character varying | có | — |
| `unit` | character varying | có | — |
| `current_stock` | integer | có | `0` |
| `min_stock` | integer | có | `0` |
| `purchase_price` | numeric | có | `0` |
| `average_unit_price` | numeric | có | `0` |
| `sale_price` | numeric | có | `0` |
| `supplier` | character varying | có | — |
| `image_url` | text | có | — |
| `status` | character varying | có | `'active'::character varying` |
| `notes` | text | có | — |
| `created_by` | uuid | có | — |
| `updated_by` | uuid | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |
| `deleted_at` | timestamp with time zone | có | — |
| `supplier_id` | uuid | có | — |

**Trỏ ra:** `created_by`→`auth.users` · `updated_by`→`auth.users` · `supplier_id`→`vendors`

**Bị trỏ tới bởi (1):** `inventory_transactions`

**Trigger:** `emit_realtime_signal`→emit_realtime_signal()

**GHI qua RPC (8):** `add_fulfillment_transaction_atomic` · `create_contract_inventory_addon_sale_atomic` · `create_sale_receipt_atomic` · `delete_fulfillment_transaction_atomic` · `inventory_stock_in_atomic` · `inventory_stock_out_atomic` · `restore_inventory_from_transaction` · `update_fulfillment_transaction_atomic`

**ĐỌC qua RPC (7):** `get_finance_advanced_intelligence` · `inventory_detail_v2` · `inventory_list` · `inventory_stats` · `payable_items` · `payable_remaining` · `payee_payment_history`

**Chạm từ mã nguồn (4):** `app/actions/inventory-mutations.ts` · `app/actions/inventory-queries.ts` · `tests/e2e/cashflow-m1.spec.ts` · `tests/e2e/inventory-contract-sale.spec.ts`


### `inventory_transactions`

**Số dòng (ước):** 11 · **RLS:** bật · **Policy:** 1

**Policy:** service_role_full_access:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `item_id` | uuid | không | — |
| `transaction_type` | character varying | không | — |
| `quantity` | integer | không | `0` |
| `unit_cost` | numeric | có | `0` |
| `total_cost` | numeric | có | **GENERATED** |
| `contract_id` | uuid | có | — |
| `contract_code` | character varying | có | — |
| `printing_order_id` | uuid | có | — |
| `reason` | text | có | — |
| `supplier` | character varying | có | — |
| `performed_by` | uuid | có | — |
| `customer_name` | character varying | có | — |
| `customer_phone` | character varying | có | — |
| `customer_address` | text | có | — |
| `notes` | text | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `created_by` | uuid | có | — |
| `source_type` | text | có | — |
| `source_id` | uuid | có | — |
| `receipt_id` | uuid | có | — |
| `sale_unit_price` | numeric | có | — |
| `sale_total` | numeric | có | — |
| `payment_method` | text | có | — |
| `parent_transaction_id` | uuid | có | — |
| `is_rollback` | boolean | có | `false` |
| `rolled_back_txn_id` | uuid | có | — |

**Trỏ ra:** `parent_transaction_id`→`inventory_transactions` (CASCADE) · `contract_id`→`contracts` (SET NULL) · `performed_by`→`auth.users` · `item_id`→`inventory_items` · `created_by`→`auth.users` · `receipt_id`→`receipts` · `rolled_back_txn_id`→`inventory_transactions` (SET NULL)

**Bị trỏ tới bởi (1):** `inventory_transactions`

**Trigger:** `emit_realtime_signal`→emit_realtime_signal()

**CHECK:** `CHECK (((sale_total IS NULL) OR (sale_total >= (0)))) NOT VALID` · `CHECK (((sale_unit_price IS NULL) OR (sale_unit_price >= (0)))) NOT VALID`

**GHI qua RPC (8):** `add_fulfillment_transaction_atomic` · `create_contract_inventory_addon_sale_atomic` · `create_sale_receipt_atomic` · `delete_fulfillment_transaction_atomic` · `inventory_stock_in_atomic` · `inventory_stock_out_atomic` · `restore_inventory_from_transaction` · `update_fulfillment_transaction_atomic`

**ĐỌC qua RPC (10):** `contract_financials` · `finance_period_ledger` · `get_finance_advanced_intelligence` · `inventory_detail_v2` · `inventory_item_transaction_totals` · `inventory_stats` · `payable_items` · `payable_remaining` · `payee_payment_history` · `printing_integrity_report`

**Chạm từ mã nguồn (8):** `app/actions/finance-dashboard-queries.ts` · `app/actions/finance-reports-queries.ts` · `app/actions/inventory-mutations.ts` · `app/actions/inventory-queries.ts` · `scripts/test/test-query-2.mjs` · `scripts/test/test-query.mjs` · `tests/e2e/cashflow-m1.spec.ts` · `tests/e2e/inventory-contract-sale.spec.ts`


### `vendors`

**Số dòng (ước):** 12 · **RLS:** bật · **Policy:** 3

**Policy:** Enable insert access for authenticated users on vendors:INSERT, Enable read access for authenticated users on vendors:SELECT, Enable update access for authenticated users on vendors:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `full_name` | text | không | — |
| `phone` | text | có | — |
| `service_type` | text | có | — |
| `status` | text | có | `'active'::text` |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |
| `deleted_at` | timestamp with time zone | có | — |
| `vendor_type` | text | không | `'tho_ngoai'::text` |

**Bị trỏ tới bởi (2):** `work_tasks` · `inventory_items`

**CHECK:** `CHECK ((vendor_type = ANY (ARRAY['tho_ngoai', 'nha_cung_cap')))`

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (6):** `finance_payable_summary` · `finance_vendor_debt_summary` · `get_contract_detail_v2` · `get_contract_detail_v3` · `record_payee_payment_atomic` · `vendor_cost_report`

**Chạm từ mã nguồn (3):** `app/actions/vendor-actions.ts` · `tests/e2e/cashflow-m1.spec.ts` · `tests/e2e/cashflow-m2.spec.ts`


## Hàm DB

| Hàm | Trả về | Quyền | Tính chất | Bảng chạm | Gọi từ mã nguồn |
|---|---|---|---|---|---|
| `add_fulfillment_transaction_atomic(p_parent_txn_id uuid, p_new_item_id uuid, p_quantity integer, p_sale_u)` | `jsonb` | **DEFINER** | VOLATILE | contract_items, contracts, inventory_items, inventory_transactions, payments, receipts | 1 file |
| `create_sale_receipt_atomic(p_receipt jsonb, p_items jsonb)` | `jsonb` | invoker | VOLATILE | inventory_items, inventory_transactions, receipts | 2 file |
| `delete_fulfillment_transaction_atomic(p_txn_id uuid, p_user_id uuid)` | `jsonb` | **DEFINER** | VOLATILE | contract_items, contracts, inventory_items, inventory_transactions, payments, receipts | 1 file |
| `finance_payable_summary()` | `TABLE(payee_type text, payee_id uuid, payee_name text, item_count bigint, total_committed numeric, total_paid numeric, remaining numeric, last_item_date date, last_payment_date date)` | **DEFINER** | STABLE | employees, expenses, labs, vendors | 6 file |
| `finance_vendor_debt_summary()` | `TABLE(vendor_id uuid, vendor_name text, vendor_phone text, service_type text, task_count bigint, total_cost numeric, total_paid numeric, remaining numeric, last_task_date date, last_payment_date date)` | **DEFINER** | STABLE | vendors | 1 file |
| `inventory_detail_v2(p_item_id uuid)` | `jsonb` | **DEFINER** | VOLATILE | inventory_items, inventory_transactions | 1 file |
| `inventory_item_transaction_totals(p_item_id uuid)` | `jsonb` | invoker | STABLE | inventory_transactions | 2 file |
| `inventory_list(p_search text, p_category text, p_status text, p_sort text, p_page int)` | `jsonb` | invoker | STABLE | inventory_items | 2 file |
| `inventory_stats()` | `jsonb` | invoker | STABLE | inventory_items, inventory_transactions | 2 file |
| `inventory_stock_in_atomic(p_item_id uuid, p_quantity integer, p_unit_cost numeric, p_supplier te)` | `jsonb` | **DEFINER** | VOLATILE | inventory_items, inventory_transactions | 3 file |
| `inventory_stock_out_atomic(p_item_id uuid, p_quantity integer, p_contract_id uuid, p_reason text,)` | `jsonb` | invoker | VOLATILE | inventory_items, inventory_transactions | 2 file |
| `restore_inventory_from_transaction(p_source_type text, p_source_id uuid, p_reason text, p_actor_id uuid)` | `void` | invoker | VOLATILE | inventory_items, inventory_transactions | **0 — không ai gọi** |
| `update_fulfillment_transaction_atomic(p_txn_id uuid, p_new_quantity integer, p_new_unit_price numeric, p_use)` | `jsonb` | **DEFINER** | VOLATILE | contract_items, contracts, inventory_items, inventory_transactions, payments, receipts | 1 file |

Thân đầy đủ từng hàm: `vault/30-du-lieu/than-ham/`.
