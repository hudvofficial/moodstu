---
title: "RLS & quyền bảng — chi tiết"
tags: [sinh-tu-dong, db, bao-mat, rls]
cap-nhat: 2026-09-11
trang-thai: sinh-tu-dong
nguon: pg_proc · pg_policies · information_schema.role_table_grants
---

> ⚙️ **File này do `scripts/vault-gen-db-truth.mjs` sinh ra từ database production. ĐỪNG sửa tay** — chạy lại script để cập nhật.

# RLS & quyền bảng

Đọc cùng [[bao-mat-du-lieu-rls]]. Nhớ: **server action luôn dùng service-role nên RLS KHÔNG áp dụng cho đường đó** — RLS chỉ là cổng cho anon key (client-direct + realtime).

## Tổng quan

| Bảng | RLS | Force | Policy | Quyền anon/authenticated |
|---|---|---|---:|---|
| `addon_history` | bật | — | 1 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `ai_conversations` | bật | — | 1 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `ai_messages` | bật | — | 1 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `ai_turns` | bật | — | 1 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `approval_requests` | bật | — | 3 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `attendance` | bật | có | 4 | — |
| `audit_logs` | bật | — | 2 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `budgets` | bật | — | 1 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `checklist_templates` | bật | — | 1 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `contract_checklists` | bật | — | 2 | authenticated=SELECT |
| `contract_events` | bật | — | 2 | authenticated=SELECT |
| `contract_items` | bật | — | 4 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `contract_notes` | bật | — | 2 | authenticated=SELECT |
| `contracts` | bật | — | 2 | authenticated=SELECT |
| `credit_cards` | bật | — | 1 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `crm_leads` | bật | — | 4 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `customers` | bật | — | 1 | authenticated=SELECT |
| `debts` | bật | — | 4 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `documents` | bật | — | 4 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `dress_rental_accessories` | bật | — | 1 | — |
| `dress_rentals` | bật | — | 4 | — |
| `dress_reservations` | bật | — | 4 | — |
| `dresses` | bật | — | 4 | — |
| `employee_salaries` | bật | có | 4 | — |
| `employees` | bật | có | 4 | — |
| `equipment` | bật | — | 4 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `evaluations` | bật | có | 4 | — |
| `event_templates` | bật | — | 1 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `expense_allocations` | bật | — | 0 ⚠️ | — |
| `expenses` | bật | — | 4 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `finance_close_tasks` | bật | — | 1 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `finance_monthly_closes` | bật | — | 1 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `financial_goals` | bật | — | 1 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `fixed_costs` | bật | — | 4 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `galleries` | bật | có | 1 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `gallery_albums` | bật | — | 0 ⚠️ | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `gallery_comments` | bật | — | 0 ⚠️ | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `gallery_filter_jobs` | bật | — | 2 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `gallery_images` | bật | có | 1 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `gallery_password_attempts` | bật | — | 0 ⚠️ | — |
| `gallery_reactions` | bật | — | 0 ⚠️ | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `gallery_selection_batch_items` | bật | có | 1 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `gallery_selection_batches` | bật | có | 1 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `gallery_share_links` | bật | có | 1 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `goal_contributions` | bật | — | 1 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `google_sync_queue` | bật | — | 1 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `integrity_reports` | bật | — | 1 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `inventory_items` | bật | — | 1 | — |
| `inventory_transactions` | bật | — | 1 | — |
| `investment_maintenance_logs` | bật | — | 1 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `investments` | bật | — | 1 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `lab_services` | bật | — | 4 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `labs` | bật | — | 4 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `login_attempts` | bật | — | 4 | anon=DELETE,INSERT,SELECT,UPDATE · authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `monthly_salaries` | bật | có | 4 | — |
| `moodie_action_approvals` | bật | — | 1 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `moodie_agent_run_events` | bật | — | 1 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `moodie_agent_runs` | bật | — | 1 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `moodie_brave_audit_events` | bật | — | 1 | authenticated=REFERENCES,SELECT,TRIGGER,TRUNCATE |
| `moodie_brave_usage_daily` | bật | — | 1 | authenticated=REFERENCES,SELECT,TRIGGER,TRUNCATE |
| `moodie_memories` | bật | — | 2 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `moodie_memory_relations` | bật | — | 1 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `moodie_message_feedback` | bật | — | 1 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `moodie_observations` | bật | — | 1 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `moodie_voice_events` | bật | — | 1 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `moodie_voice_sessions` | bật | — | 1 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `moodie_voice_turns` | bật | — | 1 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `notification_preferences` | bật | — | 1 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `notification_queue` | bật | — | 1 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `notifications` | bật | — | 4 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `payment_plan_allocations` | bật | — | 2 | authenticated=SELECT |
| `payment_plans` | bật | — | 2 | authenticated=SELECT |
| `payments` | bật | — | 4 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `price_rules` | bật | có | 1 | — |
| `printing_order_status_history` | bật | — | 2 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `printing_orders` | bật | — | 4 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `promotions` | bật | — | 4 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `push_subscriptions` | bật | — | 4 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `realtime_signals` | bật | — | 1 | authenticated=SELECT |
| `receipts` | bật | — | 1 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `requests` | bật | — | 4 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `salary_adjustments` | bật | — | 0 ⚠️ | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `schedules` | bật | — | 1 | authenticated=SELECT |
| `service_bundles` | bật | có | 0 ⚠️ | — |
| `service_categories` | bật | có | 4 | — |
| `service_relations` | bật | có | 1 | — |
| `services` | bật | có | 4 | — |
| `studio_info` | bật | có | 4 | — |
| `system_settings` | bật | có | 0 ⚠️ | — |
| `transaction_categories` | bật | — | 4 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `vendors` | bật | — | 3 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `work_shifts` | bật | — | 4 | authenticated=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `work_tasks` | bật | — | 2 | authenticated=SELECT |

