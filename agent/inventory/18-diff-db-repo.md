---
title: "Diff catalog DB ↔ repo"
lat-cat: 18-diff-db-repo
cap-nhat: 2026-09-02
trang-thai: sinh-tu-dong
nguon: than-ham · rls-va-quyen · inventory 01-12 ↔ supabase/migrations
---

> ⚙️ Sinh bởi `scripts/vault-gen-diff-db-repo.mjs`. ĐỪNG sửa tay. Đây là **baseline S2** (chuẩn sự-thật-lược-đồ) — chạy lại ở mỗi cổng giai đoạn để bắt drift mới.

# Diff catalog DB ↔ repo

| | DB | repo (CREATE) | **DB có, repo không** | repo có, DB không (đã DROP) | repo có, DB không (**không thấy DROP** = ma) |
|---|---:|---:|---:|---:|---:|
| Hàm | 149 | 148 | **11** | 8 | **2** |
| Policy | 217 | 74 | **167** | 12 | **12** |
| Bảng | 93 | 37 | **62** | 3 | **3** |

Cách đọc: cột **DB có, repo không** = tồn tại trên production mà không migration nào tạo (áp tay / ngoài repo) — mọi lần sửa phải dump bản sống, không được tin file. Cột **ma** = repo có CREATE, DB không có, và không thấy DROP — hoặc migration chưa áp, hoặc bị drop ngoài repo.

## Hàm: DB có, repo không có CREATE — 11

- `contribute_to_goal` · nhóm tai-chinh
- `decrement_goal_amount` **DEFINER** · nhóm tai-chinh
- `get_contract_balance` **DEFINER** · nhóm hop-dong
- `get_current_employee_id` **DEFINER** · nhóm nhan-su
- `get_current_employee_role` **DEFINER** · nhóm nhan-su
- `log_audit_action` **DEFINER** · nhóm he-thong
- `recalc_contract_totals` **DEFINER** · nhóm hop-dong
- `rls_auto_enable` **DEFINER** · nhóm he-thong
- `undo_contribution_atomic` **DEFINER** · nhóm tai-chinh
- `update_contract_checklists_updated_at` **DEFINER** · nhóm hop-dong
- `update_updated_at_column` · nhóm he-thong

## Hàm: repo có CREATE, DB không — và KHÔNG thấy DROP (ma) — 2

- `m` · 20260606000000_gallery_data_v3_with_blur.sql
- `pg_temp` · 20260530120000_crm_audit_followups.sql

## Hàm: repo có, DB không — đã DROP (bình thường) — 8

- `expire_old_reservations` · tạo 20260524000001_printing_workflow_phase1_fixed.sql · drop 20260826200000_drop_printing_inventory_payment_legacy.sql
- `finance_dashboard_metrics` · tạo 20260421113000_finance_dashboard_production_hardening.sql · drop 20260826120000_cashflow_m2_ba_so.sql
- `finance_revenue_by_month` · tạo 20260421113000_finance_dashboard_production_hardening.sql · drop 20260826120000_cashflow_m2_ba_so.sql
- `record_vendor_payment_atomic` · tạo 20260825200000_cashflow_m1_expense_allocations.sql · drop 20260826130000_cashflow_m2b_drop_legacy.sql
- `trg_sync_vendor_expense` · tạo 20260615000002_vendor_expense_accrual_trigger_and_backfill.sql · drop 20260825200000_cashflow_m1_expense_allocations.sql
- `update_vendor_payments_updated_at` · tạo 20260527000000_vendor_payments.sql · drop 20260826130000_cashflow_m2b_drop_legacy.sql
- `upsert_printing_expense` · tạo 20260428130000_printing_audit_fix.sql · drop 20260825200000_cashflow_m1_expense_allocations.sql
- `upsert_vendor_expense` · tạo 20260615000003_fix_upsert_vendor_expense_work_type_cast.sql · drop 20260825200000_cashflow_m1_expense_allocations.sql

## Policy: DB có, repo không có CREATE — 167

