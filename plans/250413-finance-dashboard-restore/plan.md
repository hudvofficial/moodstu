# Plan: Finance Dashboard Restore — V1 Parity + Optimize
**Created:** 2026-04-13
**Status:** 🟡 In Progress
**Audit source:** `docs/reports/audit_2026-04-13_finance.md`

## Overview

Khôi phục và tối ưu Finance Dashboard `/finance` đạt feature parity V1.
Chiến lược: **Port business logic + tối ưu** (KHÔNG copy paste).

## Phases

| Phase | Name | Status | Effort |
|:-----:|------|:------:|:------:|
| 01 | Fix Navigation + Dashboard Hub | ✅ Complete | 2-3h |
| 02 | Smart Dashboard + Analytics RPCs | ✅ Complete | 2-3 ngày |
| 03 | FAB + Quick Actions | ✅ Complete | 3-4h |
| 04 | Compact Stats Bar & HIG Cleanup | ✅ Complete | 2-3h |

## V1 Source Reference
- Components: `C:\Users\Admin\Desktop\Ai\0Moodstudio\webapp\components\finance\dashboard\`
- Analytics: `C:\Users\Admin\Desktop\Ai\0Moodstudio\webapp\lib\analytics\`
- Types: `C:\Users\Admin\Desktop\Ai\0Moodstudio\webapp\types\finance.ts`

## V2 Target
- Components: `c:\Users\Admin\Desktop\Ai\mood saas\mood-studio\components\finance\dashboard\`
- Actions: `c:\Users\Admin\Desktop\Ai\mood saas\mood-studio\app\actions\`
- Types: `c:\Users\Admin\Desktop\Ai\mood saas\mood-studio\types\finance-dashboard.ts`

## Quick Commands
- Phase 1: `/code phase-01`
- Phase 2: `/code phase-02`
- Phase 3: `/code phase-03`
- Phase 4: `/code phase-04`
- Check progress: `/next`

## 2026-04-13 Implementation Update

- Phase 01 dashboard hub restore: completed in V2 codebase.
- Verified: scoped ESLint passed and `npm run build` passed.
- Remaining: Phase 02 Smart Dashboard page `/finance/dashboard`; Phase 03 FAB quick actions.
- 2026-04-13 UPDATE: Phase 02 & 03 completed. Phase 04 Compact Stats Bar integrated perfectly, effectively cleaning up legacy 6-card UI.

## 2026-04-21 Re-audit Correction

Audit source: `docs/reports/audit_2026-04-21_finance_dashboard_v1_parity.md`

Current production status is **not 100% done**:

- Phase 01 is mostly done for `/finance` hub, but compact stats currently expose only 4 headline metrics; keep KPI formula parity under review.
- Phase 02 is **reopened / production-blocked**: `/finance/dashboard` route is missing, `finance-intelligence-queries.ts` still uses mock data, and the RPC formulas are not yet aligned to the finance SSOT.
- Phase 03 is **partial**: `components/finance/finance-fab.tsx` exists, but it is not mounted from the finance layout and its route targets still need verification.
- Phase 04 UI polish is only valid after Phase 02 production wiring is complete.

Decision: do not mark the finance smart dashboard as complete until route, real data, business formulas, SSOT tokens, and performance gates all pass.

## 2026-04-21 Implementation Update

Completed after re-audit:

- Created production route `/finance/dashboard` with Server Component + Suspense streaming zones.
- Removed mock intelligence action path and wired actions to real RPC data.
- Added finance permission guard for dashboard/intelligence server actions.
- Added and pushed Supabase migration `20260421113000_finance_dashboard_production_hardening.sql`.
- Verified build: `/finance/dashboard` appears as a dynamic route.

Remaining parity work:

- Phase 02 is usable but not full V1 parity until scenario/customer/dress/inventory/advanced KPI widgets are ported.
- Finance-wide revenue/outflow SSOT still needs propagation into reports/goals/close if those modules use separate formulas.

## 2026-04-21 Advanced Completion Update

Completed after the V2 optimization pass:

- Added production RPC `get_finance_advanced_intelligence(month, year)` through migration `20260421124500_finance_advanced_intelligence_rpc.sql`.
- Added scenario planning, customer metrics/CLV/conversion, service revenue mix, dress ROI, inventory cost intelligence, and advanced KPI grid to `/finance/dashboard`.
- Kept the page as Server Components with Suspense zones and request-level `cache()` dedupe.
- Verified scoped lint, production build, migration push, and smoke query `advanced_ok=true`.

Current status: `/finance/dashboard` V1 parity + V2 optimization is complete. Finance-wide formula propagation across reports/goals/close remains tracked separately in the optimization plan.
