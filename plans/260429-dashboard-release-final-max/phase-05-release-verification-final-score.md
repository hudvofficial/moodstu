# Phase 05 - Release Verification and Final Score

## Objective

Prove `/dashboard` is release-final.

## Required Commands

```powershell
npm run verify:dashboard
npm run smoke:dashboard
npx eslint "app/(protected)/dashboard/page.tsx" "components/dashboard" "lib/api/dashboard.ts" "types/dashboard.ts" "lib/auth_utils.ts" "scripts/verify-dashboard.mjs" "scripts/smoke-dashboard.mjs"
npx tsc --noEmit --pretty false
npm run build
npm run perf:audit
npm run perf:chunks
```

## Browser Smoke

Run authenticated browser smoke for:

- admin
- manager
- sale
- media
- viewer
- inactive employee

Check:

- correct role-specific cards
- no sensitive finance payload for restricted roles
- upcoming work appears for the correct roles
- payment reminders follow payment-plan priority
- inactive employee is blocked
- desktop and mobile screenshots are readable

## Final Scoring

- 9.8/10: all business fixes and command checks pass.
- 9.9/10: 9.8 plus browser E2E/screenshots prove role, realtime, and responsive behavior.
- Below 9.5/10: any P1 blocker remains.

## Status

Automated release gate completed.

Commands passed on 2026-04-29:

- `npm run verify:dashboard`
- `npm run smoke:dashboard`
- `npx eslint "app/(protected)/dashboard/page.tsx" "app/(protected)/layout.tsx" "app/account-disabled/page.tsx" "components/dashboard" "lib/api/dashboard.ts" "types/dashboard.ts" "lib/auth_utils.ts" "lib/supabase/middleware.ts" "scripts/verify-dashboard.mjs" "scripts/smoke-dashboard.mjs"`
- `npx tsc --noEmit --pretty false`
- `npm run build`
- `npm run perf:audit`
- `npm run perf:chunks`

Final score:

- 9.8/10 for automated release-final readiness.
- 9.9/10 remains pending browser E2E/screenshots for role-specific UI, realtime freshness, and responsive proof.