- `addon_history.addon_history_all` · ALL
- `attendance.attendance_delete` · DELETE
- `attendance.attendance_insert` · INSERT
- `attendance.attendance_select` · SELECT
- `attendance.attendance_update` · UPDATE
- `audit_logs.audit_logs_insert` · INSERT
- `audit_logs.audit_logs_select` · SELECT
- `budgets.authenticated_budgets` · ALL
- `checklist_templates.checklist_templates_authenticated` · ALL
- `contract_checklists.contract_checklists_delete` · DELETE
- `contract_checklists.contract_checklists_insert` · INSERT
- `contract_checklists.contract_checklists_select` · SELECT
- `contract_checklists.contract_checklists_update` · UPDATE
- `contract_events.contract_events_delete` · DELETE
- `contract_events.contract_events_insert` · INSERT
- `contract_events.contract_events_select` · SELECT
- `contract_events.contract_events_update` · UPDATE
- `contract_items.contract_items_delete` · DELETE
- `contract_items.contract_items_insert` · INSERT
- `contract_items.contract_items_select` · SELECT
- `contract_items.contract_items_update` · UPDATE
- `contract_notes.contract_notes_delete` · DELETE
- `contract_notes.contract_notes_insert` · INSERT
- `contract_notes.contract_notes_select` · SELECT
- `contract_notes.contract_notes_update` · UPDATE
- `contracts.contracts_delete` · DELETE
- `contracts.contracts_insert` · INSERT
- `contracts.contracts_select` · SELECT
- `contracts.contracts_update` · UPDATE
- `credit_cards.authenticated_credit_cards` · ALL
- `crm_leads.crm_leads_delete` · DELETE
- `crm_leads.crm_leads_insert` · INSERT
- `crm_leads.crm_leads_select` · SELECT
- `crm_leads.crm_leads_update` · UPDATE
- `customers.customers_delete` · DELETE
- `customers.customers_insert` · INSERT
- `customers.customers_select` · SELECT
- `customers.customers_update` · UPDATE
- `debts.debts_delete` · DELETE
- `debts.debts_insert` · INSERT
- `debts.debts_select` · SELECT
- `debts.debts_update` · UPDATE
- `documents.documents_delete` · DELETE
- `documents.documents_insert` · INSERT
- `documents.documents_select` · SELECT
- `documents.documents_update` · UPDATE
- `dress_rental_accessories.auth_all` · ALL
- `dress_rentals.auth_delete` · DELETE
- `dress_rentals.auth_insert` · INSERT
- `dress_rentals.auth_read` · SELECT
- `dress_rentals.auth_update` · UPDATE
- `dress_reservations.inventory_reservations_delete` · DELETE
- `dress_reservations.inventory_reservations_insert` · INSERT
- `dress_reservations.inventory_reservations_select` · SELECT
- `dress_reservations.inventory_reservations_update` · UPDATE
- `dresses.inventory_items_delete` · DELETE
- `dresses.inventory_items_insert` · INSERT
- `dresses.inventory_items_select` · SELECT
- `dresses.inventory_items_update` · UPDATE
- `employee_salaries.employee_salaries_delete` · DELETE
- `employee_salaries.employee_salaries_insert` · INSERT
- `employee_salaries.employee_salaries_select` · SELECT
- `employee_salaries.employee_salaries_update` · UPDATE
- `employees.employees_delete` · DELETE
- `employees.employees_insert` · INSERT
- `employees.employees_select` · SELECT
- `employees.employees_update` · UPDATE
- `equipment.equipment_delete` · DELETE
- `equipment.equipment_insert` · INSERT
- `equipment.equipment_select` · SELECT
- `equipment.equipment_update` · UPDATE
- `evaluations.evaluations_delete` · DELETE
- `evaluations.evaluations_insert` · INSERT
- `evaluations.evaluations_select` · SELECT
- `evaluations.evaluations_update` · UPDATE
- `expenses.expenses_delete` · DELETE
- `expenses.expenses_insert` · INSERT
- `expenses.expenses_select` · SELECT
- `expenses.expenses_update` · UPDATE
- `financial_goals.authenticated_goals` · ALL
- `fixed_costs.fixed_costs_delete` · DELETE
- `fixed_costs.fixed_costs_insert` · INSERT
- `fixed_costs.fixed_costs_select` · SELECT
- `fixed_costs.fixed_costs_update` · UPDATE
- `goal_contributions.authenticated_contributions` · ALL
- `google_sync_queue.Enable ALL for service-role` · ALL
- `integrity_reports.authenticated_integrity` · ALL
- `inventory_items.service_role_full_access` · ALL
- `inventory_transactions.service_role_full_access` · ALL
- `investment_maintenance_logs.authenticated_maintenance_logs` · ALL
- `investments.authenticated_investments` · ALL
- `lab_services.lab_services_delete` · DELETE
- `lab_services.lab_services_insert` · INSERT
- `lab_services.lab_services_select` · SELECT
- `lab_services.lab_services_update` · UPDATE
- `labs.labs_delete` · DELETE
- `labs.labs_insert` · INSERT
- `labs.labs_select` · SELECT
- `labs.labs_update` · UPDATE
- `login_attempts.Enable delete for everyone` · DELETE
- `login_attempts.Enable insert for everyone` · INSERT
- `login_attempts.Enable select for everyone` · SELECT
- `login_attempts.Enable update for everyone` · UPDATE
- `monthly_salaries.monthly_salaries_delete` · DELETE
- `monthly_salaries.monthly_salaries_insert` · INSERT
- `monthly_salaries.monthly_salaries_select` · SELECT
- `monthly_salaries.monthly_salaries_update` · UPDATE
- `notification_preferences.authenticated_notif_prefs` · ALL
- `notification_queue.authenticated_notif_queue` · ALL
- `notifications.notifications_delete` · DELETE
- `notifications.notifications_insert` · INSERT
- `notifications.notifications_select` · SELECT
- `notifications.notifications_update` · UPDATE
- `payment_plans.payment_plans_delete` · DELETE
- `payment_plans.payment_plans_insert` · INSERT
- `payment_plans.payment_plans_select` · SELECT
- `payment_plans.payment_plans_update` · UPDATE
- `payments.payments_delete` · DELETE
- `payments.payments_insert` · INSERT
- `payments.payments_select` · SELECT
- `payments.payments_update` · UPDATE
- `price_rules.authenticated_rules` · ALL
- `printing_orders.printing_orders_delete` · DELETE
- `printing_orders.printing_orders_insert` · INSERT
- `printing_orders.printing_orders_select` · SELECT
- `printing_orders.printing_orders_update` · UPDATE
- `promotions.promotions_delete` · DELETE
- `promotions.promotions_insert` · INSERT
- `promotions.promotions_select` · SELECT
- `promotions.promotions_update` · UPDATE
- `receipts.authenticated_receipts` · ALL
- `requests.requests_delete` · DELETE
- `requests.requests_insert` · INSERT
- `requests.requests_select` · SELECT
- `requests.requests_update` · UPDATE
- `schedules.schedules_delete` · DELETE
- `schedules.schedules_insert` · INSERT
- `schedules.schedules_select` · SELECT
- `schedules.schedules_update` · UPDATE
- `service_categories.service_categories_delete` · DELETE
- `service_categories.service_categories_insert` · INSERT
- `service_categories.service_categories_select` · SELECT
- `service_categories.service_categories_update` · UPDATE
- `service_relations.authenticated_relations` · ALL
- `services.services_delete` · DELETE
- `services.services_insert` · INSERT
- `services.services_select` · SELECT
- `services.services_update` · UPDATE
- `studio_info.studio_info_delete` · DELETE
- `studio_info.studio_info_insert` · INSERT
- `studio_info.studio_info_select` · SELECT
- `studio_info.studio_info_update` · UPDATE
- `transaction_categories.transaction_categories_delete` · DELETE
- `transaction_categories.transaction_categories_insert` · INSERT
- `transaction_categories.transaction_categories_select` · SELECT
- `transaction_categories.transaction_categories_update` · UPDATE
- `vendors.Enable insert access for authenticated users on vendors` · INSERT
- `vendors.Enable read access for authenticated users on vendors` · SELECT
- `vendors.Enable update access for authenticated users on vendors` · UPDATE
- `work_shifts.work_shifts_delete` · DELETE
- `work_shifts.work_shifts_insert` · INSERT
- `work_shifts.work_shifts_select` · SELECT
- `work_shifts.work_shifts_update` · UPDATE
- `work_tasks.work_tasks_delete` · DELETE
- `work_tasks.work_tasks_insert` · INSERT
- `work_tasks.work_tasks_select` · SELECT
- `work_tasks.work_tasks_update` · UPDATE

