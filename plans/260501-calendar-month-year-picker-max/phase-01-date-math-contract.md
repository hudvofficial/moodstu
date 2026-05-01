# Phase 01: Date Math Helper and State Contract

Status: Complete
Dependencies: Phase 00
Priority: P0

## Goal

Make month/year selection deterministic and timezone-safe.

## Checklist

- [x] Add helper for days in month.
- [x] Add helper to build selected date by view mode.
- [x] Month view returns day 1.
- [x] Week/day preserve day and clamp if needed.
- [x] Normalize to local midnight.

## Acceptance Criteria

- Day 31 -> February clamps to 28/29.
- No ISO timezone split is used.

Next Phase: `phase-02-picker-ui-component.md`
