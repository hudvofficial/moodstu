---
title: "Kiểm kê — Váy cưới"
lat-cat: 08-vay-cuoi
cap-nhat: 2026-09-01
trang-thai: sinh-tu-dong
nguon: pg_class · pg_proc · pg_policies · pg_trigger · pg_constraint · quét mã nguồn
---

> ⚙️ **Sinh bởi `scripts/vault-gen-kiem-ke.mjs` từ database production. ĐỪNG sửa tay.**
> Cột *vận hành thực tế* ở đây là dữ kiện đo được (ai ghi, ai đọc, còn sống hay không).
> Phần diễn giải *thiết kế ban đầu ↔ thực tế lệch nhau chỗ nào* nằm ở [[00-lech-thiet-ke]].

# Kiểm kê — Váy cưới

4 bảng · 14 hàm DB

## Bảng dữ liệu

### `dress_rental_accessories`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 1

**Policy:** auth_all:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `rental_id` | uuid | không | — |
| `name` | text | không | — |
| `quantity` | integer | có | `1` |
| `returned` | boolean | có | `false` |
| `condition_note` | text | có | — |
| `created_at` | timestamp with time zone | có | `now()` |

**Trỏ ra:** `rental_id`→`dress_rentals` (CASCADE)

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (0):** — **không file nào truy vấn trực tiếp**

> 🔴 **Không đường ghi nào tìm thấy** — bảng này có thể đã chết hoặc chỉ nhận dữ liệu từ ngoài hệ thống.


### `dress_rentals`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 4

**Policy:** auth_delete:DELETE, auth_insert:INSERT, auth_read:SELECT, auth_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `item_id` | uuid | không | — |
| `contract_id` | uuid | có | — |
| `customer_name` | text | không | — |
| `phone` | text | có | — |
| `pickup_date` | date | không | — |
| `return_date` | date | không | — |
| `actual_return_date` | date | có | — |
| `rental_price` | numeric | có | `0` |
| `deposit` | numeric | có | `0` |
| `deposit_returned` | boolean | có | `false` |
| `damage_fee` | numeric | có | `0` |
| `status` | character varying | có | `'reserved'::character varying` |
| `accessories` | text | có | — |
| `notes` | text | có | — |
| `return_condition` | text | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |
| `created_by` | uuid | có | — |

**Trỏ ra:** `item_id`→`dresses` (CASCADE) · `contract_id`→`contracts` (SET NULL) · `created_by`→`auth.users`

**Bị trỏ tới bởi (1):** `dress_rental_accessories`

**Trigger:** `emit_realtime_signal`→emit_realtime_signal() · `trg_refresh_dress_status_from_rental`→trg_refresh_dress_status_from_rental() · `update_dress_rentals_updated_at`→update_updated_at_column()

**GHI qua RPC (4):** `cancel_dress_rental_atomic` · `create_standalone_dress_rental_atomic` · `return_dress_rental_atomic` · `start_dress_rental_atomic`

**ĐỌC qua RPC (5):** `delete_dress_atomic` · `dress_rental_list` · `get_finance_advanced_intelligence` · `is_dress_available` · `refresh_dress_status_atomic`

**Chạm từ mã nguồn (4):** `app/actions/dress-mutations.ts` · `app/actions/dress-queries.ts` · `app/actions/rental-mutations.ts` · `app/actions/rental-queries.ts`


### `dress_reservations`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 4

**Policy:** inventory_reservations_delete:DELETE, inventory_reservations_insert:INSERT, inventory_reservations_select:SELECT, inventory_reservations_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `dress_id` | uuid | không | — |
| `contract_id` | uuid | có | — |
| `contract_item_id` | uuid | có | — |
| `customer_id` | uuid | có | — |
| `start_date` | date | không | — |
| `end_date` | date | không | — |
| `export_type` | USER-DEFINED | có | — |
| `status` | character varying | có | `'reserved'::character varying` |
| `notes` | text | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |

**Trỏ ra:** `customer_id`→`customers` · `dress_id`→`dresses` · `contract_id`→`contracts` · `contract_item_id`→`contract_items`

**Trigger:** `emit_realtime_signal`→emit_realtime_signal() · `trg_refresh_dress_status_from_reservation`→trg_refresh_dress_status_from_reservation() · `update_reservations_updated_at`→update_updated_at_column()

**CHECK:** `CHECK ((end_date >= start_date))`

**GHI qua RPC (5):** `cancel_contract_cascade` · `create_dress_contract_reservation_atomic` · `delete_contract_cascade` · `release_dress_reservation_atomic` · `update_dress_reservation_status_atomic`

**ĐỌC qua RPC (5):** `delete_dress_atomic` · `get_contract_detail_v2` · `get_contract_detail_v3` · `is_dress_available` · `refresh_dress_status_atomic`

**Chạm từ mã nguồn (6):** `app/actions/contract-lifecycle.ts` · `app/actions/dress-mutations.ts` · `app/actions/dress-queries.ts` · `app/actions/rental-mutations.ts` · `lib/services/dress-sync-service.ts` · `scripts/perf-operational-probe.mjs`


### `dresses`

**Số dòng (ước):** 2 · **RLS:** bật · **Policy:** 4

