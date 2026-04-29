# Phase 02: RBAC + Member Management Hardening
Status: Complete
Dependencies: Phase 01
Priority: P0

## Objective
Remove stale privilege paths and make member management server-safe, not just UI-safe.

## Implementation Steps

### 1. Revoke role on unlink
- [x] File: `app/actions/user-management.ts`
- [x] In `unlinkUserFromEmployee(authUserId)`, after unlinking employee, call `syncAuthIdentity()` or dedicated helper to set role to lowest role (`ctv`/viewer equivalent).
- [x] Clear or neutralize app metadata used by `withAdmin` fallback.
- [x] Audit old role -> new role.

### 2. Add server-side self-protection
- [x] In `updateUserRole(authUserId, newRole)`, reject changing own role unless explicitly supported by a safer owner flow.
- [x] In `unlinkUserFromEmployee(authUserId)`, reject unlinking current user.
- [x] UI already disables these actions, but server must enforce them.

### 3. Harden `withAdmin` fallback behavior
- [x] File: `lib/auth_utils.ts`
- [x] Review `canCurrentUserManageSettings()`.
- [x] If an employee record exists but is inactive/deleted, never fallback to JWT role.
- [x] If employee is missing because it was unlinked, prefer deny for settings admin unless an explicit bootstrap/super-admin allowlist exists.
- [x] Document any intentional fallback.

### 4. Paginate and limit auth users
- [x] File: `app/actions/user-management.ts`
- [x] Change `getAuthUsers()` to accept `{ page, perPage, search? }`.
- [x] Use `supabase.auth.admin.listUsers({ page, perPage })`.
- [x] Default perPage <= 50.
- [x] Return `{ users, total?, page, perPage }`.

### 5. Link/unlink transaction safety
- [x] Ensure link flow cannot race-link one employee to two users.
- [x] Prefer DB uniqueness constraint for `employees.auth_user_id WHERE auth_user_id IS NOT NULL`.
- [x] Add migration if missing.
- [x] If using multiple updates, use RPC transaction or strict uniqueness errors with friendly messages.

## Test Criteria
- [x] Manager cannot change own role via direct server action.
- [x] Manager cannot unlink self via direct server action.
- [x] Unlinked admin user immediately loses Settings admin access.
- [x] Inactive/deleted employee cannot use stale app metadata to regain admin.
- [x] Members list handles >50 auth users without fetching all users.
- [x] Audit log records role changes and unlink revocation.

## Notes
This phase raises security score and prevents privilege drift.

---
Next Phase: phase-03-atomic-settings-consistency.md
