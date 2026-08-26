---
title: "Lược đồ DB — Hợp đồng"
tags: [du-lieu, schema, hop-dong]
sinh-tu: "introspect DB thật (pooler) — regenerate bằng scripts/vault-gen-schema.mjs"
cap-nhat: 2026-08-07
---

# Lược đồ DB — Hợp đồng

> Sinh tự động từ **DB production thật** (không phải từ `types/database.types.ts`). Sau mỗi migration nhớ chạy cả `npm run db:types` — xem [[canh-bao-schema]].

Module liên quan: [[hop-dong]]

| Bảng | Số dòng | RLS | Policy |
|---|---:|---|---:|
| `contracts` | 64 | ✅ | 6 |
| `contract_items` | 84 | ✅ | 4 |
| `contract_events` | 217 | ✅ | 6 |
| `contract_checklists` | 333 | ✅ | 6 |
| `contract_notes` | 2 | ✅ | 6 |
| `checklist_templates` | 62 | ✅ | 1 |
| `event_templates` | 11 | ✅ | 1 |
| `addon_history` | 2 | ✅ | 1 |
| `documents` | 0 | ✅ | 4 |
| `approval_requests` | 0 | ✅ | 3 |

## `contracts`

64 dòng · RLS bật · 6 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `contract_code` | text | NOT NULL |  |
| `transaction_type` | transaction_type_enum | NOT NULL | `'hop_dong'` |
| `customer_id` | uuid | NOT NULL |  |
| `service_type` | service_type_enum | NOT NULL |  |
| `status` | text | NOT NULL | `'cho_xu_ly'` |
| `payment_status` | text | NOT NULL | `'chua_thanh_toan'` |
| `contract_date` | date | NOT NULL | `CURRENT_DATE` |
| `work_date` | timestamptz |  |  |
| `delivery_date` | date |  |  |
| `total_amount` | numeric | NOT NULL | `0` |
| `discount_amount` | numeric |  | `0` |
| `paid_amount` | numeric |  | `0` |
| `remaining_amount` | numeric |  | `0` |
| `description` | text |  |  |
| `notes` | text |  |  |
| `created_by` | uuid |  |  |
| `assigned_to` | uuid |  |  |
| `updated_by` | uuid |  |  |
| `deleted_at` | timestamptz |  |  |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |
| `cancel_reason` | text |  |  |
| `cancelled_at` | timestamptz |  |  |
| `cancelled_by` | uuid |  |  |

**Trỏ ra:** `customer_id` → `customers.id`

**Bị trỏ tới bởi:** `payment_plan_allocations.contract_id` · `debts.contract_id` · `dress_rentals.contract_id` · `receipts.contract_id` · `inventory_transactions.contract_id` · `contract_checklists.contract_id` · `contract_notes.contract_id` · `printing_orders.contract_id` · `galleries.contract_id` · `gallery_selection_batches.contract_id` · `schedules.contract_id` · `work_tasks.contract_id` · `payment_plans.contract_id` · `payments.contract_id` · `dress_reservations.contract_id` · `contract_events.contract_id` · `contract_items.contract_id` · `expenses.contract_id`

**Trigger:** `audit_contracts` → `log_audit_action()` · `emit_realtime_signal` → `emit_realtime_signal()` · `trg_contract_payment_status_v2` → `trg_contract_payment_status_v2()` · `update_contracts_updated_at` → `update_updated_at_column()`

**CHECK:** `CHECK ((((contract_date IS NULL) OR (work_date IS NULL) OR (work_date >= contract_date)) AND ((work_date IS NULL) OR (delivery_date IS NULL) OR (delivery_date >= work_date)) AND ((contract_date IS NULL) OR (delivery_date IS NULL) OR (delivery_date >= contract_date)))) NOT VALID` · `CHECK ((discount_amount >= (0)))` · `CHECK ((paid_amount >= (0)))` · `CHECK ((total_amount >= (0)))`

<details><summary>29 index</summary>

