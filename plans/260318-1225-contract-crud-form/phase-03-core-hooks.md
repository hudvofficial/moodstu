# Phase 03: Core Hooks
Status: ✅ Complete
Dependencies: Phase 02 (Server Actions ready) ✅

## Objective
Port V1 hook architecture → V2. Mỗi domain một hook, orkestrated bởi useContractForm.

## Architecture (V1-proven pattern)

```
useContractForm.ts (orchestrator ~200 lines)
  ├── useContractCustomer.ts (~120 lines)
  ├── useContractItems.ts (~200 lines)
  ├── useContractFinancials.ts (~80 lines)
  └── useContractTasks.ts (~80 lines) [optional, Phase 08]
```

## Tasks

### 3.1. `hooks/useContractCustomer.ts` (~120 lines)
Port from V1 `useContractCustomer.ts` (82 lines V1 → expand for V2)

**State:**
- [ ] `selectedCustomerId: string | null`
- [ ] `customerSearchQuery: string`
- [ ] `customerSearchResults: Customer[]`
- [ ] `isSearching: boolean`
- [ ] `selectedCustomer: Customer | null` (full data when selected)
- [ ] `showCustomerModal: boolean`

**Logic:**
- [ ] `searchCustomers(query)` — debounce 300ms (use `use-debounce` hook), call server action
- [ ] `selectCustomer(customer)` — set customer, populate form fields (bride/groom, phone, address)
- [ ] `clearCustomer()` — reset selection
- [ ] `openCreateCustomer()` — open CustomerFormModal
- [ ] `onCustomerCreated(newCustomer)` — callback: auto-select new customer
- [ ] Dropdown always shows "➕ Tạo khách hàng mới" option

**V2 Differences from V1:**
- V2 `Customer` has `bride_name`, `groom_name` (after migration)
- V2 uses `full_name` instead of `customer_name`

### 3.2. `hooks/useContractItems.ts` (~200 lines)
Port from V1 `useContractItems.ts` (409 lines V1 → compress for V2)

**State:**
- [ ] `items: ContractItemFormData[]`
- [ ] `showItemModal: boolean`
- [ ] `itemModalMode: ItemModalMode`
- [ ] `editingItemIndex: number | null`
- [ ] `showCreateServiceModal: boolean`

**Logic:**
- [ ] `addItem(item)` — add to items array, recalc totals
- [ ] `addBatchItems(items[])` — batch add (from ItemModal)
- [ ] `editItem(index, updatedItem)` — update existing
- [ ] `removeItem(index)` — remove + recalc
- [ ] `openAddServiceModal()` — mode = 'add-service'
- [ ] `openAddAddonModal()` — mode = 'add-addon'
- [ ] `openEditModal(index)` — mode = 'edit-service' or 'edit-addon'
- [ ] Smart type mapping: service `service_type` → item `type` (dich_vu/san_pham/trang_phuc)
- [ ] Auto-map `export_type` based on item type (trang_phuc → xuat_thue default)
- [ ] `getItemSubtotal()` — sum of item totals

**V2 Differences from V1:**
- V2 item `type` is ENUM `item_type_enum` (snake_case)
- V2 `export_type` is ENUM `export_type_enum`
- V2 has `original_price` + `discount_amount` per item

### 3.3. `hooks/useContractFinancials.ts` (~80 lines)
Port from V1 `useContractFinancials.ts` (73 lines)

**State:**
- [ ] `discount: number`
- [ ] `paidAmount: number` (from existing payments, read-only on edit)
- [ ] `paymentForm: { amount, method, stage, notes }` (CREATE only)
- [ ] `isEditingPayment: boolean` (false on edit mode)

**Derived:**
- [ ] `subtotal` = sum of items
- [ ] `totalAmount` = subtotal - discount
- [ ] `remainingAmount` = totalAmount - paidAmount
- [ ] `paymentStatus` = auto-calculated from paidAmount vs totalAmount

**Logic:**
- [ ] `updateDiscount(value)` — validate >= 0, <= subtotal
- [ ] `updatePaymentForm(field, value)` — for CREATE mode
- [ ] `syncPaymentStatus()` — auto: 0 = chua_thanh_toan, partial = thanh_toan_mot_phan, full = da_thanh_toan

### 3.4. `hooks/useContractForm.ts` (~200 lines)
Orchestrator — Port from V1 `useContractForm.ts` (629 lines → compress)

**State:**
- [ ] `formData: ContractFormData` (contract fields: service_type, dates, notes, etc.)
- [ ] `mode: 'create' | 'edit'`
- [ ] `isSubmitting: boolean`
- [ ] `errors: Record<string, string>`
- [ ] Spread sub-hooks: customer, items, financials

**Logic:**
- [ ] `updateField(field, value)` — generic field updater
- [ ] `handleSubmit()` — validate via Zod → call submitContract action → redirect
- [ ] `handleCancel()` — router.back() with unsaved changes warning
- [ ] `loadContractForEdit(contractId)` — fetch + populate all sub-hooks
- [ ] `resetForm()` — clear everything
- [ ] Conditional fields logic:
  - `showCoupleFields` = service_type in ['studio', 'ngay_cuoi', 'combo']
  - `showDeliveryDate` = service_type in ['studio', 'ngay_cuoi', 'combo']
  - `showPaymentSection` = mode === 'create'

**V2 Bonus:**
- [ ] `transaction_type` field (default: 'hop_dong')

## Constraints
- Max 250 lines per hook file (split if needed)
- Use `use-debounce` for customer search (existing hook)
- All ENUM values snake_case
- NO direct DOM manipulation

## Files to Create
- `components/contracts/form/hooks/useContractCustomer.ts`
- `components/contracts/form/hooks/useContractItems.ts`
- `components/contracts/form/hooks/useContractFinancials.ts`
- `components/contracts/form/hooks/useContractForm.ts`

## Test Criteria
- [ ] Hook state updates correctly
- [ ] Customer search debounce works
- [ ] Items CRUD updates totals correctly
- [ ] Financial calculations match (subtotal, discount, total, remaining)
- [ ] Conditional fields toggle correctly
- [ ] Form validation catches missing required fields

---
Next Phase: → phase-04-customer-section.md
