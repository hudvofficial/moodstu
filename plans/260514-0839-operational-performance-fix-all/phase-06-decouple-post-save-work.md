# Phase 06: Decouple Heavy Post-Save Work
Status: Completed
Priority: P1

## Objective
Return create/edit contract result after the core atomic save, and move slow automation to best-effort background where safe.

## Files
- `app/actions/contract-mutations.ts`
- `app/actions/contract-event-actions.ts`
- `app/actions/checklist-actions.ts`
- `lib/contract-event-google-sync.ts`
- Optional migration for a lightweight job/status table if needed

## Tasks
1. Identify which post-save tasks must block:
   - validation and atomic save must block
   - dress conflict validation must block
   - reservation sync may need to block only when dress items changed
   - Google sync should not block user response
   - addon history should not block user response
2. Split post-save work into:
   - required synchronous work
   - best-effort asynchronous work
3. Record warnings or background status so failures are visible without making saved contract look failed.
4. Prefer DB trigger/RPC for reservation status refresh if it removes sequential per-dress calls.

## Acceptance Criteria
- Core create/edit returns faster for normal contracts.
- If Google sync fails, contract save still succeeds with visible warning/log.
- Data integrity remains correct for dress reservations and payments.

## Result
- `createContract()` now profiles as `contracts.createContract`.
- Core `save_contract_atomic` remains blocking.
- Dress conflict validation remains blocking.
- Dress reservation sync blocks only when the reservation fingerprint changes.
- New-contract event/checklist creation remains synchronous so the detail page has core workflow data.
- Google Calendar sync and addon history now run through Next `after()` background tasks.
- Contract cancel/delete/reactivate Google cleanup/sync also runs through `after()`.
- Background failures are logged without turning a committed contract save into a failed save.