- `btree (contract_date) WHERE (deleted_at IS NULL)`
- `btree (work_date) WHERE (deleted_at IS NULL)`
- `btree (status) WHERE (deleted_at IS NULL)`
- `btree (remaining_amount) WHERE (deleted_at IS NULL)`
- `btree (created_at DESC) WHERE (deleted_at IS NULL)`
- `btree (status, created_at DESC) WHERE (deleted_at IS NULL)`
- `btree (contract_date DESC, created_at DESC) WHERE (deleted_at IS NULL)`
- `btree (work_date) WHERE (deleted_at IS NULL)`
- `UNIQUE btree (id)`
- `UNIQUE btree (contract_code)`
- `btree (contract_code)`
- `btree (customer_id)`
- `btree (service_type)`
- `btree (contract_date)`
- `btree (contract_date DESC) WHERE ((deleted_at IS NULL) AND (remaining_amount > (0)::numeric))`
- `btree (total_amount DESC) WHERE (deleted_at IS NULL)`
- `gin (contract_code gin_trgm_ops) WHERE (deleted_at IS NULL)`
- `btree (status)`
- `btree (status, created_at DESC) WHERE (deleted_at IS NULL)`
- `btree (status) WHERE (((status)::text <> 'hoan_thanh'::text) AND (deleted_at IS NULL))`
- `btree (customer_id, created_at DESC) WHERE (deleted_at IS NULL)`
- `btree (assigned_to, work_date) WHERE ((deleted_at IS NULL) AND (assigned_to IS NOT NULL))`
- `btree (payment_status, contract_date DESC) WHERE (deleted_at IS NULL)`
- `btree (service_type, contract_date DESC) WHERE (deleted_at IS NULL)`
- `btree (customer_id) WHERE (deleted_at IS NULL)`
- `btree (status, contract_date DESC) WHERE (deleted_at IS NULL)`
- `btree (payment_status, contract_date DESC) WHERE (deleted_at IS NULL)`
- `btree (customer_id) INCLUDE (total_amount) WHERE (deleted_at IS NULL)`
- `btree (status, contract_date DESC) WHERE (deleted_at IS NULL)`

</details>

## `contract_items`

84 dòng · RLS bật · 4 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `contract_id` | uuid | NOT NULL |  |
| `type` | item_type_enum | NOT NULL | `'dich_vu'` |
| `is_addon` | bool |  | `false` |
| `addon_category` | addon_category_enum |  |  |
| `service_id` | uuid |  |  |
| `item_name` | text | NOT NULL |  |
| `export_type` | export_type_enum |  |  |
| `quantity` | int |  | `1` |
| `unit_price` | numeric |  | `0` |
| `original_price` | numeric |  |  |
| `discount_amount` | numeric |  | `0` |
| `total_amount` | numeric |  | `0` |
| `dress_id` | uuid |  |  |
| `notes` | text |  |  |
| `added_by` | uuid |  |  |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |
| `deleted_at` | timestamptz |  |  |

**Trỏ ra:** `dress_id` → `dresses.id` · `service_id` → `services.id` · `contract_id` → `contracts.id` (ON DELETE CASCADE)

**Bị trỏ tới bởi:** `payments.contract_adjustment_item_id` · `dress_reservations.contract_item_id`

**Trigger:** `update_contract_items_updated_at` → `update_updated_at_column()`

**CHECK:** `CHECK ((discount_amount >= (0)))` · `CHECK ((quantity > 0))` · `CHECK ((total_amount >= (0)))` · `CHECK ((unit_price >= (0)))`

<details><summary>6 index</summary>

- `UNIQUE btree (id)`
- `btree (contract_id)`
- `btree (contract_id) WHERE (is_addon = true)`
- `btree (contract_id) WHERE (deleted_at IS NULL)`
- `btree (contract_id) WHERE (deleted_at IS NULL)`
- `btree (contract_id)`

</details>

## `contract_events`

217 dòng · RLS bật · 6 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `contract_id` | uuid | NOT NULL |  |
| `event_type` | event_type_enum | NOT NULL |  |
| `title` | text |  |  |
| `event_date` | timestamptz |  |  |
| `end_date` | timestamptz |  |  |
| `location` | text |  |  |
| `status` | text |  | `'chua_lam'` |
| `notes` | text |  |  |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |
| `phase` | text |  | `'pre_wedding'` |
| `sort_order` | int |  | `0` |
| `deadline` | timestamptz |  |  |
| `start_time` | time |  |  |
| `end_time` | time |  |  |
| `is_manual_date` | bool |  | `false` |
| `deleted_at` | timestamptz |  |  |
| `google_event_id` | text |  |  |
| `google_sync_status` | text | NOT NULL | `'not_required'` |
| `google_sync_error` | text |  |  |
| `google_synced_at` | timestamptz |  |  |
| `sync_to_google` | bool | NOT NULL | `true` |

**Trỏ ra:** `contract_id` → `contracts.id` (ON DELETE CASCADE)

**Bị trỏ tới bởi:** `work_tasks.event_id`

**Trigger:** `emit_realtime_signal` → `emit_realtime_signal()` · `update_contract_events_updated_at` → `update_updated_at_column()`

**CHECK:** `CHECK ((google_sync_status = ANY (ARRAY['not_required', 'pending', 'synced', 'failed', 'deleted', 'not_connected'])))`

<details><summary>9 index</summary>

