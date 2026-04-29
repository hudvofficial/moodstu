# Phase 05: Verification, Smoke, Final Score
**Status:** Completed
**Priority:** P2
**Dependencies:** Phases 00-04
**Audit issues:** Verification and final scoring

## Objective

Lock the final services score with repeatable remote checks and role-based smoke coverage.

## Target Files

- `scripts/verify-services.mjs`
- `package.json`
- `docs/reports/services_audit_2026_04_28.md`
- `docs/reports/services_score_2026_04_28.md` (new)
- Optional Playwright smoke tests if credentials are available

## Implementation Steps

1. Complete `verify:services`.
   - Service-role reads categories/services.
   - Anon direct table reads denied.
   - Optional public-safe quote RPC/view returns only redacted fields if introduced.
   - Bundle atomic write sanity check.
   - Price rule/relation schemas reject invalid payloads.

2. Manual smoke checklist.
   - Admin/manager can list, create, edit, delete, quote.
   - Sale/media/viewer direct URL access is denied.
   - Contract picker still reads allowed catalog data if required.
   - Invalid stale edit shows optimistic-lock conflict.
   - Invalid bundle child fails without losing existing bundle rows.
   - Category create/update/delete works and respects usage checks.

3. Run final verification.

4. Update score report.
   - Expected score after phases 00-04: 9.6/10.
   - 9.8+ requires automated role matrix and seeded E2E.

## Acceptance Criteria

- `npm run verify:services` passes against remote Supabase.
- TypeScript, lint, build, perf audit, chunk budget pass.
- Supabase migration dry-run is clean after push.
- Audit report and score report reflect final state and residual risk.

## Final Verification Commands

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run verify:services
npm run perf:audit
npm run build
npm run perf:chunks
npx supabase db push --dry-run
```

---
Plan complete after this phase.
