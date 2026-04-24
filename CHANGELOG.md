# Changelog

## [2.0.5] - 2026-04-24

### Added

- Trien khai production release script: auto bump package version, sync package-lock, generate data/changelog.ts va CHANGELOG.md tu .brain/session.json, ho tro dry-run va patch/minor/major/no-bump.
- Hoàn tất Finance Goals UI + Logic Parity. Thêm các tính năng: đóng góp (contribute), hoàn tác đóng góp (undo), hủy/khôi phục mục tiêu, milestone celebration overlay, và bộ lọc chuẩn Finance.

### Fixed

- Lỗi ReceiptFormModal không hiển thị dữ liệu cũ (Legacy Data Mismatch). Fix bằng cách map 'Tiền mặt' -> 'tien_mat', 'Hợp đồng' -> 'contract_payment' trước khi truyền vào FormState để SelectForm có thể select item.

## [2.0.4] - 2026-04-22

### Added

- Trien khai production release script: auto bump package version, sync package-lock, generate data/changelog.ts va CHANGELOG.md tu .brain/session.json, ho tro dry-run va patch/minor/major/no-bump.
- Hoàn tất Finance Goals UI + Logic Parity. Thêm các tính năng: đóng góp (contribute), hoàn tác đóng góp (undo), hủy/khôi phục mục tiêu, milestone celebration overlay, và bộ lọc chuẩn Finance.

### Fixed

- Lỗi ReceiptFormModal không hiển thị dữ liệu cũ (Legacy Data Mismatch). Fix bằng cách map 'Tiền mặt' -> 'tien_mat', 'Hợp đồng' -> 'contract_payment' trước khi truyền vào FormState để SelectForm có thể select item.

## [1.1.62] - 2026-04-22

### Added

- **Finance Goals UI & Logic Parity (v1+)**: Full implementation of the Finance Goals module with a premium Apple/Stripe-inspired UI.
  - **Premium UI**: Integrated `GoalsStatsBar`, `GoalsFilters`, and interactive goal cards with progress tracks and milestone indicators.
  - **Business Logic**: Support for goal contributions (Commitment, Surplus, Custom), contribution undo/redo (24h window), and goal lifecycle management (Cancel/Restore).
  - **UX Enhancements**: Added `GoalCelebrationOverlay` for milestone achievements (25/50/75/100%) and dynamic icon/color customization.
  - **Finance SSOT Sync**: Unified the Realized Inflow/Outflow formula across Dashboard, Reports, and Goals.

### Changed

- **Layout Standardization**: Unified the Finance layout using the standard `StatsBar` + `TabsFilter` + `SelectPill` pattern for all sub-modules.


## [1.1.61] - 2026-04-13

### Added

- **Finance Profitability Reporting (Phase 04)**: Implemented `ContractProfitDetailDrawer` with detailed financial breakdown (Revenue, Payroll, Printing, Operations).
- **SWR Data Fetching**: Integrated drawing-specific server actions for real-time profitability data retrieval.

### Fixed

- **Responsive Breakpoint Visibility**: Resolved "invisible table" bug caused by using `md:block` (768px) instead of project-standard `lg:block` (1024px) in `ProfitReportTable`.
- **SSOT Token Alignment**: Performed full hardening of the Profit Drawer, resolving 15 styling violations (raw Tailwind colors → semantic tokens, non-standard font classes → SSOT typography tokens).

### Changed

- **Drawer Standardization**: Standardized all drawer sized to `md=480px` or `lg=600px` based on content density, ensuring project-wide spatial consistency.


## [1.1.60] - 2026-04-08

### Added

- **Calendar V1 Audit Freeze**: Audited and stabilized Calendar Module (Phases 1-4).
- **Zod Data Integrity**: Solidified `patchGoogleCalendarEvent` relying unconditionally on stricter schema validation configurations using `.strict()`, securing APIs against undocumented payload manipulations.
- **Timezone Safety Protocol**: Phased out Javascript's native string manipulation mechanics (`.toISOString().split("T")`) in favor of global `date-fns` standards to address daylight shifting issues and local offset bugs on UI DatePicker rendering.

### Fixed

- **ESLint & Hook Constraints**: Corrected React `useMemo` dependency arrays by instituting out-of-component constant fallbacks (like `EMPTY_EVENTS`) resolving invalid lint warnings without `eslint-disable` circumventions.

## [1.1.59] - 2026-04-07

### Changed

- **V2 Gold Standard UI Remediation**: Re-audited and standardized all modules (Calendar, Print, Productivity, Settings, Contracts, Dresses) to enforce the "No Border — Only Shadow" rule (Lesson 64). Over 50+ instances of arbitrary `rgba/hex` strings replaced with automated AST Scripts.
- **SSOT Type-Safety & Styling Compliance**: Resolved Linter errors across `gallery` (converted native `<button>` and `<input>` to centralized Components). Handled strict Typescript event arguments. Swapped all arbitrary typographical values to standard `text-body-sm` / `text-caption`.

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
