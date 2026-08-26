---
title: "Server action → bảng/RPC"
tags: [ban-do-code, server-action]
sinh-tu: "scripts/vault-gen-codemap.mjs"
cap-nhat: 2026-08-07
---

# Server action → bảng/RPC

87 file. Chỉ liệt kê truy cập DB **viết trực tiếp trong file đó** (không đi theo import).

| File | Bảng | RPC |
|---|---|---|
| `addon-actions.ts` | `addon_history` |  |
| `audit-log-actions.ts` | `audit_logs` |  |
| `auth.ts` | `login_attempts` |  |
| `blurhash-actions.ts` | `gallery_images` |  |
| `builder-actions.ts` | `service_relations` `price_rules` |  |
| `calendar-mutations.ts` | `google_sync_queue` `schedules` `work_tasks` |  |
| `calendar-queries.ts` | `schedules` `contract_events` `employees` `studio_info` | `calendar_month_events` |
| `calendar-task-actions.ts` | `work_tasks` `schedules` |  |
| `category-actions.ts` | `service_categories` `services` `dresses` | `save_service_atomic` |
| `checklist-actions.ts` | `contract_checklists` `checklist_templates` |  |
| `contract-event-actions.ts` | `contract_events` `event_templates` `work_tasks` `contracts` |  |
| `contract-lifecycle.ts` | `dress_reservations` `dresses` `contract_items` `contracts` `work_tasks` `payment_plans` `printing_orders` | `cancel_contract_cascade` `delete_contract_cascade` |
| `contract-mutations.ts` | `payments` `contracts` `work_tasks` | `save_contract_atomic` |
| `contract-queries.ts` | `customers` `contracts` `work_tasks` `contract_checklists` `contract_notes` `contract_events` `payment_plans` `payments` | `contract_stats` `get_contract_list_v2` `contract_stats_simple` |
| `contract-refund-actions.ts` | `transaction_categories` `contracts` `expenses` |  |
| `customer-actions.ts` | `customers` `contracts` | `nextval_customer_code` `get_crm_customer_stats` |
| `dashboard-cache.ts` | — | — |
| `dashboard-events.ts` | — | — |
| `debt-actions.ts` | `debts` `receipts` `expenses` `credit_cards` |  |
| `dress-mutations.ts` | `dress_reservations` `dress_rentals` `contract_items` | `refresh_dress_status_atomic` `delete_dress_atomic` `create_dress_contract_reservation_atomic` `recalc_contract_totals` `update_dress_reservation_status_atomic` `release_dress_reservation_atomic` |
| `dress-queries.ts` | `dresses` `dress_reservations` `dress_rentals` | `dress_list` `dress_stats` `is_dress_available` |
| `employee-mutations.ts` | `employees` | `next_employee_code` |
| `employee-queries.ts` | `employees` | `employee_stats` `next_employee_code` |
| `expense-actions.ts` | `expenses` `expense_allocations` `fixed_costs` `transaction_categories` | `recompute_printing_payment_status` |
| `finance-cashflow-timeline.ts` |  | `finance_cashflow_timeline` |
| `finance-category-actions.ts` | `transaction_categories` `receipts` `expenses` |  |
| `finance-close-actions.ts` | `payments` `receipts` `expenses` `monthly_salaries` `fixed_costs` `investments` `finance_monthly_closes` `finance_close_tasks` `employees` | `advance_close_task` |
| `finance-dashboard-queries.ts` | `contracts` `payments` `receipts` `expenses` `contract_items` `work_tasks` `printing_orders` `inventory_transactions` | `finance_month_summary` `finance_service_distribution` `finance_pending_collections` `finance_contract_profit_report` `finance_ledger_range` `finance_ledger` `finance_pnl_by_month` `contract_financials` |
| `finance-intelligence-queries.ts` |  | `get_finance_intelligence` `get_cashflow_forecast` `get_expense_breakdown` `get_receivable_aging` `get_budget_vs_actual` `get_finance_advanced_intelligence` |
| `finance-operations-queries.ts` | `finance_monthly_closes` `transaction_categories` `contracts` `payments` `receipts` `expenses` `debts` `credit_cards` `fixed_costs` `investments` `employee_salaries` `monthly_salaries` `financial_goals` `goal_contributions` | `is_period_locked` `finance_receipt_documents` `finance_receipt_document_stats` `finance_expense_stats` `finance_debt_stats` |
| `finance-reports-queries.ts` | `contracts` `fixed_costs` `monthly_salaries` `payments` `receipts` `expenses` `inventory_transactions` `work_tasks` `printing_orders` | `finance_reports_snapshot` |
| `fixed-cost-actions.ts` | `fixed_costs` |  |
| `gallery-actions.ts` | — | — |
| `gallery-admin-actions.ts` | `galleries` `gallery_images` `gallery_reactions` `gallery_share_links` | `set_gallery_password` `get_gallery_summaries_by_contract` |
| `gallery-album-actions.ts` | `gallery_albums` `gallery_images` |  |
| `gallery-composite-actions.ts` | `gallery_reactions` `gallery_comments` `gallery_albums` `gallery_images` |  |
| `gallery-core.ts` | `gallery_share_links` `galleries` `gallery_images` | `prepare_gallery_share` |
| `gallery-dimensions-actions.ts` | `galleries` |  |
| `gallery-drive-actions.ts` | `galleries` `gallery_images` `contract_events` `contracts` `studio_info` `gallery_reactions` `gallery_filter_jobs` |  |
| `gallery-image-helpers.ts` | `gallery_images` `gallery_reactions` |  |
| `gallery-masonry-layout.ts` | — | — |
| `gallery-public-actions.ts` | `gallery_password_attempts` `galleries` | `verify_gallery_password` |
| `gallery-reaction-actions.ts` | `gallery_reactions` `gallery_comments` `gallery_images` |  |
| `gallery-selection-actions.ts` | `gallery_images` `galleries` `gallery_selection_batches` `gallery_selection_batch_items` |  |
| `goal-budget-actions.ts` | `financial_goals` `goal_contributions` `budgets` `expenses` `transaction_categories` | `contribute_to_goal` `undo_contribution_atomic` |
| `integrity-actions.ts` | `integrity_reports` | `run_integrity_scan` |
| `inventory-mutations.ts` | `inventory_items` `inventory_transactions` `approval_requests` `employees` `notification_queue` | `nextval_inventory_code` `inventory_stock_in_atomic` `inventory_stock_out_atomic` `create_sale_receipt_atomic` `create_contract_inventory_addon_sale_atomic` `add_fulfillment_transaction_atomic` `delete_fulfillment_transaction_atomic` `update_fulfillment_transaction_atomic` |
| `inventory-queries.ts` | `inventory_items` `inventory_transactions` `contracts` `approval_requests` `employees` | `inventory_list` `inventory_detail_v2` `inventory_item_transaction_totals` `inventory_stats` `nextval_inventory_code` |
| `investment-actions.ts` | `investments` `investment_maintenance_logs` |  |
| `lab-mutations.ts` | `labs` `printing_orders` `lab_services` | `record_lab_payment_atomic` |
| `lab-queries.ts` | `labs` `lab_services` `expenses` `printing_orders` `expense_allocations` | `printing_lab_overview` |
| `lead-actions.ts` | `crm_leads` | `get_crm_lead_stats` |
| `lead-lifecycle.ts` | `crm_leads` `customers` | `convert_lead_to_customer` `append_care_log` |
| `moodie-action-actions.ts` | `schedules` `galleries` `moodie_action_approvals` `google_sync_queue` |  |
| `moodie-benchmark-actions.ts` | `audit_logs` |  |
| `moodie-memory-actions.ts` | `moodie_memories` |  |
| `moodie-mutations.ts` | `ai_conversations` `ai_messages` `ai_turns` `moodie_message_feedback` |  |
| `moodie-observability-actions.ts` | `ai_messages` |  |
| `moodie-provider-actions.ts` | `system_settings` |  |
| `moodie-queries.ts` | `ai_conversations` `ai_messages` `ai_turns` |  |
| `note-actions.ts` | `contract_notes` |  |
| `notification-actions.ts` | `employees` `notification_preferences` `notification_queue` |  |
| `password-recovery.ts` | — | — |
| `payable-actions.ts` |  | `finance_payable_summary` `payable_items` `record_payee_payment_atomic` `payee_payment_history` `void_payee_payment_atomic` |
| `payment-actions.ts` | `payment_plans` `transaction_categories` | `process_contract_payment_v2` `void_contract_payment_v2` |
| `printing-actions.ts` | `printing_orders` |  |
| `printing-mutations.ts` | `printing_orders` `printing_order_status_history` | `create_printing_order_atomic` `update_printing_order_atomic` `delete_printing_order_atomic` |
| `printing-queries.ts` | `printing_orders` `contracts` `labs` `expense_allocations` | `printing_stats` |
| `printing-reference-queries.ts` | `contracts` | `finance_lab_debt_summary` |
| `productivity-actions.ts` |  | `get_employee_productivity` `get_my_employee_productivity` `get_my_employee_job_details` `get_employee_job_details` |
| `profile-actions.ts` | `employees` |  |
| `receipt-actions.ts` | `receipts` | `create_sale_receipt_atomic` |
| `rental-mutations.ts` | `dress_reservations` `dress_rentals` `dresses` | `create_standalone_dress_rental_atomic` `start_dress_rental_atomic` `return_dress_rental_atomic` `mark_dress_cleaned_atomic` `cancel_dress_rental_atomic` `refresh_dress_status_atomic` |
| `rental-queries.ts` | `dress_rentals` | `dress_rental_list` |
| `salary-actions.ts` | `salary_adjustments` `employee_salaries` `monthly_salaries` `transaction_categories` `expenses` `employees` `work_tasks` |  |
| `schedule-actions.ts` | `schedules` |  |
| `service-mutations.ts` |  | `save_service_atomic` `delete_service_atomic` |
| `service-queries.ts` | `services` `service_categories` `service_bundles` |  |
| `settings-mutations.ts` | `studio_info` `system_settings` |  |
| `settings-queries.ts` | `notification_preferences` `employees` |  |
| `task-assign-actions.ts` | `employees` `work_tasks` |  |
| `task-overlap-actions.ts` | `work_tasks` |  |
| `user-management.ts` | `employees` |  |
| `vendor-actions.ts` | `vendors` `work_tasks` `expenses` |  |
| `vendor-reports-queries.ts` |  | `vendor_cost_report` |
| `work-task-actions.ts` | `contract_events` `work_tasks` `contracts` |  |
| `lib/audit.ts` | `audit_logs` |  |