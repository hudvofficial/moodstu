# Changelog

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
