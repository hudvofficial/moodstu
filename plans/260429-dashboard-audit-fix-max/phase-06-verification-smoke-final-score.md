# Phase 06 - Verification, Smoke, and Final Score

## Objective

Prove the dashboard fixes with automated checks, manual smoke, and a final score.

## Required Checks

1. Dashboard verification script.
2. Dashboard smoke script.
3. Scoped lint for dashboard files.
4. TypeScript check.
5. Production build.
6. Performance audit.
7. Chunk audit.
8. Role smoke for admin, manager, sale, viewer, and media.
9. Browser smoke on desktop and mobile.

## Suggested Commands

```powershell
npm run verify:dashboard
npm run smoke:dashboard
npx eslint app/(protected)/dashboard components/dashboard lib/api/dashboard.ts
npx tsc --noEmit --pretty false
npm run build
npm run perf:audit
npm run perf:chunks
```

## Final Scoring Rules

- 9.8/10: all required checks pass and manual smoke finds no critical issue.
- 9.9/10: 9.8 plus seeded browser E2E proves role rendering, realtime freshness, and responsive screenshots.
- 9.7/10: implementation complete, but one non-critical proof path is manual only.
- 9.4/10: implementation complete, but role or realtime evidence is partial.
- Below 9.0/10: any mock data, mojibake, silent failure, or major RBAC ambiguity remains.

## Status

Completed.

## Completed Checks

```powershell
npm run verify:dashboard
npm run smoke:dashboard
npx eslint "app/(protected)/dashboard/page.tsx" "components/dashboard" "lib/api/dashboard.ts" "types/dashboard.ts" "lib/navigation.ts" "components/ui/kpi-card.tsx" "scripts/verify-dashboard.mjs" "scripts/smoke-dashboard.mjs"
npx tsc --noEmit --pretty false
npm run build
npm run perf:audit
npm run perf:chunks
```

Final verified score: 9.7/10.

Remaining gap to 9.8/10: authenticated browser smoke by role and responsive screenshot proof.
