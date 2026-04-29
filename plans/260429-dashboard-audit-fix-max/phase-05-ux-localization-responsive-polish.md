# Phase 05 - UX, Localization, and Responsive Polish

## Objective

Make `/dashboard` feel finished: correct Vietnamese, predictable states, and no layout defects.

## Tasks

1. Replace every mojibake string with correct Vietnamese.
2. Centralize formatting for currency, dates, counts, and percentages.
3. Remove hardcoded display strings that encode business values.
4. Add empty states that explain absence of data without pretending success.
5. Add error states that are visible but not noisy.
6. Verify desktop, tablet, and mobile layouts.
7. Ensure chart legends, labels, and cards do not overflow.
8. Ensure keyboard and screen reader basics are intact for interactive items.

## Acceptance Criteria

- `rg` finds no mojibake patterns in dashboard route/components.
- Currency and dates are formatted through shared helpers.
- No widget layout breaks on mobile.
- Empty/error/loading states are clear and consistent.

## Status

Completed.

Dashboard widgets now have empty/redacted/error states, corrected Vietnamese copy, role-aware shortcuts, and responsive-safe list/chart rendering.