- `UNIQUE btree (id)`
- `btree (contract_id)`
- `btree (event_date)`
- `btree (contract_id, sort_order)`
- `btree (contract_id) WHERE (deleted_at IS NULL)`
- `btree (contract_id, event_date) WHERE (deleted_at IS NULL)`
- `btree (google_event_id) WHERE (google_event_id IS NOT NULL)`
- `btree (contract_id, google_sync_status) WHERE (deleted_at IS NULL)`
- `btree (contract_id, sort_order) WHERE (deleted_at IS NULL)`

</details>

## `contract_checklists`

333 dòng · RLS bật · 6 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `contract_id` | uuid | NOT NULL |  |
| `event_stage` | text |  | `''` |
| `category` | text | NOT NULL |  |
| `item_name` | text | NOT NULL |  |
| `is_completed` | bool |  | `false` |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |

**Trỏ ra:** `contract_id` → `contracts.id` (ON DELETE CASCADE)

**Trigger:** `emit_realtime_signal` → `emit_realtime_signal()` · `trg_update_contract_checklists_updated_at` → `update_contract_checklists_updated_at()`

<details><summary>6 index</summary>

- `UNIQUE btree (id)`
- `btree (contract_id)`
- `btree (category)`
- `btree (event_stage)`
- `btree (contract_id, created_at)`
- `btree (contract_id, is_completed)`

</details>

## `contract_notes`

2 dòng · RLS bật · 6 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `contract_id` | uuid | NOT NULL |  |
| `content` | text | NOT NULL |  |
| `created_by` | uuid |  |  |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |

**Trỏ ra:** `contract_id` → `contracts.id` (ON DELETE CASCADE)

**Trigger:** `emit_realtime_signal` → `emit_realtime_signal()`

<details><summary>3 index</summary>

- `UNIQUE btree (id)`
- `btree (contract_id)`
- `btree (contract_id, created_at DESC)`

</details>

## `checklist_templates`

62 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `service_type` | text | NOT NULL |  |
| `event_stage` | text | NOT NULL |  |
| `category` | text | NOT NULL |  |
| `item_name` | text | NOT NULL |  |
| `sort_order` | int |  | `0` |
| `is_active` | bool |  | `true` |
| `created_at` | timestamptz |  | `now()` |

<details><summary>3 index</summary>

- `UNIQUE btree (id)`
- `btree (service_type)`
- `UNIQUE btree (service_type, event_stage, category, item_name)`

</details>

## `event_templates`

11 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `service_type` | service_type_enum | NOT NULL |  |
| `event_type` | event_type_enum | NOT NULL |  |
| `event_name` | text | NOT NULL |  |
| `default_days_offset` | int |  | `0` |
| `sort_order` | int |  | `0` |
| `is_active` | bool |  | `true` |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |

<details><summary>3 index</summary>

- `UNIQUE btree (id)`
- `UNIQUE btree (service_type, sort_order)`
- `btree (service_type, is_active, sort_order)`

</details>

## `addon_history`

2 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `addon_name` | text | NOT NULL |  |
| `addon_category` | addon_category_enum |  |  |
| `last_price` | numeric |  | `0` |
| `usage_count` | int |  | `1` |
| `last_used_at` | timestamptz |  | `now()` |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |

<details><summary>2 index</summary>

- `UNIQUE btree (id)`
- `UNIQUE btree (addon_name, addon_category)`

</details>

## `documents`

0 dòng · RLS bật · 4 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `document_code` | text | NOT NULL |  |
| `document_type` | text | NOT NULL |  |
| `name` | text | NOT NULL |  |
| `department` | text |  |  |
| `description` | text |  |  |
| `file_url` | text |  |  |
| `penalty_amount` | numeric |  | `0` |
| `version` | int |  | `1` |
| `status` | text |  | `'active'` |
| `created_by` | uuid |  |  |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |

**Trigger:** `update_documents_updated_at` → `update_updated_at_column()`

<details><summary>2 index</summary>

- `UNIQUE btree (id)`
- `UNIQUE btree (document_code)`

</details>

## `approval_requests`

0 dòng · RLS bật · 3 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `module` | text | NOT NULL |  |
| `action_type` | text | NOT NULL |  |
| `target_id` | uuid | NOT NULL |  |
| `payload` | jsonb |  |  |
| `reason` | text | NOT NULL |  |
| `status` | approval_status_enum | NOT NULL | `'pending'` |
| `requested_by` | uuid | NOT NULL |  |
| `reviewed_by` | uuid |  |  |
| `review_notes` | text |  |  |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `updated_at` | timestamptz | NOT NULL | `now()` |

**Trigger:** `emit_realtime_signal` → `emit_realtime_signal()`

<details><summary>3 index</summary>

- `UNIQUE btree (id)`
- `btree (status)`
- `btree (module)`

</details>
