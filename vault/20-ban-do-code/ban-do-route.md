---
title: "Bản đồ route → action → bảng"
tags: [ban-do-code, route]
sinh-tu: "scripts/vault-gen-codemap.mjs (đi theo import graph)"
cap-nhat: 2026-08-07
---

# Bản đồ route → action → bảng

60 trang · 25 API route · 89 file server action

> Cột **Bảng/RPC** là *tất cả* bảng chạm được qua đồ thị import (kể cả gián tiếp qua component con), nên rộng hơn cái route thật sự dùng. Dùng để **khoanh vùng ảnh hưởng**, không phải để kết luận "route này chỉ đọc bảng X".

## `/account-disabled`

### 📄 `/account-disabled`
`app/account-disabled/page.tsx`

- **Action:** `auth.ts`
- **Bảng:** `login_attempts`
- **Component:** 1

## `/admin`

### 📄 `/admin/backfill-dimensions`
`app/(protected)/admin/backfill-dimensions/page.tsx`

- **Action:** `gallery-dimensions-actions.ts`
- **Bảng:** `employees` · `galleries` · `gallery_images`
- **Component:** 2

### 📄 `/admin/vendors`
`app/(protected)/admin/vendors/page.tsx`

- **Action:** `vendor-actions.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `employees` · `vendor_payments` · `vendors` · `work_tasks`
- **Component:** 5

## `/api/auth`

### 🔌 `/api/auth/callback`
`app/api/auth/callback/route.ts`

- **Component:** 0

### 🔌 `/api/auth/google`
`app/api/auth/google/route.ts`

- **Bảng:** `employees`
- **Component:** 0

### 🔌 `/api/auth/google/callback`
`app/api/auth/google/callback/route.ts`

- **Action:** `lib/audit.ts`
- **Bảng:** `audit_logs` · `employees` · `studio_info`
- **Component:** 0

## `/api/calendar`

### 🔌 `/api/calendar/sync-worker`
`app/api/calendar/sync-worker/route.ts`

- **Bảng:** `google_sync_queue` · `schedules` · `studio_info`
- **Component:** 0

## `/api/contracts`

### 🔌 `/api/contracts/[id]/prefetch`
`app/api/contracts/[id]/prefetch/route.ts`

- **Action:** `contract-queries.ts` · `user-management.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `contract_checklists` · `contract_events` · `contract_notes` · `contracts` · `customers` · `employees` · `finance_monthly_closes` · `payment_plans` · `payments` · `work_tasks`
- **RPC:** `contract_stats` · `contract_stats_simple` · `get_contract_list_v2` · `is_period_locked`
- **Component:** 1

## `/api/drive-download`

### 🔌 `/api/drive-download/[fileId]`
`app/api/drive-download/[fileId]/route.ts`

- **Component:** 0

## `/api/e2e`

### 🔌 `/api/e2e/login`
`app/api/e2e/login/route.ts`

- **Component:** 0

## `/api/gallery-download`

### 🔌 `/api/gallery-download/[token]/[imageId]`
`app/api/gallery-download/[token]/[imageId]/route.ts`

- **Action:** `gallery-actions.ts` · `gallery-admin-actions.ts` · `gallery-core.ts` · `gallery-public-actions.ts` · `gallery-selection-actions.ts`
- **Bảng:** `contracts` · `employees` · `galleries` · `gallery_filter_jobs` · `gallery_images` · `gallery_password_attempts` · `gallery_reactions` · `gallery_selection_batch_items` · `gallery_selection_batches` · `gallery_share_links`
- **RPC:** `get_gallery_summaries_by_contract` · `prepare_gallery_share` · `set_gallery_password` · `verify_gallery_password`
- **Component:** 0

## `/api/gallery-download-batch`

### 🔌 `/api/gallery-download-batch/[token]`
`app/api/gallery-download-batch/[token]/route.ts`

- **Action:** `gallery-actions.ts` · `gallery-admin-actions.ts` · `gallery-core.ts` · `gallery-public-actions.ts` · `gallery-selection-actions.ts`
- **Bảng:** `contracts` · `employees` · `galleries` · `gallery_filter_jobs` · `gallery_images` · `gallery_password_attempts` · `gallery_reactions` · `gallery_selection_batch_items` · `gallery_selection_batches` · `gallery_share_links`
- **RPC:** `get_gallery_summaries_by_contract` · `prepare_gallery_share` · `set_gallery_password` · `verify_gallery_password`
- **Component:** 0

## `/api/monitoring`

### 🔌 `/api/monitoring/web-vitals`
`app/api/monitoring/web-vitals/route.ts`

- **Component:** 0

## `/api/moodie`

### 🔌 `/api/moodie/attachments`
`app/api/moodie/attachments/route.ts`

- **Component:** 0

### 🔌 `/api/moodie/audio/transcription`
`app/api/moodie/audio/transcription/route.ts`

- **Bảng:** `system_settings`
- **Component:** 0

### 🔌 `/api/moodie/memory/maintenance`
`app/api/moodie/memory/maintenance/route.ts`

- **Action:** `user-management.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `employees` · `moodie_memories` · `moodie_memory_relations` · `moodie_observations` · `system_settings`
- **RPC:** `finalize_moodie_memory_consolidation` · `maintain_moodie_memory_lifecycle` · `match_moodie_memories`
- **Component:** 0

### 🔌 `/api/moodie/messages/stream`
`app/api/moodie/messages/stream/route.ts`

- **Action:** `calendar-queries.ts` · `finance-dashboard-queries.ts` · `finance-operations-queries.ts` · `finance-reports-queries.ts` · `moodie-mutations.ts` · `user-management.ts` · `lib/audit.ts`
- **Bảng:** `ai_conversations` · `ai_messages` · `ai_turns` · `audit_logs` · `contract_events` · `contract_items` · `contracts` · `credit_cards` · `debts` · `employee_salaries` · `employees` · `expenses` · `finance_monthly_closes` · `financial_goals` · `fixed_costs` · `galleries` · `gallery_images` · `goal_contributions` · `inventory_transactions` · `investments` · `monthly_salaries` · `moodie_agent_run_events` · `moodie_agent_runs` · `moodie_brave_audit_events` · `moodie_brave_usage_daily` · `moodie_memories` · `moodie_memory_relations` · `moodie_message_feedback` · `moodie_observations` · `payments` · `printing_orders` · `receipts` · `schedules` · `services` · `studio_info` · `system_settings` · `transaction_categories` · `work_tasks`
- **RPC:** `calendar_month_events` · `claim_moodie_agent_run` · `finance_contract_profit_report` · `finance_dashboard_metrics` · `finance_debt_stats` · `finance_expense_stats` · `finance_lab_debt_summary` · `finance_ledger` · `finance_ledger_range` · `finance_receipt_document_stats` · `finance_receipt_documents` · `finance_reports_snapshot` · `finance_revenue_by_month` · `finance_service_distribution` · `finish_moodie_agent_run` · `heartbeat_moodie_agent_run` · `is_period_locked` · `match_moodie_memories` · `retry_moodie_agent_run`
- **Storage bucket:** `moodie-attachments`
- **Component:** 1

### 🔌 `/api/moodie/provider/config`
`app/api/moodie/provider/config/route.ts`

- **Action:** `moodie-provider-actions.ts` · `user-management.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `employees` · `moodie_brave_audit_events` · `moodie_brave_usage_daily` · `system_settings`
- **Component:** 0

### 🔌 `/api/moodie/runs`
`app/api/moodie/runs/route.ts`

- **Bảng:** `moodie_agent_run_events` · `moodie_agent_runs`
- **Component:** 0

### 🔌 `/api/moodie/runs/[runId]/cancel`
`app/api/moodie/runs/[runId]/cancel/route.ts`