⚠️ = RLS bật nhưng **0 policy** ⇒ anon key không đọc/ghi được gì (chặn hoàn toàn).

## Nội dung từng policy

### `addon_history`

**addon_history_all** · `ALL` · roles: `public`

```sql
USING true
```

### `ai_conversations`

**Users manage own Moodie conversations** · `ALL` · roles: `public`

```sql
USING (auth.uid() = user_id)
```

```sql
WITH CHECK (auth.uid() = user_id)
```

### `ai_messages`

**Users manage own Moodie messages** · `ALL` · roles: `public`

```sql
USING (EXISTS ( SELECT 1
   FROM ai_conversations
  WHERE ((ai_conversations.id = ai_messages.conversation_id) AND (ai_conversations.user_id = auth.uid()))))
```

```sql
WITH CHECK (EXISTS ( SELECT 1
   FROM ai_conversations
  WHERE ((ai_conversations.id = ai_messages.conversation_id) AND (ai_conversations.user_id = auth.uid()))))
```

### `ai_turns`

**Users manage own Moodie turns** · `ALL` · roles: `authenticated`

```sql
USING (auth.uid() = user_id)
```

```sql
WITH CHECK (auth.uid() = user_id)
```

### `approval_requests`

**Allow authenticated users to insert approval_requests** · `INSERT` · roles: `authenticated`

```sql
WITH CHECK true
```

**Allow authenticated users to read approval_requests** · `SELECT` · roles: `authenticated`

```sql
USING true
```

**Allow authenticated users to update approval_requests** · `UPDATE` · roles: `authenticated`

```sql
USING true
```

### `attendance`

