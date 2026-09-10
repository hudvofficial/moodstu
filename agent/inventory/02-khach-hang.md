---
title: "Kiểm kê — Khách hàng & bán hàng"
lat-cat: 02-khach-hang
cap-nhat: 2026-09-01
trang-thai: sinh-tu-dong
nguon: pg_class · pg_proc · pg_policies · pg_trigger · pg_constraint · quét mã nguồn
---

> ⚙️ **Sinh bởi `scripts/vault-gen-kiem-ke.mjs` từ database production. ĐỪNG sửa tay.**
> Cột *vận hành thực tế* ở đây là dữ kiện đo được (ai ghi, ai đọc, còn sống hay không).
> Phần diễn giải *thiết kế ban đầu ↔ thực tế lệch nhau chỗ nào* nằm ở [[00-lech-thiet-ke]].

# Kiểm kê — Khách hàng & bán hàng

4 bảng · 4 hàm DB

## Bảng dữ liệu

### `crm_leads`

**Số dòng (ước):** 4 · **RLS:** bật · **Policy:** 4

**Policy:** crm_leads_delete:DELETE, crm_leads_insert:INSERT, crm_leads_select:SELECT, crm_leads_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `contact_date` | date | không | `CURRENT_DATE` |
| `phone` | character varying | có | — |
| `contact_name` | character varying | có | — |
| `source` | character varying | có | — |
| `needs` | character varying | có | — |
| `address` | text | có | — |
| `email` | character varying | có | — |
| `assigned_to` | uuid | có | — |
| `potential` | USER-DEFINED | có | — |
| `status` | USER-DEFINED | có | `'moi'::lead_status_enum` |
| `notes` | text | có | — |
| `care_history` | text | có | — |
| `social_link` | text | có | — |
| `care_type` | character varying | có | — |
| `next_contact_date` | date | có | — |
| `created_by` | uuid | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |
| `deal_value` | numeric | có | `0` |
| `tags` | ARRAY | có | `'{}'::text[]` |
| `score` | integer | có | `0` |
| `pipeline_order` | integer | có | `0` |
| `status_changed_at` | timestamp with time zone | có | — |
| `lost_reason` | text | có | — |
| `deleted_at` | timestamp with time zone | có | — |

**Trỏ ra:** `assigned_to`→`employees` (SET NULL) · `created_by`→`employees` (SET NULL)

**Bị trỏ tới bởi (1):** `customers`

**Trigger:** `emit_realtime_signal`→emit_realtime_signal() · `update_crm_leads_updated_at`→update_updated_at_column()

**GHI qua RPC (2):** `append_care_log` · `convert_lead_to_customer`

**ĐỌC qua RPC (2):** `get_crm_lead_stats` · `get_finance_advanced_intelligence`

**Chạm từ mã nguồn (2):** `app/actions/lead-actions.ts` · `app/actions/lead-lifecycle.ts`


### `customers`

**Số dòng (ước):** 66 · **RLS:** bật · **Policy:** 4

**Policy:** customers_delete:DELETE, customers_insert:INSERT, customers_select:SELECT, customers_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `customer_code` | character varying | không | — |
| `full_name` | character varying | không | — |
| `phone` | character varying | có | — |
| `alt_phone` | character varying | có | — |
| `email` | character varying | có | — |
| `address` | text | có | — |
| `gender` | USER-DEFINED | có | — |
| `date_of_birth` | date | có | — |
| `wedding_date` | date | có | — |
| `avatar_url` | text | có | — |
| `source` | character varying | có | — |
| `notes` | text | có | — |
| `tags` | ARRAY | có | `'{}'::text[]` |
| `status` | character varying | có | `'active'::character varying` |
| `deleted_at` | timestamp with time zone | có | — |
| `created_by` | uuid | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |
| `lead_id` | uuid | có | — |
| `bride_name` | character varying | có | — |
| `groom_name` | character varying | có | — |
| `bride_phone` | character varying | có | — |
| `bride_height` | smallint | có | — |
| `bride_weight` | smallint | có | — |
| `bride_shoe_size` | smallint | có | — |
| `groom_phone` | character varying | có | — |
| `groom_height` | smallint | có | — |
| `groom_weight` | smallint | có | — |
| `groom_shoe_size` | smallint | có | — |