## Policy: repo có, DB không — KHÔNG thấy DROP (ma) — 12

- `gallery_filter_jobs.gallery_filter_jobs_service_role_all` · 20260519090000_gallery_v2_data_contract_permissions.sql
- `inventory_reservations.Enable all access for authenticated users` · 20260524000000_printing_workflow_phase1.sql
- `inventory_reservations.Enable read access for authenticated users` · 20260524000000_printing_workflow_phase1.sql
- `public.Enable ALL for service-role` · 20260522012100_create_google_sync_queue.sql
- `vendor_payment_allocations.Enable insert access for authenticated users` · 20260527000000_vendor_payments.sql
- `vendor_payment_allocations.Enable read access for authenticated users` · 20260527000000_vendor_payments.sql
- `vendor_payments.Enable insert access for authenticated users` · 20260527000000_vendor_payments.sql
- `vendor_payments.Enable read access for authenticated users` · 20260527000000_vendor_payments.sql
- `vendor_payments.Enable update access for authenticated users` · 20260527000000_vendor_payments.sql
- `vendors.Enable insert access for authenticated users` · 20260526000000_vendor_management.sql
- `vendors.Enable read access for authenticated users` · 20260526000000_vendor_management.sql
- `vendors.Enable update access for authenticated users` · 20260526000000_vendor_management.sql

## Policy: repo có, DB không — đã DROP — 12

