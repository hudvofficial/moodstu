---
title: "Lược đồ DB — Hệ thống & hạ tầng"
tags: [du-lieu, schema, he-thong]
sinh-tu: "introspect DB thật (pooler) — regenerate bằng scripts/vault-gen-schema.mjs"
cap-nhat: 2026-08-07
---

# Lược đồ DB — Hệ thống & hạ tầng

> Sinh tự động từ **DB production thật** (không phải từ `types/database.types.ts`). Sau mỗi migration nhớ chạy cả `npm run db:types` — xem [[canh-bao-schema]].

Module liên quan: [[he-thong]]

| Bảng | Số dòng | RLS | Policy |
|---|---:|---|---:|
| `audit_logs` | 13477 | ✅ | 2 |
| `system_settings` | 23 | ✅ | 0 |
| `studio_info` | 1 | ✅ | 4 |
| `notifications` | 0 | ✅ | 4 |
| `notification_preferences` | 1 | ✅ | 1 |
| `notification_queue` | 0 | ✅ | 1 |
| `push_subscriptions` | 0 | ✅ | 4 |
| `login_attempts` | 2 | ✅ | 4 |
| `realtime_signals` | 149 | ✅ | 1 |
| `google_sync_queue` | 0 | ✅ | 1 |
| `integrity_reports` | 1 | ✅ | 1 |

## `audit_logs`

13477 dòng · RLS bật · 2 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `employee_id` | uuid |  |  |
| `action` | text | NOT NULL |  |
| `table_name` | text |  |  |
| `record_id` | text |  |  |
| `old_data` | jsonb |  |  |
| `new_data` | jsonb |  |  |
| `ip_address` | text |  |  |
| `user_agent` | text |  |  |
| `created_at` | timestamptz |  | `now()` |
| `description` | text |  |  |
| `log_type` | log_type_enum | NOT NULL | `'GENERAL'` |
| `severity` | severity_enum | NOT NULL | `'INFO'` |
| `source` | log_source_enum | NOT NULL | `'system'` |
| `performed_by` | uuid |  |  |

**Trỏ ra:** `employee_id` → `employees.id`

<details><summary>9 index</summary>

- `UNIQUE btree (id)`
- `btree (employee_id)`
- `btree (created_at)`
- `btree (severity)`
- `btree (performed_by)`
- `btree (table_name, record_id)`
- `btree (created_at DESC)`
- `btree (table_name)`
- `btree (table_name, record_id, created_at DESC)`

</details>

## `system_settings`

23 dòng · RLS bật · 0 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `key` | text | NOT NULL |  |
| `value` | text |  |  |
| `description` | text |  |  |
| `updated_at` | timestamptz | NOT NULL | `now()` |

**Trigger:** `emit_realtime_signal` → `emit_realtime_signal()`

<details><summary>2 index</summary>

- `UNIQUE btree (id)`
- `UNIQUE btree (key)`

</details>

## `studio_info`

1 dòng · RLS bật · 4 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `name` | text | NOT NULL |  |
| `address` | text |  |  |
| `hotline` | text |  |  |
| `representative` | text |  |  |
| `logo_url` | text |  |  |
| `bank_info` | jsonb |  | `'[]'` |
| `social_links` | jsonb |  | `'{}'` |
| `working_hours` | jsonb |  | `'{}'` |
| `timezone` | text |  | `'Asia/Ho_Chi_Minh'` |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |
| `google_oauth` | jsonb |  |  |

**Trigger:** `emit_realtime_signal` → `emit_realtime_signal()` · `update_studio_info_updated_at` → `update_updated_at_column()`

<details><summary>1 index</summary>

- `UNIQUE btree (id)`

</details>

## `notifications`

0 dòng · RLS bật · 4 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `employee_id` | uuid |  |  |
| `title` | text | NOT NULL |  |
| `content` | text | NOT NULL |  |
| `type` | text |  | `'system'` |
| `resource_type` | text |  |  |
| `resource_id` | uuid |  |  |
| `is_read` | bool |  | `false` |
| `created_at` | timestamptz |  | `now()` |

**Trỏ ra:** `employee_id` → `employees.id`

