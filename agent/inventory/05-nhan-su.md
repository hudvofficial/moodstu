---
title: "Kiểm kê — Nhân sự & lương"
lat-cat: 05-nhan-su
cap-nhat: 2026-09-01
trang-thai: sinh-tu-dong
nguon: pg_class · pg_proc · pg_policies · pg_trigger · pg_constraint · quét mã nguồn
---

> ⚙️ **Sinh bởi `scripts/vault-gen-kiem-ke.mjs` từ database production. ĐỪNG sửa tay.**
> Cột *vận hành thực tế* ở đây là dữ kiện đo được (ai ghi, ai đọc, còn sống hay không).
> Phần diễn giải *thiết kế ban đầu ↔ thực tế lệch nhau chỗ nào* nằm ở [[00-lech-thiet-ke]].

# Kiểm kê — Nhân sự & lương

10 bảng · 7 hàm DB

## Bảng dữ liệu

### `approval_requests`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 3

**Policy:** Allow authenticated users to insert approval_requests:INSERT, Allow authenticated users to read approval_requests:SELECT, Allow authenticated users to update approval_requests:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `module` | text | không | — |
| `action_type` | text | không | — |
| `target_id` | uuid | không | — |
| `payload` | jsonb | có | — |
| `reason` | text | không | — |
| `status` | USER-DEFINED | không | `'pending'::approval_status_enum` |
| `requested_by` | uuid | không | — |
| `reviewed_by` | uuid | có | — |
| `review_notes` | text | có | — |
| `created_at` | timestamp with time zone | không | `now()` |
| `updated_at` | timestamp with time zone | không | `now()` |

**Trỏ ra:** `requested_by`→`auth.users` · `reviewed_by`→`auth.users`

**Trigger:** `emit_realtime_signal`→emit_realtime_signal()

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (3):** `app/actions/inventory-mutations.ts` · `app/actions/inventory-queries.ts` · `scripts/test/test-approval.ts`


### `attendance`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 4

**Policy:** attendance_delete:DELETE, attendance_insert:INSERT, attendance_select:SELECT, attendance_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `attendance_code` | character varying | có | — |
| `attendance_date` | date | không | — |
| `work_shift_id` | uuid | có | — |
| `employee_id` | uuid | không | — |
| `check_in_time` | time without time zone | có | — |
| `check_in_image_url` | text | có | — |
| `check_in_location` | character varying | có | — |
| `check_out_time` | time without time zone | có | — |
| `check_out_image_url` | text | có | — |
| `check_out_location` | character varying | có | — |
| `total_hours` | numeric | có | `0` |
| `work_days` | numeric | có | `0` |
| `is_absent` | boolean | có | `false` |
| `work_status` | character varying | có | — |
| `notes` | text | có | — |
| `salary_id` | uuid | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |

**Trỏ ra:** `work_shift_id`→`work_shifts` · `employee_id`→`employees`

**Trigger:** `update_attendance_updated_at`→update_updated_at_column()

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (0):** — **không file nào truy vấn trực tiếp**

> 🔴 **Không đường ghi nào tìm thấy** — bảng này có thể đã chết hoặc chỉ nhận dữ liệu từ ngoài hệ thống.


### `employee_salaries`

**Số dòng (ước):** 2 · **RLS:** bật · **Policy:** 4

**Policy:** employee_salaries_delete:DELETE, employee_salaries_insert:INSERT, employee_salaries_select:SELECT, employee_salaries_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `monthly_salary_id` | uuid | có | — |
| `year` | integer | không | — |
| `month` | integer | không | — |
| `employee_id` | uuid | không | — |
| `base_salary` | numeric | có | `0` |
| `attendance_days` | integer | có | `0` |
| `additional_days` | integer | có | `0` |
| `total_work_days` | integer | có | `0` |
| `total_work_hours` | numeric | có | `0` |
| `monthly_salary` | numeric | có | `0` |
| `product_salary` | numeric | có | `0` |
| `bonus` | numeric | có | `0` |
| `penalty` | numeric | có | `0` |
| `total_salary` | numeric | có | `0` |
| `advance_payment` | numeric | có | `0` |
| `net_salary` | numeric | có | `0` |
| `paid_amount` | numeric | có | `0` |
| `remaining_amount` | numeric | có | `0` |
| `kpi_target` | numeric | có | `0` |
| `kpi_achieved` | numeric | có | `0` |
| `kpi_percentage` | numeric | có | `0` |
| `notes` | text | có | — |
| `created_by` | uuid | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |

