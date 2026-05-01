# Phase 00: Contract Freeze and V1 Diff

Status: Complete
Dependencies: None
Priority: P0

## Goal

Port V1's useful month/year picker behavior into V2 without carrying over old UI patterns.

## Checklist

- [x] Confirm scope excludes mini calendar sidebar.
- [x] Keep V1 behavior: clickable title, month mode, year mode, today shortcut.
- [x] Improve V2 behavior: use `onDateChange`, preserve view, clamp invalid day.
- [x] Avoid router usage inside picker.

## Acceptance Criteria

- Scope is only `/calendar` toolbar title navigation.
- No server query or schema work.

Next Phase: `phase-01-date-math-contract.md`
