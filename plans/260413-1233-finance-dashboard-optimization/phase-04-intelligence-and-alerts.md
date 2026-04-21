# Phase 04: Intelligence, Alerts & UI Polish
Status: Complete
Dependencies: Phase 03

## 2026-04-21 Audit Addendum

Intelligence is production-blocked until real analytics replaces mock data:

- [x] Remove `USE_MOCK = true` from `app/actions/finance-intelligence-queries.ts`.
- [x] Create/wire `/finance/dashboard` as the dedicated smart dashboard route.
- [x] Use Server Components + Suspense streaming zones for health/runway/break-even, charts/forecast, and bottom intelligence.
- [x] Harden intelligence RPC security: `SET search_path = public`, `REVOKE ALL FROM PUBLIC`, and `GRANT EXECUTE TO service_role`.
- [x] Include salary/fixed-cost obligations in runway and forecast formulas where applicable.
- [x] Restore missing V1 intelligence modules as optimized V2 widgets: scenario planning, customer metrics, revenue breakdown, dress ROI, inventory costs, and advanced KPI grid.
- [x] Bound SWR revalidation by keeping `/finance/dashboard` server-rendered instead of adding duplicate client SWR fetches.
- [x] Keep AI analysis as Moodie integration, not a separate hardcoded dashboard AI drawer.

## 2026-04-21 Completion Update

- Added `get_finance_advanced_intelligence(month, year)` with service-role grant only.
- Added advanced finance widgets using V2 SSOT classes and no extra client chart bundle.
- Verified scoped lint, production build, Supabase migration push, and smoke query `advanced_ok=true`.

## Objective
Làm "nhẹ" lại các khối cảnh báo thị giác mạnh (Banner) và rà soát UI các component phân tích tài chính sâu (Intelligence). Đảm bảo giao diện cuộn mượt và responsive trên Mobile.

## Implementation Steps
1. [ ] Thiết kế lại `smart-dashboard-banner.tsx` sang dạng Alert/Badge mỏng thay vì chiếm khối lớn.
2. [ ] Rà soát bộ Card tĩnh: `health-score-card.tsx`, `cashflow-runway-card.tsx`, `break-even-card.tsx`.
3. [ ] Rà soát `finance-intelligence-section.tsx`.
4. [ ] Cuối cùng: Chạy npm run dev, test hiển thị chéo giữa iPhone (375px) và Desktop (1440px).
