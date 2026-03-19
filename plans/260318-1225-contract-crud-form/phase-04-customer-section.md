# Phase 04: Form UI — Customer Section
Status: ✅ Complete
Dependencies: Phase 03 (Hooks ready) ✅

## Objective
Customer selection/creation UI. Port V1 ContractCustomerSection (429 lines) → V2 (~250 lines).

## Components

### 4.1. `ContractCustomerSection.tsx` (~180 lines)
**3 states (V1-proven UX):**
1. **Not selected** — Search input + dropdown
2. **Selected (existing)** — Show customer card + "Đổi" button
3. **Creating new** — Inline or modal form

**UI Elements (dùng design-system.css tokens):**
- [ ] Search input with `.input-base` class + debounce
- [ ] Dropdown results: customer name, phone, badge (existing/new)
- [ ] "➕ Tạo khách hàng mới" option always at bottom
- [ ] Selected customer card: name, phone, address
- [ ] Conditional couple fields (bride_name, groom_name) — show when `showCoupleFields`
- [ ] Wedding date field (DatePicker component)
- [ ] Labels: `.label-base` class (sentence case, lesson #51)
- [ ] Error: `.error-text` + `.input-error` classes

**Layout:**
- Mobile: 1 column, full width
- Desktop: 2 columns (customer info | couple info)

### 4.2. `CustomerFormModal.tsx` (~200 lines)
Port V1 CustomerFormModal (306 lines) → V2

**Purpose:** Create new customer inline from contract form

**Fields:**
- [ ] full_name (required) — `.input-base`
- [ ] phone (required) — `.input-base`
- [ ] alt_phone — `.input-base`
- [ ] email — `.input-base`
- [ ] address — `.input-base`
- [ ] gender — Select component
- [ ] wedding_date — DatePicker
- [ ] bride_name, groom_name — conditional (couple fields)
- [ ] source — Select (Facebook, Zalo, Walk-in, etc.)
- [ ] notes — textarea

**Behavior:**
- [ ] Uses `<UnifiedModal>` (shared component)
- [ ] Phone dedup check: search existing before create
- [ ] Submit → server action `createCustomer()` → onCreated callback
- [ ] `onCreated(customer)` → auto-select in form

## Styling Rules
- ALL inputs use `.input-base` class
- ALL labels use `.label-base` class
- NO inline styles
- NO hardcoded colors
- Buttons: `.btn-primary`, `.btn-secondary`
- Border-radius: follow design-system (NO border — lesson #64, use shadow instead)

## Files to Create
- `components/contracts/form/ContractCustomerSection.tsx`
- `components/contracts/form/modals/CustomerFormModal.tsx`

## Test Criteria
- [ ] Customer search shows results after debounce
- [ ] Selecting customer populates form fields
- [ ] "Tạo khách hàng mới" opens modal
- [ ] New customer auto-selected after creation
- [ ] Couple fields show/hide based on service_type
- [ ] Phone dedup warning works

---
Next Phase: → phase-05-items-section.md
