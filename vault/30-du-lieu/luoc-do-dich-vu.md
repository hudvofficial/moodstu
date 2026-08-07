---
title: "Lược đồ DB — Dịch vụ & báo giá"
tags: [du-lieu, schema, dich-vu]
sinh-tu: "introspect DB thật (pooler) — regenerate bằng scripts/vault-gen-schema.mjs"
cap-nhat: 2026-08-07
---

# Lược đồ DB — Dịch vụ & báo giá

> Sinh tự động từ **DB production thật**, không phải từ `types/database.types.ts` (file đó đang thiếu bảng — xem [[canh-bao-schema]]).

Module liên quan: [[dich-vu]]

| Bảng | Số dòng | RLS | Policy |
|---|---:|---|---:|
| `services` | 18 | ✅ | 4 |
| `service_categories` | 7 | ✅ | 4 |
| `service_bundles` | 0 | ✅ | 0 |
| `service_relations` | 0 | ✅ | 1 |
| `price_rules` | 0 | ✅ | 1 |
| `promotions` | 0 | ✅ | 4 |

## `services`

18 dòng · RLS bật · 4 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `service_code` | text | NOT NULL |  |
| `name` | text | NOT NULL |  |
| `service_type` | text | NOT NULL |  |
| `category_id` | uuid |  |  |
| `selling_price` | numeric | NOT NULL | `0` |
| `cost_price` | numeric |  | `0` |
| `description` | text |  |  |
| `image_url` | text |  |  |
| `status` | text |  | `'active'` |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |
| `created_by` | uuid |  |  |
| `updated_by` | uuid |  |  |
| `deleted_at` | timestamptz |  |  |
| `unit` | text |  | `'dich_vu'` |
| `fulfillment_type` | text |  | `'single'` |

**Trỏ ra:** `category_id` → `service_categories.id`

**Bị trỏ tới bởi:** `service_bundles.child_service_id` · `service_bundles.parent_service_id` · `contract_items.service_id`

**Trigger:** `emit_realtime_signal` → `emit_realtime_signal()` · `update_services_updated_at` → `update_updated_at_column()`

<details><summary>15 index</summary>

- `UNIQUE btree (id)`
- `UNIQUE btree (service_code)`
- `btree (service_code)`
- `btree (created_at DESC) WHERE (deleted_at IS NULL)`
- `btree (category_id, created_at DESC) WHERE (deleted_at IS NULL)`
- `btree (status, created_at DESC) WHERE (deleted_at IS NULL)`
- `btree (fulfillment_type, created_at DESC) WHERE (deleted_at IS NULL)`
- `gin (name gin_trgm_ops) WHERE (deleted_at IS NULL)`
- `gin (service_code gin_trgm_ops) WHERE (deleted_at IS NULL)`
- `btree (status) WHERE (deleted_at IS NULL)`
- `btree (category_id)`
- `btree (deleted_at) WHERE (deleted_at IS NOT NULL)`
- `btree (service_type)`
- `UNIQUE btree (service_code) WHERE ((deleted_at IS NULL) AND (service_code IS NOT NULL))`
- `btree (unit, name) WHERE ((deleted_at IS NULL) AND ((status)::text = 'active'::text))`

</details>

## `service_categories`

7 dòng · RLS bật · 4 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `name` | text | NOT NULL |  |
| `parent_id` | uuid |  |  |
| `sort_order` | int |  | `0` |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |
| `slug` | text |  |  |
| `icon` | text |  |  |

**Trỏ ra:** `parent_id` → `service_categories.id`

**Bị trỏ tới bởi:** `services.category_id` · `service_categories.parent_id`

**Trigger:** `emit_realtime_signal` → `emit_realtime_signal()` · `update_service_categories_updated_at` → `update_updated_at_column()`

<details><summary>2 index</summary>

- `UNIQUE btree (id)`
- `btree (sort_order, name)`

</details>

## `service_bundles`

0 dòng · RLS bật · 0 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `parent_service_id` | uuid | NOT NULL |  |
| `child_service_id` | uuid | NOT NULL |  |
| `quantity` | int | NOT NULL | `1` |
| `adjustment_price` | numeric |  | `0` |
| `sort_order` | int |  | `0` |
| `created_at` | timestamptz |  | `now()` |

**Trỏ ra:** `child_service_id` → `services.id` (ON DELETE CASCADE) · `parent_service_id` → `services.id` (ON DELETE CASCADE)

<details><summary>5 index</summary>

- `btree (parent_service_id, sort_order)`
- `UNIQUE btree (id)`
- `UNIQUE btree (parent_service_id, child_service_id)`
- `btree (parent_service_id)`
- `UNIQUE btree (parent_service_id, child_service_id)`

</details>

## `service_relations`

0 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `parent_service_id` | uuid | NOT NULL |  |
| `child_service_id` | uuid |  |  |
| `child_category_id` | uuid |  |  |
| `relation_type` | text |  | `'addon'` |
| `is_required` | bool |  | `false` |
| `sort_order` | int |  | `0` |
| `created_at` | timestamptz |  | `now()` |

<details><summary>2 index</summary>

- `UNIQUE btree (id)`
- `btree (parent_service_id, sort_order)`

</details>

## `price_rules`

0 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `name` | text | NOT NULL |  |
| `description` | text |  |  |
| `conditions` | jsonb |  | `'{}'` |
| `actions` | jsonb |  | `'{}'` |
| `priority` | int |  | `0` |
| `is_active` | bool |  | `true` |
| `created_at` | timestamptz |  | `now()` |

<details><summary>2 index</summary>

- `UNIQUE btree (id)`
- `btree (is_active, priority DESC)`

</details>

## `promotions`

0 dòng · RLS bật · 4 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `promo_code` | text | NOT NULL |  |
| `promo_name` | text | NOT NULL |  |
| `discount_type` | text |  |  |
| `discount_value` | numeric | NOT NULL |  |
| `min_order_value` | numeric |  | `0` |
| `max_discount_amount` | numeric |  |  |
| `start_date` | timestamptz |  |  |
| `end_date` | timestamptz |  |  |
| `usage_limit` | int |  |  |
| `usage_count` | int |  | `0` |
| `status` | text |  | `'active'` |
| `created_at` | timestamptz |  | `now()` |

**CHECK:** `CHECK (((discount_type)= ANY ((ARRAY['percentage', 'fixed']))))`

<details><summary>2 index</summary>

- `UNIQUE btree (id)`
- `UNIQUE btree (promo_code)`

</details>
