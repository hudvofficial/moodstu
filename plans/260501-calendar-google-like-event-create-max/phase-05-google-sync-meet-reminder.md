# Phase 05: Google Sync, Meet, and Reminder Safe Wiring

Status: Complete for supported sync; Meet/reminder deferred
Dependencies: Phase 04
Priority: P1

## Goal

Wire Google-like fields only when backend support exists.

## Checklist

- [x] Keep Google sync toggle behind `isGoogleConnected`.
- [x] Add Meet toggle only if server supports conference data. Deferred: current server action does not support conference data.
- [x] Add reminder only if storage/action supports it. Deferred: current action/storage path does not support reminder overrides.
- [x] Keep payload clean.
- [x] Add clear sync copy.

## Acceptance Criteria

- No fake Google Meet/reminder behavior.
- Existing Google sync is not regressed.

Next Phase: `phase-06-mobile-a11y-performance-ssot.md`
