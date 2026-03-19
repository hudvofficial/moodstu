# MoodStudio Backend Test Plan

## Goals
- Verify contract lifecycle, payments, finance dashboards, scheduling, and CRM flows match the UI wireframe expectations.
- Confirm Supabase RLS/policies prevent cross-role leakage while still allowing required actions.
- Exercise cache invalidation so SWR/React Query front ends show fresh data immediately.

## Scenarios
1. **Contract CRUD cycle**
   - Create contract (new customer, services, payment plan) ? expect `contracts`, `payment_plans`, `work_progress`, and `notifications` entries. Validate `remaining_amount` formula.
   - Update contract status/payment ? ensure `payment_plans` reflect paid milestones, receipts inserted, and SWR caches mutated.
   - Delete/Archive contract ? triggers audit logs and associated `work_progress` cascade.

2. **Payment & finance validation**
   - Insert receipt and expense entries tied to multiple contracts ? check aggregates (`total_paid`, `total_remaining`, `break_even_analysis`).
   - Generate finance report (views `monthly_revenue_summary`, `pending_work`, `current_month_salaries`).
   - Export ledger via service-role, confirm admin-only access.

3. **Schedules & Attendance**
   - Book a schedule, assign shifts, and log attendance with photos/locations; verify triggers update `monthly_salaries` and `attendance_summary`.
   - Move schedule to different status (e.g., `Ðang làm` ? `Hoàn thành`) and confirm KPI updates for dashboard charts.

4. **CRM/Customers**
   - Create customer + CRM lead, convert lead to contract, and record follow-up notifications. Ensure `crm_leads` view surfaces counts.
   - Search customer/contract by code to confirm indexed queries deliver instant results for UI.

5. **Services & inventory**
   - Update service price/bundle, apply inventory adjustment, and confirm `inventory_items` stock matches bookings.
   - Batch import service pricing; caches `SWR_KEYS.SERVICES` invalidated so list pages immediately refresh.

6. **Security & Roles**
   - Run each action as Admin, Manager, Staff, Viewer (per `rls_policies.sql`), confirming unauthorized actions fail. Check `auth.uid()` gating for service-role routines.
   - Attempt mutations via unauthorized tokens and verify audit logs capture failure reasons.

7. **Cache & UI sync**
   - After every mutation, run `mutate()` on the relevant SWR key (e.g., `contracts`, `finance/reports`). Confirm front-end skeletons replaced with real data within 1-2 seconds via background revalidate.
   - Validate timeline skeletons (contracts detail, schedules) appear on first load even under slow network.

## Monitoring
- Track `audit_logs` entries for payables, schedule shifts, and contract approvals to ensure compliance triggers fire.
- Ensure Supabase function `log_audit_action()` runs on sensitive tables.
- Confirm real-time notifications (via `notifications` table) show up in mobile/desktop flows after backend actions.