**attendance_delete** · `DELETE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**attendance_insert** · `INSERT` · roles: `public`

```sql
WITH CHECK (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**attendance_select** · `SELECT` · roles: `public`

```sql
USING ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum])) OR (employee_id = get_current_employee_id()))
```

**attendance_update** · `UPDATE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

### `audit_logs`

**audit_logs_insert** · `INSERT` · roles: `public`

```sql
WITH CHECK (get_current_employee_role() IS NOT NULL)
```

**audit_logs_select** · `SELECT` · roles: `public`

```sql
USING (get_current_employee_role() = 'admin'::employee_role_enum)
```

### `budgets`

**authenticated_budgets** · `ALL` · roles: `authenticated`

```sql
USING true
```

```sql
WITH CHECK true
```

### `checklist_templates`

**checklist_templates_authenticated** · `ALL` · roles: `authenticated`

```sql
USING true
```

```sql
WITH CHECK true
```

### `contract_checklists`

**contract_checklists_service_role_all** · `ALL` · roles: `service_role`

```sql
USING true
```

```sql
WITH CHECK true
```

**contract_checklists_read** · `SELECT` · roles: `authenticated`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum]))
```

### `contract_events`

**contract_events_service_role_all** · `ALL` · roles: `service_role`

```sql
USING true
```

```sql
WITH CHECK true
```

**contract_events_read** · `SELECT` · roles: `authenticated`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum]))
```

### `contract_items`

**contract_items_delete** · `DELETE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum]))
```

**contract_items_insert** · `INSERT` · roles: `public`

```sql
WITH CHECK (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum]))
```

**contract_items_select** · `SELECT` · roles: `public`

```sql
USING (EXISTS ( SELECT 1
   FROM contracts c
  WHERE ((c.id = contract_items.contract_id) AND ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum])) OR (c.created_by = get_current_employee_id()) OR (c.assigned_to = get_current_employee_id())))))
```

**contract_items_update** · `UPDATE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum]))
```

### `contract_notes`

**contract_notes_service_role_all** · `ALL` · roles: `service_role`

```sql
USING true
```

```sql
WITH CHECK true
```

**contract_notes_read** · `SELECT` · roles: `authenticated`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum]))
```

### `contracts`

**contracts_service_role_all** · `ALL` · roles: `service_role`

```sql
USING true
```

```sql
WITH CHECK true
```

**contracts_read** · `SELECT` · roles: `authenticated`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum]))
```

### `credit_cards`

**authenticated_credit_cards** · `ALL` · roles: `authenticated`

```sql
USING true
```

```sql
WITH CHECK true
```

### `crm_leads`

**crm_leads_delete** · `DELETE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum]))
```

**crm_leads_insert** · `INSERT` · roles: `public`

```sql
WITH CHECK (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum]))
```

**crm_leads_select** · `SELECT` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum]))
```

**crm_leads_update** · `UPDATE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum]))
```

### `customers`

**customers_select** · `SELECT` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum]))
```

### `debts`

**debts_delete** · `DELETE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**debts_insert** · `INSERT` · roles: `public`

```sql
WITH CHECK (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum]))
```

**debts_select** · `SELECT` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**debts_update** · `UPDATE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

### `documents`

**documents_delete** · `DELETE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**documents_insert** · `INSERT` · roles: `public`

```sql
WITH CHECK (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**documents_select** · `SELECT` · roles: `public`

```sql
USING true
```

**documents_update** · `UPDATE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

### `dress_rental_accessories`

**auth_all** · `ALL` · roles: `public`

```sql
USING (auth.role() = 'authenticated'::text)
```

### `dress_rentals`

**auth_delete** · `DELETE` · roles: `public`

```sql
USING (auth.role() = 'authenticated'::text)
```

**auth_insert** · `INSERT` · roles: `public`

```sql
WITH CHECK (auth.role() = 'authenticated'::text)
```

**auth_read** · `SELECT` · roles: `public`

```sql
USING (auth.role() = 'authenticated'::text)
```

**auth_update** · `UPDATE` · roles: `public`

```sql
USING (auth.role() = 'authenticated'::text)
```

### `dress_reservations`

**inventory_reservations_delete** · `DELETE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**inventory_reservations_insert** · `INSERT` · roles: `public`

```sql
WITH CHECK (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum]))
```

**inventory_reservations_select** · `SELECT` · roles: `public`

```sql
USING true
```

**inventory_reservations_update** · `UPDATE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum]))
```

### `dresses`

**inventory_items_delete** · `DELETE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**inventory_items_insert** · `INSERT` · roles: `public`

```sql
WITH CHECK (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**inventory_items_select** · `SELECT` · roles: `public`

```sql
USING true
```

**inventory_items_update** · `UPDATE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