- **Bảng:** `moodie_agent_run_events` · `moodie_agent_runs`
- **Component:** 0

### 🔌 `/api/moodie/runs/[runId]/confirm`
`app/api/moodie/runs/[runId]/confirm/route.ts`

- **Bảng:** `moodie_agent_run_events` · `moodie_agent_runs`
- **Component:** 0

### 🔌 `/api/moodie/runs/[runId]/retry`
`app/api/moodie/runs/[runId]/retry/route.ts`

- **Action:** `calendar-queries.ts` · `finance-dashboard-queries.ts` · `finance-operations-queries.ts` · `finance-reports-queries.ts` · `user-management.ts` · `lib/audit.ts`
- **Bảng:** `ai_conversations` · `ai_messages` · `audit_logs` · `contract_events` · `contract_items` · `contracts` · `credit_cards` · `debts` · `employee_salaries` · `employees` · `expenses` · `finance_monthly_closes` · `financial_goals` · `fixed_costs` · `galleries` · `gallery_images` · `goal_contributions` · `inventory_transactions` · `investments` · `monthly_salaries` · `moodie_agent_run_events` · `moodie_agent_runs` · `moodie_brave_audit_events` · `moodie_brave_usage_daily` · `moodie_memories` · `moodie_memory_relations` · `moodie_observations` · `payments` · `printing_orders` · `receipts` · `schedules` · `services` · `studio_info` · `system_settings` · `transaction_categories` · `work_tasks`
- **RPC:** `calendar_month_events` · `claim_moodie_agent_run` · `finance_contract_profit_report` · `finance_dashboard_metrics` · `finance_debt_stats` · `finance_expense_stats` · `finance_lab_debt_summary` · `finance_ledger` · `finance_ledger_range` · `finance_receipt_document_stats` · `finance_receipt_documents` · `finance_reports_snapshot` · `finance_revenue_by_month` · `finance_service_distribution` · `finish_moodie_agent_run` · `heartbeat_moodie_agent_run` · `is_period_locked` · `match_moodie_memories` · `retry_moodie_agent_run`
- **Storage bucket:** `moodie-attachments`
- **Component:** 1

### 🔌 `/api/moodie/runs/worker`
`app/api/moodie/runs/worker/route.ts`

- **Action:** `calendar-queries.ts` · `finance-dashboard-queries.ts` · `finance-operations-queries.ts` · `finance-reports-queries.ts` · `user-management.ts` · `lib/audit.ts`
- **Bảng:** `ai_conversations` · `ai_messages` · `audit_logs` · `contract_events` · `contract_items` · `contracts` · `credit_cards` · `debts` · `employee_salaries` · `employees` · `expenses` · `finance_monthly_closes` · `financial_goals` · `fixed_costs` · `galleries` · `gallery_images` · `goal_contributions` · `inventory_transactions` · `investments` · `monthly_salaries` · `moodie_agent_run_events` · `moodie_agent_runs` · `moodie_brave_audit_events` · `moodie_brave_usage_daily` · `moodie_memories` · `moodie_memory_relations` · `moodie_observations` · `payments` · `printing_orders` · `receipts` · `schedules` · `services` · `studio_info` · `system_settings` · `transaction_categories` · `work_tasks`
- **RPC:** `calendar_month_events` · `claim_moodie_agent_run` · `finance_contract_profit_report` · `finance_dashboard_metrics` · `finance_debt_stats` · `finance_expense_stats` · `finance_lab_debt_summary` · `finance_ledger` · `finance_ledger_range` · `finance_receipt_document_stats` · `finance_receipt_documents` · `finance_reports_snapshot` · `finance_revenue_by_month` · `finance_service_distribution` · `finish_moodie_agent_run` · `heartbeat_moodie_agent_run` · `is_period_locked` · `match_moodie_memories` · `retry_moodie_agent_run`
- **Storage bucket:** `moodie-attachments`
- **Component:** 1

### 🔌 `/api/moodie/voice/ask`
`app/api/moodie/voice/ask/route.ts`

- **Action:** `calendar-queries.ts` · `finance-dashboard-queries.ts` · `finance-operations-queries.ts` · `finance-reports-queries.ts` · `moodie-mutations.ts` · `user-management.ts` · `lib/audit.ts`
- **Bảng:** `ai_conversations` · `ai_messages` · `ai_turns` · `audit_logs` · `contract_events` · `contract_items` · `contracts` · `credit_cards` · `debts` · `employee_salaries` · `employees` · `expenses` · `finance_monthly_closes` · `financial_goals` · `fixed_costs` · `galleries` · `gallery_images` · `goal_contributions` · `inventory_transactions` · `investments` · `monthly_salaries` · `moodie_agent_run_events` · `moodie_agent_runs` · `moodie_brave_audit_events` · `moodie_brave_usage_daily` · `moodie_memories` · `moodie_memory_relations` · `moodie_message_feedback` · `moodie_observations` · `payments` · `printing_orders` · `receipts` · `schedules` · `services` · `studio_info` · `system_settings` · `transaction_categories` · `work_tasks`
- **RPC:** `calendar_month_events` · `claim_moodie_agent_run` · `finance_contract_profit_report` · `finance_dashboard_metrics` · `finance_debt_stats` · `finance_expense_stats` · `finance_lab_debt_summary` · `finance_ledger` · `finance_ledger_range` · `finance_receipt_document_stats` · `finance_receipt_documents` · `finance_reports_snapshot` · `finance_revenue_by_month` · `finance_service_distribution` · `finish_moodie_agent_run` · `heartbeat_moodie_agent_run` · `is_period_locked` · `match_moodie_memories` · `retry_moodie_agent_run`
- **Storage bucket:** `moodie-attachments`
- **Component:** 1

### 🔌 `/api/moodie/voice/events`
`app/api/moodie/voice/events/route.ts`

- **Action:** `user-management.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `employees` · `moodie_memories` · `moodie_memory_relations` · `moodie_voice_events` · `moodie_voice_sessions` · `moodie_voice_turns` · `system_settings`
- **RPC:** `match_moodie_memories`
- **Component:** 0

### 🔌 `/api/moodie/voice/token`
`app/api/moodie/voice/token/route.ts`

- **Action:** `user-management.ts` · `lib/audit.ts`
- **Bảng:** `ai_conversations` · `audit_logs` · `employees` · `moodie_memories` · `moodie_memory_relations` · `moodie_observations` · `moodie_voice_events` · `moodie_voice_sessions` · `system_settings`
- **RPC:** `match_moodie_memories`
- **Component:** 0

## `/api/push`

### 🔌 `/api/push/send`
`app/api/push/send/route.ts`

- **Action:** `lib/audit.ts`
- **Bảng:** `audit_logs` · `push_subscriptions`
- **Component:** 0

### 🔌 `/api/push/subscribe`
`app/api/push/subscribe/route.ts`

- **Bảng:** `push_subscriptions`
- **Component:** 0

## `/audit-logs`

### 📄 `/audit-logs`
`app/(protected)/audit-logs/page.tsx`

- **Action:** `audit-log-actions.ts`
- **Bảng:** `audit_logs` · `employees`
- **Component:** 8

## `/calendar`

### 📄 `/calendar`
`app/(protected)/calendar/page.tsx`

- **Action:** `calendar-mutations.ts` · `calendar-queries.ts` · `calendar-task-actions.ts` · `user-management.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `contract_events` · `employees` · `finance_monthly_closes` · `google_sync_queue` · `schedules` · `studio_info` · `work_tasks`
- **RPC:** `calendar_month_events` · `is_period_locked`
- **Component:** 32

## `/contracts`

### 📄 `/contracts`
`app/(protected)/contracts/page.tsx`

