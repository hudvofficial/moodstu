# MoodStudio Backend & Database Blueprint

## Overview
- This document maps the backend/data expectations to the UX concepts already captured in `moodsaas_wireframe.md` so that database, Supabase, and server-action work can be wired to the same modules (Dashboard, Contracts, Customers, Services, Employees, Finance, CRM, Schedules, etc.).
- Reference schema + policies live in `database_schema.sql` and `rls_policies.sql`; we lean on those for table shape, indexes, and access rules.

## Schema → Module Mapping
- **Studio metadata:** `studio_info` tracks brand, contact info, and working hours; used by Settings, onboarding, and header chrome.
- **People & HR:** `employees` plus `work_shifts`, `attendance`, `monthly_salaries`, `employee_salaries`, `evaluations`, and `requests` feed the Employees, Attendance, and Schedules modules. Indexes (employee_code/department/status/date) keep filters fast.
- **Contracts & Services:** `contracts`, `contract_details`, `service_details`, `services`, `payment_plans`, `work_progress`, and `schedules` hold the canonical lifecycle for each contract—service list, payment milestones, progress/timeline, scheduling, and history data described in `contracts` fields like `service_list`, `customer_care_history`, `work_history`, etc.
- **Customers & CRM:** `customers` plus a lightweight `crm_leads` table plus `notifications` back the CRM and customer-care timeline flows.
- **Finance Inventory & Operations:** `receipts`, `expenses`, `break_even_analysis`, `inventory_items`, `promotions`, and `credit`-related tables feed Finance pages; `printing_orders`, `labs`, `wedding_dresses`, and `dress_rentals` support the studio operations/fees.
- **Analytics & audit:** Views such as `monthly_revenue_summary`, `pending_work`, and `current_month_salaries` (all defined near the bottom of `database_schema.sql`), together with the `audit_logs` table and `log_audit_action()` trigger, supply KPIs and compliance logs for dashboards and finance reports.

## Access Patterns & Actions
- Frontend pages instantiate a browser Supabase client from `webapp/lib/supabase/client.ts` while Server Actions (Next.js `app/actions/...`) call the cached server client in `webapp/lib/supabase/server.ts`; an admin client (service role) is available there for tasks that must bypass RLS after custom permission checks.
- Each module has a dedicated action folder under `webapp/app/actions` (e.g., `contracts`, `services`, `employees`, `schedules`, `finance.ts`, `notifications.ts`). Mutations from the UI should call these server actions, then trigger cache invalidation/mutations as described in `webapp/docs/DESIGN-instant-nav.md` and `webapp/docs/BRIEF-native-resilience.md`.
- SWR/React Query caches (keys defined in `webapp/docs/DESIGN-instant-nav.md`) expect server paths to return fresh data on mutate; every server action should return the updated record plus metadata (status badges, payment progress) so the front-end skeletons can transition to real data instantly.

## Security & RLS
- `rls_policies.sql` enables RLS on sensitive tables (`contracts`, `receipts`, `printing_orders`, `work_progress`, `dress_rentals`, `wedding_dresses`, `labs`, `transaction_categories`) and currently grants the `authenticated` role broad read/write access while more restrictive policies (Admin-only) can be layered later. Keep this file in sync with any new tables introduced for the UI flows spelled out in the wireframe.
- All server actions run inside Supabase-authenticated Next.js routes, so include `auth.uid()` checks where needed before calling the admin client or mutating data with service-role privileges.

## Data Flow Expectations
- UI modules expect SWR/React Query cache behaviors (skeleton → cache hit → background revalidate) documented in `webapp/docs/DESIGN-instant-nav.md`; backend endpoints must return partial data quickly (e.g., summaries for lists) and let the hooks revalidate for detail views (`contracts/[id]`, `finance/expenses/[id]`, etc.).
- Payment-related flows should source `payment_plans` for milestones and link to `receipts`/`expenses` via `receipt_id`/`contract_id` so ledger, dashboards, and contract detail cards show consistent status badges.
- Scheduling flows read/write `schedules`, `work_progress`, and `attendance`, with mobile-friendly cards built from the same tables and leveraging triggers (e.g., `log_audit_action`) that keep audit trails for payroll and compliance.

## Next Steps
- Use this blueprint to verify that any new backend file or Supabase migration references the tables listed above and honors the RLS policies before deployment.
- When porting the repo into `C:\Users\Admin\Desktop\Ai\mood saas`, copy `database_schema.sql`, `rls_policies.sql`, `backend_architecture.md`, and the `webapp` folders (`lib`, `app/actions`, `docs`) so the backend and UI teams stay aligned.
