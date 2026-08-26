---
title: "Lược đồ DB — In ấn & Lab"
tags: [du-lieu, schema, in-an-lab]
sinh-tu: "introspect DB thật (pooler) — regenerate bằng scripts/vault-gen-schema.mjs"
cap-nhat: 2026-08-07
---

# Lược đồ DB — In ấn & Lab

> Sinh tự động từ **DB production thật** (không phải từ `types/database.types.ts`). Sau mỗi migration nhớ chạy cả `npm run db:types` — xem [[canh-bao-schema]].

Module liên quan: [[in-an-lab]]

| Bảng | Số dòng | RLS | Policy |
|---|---:|---|---:|
| `printing_orders` | 35 | ✅ | 4 |
| `printing_order_status_history` | 66 | ✅ | 2 |
| `labs` | 1 | ✅ | 4 |
| `lab_services` | 22 | ✅ | 4 |

## `printing_orders`

35 dòng · RLS bật · 4 policy

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

**Bị trỏ tới bởi:** `inventory_reservations.order_id` · `order_payments.order_id` · `expenses.printing_order_id` · `printing_order_status_history.order_id`

**Trigger:** `emit_realtime_signal` → `emit_realtime_signal()` · `update_printing_orders_updated_at` → `update_updated_at_column()`

**CHECK:** `CHECK ((inventory_status = ANY (ARRAY['none', 'reserved', 'stocked_out', 'cancelled'])))` · `CHECK (((deleted_at IS NOT NULL) OR ((payment_status)= ANY ((ARRAY['chua_thanh_toan', 'da_thanh_toan'])))))` · `CHECK (((deleted_at IS NOT NULL) OR ((status)= ANY ((ARRAY['cho_xu_ly', 'dang_in', 'da_in', 'hoan_thanh', 'huy_don', 'gap_su_co'])))))`

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

66 dòng · RLS bật · 2 policy

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

**Bị trỏ tới bởi:** `printing_orders.lab_id` · `lab_services.lab_id`

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