- **Action:** `checklist-actions.ts` · `contract-event-actions.ts` · `contract-mutations.ts` · `contract-queries.ts` · `employee-queries.ts` · `gallery-actions.ts` · `gallery-admin-actions.ts` · `gallery-core.ts` · `gallery-drive-actions.ts` · `gallery-public-actions.ts` · `gallery-selection-actions.ts` · `note-actions.ts` · `user-management.ts` · `vendor-actions.ts` · `lib/audit.ts`
- **Bảng:** `addon_history` · `audit_logs` · `checklist_templates` · `contract_checklists` · `contract_events` · `contract_items` · `contract_notes` · `contracts` · `customers` · `dress_reservations` · `dresses` · `employees` · `employees_public` · `event_templates` · `finance_monthly_closes` · `galleries` · `gallery_filter_jobs` · `gallery_images` · `gallery_password_attempts` · `gallery_reactions` · `gallery_selection_batch_items` · `gallery_selection_batches` · `gallery_share_links` · `payment_plans` · `payments` · `studio_info` · `vendor_payments` · `vendors` · `work_tasks`
- **RPC:** `contract_stats` · `contract_stats_simple` · `employee_stats` · `get_contract_list_v2` · `get_gallery_summaries_by_contract` · `is_period_locked` · `next_employee_code` · `prepare_gallery_share` · `save_contract_atomic` · `set_gallery_password` · `verify_gallery_password`
- **Component:** 34

### 📄 `/contracts/[id]`
`app/(protected)/contracts/[id]/page.tsx`

- **Action:** `checklist-actions.ts` · `contract-event-actions.ts` · `contract-lifecycle.ts` · `contract-mutations.ts` · `contract-queries.ts` · `contract-refund-actions.ts` · `dress-mutations.ts` · `dress-queries.ts` · `employee-queries.ts` · `gallery-actions.ts` · `gallery-admin-actions.ts` · `gallery-core.ts` · `gallery-drive-actions.ts` · `gallery-public-actions.ts` · `gallery-selection-actions.ts` · `lab-queries.ts` · `note-actions.ts` · `payment-actions.ts` · `printing-actions.ts` · `printing-mutations.ts` · `printing-reference-queries.ts` · `task-overlap-actions.ts` · `user-management.ts` · `vendor-actions.ts` · `work-task-actions.ts` · `lib/audit.ts`
- **Bảng:** `addon_history` · `audit_logs` · `checklist_templates` · `contract_checklists` · `contract_events` · `contract_items` · `contract_notes` · `contracts` · `customers` · `dress_rentals` · `dress_reservations` · `dresses` · `employees` · `employees_public` · `event_templates` · `expenses` · `finance_monthly_closes` · `galleries` · `gallery_filter_jobs` · `gallery_images` · `gallery_password_attempts` · `gallery_reactions` · `gallery_selection_batch_items` · `gallery_selection_batches` · `gallery_share_links` · `lab_payment_allocations` · `lab_payments` · `lab_services` · `labs` · `payment_plans` · `payments` · `printing_order_status_history` · `printing_orders` · `studio_info` · `transaction_categories` · `vendor_payments` · `vendors` · `work_tasks`
- **RPC:** `cancel_contract_cascade` · `contract_stats` · `contract_stats_simple` · `create_dress_contract_reservation_atomic` · `create_printing_order_atomic` · `delete_contract_cascade` · `delete_dress_atomic` · `delete_printing_order_atomic` · `dress_list` · `dress_stats` · `employee_stats` · `finance_lab_debt_summary` · `get_contract_list_v2` · `get_gallery_summaries_by_contract` · `is_dress_available` · `is_period_locked` · `next_employee_code` · `prepare_gallery_share` · `printing_lab_overview` · `process_contract_payment_v2` · `recalc_contract_totals` · `refresh_dress_status_atomic` · `release_dress_reservation_atomic` · `save_contract_atomic` · `set_gallery_password` · `update_dress_reservation_status_atomic` · `update_printing_order_atomic` · `upsert_vendor_expense` · `verify_gallery_password` · `void_contract_payment_v2`
- **Storage bucket:** `dresses`
- **Component:** 48

### 📄 `/contracts/[id]/edit`
`app/(protected)/contracts/[id]/edit/page.tsx`

- **Action:** `addon-actions.ts` · `category-actions.ts` · `checklist-actions.ts` · `contract-event-actions.ts` · `contract-mutations.ts` · `contract-queries.ts` · `customer-actions.ts` · `employee-queries.ts` · `user-management.ts` · `vendor-actions.ts` · `lib/audit.ts`
- **Bảng:** `addon_history` · `audit_logs` · `checklist_templates` · `contract_checklists` · `contract_events` · `contract_items` · `contract_notes` · `contracts` · `customers` · `dress_reservations` · `dresses` · `employees` · `employees_public` · `event_templates` · `finance_monthly_closes` · `payment_plans` · `payments` · `service_categories` · `services` · `studio_info` · `vendor_payments` · `vendors` · `work_tasks`
- **RPC:** `contract_stats` · `contract_stats_simple` · `employee_stats` · `get_contract_list_v2` · `get_crm_customer_stats` · `is_period_locked` · `next_employee_code` · `nextval_customer_code` · `save_contract_atomic` · `save_service_atomic`
- **Component:** 35

### 📄 `/contracts/[id]/gallery`
`app/(protected)/contracts/[id]/gallery/page.tsx`

- **Action:** `gallery-actions.ts` · `gallery-admin-actions.ts` · `gallery-album-actions.ts` · `gallery-composite-actions.ts` · `gallery-core.ts` · `gallery-drive-actions.ts` · `gallery-image-helpers.ts` · `gallery-public-actions.ts` · `gallery-reaction-actions.ts` · `gallery-selection-actions.ts`
- **Bảng:** `contract_events` · `contracts` · `employees` · `galleries` · `gallery_albums` · `gallery_comments` · `gallery_filter_jobs` · `gallery_images` · `gallery_password_attempts` · `gallery_reactions` · `gallery_selection_batch_items` · `gallery_selection_batches` · `gallery_share_links` · `studio_info`
- **RPC:** `get_gallery_summaries_by_contract` · `prepare_gallery_share` · `set_gallery_password` · `verify_gallery_password`
- **Component:** 30

### 📄 `/contracts/[id]/print`
`app/(protected)/contracts/[id]/print/page.tsx`

- **Action:** `contract-queries.ts` · `settings-queries.ts` · `user-management.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `contract_checklists` · `contract_events` · `contract_notes` · `contracts` · `customers` · `employees` · `finance_monthly_closes` · `notification_preferences` · `payment_plans` · `payments` · `studio_info` · `system_settings` · `work_tasks`
- **RPC:** `contract_stats` · `contract_stats_simple` · `get_contract_list_v2` · `is_period_locked`
- **Component:** 4

### 📄 `/contracts/create`
`app/(protected)/contracts/create/page.tsx`

- **Action:** `addon-actions.ts` · `category-actions.ts` · `checklist-actions.ts` · `contract-event-actions.ts` · `contract-mutations.ts` · `contract-queries.ts` · `customer-actions.ts` · `employee-queries.ts` · `user-management.ts` · `vendor-actions.ts` · `lib/audit.ts`
- **Bảng:** `addon_history` · `audit_logs` · `checklist_templates` · `contract_checklists` · `contract_events` · `contract_items` · `contract_notes` · `contracts` · `customers` · `dress_reservations` · `dresses` · `employees` · `employees_public` · `event_templates` · `finance_monthly_closes` · `payment_plans` · `payments` · `service_categories` · `services` · `studio_info` · `vendor_payments` · `vendors` · `work_tasks`
- **RPC:** `contract_stats` · `contract_stats_simple` · `employee_stats` · `get_contract_list_v2` · `get_crm_customer_stats` · `is_period_locked` · `next_employee_code` · `nextval_customer_code` · `save_contract_atomic` · `save_service_atomic`
- **Component:** 35

## `/crm`

### 📄 `/crm`
`app/(protected)/crm/page.tsx`

- **Action:** `dashboard-events.ts` · `employee-queries.ts` · `lead-actions.ts` · `lead-lifecycle.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `contract_events` · `contracts` · `crm_leads` · `customers` · `employees` · `finance_monthly_closes` · `payment_plans` · `payments` · `receipts` · `schedules` · `work_tasks`
- **RPC:** `append_care_log` · `convert_lead_to_customer` · `dashboard_critical_kpis` · `dashboard_revenue_chart` · `dashboard_service_breakdown` · `employee_stats` · `get_crm_lead_stats` · `is_period_locked` · `next_employee_code`
- **Component:** 45

