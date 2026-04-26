# Phase 02: Create/Edit Post-Save Consistency
Status: Complete
Priority: High

## Objective
Avoid ambiguous contract save outcomes where the core contract is saved but the UI reports a failed submit because post-save work failed.

## Files
- `app/actions/contract-mutations.ts`
- Related RPC/migration files if transaction boundaries need database support.

## Tasks
- [x] Classify post-save tasks as recoverable post-save warnings.
- [x] Ensure Google sync is best-effort and cannot block contract save.
- [x] Decide whether internal automation must be transactional or recoverable.
- [x] Ensure dress reservation sync failures return a clear, recoverable warning.
- [x] Add structured warning/log path for best-effort failures.
- [x] Ensure create/edit UI can display a soft warning if needed.

## Test Criteria
- [x] New contract save does not fail due to Google sync.
- [x] Required dress conflict still blocks save before commit.
- [x] Existing contract edit with automation issues does not leave unclear UI state.
- [x] TypeScript passes.
