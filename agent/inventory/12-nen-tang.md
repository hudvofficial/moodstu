---
title: "Kiểm kê — Nền tảng"
lat-cat: 12-nen-tang
cap-nhat: 2026-09-01
trang-thai: sinh-tu-dong
nguon: pg_class · pg_proc · pg_policies · pg_trigger · pg_constraint · quét mã nguồn
---

> ⚙️ **Sinh bởi `scripts/vault-gen-kiem-ke.mjs` từ database production. ĐỪNG sửa tay.**
> Cột *vận hành thực tế* ở đây là dữ kiện đo được (ai ghi, ai đọc, còn sống hay không).
> Phần diễn giải *thiết kế ban đầu ↔ thực tế lệch nhau chỗ nào* nằm ở [[00-lech-thiet-ke]].

# Kiểm kê — Nền tảng

12 bảng · 27 hàm DB

## Bảng dữ liệu

### `audit_logs`

**Số dòng (ước):** 16074 · **RLS:** bật · **Policy:** 2

**Policy:** audit_logs_insert:INSERT, audit_logs_select:SELECT

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `employee_id` | uuid | có | — |
| `action` | character varying | không | — |
| `table_name` | character varying | có | — |
| `record_id` | text | có | — |
| `old_data` | jsonb | có | — |
| `new_data` | jsonb | có | — |
| `ip_address` | character varying | có | — |
| `user_agent` | text | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `description` | text | có | — |
| `log_type` | USER-DEFINED | không | `'GENERAL'::log_type_enum` |
| `severity` | USER-DEFINED | không | `'INFO'::severity_enum` |
| `source` | USER-DEFINED | không | `'system'::log_source_enum` |
| `performed_by` | uuid | có | — |

**Trỏ ra:** `employee_id`→`employees`

**GHI qua RPC (1):** `log_audit_action`

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (4):** `app/(protected)/audit-logs/page.tsx` · `app/actions/audit-log-actions.ts` · `app/actions/moodie-benchmark-actions.ts` · `lib/audit.ts`


### `documents`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 4

**Policy:** documents_delete:DELETE, documents_insert:INSERT, documents_select:SELECT, documents_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `document_code` | character varying | không | — |
| `document_type` | character varying | không | — |
| `name` | character varying | không | — |
| `department` | character varying | có | — |
| `description` | text | có | — |
| `file_url` | text | có | — |
| `penalty_amount` | numeric | có | `0` |
| `version` | integer | có | `1` |
| `status` | character varying | có | `'active'::character varying` |
| `created_by` | uuid | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |

**Trỏ ra:** `created_by`→`auth.users`

**Trigger:** `update_documents_updated_at`→update_updated_at_column()

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (0):** — **không file nào truy vấn trực tiếp**

> 🔴 **Không đường ghi nào tìm thấy** — bảng này có thể đã chết hoặc chỉ nhận dữ liệu từ ngoài hệ thống.


### `google_sync_queue`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 1

**Policy:** Enable ALL for service-role:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `schedule_id` | uuid | có | — |
| `google_event_id` | text | có | — |
| `action` | text | không | — |
| `payload` | jsonb | có | — |
| `status` | text | không | `'pending'::text` |
| `attempts` | integer | không | `0` |
| `created_at` | timestamp with time zone | không | `now()` |
| `updated_at` | timestamp with time zone | không | `now()` |
| `idempotency_key` | text | có | — |

**Trigger:** `emit_realtime_signal`→emit_realtime_signal()

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (3):** `app/actions/calendar-mutations.ts` · `app/actions/moodie-action-actions.ts` · `app/api/calendar/sync-worker/route.ts`


### `integrity_reports`

**Số dòng (ước):** 1 · **RLS:** bật · **Policy:** 1

**Policy:** authenticated_integrity:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `scan_date` | date | có | `CURRENT_DATE` |
| `status` | character varying | có | `'completed'::character varying` |
| `checks` | jsonb | có | `'[]'::jsonb` |
| `total_issues` | integer | có | `0` |
| `warning_count` | integer | có | `0` |
| `info_count` | integer | có | `0` |
| `created_at` | timestamp with time zone | có | `now()` |

**GHI qua RPC (1):** `run_integrity_scan`

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (1):** `app/actions/integrity-actions.ts`


### `login_attempts`

**Số dòng (ước):** 18 · **RLS:** bật · **Policy:** 4

**Policy:** Enable delete for everyone:DELETE, Enable insert for everyone:INSERT, Enable select for everyone:SELECT, Enable update for everyone:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `email` | text | không | — |
| `attempt_count` | integer | có | `1` |
| `last_attempt` | timestamp with time zone | có | `now()` |
| `locked_until` | timestamp with time zone | có | — |
| `created_at` | timestamp with time zone | có | `now()` |

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (2):** `app/actions/auth.ts` · `scripts/probe-anon-access.mjs`


### `notification_preferences`

**Số dòng (ước):** 1 · **RLS:** bật · **Policy:** 1

