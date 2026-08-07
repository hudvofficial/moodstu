---
title: "Lược đồ DB — Khách hàng & CRM"
tags: [du-lieu, schema, khach-hang-crm]
sinh-tu: "introspect DB thật (pooler) — regenerate bằng scripts/vault-gen-schema.mjs"
cap-nhat: 2026-08-07
---

# Lược đồ DB — Khách hàng & CRM

> Sinh tự động từ **DB production thật**, không phải từ `types/database.types.ts` (file đó đang thiếu bảng — xem [[canh-bao-schema]]).

Module liên quan: [[khach-hang-crm]]

| Bảng | Số dòng | RLS | Policy |
|---|---:|---|---:|
| `customers` | 55 | ✅ | 4 |
| `crm_leads` | 4 | ✅ | 4 |

## `customers`

55 dòng · RLS bật · 4 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `customer_code` | text | NOT NULL |  |
| `full_name` | text | NOT NULL |  |
| `phone` | text |  |  |
| `alt_phone` | text |  |  |
| `email` | text |  |  |
| `address` | text |  |  |
| `gender` | gender_enum |  |  |
| `date_of_birth` | date |  |  |
| `wedding_date` | date |  |  |
| `avatar_url` | text |  |  |
| `source` | text |  |  |
| `notes` | text |  |  |
| `tags` | text[] |  | `'{}'` |
| `status` | text |  | `'active'` |
| `deleted_at` | timestamptz |  |  |
| `created_by` | uuid |  |  |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |
| `lead_id` | uuid |  |  |
| `bride_name` | text |  |  |
| `groom_name` | text |  |  |
| `bride_phone` | text |  |  |
| `bride_height` | smallint |  |  |
| `bride_weight` | smallint |  |  |
| `bride_shoe_size` | smallint |  |  |
| `groom_phone` | text |  |  |
| `groom_height` | smallint |  |  |
| `groom_weight` | smallint |  |  |
| `groom_shoe_size` | smallint |  |  |

**Trỏ ra:** `lead_id` → `crm_leads.id`

**Bị trỏ tới bởi:** `payments.customer_id` · `contracts.customer_id` · `dress_reservations.customer_id`

**Trigger:** `emit_realtime_signal` → `emit_realtime_signal()` · `update_customers_updated_at` → `update_updated_at_column()`

<details><summary>18 index</summary>

- `UNIQUE btree (id)`
- `UNIQUE btree (customer_code)`
- `btree (customer_code)`
- `btree (phone)`
- `btree (full_name)`
- `gin (tags)`
- `gin (full_name gin_trgm_ops) WHERE (deleted_at IS NULL)`
- `gin (full_name gin_trgm_ops)`
- `btree (lead_id)`
- `gin (phone gin_trgm_ops) WHERE (deleted_at IS NULL)`
- `gin (email gin_trgm_ops) WHERE (deleted_at IS NULL)`
- `gin (customer_code gin_trgm_ops) WHERE (deleted_at IS NULL)`
- `btree (source, created_at DESC) WHERE (deleted_at IS NULL)`
- `gin (customer_code gin_trgm_ops) WHERE (deleted_at IS NULL)`
- `gin (phone gin_trgm_ops) WHERE (deleted_at IS NULL)`
- `gin (bride_name gin_trgm_ops) WHERE (deleted_at IS NULL)`
- `gin (groom_name gin_trgm_ops) WHERE (deleted_at IS NULL)`
- `btree (phone) WHERE (deleted_at IS NULL)`

</details>

## `crm_leads`

4 dòng · RLS bật · 4 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `contact_date` | date | NOT NULL | `CURRENT_DATE` |
| `phone` | text |  |  |
| `contact_name` | text |  |  |
| `source` | text |  |  |
| `needs` | text |  |  |
| `address` | text |  |  |
| `email` | text |  |  |
| `assigned_to` | uuid |  |  |
| `potential` | lead_potential_enum |  |  |
| `status` | lead_status_enum |  | `'moi'` |
| `notes` | text |  |  |
| `care_history` | text |  |  |
| `social_link` | text |  |  |
| `care_type` | text |  |  |
| `next_contact_date` | date |  |  |
| `created_by` | uuid |  |  |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |
| `deal_value` | numeric |  | `0` |
| `tags` | text[] |  | `'{}'` |
| `score` | int |  | `0` |
| `pipeline_order` | int |  | `0` |
| `status_changed_at` | timestamptz |  |  |
| `lost_reason` | text |  |  |
| `deleted_at` | timestamptz |  |  |

**Trỏ ra:** `created_by` → `employees.id` (ON DELETE SET NULL) · `assigned_to` → `employees.id` (ON DELETE SET NULL)

**Bị trỏ tới bởi:** `customers.lead_id`

**Trigger:** `emit_realtime_signal` → `emit_realtime_signal()` · `update_crm_leads_updated_at` → `update_updated_at_column()`

<details><summary>15 index</summary>

- `btree (deleted_at) WHERE (deleted_at IS NULL)`
- `UNIQUE btree (id)`
- `btree (phone)`
- `btree (assigned_to)`
- `btree (status)`
- `btree (score)`
- `btree (created_at DESC) WHERE (deleted_at IS NULL)`
- `btree (status, created_at DESC) WHERE (deleted_at IS NULL)`
- `btree (source, created_at DESC) WHERE (deleted_at IS NULL)`
- `btree (assigned_to, status) WHERE (deleted_at IS NULL)`
- `btree (next_contact_date) WHERE ((deleted_at IS NULL) AND (next_contact_date IS NOT NULL))`
- `gin (contact_name gin_trgm_ops) WHERE (deleted_at IS NULL)`
- `gin (phone gin_trgm_ops) WHERE (deleted_at IS NULL)`
- `btree (assigned_to, created_at DESC) WHERE (deleted_at IS NULL)`
- `btree (phone) WHERE (deleted_at IS NULL)`

</details>
