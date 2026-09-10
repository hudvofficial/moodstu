---
title: "Kiểm kê — Trang · API · Server Action"
lat-cat: 13-14-giao-dien
cap-nhat: 2026-09-01
trang-thai: sinh-tu-dong
---

> ⚙️ Sinh tự động bằng quét thư mục + regex. ĐỪNG sửa tay.

# Trang · API route · Server action

61 trang · 25 API route · 85 file server action

> ĐÍNH CHÍNH 01/09: edge middleware **CÓ** — tên là `proxy.ts` (chuẩn Next 16): chặn chưa-đăng-nhập, refresh phiên, bơm role header. Cột *Guard* dưới đây là lớp enforce **vai trò** (proxy không chặn vai trò theo route).

## Trang

| Đường dẫn | Guard tìm thấy | Gọi RPC | Chạm bảng trực tiếp |
|---|---|---|---|
| `/(protected)/admin/backfill-dimensions` | — | — | — |
| `/(protected)/admin/vendors` | — | — | — |
| `/(protected)/audit-logs` | — | — | audit_logs |
| `/(protected)/calendar` | — | — | — |
| `/(protected)/contracts/[id]/edit` | — | — | — |
| `/(protected)/contracts/[id]/gallery` | — | — | — |
| `/(protected)/contracts/[id]` | — | — | — |
| `/(protected)/contracts/[id]/print` | — | — | — |
| `/(protected)/contracts/create` | — | — | — |
| `/(protected)/contracts` | — | — | — |
| `/(protected)/crm/customers/[id]` | — | — | — |
| `/(protected)/crm/customers` | — | — | — |
| `/(protected)/crm/leads` | — | — | — |
| `/(protected)/crm` | — | — | — |
| `/(protected)/dashboard` | requireDashboardAccess | — | — |
| `/(protected)/dresses` | — | — | — |
| `/(protected)/dresses/rentals` | — | — | — |
| `/(protected)/employees/[id]` | — | — | — |
| `/(protected)/employees` | — | — | — |
| `/(protected)/finance/budget` | — | — | — |
| `/(protected)/finance/cashflow` | — | — | — |
| `/(protected)/finance/categories` | — | — | — |
| `/(protected)/finance/closes/[id]` | — | — | — |
| `/(protected)/finance/closes` | — | — | — |
| `/(protected)/finance/dashboard` | — | — | — |
| `/(protected)/finance/debts` | — | — | — |
| `/(protected)/finance/expenses/[id]` | — | — | — |
| `/(protected)/finance/expenses/[id]/print` | — | — | — |
| `/(protected)/finance/expenses` | — | — | — |
| `/(protected)/finance/fixed-costs` | — | — | — |
| `/(protected)/finance/goals` | — | — | — |
| `/(protected)/finance/investments` | — | — | — |
| `/(protected)/finance/lab-debts` | — | — | — |
| `/(protected)/finance` | canAccess | — | — |
| `/(protected)/finance/payables` | — | — | — |
| `/(protected)/finance/receipts/[id]` | — | — | — |
| `/(protected)/finance/receipts/[id]/print` | — | — | — |
| `/(protected)/finance/receipts` | — | — | — |
| `/(protected)/finance/salaries` | — | — | — |
| `/(protected)/finance/vendor-debts` | — | — | — |
| `/(protected)/inventory/[id]` | — | — | — |
| `/(protected)/inventory` | — | — | — |
| `/(protected)/moodie` | — | — | — |
| `/(protected)/printing/labs` | — | — | — |
| `/(protected)/printing` | — | — | — |
| `/(protected)/productivity` | — | — | — |
| `/(protected)/reports` | — | — | — |
| `/(protected)/services/[id]` | — | — | — |
| `/(protected)/services/[id]/quote` | — | — | — |
| `/(protected)/services/create` | — | — | — |
| `/(protected)/services` | — | — | — |
| `/(protected)/settings/credit-cards` | — | — | credit_cards |
| `/(protected)/settings` | — | — | — |
| `/(protected)/settings/studio` | — | — | — |
| `/account-disabled` | — | — | — |
| `/forgot-password` | — | — | — |
| `/gallery/[accessUrl]` | — | — | — |
| `/login` | — | — | — |
| `/offline` | — | — | — |
| `/` | — | — | — |
| `/reset-password` | — | — | — |

