# Phase 01: Lunar Domain Model and Trusted Helpers

Status: Complete
Dependencies: Phase 00
Priority: P0

## Goal

Move day detail logic into a typed, pure helper so UI stays simple and data is not duplicated.

## Checklist

- [x] Add `LunarDaySummary`.
- [x] Add `getLunarDaySummary(date)`.
- [x] Include solar/lunar date, weekday, can chi day/month/year.
- [x] Add gio hoang dao from deterministic day-branch mapping; leave tiet khi unset until validated.
- [x] Return `null` for unsupported fields instead of mock values.

## Acceptance Criteria

- Drawer can render from one summary object.
- No network call is needed.
- No fake cat-hung/rating data is shown.

Next Phase: `phase-02-drawer-ui-shell.md`
