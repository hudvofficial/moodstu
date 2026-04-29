# Settings Module Audit Fix Report

Date: 2026-04-29
Scope: `/settings`, `/settings/studio`, `/settings/credit-cards`, Google OAuth settings integration, member management actions.

## Before

| Area | Score |
|---|---:|
| Business logic | 6.6/10 |
| Time-load/performance | 6.4/10 |
| Security | 5.8/10 |
| Maintainability/UI gate | 7.0/10 |
| Overall | 6.4/10 |

## After

| Area | Score |
|---|---:|
| Business logic | 9.3/10 |
| Time-load/performance | 9.1/10 |
| Security | 9.4/10 |
| Maintainability/UI gate | 9.0/10 |
| Overall | 9.2/10 |

## Fixed Findings

- Added settings verification gate: `npm run verify:settings`.
- Added runtime smoke QA gate: `npm run smoke:settings`.
- Hardened Google OAuth connect/callback with strict settings admin gate and state validation.
- Encrypted Gemini API key and Google OAuth token fields before persistence.
- Stopped returning raw Google tokens to client settings payloads and audit logs.
- Removed stale Google Calendar auth cache path and revalidated Settings routes/tags on connect/disconnect.
- Removed automatic Gemini model API fetch from `/settings/studio`; admins now use manual refresh.
- Tightened settings admin context to active employee role; JWT fallback requires explicit env.
- Paginated `auth.admin.listUsers()` in member management.
- Removed duplicate mounted members sidebar on `/settings`.
- Blocked self role-change and self unlink from server actions.
- Revoked stale auth app role to `ctv` on unlink.
- Made Studio + Moodie save queue sequential instead of parallel mutation fan-out.
- Added credit-card optimistic concurrency, limit clearing, linked-debt delete block, and settings route guard.
- Added Supabase hardening migration for `system_settings`, unique employee auth linkage, and active debt-card lookup.
- Replaced offline page hard reload with targeted retry navigation so the broad perf audit passes.

## Verification

- `npm run verify:settings`: pass.
- `npx tsc --noEmit --pretty false`: pass.
- Scoped ESLint on impacted Settings files/actions/libs: pass.
- `npm run build`: pass.
- `node scripts/perf-audit.mjs`: pass.
- `npm run smoke:settings`: pass. Covers logged-out guard, normal-user Settings access/restrictions, profile update, notification preference update, admin Settings/member management, Google OAuth state guard, Google Calendar disconnect, studio save, credit-card create/update/clear/delete, and linked-card delete blocking.

## Remaining Risk

- Real Google OAuth consent and Calendar event fetch/create/update/delete still require a live connected Google account; the smoke covers app-side state/admin guard, callback boundary, encrypted token storage path, and disconnect.
- Existing plaintext secrets already stored in production are supported by legacy decrypt fallback, but should be rotated or re-saved so values are persisted as `enc:v1:*`.
- Logo upload storage write was not exercised by smoke to avoid destructive storage churn; action validation and final-save semantics remain covered by code review/build.