### `employee_salaries`

**employee_salaries_delete** · `DELETE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**employee_salaries_insert** · `INSERT` · roles: `public`

```sql
WITH CHECK (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**employee_salaries_select** · `SELECT` · roles: `public`

```sql
USING ((get_current_employee_role() = 'admin'::employee_role_enum) OR (employee_id = get_current_employee_id()))
```

**employee_salaries_update** · `UPDATE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

### `employees`

**employees_delete** · `DELETE` · roles: `public`

```sql
USING (get_current_employee_role() = 'admin'::employee_role_enum)
```

**employees_insert** · `INSERT` · roles: `public`

```sql
WITH CHECK (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**employees_select** · `SELECT` · roles: `public`

```sql
USING ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum])) OR (id = get_current_employee_id()))
```

**employees_update** · `UPDATE` · roles: `public`

```sql
USING ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum])) OR (id = ( SELECT employees_1.id
   FROM employees employees_1
  WHERE (employees_1.auth_user_id = auth.uid())
 LIMIT 1)))
```

### `equipment`

**equipment_delete** · `DELETE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**equipment_insert** · `INSERT` · roles: `public`

```sql
WITH CHECK (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**equipment_select** · `SELECT` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**equipment_update** · `UPDATE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

### `evaluations`

**evaluations_delete** · `DELETE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**evaluations_insert** · `INSERT` · roles: `public`

```sql
WITH CHECK (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**evaluations_select** · `SELECT` · roles: `public`

```sql
USING ((get_current_employee_role() = 'admin'::employee_role_enum) OR (employee_id = get_current_employee_id()))
```

**evaluations_update** · `UPDATE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

### `event_templates`

**Authenticated users can read event_templates** · `SELECT` · roles: `authenticated`

```sql
USING true
```

### `expenses`

**expenses_delete** · `DELETE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**expenses_insert** · `INSERT` · roles: `public`

```sql
WITH CHECK (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum]))
```

**expenses_select** · `SELECT` · roles: `public`

```sql
USING ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum])) OR (created_by = get_current_employee_id()))
```

**expenses_update** · `UPDATE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

### `finance_close_tasks`

**service_role_close_tasks** · `ALL` · roles: `service_role`

```sql
USING true
```

```sql
WITH CHECK true
```

### `finance_monthly_closes`

**service_role_closes** · `ALL` · roles: `service_role`

```sql
USING true
```

```sql
WITH CHECK true
```

### `financial_goals`

**authenticated_goals** · `ALL` · roles: `authenticated`

```sql
USING true
```

```sql
WITH CHECK true
```

### `fixed_costs`

