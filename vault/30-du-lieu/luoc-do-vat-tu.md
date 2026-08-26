---
title: "Lược đồ DB — Vật tư & thiết bị"
tags: [du-lieu, schema, vat-tu]
sinh-tu: "introspect DB thật (pooler) — regenerate bằng scripts/vault-gen-schema.mjs"
cap-nhat: 2026-08-07
---

# Lược đồ DB — Vật tư & thiết bị

> Sinh tự động từ **DB production thật** (không phải từ `types/database.types.ts`). Sau mỗi migration nhớ chạy cả `npm run db:types` — xem [[canh-bao-schema]].

Module liên quan: [[vat-tu]]

| Bảng | Số dòng | RLS | Policy |
|---|---:|---|---:|
| `inventory_items` | 3 | ✅ | 1 |
| `inventory_transactions` | 9 | ✅ | 1 |
| `equipment` | 0 | ✅ | 4 |

## `inventory_items`

3 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `item_code` | text | NOT NULL |  |
| `name` | text | NOT NULL |  |
| `category` | text |  |  |
| `unit` | text |  |  |
| `current_stock` | int |  | `0` |
| `min_stock` | int |  | `0` |
| `purchase_price` | numeric |  | `0` |
| `average_unit_price` | numeric |  | `0` |
| `sale_price` | numeric |  | `0` |
| `supplier` | text |  |  |
| `image_url` | text |  |  |
| `status` | text |  | `'active'` |
| `notes` | text |  |  |
| `created_by` | uuid |  |  |
| `updated_by` | uuid |  |  |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |
| `deleted_at` | timestamptz |  |  |
| `supplier_id` | uuid |  |  |

**Trỏ ra:** `supplier_id` → `vendors.id`

**Bị trỏ tới bởi:** `inventory_transactions.item_id`

**Trigger:** `emit_realtime_signal` → `emit_realtime_signal()`

<details><summary>16 index</summary>

- `btree (created_at DESC) WHERE (deleted_at IS NULL)`
- `UNIQUE btree (id)`
- `UNIQUE btree (item_code)`
- `btree (status)`
- `btree (category)`
- `btree (item_code)`
- `btree (deleted_at) WHERE (deleted_at IS NULL)`
- `btree (status, created_at DESC) WHERE (deleted_at IS NULL)`
- `btree (category, created_at DESC) WHERE (deleted_at IS NULL)`
- `btree (current_stock) WHERE (deleted_at IS NULL)`
- `gin (name gin_trgm_ops) WHERE (deleted_at IS NULL)`
- `btree (name) WHERE (deleted_at IS NULL)`
- `gin (item_code gin_trgm_ops) WHERE (deleted_at IS NULL)`
- `btree (status, deleted_at)`
- `btree (status, current_stock, min_stock) WHERE (deleted_at IS NULL)`
- `btree (current_stock, average_unit_price) WHERE (deleted_at IS NULL)`

</details>

## `inventory_transactions`

9 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `item_id` | uuid | NOT NULL |  |
| `transaction_type` | text | NOT NULL |  |
| `quantity` | int | NOT NULL | `0` |
| `unit_cost` | numeric |  | `0` |
| `total_cost` | numeric |  |  |
| `contract_id` | uuid |  |  |
| `contract_code` | text |  |  |
| `printing_order_id` | uuid |  |  |
| `reason` | text |  |  |
| `supplier` | text |  |  |
| `performed_by` | uuid |  |  |
| `customer_name` | text |  |  |
| `customer_phone` | text |  |  |
| `customer_address` | text |  |  |
| `notes` | text |  |  |
| `created_at` | timestamptz |  | `now()` |
| `created_by` | uuid |  |  |
| `source_type` | text |  |  |
| `source_id` | uuid |  |  |
| `receipt_id` | uuid |  |  |
| `sale_unit_price` | numeric |  |  |
| `sale_total` | numeric |  |  |
| `payment_method` | text |  |  |
| `parent_transaction_id` | uuid |  |  |
| `is_rollback` | bool |  | `false` |
| `rolled_back_txn_id` | uuid |  |  |

**Trỏ ra:** `rolled_back_txn_id` → `inventory_transactions.id` (ON DELETE SET NULL) · `receipt_id` → `receipts.id` · `item_id` → `inventory_items.id` · `contract_id` → `contracts.id` (ON DELETE SET NULL) · `parent_transaction_id` → `inventory_transactions.id` (ON DELETE CASCADE)

**Bị trỏ tới bởi:** `inventory_transactions.rolled_back_txn_id` · `inventory_transactions.parent_transaction_id`

**Trigger:** `emit_realtime_signal` → `emit_realtime_signal()`

**CHECK:** `CHECK (((sale_total IS NULL) OR (sale_total >= (0)))) NOT VALID` · `CHECK (((sale_unit_price IS NULL) OR (sale_unit_price >= (0)))) NOT VALID`

<details><summary>16 index</summary>

- `btree (parent_transaction_id)`
- `UNIQUE btree (id)`
- `btree (item_id)`
- `btree (created_at DESC)`
- `btree (transaction_type)`
- `btree (item_id, created_at DESC)`
- `btree (transaction_type, created_at DESC)`
- `btree (contract_id, created_at DESC) WHERE (contract_id IS NOT NULL)`
- `btree (is_rollback) WHERE (is_rollback = true)`
- `btree (created_at)`
- `btree (transaction_type)`
- `btree (item_id)`
- `btree (source_type, created_at DESC)`
- `btree (source_id) WHERE (source_id IS NOT NULL)`
- `btree (receipt_id) WHERE (receipt_id IS NOT NULL)`
- `btree (created_at DESC)`

</details>

## `equipment`

0 dòng · RLS bật · 4 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `equipment_code` | text | NOT NULL |  |
| `equipment_name` | text | NOT NULL |  |
| `equipment_type` | text |  |  |
| `manufacturer` | text |  |  |
| `image_url` | text |  |  |
| `supplier` | text |  |  |
| `purchase_date` | date |  |  |
| `quantity` | int |  | `1` |
| `warranty_months` | int |  | `0` |
| `purchase_price` | numeric |  | `0` |
| `depreciation_rate_yearly` | numeric |  | `0` |
| `months_used` | int |  | `0` |
| `current_value` | numeric |  | `0` |
| `monthly_depreciation` | numeric |  | `0` |
| `condition` | text |  | `'good'` |
| `notes` | text |  |  |
| `current_holder` | uuid |  |  |
| `location` | text |  |  |
| `created_at` | timestamptz |  | `now()` |
| `created_by` | uuid |  |  |

**Trỏ ra:** `current_holder` → `employees.id`

<details><summary>3 index</summary>

- `UNIQUE btree (id)`
- `UNIQUE btree (equipment_code)`
- `btree (equipment_code)`

</details>
