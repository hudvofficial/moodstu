# Phase 03: Converter Flow Integration

Status: Complete
Dependencies: Phase 02
Priority: P0

## Goal

Wire converter to drawer so the primary action shows day details immediately.

## Checklist

- [x] Add/adjust converter callback: `onOpenDayDetail(date)`.
- [x] Close converter before opening drawer.
- [x] Store selected lunar date in calendar wrapper state.
- [x] Do not mutate calendar view on "view details".
- [x] Keep fallback route behavior for non-calendar usage.

## Acceptance Criteria

- `Xem lich ngay nay` opens drawer every time result is valid.
- Invalid input keeps current invalid state and does not open drawer.
- No calendar view jump until drawer action is clicked.

Next Phase: `phase-04-calendar-actions-mobile.md`