**Policy:** authenticated_notif_prefs:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `employee_id` | uuid | không | — |
| `onsite_reminder` | boolean | có | `true` |
| `deadline_reminder` | boolean | có | `true` |
| `overdue_alert` | boolean | có | `true` |
| `task_assignment` | boolean | có | `true` |
| `system_alerts` | boolean | có | `true` |
| `updated_at` | timestamp with time zone | có | `now()` |

**Trỏ ra:** `employee_id`→`employees` (CASCADE)

**Trigger:** `emit_realtime_signal`→emit_realtime_signal()

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (5):** `app/actions/notification-actions.ts` · `app/actions/settings-queries.ts` · `scripts/smoke-settings.mjs` · `scripts/verify-realtime-publication.mjs` · `scripts/verify-realtime-signals.mjs`


### `notification_queue`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 1

**Policy:** authenticated_notif_queue:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `employee_id` | uuid | không | — |
| `type` | character varying | có | `'system'::character varying` |
| `title` | character varying | không | — |
| `content` | text | có | — |
| `status` | character varying | có | `'pending'::character varying` |
| `read_at` | timestamp with time zone | có | — |
| `resource_type` | character varying | có | — |
| `resource_id` | uuid | có | — |
| `created_at` | timestamp with time zone | có | `now()` |

**Trỏ ra:** `employee_id`→`employees` (CASCADE)

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (2):** `app/actions/inventory-mutations.ts` · `app/actions/notification-actions.ts`


### `notifications`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 4

**Policy:** notifications_delete:DELETE, notifications_insert:INSERT, notifications_select:SELECT, notifications_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `employee_id` | uuid | có | — |
| `title` | character varying | không | — |
| `content` | text | không | — |
| `type` | character varying | có | `'system'::character varying` |
| `resource_type` | character varying | có | — |
| `resource_id` | uuid | có | — |
| `is_read` | boolean | có | `false` |
| `created_at` | timestamp with time zone | có | `now()` |

**Trỏ ra:** `employee_id`→`employees`

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (0):** — **không file nào truy vấn trực tiếp**

> 🔴 **Không đường ghi nào tìm thấy** — bảng này có thể đã chết hoặc chỉ nhận dữ liệu từ ngoài hệ thống.


### `push_subscriptions`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 4

**Policy:** Service role full access:ALL, Users can delete own subscriptions:DELETE, Users can insert own subscriptions:INSERT, Users can view own subscriptions:SELECT

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `employee_id` | uuid | không | — |
| `endpoint` | text | không | — |
| `p256dh` | text | không | — |
| `auth` | text | không | — |
| `user_agent` | text | có | — |
| `created_at` | timestamp with time zone | không | `now()` |
| `updated_at` | timestamp with time zone | không | `now()` |

**Trỏ ra:** `employee_id`→`employees` (CASCADE)

**Trigger:** `set_push_subscriptions_updated_at`→update_updated_at_column()

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (3):** `app/api/push/send/route.ts` · `app/api/push/subscribe/route.ts` · `lib/push-notification.ts`


### `realtime_signals`

**Số dòng (ước):** 1 · **RLS:** bật · **Policy:** 1

**Policy:** realtime_signals_select:SELECT

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | bigint | không | — |
| `table_name` | text | không | — |
| `op` | text | không | — |
| `changed_at` | timestamp with time zone | không | `now()` |

**GHI qua RPC (1):** `emit_realtime_signal`

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (0):** — **không file nào truy vấn trực tiếp**


### `studio_info`

**Số dòng (ước):** 1 · **RLS:** bật · **Policy:** 4

**Policy:** studio_info_delete:DELETE, studio_info_insert:INSERT, studio_info_select:SELECT, studio_info_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `name` | character varying | không | — |
| `address` | text | có | — |
| `hotline` | character varying | có | — |
| `representative` | character varying | có | — |
| `logo_url` | text | có | — |
| `bank_info` | jsonb | có | `'[]'::jsonb` |
| `social_links` | jsonb | có | `'{}'::jsonb` |
| `working_hours` | jsonb | có | `'{}'::jsonb` |
| `timezone` | character varying | có | `'Asia/Ho_Chi_Minh'::character varying` |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |
| `google_oauth` | jsonb | có | — |

**Trigger:** `emit_realtime_signal`→emit_realtime_signal() · `update_studio_info_updated_at`→update_updated_at_column()

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (11):** `app/actions/calendar-queries.ts` · `app/actions/gallery-drive-actions.ts` · `app/actions/settings-mutations.ts` · `app/api/auth/google/callback/route.ts` · `lib/google-auth.ts` · `lib/googleCalendarService.ts` · `lib/productivity-auth.ts` · `lib/studio-info.ts` · `scripts/smoke-settings.mjs` · `scripts/test/test-google-direct.js` … +1


### `system_settings`

**Số dòng (ước):** 23 · **RLS:** bật · **Policy:** 0 ⚠️ bật RLS nhưng 0 policy ⇒ anon key bị chặn hoàn toàn

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `key` | text | không | — |
| `value` | text | có | — |
| `description` | text | có | — |
| `updated_at` | timestamp with time zone | không | `now()` |

