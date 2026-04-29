# Phase 06: UI Maintainability + SSOT Cleanup
Status: Complete
Dependencies: Phase 05
Priority: P2

## Objective
Bring Settings UI back under maintainability and design-system gates.

## Implementation Steps

### 1. Reduce oversized files
- [x] `components/settings/studio-info-form.tsx` should be <= 250 lines or have a documented exception.
- [x] `components/settings/audit-log-list.tsx` should be <= 250 lines or split mobile/table views.
- [x] `components/settings/edit-profile-modal.tsx` should be <= 250 lines or split avatar/basic/admin fields.
- [x] `components/settings/credit-cards/credit-card-form-modal.tsx` should stay under threshold after Phase 05.

### 2. Fix Settings SSOT gate violations
- [x] Remove `border border-*` from Settings components unless component API requires it.
- [x] Replace with `card-base`, shadow token, ring token, or existing SSOT class.
- [x] Known violations:
  - `components/settings/credit-cards/credit-cards-client.tsx`
  - `components/settings/studio/studio-identity-section.tsx`

### 3. Use shared UI components consistently
- [x] Confirm buttons use `Button` variants or `icon-btn`.
- [x] Confirm form controls use `Input`, `Textarea`, `SelectForm`, `CurrencyInput`, `Switch`.
- [x] Confirm no custom select/native select.
- [x] Confirm icons come from `lucide-react`.

### 4. Responsive polish
- [x] Ensure Settings admin sidebar/member section does not overflow on mobile.
- [x] Ensure credit-card cards do not have clipped labels on narrow screens.
- [x] Ensure modal footer buttons wrap cleanly on small widths.

### 5. Text/encoding cleanup
- [x] Verify displayed Vietnamese text is valid UTF-8 in files touched.
- [x] Avoid mojibake in new code and reports.

## Test Criteria
- [x] Settings gate grep returns 0 violations or documented accepted exceptions.
- [x] No Settings component unintentionally exceeds file-size target.
- [x] Desktop/mobile manual check passes for `/settings`, `/settings/studio`, `/settings/credit-cards`.
- [x] No visible overlap or clipped button text.

## Notes
This phase lifts maintainability and UX score after functional risks are closed.

---
Next Phase: phase-07-verification-final-score.md
