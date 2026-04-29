# Phase 03: Atomic Settings Consistency
Status: Complete
Dependencies: Phase 02
Priority: P1

## Objective
Make Settings saves predictable:
- No false "all or nothing" UX when saves are partial.
- Optimistic lock conflicts are reported correctly.
- Critical settings writes are auditable and durable.

## Implementation Steps

### 1. Choose save model
Pick one approach before coding:

Option A: Split save controls
- Studio info save button only saves `studio_info`.
- Moodie AI save button only saves `system_settings`.
- Lowest implementation risk.

Option B: Atomic bundle action
- New action `saveStudioSettingsBundle()` validates both payloads.
- DB transaction via RPC updates `studio_info` and upserts `system_settings`.
- Highest consistency score, more migration work.

Recommended: Option B if we are optimizing for max score.

### 2. Add atomic RPC if using Option B
- [x] Migration: `save_studio_settings_atomic(...)`.
- [x] Lock current `studio_info` row `FOR UPDATE`.
- [x] Check `expected_updated_at`.
- [x] Update studio fields.
- [x] Upsert Gemini model/key metadata if provided.
- [x] Return updated row and masked Moodie state.
- [x] Grant execute only to service role.

### 3. Fix optimistic lock conflict handling
- [x] File: `app/actions/settings-mutations.ts`
- [x] Avoid `.single()` masking 0-row conflict as generic DB error.
- [x] Use `.maybeSingle()` plus explicit no-row conflict message, or RPC raises conflict.
- [x] Keep Vietnamese user-facing message stable.

### 4. Make audit durable for settings writes
- [x] Use `writeAuditLog()` and `await` for critical settings mutations.
- [x] Do not fire-and-forget secrets, role changes, OAuth connect/disconnect.
- [x] Audit masked secret only, never raw key/token.

### 5. Normalize and sanitize payloads
- [x] Trim strings before DB write.
- [x] Convert empty optional fields to `null` or omit consistently.
- [x] Restrict timezone to allowed list or validate with platform API.
- [x] URL fields: allow empty string/null, otherwise valid URL.

### 6. Logo upload consistency
- [x] Decide whether logo upload persists immediately or only after save.
- [x] If upload happens before save, either update `studio_info.logo_url` immediately in the same action or add orphan cleanup behavior.
- [x] Add audit log for final logo assignment.

## Test Criteria
- [x] Studio conflict shows conflict message, not generic DB error.
- [x] Moodie key/model failure cannot silently leave UI thinking studio save fully failed/succeeded incorrectly.
- [x] All settings writes have audit rows.
- [x] No raw secrets in audit rows.
- [x] Empty optional fields remain stable after refresh.

## Notes
This phase mostly affects business logic score.

---
Next Phase: phase-04-timeload-performance.md
