# Phase 00: Contract Freeze and Current Regression Cleanup

Status: Complete
Dependencies: None
Priority: P0

## Goal

Freeze the product contract before deeper implementation:

- `Xem lich ngay nay` opens a rich Lunar Day Drawer.
- It does not directly jump calendar as the primary behavior.
- Calendar navigation/create actions live inside the drawer.

## Checklist

- [x] Audit converter, toolbar, wrapper, and lunar helper files.
- [x] Define `LunarDaySummary` data shape.
- [x] Add selected lunar drawer state in calendar wrapper.
- [x] Change converter primary callback to open day detail drawer.
- [x] Keep fallback route behavior if converter is mounted outside calendar.

## Acceptance Criteria

- Click path is unambiguous: converter -> drawer.
- Calendar view state remains stable until user clicks a drawer action.
- Existing converter calculation still works.

Next Phase: `phase-01-lunar-domain-model.md`