### 📄 `/crm/customers`
`app/(protected)/crm/customers/page.tsx`

- **Action:** `customer-actions.ts` · `dashboard-events.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `contract_events` · `contracts` · `customers` · `employees` · `finance_monthly_closes` · `payment_plans` · `payments` · `receipts` · `schedules` · `work_tasks`
- **RPC:** `dashboard_critical_kpis` · `dashboard_revenue_chart` · `dashboard_service_breakdown` · `get_crm_customer_stats` · `is_period_locked` · `nextval_customer_code`
- **Component:** 34

### 📄 `/crm/customers/[id]`
`app/(protected)/crm/customers/[id]/page.tsx`

- **Action:** `customer-actions.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `contracts` · `customers` · `employees`
- **RPC:** `get_crm_customer_stats` · `nextval_customer_code`
- **Component:** 19

### 📄 `/crm/leads`
`app/(protected)/crm/leads/page.tsx`

- **Action:** `dashboard-events.ts` · `employee-queries.ts` · `lead-actions.ts` · `lead-lifecycle.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `contract_events` · `contracts` · `crm_leads` · `customers` · `employees` · `finance_monthly_closes` · `payment_plans` · `payments` · `receipts` · `schedules` · `work_tasks`
- **RPC:** `append_care_log` · `convert_lead_to_customer` · `dashboard_critical_kpis` · `dashboard_revenue_chart` · `dashboard_service_breakdown` · `employee_stats` · `get_crm_lead_stats` · `is_period_locked` · `next_employee_code`
- **Component:** 45

## `/dashboard`

### 📄 `/dashboard`
`app/(protected)/dashboard/page.tsx`

- **Action:** `dashboard-cache.ts`
- **Bảng:** `contract_events` · `contracts` · `employees` · `finance_monthly_closes` · `payment_plans` · `payments` · `receipts` · `schedules` · `work_tasks`
- **RPC:** `dashboard_critical_kpis` · `dashboard_revenue_chart` · `dashboard_service_breakdown` · `is_period_locked`
- **Component:** 11

## `/dresses`

### 📄 `/dresses`
`app/(protected)/dresses/page.tsx`

- **Action:** `dress-mutations.ts` · `dress-queries.ts` · `rental-mutations.ts` · `rental-queries.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `contract_items` · `dress_rentals` · `dress_reservations` · `dresses` · `employees` · `galleries` · `gallery_images`
- **RPC:** `cancel_dress_rental_atomic` · `create_dress_contract_reservation_atomic` · `create_standalone_dress_rental_atomic` · `delete_dress_atomic` · `dress_list` · `dress_rental_list` · `dress_stats` · `is_dress_available` · `mark_dress_cleaned_atomic` · `recalc_contract_totals` · `refresh_dress_status_atomic` · `release_dress_reservation_atomic` · `return_dress_rental_atomic` · `start_dress_rental_atomic` · `update_dress_reservation_status_atomic`
- **Storage bucket:** `dresses`
- **Component:** 31

### 📄 `/dresses/rentals`
`app/(protected)/dresses/rentals/page.tsx`

- **Action:** `rental-mutations.ts` · `rental-queries.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `dress_rentals` · `dress_reservations` · `dresses` · `employees`
- **RPC:** `cancel_dress_rental_atomic` · `create_standalone_dress_rental_atomic` · `dress_rental_list` · `mark_dress_cleaned_atomic` · `refresh_dress_status_atomic` · `return_dress_rental_atomic` · `start_dress_rental_atomic`
- **Component:** 19

## `/employees`

### 📄 `/employees`
`app/(protected)/employees/page.tsx`

- **Action:** `contract-queries.ts` · `employee-mutations.ts` · `employee-queries.ts` · `user-management.ts` · `vendor-actions.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `contract_checklists` · `contract_events` · `contract_notes` · `contracts` · `customers` · `employees` · `employees_public` · `finance_monthly_closes` · `payment_plans` · `payments` · `vendor_payments` · `vendors` · `work_tasks`
- **RPC:** `contract_stats` · `contract_stats_simple` · `employee_stats` · `get_contract_list_v2` · `is_period_locked` · `next_employee_code`
- **Component:** 30

### 📄 `/employees/[id]`
`app/(protected)/employees/[id]/page.tsx`

- **Action:** `contract-queries.ts` · `employee-mutations.ts` · `employee-queries.ts` · `user-management.ts` · `vendor-actions.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `contract_checklists` · `contract_events` · `contract_notes` · `contracts` · `customers` · `employees` · `employees_public` · `finance_monthly_closes` · `payment_plans` · `payments` · `vendor_payments` · `vendors` · `work_tasks`
- **RPC:** `contract_stats` · `contract_stats_simple` · `employee_stats` · `get_contract_list_v2` · `is_period_locked` · `next_employee_code`
- **Component:** 15

## `/finance`

### 📄 `/finance`
`app/(protected)/finance/page.tsx`

- **Action:** `finance-dashboard-queries.ts` · `finance-intelligence-queries.ts` · `user-management.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `contract_items` · `contracts` · `employees` · `expenses` · `finance_monthly_closes` · `inventory_transactions` · `payments` · `printing_orders` · `receipts` · `work_tasks`
- **RPC:** `finance_contract_profit_report` · `finance_dashboard_metrics` · `finance_ledger` · `finance_ledger_range` · `finance_revenue_by_month` · `finance_service_distribution` · `get_budget_vs_actual` · `get_cashflow_forecast` · `get_expense_breakdown` · `get_finance_advanced_intelligence` · `get_finance_intelligence` · `get_receivable_aging` · `is_period_locked`
- **Component:** 38

### 📄 `/finance/budget`
`app/(protected)/finance/budget/page.tsx`

- **Action:** `contract-queries.ts` · `employee-queries.ts` · `goal-budget-actions.ts` · `user-management.ts` · `vendor-actions.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `budgets` · `contract_checklists` · `contract_events` · `contract_notes` · `contracts` · `customers` · `employees` · `employees_public` · `expenses` · `finance_monthly_closes` · `financial_goals` · `goal_contributions` · `payment_plans` · `payments` · `transaction_categories` · `vendor_payments` · `vendors` · `work_tasks`
- **RPC:** `contract_stats` · `contract_stats_simple` · `contribute_to_goal` · `employee_stats` · `get_contract_list_v2` · `is_period_locked` · `next_employee_code` · `undo_contribution_atomic`
- **Component:** 15

### 📄 `/finance/cashflow`
`app/(protected)/finance/cashflow/page.tsx`

- **Action:** `finance-dashboard-queries.ts` · `user-management.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `contract_items` · `contracts` · `employees` · `expenses` · `finance_monthly_closes` · `inventory_transactions` · `payments` · `printing_orders` · `receipts` · `work_tasks`
- **RPC:** `finance_contract_profit_report` · `finance_dashboard_metrics` · `finance_ledger` · `finance_ledger_range` · `finance_revenue_by_month` · `finance_service_distribution` · `is_period_locked`
- **Component:** 12

### 📄 `/finance/categories`
`app/(protected)/finance/categories/page.tsx`

