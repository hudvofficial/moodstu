---
title: "Lược đồ DB — Nhân sự & công việc"
tags: [du-lieu, schema, nhan-su]
sinh-tu: "introspect DB thật (pooler) — regenerate bằng scripts/vault-gen-schema.mjs"
cap-nhat: 2026-08-07
---

# Lược đồ DB — Nhân sự & công việc

> Sinh tự động từ **DB production thật** (không phải từ `types/database.types.ts`). Sau mỗi migration nhớ chạy cả `npm run db:types` — xem [[canh-bao-schema]].

Module liên quan: [[nhan-su]]

| Bảng | Số dòng | RLS | Policy |
|---|---:|---|---:|
| `employees` | 13 | ✅ | 4 |
| `employee_salaries` | 2 | ✅ | 4 |
| `monthly_salaries` | 2 | ✅ | 4 |
| `salary_adjustments` | 0 | ✅ | 0 |
| `attendance` | 0 | ✅ | 4 |
| `work_shifts` | 0 | ✅ | 4 |
| `work_tasks` | 166 | ✅ | 6 |
| `schedules` | 2 | ✅ | 4 |
| `evaluations` | 0 | ✅ | 4 |
| `requests` | 0 | ✅ | 4 |

## `employees`

13 dòng · RLS bật · 4 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `auth_user_id` | uuid |  |  |
| `employee_code` | text | NOT NULL |  |
| `full_name` | text | NOT NULL |  |
| `gender` | gender_enum |  |  |
| `avatar_url` | text |  |  |
| `phone` | text |  |  |
| `email` | text |  |  |
| `department` | text |  |  |
| `position` | text |  |  |
| `role` | employee_role_enum | NOT NULL | `'sale'` |
| `status` | text |  | `'active'` |
| `salary_info` | jsonb |  | `'{}'` |
| `start_date` | date |  |  |
| `deleted_at` | timestamptz |  |  |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |
| `notes` | text |  |  |

**Bị trỏ tới bởi:** `push_subscriptions.employee_id` · `crm_leads.created_by` · `crm_leads.assigned_to` · `notification_preferences.employee_id` · `notification_queue.employee_id` · `work_tasks.assigned_to` · `equipment.current_holder` · `audit_logs.employee_id` · `evaluations.employee_id` · `requests.approver_id` · `requests.requester_id` · `attendance.employee_id` · `employee_salaries.employee_id` · `notifications.employee_id` · `schedules.employee_id`

**Trigger:** `emit_realtime_signal` → `emit_realtime_signal()` · `update_employees_updated_at` → `update_updated_at_column()`

<details><summary>20 index</summary>

- `UNIQUE btree (id)`
- `UNIQUE btree (auth_user_id)`
- `UNIQUE btree (employee_code)`
- `UNIQUE btree (auth_user_id) WHERE (auth_user_id IS NOT NULL)`
- `btree (employee_code)`
- `btree (created_at DESC) WHERE (deleted_at IS NULL)`
- `btree (department) WHERE (deleted_at IS NULL)`
- `btree (role) WHERE (deleted_at IS NULL)`
- `btree (status) WHERE (deleted_at IS NULL)`
- `gin (full_name gin_trgm_ops) WHERE (deleted_at IS NULL)`
- `btree (full_name) WHERE (deleted_at IS NULL)`
- `gin (employee_code gin_trgm_ops) WHERE (deleted_at IS NULL)`
- `btree (employee_code) WHERE (deleted_at IS NULL)`
- `gin (phone gin_trgm_ops) WHERE (deleted_at IS NULL)`
- `gin (email gin_trgm_ops) WHERE (deleted_at IS NULL)`
- `btree (status) WHERE (deleted_at IS NULL)`
- `btree (auth_user_id) WHERE (auth_user_id IS NOT NULL)`
- `btree (updated_at DESC) WHERE (deleted_at IS NULL)`
- `UNIQUE btree (auth_user_id) WHERE (auth_user_id IS NOT NULL)`
- `btree (auth_user_id) WHERE ((auth_user_id IS NOT NULL) AND (deleted_at IS NULL))`

</details>

## `employee_salaries`

2 dòng · RLS bật · 4 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `monthly_salary_id` | uuid |  |  |
| `year` | int | NOT NULL |  |
| `month` | int | NOT NULL |  |
| `employee_id` | uuid | NOT NULL |  |
| `base_salary` | numeric |  | `0` |
| `attendance_days` | int |  | `0` |
| `additional_days` | int |  | `0` |
| `total_work_days` | int |  | `0` |
| `total_work_hours` | numeric |  | `0` |
| `monthly_salary` | numeric |  | `0` |
| `product_salary` | numeric |  | `0` |
| `bonus` | numeric |  | `0` |
| `penalty` | numeric |  | `0` |
| `total_salary` | numeric |  | `0` |
| `advance_payment` | numeric |  | `0` |
| `net_salary` | numeric |  | `0` |
| `paid_amount` | numeric |  | `0` |
| `remaining_amount` | numeric |  | `0` |
| `kpi_target` | numeric |  | `0` |
| `kpi_achieved` | numeric |  | `0` |
| `kpi_percentage` | numeric |  | `0` |
| `notes` | text |  |  |
| `created_by` | uuid |  |  |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |

**Trỏ ra:** `employee_id` → `employees.id` · `monthly_salary_id` → `monthly_salaries.id` (ON DELETE CASCADE)

**Bị trỏ tới bởi:** `salary_adjustments.employee_salary_id` · `evaluations.employee_salary_id`

**Trigger:** `audit_employee_salaries` → `log_audit_action()` · `update_employee_salaries_updated_at` → `update_updated_at_column()`

**CHECK:** `CHECK (((month >= 1) AND (month <= 12)))`

<details><summary>4 index</summary>

- `UNIQUE btree (id)`
- `btree (monthly_salary_id)`
- `btree (employee_id)`
- `btree (year, month)`

</details>

## `monthly_salaries`

2 dòng · RLS bật · 4 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `salary_code` | text | NOT NULL |  |
| `year` | int | NOT NULL |  |
| `month` | int | NOT NULL |  |
| `total_employees` | int |  | `0` |
| `base_salary_total` | numeric |  | `0` |
| `product_salary_total` | numeric |  | `0` |
| `bonus_total` | numeric |  | `0` |
| `penalty_total` | numeric |  | `0` |
| `advance_total` | numeric |  | `0` |
| `total_salary` | numeric |  | `0` |
| `created_by` | uuid |  |  |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |

**Bị trỏ tới bởi:** `evaluations.monthly_salary_id` · `employee_salaries.monthly_salary_id`

**Trigger:** `emit_realtime_signal` → `emit_realtime_signal()` · `update_monthly_salaries_updated_at` → `update_updated_at_column()`

**CHECK:** `CHECK (((month >= 1) AND (month <= 12)))`

<details><summary>4 index</summary>

- `UNIQUE btree (salary_code)`
- `UNIQUE btree (id)`
- `UNIQUE btree (year, month)`
- `btree (year, month)`

</details>

## `salary_adjustments`

0 dòng · RLS bật · 0 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `employee_salary_id` | uuid | NOT NULL |  |
| `type` | text | NOT NULL |  |
| `amount` | numeric | NOT NULL |  |
| `reason` | text | NOT NULL |  |
| `date` | date | NOT NULL | `CURRENT_DATE` |
| `created_by` | uuid |  |  |
| `created_at` | timestamptz | NOT NULL | `now()` |

**Trỏ ra:** `employee_salary_id` → `employee_salaries.id` (ON DELETE CASCADE)

**CHECK:** `CHECK ((amount > (0)))` · `CHECK (((type)= ANY ((ARRAY['bonus', 'penalty']))))`

<details><summary>2 index</summary>

- `UNIQUE btree (id)`
- `btree (employee_salary_id)`

</details>

## `attendance`

0 dòng · RLS bật · 4 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `attendance_code` | text |  |  |
| `attendance_date` | date | NOT NULL |  |
| `work_shift_id` | uuid |  |  |
| `employee_id` | uuid | NOT NULL |  |
| `check_in_time` | time |  |  |
| `check_in_image_url` | text |  |  |
| `check_in_location` | text |  |  |
| `check_out_time` | time |  |  |
| `check_out_image_url` | text |  |  |
| `check_out_location` | text |  |  |
| `total_hours` | numeric |  | `0` |
| `work_days` | numeric |  | `0` |
| `is_absent` | bool |  | `false` |
| `work_status` | text |  |  |
| `notes` | text |  |  |
| `salary_id` | uuid |  |  |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |

**Trỏ ra:** `employee_id` → `employees.id` · `work_shift_id` → `work_shifts.id`

**Trigger:** `update_attendance_updated_at` → `update_updated_at_column()`

<details><summary>4 index</summary>

- `UNIQUE btree (id)`
- `UNIQUE btree (attendance_code)`
- `btree (employee_id)`
- `btree (attendance_date)`

</details>

## `work_shifts`

0 dòng · RLS bật · 4 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `shift_name` | text | NOT NULL |  |
| `start_time` | time | NOT NULL |  |
| `end_time` | time | NOT NULL |  |
| `lunch_break_hours` | int |  | `0` |
| `total_hours` | int | NOT NULL |  |
| `standard_hours` | int | NOT NULL |  |
| `description` | text |  |  |
| `created_at` | timestamptz |  | `now()` |
| `created_by` | uuid |  |  |

**Bị trỏ tới bởi:** `attendance.work_shift_id`

<details><summary>1 index</summary>

- `UNIQUE btree (id)`

</details>

## `work_tasks`

166 dòng · RLS bật · 6 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `contract_id` | uuid | NOT NULL |  |
| `event_id` | uuid |  |  |
| `work_type` | work_type_enum | NOT NULL |  |
| `assigned_to` | uuid |  |  |
| `status` | text |  | `'chua_lam'` |
| `deadline` | timestamptz |  |  |
| `start_date` | timestamptz |  |  |
| `completion_date` | timestamptz |  |  |
| `cost` | numeric |  | `0` |
| `notes` | text |  |  |
| `created_by` | uuid |  |  |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |
| `start_time` | text |  |  |
| `end_time` | text |  |  |
| `vendor_id` | uuid |  |  |