**fixed_costs_delete** · `DELETE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**fixed_costs_insert** · `INSERT` · roles: `public`

```sql
WITH CHECK (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**fixed_costs_select** · `SELECT` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**fixed_costs_update** · `UPDATE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

### `galleries`

**galleries_service_role_all** · `ALL` · roles: `service_role`

```sql
USING true
```

```sql
WITH CHECK true
```

### `gallery_filter_jobs`

**Service role full access** · `ALL` · roles: `service_role`

```sql
USING true
```

**Studio can view filter jobs of their galleries** · `SELECT` · roles: `authenticated`

```sql
USING true
```

### `gallery_images`

**gallery_images_service_role_all** · `ALL` · roles: `service_role`

```sql
USING true
```

```sql
WITH CHECK true
```

### `gallery_selection_batch_items`

**gallery_selection_batch_items_service_role_all** · `ALL` · roles: `service_role`

```sql
USING true
```

```sql
WITH CHECK true
```

### `gallery_selection_batches`

**gallery_selection_batches_service_role_all** · `ALL` · roles: `service_role`

```sql
USING true
```

```sql
WITH CHECK true
```

### `gallery_share_links`

**gallery_share_links_service_role_all** · `ALL` · roles: `service_role`

```sql
USING true
```

```sql
WITH CHECK true
```

### `goal_contributions`

**authenticated_contributions** · `ALL` · roles: `authenticated`

```sql
USING true
```

```sql
WITH CHECK true
```

### `google_sync_queue`

**Enable ALL for service-role** · `ALL` · roles: `service_role`

```sql
USING true
```

```sql
WITH CHECK true
```

### `integrity_reports`

**authenticated_integrity** · `ALL` · roles: `authenticated`

```sql
USING true
```

```sql
WITH CHECK true
```

### `inventory_items`

**service_role_full_access** · `ALL` · roles: `public`

```sql
USING (auth.role() = 'service_role'::text)
```

### `inventory_transactions`

**service_role_full_access** · `ALL` · roles: `public`

```sql
USING (auth.role() = 'service_role'::text)
```

### `investment_maintenance_logs`

**authenticated_maintenance_logs** · `ALL` · roles: `authenticated`

```sql
USING true
```

```sql
WITH CHECK true
```

### `investments`

**authenticated_investments** · `ALL` · roles: `authenticated`

```sql
USING true
```

```sql
WITH CHECK true
```

### `lab_services`

**lab_services_delete** · `DELETE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**lab_services_insert** · `INSERT` · roles: `public`

```sql
WITH CHECK (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**lab_services_select** · `SELECT` · roles: `public`

```sql
USING true
```

**lab_services_update** · `UPDATE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

### `labs`

**labs_delete** · `DELETE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**labs_insert** · `INSERT` · roles: `public`

```sql
WITH CHECK (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**labs_select** · `SELECT` · roles: `public`

```sql
USING true
```

**labs_update** · `UPDATE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

### `login_attempts`

**Enable delete for everyone** · `DELETE` · roles: `public`

```sql
USING true
```

**Enable insert for everyone** · `INSERT` · roles: `public`

```sql
WITH CHECK true
```

**Enable select for everyone** · `SELECT` · roles: `public`

```sql
USING true
```

**Enable update for everyone** · `UPDATE` · roles: `public`

```sql
USING true
```

### `monthly_salaries`

**monthly_salaries_delete** · `DELETE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**monthly_salaries_insert** · `INSERT` · roles: `public`

```sql
WITH CHECK (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**monthly_salaries_select** · `SELECT` · roles: `public`

```sql
USING (get_current_employee_role() = 'admin'::employee_role_enum)
```

**monthly_salaries_update** · `UPDATE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

### `moodie_action_approvals`

**Users manage own Moodie action approvals** · `ALL` · roles: `public`

```sql
USING (auth.uid() = user_id)
```

```sql
WITH CHECK (auth.uid() = user_id)
```

### `moodie_agent_run_events`

**Users manage own Moodie agent run events** · `ALL` · roles: `authenticated`

```sql
USING (user_id = auth.uid())
```

```sql
WITH CHECK (user_id = auth.uid())
```

### `moodie_agent_runs`

**Users manage own Moodie agent runs** · `ALL` · roles: `authenticated`

```sql
USING (user_id = auth.uid())
```

```sql
WITH CHECK (user_id = auth.uid())
```

### `moodie_brave_audit_events`

**Users read own Moodie Brave audit** · `SELECT` · roles: `authenticated`

```sql
USING (auth.uid() = user_id)
```

### `moodie_brave_usage_daily`

**Users read own Moodie Brave usage** · `SELECT` · roles: `authenticated`

```sql
USING (auth.uid() = user_id)
```

### `moodie_memories`

**Moodie memories write own or managed studio** · `ALL` · roles: `public`

```sql
USING ((user_id = auth.uid()) OR ((scope = 'studio'::text) AND (EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.auth_user_id = auth.uid()) AND ((e.status)::text = 'active'::text) AND (e.role = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum])))))))
```

```sql
WITH CHECK ((user_id = auth.uid()) OR ((scope = 'studio'::text) AND (EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.auth_user_id = auth.uid()) AND ((e.status)::text = 'active'::text) AND (e.role = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum])))))))
```

**Moodie memories read scoped** · `SELECT` · roles: `public`

```sql
USING ((user_id = auth.uid()) OR ((scope = 'studio'::text) AND (EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.auth_user_id = auth.uid()) AND ((e.status)::text = 'active'::text))))))
```

### `moodie_memory_relations`

**Users manage own Moodie memory relations** · `ALL` · roles: `public`

```sql
USING (user_id = auth.uid())
```

```sql
WITH CHECK ((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM moodie_memories source
  WHERE ((source.id = moodie_memory_relations.source_memory_id) AND (source.user_id = auth.uid())))) AND (EXISTS ( SELECT 1
   FROM moodie_memories target
  WHERE ((target.id = moodie_memory_relations.target_memory_id) AND (target.user_id = auth.uid())))))
```

### `moodie_message_feedback`

**Users manage own Moodie feedback** · `ALL` · roles: `authenticated`

```sql
USING (auth.uid() = user_id)
```

```sql
WITH CHECK (auth.uid() = user_id)
```

### `moodie_observations`

**Users manage own Moodie observations** · `ALL` · roles: `public`

```sql
USING (user_id = auth.uid())
```

```sql
WITH CHECK (user_id = auth.uid())
```

### `moodie_voice_events`

**Users manage own Moodie voice events** · `ALL` · roles: `authenticated`

```sql
USING (user_id = auth.uid())
```

```sql
WITH CHECK (user_id = auth.uid())
```

### `moodie_voice_sessions`

**Users manage own Moodie voice sessions** · `ALL` · roles: `authenticated`

```sql
USING (user_id = auth.uid())
```

```sql
WITH CHECK (user_id = auth.uid())
```

### `moodie_voice_turns`

**Users manage own Moodie voice turns** · `ALL` · roles: `authenticated`

```sql
USING (user_id = auth.uid())
```

```sql
WITH CHECK (user_id = auth.uid())
```

### `notification_preferences`

**authenticated_notif_prefs** · `ALL` · roles: `authenticated`

```sql
USING true
```

```sql
WITH CHECK true
```

### `notification_queue`

**authenticated_notif_queue** · `ALL` · roles: `authenticated`

```sql
USING true
```

```sql
WITH CHECK true
```

### `notifications`

**notifications_delete** · `DELETE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**notifications_insert** · `INSERT` · roles: `public`

```sql
WITH CHECK (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**notifications_select** · `SELECT` · roles: `public`

```sql
USING ((employee_id = get_current_employee_id()) OR (employee_id IS NULL))
```

**notifications_update** · `UPDATE` · roles: `public`

```sql
USING (get_current_employee_role() IS NOT NULL)
```

### `payment_plan_allocations`

**payment_plan_allocations_service_role_all** · `ALL` · roles: `service_role`

```sql
USING true
```

```sql
WITH CHECK true
```

**payment_plan_allocations_read** · `SELECT` · roles: `authenticated`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum]))
```

### `payment_plans`

**payment_plans_service_role_all** · `ALL` · roles: `service_role`

```sql
USING true
```

```sql
WITH CHECK true
```

**payment_plans_read** · `SELECT` · roles: `authenticated`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum]))
```

