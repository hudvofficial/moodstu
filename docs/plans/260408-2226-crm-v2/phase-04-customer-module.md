# Phase 04: Customer List + Detail
Status: ⬜ Pending
Dependencies: Phase 03

## Objective
Build out the "Hồ sơ KH" (Customer) module sharing the same robust architectural patterns from the Lead workflow.

## Requirements & Constraints
**Implementation MUST follow `docs/specs/crm.md` Section 4 exactly; this phase file is only an execution checklist.**
- Strict reuse of the exact structural components and rules established in Phase 02/03 (`TableWrapper`, `SelectPill`, `UnifiedModal`).
- Focus specifically on Lifetime Value (LTV) formatting.
- `updateCustomer` requires `expectedUpdatedAt` locking pattern.
- **File limits**: Modules must not exceed 300 LOC limit.

## Implementation Steps
1. [ ] **Routing**: Add `app/(protected)/crm/customers/page.tsx` & `loading.tsx`.
2. [ ] **List Structure**: Create `components/crm/customer-list-page.tsx`.
3. [ ] **Sub Components**:
    - `customer-filters.tsx` (Search + Pills).
    - `customer-stats-bar.tsx`
    - `customer-table.tsx` (Desktop Table)
    - `customer-card.tsx` (Mobile Card)
4. [ ] **Customer Modals**:
    - `customer-form-modal.tsx` (Create/edit).
    - `customer-detail-drawer.tsx` (Detail view highlighting LTV).

## Verification
- [ ] UI consistently pairs visually with the Employee component patterns and the Lead table counterparts.
- [ ] Locking logic (`expectedUpdatedAt`) properly bridges component forms to `updateCustomer`.
- [ ] CSS grep validation = 0 violations.

---
Next Phase: Phase 05 (Polish)
