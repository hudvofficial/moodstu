# Phase 00: Contract Freeze and Current Form Audit

Status: Complete
Dependencies: None
Priority: P0

## Goal

Audit the current event drawer and freeze the Google-like Mood scope before code changes.

## Checklist

- [x] Audit `event-form-drawer.tsx`.
- [x] Audit calendar mutation server actions.
- [x] Separate create/edit/task/google-readonly modes.
- [x] Freeze required fields for create schedule.
- [x] Confirm role-specific owner behavior.

## Acceptance Criteria

- Existing edit/task/google flows have explicit protection.
- Scope stays focused on `Tao lich trinh`.

Next Phase: `phase-01-data-contract-date-time-rules.md`
