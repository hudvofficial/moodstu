# Phase 03: Lead Form + Detail Drawer
Status: ⬜ Pending
Dependencies: Phase 02

## Objective
Implement Lead Creation/Editing Modals and the Lead Detail Drawer featuring the Care Log timeline exactly matching the specification.

## Requirements & Constraints
**Implementation MUST follow `docs/specs/crm.md` Section 4 exactly; this phase file is only an execution checklist.**
- **0 Hardcoded Hex Colors**: Use `@theme` tokens exclusively.
- **Form Rigidity**: Use `.form-grid-2col`, `.input-base`, `.label-base` strictly.
- **Component Enforcements**: Use `UnifiedModal`, `<SelectForm>`, `<CurrencyInput>`, and `<DatePicker>`.
- **Locking Synchronization**: `expectedUpdatedAt` must be properly maintained and passed to `updateLead` mutator.
- **File Limits**: Keep files <= 300 lines (e.g. Separate `lead-care-log.tsx`).

## Implementation Steps
1. [ ] **Lead Form Modal**: Create `components/crm/lead-form-modal.tsx` supporting CREATE and UPDATE modes. Ensure fields utilize SSOT components.
2. [ ] **Detail Drawer**: Create `components/crm/lead-detail-drawer.tsx`. Design header (Name+Badge+Score), Summary details, and Action buttons (Edit, Convert, Mark Lost, Add Log).
3. [ ] **Care Log**: Create `components/crm/lead-care-log.tsx` to display the atomic text-append history block.

## Verification
- [ ] Modal behaves consistently using `openModal()` hook pattern.
- [ ] Deletion correctly invokes `<ConfirmDialog>`.
- [ ] CSS grep verification yields 0 violations.

---
Next Phase: Phase 04 (Customer Detail)
