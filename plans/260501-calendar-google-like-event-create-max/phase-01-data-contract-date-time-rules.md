# Phase 01: Data Contract and Date-Time Rules

Status: Complete
Dependencies: Phase 00
Priority: P0

## Goal

Create deterministic local state and date-time helpers for quick create.

## Checklist

- [x] Define local create form state.
- [x] Add helper to round time.
- [x] Add helper to combine local date/time.
- [x] Add helper to validate/adjust end after start.
- [x] Define all-day submit behavior.

## Acceptance Criteria

- Date-time payload is backend-compatible.
- No local date is derived through UTC ISO splitting.

Next Phase: `phase-02-quick-create-ui-shell.md`
