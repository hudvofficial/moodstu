---
title: "Kiểm kê — In ấn & lab"
lat-cat: 06-in-an
cap-nhat: 2026-09-01
trang-thai: sinh-tu-dong
nguon: pg_class · pg_proc · pg_policies · pg_trigger · pg_constraint · quét mã nguồn
---

> ⚙️ **Sinh bởi `scripts/vault-gen-kiem-ke.mjs` từ database production. ĐỪNG sửa tay.**
> Cột *vận hành thực tế* ở đây là dữ kiện đo được (ai ghi, ai đọc, còn sống hay không).
> Phần diễn giải *thiết kế ban đầu ↔ thực tế lệch nhau chỗ nào* nằm ở [[00-lech-thiet-ke]].

# Kiểm kê — In ấn & lab

4 bảng · 6 hàm DB

## Bảng dữ liệu

### `lab_services`

**Số dòng (ước):** 22 · **RLS:** bật · **Policy:** 4

**Policy:** lab_services_delete:DELETE, lab_services_insert:INSERT, lab_services_select:SELECT, lab_services_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `lab_id` | uuid | không | — |
| `item_name` | character varying | không | — |
| `cost_price` | numeric | có | `0` |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |

**Trỏ ra:** `lab_id`→`labs` (CASCADE)

**Trigger:** `update_lab_services_updated_at`→update_updated_at_column()

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (1):** `printing_lab_overview`

**Chạm từ mã nguồn (2):** `app/actions/lab-mutations.ts` · `app/actions/lab-queries.ts`


### `labs`

**Số dòng (ước):** 2 · **RLS:** bật · **Policy:** 4

**Policy:** labs_delete:DELETE, labs_insert:INSERT, labs_select:SELECT, labs_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `lab_name` | character varying | không | — |
| `contact_person` | character varying | có | — |
| `phone` | character varying | có | — |
| `address` | text | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `status` | character varying | không | `'active'::character varying` |
| `deleted_at` | timestamp with time zone | có | — |
| `updated_by` | uuid | có | — |
| `updated_at` | timestamp with time zone | có | `now()` |

**Trỏ ra:** `updated_by`→`auth.users`

**Bị trỏ tới bởi (2):** `lab_services` · `printing_orders`

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (7):** `create_printing_order_atomic` · `finance_payable_summary` · `get_contract_detail_v2` · `get_contract_detail_v3` · `printing_lab_overview` · `record_payee_payment_atomic` · `update_printing_order_atomic`

**Chạm từ mã nguồn (7):** `app/actions/lab-mutations.ts` · `app/actions/lab-queries.ts` · `app/actions/printing-queries.ts` · `scripts/smoke-contracts.mjs` · `tests/e2e/cashflow-m1.spec.ts` · `tests/e2e/cashflow-m2.spec.ts` · `tests/e2e/printing-drawer-fixes-verify.spec.ts`


### `printing_order_status_history`

**Số dòng (ước):** 68 · **RLS:** bật · **Policy:** 2

**Policy:** printing_order_status_history_insert:INSERT, printing_order_status_history_select:SELECT

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `order_id` | uuid | không | — |
| `from_status` | text | không | — |
| `to_status` | text | không | — |
| `changed_by` | uuid | có | — |
| `changed_at` | timestamp with time zone | không | `now()` |
| `reason` | text | có | — |
| `source` | text | không | `'manual'::text` |

**Trỏ ra:** `order_id`→`printing_orders` (CASCADE) · `changed_by`→`auth.users`

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (4):** `app/actions/printing-mutations.ts` · `tests/e2e/cashflow-m1.spec.ts` · `tests/e2e/cashflow-m2.spec.ts` · `tests/e2e/printing-drawer-fixes-verify.spec.ts`


### `printing_orders`

**Số dòng (ước):** 35 · **RLS:** bật · **Policy:** 4

