# Phase 04: Time-load + Cache Optimization
Status: Complete
Dependencies: Phase 03
Priority: P1

## Objective
Reduce unnecessary Settings load work and eliminate stale integration state.

## Implementation Steps

### 1. Render admin/sidebar content once
- [x] File: `components/settings/settings-view.tsx`
- [x] Remove duplicate `sidebarContent` mounting for mobile and desktop.
- [x] Use one DOM instance after main content and responsive layout/order classes.
- [x] Ensure mobile still shows admin/member sections below profile/prefs/changelog.

### 2. Lazy-load members only when needed
- [x] Split `MembersSection` into a dynamic/admin-only subcomponent if helpful.
- [x] Fetch members only once.
- [x] Add explicit loading and error state.
- [x] Add refresh button using current page/search.

### 3. Server-side pagination/search for members
- [x] Use Phase 02 paginated `getAuthUsers()`.
- [x] Add small pagination UI if there are more users.
- [x] Avoid O(auth users x employees) client/server mapping for large lists.
- [x] Consider fetching employees by `auth_user_id IN (...)` and email matches for current page only.

### 4. Parallelize settings page data
- [x] File: `app/actions/settings-queries.ts`
- [x] Review `getSettingsPageData()`.
- [x] Keep auth context first if needed, then run notification prefs and lightweight derived flags with minimum queries.
- [x] Avoid admin client reads that duplicate cached auth context.

### 5. Moodie model options load behavior
- [x] Avoid auto-calling Gemini model API on every `/settings/studio` visit if saved key exists.
- [x] Prefer default static options and manual refresh.
- [x] Cache successful model list briefly server-side if needed, keyed without exposing API key.
- [x] Preserve manual refresh for admins.

### 6. Calendar token lookup cache
- [x] Use no-store token lookup or strict tag invalidation from Phase 01.
- [x] Verify connect/disconnect reflects immediately.

## Performance Targets
- `/settings` initial admin load: no duplicate member fetch.
- `/settings` non-admin load: no admin member action call.
- `/settings/studio` initial load: no external Gemini API call unless user requests refresh.
- Google disconnect: effective immediately, no 300s stale window.

## Test Criteria
- [x] Network/server logs show one `getAuthUsers()` call per Settings admin view.
- [x] Non-admin never calls `getAuthUsers()`.
- [x] Studio page render does not depend on Gemini API latency.
- [x] `node scripts/perf-audit.mjs` either passes or unrelated non-settings failure is documented/fixed separately.

## Notes
This phase targets time-load score without changing business behavior.

---
Next Phase: phase-05-credit-cards-integrity.md