### `payments`

**payments_delete** · `DELETE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**payments_insert** · `INSERT` · roles: `public`

```sql
WITH CHECK (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum]))
```

**payments_select** · `SELECT` · roles: `public`

```sql
USING ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum])) OR (created_by = get_current_employee_id()))
```

**payments_update** · `UPDATE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

### `price_rules`

**authenticated_rules** · `ALL` · roles: `authenticated`

```sql
USING true
```

```sql
WITH CHECK true
```

### `printing_order_status_history`

**printing_order_status_history_insert** · `INSERT` · roles: `public`

```sql
WITH CHECK (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum]))
```

**printing_order_status_history_select** · `SELECT` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

### `printing_orders`

**printing_orders_delete** · `DELETE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**printing_orders_insert** · `INSERT` · roles: `public`

```sql
WITH CHECK (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum]))
```

**printing_orders_select** · `SELECT` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**printing_orders_update** · `UPDATE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum]))
```

### `promotions`

**promotions_delete** · `DELETE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**promotions_insert** · `INSERT` · roles: `public`

```sql
WITH CHECK (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**promotions_select** · `SELECT` · roles: `public`

```sql
USING true
```

**promotions_update** · `UPDATE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

### `push_subscriptions`

**Service role full access** · `ALL` · roles: `public`