- **Action:** `finance-category-actions.ts` · `finance-operations-queries.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `contracts` · `credit_cards` · `debts` · `employee_salaries` · `employees` · `expenses` · `finance_monthly_closes` · `financial_goals` · `fixed_costs` · `goal_contributions` · `investments` · `monthly_salaries` · `payments` · `receipts` · `transaction_categories`
- **RPC:** `finance_debt_stats` · `finance_expense_stats` · `finance_lab_debt_summary` · `finance_receipt_document_stats` · `finance_receipt_documents` · `is_period_locked`
- **Component:** 15

### 📄 `/finance/closes`
`app/(protected)/finance/closes/page.tsx`

- **Action:** `finance-close-actions.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `employees` · `expenses` · `finance_close_tasks` · `finance_monthly_closes` · `fixed_costs` · `monthly_salaries` · `payments` · `receipts`
- **RPC:** `advance_close_task` · `is_period_locked`
- **Component:** 21

### 📄 `/finance/closes/[id]`
`app/(protected)/finance/closes/[id]/page.tsx`

- **Action:** `finance-close-actions.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `employees` · `expenses` · `finance_close_tasks` · `finance_monthly_closes` · `fixed_costs` · `monthly_salaries` · `payments` · `receipts`
- **RPC:** `advance_close_task` · `is_period_locked`
- **Component:** 4

### 📄 `/finance/dashboard`
`app/(protected)/finance/dashboard/page.tsx`

- **Action:** `finance-dashboard-queries.ts` · `finance-intelligence-queries.ts` · `user-management.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `contract_items` · `contracts` · `employees` · `expenses` · `finance_monthly_closes` · `inventory_transactions` · `payments` · `printing_orders` · `receipts` · `work_tasks`
- **RPC:** `finance_contract_profit_report` · `finance_dashboard_metrics` · `finance_ledger` · `finance_ledger_range` · `finance_revenue_by_month` · `finance_service_distribution` · `get_budget_vs_actual` · `get_cashflow_forecast` · `get_expense_breakdown` · `get_finance_advanced_intelligence` · `get_finance_intelligence` · `get_receivable_aging` · `is_period_locked`
- **Component:** 22

### 📄 `/finance/debts`
`app/(protected)/finance/debts/page.tsx`

- **Action:** `contract-queries.ts` · `debt-actions.ts` · `employee-queries.ts` · `finance-operations-queries.ts` · `integrity-actions.ts` · `settings-queries.ts` · `user-management.ts` · `vendor-actions.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `contract_checklists` · `contract_events` · `contract_notes` · `contracts` · `credit_cards` · `customers` · `debts` · `employee_salaries` · `employees` · `employees_public` · `expenses` · `finance_monthly_closes` · `financial_goals` · `fixed_costs` · `goal_contributions` · `integrity_reports` · `investments` · `monthly_salaries` · `notification_preferences` · `payment_plans` · `payments` · `receipts` · `studio_info` · `system_settings` · `transaction_categories` · `vendor_payments` · `vendors` · `work_tasks`
- **RPC:** `contract_stats` · `contract_stats_simple` · `employee_stats` · `finance_debt_stats` · `finance_expense_stats` · `finance_lab_debt_summary` · `finance_receipt_document_stats` · `finance_receipt_documents` · `get_contract_list_v2` · `is_period_locked` · `next_employee_code` · `run_integrity_scan`
- **Component:** 32

### 📄 `/finance/expenses`
`app/(protected)/finance/expenses/page.tsx`

- **Action:** `contract-queries.ts` · `employee-queries.ts` · `expense-actions.ts` · `finance-operations-queries.ts` · `settings-queries.ts` · `user-management.ts` · `vendor-actions.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `contract_checklists` · `contract_events` · `contract_notes` · `contracts` · `credit_cards` · `customers` · `debts` · `employee_salaries` · `employees` · `employees_public` · `expenses` · `finance_monthly_closes` · `financial_goals` · `fixed_costs` · `goal_contributions` · `investments` · `monthly_salaries` · `notification_preferences` · `payment_plans` · `payments` · `receipts` · `studio_info` · `system_settings` · `transaction_categories` · `vendor_payments` · `vendors` · `work_tasks`
- **RPC:** `contract_stats` · `contract_stats_simple` · `employee_stats` · `finance_debt_stats` · `finance_expense_stats` · `finance_lab_debt_summary` · `finance_receipt_document_stats` · `finance_receipt_documents` · `get_contract_list_v2` · `is_period_locked` · `next_employee_code`
- **Component:** 32

### 📄 `/finance/expenses/[id]`
`app/(protected)/finance/expenses/[id]/page.tsx`

- **Action:** `finance-operations-queries.ts` · `settings-queries.ts` · `user-management.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `contracts` · `credit_cards` · `debts` · `employee_salaries` · `employees` · `expenses` · `finance_monthly_closes` · `financial_goals` · `fixed_costs` · `goal_contributions` · `investments` · `monthly_salaries` · `notification_preferences` · `payments` · `receipts` · `studio_info` · `system_settings` · `transaction_categories`
- **RPC:** `finance_debt_stats` · `finance_expense_stats` · `finance_lab_debt_summary` · `finance_receipt_document_stats` · `finance_receipt_documents` · `is_period_locked`
- **Component:** 2

### 📄 `/finance/expenses/[id]/print`
`app/(protected)/finance/expenses/[id]/print/page.tsx`

- **Action:** `finance-operations-queries.ts` · `settings-queries.ts` · `user-management.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `contracts` · `credit_cards` · `debts` · `employee_salaries` · `employees` · `expenses` · `finance_monthly_closes` · `financial_goals` · `fixed_costs` · `goal_contributions` · `investments` · `monthly_salaries` · `notification_preferences` · `payments` · `receipts` · `studio_info` · `system_settings` · `transaction_categories`
- **RPC:** `finance_debt_stats` · `finance_expense_stats` · `finance_lab_debt_summary` · `finance_receipt_document_stats` · `finance_receipt_documents` · `is_period_locked`
- **Component:** 3

### 📄 `/finance/fixed-costs`
`app/(protected)/finance/fixed-costs/page.tsx`

- **Action:** `contract-queries.ts` · `employee-queries.ts` · `expense-actions.ts` · `finance-operations-queries.ts` · `fixed-cost-actions.ts` · `user-management.ts` · `vendor-actions.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `contract_checklists` · `contract_events` · `contract_notes` · `contracts` · `credit_cards` · `customers` · `debts` · `employee_salaries` · `employees` · `employees_public` · `expenses` · `finance_monthly_closes` · `financial_goals` · `fixed_costs` · `goal_contributions` · `investments` · `monthly_salaries` · `payment_plans` · `payments` · `receipts` · `transaction_categories` · `vendor_payments` · `vendors` · `work_tasks`
- **RPC:** `contract_stats` · `contract_stats_simple` · `employee_stats` · `finance_debt_stats` · `finance_expense_stats` · `finance_lab_debt_summary` · `finance_receipt_document_stats` · `finance_receipt_documents` · `get_contract_list_v2` · `is_period_locked` · `next_employee_code`
- **Component:** 13

### 📄 `/finance/goals`
`app/(protected)/finance/goals/page.tsx`

- **Action:** `contract-queries.ts` · `employee-queries.ts` · `finance-operations-queries.ts` · `goal-budget-actions.ts` · `user-management.ts` · `vendor-actions.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `budgets` · `contract_checklists` · `contract_events` · `contract_notes` · `contracts` · `credit_cards` · `customers` · `debts` · `employee_salaries` · `employees` · `employees_public` · `expenses` · `finance_monthly_closes` · `financial_goals` · `fixed_costs` · `goal_contributions` · `investments` · `monthly_salaries` · `payment_plans` · `payments` · `receipts` · `transaction_categories` · `vendor_payments` · `vendors` · `work_tasks`
- **RPC:** `contract_stats` · `contract_stats_simple` · `contribute_to_goal` · `employee_stats` · `finance_debt_stats` · `finance_expense_stats` · `finance_lab_debt_summary` · `finance_receipt_document_stats` · `finance_receipt_documents` · `get_contract_list_v2` · `is_period_locked` · `next_employee_code` · `undo_contribution_atomic`
- **Component:** 31

