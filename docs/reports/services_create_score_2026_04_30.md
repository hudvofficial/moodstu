# Services Create Score - 2026-04-30

Scope: `/services/create`, shared service form create path, category loading, submit/loading behavior, bundle search, and verification gates.

## Score

- Before: 8.8/10
- After: 9.8/10
- Practical maximum reached: yes
- 10/10 blocker: seeded automated browser E2E in CI for role matrix and create/update/delete flows.

## What Changed

- Added an immediate submit lock in `useServiceForm` to prevent double-create from rapid clicks or Enter + click races.
- Added create/edit loading labels and kept cancel/delete disabled while submitting.
- Added client validation for finite non-negative prices, image URL format, and non-empty bundle composition.
- Mapped duplicate service code failures to a field-level message instead of raw database text.
- Stopped silently falling back to empty categories when SSR category fetch fails.
- Added `/services/create/loading.tsx` and `/services/create/error.tsx`.
- Switched bundle lookup from broad `getServices()` to narrow `searchServicesForBundle()`.
- Added bundle search loading, empty, stale-response protection, and accessible result buttons.
- Replaced key create-form mojibake/emoji markers in touched files with clear Vietnamese text and lucide icons.
- Added no-category guidance and back-button accessibility.

## Verification

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run verify:services
npm run perf:audit
npm run build
npm run perf:chunks
```

Results:

- TypeScript: passed.
- Lint: passed with 0 errors and 5 pre-existing warnings in `lib/navigation-data-prefetch.ts`.
- Services verification: passed.
- Performance audit: passed.
- Build: passed.
- Chunk budget: passed; no app route chunks over 80KB.

## Residual Risk

- No automated browser E2E was added in this pass.
- Final 10/10 requires seeded admin/manager/sale/media/viewer browser tests that exercise direct URL denial and successful create flows.