## API route

| Đường dẫn | Guard tìm thấy | Gọi RPC | Chạm bảng |
|---|---|---|---|
| `/api/auth/callback` | — | — | — |
| `/api/auth/google/callback` | requireSettingsAdminAccess | — | studio_info |
| `/api/auth/google` | requireSettingsAdminAccess | — | — |
| `/api/calendar/sync-worker` | — | — | google_sync_queue, schedules |
| `/api/contracts/[id]/prefetch` | — | — | — |
| `/api/drive-download/[fileId]` | — | — | — |
| `/api/e2e/login` | — | — | — |
| `/api/gallery-download-batch/[token]` | requireContractAccess | — | gallery_images, contracts |
| `/api/gallery-download/[token]/[imageId]` | requireContractAccess | — | gallery_images, contracts |
| `/api/monitoring/web-vitals` | — | — | — |
| `/api/moodie/attachments` | — | — | — |
| `/api/moodie/audio/transcription` | — | — | — |
| `/api/moodie/memory/maintenance` | — | maintain_moodie_memory_lifecycle | — |
| `/api/moodie/messages/stream` | — | — | — |
| `/api/moodie/provider/config` | — | — | — |
| `/api/moodie/runs/[runId]/cancel` | — | — | — |
| `/api/moodie/runs/[runId]/confirm` | — | — | — |
| `/api/moodie/runs/[runId]/retry` | — | — | moodie_agent_runs |
| `/api/moodie/runs` | — | — | moodie_agent_runs, moodie_agent_run_events |
| `/api/moodie/runs/worker` | — | — | — |
| `/api/moodie/voice/ask` | — | — | — |
| `/api/moodie/voice/events` | — | — | moodie_voice_sessions, moodie_voice_turns, moodie_voice_events |
| `/api/moodie/voice/token` | — | — | employees, ai_conversations, moodie_voice_sessions, moodie_voice_events |
| `/api/push/send` | — | — | push_subscriptions |
| `/api/push/subscribe` | — | — | push_subscriptions |

## Server action