**Trỏ ra:** `monthly_salary_id`→`monthly_salaries` (CASCADE) · `employee_id`→`employees` · `created_by`→`auth.users`

**Bị trỏ tới bởi (2):** `evaluations` · `salary_adjustments`

**Trigger:** `audit_employee_salaries`→log_audit_action() · `update_employee_salaries_updated_at`→update_updated_at_column()

**CHECK:** `CHECK (((month >= 1) AND (month <= 12)))`

**GHI qua RPC (1):** `sync_employee_salary_paid`

**ĐỌC qua RPC (7):** `finance_period_ledger` · `get_cashflow_forecast` · `payable_items` · `payable_remaining` · `payee_payment_history` · `printing_integrity_report` · `record_payee_payment_atomic`

**Chạm từ mã nguồn (4):** `app/actions/finance-operations-queries.ts` · `app/actions/salary-actions.ts` · `tests/e2e/cashflow-m3.spec.ts` · `tests/e2e/cashflow-m5.spec.ts`


### `employees`

**Số dòng (ước):** 15 · **RLS:** bật · **Policy:** 4

**Policy:** employees_delete:DELETE, employees_insert:INSERT, employees_select:SELECT, employees_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `auth_user_id` | uuid | có | — |
| `employee_code` | character varying | không | — |
| `full_name` | character varying | không | — |
| `gender` | USER-DEFINED | có | — |
| `avatar_url` | text | có | — |
| `phone` | character varying | có | — |
| `email` | character varying | có | — |
| `department` | character varying | có | — |
| `position` | character varying | có | — |
| `role` | USER-DEFINED | không | `'sale'::employee_role_enum` |
| `status` | character varying | có | `'active'::character varying` |
| `salary_info` | jsonb | có | `'{}'::jsonb` |
| `start_date` | date | có | — |
| `deleted_at` | timestamp with time zone | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |
| `notes` | text | có | — |

**Bị trỏ tới bởi (13):** `schedules` · `notifications` · `employee_salaries` · `attendance` · `requests` · `evaluations` · `audit_logs` · `equipment` · `work_tasks` · `notification_queue` · `notification_preferences` · `crm_leads` · `push_subscriptions`

**Trigger:** `emit_realtime_signal`→emit_realtime_signal() · `update_employees_updated_at`→update_updated_at_column()

**GHI qua RPC (1):** `handle_new_user`

**ĐỌC qua RPC (11):** `employee_stats` · `finance_payable_summary` · `get_contract_detail_v2` · `get_contract_detail_v3` · `get_current_employee_id` · `get_current_employee_role` · `get_employee_productivity` · `get_my_employee_job_details` · `get_my_employee_productivity` · `is_active_employee` · `record_payee_payment_atomic`

**Chạm từ mã nguồn (48):** `app/actions/calendar-queries.ts` · `app/actions/employee-mutations.ts` · `app/actions/employee-queries.ts` · `app/actions/finance-close-actions.ts` · `app/actions/inventory-mutations.ts` · `app/actions/inventory-queries.ts` · `app/actions/notification-actions.ts` · `app/actions/profile-actions.ts` · `app/actions/salary-actions.ts` · `app/actions/settings-queries.ts` … +38


### `evaluations`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 4

