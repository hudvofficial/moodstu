# Phase 05: Performance, Accessibility, and SSOT Polish

Status: Complete
Dependencies: Phase 04
Priority: P1

## Goal

Remove polish gaps that keep the feature from max score.

## Checklist

- [x] Memoize summary by date key.
- [x] Ensure opening drawer makes no server requests.
- [x] Add accessible title/labels through shared Drawer/Button primitives.
- [ ] Check focus and keyboard path in browser.
- [x] Scan new code for non-token hardcoded styling.
- [ ] Clean scoped mojibake in touched UI copy if safe.

## Acceptance Criteria

- No layout shift while opening drawer.
- Keyboard basics work.
- New UI uses SSOT tokens.

Next Phase: `phase-06-verification-final-score.md`
