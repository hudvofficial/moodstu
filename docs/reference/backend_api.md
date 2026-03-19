# MoodStudio Backend API Surface

## Principles
- All endpoints are implemented as Next.js Server Actions under `webapp/app/actions/*` and run with Supabase server/client helpers (`webapp/lib/supabase/server.ts`).
- The browser uses the client helper (`webapp/lib/supabase/client.ts`) for queries; actions must return structured payloads and status metadata so SWR/React Query hooks can mutate caches (`webapp/docs/DESIGN-instant-nav.md`).
- Use `auth.uid()` to scope data or fall back to the service-role admin client for cross-role workflows (e.g., global finance exports, audit logs).
- Cache invalidation hooks (e.g., `mutate(SWR_KEYS.CONTRACTS)` or `mutate(SWR_KEYS.detail('contract', id))`) must fire after every mutation.

## Contracts Module
- **CreateContract** (`POST /actions/contracts/create`): payload includes `customer_id`, `service_list`, `contract_date`, `payment_plan`, `notes`. Returns created contract and `payment_plans` rows plus status badges. RLS: `contracts` allows authenticated users but the service role may insert audit logs/triggers.
- **EditContract** (`PATCH /actions/contracts/{id}`): accepts updated fields (status, payment milestone updates, service adjustments), recalculates `remaining_amount`. Returns `contract` + related `work_progress`, `payment_plans`. Triggers `mutate(SWR_KEYS.detail('contract', id))` and `mutate(SWR_KEYS.CONTRACTS)`.
- **ContractPayments** (`POST /actions/contracts/{id}/payment`): records receipt in `receipts`, updates `payment_plans` status, and increments `paid_amount`. Response includes updated payment plan list and ledger totals.
- **ContractTimeline** (`POST /actions/contracts/{id}/timeline`): logs entries in `work_progress` or `notifications` for approvals, changes, or reminders; used by the contract detail timeline UI.

## Customers & CRM
- **ListCustomers** (`GET /actions/customers/list`): filters on branch, label, status; returns summary (pending contracts count) and contact info.
- **CreateCustomer** / **UpdateCustomer** align with `customers` table; responses include `customer_care_history` snippet for UI timelines.
- **CRMLeadActions** expose `crm_leads` CRUD plus relation to `contracts` for conversions. Triggers `notifications` when follow-up is scheduled.

## Services & Inventory
- **ListServices** (`GET /actions/services/list`): returns catalog with `service_details` inner data to power selectors. Supports filters by `service_type`, `category`, `status`.
- **CreateService**, **UpdateService**, **BatchPriceImport** mutate `services`, `service_details`, and `inventory_items` (for bundled kits). Cache invalidation targets `SWR_KEYS.SERVICES` and `SWR_KEYS.detail('service', id)`.
- **InventoryAdjustment** ensures `inventory_items` stock fields update when bookings or reservations happen.

## Finance
- **Receipts/Expenses** actions interact with `receipts`, `expenses`, and `payment_plans`. Each mutation returns aggregated `total_paid`, `total_remaining`, and optionally `break_even_analysis` projections for dashboards.
- **FinanceReport** endpoint leverages views `monthly_revenue_summary`, `pending_work`, and `current_month_salaries` to supply charts.
- **ExportLedger** (service role) dumps CSV/PDF of selected contracts + payments, respecting RLS by cross-checking `auth.uid()` or requiring admin role.

## Employees & Attendance
- **GetEmployees** returns profiles plus `work_shifts` and `attendance`. Supports filtering by role/department and pagination.
- **SaveAttendance** writes to `attendance`, handles photo/location metadata, triggers `monthly_salaries` recalculation via stored procedures.
- **SalaryAdjustments**, **AdvanceRequests**, **Evaluations** actions update `employee_salaries`, `requests`, and `evaluations` tables, each returning the updated payroll summary.

## Schedules & Work Progress
- **ScheduleBoard** fetches `schedules` plus linked `contracts`, `employees`, and `work_progress`. Supports kanban/day/week filters and returns grouped cards for mobile.
- **UpdateSchedule** / **AssignShift** mutate `schedules`, optionally `work_progress`, and publish a notification entry.
- **WorkProgressUpdate** updates `work_progress` and `contracts` status fields; response includes timeline nodes for the UI detail view.

## Notifications & Audit
- **Notifications** action reads/writes `notifications`; posting a memo surfaces toast banners and in-app alerts for contracts or payments.
- **AuditLogging** is automated via triggers (`log_audit_action()`), but backend actions may also log manual notes (e.g., overriding payments) to `audit_logs` for compliance.

## Shared Utilities
- **Search** endpoints (customers, contracts, services) use indexed columns (`customer_code`, `contract_code`, `service_code`) for instant navigation results.
- **Export/Print** actions gather `contract_file_url`/`print_file_url` data and call `printing_orders` workflows when generating physical deliverables.