**Trỏ ra:** `lead_id`→`crm_leads` · `created_by`→`auth.users`

**Bị trỏ tới bởi (3):** `dress_reservations` · `contracts` · `payments`

**Trigger:** `emit_realtime_signal`→emit_realtime_signal() · `update_customers_updated_at`→update_updated_at_column()

**GHI qua RPC (2):** `convert_lead_to_customer` · `save_contract_atomic`

**ĐỌC qua RPC (12):** `calendar_month_events` · `finance_contract_profit_report` · `finance_ledger` · `finance_ledger_range` · `finance_pending_collections` · `finance_receipt_documents` · `get_contract_detail_v2` · `get_contract_detail_v3` · `get_contract_list_v2` · `get_crm_customer_stats` · `get_employee_job_details` · `get_finance_advanced_intelligence`

**Chạm từ mã nguồn (28):** `app/actions/contract-queries.ts` · `app/actions/customer-actions.ts` · `app/actions/lead-lifecycle.ts` · `playwright/global-setup.ts` · `playwright/global-teardown.ts` · `scripts/cleanup-e2e-data.mjs` · `scripts/smoke-calendar.mjs` · `scripts/smoke-contracts.mjs` · `scripts/smoke-dashboard.mjs` · `tests/e2e/cashflow-m1.spec.ts` … +18


### `price_rules`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 1

**Policy:** authenticated_rules:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `name` | character varying | không | — |
| `description` | text | có | — |
| `conditions` | jsonb | có | `'{}'::jsonb` |
| `actions` | jsonb | có | `'{}'::jsonb` |
| `priority` | integer | có | `0` |
| `is_active` | boolean | có | `true` |
| `created_at` | timestamp with time zone | có | `now()` |

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (1):** `app/actions/builder-actions.ts`


### `promotions`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 4

**Policy:** promotions_delete:DELETE, promotions_insert:INSERT, promotions_select:SELECT, promotions_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `promo_code` | character varying | không | — |
| `promo_name` | character varying | không | — |
| `discount_type` | character varying | có | — |
| `discount_value` | numeric | không | — |
| `min_order_value` | numeric | có | `0` |
| `max_discount_amount` | numeric | có | — |
| `start_date` | timestamp with time zone | có | — |
| `end_date` | timestamp with time zone | có | — |
| `usage_limit` | integer | có | — |
| `usage_count` | integer | có | `0` |
| `status` | character varying | có | `'active'::character varying` |
| `created_at` | timestamp with time zone | có | `now()` |

**CHECK:** `CHECK (((discount_type)= ANY ((ARRAY['percentage', 'fixed'))))`

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (0):** — **không file nào truy vấn trực tiếp**

> 🔴 **Không đường ghi nào tìm thấy** — bảng này có thể đã chết hoặc chỉ nhận dữ liệu từ ngoài hệ thống.


## Hàm DB

| Hàm | Trả về | Quyền | Tính chất | Bảng chạm | Gọi từ mã nguồn |
|---|---|---|---|---|---|
| `append_care_log(p_lead_id uuid, p_content text, p_type text)` | `jsonb` | **DEFINER** | VOLATILE | crm_leads | 1 file |
| `convert_lead_to_customer(p_lead_id uuid)` | `jsonb` | **DEFINER** | VOLATILE | crm_leads, customers | 1 file |
| `get_crm_customer_stats()` | `json` | **DEFINER** | VOLATILE | contracts, customers | 1 file |
| `get_crm_lead_stats()` | `json` | **DEFINER** | VOLATILE | crm_leads | 1 file |

Thân đầy đủ từng hàm: `vault/30-du-lieu/than-ham/`.
