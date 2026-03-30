# Phase 1c: Form + CRUD
Status: ✅ Complete
Dependencies: Phase 1a (mutations + schema + types)

## Objective
Xây dựng Create và Edit form cho Services. Tách V1 god-component (536 lines)
thành composition pattern: orchestrator + sections + hook.

## Implementation Steps

### 1. Form Hook
- [x] Tạo `components/services/form/hooks/useServiceForm.ts`
  - State: formData (ServiceFormData), errors, isSubmitting
  - Methods: handleChange, handleSectionChange, handleSubmit
  - Logic: auto-gen service_code khi trống, client-side validate
  - Submit: gọi createService() hoặc updateService() server action (unwrap ActionResult)
  - Toast: success/error notifications
  - Redirect: after successful create → `/services`

### 2. Form Orchestrator
- [x] Tạo `components/services/form/index.tsx` (< 150 lines)
  - Props: initialData? (edit mode), preFetchedCategories
  - Uses: useServiceForm() hook
  - Renders: InfoSection + PriceSection + ContentEditor + SaveButton
  - Mobile: single column, sticky save bar at bottom
  - Desktop: single column, save button inline

### 3. Info Section
- [x] Tạo `components/services/form/ServiceInfoSection.tsx`
  - Fields: service_name (required), service_code (auto-gen), service_type, category_id
  - Category dropdown: options from preFetchedCategories
  - "Quản lý DM" button → opens CategoryManager modal
  - Image URL: optional text input (Phase 2: file upload)

### 4. Price Section
- [x] Tạo `components/services/form/ServicePriceSection.tsx`
  - Fields: selling_price, cost_price, unit (dropdown from SERVICE_UNITS), quantity_stock
  - Additional: status (active/inactive Toggle), fulfillment_type (dropdown)
  - Desktop: 2-column grid layout
  - Mobile: stacked single column
  - Currency inputs: numeric with formatCurrency preview

### 5. Content Editor (Structured Description)
- [x] Tạo `components/services/form/ServiceContentEditor.tsx`
  - Port V1 logic: EditableSection[] ↔ JSON string
  - Section card: title input + items list + Add Item + Delete Section
  - Add Section: dashed border button "＋ Thêm Mục Mới"
  - Item: text input + delete (✕) button
  - Output: JSON.stringify(sections) → formData.description
  - Empty: show placeholder "Thêm nội dung mô tả cho dịch vụ"

### 6. Category Manager Modal
- [x] Đã có `components/services/category-manager-modal.tsx` (Phase 1b)
  - Port V1 CategoryManager.tsx (163 lines)
  - UnifiedModal (size="md")
  - Inline form: name + icon inputs + Thêm button
  - List: category rows with icon + name + Edit/Delete
  - Actions: call existing upsertCategory(), deleteCategory()
  - Delete protection: check if category has linked services
  - On close: refresh categories (callback prop)

### 7. Create Page Route
- [x] Tạo `app/(protected)/services/create/page.tsx`
  - SSR: fetch categories
  - Header: "Thêm danh mục kinh doanh" + back link
  - Body: ServiceForm (create mode, no initialData)

### 8. Edit Page Route
- [x] Tạo `app/(protected)/services/[id]/page.tsx`
  - SSR: fetch service + categories + bundleItems (if BUNDLE)
  - 404: if service not found or deleted
  - Header: "Chỉnh sửa dịch vụ" + service name + back link
  - Body: ServiceForm (edit mode, initialData + preFetched*)

## Files to Create

| Action | File | Purpose |
|--------|------|---------|
| [NEW] | `components/services/form/index.tsx` | Form orchestrator |
| [NEW] | `components/services/form/hooks/useServiceForm.ts` | Form logic hook |
| [NEW] | `components/services/form/ServiceInfoSection.tsx` | Name, code, type, category |
| [NEW] | `components/services/form/ServicePriceSection.tsx` | Prices, unit, stock, status |
| [NEW] | `components/services/form/ServiceContentEditor.tsx` | Structured description editor |
| [NEW] | `components/services/category-manager-modal.tsx` | Category CRUD modal |
| [NEW] | `app/(protected)/services/create/page.tsx` | Create route |
| [NEW] | `app/(protected)/services/[id]/page.tsx` | Edit route (SSR) |

## Mobile vs Desktop Differences (Form)

| Element | Mobile | Desktop |
|---------|--------|---------|
| Layout | Single column, full width | Single column, max-w-3xl centered |
| Padding | px-4 | px-6 |
| Price fields | Stacked | 2-column grid |
| Save button | Sticky bottom bar (fixed) | Inline at form bottom |
| CategoryManager | Full-screen modal | Center modal |
| Content editor sections | Full width | Same (already stacked) |

## Test Criteria
- [ ] Create form: Fill fields → Submit → New service in DB → Redirect to /services
- [ ] Edit form: Load existing data → Modify → Submit → Updated in DB
- [ ] Validation: Empty name → Error message shown
- [ ] Content Editor: Add/remove sections and items → Description JSON correct
- [ ] Category Manager: Create/Edit/Delete categories → List refreshes
- [ ] Service Code: Auto-generated if empty on create
- [ ] Mobile: Sticky save bar works, form is touch-friendly

## V1 Features Covered
- [x] Services CRUD UI (#1)
- [x] Category Manager (#10)
- [x] Content Editor (#12)
- [x] Service Form (#13)

---
Next Phase: → [phase-1d-quote-system.md](./phase-1d-quote-system.md)