**Policy:** evaluations_delete:DELETE, evaluations_insert:INSERT, evaluations_select:SELECT, evaluations_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `employee_salary_id` | uuid | có | — |
| `monthly_salary_id` | uuid | có | — |
| `evaluation_date` | date | không | `CURRENT_DATE` |
| `employee_id` | uuid | không | — |
| `evaluation_type` | character varying | không | — |
| `description` | text | có | — |
| `level` | character varying | có | — |
| `times` | integer | có | `1` |
| `amount` | numeric | có | `0` |
| `notes` | text | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `created_by` | uuid | có | — |

**Trỏ ra:** `employee_salary_id`→`employee_salaries` · `monthly_salary_id`→`monthly_salaries` · `employee_id`→`employees` · `created_by`→`auth.users`

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (0):** — **không file nào truy vấn trực tiếp**

> 🔴 **Không đường ghi nào tìm thấy** — bảng này có thể đã chết hoặc chỉ nhận dữ liệu từ ngoài hệ thống.


### `monthly_salaries`

**Số dòng (ước):** 2 · **RLS:** bật · **Policy:** 4

**Policy:** monthly_salaries_delete:DELETE, monthly_salaries_insert:INSERT, monthly_salaries_select:SELECT, monthly_salaries_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `salary_code` | character varying | không | — |
| `year` | integer | không | — |
| `month` | integer | không | — |
| `total_employees` | integer | có | `0` |
| `base_salary_total` | numeric | có | `0` |
| `product_salary_total` | numeric | có | `0` |
| `bonus_total` | numeric | có | `0` |
| `penalty_total` | numeric | có | `0` |
| `advance_total` | numeric | có | `0` |
| `total_salary` | numeric | có | `0` |
| `created_by` | uuid | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |

**Trỏ ra:** `created_by`→`auth.users`

**Bị trỏ tới bởi (2):** `employee_salaries` · `evaluations`

**Trigger:** `emit_realtime_signal`→emit_realtime_signal() · `update_monthly_salaries_updated_at`→update_updated_at_column()

**CHECK:** `CHECK (((month >= 1) AND (month <= 12)))`

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (2):** `get_cashflow_forecast` · `get_finance_intelligence`

**Chạm từ mã nguồn (5):** `app/actions/finance-operations-queries.ts` · `app/actions/finance-reports-queries.ts` · `app/actions/salary-actions.ts` · `tests/e2e/cashflow-m3.spec.ts` · `tests/e2e/cashflow-m5.spec.ts`


### `requests`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 4

**Policy:** requests_delete:DELETE, requests_insert:INSERT, requests_select:SELECT, requests_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `request_date` | date | không | `CURRENT_DATE` |
| `request_type` | character varying | không | — |
| `leave_type` | character varying | có | — |
| `reason` | text | có | — |
| `amount` | numeric | có | `0` |
| `image_url` | text | có | — |
| `notes` | text | có | — |
| `message` | text | có | — |
| `requester_id` | uuid | không | — |
| `approver_id` | uuid | có | — |
| `approval_date` | date | có | — |
| `status` | character varying | có | `'cho_duyet'::character varying` |
| `created_at` | timestamp with time zone | có | `now()` |
| `created_by` | uuid | có | — |

**Trỏ ra:** `requester_id`→`employees` · `approver_id`→`employees` · `created_by`→`auth.users`

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (0):** — **không file nào truy vấn trực tiếp**

> 🔴 **Không đường ghi nào tìm thấy** — bảng này có thể đã chết hoặc chỉ nhận dữ liệu từ ngoài hệ thống.


### `salary_adjustments`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 0 ⚠️ bật RLS nhưng 0 policy ⇒ anon key bị chặn hoàn toàn

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `employee_salary_id` | uuid | không | — |
| `type` | character varying | không | — |
| `amount` | numeric | không | — |
| `reason` | text | không | — |
| `date` | date | không | `CURRENT_DATE` |
| `created_by` | uuid | có | — |
| `created_at` | timestamp with time zone | không | `now()` |

**Trỏ ra:** `employee_salary_id`→`employee_salaries` (CASCADE) · `created_by`→`auth.users`

