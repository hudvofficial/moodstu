---
title: "Lược đồ DB — In ấn & Lab"
tags: [du-lieu, schema, in-an-lab]
sinh-tu: "introspect DB thật (pooler) — regenerate bằng scripts/vault-gen-schema.mjs"
cap-nhat: 2026-08-07
---

# Lược đồ DB — In ấn & Lab

> Sinh tự động từ **DB production thật**, không phải từ `types/database.types.ts` (file đó đang thiếu bảng — xem [[canh-bao-schema]]).

Module liên quan: [[in-an-lab]]

| Bảng | Số dòng | RLS | Policy |
|---|---:|---|---:|
| `printing_orders` | 29 | ✅ | 4 |
| `printing_order_status_history` | 26 | ✅ | 2 |
| `labs` | 1 | ✅ | 4 |
| `lab_services` | 22 | ✅ | 4 |
| `lab_payments` | 2 | ✅ | 0 |
| `lab_payment_allocations` | 2 | ✅ | 0 |

## `printing_orders`

29 dòng · RLS bật · 4 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `order_code` | text |  |  |
| `contract_id` | uuid |  |  |
| `lab_id` | uuid |  |  |
| `items` | jsonb |  | `'[]'` |
| `total_amount` | numeric |  | `0` |
| `status` | text |  | `'moi'` |
| `payment_status` | text |  | `'chua_thanh_toan'` |
| `order_date` | date |  | `CURRENT_DATE` |
| `expected_date` | date |  |  |
| `received_date` | date |  |  |
| `delivered_date` | date |  |  |
| `notes` | text |  |  |
| `created_by` | uuid |  |  |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |
| `deleted_at` | timestamptz |  |  |
| `updated_by` | uuid |  |  |
| `deposit_amount` | numeric |  | `0` |
| `final_amount` | numeric |  | `0` |
| `paid_amount` | numeric |  | `0` |
| `inventory_status` | text |  | `'none'` |
| `cancelled_at` | timestamptz |  |  |
| `cancellation_reason` | text |  |  |
| `delivered_at` | timestamptz |  |  |
| `remaining_amount` | numeric |  |  |
| `issue_reason` | text |  |  |
| `issue_reported_at` | timestamptz |  |  |
| `issue_reported_by` | uuid |  |  |
| `print_file_url` | text |  |  |

**Trỏ ra:** `lab_id` → `labs.id` · `contract_id` → `contracts.id`

**Bị trỏ tới bởi:** `inventory_reservations.order_id` · `order_payments.order_id` · `expenses.printing_order_id` · `printing_order_status_history.order_id` · `lab_payment_allocations.printing_order_id`

**Trigger:** `emit_realtime_signal` → `emit_realtime_signal()` · `update_printing_orders_updated_at` → `update_updated_at_column()`

**CHECK:** `CHECK ((inventory_status = ANY (ARRAY['none', 'reserved', 'stocked_out', 'cancelled'])))`

<details><summary>14 index</summary>

- `btree (payment_status) WHERE (deleted_at IS NULL)`
- `UNIQUE btree (id)`
- `UNIQUE btree (order_code)`
- `btree (contract_id)`
- `btree (lab_id) WHERE (deleted_at IS NULL)`
- `btree (created_at DESC) WHERE (deleted_at IS NULL)`
- `btree (contract_id) WHERE (deleted_at IS NULL)`
- `btree (lab_id) WHERE (deleted_at IS NULL)`
- `btree (status)`
- `btree (status, order_date DESC) WHERE (deleted_at IS NULL)`
- `btree (payment_status, order_date DESC) WHERE (deleted_at IS NULL)`
- `btree (lab_id, payment_status) WHERE ((deleted_at IS NULL) AND (lab_id IS NOT NULL))`
- `UNIQUE btree (order_code) WHERE ((deleted_at IS NULL) AND (order_code IS NOT NULL))`
- `btree (contract_id)`

</details>

## `printing_order_status_history`

26 dòng · RLS bật · 2 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `order_id` | uuid | NOT NULL |  |
| `from_status` | text | NOT NULL |  |
| `to_status` | text | NOT NULL |  |
| `changed_by` | uuid |  |  |
| `changed_at` | timestamptz | NOT NULL | `now()` |
| `reason` | text |  |  |
| `source` | text | NOT NULL | `'manual'` |

**Trỏ ra:** `order_id` → `printing_orders.id` (ON DELETE CASCADE)

<details><summary>3 index</summary>

- `UNIQUE btree (id)`
- `btree (order_id)`
- `btree (changed_at)`

</details>

## `labs`

1 dòng · RLS bật · 4 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `lab_name` | text | NOT NULL |  |
| `contact_person` | text |  |  |
| `phone` | text |  |  |
| `address` | text |  |  |
| `created_at` | timestamptz |  | `now()` |
| `status` | text | NOT NULL | `'active'` |
| `deleted_at` | timestamptz |  |  |
| `updated_by` | uuid |  |  |
| `updated_at` | timestamptz |  | `now()` |

**Bị trỏ tới bởi:** `lab_payments.lab_id` · `printing_orders.lab_id` · `lab_services.lab_id`

<details><summary>1 index</summary>

- `UNIQUE btree (id)`

</details>

## `lab_services`

22 dòng · RLS bật · 4 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `lab_id` | uuid | NOT NULL |  |
| `item_name` | text | NOT NULL |  |
| `cost_price` | numeric |  | `0` |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |

**Trỏ ra:** `lab_id` → `labs.id` (ON DELETE CASCADE)

**Trigger:** `update_lab_services_updated_at` → `update_updated_at_column()`

<details><summary>2 index</summary>

- `UNIQUE btree (id)`
- `btree (lab_id)`

</details>

## `lab_payments`

2 dòng · RLS bật · 0 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `lab_id` | uuid | NOT NULL |  |
| `amount` | numeric | NOT NULL |  |
| `payment_method` | text | NOT NULL | `'chuyen_khoan'` |
| `note` | text |  |  |
| `created_by` | uuid |  |  |
| `created_at` | timestamptz | NOT NULL | `now()` |

**Trỏ ra:** `lab_id` → `labs.id` (ON DELETE CASCADE)

**Bị trỏ tới bởi:** `lab_payment_allocations.payment_id`

<details><summary>4 index</summary>

- `UNIQUE btree (id)`
- `btree (lab_id)`
- `btree (created_at DESC)`
- `btree (lab_id)`

</details>

## `lab_payment_allocations`

2 dòng · RLS bật · 0 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `payment_id` | uuid | NOT NULL |  |
| `printing_order_id` | uuid | NOT NULL |  |
| `amount` | numeric | NOT NULL |  |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `created_by` | uuid |  |  |

**Trỏ ra:** `payment_id` → `lab_payments.id` (ON DELETE CASCADE) · `printing_order_id` → `printing_orders.id`

**CHECK:** `CHECK ((amount > (0)))`

<details><summary>4 index</summary>

- `UNIQUE btree (id)`
- `UNIQUE btree (payment_id, printing_order_id)`
- `btree (printing_order_id)`
- `btree (payment_id)`

</details>
