# Phase 05: Form UI — Items Section
Status: ✅ Complete
Dependencies: Phase 03 (Hooks ready) ✅

## Objective
Service/Product items management. Port V1 ContractServicesSection (283 lines) + ItemModal (578 lines).
Most complex UI section — 4 modal modes, batch add, quick create.

## Components

### 5.1. `ContractItemsSection.tsx` (~200 lines)
Items table + add button

**UI Elements:**
- [ ] Section header: `.section-title` ("Dịch vụ & Sản phẩm")
- [ ] Items table/list:
  - Mobile: card list (item name, qty, price)
  - Desktop: table with columns (Tên, Loại, SL, Đơn giá, Thành tiền, Actions)
- [ ] Subtotal row at bottom
- [ ] "➕ Thêm dịch vụ" button — `.btn-primary`
- [ ] "➕ Thêm phụ thu" button — `.btn-secondary`
- [ ] Each item row: edit button, delete button (Lucide icons)
- [ ] Badge per item type: `<Badge variant>` (dich_vu=info, san_pham=neutral, trang_phuc=accent, phat_sinh=warning)

### 5.2. `ItemModal.tsx` (~250 lines)  
Port V1 ItemModal (578 lines) → compress using shared components

**4 Modes (V1-proven):**
1. `add-service` — Search services catalog, select, add to items
2. `add-addon` — Free-text addon with category picker
3. `edit-service` — Edit existing service item
4. `edit-addon` — Edit existing addon item

**Common Fields:**
- [ ] item_name (search autocomplete for services, free-text for addons)
- [ ] type (auto-detected: dich_vu/san_pham/trang_phuc/phat_sinh)
- [ ] quantity — number input, min 1
- [ ] unit_price — `<CurrencyInput>`
- [ ] discount_amount — `<CurrencyInput>` (optional per-item discount)
- [ ] total_amount — auto-calc: (qty * unit_price) - discount
- [ ] notes — textarea (optional)

**Service Mode Specific:**
- [ ] Service search: debounce, show catalog results
- [ ] Auto-fill price from service catalog
- [ ] Smart type mapping: service.service_type → item.type
- [ ] Batch table: add multiple services at once (like V1)
- [ ] "Tạo dịch vụ mới" quick link → CreateServiceModal

**Addon Mode Specific:**
- [ ] Free-text name input
- [ ] `addon_category` picker (makeup, trang_phuc, phu_kien, them_gio, khac)
- [ ] Addon history autocomplete (search addon_history table)
- [ ] `export_type` auto-map: trang_phuc → xuat_thue default

**Layout:**
- Uses `<UnifiedModal>` wrapper
- Mobile: full-screen drawer
- Desktop: centered modal (max-w-lg)

### 5.3. `CreateServiceModal.tsx` (~120 lines)
Port V1 CreateServiceModal (160 lines)

Quick-create service from within ItemModal:
- [ ] service_name (required)
- [ ] service_type (select from service_type_enum)
- [ ] category_id (select from service_categories)
- [ ] selling_price — `<CurrencyInput>`
- [ ] cost_price — `<CurrencyInput>` (optional)
- [ ] Submit → server action → return new service → auto-add to items

## Styling Rules
- Table header: `.table-header` class
- Item badges: `<Badge>` component (NOT hardcoded colors)
- Currency: `<CurrencyInput>` (NOT raw input)
- All modals: `<UnifiedModal>`
- NO inline styles, NO border (lesson #64)

## Files to Create (max 250 lines/file — lesson #7)
- `components/contracts/form/ContractItemsSection.tsx`
- `components/contracts/form/modals/ItemModal.tsx` (~150 lines — shell + mode routing)
- `components/contracts/form/modals/ServiceItemForm.tsx` (~100 lines — service search + batch)
- `components/contracts/form/modals/AddonItemForm.tsx` (~80 lines — addon form + history)
- `components/contracts/form/modals/CreateServiceModal.tsx`

## Test Criteria
- [ ] Add service from catalog → items list updates
- [ ] Add addon with category → list updates
- [ ] Edit item → values update
- [ ] Delete item → removed + totals recalc
- [ ] Batch add multiple services at once
- [ ] Quick create service → auto-add to items
- [ ] Addon history autocomplete works
- [ ] Smart type mapping correct (service_type → item_type)
- [ ] Export type auto-sets for trang_phuc

---
Next Phase: → phase-06-payment-financial.md