**CHECK:** `CHECK ((amount > (0)))` · `CHECK (((type)= ANY ((ARRAY['bonus', 'penalty'))))`

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (1):** `app/actions/salary-actions.ts`


### `schedules`

**Số dòng (ước):** 2 · **RLS:** bật · **Policy:** 4

**Policy:** schedules_delete:DELETE, schedules_insert:INSERT, schedules_select:SELECT, schedules_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `contract_id` | uuid | có | — |
| `employee_id` | uuid | không | — |
| `event_date` | timestamp with time zone | không | — |
| `end_date` | timestamp with time zone | có | — |
| `location` | character varying | có | — |
| `role_in_event` | USER-DEFINED | có | — |
| `notes` | text | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |
| `event_type` | character varying | có | — |
| `status` | character varying | có | `'moi'::character varying` |
| `google_event_id` | character varying | có | — |
| `color_id` | character varying | có | — |
| `created_by` | uuid | có | — |

**Trỏ ra:** `contract_id`→`contracts` · `employee_id`→`employees` · `created_by`→`auth.users`

**Trigger:** `emit_realtime_signal`→emit_realtime_signal() · `update_schedules_updated_at`→update_updated_at_column()

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (1):** `calendar_month_events`

**Chạm từ mã nguồn (13):** `app/actions/calendar-mutations.ts` · `app/actions/calendar-queries.ts` · `app/actions/calendar-task-actions.ts` · `app/actions/moodie-action-actions.ts` · `app/actions/schedule-actions.ts` · `app/api/calendar/sync-worker/route.ts` · `lib/api/dashboard.ts` · `lib/calendar-auth.ts` · `scripts/smoke-calendar.mjs` · `scripts/smoke-dashboard.mjs` … +3


### `work_shifts`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 4

**Policy:** work_shifts_delete:DELETE, work_shifts_insert:INSERT, work_shifts_select:SELECT, work_shifts_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `shift_name` | character varying | không | — |
| `start_time` | time without time zone | không | — |
| `end_time` | time without time zone | không | — |
| `lunch_break_hours` | integer | có | `0` |
| `total_hours` | integer | không | — |
| `standard_hours` | integer | không | — |
| `description` | text | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `created_by` | uuid | có | — |

**Trỏ ra:** `created_by`→`auth.users`

**Bị trỏ tới bởi (1):** `attendance`

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (0):** — **không file nào truy vấn trực tiếp**

> 🔴 **Không đường ghi nào tìm thấy** — bảng này có thể đã chết hoặc chỉ nhận dữ liệu từ ngoài hệ thống.


## Hàm DB

| Hàm | Trả về | Quyền | Tính chất | Bảng chạm | Gọi từ mã nguồn |
|---|---|---|---|---|---|
| `employee_stats()` | `TABLE(total bigint, active bigint, inactive bigint, departments jsonb)` | invoker | STABLE | employees | 2 file |
| `get_current_employee_id()` | `uuid` | **DEFINER** | STABLE | employees | **0 — không ai gọi** |
| `get_current_employee_role()` | `employee_role_enum` | **DEFINER** | STABLE | employees | **0 — không ai gọi** |
| `get_my_employee_job_details(p_start_date date, p_end_date date)` | `TABLE(contract_id uuid, contract_code text, client_name text, service_type text, event_date date, work_type text, status text, deadline date, cost numeric)` | **DEFINER** | STABLE | employees | 2 file |
| `get_my_employee_productivity(p_start_date date, p_end_date date)` | `TABLE(employee_id uuid, full_name text, role employee_role_enum, onsite_hours numeric, active_tasks integer, completed_tasks integer, post_production_active integer, overdue_tasks integer, total_cost numeric)` | **DEFINER** | STABLE | employees | 2 file |
| `handle_new_user()` | `trigger` | **DEFINER** | VOLATILE | employees | **0 — không ai gọi** |
| `is_active_employee()` | `boolean` | **DEFINER** | STABLE | employees | 1 file |

Thân đầy đủ từng hàm: `vault/30-du-lieu/than-ham/`.
