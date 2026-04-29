# Phase 01: OAuth + Secret Security Hardening
Status: Complete
Dependencies: Phase 00
Priority: P0

## Objective
Fix all Settings integration security blockers:
- Google OAuth can only be started/completed by admin/manager.
- OAuth flow uses CSRF `state`.
- Google tokens and Moodie Gemini key are no longer stored/read as plain client-facing settings.
- Cache invalidation cannot leave disconnected Google Calendar active.

## Implementation Steps

### 1. Add route-level admin guard for Google OAuth
- [x] File: `app/api/auth/google/route.ts`
- [x] Verify current user with Supabase session.
- [x] Resolve active employee role or app metadata role using existing auth helpers.
- [x] Allow only `admin`/`manager`.
- [x] Return redirect to `/settings` or JSON 403 for unauthorized users.

### 2. Add OAuth `state`
- [x] Generate random state in `/api/auth/google/route.ts`.
- [x] Store it in secure, httpOnly, sameSite=lax cookie with maxAge <= 10 minutes.
- [x] Include `state` in Google authorization URL.
- [x] File: `app/api/auth/google/callback/route.ts`
- [x] Validate returned `state` against cookie before token exchange.
- [x] Clear cookie after successful or failed callback.

### 3. Guard callback with admin permission
- [x] In callback, after state validation and before DB write, require active admin/manager.
- [x] Do not use service-role write until after authorization passes.
- [x] Keep redirect behavior user-friendly:
  - no session -> `/login`
  - no permission -> `/settings?google_error=forbidden`
  - state mismatch -> `/settings/studio?google_error=invalid_state`

### 4. Move integration secrets behind server-only helper
- [x] Create `lib/server-secrets.ts` or `lib/settings-secrets.ts`.
- [x] Encrypt/decrypt with `SETTINGS_SECRET_KEY` using Node crypto AES-GCM.
- [x] Store only encrypted payload for:
  - Gemini API key
  - Google OAuth `access_token`
  - Google OAuth `refresh_token`
- [x] Ensure public/admin UI only receives masked status.

### 5. Add migration for secret hardening
- [x] Add migration for encrypted secret storage, one of:
  - `system_settings.encrypted_value`, `is_secret`, `value = null` for secrets; or
  - new `integration_secrets` table keyed by setting name.
- [x] Enable and force RLS.
- [x] Revoke direct `authenticated` table access if app uses service-role action boundary.
- [x] Add backfill strategy for existing plain values.

### 6. Update runtime consumers
- [x] File: `lib/system-settings.ts`
- [x] `getMoodieGeminiRuntimeConfig()` reads decrypted secret server-side.
- [x] File: `lib/googleCalendarService.ts`
- [x] Read/decrypt Google tokens server-side only.
- [x] Never expose raw tokens through `getStudioInfo()` or client props.

### 7. Fix calendar cache invalidation
- [x] Either remove `unstable_cache` for `studio_info.google_calendar_auth`, or call `revalidateTag("studio-info")` after connect/disconnect.
- [x] Prefer no caching for OAuth tokens; one-row DB lookup is cheaper than stale auth risk.

## Test Criteria
- [x] Non-admin logged-in user cannot start Google OAuth.
- [x] Non-admin cannot complete callback into `studio_info`.
- [x] Callback without valid state fails before token exchange/write.
- [x] Admin connect/disconnect works.
- [x] Disconnect takes effect immediately in calendar fetch.
- [x] Raw Gemini key and Google tokens do not appear in client props, audit logs, or masked settings response.
- [x] `npm run verify:settings` passes Phase 01 checks.

## Notes
This is the highest-impact phase. Do not start UI polish before this passes.

---
Next Phase: phase-02-rbac-members-hardening.md
