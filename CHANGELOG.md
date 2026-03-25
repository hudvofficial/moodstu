# Changelog

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
