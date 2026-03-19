# Phase 01: Types + Schemas
Status: ✅ Complete
Dependencies: Phase 00 (DB migrations) ✅

## Objective
Update TypeScript types + Zod validation schemas để match V2 DB schema mới.

## Tasks

### 1.1. Update `types/crm.ts` — Customer interface ✅
- [x] Thêm `bride_name: string | null` vào `Customer` interface
- [x] Thêm `groom_name: string | null` vào `Customer` interface
- [x] Thêm `bride_name?: string` vào `CustomerFormData`
- [x] Thêm `groom_name?: string` vào `CustomerFormData`

### 1.2. Update `types/contract.ts` — Contract interface ✅
- [x] Thêm `cancel_reason: string | null`
- [x] Thêm `cancelled_at: string | null`
- [x] Thêm `cancelled_by: string | null`
- [x] Verify existing enums match DB: `ContractStatus`, `ServiceType`, `ItemType`, `PaymentMethod`

### 1.3. Create `types/addon-history.ts` ✅
- [x] `AddonHistory` interface: `id, addon_name, addon_category, last_price, usage_count, last_used_at`
- [x] `AddonSuggestion` interface for autocomplete
- [x] `AddonCategory` type alias

### 1.4. Update `lib/validations/contract.schema.ts` ✅
- [x] Thêm `transaction_type` enum (transactionTypeSchema)
- [x] Thêm `addon_category` enum (addonCategorySchema)
- [x] Thêm `bride_name`, `groom_name` vào form data
- [x] `items.min(1)` validation added
- [x] Thêm `inventory_item_id`, `original_price`, `discount_amount` per item
- [x] `expectedUpdatedAt` documented for optimistic lock
- [x] All enum values match DB ENUMs exactly (snake_case)

### 1.5. Create `types/contract-form.ts` ✅
- [x] `ContractFormData`: form state shape
- [x] `ContractItemFormData`: single item (with _tempId)
- [x] `ContractPaymentFormData`: payment section
- [x] `ContractFinancials`: calculated totals
- [x] `ContractFormMode`: `'create' | 'edit'`
- [x] `ItemModalMode`: 4 modes
- [x] `SelectedCustomer`: customer display info
- [x] `ContractEditData`: edit mode pre-fill
- [x] `showCoupleFields()` + `showDeliveryDate()` helpers
- [x] `WEDDING_SERVICE_TYPES` constant

## Test Criteria
- [x] `tsc --noEmit` passes ✅ Zero errors
- [x] All enums match DB exactly ✅
- [x] Zod schemas cover all required fields ✅

---
Next Phase: → phase-02-server-actions.md