- `inventory_reservations.Allow authenticated users to manage inventory_reservations` · drop 20260524000001_printing_workflow_phase1_fixed.sql
- `order_payments.Allow authenticated users to manage order_payments` · drop 20260524000001_printing_workflow_phase1_fixed.sql
- `order_payments.Enable insert access for authenticated users` · drop 20260524000001_printing_workflow_phase1_fixed.sql
- `order_payments.Enable read access for authenticated users` · drop 20260524000001_printing_workflow_phase1_fixed.sql
- `storage.Managers manage dresses images` · drop 20260429110000_dresses_audit_fix.sql
- `storage.Managers manage studio assets` · drop 20260420113500_create_studio_assets_bucket.sql
- `storage.Moodie attachments delete own` · drop 20260710190000_create_moodie_attachments_bucket.sql
- `storage.Moodie attachments insert own` · drop 20260710190000_create_moodie_attachments_bucket.sql
- `storage.Moodie attachments read own` · drop 20260710190000_create_moodie_attachments_bucket.sql
- `storage.Public read dresses images` · drop 20260429110000_dresses_audit_fix.sql
- `storage.Public read studio assets` · drop 20260420113500_create_studio_assets_bucket.sql
- `system_settings.Managers manage system_settings` · drop 20260429142000_settings_security_hardening.sql

## Bảng: DB có, repo không có CREATE TABLE — 62

- `addon_history`
- `attendance`
- `audit_logs`
- `budgets`
- `checklist_templates`
- `contract_checklists`
- `contract_events`
- `contract_items`
- `contract_notes`
- `contracts`
- `credit_cards`
- `crm_leads`
- `customers`
- `debts`
- `documents`
- `dress_rental_accessories`
- `dress_rentals`
- `dress_reservations`
- `dresses`
- `employee_salaries`
- `employees`
- `equipment`
- `evaluations`
- `expenses`
- `financial_goals`
- `fixed_costs`
- `galleries`
- `gallery_albums`
- `gallery_comments`
- `gallery_images`
- `gallery_reactions`
- `goal_contributions`
- `google_sync_queue`
- `integrity_reports`
- `inventory_items`
- `inventory_transactions`
- `investment_maintenance_logs`
- `investments`
- `lab_services`
- `labs`
- `login_attempts`
- `monthly_salaries`
- `notification_preferences`
- `notification_queue`
- `notifications`
- `payment_plans`
- `payments`
- `price_rules`
- `printing_orders`
- `promotions`
- `receipts`
- `requests`
- `salary_adjustments`
- `schedules`
- `service_bundles`
- `service_categories`
- `service_relations`
- `services`
- `studio_info`
- `transaction_categories`
- `work_shifts`
- `work_tasks`

## Bảng: repo có, DB không — KHÔNG thấy DROP (ma) — 3

- `lab_payment_allocations` · 20260428130000_printing_audit_fix.sql
- `vendor_payment_allocations` · 20260527000000_vendor_payments.sql
- `vendor_payments` · 20260527000000_vendor_payments.sql

## Bảng: repo có, DB không — đã DROP — 3

- `inventory_reservations` · drop 20260826200000_drop_printing_inventory_payment_legacy.sql
- `order_payments` · drop 20260826200000_drop_printing_inventory_payment_legacy.sql
- `public` · drop 20260714040000_realtime_signal_only_hardening.sql

## Sổ migration của Supabase (`supabase_migrations.schema_migrations`) — đo 02/09

| | Số |
|---|---:|
| Bản ghi trên DB | **113** |
| Cũ nhất / mới nhất | 20260409034800 / **20260621100000** |
| File trong repo | 203 (mới nhất 20260827160000) |
| ⇒ Áp tay sau 21/06, không sổ nào ghi | **~90 migration** |

Kết luận S2: từ 21/06/2026 mọi thay đổi lược đồ đi qua `scripts/migrate-direct.mjs` (áp từng file, không ghi sổ). Đó là lý do 167/217 policy, 11 hàm (gồm `recalc_contract_totals`, `get_contract_balance`, `contribute_to_goal`, `rls_auto_enable`) và 62/93 bảng không truy được về CREATE trong repo — một phần do regex chỉ bắt `CREATE TABLE`/`CREATE POLICY` đúng dạng, phần lớn là thật.
**Bảng-ma 3 cái** (`lab_payment_allocations`, `vendor_payment_allocations`, `vendor_payments`) là dương tính giả: đã đổi thành view ở M1 rồi `DROP VIEW` ở M2b — regex chỉ bắt `DROP TABLE`. **Hàm-ma 2 cái** (`m`, `pg_temp`) là nhiễu regex.

> Giới hạn: so theo TÊN, không so THÂN — hàm cùng tên nhưng thân khác (ca `process_contract_payment_v2`) không hiện ở đây; cái đó cần diff prosrc vs file, làm khi đụng từng hàm.
