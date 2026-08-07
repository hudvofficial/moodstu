---
title: "Lược đồ DB — Váy cưới"
tags: [du-lieu, schema, vay-cuoi]
sinh-tu: "introspect DB thật (pooler) — regenerate bằng scripts/vault-gen-schema.mjs"
cap-nhat: 2026-08-07
---

# Lược đồ DB — Váy cưới

> Sinh tự động từ **DB production thật**, không phải từ `types/database.types.ts` (file đó đang thiếu bảng — xem [[canh-bao-schema]]).

Module liên quan: [[vay-cuoi]]

| Bảng | Số dòng | RLS | Policy |
|---|---:|---|---:|
| `dresses` | 2 | ✅ | 4 |
| `dress_rentals` | 0 | ✅ | 4 |
| `dress_rental_accessories` | 0 | ✅ | 1 |
| `dress_reservations` | 0 | ✅ | 4 |

## `dresses`

2 dòng · RLS bật · 4 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `item_code` | text | NOT NULL |  |
| `name` | text | NOT NULL |  |
| `category` | text |  |  |
| `size` | text |  |  |
| `color` | text |  |  |
| `condition` | text |  | `'new'` |
| `rental_price` | numeric |  | `0` |
| `sale_price` | numeric |  | `0` |
| `current_stock` | int |  | `0` |
| `min_stock` | int |  | `0` |
| `image_url` | text |  |  |
| `status` | text |  | `'available'` |
| `notes` | text |  |  |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |
| `average_unit_price` | numeric |  | `0` |
| `purchase_price` | numeric |  | `0` |
| `created_by` | uuid |  |  |
| `updated_by` | uuid |  |  |
| `deleted_at` | timestamptz |  |  |
| `blur_hash` | text |  |  |
| `blur_data_url` | text |  |  |

**Bị trỏ tới bởi:** `dress_rentals.item_id` · `dress_reservations.dress_id` · `contract_items.dress_id`

**Trigger:** `audit_inventory` → `log_audit_action()` · `emit_realtime_signal` → `emit_realtime_signal()` · `update_inventory_updated_at` → `update_updated_at_column()`

<details><summary>15 index</summary>

- `UNIQUE btree (id)`
- `UNIQUE btree (item_code)`
- `btree (item_code)`
- `btree (deleted_at) WHERE (deleted_at IS NULL)`
- `btree (category)`
- `btree (status)`
- `btree (blur_hash) WHERE ((image_url IS NOT NULL) AND (blur_hash IS NULL))`
- `btree (status, name) WHERE (deleted_at IS NULL)`
- `gin (name gin_trgm_ops) WHERE (deleted_at IS NULL)`
- `gin (item_code gin_trgm_ops) WHERE (deleted_at IS NULL)`
- `btree (created_at DESC) WHERE (deleted_at IS NULL)`
- `btree (status, created_at DESC) WHERE (deleted_at IS NULL)`
- `btree (category, created_at DESC) WHERE (deleted_at IS NULL)`
- `btree (rental_price, created_at DESC) WHERE (deleted_at IS NULL)`
- `btree (name, created_at DESC) WHERE (deleted_at IS NULL)`

</details>

## `dress_rentals`

0 dòng · RLS bật · 4 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `item_id` | uuid | NOT NULL |  |
| `contract_id` | uuid |  |  |
| `customer_name` | text | NOT NULL |  |
| `phone` | text |  |  |
| `pickup_date` | date | NOT NULL |  |
| `return_date` | date | NOT NULL |  |
| `actual_return_date` | date |  |  |
| `rental_price` | numeric |  | `0` |
| `deposit` | numeric |  | `0` |
| `deposit_returned` | bool |  | `false` |
| `damage_fee` | numeric |  | `0` |
| `status` | text |  | `'reserved'` |
| `accessories` | text |  |  |
| `notes` | text |  |  |
| `return_condition` | text |  |  |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |
| `created_by` | uuid |  |  |

**Trỏ ra:** `contract_id` → `contracts.id` (ON DELETE SET NULL) · `item_id` → `dresses.id` (ON DELETE CASCADE)

**Bị trỏ tới bởi:** `dress_rental_accessories.rental_id`

**Trigger:** `emit_realtime_signal` → `emit_realtime_signal()` · `trg_refresh_dress_status_from_rental` → `trg_refresh_dress_status_from_rental()` · `update_dress_rentals_updated_at` → `update_updated_at_column()`

<details><summary>7 index</summary>

- `UNIQUE btree (id)`
- `btree (item_id)`
- `btree (pickup_date, return_date)`
- `btree (phone)`
- `btree (status)`
- `btree (item_id, status, pickup_date, return_date)`
- `btree (contract_id, created_at DESC) WHERE (contract_id IS NOT NULL)`

</details>

## `dress_rental_accessories`

0 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `rental_id` | uuid | NOT NULL |  |
| `name` | text | NOT NULL |  |
| `quantity` | int |  | `1` |
| `returned` | bool |  | `false` |
| `condition_note` | text |  |  |
| `created_at` | timestamptz |  | `now()` |

**Trỏ ra:** `rental_id` → `dress_rentals.id` (ON DELETE CASCADE)

<details><summary>2 index</summary>

- `UNIQUE btree (id)`
- `btree (rental_id)`

</details>

## `dress_reservations`

0 dòng · RLS bật · 4 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `dress_id` | uuid | NOT NULL |  |
| `contract_id` | uuid |  |  |
| `contract_item_id` | uuid |  |  |
| `customer_id` | uuid |  |  |
| `start_date` | date | NOT NULL |  |
| `end_date` | date | NOT NULL |  |
| `export_type` | export_type_enum |  |  |
| `status` | text |  | `'reserved'` |
| `notes` | text |  |  |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |

**Trỏ ra:** `contract_item_id` → `contract_items.id` · `contract_id` → `contracts.id` · `dress_id` → `dresses.id` · `customer_id` → `customers.id`

**Trigger:** `emit_realtime_signal` → `emit_realtime_signal()` · `trg_refresh_dress_status_from_reservation` → `trg_refresh_dress_status_from_reservation()` · `update_reservations_updated_at` → `update_updated_at_column()`

**CHECK:** `CHECK ((end_date >= start_date))`

<details><summary>7 index</summary>

- `UNIQUE btree (id)`
- `btree (dress_id, start_date, end_date)`
- `btree (contract_id)`
- `btree (contract_id, created_at DESC)`
- `btree (dress_id, status)`
- `btree (dress_id, status, start_date, end_date)`
- `btree (customer_id, start_date DESC) WHERE (customer_id IS NOT NULL)`

</details>
