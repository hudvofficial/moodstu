# Antigravity Agent Onboarding Package

## Goal
- Hand over a self-contained brief so Antigravity can implement MoodStudio with shared tokens, UI/UX, backend actions, and testing expectations. Reference the existing docs for detail but follow the steps below.

## 1. Design + Layout (Stitch deliverable)
- Primary references: `WEBAPP_PLAN.md` (Stitch prompt section + color/token guidance) and `moodsaas_wireframe.md`. They describe the full admin console (Dashboard, Contracts, Customers, Services, Employees, Attendance, Schedules, Finance, CRM, Settings) plus the shared header/footer, #8B5E3C earth-tone palette, and responsive/mobile behavior (drawer, bottom nav, FAB).
- Ask Stitch to produce hero pages/components before dev work, then ensure produced screens map back to the wireframe (titles, timelines, status badges, large cards). Use the 60-30-10 surface rule and maintain APCA/WCAG 3.0 contrast.

## 2. Frontend Implementation Path
- Reference `frontend_implementation.md` for tokens, typography, canvas layout, responsive behavior, component list per module, SWR flow hooks, and key integration notes (component ? server action mapping).
- Start with the shared shell: Header + Sidebar + BottomNav/FAB, then implement Dashboard + Contracts list/detail pages, followed by Customers and Services. Use Shadcn/Tailwind patterns; each page should show skeleton ? SWR cache update as noted in `webapp/docs/DESIGN-instant-nav.md`.
- Tie each frontend action to a server action from `backend_api.md` and mutate the corresponding SWR key (e.g., `SWR_KEYS.CONTRACTS`, `contract-${id}`).

## 3. Backend Actions & Security
- Documented in `backend_api.md`; implement the described Server Actions (Contracts lifecycle, Customer/CRM, Services, Finance, Employees, Schedules, Notifications) using Supabase helpers in `webapp/lib/supabase/server.ts`. Use `auth.uid()` for scoping and service-role client only after explicit permission checks.
- Map each action to tables described in `backend_architecture.md` (contracts, customers, services, payment_plans, work_progress, schedules, receipts, etc.). Follow RLS/policies from `rls_policies.sql` and ensure triggers/logging (e.g., `log_audit_action()`) remain intact.

## 4. Validation & Testing
- Use `backend_test_plan.md` to guide QA for contract lifecycle, payments, finance reports, schedules/attendance, CRM flows, role-based security, and cache invalidation. Share this plan at demo reviews and ensure SWR cache mutate hooks are tested along with monitoring audit logs/notifications.
- Run the recorded scenarios after deploying each module to ensure dashboards/charts (monthly revenue, pending work, schedules, etc.) match expected data.

## 5. Handoff Notes
- Files to copy when migrating to `C:\Users\Admin\Desktop\Ai\mood saas`: `WEBAPP_PLAN.md`, `moodsaas_wireframe.md`, `frontend_implementation.md`, `backend_architecture.md`, `backend_api.md`, `backend_test_plan.md`, `database_schema.sql`, `rls_policies.sql`, and `moodsaas_wireframe.md`.
- Keep `webapp/docs/DESIGN-instant-nav.md` updated for new SWR keys or cache invalidation needs.