```sql
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
```

**Users can delete own subscriptions** · `DELETE` · roles: `public`

```sql
USING (employee_id = auth.uid())
```

**Users can insert own subscriptions** · `INSERT` · roles: `public`

```sql
WITH CHECK (employee_id = auth.uid())
```

**Users can view own subscriptions** · `SELECT` · roles: `public`

```sql
USING (employee_id = auth.uid())
```

### `realtime_signals`

**realtime_signals_select** · `SELECT` · roles: `authenticated`

```sql
USING is_active_employee()
```

### `receipts`

**authenticated_receipts** · `ALL` · roles: `authenticated`

```sql
USING true
```

```sql
WITH CHECK true
```

### `requests`

**requests_delete** · `DELETE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**requests_insert** · `INSERT` · roles: `public`

```sql
WITH CHECK (get_current_employee_role() IS NOT NULL)
```

**requests_select** · `SELECT` · roles: `public`

```sql
USING ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum])) OR (requester_id = get_current_employee_id()))
```

**requests_update** · `UPDATE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

### `schedules`

**schedules_select** · `SELECT` · roles: `public`

```sql
USING ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum])) OR (employee_id = get_current_employee_id()))
```

### `service_categories`

**service_categories_delete** · `DELETE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**service_categories_insert** · `INSERT` · roles: `public`

```sql
WITH CHECK (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**service_categories_select** · `SELECT` · roles: `public`

```sql
USING true
```

**service_categories_update** · `UPDATE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

### `service_relations`

**authenticated_relations** · `ALL` · roles: `authenticated`

```sql
USING true
```

```sql
WITH CHECK true
```

### `services`

**services_delete** · `DELETE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**services_insert** · `INSERT` · roles: `public`

```sql
WITH CHECK (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**services_select** · `SELECT` · roles: `public`

```sql
USING true
```

**services_update** · `UPDATE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

### `studio_info`

**studio_info_delete** · `DELETE` · roles: `public`

```sql
USING (get_current_employee_role() = 'admin'::employee_role_enum)
```

**studio_info_insert** · `INSERT` · roles: `public`

```sql
WITH CHECK (get_current_employee_role() = 'admin'::employee_role_enum)
```

**studio_info_select** · `SELECT` · roles: `public`

```sql
USING true
```

**studio_info_update** · `UPDATE` · roles: `public`

```sql
USING (get_current_employee_role() = 'admin'::employee_role_enum)
```

### `transaction_categories`

**transaction_categories_delete** · `DELETE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**transaction_categories_insert** · `INSERT` · roles: `public`

```sql
WITH CHECK (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**transaction_categories_select** · `SELECT` · roles: `public`

```sql
USING true
```

**transaction_categories_update** · `UPDATE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

### `vendors`

**Enable insert access for authenticated users on vendors** · `INSERT` · roles: `authenticated`

```sql
WITH CHECK true
```

**Enable read access for authenticated users on vendors** · `SELECT` · roles: `authenticated`

```sql
USING true
```

**Enable update access for authenticated users on vendors** · `UPDATE` · roles: `authenticated`

```sql
USING true
```

### `work_shifts`

**work_shifts_delete** · `DELETE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**work_shifts_insert** · `INSERT` · roles: `public`

```sql
WITH CHECK (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

**work_shifts_select** · `SELECT` · roles: `public`

```sql
USING true
```

**work_shifts_update** · `UPDATE` · roles: `public`

```sql
USING (get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum]))
```

### `work_tasks`

**work_tasks_service_role_all** · `ALL` · roles: `service_role`

```sql
USING true
```

```sql
WITH CHECK true
```

**work_tasks_read** · `SELECT` · roles: `authenticated`

```sql
USING ((get_current_employee_role() = ANY (ARRAY['admin'::employee_role_enum, 'manager'::employee_role_enum, 'sale'::employee_role_enum])) OR (assigned_to = get_current_employee_id()) OR (created_by = get_current_employee_id()))
```
