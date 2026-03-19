# Phase 07: Form Shell + Integration + Routing
Status: ✅ Complete
Dependencies: Phase 04 + 05 + 06 (all sections ready) ✅

## Objective
Assemble all sections into ContractForm. Connect to routing (create + edit pages).

## Components

### 7.1. `ContractForm/index.tsx` (~150 lines)
Main form shell — assembles all sections

**Structure:**
```tsx
<form onSubmit={handleSubmit}>
  {/* Header: Tạo Hợp đồng / Sửa Hợp đồng */}
  <div className="text-h2">...</div>

  {/* Contract Info */}
  <ContractInfoSection />     {/* service_type, dates, transaction_type */}

  {/* Customer */}
  <ContractCustomerSection />

  {/* Items */}
  <ContractItemsSection />

  {/* Financial Summary */}
  <ContractFinancialSummary />

  {/* Payment (CREATE only) */}
  {mode === 'create' && <ContractPaymentSection />}

  {/* Notes */}
  <NotesSection />

  {/* Actions */}
  <FormActions />              {/* Submit + Cancel buttons */}

  {/* Modals */}
  <ItemModal />
  <CreateServiceModal />
  <CustomerFormModal />
</form>
```

### 7.2. `ContractInfoSection.tsx` (~120 lines)
Top fields of the form

**Fields:**
- [ ] `transaction_type` — Select (Hợp đồng / Hóa đơn), default: hop_dong
- [ ] `service_type` — Select from service_type_enum (12 types)
- [ ] `contract_date` — DatePicker (default: today)
- [ ] `work_date` — DatePicker (nullable)
- [ ] `delivery_date` — DatePicker (conditional: show for wedding types)
- [ ] `assigned_to` — Select employees (nullable)
- [ ] `description` — textarea

**Layout:**
- Desktop: 3-column grid
- Mobile: stacked (1 column)

### 7.3. `FormActions.tsx` (~60 lines)
Bottom action buttons

- [ ] "Lưu hợp đồng" — `.btn-primary` or `.btn-interactive`, disabled when submitting
- [ ] "Hủy" — `.btn-secondary`, router.back() with unsaved changes confirm
- [ ] Loading state: spinner icon when isSubmitting

### 7.4. Routing — Pages

#### `app/(protected)/contracts/create/page.tsx` (~30 lines)
- [ ] Render `<ContractForm mode="create" />`
- [ ] Page title: "Tạo hợp đồng"

#### `app/(protected)/contracts/[id]/edit/page.tsx` (~40 lines)
- [ ] Fetch contract data via `getContractForEdit(id)`
- [ ] Render `<ContractForm mode="edit" initialData={data} />`
- [ ] Page title: "Sửa hợp đồng HĐ-2026-XXXX"

### 7.5. Navigation Integration
- [ ] From Contract List: "➕ Tạo hợp đồng" button → `/contracts/create`
- [ ] From Contract Detail: "Sửa" action → `/contracts/[id]/edit`
- [ ] After submit success: redirect to `/contracts/[id]` (detail page)

## Constraints
- Form uses progressive disclosure (sections expand as needed)
- Mobile: scroll view, sections stacked
- Desktop: 2-column layout possible (main form + sidebar summary)
- Max 250 lines per component file

## Files to Create
- `components/contracts/form/index.tsx`
- `components/contracts/form/ContractInfoSection.tsx`
- `components/contracts/form/FormActions.tsx`
- `app/(protected)/contracts/create/page.tsx`
- `app/(protected)/contracts/[id]/edit/page.tsx`

## Files to Modify
- `components/contracts/contracts-list-client.tsx` — add "Tạo HĐ" button
- `components/contracts/detail/top-action-bar.tsx` — add "Sửa" action link

## Test Criteria
- [ ] `/contracts/create` renders form correctly
- [ ] `/contracts/[id]/edit` pre-fills data
- [ ] Submit CREATE → redirects to detail page
- [ ] Submit EDIT → updates + redirects
- [ ] Cancel → goes back with unsaved warning
- [ ] All sections render in correct order
- [ ] Mobile layout stacks properly

---
Next Phase: → phase-08-edit-delete.md
