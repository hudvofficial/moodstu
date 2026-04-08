# Phase 02: Route + Layout + Lead List Page
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Build the layout structure and the Lead List page UI utilizing SSOT components exactly as described by `docs/specs/crm.md`.

## Requirements & Constraints
**Implementation MUST follow `docs/specs/crm.md` Section 4 exactly; this phase file is only an execution checklist.**
- **0 Hardcoded Hex Colors**: Use `@theme` tokens exclusively.
- **0 Custom Table Tags**: Do not use raw `<table/tr/th/td>`. Instead, leverage the SSOT Registry components (`TableWrapper`, `THead`, `TBody`, `TH`, `TD`, `TR`).
- **No Native Selects**: Never use `<select>`. Use `<SelectForm>` for forms and `<SelectPill>` for filters Toolbar.
- **File Limits**: Modules must be strictly <= 300 lines (Separate Filters & Stats Bar into their own files).

## Implementation Steps
1. [ ] **Routes & Layouts**: Create `app/(protected)/crm/layout.tsx`, `page.tsx` (redirect), `loading.tsx`, `error.tsx`. Create `leads/page.tsx` and `leads/loading.tsx`.
2. [ ] **List Structure**: Create `components/crm/lead-list-page.tsx`.
3. [ ] **Sub Components**: 
    - `lead-filters.tsx` (Tabs & Pills)
    - `lead-stats-bar.tsx` (Stats overview)
    - `lead-table.tsx` (Desktop Table layout adhering to defined columns)
    - `lead-card.tsx` (Mobile Card)
4. [ ] **Integrate States**: Handle Loading, Empty (no data/no filter), Error, Submit loading states.

## Verification
- [ ] Responsive UI functions optimally.
- [ ] CSS grep verification yields 0 violations for native HTML table tags or inline styling hooks.

---
Next Phase: Phase 03 (Lead Form)