**Policy:** inventory_items_delete:DELETE, inventory_items_insert:INSERT, inventory_items_select:SELECT, inventory_items_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `item_code` | character varying | không | — |
| `name` | character varying | không | — |
| `category` | character varying | có | — |
| `size` | character varying | có | — |
| `color` | character varying | có | — |
| `condition` | character varying | có | `'new'::character varying` |
| `rental_price` | numeric | có | `0` |
| `sale_price` | numeric | có | `0` |
| `current_stock` | integer | có | `0` |
| `min_stock` | integer | có | `0` |
| `image_url` | text | có | — |
| `status` | character varying | có | `'available'::character varying` |
| `notes` | text | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |
| `average_unit_price` | numeric | có | `0` |
| `purchase_price` | numeric | có | `0` |
| `created_by` | uuid | có | — |
| `updated_by` | uuid | có | — |
| `deleted_at` | timestamp with time zone | có | — |
| `blur_hash` | text | có | — |
| `blur_data_url` | text | có | — |

**Trỏ ra:** `created_by`→`auth.users` · `updated_by`→`auth.users`

**Bị trỏ tới bởi (3):** `contract_items` · `dress_reservations` · `dress_rentals`

**Trigger:** `audit_inventory`→log_audit_action() · `emit_realtime_signal`→emit_realtime_signal() · `update_inventory_updated_at`→update_updated_at_column()

**GHI qua RPC (4):** `delete_dress_atomic` · `mark_dress_cleaned_atomic` · `refresh_dress_status_atomic` · `return_dress_rental_atomic`

**ĐỌC qua RPC (13):** `cancel_dress_rental_atomic` · `create_dress_contract_reservation_atomic` · `create_standalone_dress_rental_atomic` · `dress_list` · `dress_rental_list` · `dress_stats` · `get_contract_detail_v2` · `get_contract_detail_v3` · `get_finance_advanced_intelligence` · `is_dress_available` · `release_dress_reservation_atomic` · `start_dress_rental_atomic` … +1

**Chạm từ mã nguồn (7):** `app/actions/category-actions.ts` · `app/actions/contract-lifecycle.ts` · `app/actions/dress-mutations.ts` · `app/actions/dress-queries.ts` · `app/actions/rental-mutations.ts` · `lib/hooks/use-prefetch-on-hover.ts` · `lib/services/dress-sync-service.ts`


## Hàm DB

| Hàm | Trả về | Quyền | Tính chất | Bảng chạm | Gọi từ mã nguồn |
|---|---|---|---|---|---|
| `cancel_dress_rental_atomic(p_rental_id uuid, p_user_id uuid)` | `jsonb` | invoker | VOLATILE | dress_rentals, dresses | 2 file |
| `create_dress_contract_reservation_atomic(p_dress_id uuid, p_contract_id uuid, p_contract_item_id uuid, p_custom)` | `jsonb` | invoker | VOLATILE | contract_items, dress_reservations, dresses | 2 file |
| `create_standalone_dress_rental_atomic(p_item_id uuid, p_contract_id uuid, p_customer_name text, p_phone text)` | `jsonb` | invoker | VOLATILE | dress_rentals, dresses | 2 file |
| `delete_dress_atomic(p_dress_id uuid, p_user_id uuid)` | `jsonb` | invoker | VOLATILE | contract_items, dress_rentals, dress_reservations, dresses | 3 file |
| `dress_list(p_search text, p_category text, p_status text, p_sort text, p_page int)` | `jsonb` | invoker | STABLE | dresses | 2 file |
| `dress_rental_list(p_status text, p_search text, p_page integer, p_limit integer, p_item_)` | `jsonb` | invoker | STABLE | dress_rentals, dresses | 2 file |
| `dress_stats()` | `jsonb` | invoker | STABLE | dresses | 2 file |
| `is_dress_available(p_dress_id uuid, p_start_date date, p_end_date date, p_exclude_reserva)` | `boolean` | invoker | STABLE | dress_rentals, dress_reservations, dresses | 2 file |
| `mark_dress_cleaned_atomic(p_dress_id uuid, p_user_id uuid)` | `jsonb` | invoker | VOLATILE | dresses | 2 file |
| `refresh_dress_status_atomic(p_dress_id uuid, p_user_id uuid)` | `jsonb` | invoker | VOLATILE | dress_rentals, dress_reservations, dresses | 2 file |
| `release_dress_reservation_atomic(p_reservation_id uuid, p_user_id uuid)` | `jsonb` | invoker | VOLATILE | contract_items, dress_reservations, dresses | 2 file |
| `return_dress_rental_atomic(p_rental_id uuid, p_return_condition text, p_damage_fee numeric, p_dep)` | `jsonb` | invoker | VOLATILE | dress_rentals, dresses | 2 file |
| `start_dress_rental_atomic(p_rental_id uuid, p_user_id uuid)` | `jsonb` | invoker | VOLATILE | dress_rentals, dresses | 2 file |
| `update_dress_reservation_status_atomic(p_reservation_id uuid, p_status text, p_user_id uuid)` | `jsonb` | invoker | VOLATILE | contract_items, dress_reservations, dresses | 2 file |

Thân đầy đủ từng hàm: `vault/30-du-lieu/than-ham/`.