| File | Guard | RPC gọi xuống | Bảng chạm trực tiếp |
|---|---|---|---|
| `addon-actions.ts` | withAuth | — | addon_history |
| `audit-log-actions.ts` | withAdmin | — | audit_logs |
| `auth.ts` | — | — | login_attempts |
| `blurhash-actions.ts` | withAdmin, withAuth | — | gallery_images |
| `builder-actions.ts` | — | — | service_relations, price_rules |
| `calendar-mutations.ts` | withAuth, requireCalendarAccess | — | google_sync_queue, schedules, work_tasks |
| `calendar-queries.ts` | withAuth, requireCalendarAccess | calendar_month_events | schedules, contract_events, employees, studio_info |
| `calendar-task-actions.ts` | withAuth, requireCalendarAccess | — | work_tasks, schedules |
| `category-actions.ts` | requireContractAccess, withAuth | save_service_atomic | service_categories, services, dresses |
| `checklist-actions.ts` | requireContractAccess, requireContractWriteAccess, withAuth | — | contract_checklists, checklist_templates |
| `contract-event-actions.ts` | requireContractDestructiveAccess, requireContractWriteAccess, withAuth | — | contract_events, event_templates, work_tasks, contracts |
| `contract-lifecycle.ts` | requireContractDestructiveAccess, withAuth | cancel_contract_cascade, delete_contract_cascade | dress_reservations, dresses, contract_items, contracts, work_tasks +2 |
| `contract-mutations.ts` | requireContractDestructiveAccess, requireContractWriteAccess, withAuth | save_contract_atomic | payments, contracts, work_tasks |
| `contract-queries.ts` | withAuth, requireContractAccess, canAccess | contract_stats, get_contract_list_v2, contract_stats_simple | customers, contracts, work_tasks, contract_checklists, contract_notes +3 |
| `contract-refund-actions.ts` | requireContractDestructiveAccess, requireFinanceAccess, withAuth | — | transaction_categories, contracts, expenses |
| `customer-actions.ts` | withAuth, requireCrmAccess | nextval_customer_code, get_crm_customer_stats | customers, contracts |
| `dashboard-cache.ts` | — | — | — |
| `dashboard-events.ts` | — | — | — |
| `debt-actions.ts` | withAdmin | — | debts, receipts, expenses, credit_cards |
| `dress-mutations.ts` | — | refresh_dress_status_atomic, delete_dress_atomic, create_dress_contract_reservation_atomic, recalc_contract_totals, update_dress_reservation_status_atomic +1 | dresses, dress_reservations, dress_rentals, contract_items |
| `dress-queries.ts` | — | dress_list, dress_stats, is_dress_available | dresses, dress_reservations, dress_rentals |
| `employee-mutations.ts` | requireEmployeesWriteAccess | next_employee_code | employees |
| `employee-queries.ts` | — | employee_stats, next_employee_code | employees |
| `expense-actions.ts` | withAdmin | recompute_printing_payment_status | expenses, expense_allocations, fixed_costs, transaction_categories |
| `finance-cashflow-timeline.ts` | — | finance_cashflow_timeline | — |
| `finance-category-actions.ts` | withAdmin | — | transaction_categories, receipts, expenses |
| `finance-close-actions.ts` | withAdmin | advance_close_task | payments, receipts, expenses, fixed_costs, investments +3 |
| `finance-dashboard-queries.ts` | requireFinanceAccess, withAuth | finance_month_summary, finance_service_distribution, finance_pending_collections, finance_contract_profit_report, finance_ledger_range +3 | contracts, payments, receipts, expenses, contract_items +3 |
| `finance-intelligence-queries.ts` | requireFinanceAccess, withAuth | get_finance_intelligence, get_cashflow_forecast, get_expense_breakdown, get_receivable_aging, get_budget_vs_actual +1 | — |
| `finance-operations-queries.ts` | — | is_period_locked, finance_receipt_documents, finance_receipt_document_stats, finance_expense_stats, finance_debt_stats | finance_monthly_closes, transaction_categories, contracts, payments, receipts +9 |
| `finance-reports-queries.ts` | — | .rpc(
finance_reports_snapshot | contracts, fixed_costs, monthly_salaries, payments, receipts +4 |
| `fixed-cost-actions.ts` | withAdmin | — | fixed_costs |
| `gallery-actions.ts` | — | — | — |
| `gallery-admin-actions.ts` | requireContractAccess, withAuth | set_gallery_password, get_gallery_summaries_by_contract | galleries, gallery_images, gallery_reactions, gallery_share_links |
| `gallery-album-actions.ts` | requireContractAccess, withAuth | — | gallery_albums, gallery_images |
| `gallery-composite-actions.ts` | withAuth, requireContractAccess | — | gallery_reactions, gallery_comments, gallery_albums, gallery_images |
| `gallery-core.ts` | requirePublicGalleryAccess, requirePublicGalleryImageAccess | prepare_gallery_share | gallery_share_links, galleries, gallery_images |
| `gallery-dimensions-actions.ts` | withAdmin | — | galleries |
| `gallery-drive-actions.ts` | requireContractAccess, withAuth | — | galleries, gallery_images, contract_events, contracts, studio_info +2 |
| `gallery-image-helpers.ts` | requireContractAccess, withAuth | — | gallery_images, gallery_reactions |
| `gallery-public-actions.ts` | requireContractAccess, withAuth | .rpc(
verify_gallery_password | gallery_password_attempts, galleries |
| `gallery-reaction-actions.ts` | withAuth, requireContractAccess, requirePublicGalleryAccess, requirePublicGalleryImageAccess | — | gallery_reactions, gallery_comments, gallery_images |
| `gallery-selection-actions.ts` | requireContractAccess, withAuth, requirePublicGalleryAccess, requirePublicGalleryImageAccess | — | gallery_images, galleries, gallery_selection_batches, gallery_selection_batch_items |
| `goal-budget-actions.ts` | withAdmin | contribute_to_goal, undo_contribution_atomic | financial_goals, goal_contributions, budgets, expenses, transaction_categories |
| `integrity-actions.ts` | withAuth, withAdmin | run_integrity_scan | integrity_reports |
| `inventory-mutations.ts` | withAuth, requireInventoryAccess | nextval_inventory_code, .rpc(
inventory_stock_in_atomic, inventory_stock_in_atomic, inventory_stock_out_atomic, create_sale_receipt_atomic +4 | inventory_items, inventory_transactions, approval_requests, employees, notification_queue |
| `inventory-queries.ts` | — | inventory_list, inventory_detail_v2, inventory_item_transaction_totals, inventory_stats, nextval_inventory_code | inventory_items, inventory_transactions, contracts, approval_requests, employees |
| `investment-actions.ts` | withAdmin | — | investments, investment_maintenance_logs |
| `lab-mutations.ts` | — | record_lab_payment_atomic | labs, printing_orders, lab_services |
| `lab-queries.ts` | — | printing_lab_overview | labs, lab_services, expenses, printing_orders, expense_allocations |
| `lead-actions.ts` | withAuth, requireCrmAccess | get_crm_lead_stats | crm_leads |
| `lead-lifecycle.ts` | withAuth, requireCrmAccess | convert_lead_to_customer, append_care_log | crm_leads, customers |
| `moodie-action-actions.ts` | requireCalendarAccess, requireContractWriteAccess, withAuth | — | schedules, galleries, moodie_action_approvals, google_sync_queue |
| `moodie-benchmark-actions.ts` | withAdmin | — | audit_logs |
| `moodie-memory-actions.ts` | withAuth, requireMoodieAccess | — | moodie_memories |
| `moodie-mutations.ts` | withAuth, requireMoodieAccess | — | ai_conversations, ai_messages, ai_turns, moodie_message_feedback |
| `moodie-observability-actions.ts` | withAdmin | — | ai_messages |
| `moodie-provider-actions.ts` | withAdmin | — | system_settings |
| `moodie-queries.ts` | requireMoodieAccess | — | ai_conversations, ai_messages, ai_turns |
| `note-actions.ts` | requireContractAccess, withAuth | — | contract_notes |
| `notification-actions.ts` | withAuth, withAdmin | — | employees, notification_preferences, notification_queue |
| `password-recovery.ts` | — | — | — |
| `payable-actions.ts` | withAdmin | finance_payable_summary, payable_items, record_payee_payment_atomic, payee_payment_history, void_payee_payment_atomic | — |
| `payment-actions.ts` | requireContractDestructiveAccess, requirePaymentRecordAccess, withAuth | process_contract_payment_v2, void_contract_payment_v2 | payment_plans, transaction_categories |
| `printing-actions.ts` | — | — | printing_orders |
| `printing-mutations.ts` | — | create_printing_order_atomic, update_printing_order_atomic, delete_printing_order_atomic | printing_orders, printing_order_status_history |
| `printing-queries.ts` | — | printing_stats | printing_orders, contracts, labs, expense_allocations |
| `printing-reference-queries.ts` | — | finance_lab_debt_summary | contracts |
| `productivity-actions.ts` | — | get_employee_productivity, get_my_employee_productivity, get_my_employee_job_details, get_employee_job_details | — |
| `profile-actions.ts` | withAuth, withAdmin | — | employees, avatars |
| `receipt-actions.ts` | withAdmin | create_sale_receipt_atomic | receipts |
| `rental-mutations.ts` | — | create_standalone_dress_rental_atomic, start_dress_rental_atomic, return_dress_rental_atomic, mark_dress_cleaned_atomic, cancel_dress_rental_atomic +1 | dress_reservations, dress_rentals, dresses |
| `rental-queries.ts` | — | dress_rental_list | dress_rentals |
| `salary-actions.ts` | withAdmin | record_payee_payment_atomic | salary_adjustments, employee_salaries, monthly_salaries, employees, work_tasks |
| `schedule-actions.ts` | withAuth | — | schedules |
| `service-mutations.ts` | — | save_service_atomic, delete_service_atomic | — |
| `service-queries.ts` | — | — | services, service_categories, service_bundles |
| `settings-mutations.ts` | withAdmin | — | studio_info, system_settings |
| `settings-queries.ts` | withAdmin, withAuth | — | notification_preferences, employees |
| `task-assign-actions.ts` | withAuth | — | employees, work_tasks |
| `task-overlap-actions.ts` | requireContractAccess | — | work_tasks |
| `user-management.ts` | withAdmin | — | employees |
| `vendor-actions.ts` | withAuth, withAdmin | — | vendors, work_tasks, expenses |
| `vendor-reports-queries.ts` | — | vendor_cost_report | — |
| `work-task-actions.ts` | requireContractAccess, requireContractWriteAccess, withAuth | — | contract_events, work_tasks, contracts |