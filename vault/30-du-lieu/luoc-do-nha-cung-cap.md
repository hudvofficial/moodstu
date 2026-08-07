---
title: "Lược đồ DB — Nhà cung cấp"
tags: [du-lieu, schema, nha-cung-cap]
sinh-tu: "introspect DB thật (pooler) — regenerate bằng scripts/vault-gen-schema.mjs"
cap-nhat: 2026-08-07
---

# Lược đồ DB — Nhà cung cấp

> Sinh tự động từ **DB production thật** (không phải từ `types/database.types.ts`). Sau mỗi migration nhớ chạy cả `npm run db:types` — xem [[canh-bao-schema]].

Module liên quan: [[nha-cung-cap]]

| Bảng | Số dòng | RLS | Policy |
|---|---:|---|---:|
| `vendors` | 8 | ✅ | 3 |
| `vendor_payments` | 1 | ✅ | 3 |
| `vendor_payment_allocations` | 1 | ✅ | 2 |

## `vendors`

8 dòng · RLS bật · 3 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `full_name` | text | NOT NULL |  |
| `phone` | text |  |  |
| `service_type` | text |  |  |
| `status` | text |  | `'active'` |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |
| `deleted_at` | timestamptz |  |  |

**Bị trỏ tới bởi:** `work_tasks.vendor_id` · `vendor_payments.vendor_id`

<details><summary>3 index</summary>

- `UNIQUE btree (id)`
- `UNIQUE btree (regexp_replace(phone, '[^0-9]'::text, ''::text, 'g'::text)) WHERE ((deleted_at IS NULL) AND (status = 'active'::text) AND (phone IS NOT NULL) AND (regexp_replace(phone, '[^0-9]'::text, ''::text, 'g'::text) <> ''::text))`
- `btree (lower(TRIM(BOTH FROM full_name))) WHERE ((deleted_at IS NULL) AND (status = 'active'::text))`

</details>

## `vendor_payments`

1 dòng · RLS bật · 3 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `vendor_id` | uuid | NOT NULL |  |
| `amount` | numeric | NOT NULL |  |
| `payment_method` | text |  | `'chuyen_khoan'` |
| `payment_date` | date | NOT NULL | `CURRENT_DATE` |
| `note` | text |  |  |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `updated_at` | timestamptz | NOT NULL | `now()` |
| `created_by` | uuid |  |  |
| `deleted_at` | timestamptz |  |  |

**Trỏ ra:** `vendor_id` → `vendors.id`

**Bị trỏ tới bởi:** `vendor_payment_allocations.payment_id`

**Trigger:** `emit_realtime_signal` → `emit_realtime_signal()` · `trigger_vendor_payments_updated_at` → `update_vendor_payments_updated_at()`

**CHECK:** `CHECK ((amount > (0)))`

<details><summary>5 index</summary>

- `UNIQUE btree (id)`
- `btree (vendor_id) WHERE (deleted_at IS NULL)`
- `btree (payment_date DESC) WHERE (deleted_at IS NULL)`
- `btree (created_by)`
- `btree (vendor_id, payment_date DESC) WHERE (deleted_at IS NULL)`

</details>

## `vendor_payment_allocations`

1 dòng · RLS bật · 2 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `payment_id` | uuid | NOT NULL |  |
| `work_task_id` | uuid | NOT NULL |  |
| `amount` | numeric | NOT NULL |  |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `created_by` | uuid |  |  |

**Trỏ ra:** `work_task_id` → `work_tasks.id` · `payment_id` → `vendor_payments.id` (ON DELETE CASCADE)

**CHECK:** `CHECK ((amount > (0)))`

<details><summary>5 index</summary>

- `UNIQUE btree (id)`
- `UNIQUE btree (payment_id, work_task_id)`
- `btree (work_task_id)`
- `btree (payment_id)`
- `btree (work_task_id)`

</details>
