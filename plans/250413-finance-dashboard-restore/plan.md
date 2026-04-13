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