### 📄 `/finance/investments`
`app/(protected)/finance/investments/page.tsx`

- **Action:** `contract-queries.ts` · `employee-queries.ts` · `finance-operations-queries.ts` · `investment-actions.ts` · `user-management.ts` · `vendor-actions.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `contract_checklists` · `contract_events` · `contract_notes` · `contracts` · `credit_cards` · `customers` · `debts` · `employee_salaries` · `employees` · `employees_public` · `expenses` · `finance_monthly_closes` · `financial_goals` · `fixed_costs` · `goal_contributions` · `investment_maintenance_logs` · `investments` · `monthly_salaries` · `payment_plans` · `payments` · `receipts` · `transaction_categories` · `vendor_payments` · `vendors` · `work_tasks`
- **RPC:** `contract_stats` · `contract_stats_simple` · `employee_stats` · `finance_debt_stats` · `finance_expense_stats` · `finance_lab_debt_summary` · `finance_receipt_document_stats` · `finance_receipt_documents` · `get_contract_list_v2` · `is_period_locked` · `next_employee_code`
- **Component:** 25

### 📄 `/finance/lab-debts`
`app/(protected)/finance/lab-debts/page.tsx`

- **Action:** `finance-operations-queries.ts` · `lab-mutations.ts` · `lab-queries.ts` · `printing-reference-queries.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `contracts` · `credit_cards` · `debts` · `employee_salaries` · `employees` · `expenses` · `finance_monthly_closes` · `financial_goals` · `fixed_costs` · `goal_contributions` · `investments` · `lab_payment_allocations` · `lab_payments` · `lab_services` · `labs` · `monthly_salaries` · `payments` · `printing_orders` · `receipts` · `transaction_categories`
- **RPC:** `finance_debt_stats` · `finance_expense_stats` · `finance_lab_debt_summary` · `finance_receipt_document_stats` · `finance_receipt_documents` · `is_period_locked` · `printing_lab_overview` · `record_lab_payment_atomic`
- **Component:** 16

### 📄 `/finance/receipts`
`app/(protected)/finance/receipts/page.tsx`

- **Action:** `contract-queries.ts` · `employee-queries.ts` · `finance-operations-queries.ts` · `inventory-queries.ts` · `payment-actions.ts` · `receipt-actions.ts` · `settings-queries.ts` · `user-management.ts` · `vendor-actions.ts` · `lib/audit.ts`
- **Bảng:** `approval_requests` · `audit_logs` · `contract_checklists` · `contract_events` · `contract_notes` · `contracts` · `credit_cards` · `customers` · `debts` · `employee_salaries` · `employees` · `employees_public` · `expenses` · `finance_monthly_closes` · `financial_goals` · `fixed_costs` · `goal_contributions` · `inventory_items` · `inventory_transactions` · `investments` · `monthly_salaries` · `notification_preferences` · `payment_plans` · `payments` · `receipts` · `studio_info` · `system_settings` · `transaction_categories` · `vendor_payments` · `vendors` · `work_tasks`
- **RPC:** `contract_stats` · `contract_stats_simple` · `create_sale_receipt_atomic` · `employee_stats` · `finance_debt_stats` · `finance_expense_stats` · `finance_lab_debt_summary` · `finance_receipt_document_stats` · `finance_receipt_documents` · `get_contract_list_v2` · `inventory_detail_v2` · `inventory_item_transaction_totals` · `inventory_list` · `inventory_stats` · `is_period_locked` · `next_employee_code` · `nextval_inventory_code` · `process_contract_payment_v2` · `void_contract_payment_v2`
- **Component:** 36

### 📄 `/finance/receipts/[id]`
`app/(protected)/finance/receipts/[id]/page.tsx`

- **Action:** `finance-operations-queries.ts` · `settings-queries.ts` · `user-management.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `contracts` · `credit_cards` · `debts` · `employee_salaries` · `employees` · `expenses` · `finance_monthly_closes` · `financial_goals` · `fixed_costs` · `goal_contributions` · `investments` · `monthly_salaries` · `notification_preferences` · `payments` · `receipts` · `studio_info` · `system_settings` · `transaction_categories`
- **RPC:** `finance_debt_stats` · `finance_expense_stats` · `finance_lab_debt_summary` · `finance_receipt_document_stats` · `finance_receipt_documents` · `is_period_locked`
- **Component:** 2

### 📄 `/finance/receipts/[id]/print`
`app/(protected)/finance/receipts/[id]/print/page.tsx`

- **Action:** `finance-operations-queries.ts` · `settings-queries.ts` · `user-management.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `contracts` · `credit_cards` · `debts` · `employee_salaries` · `employees` · `expenses` · `finance_monthly_closes` · `financial_goals` · `fixed_costs` · `goal_contributions` · `investments` · `monthly_salaries` · `notification_preferences` · `payments` · `receipts` · `studio_info` · `system_settings` · `transaction_categories`
- **RPC:** `finance_debt_stats` · `finance_expense_stats` · `finance_lab_debt_summary` · `finance_receipt_document_stats` · `finance_receipt_documents` · `is_period_locked`
- **Component:** 3

### 📄 `/finance/salaries`
`app/(protected)/finance/salaries/page.tsx`

- **Action:** `contract-queries.ts` · `employee-queries.ts` · `finance-operations-queries.ts` · `salary-actions.ts` · `user-management.ts` · `vendor-actions.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `contract_checklists` · `contract_events` · `contract_notes` · `contracts` · `credit_cards` · `customers` · `debts` · `employee_salaries` · `employees` · `employees_public` · `expenses` · `finance_monthly_closes` · `financial_goals` · `fixed_costs` · `goal_contributions` · `investments` · `monthly_salaries` · `payment_plans` · `payments` · `receipts` · `salary_adjustments` · `transaction_categories` · `vendor_payments` · `vendors` · `work_tasks`
- **RPC:** `contract_stats` · `contract_stats_simple` · `employee_stats` · `finance_debt_stats` · `finance_expense_stats` · `finance_lab_debt_summary` · `finance_receipt_document_stats` · `finance_receipt_documents` · `get_contract_list_v2` · `is_period_locked` · `next_employee_code`
- **Component:** 31

### 📄 `/finance/vendor-debts`
`app/(protected)/finance/vendor-debts/page.tsx`

- **Action:** `contract-queries.ts` · `employee-queries.ts` · `user-management.ts` · `vendor-actions.ts` · `vendor-payment-actions.ts` · `vendor-reports-queries.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `contract_checklists` · `contract_events` · `contract_notes` · `contracts` · `customers` · `employees` · `employees_public` · `finance_monthly_closes` · `payment_plans` · `payments` · `vendor_payment_allocations` · `vendor_payments` · `vendors` · `work_tasks`
- **RPC:** `contract_stats` · `contract_stats_simple` · `employee_stats` · `finance_vendor_debt_summary` · `get_contract_list_v2` · `is_period_locked` · `next_employee_code` · `record_vendor_payment_atomic`
- **Component:** 29

## `/forgot-password`

### 📄 `/forgot-password`
`app/forgot-password/page.tsx`

- **Action:** `password-recovery.ts`
- **Component:** 4

## `/gallery`

### 📄 `/gallery/[accessUrl]`
`app/gallery/[accessUrl]/page.tsx`

