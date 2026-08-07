---
title: "Danh mục RPC (hàm Postgres)"
tags: [du-lieu, rpc]
cap-nhat: 2026-08-07
---

# Danh mục RPC — 144 hàm

> Sinh từ `pg_proc` trên DB thật. `SECURITY DEFINER` = chạy bằng quyền chủ hàm, **bỏ qua RLS** → mọi hàm loại này phải tự kiểm quyền bên trong.

## Moodie AI

| Hàm | Tham số | Trả về | SECURITY DEFINER |
|---|---|---|---|
| `claim_moodie_agent_run` | p_worker_id text, p_lease_seconds integer | SETOF moodie_agent_runs | ⚠️ có |
| `finalize_moodie_memory_consolidation` | p_user_id uuid, p_source_ids uuid[], p_content text, p_value jsonb, p_confidence numeric, p_importance numeric | uuid | ⚠️ có |
| `finish_moodie_agent_run` | p_run_id uuid, p_lease_token uuid, p_status text, p_result jsonb, p_error text, p_source_refs jsonb | SETOF moodie_agent_runs | ⚠️ có |
| `heartbeat_moodie_agent_run` | p_run_id uuid, p_lease_token uuid, p_progress integer, p_lease_seconds integer | boolean | ⚠️ có |
| `maintain_moodie_memory_lifecycle` | p_limit integer | TABLE(expired_count integer, reconfirm_count integer) | ⚠️ có |
| `match_moodie_memories` | p_user_id uuid, p_conversation_id uuid, p_query_text text, p_query_embedding jsonb, p_limit integer | TABLE(id uuid, scope text, memory_type text, content text, s |  |
| `moodie_jsonb_cosine_similarity` | a jsonb, b jsonb | double precision |  |
| `reserve_moodie_brave_call` | p_user_id uuid, p_daily_limit integer, p_studio_daily_limit integer, p_estimated_cost_microusd bigint | TABLE(user_call_count integer, studio_call_count bigint) | ⚠️ có |
| `retry_moodie_agent_run` | p_run_id uuid, p_lease_token uuid, p_error text, p_delay_seconds integer | SETOF moodie_agent_runs | ⚠️ có |

## Hợp đồng & thanh toán

| Hàm | Tham số | Trả về | SECURITY DEFINER |
|---|---|---|---|
| `backfill_payment_plan_ssot_v2` | — | json | ⚠️ có |
| `cancel_contract_cascade` | p_contract_id uuid, p_reason text, p_user_id uuid | void | ⚠️ có |
| `contract_payment_health_checks` | — | TABLE(check_name text, issue_count bigint) | ⚠️ có |
| `contract_payment_receipt_code` | p_payment_id uuid, p_payment_date date | text |  |
| `contract_payment_status_v2` | p_paid numeric, p_remaining numeric | text |  |
| `contract_stats` | — | TABLE(total bigint, active bigint, pending bigint, completed |  |
| `contract_stats_simple` | — | TABLE(total bigint, active bigint, pending bigint, completed |  |
| `create_contract_inventory_addon_sale_atomic` | p_contract_id uuid, p_item_id uuid, p_quantity integer, p_sale_unit_price numeric, p_payment_method payment_me | jsonb | ⚠️ có |
| `create_default_payment_schedule_v2` | p_contract_id uuid, p_total numeric, p_initial_amount numeric, p_initial_stage text, p_contract_date date, p_w | uuid | ⚠️ có |
| `create_dress_contract_reservation_atomic` | p_dress_id uuid, p_contract_id uuid, p_contract_item_id uuid, p_customer_id uuid, p_start_date date, p_end_dat | jsonb |  |
| `create_sale_receipt_atomic` | p_receipt jsonb, p_items jsonb | jsonb |  |
| `delete_contract_cascade` | p_contract_id uuid, p_user_id uuid | void | ⚠️ có |
| `finance_contract_profit_report` | p_status text, p_from date, p_to date, p_page integer, p_page_size integer | TABLE(id uuid, contract_code text, customer_name text, contr |  |
| `finance_receipt_document_stats` | p_month integer, p_year integer | TABLE(total_receipts bigint, total_amount numeric, completed | ⚠️ có |
| `finance_receipt_documents` | p_month integer, p_year integer, p_receipt_type text, p_search text, p_limit integer, p_offset integer | TABLE(id text, source_table text, source_id uuid, receipt_da | ⚠️ có |
| `finance_receipt_stats` | p_month integer, p_year integer | TABLE(total_receipts bigint, total_amount numeric, completed | ⚠️ có |
| `get_contract_balance` | p_contract_id uuid | json | ⚠️ có |
| `get_contract_detail_v2` | p_contract_id uuid | jsonb |  |
| `get_contract_detail_v3` | p_contract_id uuid | jsonb |  |
| `get_contract_list_v2` | p_status text, p_search text, p_service_type text, p_sort text, p_time_filter text, p_start_date date, p_end_d | jsonb | ⚠️ có |
| `get_gallery_summaries_by_contract` | p_contract_id uuid | jsonb |  |
| `payment_stage_display_label_v2` | p_stage text, p_default text | text |  |
| `payment_stage_key_v2` | p_stage text | text |  |
| `process_contract_payment` | p_contract_id uuid, p_amount numeric, p_payment_method payment_method_enum, p_payment_date date, p_payment_sta | json | ⚠️ có |
| `process_contract_payment_v2` | p_contract_id uuid, p_amount numeric, p_payment_method payment_method_enum, p_payment_date date, p_payment_sta | json | ⚠️ có |
| `recalc_contract_totals` | p_contract_id uuid | void | ⚠️ có |
| `record_lab_payment_atomic` | p_lab_id uuid, p_amount numeric, p_payment_method text, p_note text, p_allocations jsonb, p_actor_id uuid | jsonb | ⚠️ có |
| `record_vendor_payment_atomic` | p_vendor_id uuid, p_amount numeric, p_payment_method text, p_payment_date date, p_note text, p_allocations jso | jsonb | ⚠️ có |
| `restore_inventory_on_contract_payment_void` | — | trigger |  |
| `restore_inventory_on_receipt_void` | — | trigger |  |
| `save_contract_atomic` | p_contract jsonb, p_customer jsonb, p_items jsonb, p_actor_id uuid, p_existing_contract_id uuid, p_expected_up | json | ⚠️ có |
| `sync_payment_plan_statuses_v2` | p_contract_id uuid | void | ⚠️ có |
| `trg_contract_payment_status_v2` | — | trigger |  |
| `update_contract_checklists_updated_at` | — | trigger |  |
| `update_vendor_payments_updated_at` | — | trigger |  |
| `void_contract_payment_v2` | p_payment_id uuid, p_reason text, p_actor_id uuid | json | ⚠️ có |

## Tài chính

| Hàm | Tham số | Trả về | SECURITY DEFINER |
|---|---|---|---|
| `advance_close_task` | p_close_id uuid, p_step_number integer, p_new_status text, p_actor_id uuid | void | ⚠️ có |
| `contribute_to_goal` | p_goal_id uuid, p_amount numeric, p_notes text | void |  |
| `dashboard_revenue_chart` | p_month integer, p_year integer, p_months integer | TABLE(month_index integer, month_label text, revenue numeric |  |
| `decrement_goal_amount` | p_goal_id uuid, p_amount numeric | void |  |
| `finance_cashflow_timeline` | p_start_date date, p_end_date date | TABLE(date date, inflow numeric, outflow numeric) | ⚠️ có |
| `finance_dashboard_metrics` | p_month integer, p_year integer | TABLE(total_inflow numeric, total_outflow numeric, profit nu |  |
| `finance_debt_stats` | — | TABLE(receivable numeric, payable numeric, overdue numeric,  | ⚠️ có |
| `finance_expense_stats` | p_month integer, p_year integer | TABLE(total_expenses bigint, total_amount numeric, approved_ |  |
| `finance_lab_debt_summary` | — | TABLE(lab_id uuid, lab_name text, order_count bigint, total_ | ⚠️ có |
| `finance_ledger` | p_page integer, p_page_size integer, p_month integer, p_year integer, p_type text | TABLE(id uuid, source_table text, direction text, transactio |  |
| `finance_ledger_range` | p_page integer, p_page_size integer, p_from_date date, p_to_date date, p_type text | TABLE(id uuid, source_table text, direction text, transactio | ⚠️ có |
| `finance_reports_snapshot` | p_start_date date, p_end_date date | jsonb | ⚠️ có |
| `finance_revenue_by_month` | p_year integer | TABLE(raw_month integer, month_label text, revenue numeric) |  |
| `finance_service_distribution` | p_month integer, p_year integer | TABLE(name text, value integer, revenue numeric) |  |
| `finance_vendor_debt_summary` | — | TABLE(vendor_id uuid, vendor_name text, vendor_phone text, s | ⚠️ có |
| `get_budget_vs_actual` | p_month integer, p_year integer | json | ⚠️ có |
| `get_cashflow_forecast` | p_days integer | json | ⚠️ có |
| `get_expense_breakdown` | p_month integer, p_year integer | json | ⚠️ có |
| `get_finance_advanced_intelligence` | p_month integer, p_year integer | jsonb | ⚠️ có |
| `get_finance_intelligence` | — | json | ⚠️ có |
| `get_receivable_aging` | — | json | ⚠️ có |
| `resolve_printing_expense_category_id` | — | uuid | ⚠️ có |
| `resolve_vendor_expense_category_id` | — | uuid | ⚠️ có |
| `trg_sync_vendor_expense` | — | trigger | ⚠️ có |
| `undo_contribution_atomic` | p_contribution_id uuid | json | ⚠️ có |
| `upsert_printing_expense` | p_printing_order_id uuid, p_actor_id uuid | uuid | ⚠️ có |
| `upsert_vendor_expense` | p_work_task_id uuid, p_actor_id uuid | uuid | ⚠️ có |

## Gallery

| Hàm | Tham số | Trả về | SECURITY DEFINER |
|---|---|---|---|
| `get_gallery_data_v2` | p_gallery_id uuid, p_limit integer, p_offset integer | jsonb |  |
| `get_gallery_data_v2` | p_gallery_id uuid | jsonb |  |
| `get_gallery_data_v3` | p_gallery_id uuid, p_limit integer, p_offset integer | jsonb |  |
| `prepare_gallery_share` | p_gallery_id uuid, p_user_id uuid | jsonb | ⚠️ có |
| `set_gallery_password` | p_gallery_id uuid, p_password text | jsonb | ⚠️ có |
| `verify_gallery_password` | p_gallery_id uuid, p_password text | boolean | ⚠️ có |

## Váy cưới

| Hàm | Tham số | Trả về | SECURITY DEFINER |
|---|---|---|---|
| `cancel_dress_rental_atomic` | p_rental_id uuid, p_user_id uuid | jsonb |  |
| `create_standalone_dress_rental_atomic` | p_item_id uuid, p_contract_id uuid, p_customer_name text, p_phone text, p_pickup_date date, p_return_date date | jsonb |  |
| `delete_dress_atomic` | p_dress_id uuid, p_user_id uuid | jsonb |  |
| `dress_list` | p_search text, p_category text, p_status text, p_sort text, p_page integer, p_limit integer | jsonb |  |
| `dress_rental_list` | p_status text, p_search text, p_page integer, p_limit integer, p_item_id uuid | jsonb |  |
| `dress_stats` | — | jsonb |  |
| `expire_old_reservations` | — | integer |  |
| `is_dress_available` | p_dress_id uuid, p_start_date date, p_end_date date, p_exclude_reservation_id uuid, p_exclude_rental_id uuid | boolean |  |
| `mark_dress_cleaned_atomic` | p_dress_id uuid, p_user_id uuid | jsonb |  |
| `refresh_dress_status` | p_dress_id uuid | void | ⚠️ có |
| `refresh_dress_status_atomic` | p_dress_id uuid, p_user_id uuid | jsonb |  |
| `release_dress_reservation_atomic` | p_reservation_id uuid, p_user_id uuid | jsonb |  |
| `return_dress_rental_atomic` | p_rental_id uuid, p_return_condition text, p_damage_fee numeric, p_deposit_returned boolean, p_notes text, p_u | jsonb |  |
| `start_dress_rental_atomic` | p_rental_id uuid, p_user_id uuid | jsonb |  |
| `trg_refresh_dress_status_from_rental` | — | trigger | ⚠️ có |
| `trg_refresh_dress_status_from_reservation` | — | trigger | ⚠️ có |
| `update_dress_reservation_status_atomic` | p_reservation_id uuid, p_status text, p_user_id uuid | jsonb |  |

## Vật tư

| Hàm | Tham số | Trả về | SECURITY DEFINER |
|---|---|---|---|
| `check_inventory_conflict` | p_item_id uuid, p_start_date date, p_end_date date, p_exclude_reservation_id uuid | boolean | ⚠️ có |
| `inventory_detail_v2` | p_item_id uuid | jsonb | ⚠️ có |
| `inventory_item_transaction_totals` | p_item_id uuid | jsonb |  |
| `inventory_list` | p_search text, p_category text, p_status text, p_sort text, p_page integer, p_limit integer | jsonb |  |
| `inventory_stats` | — | jsonb |  |
| `inventory_stock_in_atomic` | p_item_id uuid, p_quantity integer, p_unit_cost numeric, p_supplier text, p_reason text, p_notes text, p_user_ | jsonb |  |
| `inventory_stock_out_atomic` | p_item_id uuid, p_quantity integer, p_contract_id uuid, p_reason text, p_customer_name text, p_customer_phone  | jsonb |  |
| `nextval_inventory_code` | — | text |  |
| `restore_inventory_from_transaction` | p_source_type text, p_source_id uuid, p_reason text, p_actor_id uuid | void |  |

## In ấn & Lab

| Hàm | Tham số | Trả về | SECURITY DEFINER |
|---|---|---|---|
| `create_printing_order_atomic` | p_order jsonb, p_actor_id uuid | jsonb | ⚠️ có |
| `delete_printing_order_atomic` | p_order_id uuid, p_actor_id uuid | jsonb | ⚠️ có |
| `get_printing_cost_stats` | — | TABLE(total_cost numeric, unpaid_cost numeric) | ⚠️ có |
| `nextval_printing_order_code` | — | text | ⚠️ có |
| `printing_integrity_report` | — | TABLE(check_name text, issue_count bigint) | ⚠️ có |
| `printing_items_total` | p_items jsonb | numeric |  |
| `printing_lab_overview` | — | TABLE(id uuid, lab_name text, contact_person text, phone tex | ⚠️ có |
| `printing_stats` | — | TABLE(total bigint, cho_xu_ly bigint, dat_coc bigint, dang_i | ⚠️ có |
| `update_printing_order_atomic` | p_order_id uuid, p_order jsonb, p_expected_updated_at timestamp with time zone, p_actor_id uuid | jsonb | ⚠️ có |

## Nhân sự

| Hàm | Tham số | Trả về | SECURITY DEFINER |
|---|---|---|---|
| `employee_stats` | — | TABLE(total bigint, active bigint, inactive bigint, departme |  |
| `get_current_employee_id` | — | uuid | ⚠️ có |
| `get_current_employee_role` | — | employee_role_enum | ⚠️ có |
| `get_employee_job_details` | p_employee_id uuid, p_start_date date, p_end_date date | TABLE(contract_id uuid, contract_code text, client_name text | ⚠️ có |
| `get_employee_productivity` | p_start_date date, p_end_date date | TABLE(employee_id uuid, full_name text, role employee_role_e | ⚠️ có |
| `get_my_employee_job_details` | p_start_date date, p_end_date date | TABLE(contract_id uuid, contract_code text, client_name text | ⚠️ có |
| `get_my_employee_productivity` | p_start_date date, p_end_date date | TABLE(employee_id uuid, full_name text, role employee_role_e | ⚠️ có |
| `is_active_employee` | — | boolean | ⚠️ có |
| `next_employee_code` | — | text |  |

## Báo cáo & dashboard

| Hàm | Tham số | Trả về | SECURITY DEFINER |
|---|---|---|---|
| `dashboard_critical_kpis` | p_month integer, p_year integer | TABLE(current_revenue numeric, previous_revenue numeric, tot |  |
| `dashboard_service_breakdown` | p_month integer, p_year integer, p_can_view_financials boolean | TABLE(service_type text, contract_count bigint, revenue nume |  |
| `get_crm_customer_stats` | — | json | ⚠️ có |
| `get_crm_lead_stats` | — | json | ⚠️ có |
| `run_integrity_scan` | — | void | ⚠️ có |

## CRM

| Hàm | Tham số | Trả về | SECURITY DEFINER |
|---|---|---|---|
| `convert_lead_to_customer` | p_lead_id uuid | jsonb | ⚠️ có |
| `get_customer_ltv` | p_ids uuid[] | TABLE(customer_id uuid, ltv numeric) | ⚠️ có |
| `nextval_customer_code` | — | bigint | ⚠️ có |

## Dịch vụ

| Hàm | Tham số | Trả về | SECURITY DEFINER |
|---|---|---|---|
| `delete_service_atomic` | p_actor_id uuid, p_service_id uuid | jsonb | ⚠️ có |
| `save_service_atomic` | p_actor_id uuid, p_service jsonb, p_bundle_items jsonb, p_expected_updated_at timestamp with time zone | jsonb | ⚠️ có |

## Lịch

| Hàm | Tham số | Trả về | SECURITY DEFINER |
|---|---|---|---|
| `calendar_month_events` | p_month integer, p_year integer | TABLE(event_source text, id uuid, event_type text, event_dat |  |

## Khác

| Hàm | Tham số | Trả về | SECURITY DEFINER |
|---|---|---|---|
| `add_fulfillment_transaction_atomic` | p_parent_txn_id uuid, p_new_item_id uuid, p_quantity integer, p_sale_unit_price numeric, p_payment_method paym | jsonb | ⚠️ có |
| `append_care_log` | p_lead_id uuid, p_content text, p_type text | jsonb | ⚠️ có |
| `delete_fulfillment_transaction_atomic` | p_txn_id uuid, p_user_id uuid | jsonb | ⚠️ có |
| `emit_realtime_signal` | — | trigger | ⚠️ có |
| `handle_new_user` | — | trigger | ⚠️ có |
| `is_period_locked` | p_date date | boolean |  |
| `log_audit_action` | — | trigger | ⚠️ có |
| `rls_auto_enable` | — | event_trigger | ⚠️ có |
| `sync_ai_conversation_message_count` | — | trigger | ⚠️ có |
| `update_fulfillment_transaction_atomic` | p_txn_id uuid, p_new_quantity integer, p_new_unit_price numeric, p_user_id uuid | jsonb | ⚠️ có |
| `update_updated_at_column` | — | trigger |  |

## View

- `employees_public` (view)
- `inventory_available_stock` (view)
- `order_payment_summary` (view)
- `payment_plan_states` (view)

## Enum

| Enum | Giá trị |
|---|---|
| `addon_category_enum` | makeup  ·  trang_phuc  ·  phu_kien  ·  them_gio  ·  khac |
| `approval_status_enum` | pending  ·  approved  ·  rejected |
| `employee_role_enum` | admin  ·  manager  ·  sale  ·  media  ·  ctv |
| `event_type_enum` | chuan_bi  ·  ngay_chup  ·  ngay_to_chuc  ·  hau_ky  ·  giao_san_pham |
| `export_type_enum` | xuat_ban  ·  xuat_thue |
| `gender_enum` | nam  ·  nu  ·  khac |
| `item_type_enum` | dich_vu  ·  san_pham  ·  trang_phuc  ·  phat_sinh |
| `lead_potential_enum` | hot  ·  warm  ·  cold |
| `lead_status_enum` | moi  ·  da_lien_he  ·  hen_gap  ·  da_bao_gia  ·  da_chot  ·  huy |
| `log_source_enum` | trigger  ·  server_action  ·  frontend  ·  system |
| `log_type_enum` | EVENT_CHANGE  ·  ASSIGNMENT  ·  CONFLICT  ·  ERROR  ·  GENERAL |
| `payment_method_enum` | tien_mat  ·  chuyen_khoan |
| `service_type_enum` | studio  ·  ngay_cuoi  ·  combo  ·  baby  ·  gia_dinh  ·  sinh_nhat  ·  bau  ·  concept  ·  couple  ·  ky_yeu  ·  media  ·  khac  ·  outsource |
| `severity_enum` | INFO  ·  WARNING  ·  ERROR  ·  CRITICAL |
| `transaction_type_enum` | hop_dong  ·  hoa_don |
| `work_type_enum` | concept  ·  kich_ban  ·  chup_anh  ·  quay_phim  ·  makeup  ·  tro_ly  ·  cameraman  ·  hau_ky_anh  ·  dung_phim  ·  retouch  ·  premiere  ·  bien_tap  ·  khac |