**Trỏ ra:** `vendor_id` → `vendors.id` · `assigned_to` → `employees.id` · `event_id` → `contract_events.id` · `contract_id` → `contracts.id`

**Bị trỏ tới bởi:** `expenses.work_task_id`

**Trigger:** `emit_realtime_signal` → `emit_realtime_signal()` · `update_work_tasks_updated_at` → `update_updated_at_column()`

**CHECK:** `CHECK ((((assigned_to IS NULL) AND (vendor_id IS NULL)) OR ((assigned_to IS NOT NULL) AND (vendor_id IS NULL)) OR ((assigned_to IS NULL) AND (vendor_id IS NOT NULL))))`

<details><summary>17 index</summary>

- `btree (event_id)`
- `UNIQUE btree (id)`
- `btree (contract_id)`
- `btree (contract_id)`
- `btree (contract_id, deadline)`
- `btree (assigned_to, status)`
- `btree (deadline) WHERE ((status)::text <> 'hoan_thanh'::text)`
- `btree (assigned_to, deadline) WHERE ((assigned_to IS NOT NULL) AND (deadline IS NOT NULL))`
- `btree (assigned_to, start_date) WHERE ((assigned_to IS NOT NULL) AND (deadline IS NULL) AND (start_date IS NOT NULL))`
- `btree (assigned_to, status, deadline) WHERE (assigned_to IS NOT NULL)`
- `btree (status, deadline)`
- `btree (vendor_id)`
- `btree (deadline) WHERE (deadline IS NOT NULL)`
- `btree (start_date) WHERE ((deadline IS NULL) AND (start_date IS NOT NULL))`
- `btree (vendor_id, status, deadline) WHERE (vendor_id IS NOT NULL)`
- `btree (contract_id, status, deadline)`
- `btree (contract_id)`

</details>

## `schedules`

2 dòng · RLS bật · 4 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `contract_id` | uuid |  |  |
| `employee_id` | uuid | NOT NULL |  |
| `event_date` | timestamptz | NOT NULL |  |
| `end_date` | timestamptz |  |  |
| `location` | text |  |  |
| `role_in_event` | work_type_enum |  |  |
| `notes` | text |  |  |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |
| `event_type` | text |  |  |
| `status` | text |  | `'moi'` |
| `google_event_id` | text |  |  |
| `color_id` | text |  |  |
| `created_by` | uuid |  |  |

**Trỏ ra:** `employee_id` → `employees.id` · `contract_id` → `contracts.id`

**Trigger:** `emit_realtime_signal` → `emit_realtime_signal()` · `update_schedules_updated_at` → `update_updated_at_column()`

<details><summary>7 index</summary>

- `UNIQUE btree (id)`
- `btree (employee_id)`
- `btree (event_date)`
- `btree (contract_id)`
- `btree (google_event_id) WHERE (google_event_id IS NOT NULL)`
- `btree (event_date)`
- `btree (employee_id, event_date)`

</details>

## `evaluations`

0 dòng · RLS bật · 4 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `employee_salary_id` | uuid |  |  |
| `monthly_salary_id` | uuid |  |  |
| `evaluation_date` | date | NOT NULL | `CURRENT_DATE` |
| `employee_id` | uuid | NOT NULL |  |
| `evaluation_type` | text | NOT NULL |  |
| `description` | text |  |  |
| `level` | text |  |  |
| `times` | int |  | `1` |
| `amount` | numeric |  | `0` |
| `notes` | text |  |  |
| `created_at` | timestamptz |  | `now()` |
| `created_by` | uuid |  |  |

**Trỏ ra:** `employee_id` → `employees.id` · `monthly_salary_id` → `monthly_salaries.id` · `employee_salary_id` → `employee_salaries.id`

<details><summary>2 index</summary>

- `UNIQUE btree (id)`
- `btree (employee_id)`

</details>

## `requests`

0 dòng · RLS bật · 4 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `request_date` | date | NOT NULL | `CURRENT_DATE` |
| `request_type` | text | NOT NULL |  |
| `leave_type` | text |  |  |
| `reason` | text |  |  |
| `amount` | numeric |  | `0` |
| `image_url` | text |  |  |
| `notes` | text |  |  |
| `message` | text |  |  |
| `requester_id` | uuid | NOT NULL |  |
| `approver_id` | uuid |  |  |
| `approval_date` | date |  |  |
| `status` | text |  | `'cho_duyet'` |
| `created_at` | timestamptz |  | `now()` |
| `created_by` | uuid |  |  |

**Trỏ ra:** `approver_id` → `employees.id` · `requester_id` → `employees.id`

<details><summary>3 index</summary>

- `UNIQUE btree (id)`
- `btree (requester_id)`
- `btree (status)`

</details>