- **Action:** `gallery-actions.ts` · `gallery-admin-actions.ts` · `gallery-album-actions.ts` · `gallery-composite-actions.ts` · `gallery-core.ts` · `gallery-masonry-layout.ts` · `gallery-public-actions.ts` · `gallery-reaction-actions.ts` · `gallery-selection-actions.ts`
- **Bảng:** `employees` · `galleries` · `gallery_albums` · `gallery_comments` · `gallery_filter_jobs` · `gallery_images` · `gallery_password_attempts` · `gallery_reactions` · `gallery_selection_batch_items` · `gallery_selection_batches` · `gallery_share_links`
- **RPC:** `get_gallery_summaries_by_contract` · `prepare_gallery_share` · `set_gallery_password` · `verify_gallery_password`
- **Component:** 15

## `/inventory`

### 📄 `/inventory`
`app/(protected)/inventory/page.tsx`

- **Action:** `contract-queries.ts` · `employee-queries.ts` · `inventory-mutations.ts` · `inventory-queries.ts` · `user-management.ts` · `vendor-actions.ts` · `lib/audit.ts`
- **Bảng:** `approval_requests` · `audit_logs` · `contract_checklists` · `contract_events` · `contract_notes` · `contracts` · `customers` · `employees` · `employees_public` · `finance_monthly_closes` · `inventory_items` · `inventory_transactions` · `notification_queue` · `payment_plans` · `payments` · `vendor_payments` · `vendors` · `work_tasks`
- **RPC:** `add_fulfillment_transaction_atomic` · `contract_stats` · `contract_stats_simple` · `create_contract_inventory_addon_sale_atomic` · `create_sale_receipt_atomic` · `delete_fulfillment_transaction_atomic` · `employee_stats` · `get_contract_list_v2` · `inventory_detail_v2` · `inventory_item_transaction_totals` · `inventory_list` · `inventory_stats` · `inventory_stock_in_atomic` · `inventory_stock_out_atomic` · `is_period_locked` · `next_employee_code` · `nextval_inventory_code` · `update_fulfillment_transaction_atomic`
- **Component:** 35

### 📄 `/inventory/[id]`
`app/(protected)/inventory/[id]/page.tsx`

- **Action:** `contract-queries.ts` · `employee-queries.ts` · `inventory-mutations.ts` · `inventory-queries.ts` · `user-management.ts` · `vendor-actions.ts` · `lib/audit.ts`
- **Bảng:** `approval_requests` · `audit_logs` · `contract_checklists` · `contract_events` · `contract_notes` · `contracts` · `customers` · `employees` · `employees_public` · `finance_monthly_closes` · `inventory_items` · `inventory_transactions` · `notification_queue` · `payment_plans` · `payments` · `vendor_payments` · `vendors` · `work_tasks`
- **RPC:** `add_fulfillment_transaction_atomic` · `contract_stats` · `contract_stats_simple` · `create_contract_inventory_addon_sale_atomic` · `create_sale_receipt_atomic` · `delete_fulfillment_transaction_atomic` · `employee_stats` · `get_contract_list_v2` · `inventory_detail_v2` · `inventory_item_transaction_totals` · `inventory_list` · `inventory_stats` · `inventory_stock_in_atomic` · `inventory_stock_out_atomic` · `is_period_locked` · `next_employee_code` · `nextval_inventory_code` · `update_fulfillment_transaction_atomic`
- **Component:** 19

## `/login`

### 📄 `/login`
`app/login/page.tsx`

- **Action:** `auth.ts`
- **Bảng:** `login_attempts`
- **Component:** 5

## `/moodie`

### 📄 `/moodie`
`app/(protected)/moodie/page.tsx`

- **Action:** `calendar-queries.ts` · `finance-dashboard-queries.ts` · `finance-operations-queries.ts` · `finance-reports-queries.ts` · `gallery-actions.ts` · `gallery-admin-actions.ts` · `gallery-core.ts` · `gallery-public-actions.ts` · `gallery-selection-actions.ts` · `moodie-action-actions.ts` · `moodie-memory-actions.ts` · `moodie-mutations.ts` · `moodie-queries.ts` · `user-management.ts` · `lib/audit.ts`
- **Bảng:** `ai_conversations` · `ai_messages` · `ai_turns` · `audit_logs` · `contract_events` · `contract_items` · `contracts` · `credit_cards` · `debts` · `employee_salaries` · `employees` · `expenses` · `finance_monthly_closes` · `financial_goals` · `fixed_costs` · `galleries` · `gallery_filter_jobs` · `gallery_images` · `gallery_password_attempts` · `gallery_reactions` · `gallery_selection_batch_items` · `gallery_selection_batches` · `gallery_share_links` · `goal_contributions` · `google_sync_queue` · `inventory_transactions` · `investments` · `monthly_salaries` · `moodie_action_approvals` · `moodie_agent_run_events` · `moodie_agent_runs` · `moodie_brave_audit_events` · `moodie_brave_usage_daily` · `moodie_memories` · `moodie_memory_relations` · `moodie_message_feedback` · `moodie_observations` · `payments` · `printing_orders` · `receipts` · `schedules` · `services` · `studio_info` · `system_settings` · `transaction_categories` · `work_tasks`
- **RPC:** `calendar_month_events` · `claim_moodie_agent_run` · `finance_contract_profit_report` · `finance_dashboard_metrics` · `finance_debt_stats` · `finance_expense_stats` · `finance_lab_debt_summary` · `finance_ledger` · `finance_ledger_range` · `finance_receipt_document_stats` · `finance_receipt_documents` · `finance_reports_snapshot` · `finance_revenue_by_month` · `finance_service_distribution` · `finish_moodie_agent_run` · `get_gallery_summaries_by_contract` · `heartbeat_moodie_agent_run` · `is_period_locked` · `match_moodie_memories` · `prepare_gallery_share` · `retry_moodie_agent_run` · `set_gallery_password` · `verify_gallery_password`
- **Storage bucket:** `moodie-attachments`
- **Component:** 36

## `/offline`

### 📄 `/offline`
`app/offline/page.tsx`

- **Component:** 2

## `/page.tsx`

### 📄 `/page.tsx`
`app/page.tsx`

- **Component:** 0

## `/printing`

### 📄 `/printing`
`app/(protected)/printing/page.tsx`

- **Action:** `contract-queries.ts` · `employee-queries.ts` · `inventory-queries.ts` · `lab-mutations.ts` · `lab-queries.ts` · `printing-mutations.ts` · `printing-queries.ts` · `printing-reference-queries.ts` · `printing-workflow-mutations.ts` · `user-management.ts` · `vendor-actions.ts` · `lib/audit.ts`
- **Bảng:** `approval_requests` · `audit_logs` · `contract_checklists` · `contract_events` · `contract_notes` · `contracts` · `customers` · `employees` · `employees_public` · `expenses` · `finance_monthly_closes` · `inventory_available_stock` · `inventory_items` · `inventory_reservations` · `inventory_transactions` · `lab_payment_allocations` · `lab_payments` · `lab_services` · `labs` · `order_payment_summary` · `order_payments` · `payment_plans` · `payments` · `printing_order_status_history` · `printing_orders` · `receipts` · `vendor_payments` · `vendors` · `work_tasks`
- **RPC:** `contract_stats` · `contract_stats_simple` · `create_printing_order_atomic` · `delete_printing_order_atomic` · `employee_stats` · `finance_lab_debt_summary` · `get_contract_list_v2` · `increment_inventory_stock` · `inventory_detail_v2` · `inventory_item_transaction_totals` · `inventory_list` · `inventory_stats` · `is_period_locked` · `next_employee_code` · `nextval_inventory_code` · `printing_lab_overview` · `printing_stats` · `record_lab_payment_atomic` · `update_printing_order_atomic`
- **Component:** 36

### 📄 `/printing/labs`
`app/(protected)/printing/labs/page.tsx`

