# Phase 00: Baseline + Regression Gates
Status: Complete
Dependencies: None
Priority: P0

## Objective
Dong bang baseline audit truoc khi sua, tao verification gate rieng cho `/settings`, va tranh lap lai loi da tim thay.

## Implementation Steps

### 1. Capture current baseline
- [x] Add/update audit report: `docs/reports/audit_2026-04-29_settings_full.md`
- [x] Include score matrix: business, time-load, security, maintainability.
- [x] Include P0/P1/P2 finding IDs and exact file references.

### 2. Add settings verification script
- [x] Create `scripts/verify-settings.mjs`.
- [x] Check required files exist:
  - `app/(protected)/settings/page.tsx`
  - `app/(protected)/settings/studio/page.tsx`
  - `app/(protected)/settings/credit-cards/page.tsx`
  - `app/actions/settings-queries.ts`
  - `app/actions/settings-mutations.ts`
  - `lib/validations/settings.schema.ts`
- [x] Static checks:
  - No `style={{` in `components/settings/**`.
  - No hardcoded hex colors in `components/settings/**`.
  - No `material-symbols`.
  - No settings component over target without explicit exception.
  - No Google OAuth callback write without admin/state guard markers.
  - No settings mutation touching service-role data without auth wrapper.

### 3. Add optional package script
- [x] Add `"verify:settings": "node scripts/verify-settings.mjs"` to `package.json`.

## Test Criteria
- [x] `npm run verify:settings` reports current known failures before fix.
- [x] `npm run lint -- "components/settings" "app/(protected)/settings" "app/actions/settings-queries.ts" "app/actions/settings-mutations.ts"` passes or known failures are documented.
- [x] `npx tsc --noEmit --pretty false` passes.

## Notes
This phase is intentionally light on app logic. It creates the safety net for later phases.

---
Next Phase: phase-01-oauth-secret-security.md
