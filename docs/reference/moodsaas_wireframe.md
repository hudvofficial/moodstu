# MoodStudio SaaS Wireframe

## Global Shell
- Fixed header with logo, search, notifications, and user profile actions.
- Desktop uses tiered sidebar for navigation; mobile folds into a drawer/bottom navigation with FAB for primary "Create" actions. Shared header/footer, font, spacing, and the #8B5E3C earth-tone accent token keep everything cohesive.

## Dashboard
- Hero stat row (contracts, revenue, active clients) followed by multitier tiles showing revenue trends, contract funnel, recent contracts, to-dos, and weekly schedule.
- Layout card grid should gracefully reflow into scrollable sections or list/stacked cards on mobile, with skeleton loaders for cold loads and instant SWR cache hits.

## Contracts Hub
- Filter/search toolbar, CTA row for "New contract", resizable table listing contracts with status badges and timeline chips.
- Detail drawer/panel showing contract stages, payment tracker (timeline), service selector, and approval controls; editing surfaces use modals or drawer flows on mobile.

## Customers, Services, Employees, Finance, CRM, Settings Modules
- Each module follows list/detail structure: tables with header actions (export, filters, add), detail cards/panels with timelines or notes, and forms (create/edit).
- Responsive behavior: tables become cards on mobile, bottom sheets for actions, and consistent tokens (radius, spacing, typography, colors).

## Attendance & Schedules
- Kanban/day/week board with draggable shifts; mobile renders as agenda cards with bottom sheet detail.
- Include quick action chips for assigning staff, sending reminders, and viewing personnel availability.

## Data Behavior & States
- First load shows skeletons; subsequent visits render instantly via SWR cache hits while background revalidates.
- Forms/modals provide inline validation and accessible focus traps; mobile bottom nav and FAB remain visible for primary flows.