- **Action:** `lab-mutations.ts` · `lab-queries.ts` · `printing-reference-queries.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `contracts` · `employees` · `lab_payment_allocations` · `lab_payments` · `lab_services` · `labs` · `printing_orders`
- **RPC:** `finance_lab_debt_summary` · `printing_lab_overview` · `record_lab_payment_atomic`
- **Component:** 25

## `/productivity`

### 📄 `/productivity`
`app/(protected)/productivity/page.tsx`

- **Action:** `productivity-actions.ts` · `user-management.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `employees` · `studio_info`
- **RPC:** `get_employee_job_details` · `get_employee_productivity` · `get_my_employee_job_details` · `get_my_employee_productivity`
- **Component:** 24

## `/reports`

### 📄 `/reports`
`app/(protected)/reports/page.tsx`

- **Action:** `finance-cashflow-timeline.ts` · `finance-dashboard-queries.ts` · `finance-operations-queries.ts` · `finance-reports-queries.ts` · `user-management.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `contract_items` · `contracts` · `credit_cards` · `debts` · `employee_salaries` · `employees` · `expenses` · `finance_monthly_closes` · `financial_goals` · `fixed_costs` · `goal_contributions` · `inventory_transactions` · `investments` · `monthly_salaries` · `payments` · `printing_orders` · `receipts` · `transaction_categories` · `work_tasks`
- **RPC:** `finance_cashflow_timeline` · `finance_contract_profit_report` · `finance_dashboard_metrics` · `finance_debt_stats` · `finance_expense_stats` · `finance_lab_debt_summary` · `finance_ledger` · `finance_ledger_range` · `finance_receipt_document_stats` · `finance_receipt_documents` · `finance_reports_snapshot` · `finance_revenue_by_month` · `finance_service_distribution` · `is_period_locked`
- **Component:** 37

## `/reset-password`

### 📄 `/reset-password`
`app/reset-password/page.tsx`

- **Component:** 4

## `/services`

### 📄 `/services`
`app/(protected)/services/page.tsx`

- **Action:** `category-actions.ts` · `contract-queries.ts` · `employee-queries.ts` · `service-queries.ts` · `settings-queries.ts` · `user-management.ts` · `vendor-actions.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `contract_checklists` · `contract_events` · `contract_notes` · `contracts` · `customers` · `dresses` · `employees` · `employees_public` · `finance_monthly_closes` · `notification_preferences` · `payment_plans` · `payments` · `service_bundles` · `service_categories` · `services` · `studio_info` · `system_settings` · `vendor_payments` · `vendors` · `work_tasks`
- **RPC:** `contract_stats` · `contract_stats_simple` · `employee_stats` · `get_contract_list_v2` · `is_period_locked` · `next_employee_code` · `save_service_atomic`
- **Component:** 21

### 📄 `/services/[id]`
`app/(protected)/services/[id]/page.tsx`

- **Action:** `builder-actions.ts` · `category-actions.ts` · `contract-queries.ts` · `employee-queries.ts` · `service-mutations.ts` · `service-queries.ts` · `user-management.ts` · `vendor-actions.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `contract_checklists` · `contract_events` · `contract_notes` · `contracts` · `customers` · `dresses` · `employees` · `employees_public` · `finance_monthly_closes` · `payment_plans` · `payments` · `price_rules` · `service_bundles` · `service_categories` · `service_relations` · `services` · `vendor_payments` · `vendors` · `work_tasks`
- **RPC:** `contract_stats` · `contract_stats_simple` · `delete_service_atomic` · `employee_stats` · `get_contract_list_v2` · `is_period_locked` · `next_employee_code` · `save_service_atomic`
- **Component:** 28

### 📄 `/services/[id]/quote`
`app/(protected)/services/[id]/quote/page.tsx`

- **Action:** `service-queries.ts` · `settings-queries.ts` · `user-management.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `employees` · `notification_preferences` · `service_bundles` · `service_categories` · `services` · `studio_info` · `system_settings`
- **Component:** 2

### 📄 `/services/create`
`app/(protected)/services/create/page.tsx`

- **Action:** `builder-actions.ts` · `category-actions.ts` · `contract-queries.ts` · `employee-queries.ts` · `service-mutations.ts` · `service-queries.ts` · `user-management.ts` · `vendor-actions.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `contract_checklists` · `contract_events` · `contract_notes` · `contracts` · `customers` · `dresses` · `employees` · `employees_public` · `finance_monthly_closes` · `payment_plans` · `payments` · `price_rules` · `service_bundles` · `service_categories` · `service_relations` · `services` · `vendor_payments` · `vendors` · `work_tasks`
- **RPC:** `contract_stats` · `contract_stats_simple` · `delete_service_atomic` · `employee_stats` · `get_contract_list_v2` · `is_period_locked` · `next_employee_code` · `save_service_atomic`
- **Component:** 28

## `/settings`

### 📄 `/settings`
`app/(protected)/settings/page.tsx`

- **Action:** `notification-actions.ts` · `profile-actions.ts` · `settings-queries.ts` · `user-management.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `employees` · `notification_preferences` · `notification_queue` · `studio_info` · `system_settings`
- **Storage bucket:** `avatars`
- **Component:** 15

### 📄 `/settings/credit-cards`
`app/(protected)/settings/credit-cards/page.tsx`

- **Action:** `debt-actions.ts` · `finance-operations-queries.ts` · `lib/audit.ts`
- **Bảng:** `audit_logs` · `contracts` · `credit_cards` · `debts` · `employee_salaries` · `employees` · `expenses` · `finance_monthly_closes` · `financial_goals` · `fixed_costs` · `goal_contributions` · `investments` · `monthly_salaries` · `payments` · `receipts` · `transaction_categories`
- **RPC:** `finance_debt_stats` · `finance_expense_stats` · `finance_lab_debt_summary` · `finance_receipt_document_stats` · `finance_receipt_documents` · `is_period_locked`
- **Component:** 8

### 📄 `/settings/studio`
`app/(protected)/settings/studio/page.tsx`

- **Action:** `calendar-queries.ts` · `finance-dashboard-queries.ts` · `finance-operations-queries.ts` · `finance-reports-queries.ts` · `moodie-benchmark-actions.ts` · `moodie-provider-actions.ts` · `settings-mutations.ts` · `settings-queries.ts` · `user-management.ts` · `lib/audit.ts`
- **Bảng:** `ai_conversations` · `ai_messages` · `audit_logs` · `contract_events` · `contract_items` · `contracts` · `credit_cards` · `debts` · `employee_salaries` · `employees` · `expenses` · `finance_monthly_closes` · `financial_goals` · `fixed_costs` · `galleries` · `gallery_images` · `goal_contributions` · `inventory_transactions` · `investments` · `monthly_salaries` · `moodie_agent_run_events` · `moodie_agent_runs` · `moodie_brave_audit_events` · `moodie_brave_usage_daily` · `moodie_memories` · `moodie_memory_relations` · `moodie_observations` · `notification_preferences` · `payments` · `printing_orders` · `receipts` · `schedules` · `services` · `studio_info` · `system_settings` · `transaction_categories` · `work_tasks`
- **RPC:** `calendar_month_events` · `claim_moodie_agent_run` · `finance_contract_profit_report` · `finance_dashboard_metrics` · `finance_debt_stats` · `finance_expense_stats` · `finance_lab_debt_summary` · `finance_ledger` · `finance_ledger_range` · `finance_receipt_document_stats` · `finance_receipt_documents` · `finance_reports_snapshot` · `finance_revenue_by_month` · `finance_service_distribution` · `finish_moodie_agent_run` · `heartbeat_moodie_agent_run` · `is_period_locked` · `match_moodie_memories` · `retry_moodie_agent_run`
- **Storage bucket:** `moodie-attachments` · `studio-assets`
- **Component:** 18
