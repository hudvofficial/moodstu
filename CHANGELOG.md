# Changelog

## [1.1.58] - 2026-04-03

### Changed

- **Productivity Module UI/UX Remediation (4 Phases)**: Synchronized UI components with the V2 Gold Standard by adopting SSOT tokens (`progress-track`, `text-overline`, `card-interactive`, `card-base`).
- **Codebase Maintenance Enforcement**: Executed file-splitting on oversized components to meet the <250L standard. `productivity-page-client.tsx` reduced (324L → 246L) and `productivity-detail-content.tsx` reduced (268L → 215L) via logic extraction.
- **Productivity Module Optimization**: Prevented redundant network triggers with SWR `dedupingInterval: 5000`. Secured React render cycles by wrapping complex array operations inside un-conditional `useMemo` hooks.
- **Mobile Grid & Header UX**: Re-architected mobile metric displays to a compact 2x2 grid. Fixed native HTML uppercase string resolution overrides caused by parent standard Button css properties.

## [1.1.57] - 2026-04-02

### Added

- **Settings Module V2 Business Logic (Phase 1 & 2)**: Comprehensive refactoring of server actions for profile, notifications, and studio info.
- **Settings Layout Standardization (Phase 02)**: Refactored main settings to **V2 Gold Standard `detail-grid` (8/4)** layout.
- **Profile UI Consolidation**: Integrated Logout action directly into `ProfileCard` (top-right icon 🚪), removing redundant footer button.
- **Auth User ID Lookup Pattern**: Replaced fragile email-based employee lookups with `auth_user_id` linked directly to Supabase Auth UUIDs.
- **Atomic Optimistic Locking**: Hardened `updateStudioInfo` mutation with atomic version checks (`updated_at`) to prevent race conditions.
- **Zod Data Integrity**: Implemented `settings.schema.ts` for all mutation actions, ensuring strict type-safety and field validation.
- **Audit Log Coverage**: Added `recordId` and full `oldData`/`newData` diffing for Settings audit logs.

### Changed

- **Sidebar Asset Distribution**: Swapped Members list to the 4-column sidebar and moved Changelog/Version to the 8-column main area for optimal readability.
- **UI Styling (forms.css)**: Added `.icon-btn.text-error` hover variant with red-tinted background matching Apple HIG destructive patterns.

### Fixed

- **Auth Core (withAdmin)**: Resolved case-sensitivity in role checking and fixed RLS block in fallback queries by correctly using cached admin client.
- **DB Schema Mismatch**: Removed non-existent columns (`bank_name`, `salary_info`, etc.) from profile actions to fix server-side execution errors.
- **Dead Code Removal**: Deleted redundant `user-management-actions.ts`.

## [1.1.56] - 2026-03-31 (WIP)

### Fixed

- **Quote Modal Layout**: Identified critical 1375px width regression vs V1 340px parity.
- **Service Bundle Section (Pending)**: Scheduled migration to `lucide-react` and `formatCurrency`.
- **UI Consistency (Pending)**: Cleanup unused filter props and mobile list button tokens.

## [1.1.55] - 2026-03-30

### Added

- **Services Module V2 Implementation (Phase 1a & 1b)**: Full-stack migration from V1 to V2 architecture.
- **Infrastructure**: New `services`, `service_categories`, and `service_bundles` tables with Soft Delete and Optimistic Locking support.
- **Server Actions**: Robust CRUD actions for services and categories using `withAuth` and `fireAuditLog`.
- **Responsive List Page**: Implemented `/services` with specialized views:
  - **Desktop Table**: High-density table with expandable row details.
  - **Mobile List**: Compact card-based rows with interactive expand state.
  - **Grid View**: Visual card layout with hover action overlays.
- **Stats & Filters**: Real-time stats recalculation (total, avg/min/max price) and category-chip filtering.
- **Build Compliance**: Extracted `calculateServiceStats` to utilities to fix Next.js Server Action build errors.

## [1.1.54] - 2026-03-28

### Added

- **Searchable Combobox Component**: New `ComboboxSearch` with real-time filtering, portal-based rendering (to avoid modal clipping), and keyboard navigation.
- **Inventory UX**: Replaced static `SelectForm` with `ComboboxSearch` in `StockInModal` and `StockOutModal` to handle large item lists efficiently.

## [1.1.53] - 2026-03-25

### Added

- **Architecture Standardization (Audit Logs + Zod + Error Boundaries)**: Phase A fixed 4 critical gaps.
- **Audit Logs**: Enhanced `createContract`, `updateContractStatus`, `cancelContract`, `deleteContract`, and `reactivateContract` with fire-and-forget audit logging.
- **Zod Validation**: New `employee.schema.ts` enforces data integrity in `createEmployee` server action.
- **Error Boundaries**: Native Next.js `error.tsx` added to Contracts and Employees modules with SSOT styling.
- **Contracts SEO**: Added metadata title to `/contracts` page.

## [1.1.52] - 2026-03-20

### Added

- Created `plans/260320-1340-create-page-header/plan.md` for header optimization.

### Changed

- **Contract Drawer UI**: Upgraded segmented control (tabs) with Apple-inspired design. Improved depth using `shadow-md` and `bg-neutral-100/60` background. Removed explicit ring border per user preference.
- **Create Contract Page**: Removed redundant Desktop title ("Tạo hợp đồng") and description block. The form now starts immediately after the breadcrumb, saving ~80px of vertical space.
- **Event Timeline**: Confirmed the tab is functional. It displays events and task progress bars correctly when data is present.

### Fixed

- UI "flatness" in contract drawer tabs by enhancing container contrast and active tab elevation.