**Policy:** printing_orders_delete:DELETE, printing_orders_insert:INSERT, printing_orders_select:SELECT, printing_orders_update:UPDATE

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `order_code` | character varying | có | — |
| `contract_id` | uuid | có | — |
| `lab_id` | uuid | có | — |
| `items` | jsonb | có | `'[]'::jsonb` |
| `total_amount` | numeric | có | `0` |
| `status` | character varying | có | `'moi'::character varying` |
| `payment_status` | character varying | có | `'chua_thanh_toan'::character varying` |
| `order_date` | date | có | `CURRENT_DATE` |
| `expected_date` | date | có | — |
| `received_date` | date | có | — |
| `delivered_date` | date | có | — |
| `notes` | text | có | — |
| `created_by` | uuid | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |
| `deleted_at` | timestamp with time zone | có | — |
| `updated_by` | uuid | có | — |
| `deposit_amount` | numeric | có | `0` |
| `final_amount` | numeric | có | `0` |
| `paid_amount` | numeric | có | `0` |
| `inventory_status` | text | có | `'none'::text` |
| `cancelled_at` | timestamp with time zone | có | — |
| `cancellation_reason` | text | có | — |
| `delivered_at` | timestamp with time zone | có | — |
| `remaining_amount` | numeric | có | **GENERATED** |
| `issue_reason` | text | có | — |
| `issue_reported_at` | timestamp with time zone | có | — |
| `issue_reported_by` | uuid | có | — |
| `print_file_url` | text | có | — |

**Trỏ ra:** `contract_id`→`contracts` · `lab_id`→`labs` · `created_by`→`auth.users` · `updated_by`→`auth.users` · `issue_reported_by`→`auth.users`

**Bị trỏ tới bởi (2):** `printing_order_status_history` · `expenses`

**Trigger:** `emit_realtime_signal`→emit_realtime_signal() · `update_printing_orders_updated_at`→update_updated_at_column()

**CHECK:** `CHECK ((inventory_status = ANY (ARRAY['none', 'reserved', 'stocked_out', 'cancelled')))` · `CHECK (((deleted_at IS NOT NULL) OR ((payment_status)= ANY ((ARRAY['chua_thanh_toan', 'da_thanh_toan')))))` · `CHECK (((deleted_at IS NOT NULL) OR ((status)= ANY ((ARRAY['cho_xu_ly', 'dang_in', 'da_in', 'hoan_thanh', 'huy_don', 'gap_su_co')))))`

**GHI qua RPC (6):** `cancel_contract_cascade` · `create_printing_order_atomic` · `delete_contract_cascade` · `delete_printing_order_atomic` · `recompute_printing_payment_status` · `update_printing_order_atomic`

**ĐỌC qua RPC (11):** `contract_financials` · `finance_period_ledger` · `get_contract_detail_v2` · `get_contract_detail_v3` · `get_printing_cost_stats` · `nextval_printing_order_code` · `payable_items` · `payable_remaining` · `payee_payment_history` · `printing_integrity_report` · `printing_stats`

**Chạm từ mã nguồn (20):** `app/actions/contract-lifecycle.ts` · `app/actions/finance-dashboard-queries.ts` · `app/actions/finance-reports-queries.ts` · `app/actions/lab-mutations.ts` · `app/actions/lab-queries.ts` · `app/actions/printing-actions.ts` · `app/actions/printing-mutations.ts` · `app/actions/printing-queries.ts` · `scripts/perf-operational-probe.mjs` · `scripts/smoke-contracts.mjs` … +10


## Hàm DB

| Hàm | Trả về | Quyền | Tính chất | Bảng chạm | Gọi từ mã nguồn |
|---|---|---|---|---|---|
| `create_printing_order_atomic(p_order jsonb, p_actor_id uuid)` | `jsonb` | **DEFINER** | VOLATILE | contracts, labs, printing_orders | 7 file |
| `delete_printing_order_atomic(p_order_id uuid, p_actor_id uuid)` | `jsonb` | **DEFINER** | VOLATILE | expense_allocations, expenses, printing_orders | 2 file |
| `get_printing_cost_stats()` | `TABLE(total_cost numeric, unpaid_cost numeric)` | **DEFINER** | VOLATILE | printing_orders | 1 file |
| `nextval_printing_order_code()` | `text` | **DEFINER** | VOLATILE | printing_orders | **0 — không ai gọi** |
| `printing_stats()` | `TABLE(total bigint, cho_xu_ly bigint, dang_in bigint, da_in bigint, hoan_thanh bigint, huy_don bigint, total_cost numeric, unpaid_cost numeric)` | **DEFINER** | VOLATILE | printing_orders | 2 file |
| `update_printing_order_atomic(p_order_id uuid, p_order jsonb, p_expected_updated_at timestamp with t)` | `jsonb` | **DEFINER** | VOLATILE | labs, printing_orders | 1 file |

Thân đầy đủ từng hàm: `vault/30-du-lieu/than-ham/`.
