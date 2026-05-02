# Phase 09-10 - Release Readiness

Scope: add repeatable QA/release gates for the performance plan and document what can be proven locally versus what needs authenticated browser or production traffic.

## Added Gates

- `npm run verify:performance-release`
  - verifies the required module verify/smoke scripts exist.
  - verifies PWA business-data cache rules remain conservative.
  - verifies heavy static import guards remain active.
  - verifies the regression checklist exists.
- `npm run smoke:production`
  - checks production `/login`.
  - checks production `/offline`.
  - checks protected `/contracts` redirects without auth.
  - checks production `/sw.js` is reachable and includes the Supabase REST rule.
  - posts a synthetic Web Vital payload to `/api/monitoring/web-vitals`.
- `docs/release/performance-regression-checklist.md`
  - records local gates, module verification, smoke coverage, manual browser smoke, and release evidence.

## Local Evidence

- Existing module verification and seeded smoke scripts passed.
- Production public smoke is repeatable without privileged browser credentials.
- Authenticated browser smoke and real Web Vitals p75 remain production validation work because this repo does not currently include Playwright auth credentials.

## Production Validation Rule

Do not claim real-user KPI success from local build output alone. Phase 09/10 can only be final-release complete after:

- authenticated browser smoke is run on the deployed app.
- Web Vitals p75 and route TTFB are captured from staging/production traffic.
- service worker update behavior is checked on a real mobile session after deploy.
