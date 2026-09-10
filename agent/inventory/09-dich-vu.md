---
title: "Kiểm kê — Dịch vụ"
lat-cat: 09-dich-vu
cap-nhat: 2026-09-01
trang-thai: sinh-tu-dong
nguon: pg_class · pg_proc · pg_policies · pg_trigger · pg_constraint · quét mã nguồn
---

> ⚙️ **Sinh bởi `scripts/vault-gen-kiem-ke.mjs` từ database production. ĐỪNG sửa tay.**
> Cột *vận hành thực tế* ở đây là dữ kiện đo được (ai ghi, ai đọc, còn sống hay không).
> Phần diễn giải *thiết kế ban đầu ↔ thực tế lệch nhau chỗ nào* nằm ở [[00-lech-thiet-ke]].

# Kiểm kê — Dịch vụ

4 bảng · 3 hàm DB

## Bảng dữ liệu

### `service_bundles`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 0 ⚠️ bật RLS nhưng 0 policy ⇒ anon key bị chặn hoàn toàn

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `parent_service_id` | uuid | không | — |
| `child_service_id` | uuid | không | — |
| `quantity` | integer | không | `1` |
| `adjustment_price` | numeric | có | `0` |
| `sort_order` | integer | có | `0` |
| `created_at` | timestamp with time zone | có | `now()` |

**Trỏ ra:** `parent_service_id`→`services` (CASCADE) · `child_service_id`→`services` (CASCADE)

**GHI qua RPC (2):** `delete_service_atomic` · `save_service_atomic`

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (1):** `app/actions/service-queries.ts`


### `service_categories`

**Số dòng (ước):** 7 · **RLS:** bật · **Policy:** 4

**Policy:** service_categories_delete:DELETE, service_categories_insert:INSERT, service_categories_select:SELECT, service_categories_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `name` | character varying | không | — |
| `parent_id` | uuid | có | — |
| `sort_order` | integer | có | `0` |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |
| `slug` | character varying | có | — |
| `icon` | character varying | có | — |

**Trỏ ra:** `parent_id`→`service_categories`

**Bị trỏ tới bởi (2):** `service_categories` · `services`

**Trigger:** `emit_realtime_signal`→emit_realtime_signal() · `update_service_categories_updated_at`→update_updated_at_column()

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (1):** `save_service_atomic`

**Chạm từ mã nguồn (2):** `app/actions/category-actions.ts` · `app/actions/service-queries.ts`


### `service_relations`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 1

**Policy:** authenticated_relations:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `parent_service_id` | uuid | không | — |
| `child_service_id` | uuid | có | — |
| `child_category_id` | uuid | có | — |
| `relation_type` | character varying | có | `'addon'::character varying` |
| `is_required` | boolean | có | `false` |
| `sort_order` | integer | có | `0` |
| `created_at` | timestamp with time zone | có | `now()` |

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (1):** `app/actions/builder-actions.ts`


### `services`

**Số dòng (ước):** 18 · **RLS:** bật · **Policy:** 4

**Policy:** services_delete:DELETE, services_insert:INSERT, services_select:SELECT, services_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `service_code` | character varying | không | — |
| `name` | character varying | không | — |
| `service_type` | text | không | — |
| `category_id` | uuid | có | — |
| `selling_price` | numeric | không | `0` |
| `cost_price` | numeric | có | `0` |
| `description` | text | có | — |
| `image_url` | text | có | — |
| `status` | character varying | có | `'active'::character varying` |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |
| `created_by` | uuid | có | — |
| `updated_by` | uuid | có | — |
| `deleted_at` | timestamp with time zone | có | — |
| `unit` | character varying | có | `'dich_vu'::character varying` |
| `fulfillment_type` | character varying | có | `'single'::character varying` |

**Trỏ ra:** `category_id`→`service_categories` · `created_by`→`auth.users` · `updated_by`→`auth.users`

**Bị trỏ tới bởi (2):** `contract_items` · `service_bundles`

**Trigger:** `emit_realtime_signal`→emit_realtime_signal() · `update_services_updated_at`→update_updated_at_column()

**GHI qua RPC (2):** `delete_service_atomic` · `save_service_atomic`

**ĐỌC qua RPC (2):** `finance_service_distribution` · `printing_lab_overview`

**Chạm từ mã nguồn (6):** `app/actions/category-actions.ts` · `app/actions/service-queries.ts` · `lib/moodie/core-engine.ts` · `lib/moodie/tools.ts` · `scripts/inspect-service-types.mjs` · `scripts/normalize-services.mjs`


## Hàm DB

| Hàm | Trả về | Quyền | Tính chất | Bảng chạm | Gọi từ mã nguồn |
|---|---|---|---|---|---|
| `delete_service_atomic(p_actor_id uuid, p_service_id uuid)` | `jsonb` | **DEFINER** | VOLATILE | contract_items, service_bundles, services | 2 file |
| `printing_lab_overview()` | `TABLE(id uuid, lab_name text, contact_person text, phone text, address text, status text, created_at timestamp with time zone, service_count bigint, service_preview text[], outstanding_debt numeric, unpaid_orders bigint, last_payment_at timestamp with time zone)` | **DEFINER** | VOLATILE | expenses, lab_services, labs, payments, services | 2 file |
| `save_service_atomic(p_actor_id uuid, p_service jsonb, p_bundle_items jsonb, p_expected_upd)` | `jsonb` | **DEFINER** | VOLATILE | service_bundles, service_categories, services | 3 file |

Thân đầy đủ từng hàm: `vault/30-du-lieu/than-ham/`.