**Trigger:** `emit_realtime_signal`→emit_realtime_signal()

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (2):** `resolve_printing_expense_category_id` · `resolve_vendor_expense_category_id`

**Chạm từ mã nguồn (8):** `app/actions/moodie-provider-actions.ts` · `app/actions/settings-mutations.ts` · `lib/moodie/brave-config.ts` · `lib/moodie/browser-config.ts` · `lib/moodie/providers/registry.ts` · `lib/moodie/voice-config.ts` · `lib/moodie/voice-live-config.ts` · `lib/system-settings.ts`


## Hàm DB

| Hàm | Trả về | Quyền | Tính chất | Bảng chạm | Gọi từ mã nguồn |
|---|---|---|---|---|---|
| `contract_payment_receipt_code(p_payment_id uuid, p_payment_date date)` | `text` | invoker | IMMUTABLE | — | **0 — không ai gọi** |
| `contract_payment_status_v2(p_paid numeric, p_remaining numeric)` | `text` | invoker | IMMUTABLE | — | **0 — không ai gọi** |
| `emit_realtime_signal()` | `trigger` | **DEFINER** | VOLATILE | realtime_signals | 1 file |
| `finance_lab_debt_summary()` | `TABLE(lab_id uuid, lab_name text, order_count bigint, total_orders numeric, total_paid numeric, remaining numeric, last_order_date timestamp with time zone)` | **DEFINER** | STABLE | — | 2 file |
| `finance_pnl_by_month(p_year integer)` | `TABLE(raw_month integer, month_label text, revenue numeric, cost numeric, profit numeric, cash_in numeric, cash_out numeric, signed_revenue numeric)` | **DEFINER** | STABLE | — | 4 file |
| `finance_receipt_stats(p_month integer, p_year integer)` | `TABLE(total_receipts bigint, total_amount numeric, completed_count bigint, pending_count bigint)` | **DEFINER** | STABLE | — | **0 — không ai gọi** |
| `log_audit_action()` | `trigger` | **DEFINER** | VOLATILE | audit_logs | **0 — không ai gọi** |
| `moodie_jsonb_cosine_similarity(a jsonb, b jsonb)` | `double precision` | invoker | IMMUTABLE | — | **0 — không ai gọi** |
| `next_employee_code()` | `text` | invoker | VOLATILE | — | 7 file |
| `nextval_customer_code()` | `bigint` | **DEFINER** | VOLATILE | — | 2 file |
| `nextval_inventory_code()` | `text` | invoker | VOLATILE | — | 2 file |
| `payment_stage_display_label_v2(p_stage text, p_default text)` | `text` | invoker | IMMUTABLE | — | **0 — không ai gọi** |
| `payment_stage_key_v2(p_stage text)` | `text` | invoker | IMMUTABLE | — | 1 file |
| `printing_items_total(p_items jsonb)` | `numeric` | invoker | IMMUTABLE | — | **0 — không ai gọi** |
| `process_contract_payment(p_contract_id uuid, p_amount numeric, p_payment_method payment_method_)` | `json` | **DEFINER** | VOLATILE | — | 2 file |
| `record_lab_payment_atomic(p_lab_id uuid, p_amount numeric, p_payment_method text, p_note text, p)` | `jsonb` | **DEFINER** | VOLATILE | — | 5 file |
| `refresh_dress_status(p_dress_id uuid)` | `void` | **DEFINER** | VOLATILE | — | 2 file |
| `resolve_vendor_expense_category_id()` | `uuid` | **DEFINER** | STABLE | system_settings, transaction_categories | **0 — không ai gọi** |
| `restore_inventory_on_contract_payment_void()` | `trigger` | invoker | VOLATILE | — | **0 — không ai gọi** |
| `restore_inventory_on_receipt_void()` | `trigger` | invoker | VOLATILE | — | **0 — không ai gọi** |
| `rls_auto_enable()` | `event_trigger` | **DEFINER** | VOLATILE | — | **0 — không ai gọi** |
| `trg_contract_payment_status_v2()` | `trigger` | invoker | VOLATILE | — | **0 — không ai gọi** |
| `trg_refresh_dress_status_from_rental()` | `trigger` | **DEFINER** | VOLATILE | — | **0 — không ai gọi** |
| `trg_refresh_dress_status_from_reservation()` | `trigger` | **DEFINER** | VOLATILE | — | **0 — không ai gọi** |
| `update_contract_checklists_updated_at()` | `trigger` | invoker | VOLATILE | — | **0 — không ai gọi** |
| `update_updated_at_column()` | `trigger` | invoker | VOLATILE | — | **0 — không ai gọi** |
| `vn_date(p timestamp with time zone)` | `date` | invoker | IMMUTABLE | — | **0 — không ai gọi** |

Thân đầy đủ từng hàm: `vault/30-du-lieu/than-ham/`.
