# Phase 05: UX, Localization, Mobile, and Accessibility Polish
**Status:** In Progress
**Priority:** P2
**Target score impact:** 9.6 -> 9.7

## Goal

Remove UI drift and make calendar controls match the actual supported behavior on desktop and mobile.

## Work Items

1. Scan calendar files for mojibake and raw enum labels.
2. Replace calendar UI labels with display-map helpers where possible.
3. Confirm mobile toolbar only exposes supported mobile views, or implement mobile week/day views.
4. Check drawer button labels, errors, empty states, and toast messages for readable Vietnamese.
5. Verify keyboard shortcuts do not fire inside drawers, menus, or text inputs.
6. Check small viewport text wrapping and button overflow.
7. Add accessible labels/tooltips to icon-only buttons where missing.

## Acceptance Criteria

- Calendar UI has no visible mojibake or unaccented status labels.
- Mobile controls match actual rendered view behavior.
- Important icon buttons have accessible names.
- No compact button text overlaps at common mobile widths.

## Verification

```powershell
rg -n "Hoan thanh|Dang lam|Chua lam|Published|L[aA].*\\xbb|Th[Aa].*\\xba|\\uFFFD" app/(protected)/calendar components/calendar hooks/use-calendar-data.ts
npx eslint "app/(protected)/calendar" components/calendar hooks/use-calendar-data.ts hooks/use-calendar-keyboard.ts
npm run build
```

## Notes

- Status filter localization is fixed.
- Broader calendar UI mojibake/accessibility scan remains open.
