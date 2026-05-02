# Performance Regression Checklist

Use this before any release that touches business data, routing, service worker, forms, or module list/detail screens.

## Required Local Gates

- `npx tsc --noEmit --pretty false`
- `npm run lint`
- `npm run build`
- `npm run perf:audit`
- `npm run perf:chunks`
- `npm run verify:performance-release`

## Required Module Verification

- `npm run verify:contracts`
- `npm run verify:reports`
- `npm run verify:dashboard`
- `npm run verify:services`
- `npm run verify:inventory`
- `npm run verify:dresses`
- `npm run verify:printing`
- `npm run verify:calendar`
- `npm run verify:productivity`
- `npm run verify:settings`
- `npm run verify:employees`

## Required Smoke

- `npm run smoke:contracts`
- `npm run smoke:dashboard`
- `npm run smoke:calendar`
- `npm run smoke:employees`
- `npm run smoke:settings`
- `npm run smoke:production`

## Manual Browser Smoke

- Contract: add service, add payment, tick checklist, verify list/detail update without manual refresh.
- Finance: create receipt/expense, verify dashboard, ledger, and reports update.
- CRM: change lead status from list/detail, verify count and detail update.
- Operations: update printing/dress/inventory status, verify related contract views update.
- Settings: save studio/profile/credit-card changes, verify visible state updates without full route reload.
- PWA: deploy, reload mobile, verify `/sw.js` updates and protected business data does not stay stale.

## Release Evidence

- Record the deployment URL and production alias.
- Record top app route chunks from `npm run perf:chunks`.
- Record public production smoke result.
- Record any Web Vitals p75 exceptions with owner and next action.