<details><summary>2 index</summary>

- `UNIQUE btree (id)`
- `btree (employee_id, is_read)`

</details>

## `notification_preferences`

1 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `employee_id` | uuid | NOT NULL |  |
| `onsite_reminder` | bool |  | `true` |
| `deadline_reminder` | bool |  | `true` |
| `overdue_alert` | bool |  | `true` |
| `task_assignment` | bool |  | `true` |
| `system_alerts` | bool |  | `true` |
| `updated_at` | timestamptz |  | `now()` |

**Trỏ ra:** `employee_id` → `employees.id` (ON DELETE CASCADE)

**Trigger:** `emit_realtime_signal` → `emit_realtime_signal()`

<details><summary>1 index</summary>

- `UNIQUE btree (employee_id)`

</details>

## `notification_queue`

0 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `employee_id` | uuid | NOT NULL |  |
| `type` | text |  | `'system'` |
| `title` | text | NOT NULL |  |
| `content` | text |  |  |
| `status` | text |  | `'pending'` |
| `read_at` | timestamptz |  |  |
| `resource_type` | text |  |  |
| `resource_id` | uuid |  |  |
| `created_at` | timestamptz |  | `now()` |

**Trỏ ra:** `employee_id` → `employees.id` (ON DELETE CASCADE)

<details><summary>3 index</summary>

- `UNIQUE btree (id)`
- `btree (employee_id)`
- `btree (employee_id) WHERE (read_at IS NULL)`

</details>

## `push_subscriptions`

0 dòng · RLS bật · 4 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `employee_id` | uuid | NOT NULL |  |
| `endpoint` | text | NOT NULL |  |
| `p256dh` | text | NOT NULL |  |
| `auth` | text | NOT NULL |  |
| `user_agent` | text |  |  |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `updated_at` | timestamptz | NOT NULL | `now()` |

**Trỏ ra:** `employee_id` → `employees.id` (ON DELETE CASCADE)

**Trigger:** `set_push_subscriptions_updated_at` → `update_updated_at_column()`

<details><summary>3 index</summary>

- `UNIQUE btree (id)`
- `UNIQUE btree (endpoint)`
- `btree (employee_id)`

</details>

## `login_attempts`

2 dòng · RLS bật · 4 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `email` | text | NOT NULL |  |
| `attempt_count` | int |  | `1` |
| `last_attempt` | timestamptz |  | `now()` |
| `locked_until` | timestamptz |  |  |
| `created_at` | timestamptz |  | `now()` |

<details><summary>2 index</summary>

- `UNIQUE btree (id)`
- `btree (email)`

</details>

## `realtime_signals`

149 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | bigint | NOT NULL |  |
| `table_name` | text | NOT NULL |  |
| `op` | text | NOT NULL |  |
| `changed_at` | timestamptz | NOT NULL | `now()` |

<details><summary>1 index</summary>

- `UNIQUE btree (id)`

</details>

## `google_sync_queue`

0 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `schedule_id` | uuid |  |  |
| `google_event_id` | text |  |  |
| `action` | text | NOT NULL |  |
| `payload` | jsonb |  |  |
| `status` | text | NOT NULL | `'pending'` |
| `attempts` | int | NOT NULL | `0` |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `updated_at` | timestamptz | NOT NULL | `now()` |
| `idempotency_key` | text |  |  |

**Trigger:** `emit_realtime_signal` → `emit_realtime_signal()`

<details><summary>4 index</summary>

- `UNIQUE btree (idempotency_key) WHERE (idempotency_key IS NOT NULL)`
- `UNIQUE btree (id)`
- `btree (status)`
- `btree (schedule_id)`

</details>

## `integrity_reports`

1 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `scan_date` | date |  | `CURRENT_DATE` |
| `status` | text |  | `'completed'` |
| `checks` | jsonb |  | `'[]'` |
| `total_issues` | int |  | `0` |
| `warning_count` | int |  | `0` |
| `info_count` | int |  | `0` |
| `created_at` | timestamptz |  | `now()` |

<details><summary>1 index</summary>

- `UNIQUE btree (id)`

</details>
