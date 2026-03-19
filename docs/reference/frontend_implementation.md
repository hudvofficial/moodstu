# MoodStudio Frontend Implementation Plan

## Alignment
- Mirrors `WEBAPP_PLAN.md`, `moodsaas_wireframe.md`, and the Stitch prompt so every module (Dashboard, Contracts, Customers, Services, Employees, Attendance, Schedules, Finance, CRM, Settings) has a defined set of components, states, and tokens before coding.
- Frontend uses Next.js App Router + Tailwind v4 @theme; SWR cache behavior drives how Server Actions mutate data. NO React Query, NO Shadcn/ui (custom lightweight components from Coffee pattern).

## Global Shell & Tokens
- Desktop shell: fixed header (logo/search/notifications/user menu) + tiered sidebar navigation; mobile shell reuses header and footer plus drawer bottom nav (5 tabs) and a FAB for primary `Create` flows.
- Color tokens (V2 Earth-Tone): primary #8B5E3C, dark #3D2B1F, accent #C9A96E, light #A67C5B; backgrounds #FAF7F2 (base), #F5EFE6 (sidebar), #FFFFFF (cards); borders #E8DDD0; text #3D2B1F (primary), #8B7355 (secondary). Status: success #4CAF50, warning #FF9800, error #F44336. Shared radius (6/10/14/20), shadows (earth-brown tinted), spacing (4-8-12-16-24-32), font Inter.
- Typography: base font size 16px, scaling h1-h5 with 1.5x spacing, 1.6 line height, accessible (APCA/WCAG), headings & titles use `font-semibold`, body uses `font-regular`, buttons `font-semibold uppercase tracking-wide`.

## Module Implementation Notes

### Dashboard
- Components: stat cards (contracts, revenue, customers), revenue & contract funnel charts (Recharts), quick tasks (todo list), weekly schedule timeline.
- Data: SWR key `dashboard`; skeleton loader first render, cache hits thereafter; background revalidate for charts.
- Mobile: stack cards vertically, turn charts into horizontal scroll or toggled mini-panels, ensure hero KPIs remain accessible.

### Contracts
- Pages: list `/contracts`, create `/contracts/create`, detail `/contracts/[id]`, edit `/contracts/[id]/edit`.
- Components: filter/search toolbar (status chips, date range, customer search), table (desktop) that collapses to cards (mobile). Contract form uses multi-step layout (service selector, payment plan, approvals). Detail view shows timeline (contract stages, payment tracker, approvals, customer care notes) plus actions (print, payment, notifications).
- States: skeleton table/list, success badges (#4CAF50), warning tag (#FF9800) for delayed payments, primary (#8B5E3C) for milestones.
- Cache hooks: mutate `SWR_KEYS.CONTRACTS` and detail key `contract-${id}` after create/update. `ContractPayments` action updates receipts and payment plan list.

### Customers & CRM
- Table/list with filters (status, branch), detail slide-over showing care history, upcoming contracts, notes.
- CRM leads list with quick actions to convert to contract; timeline uses mobile-friendly cards.
- Search includes quick nav entries (instant nav) hitting `customer_code` indexes.

### Services & Inventory
- Catalog list with `service_details` grouped (service, outfit, lab). Table uses status chips, inline price editing (inputs respect token spacing). On mobile, convert to stacked cards with chip rows and CTA for `Add Service`.
- Service selector component reused in contracts and finance; includes price tiers, availability badges (#f3d18c highlight when stock low).
- Inventory card grid referencing `inventory_items`, quick adjustment modal, and auto-update after bookings.

### Employees & Attendance
- Employee list with avatar, role, status pill (#8B5E3C). Detail drawer shows salary summary, shifts, attendance history.
- Attendance dashboards show daily totals, timeline for check-ins (photo thumbnails). Mobile uses timeline cards with bottom sheets for detail.
- Salary adjustments, requests, evaluations modals use tokenized spacing, share forms defined in Shadcn components.

### Schedules & Work Progress
- Kanban board for schedules with columns (To Do, In Progress, Done) that also shows timeline nodes for customers/work_progress. Data refresh uses SWR key `schedules` and `work_progress` details.
- Mobile schedule view chooses agenda style (list) or calendar toggles; more actions in bottom sheet.

### Finance
- Tables for receipts, expenses, reports using `tailwind/ui` table components. Support filters (date, branch, type). Chart component uses summary view; `FinanceReport` action uses views (monthly revenue summary) for charts.
- Payment tracker module reuse from contract detail (payment milestones). Provide validation on total/pending fields.

### CRM/Settings
- CRM view lists leads/customers with action chips; detail view shows conversation history (notes). Notification toggles tie to `notifications` table.
- Settings pages share form layout (grid + toggles), reusing tokens for layout and transitions.

## Responsive + Accessibility
- 60-30-10 surface split: backgrounds ~60% (#FAF7F2), cards ~30% (#FFFFFF), 10% for #8B5E3C CTAs. Use `@media (min-width: 1024px)` for desktop features (card grids, hover states) and fallback to stacked `flex-col` for <768px.
- Skeletons: for list pages show card/table skeleton, detail uses pulsing placeholders, scheduling uses dotted placeholders; on mobile show skeleton row as collapsed panel.
- Keyboard & focus: ensure modals/drawers trap focus, all buttons have `aria-label`, color contrast meets WCAG 3.0.

## Integration Notes
- Each module's SWR/React Query keys should tie to server actions documented in `backend_api.md`. After any action completes, call `mutate()` for the relevant key so the UI rerenders with new data.
- Link components to backend flows: `payment-tracker` ? `ContractPayments`, `schedule board` slider ? `UpdateSchedule`, `service selector` ? `ListServices`/`CreateService`.

## Next Steps
1. Implement shared layout components (Header, Sidebar, BottomNav, FAB) referencing tokens and states described above.
2. Build module-specific pages/forms referencing plan sections; reuse `webapp/components` as needed and respect responsive/mobile guidelines.
3. Pair each UI change with backend action + test plan scenario to ensure coverage. Update `frontend_implementation.md` if new patterns appear.
