# Phase 1a: Core Infrastructure
Status: ⬜ Pending
Dependencies: None (first phase)

## Objective
Xây dựng nền tảng backend: types, validation, utility functions, server actions.
Sau phase này, API layer sẵn sàng cho UI phase 1b.

## Implementation Steps

### 1. Database Migration
- [ ] Kiểm tra `services` table hiện tại trong V2 Supabase
- [ ] Bổ sung columns thiếu: `created_by`, `updated_by`, `deleted_at`, `cost_price`
- [ ] Enforce `service_code` NOT NULL (nếu đang nullable)
- [ ] Verify FK: `category_id → service_categories`, `created_by → auth.users`

### 2. Types
- [ ] Tạo `types/service.ts` — ServiceRecord, ServiceCategory, ServiceBundleItem, ServiceFilters, ServiceStats, ContentSection
- [ ] Tạo `types/service-constants.ts` — STATUS_MAP, FULFILLMENT_TYPE_MAP, SERVICE_UNITS
- [ ] Tạo `types/service-form.ts` — ServiceFormData, BundleItemInput, EditableSection

### 3. Zod Schema
- [ ] Tạo `lib/validations/service.schema.ts` — serviceCreateSchema, serviceUpdateSchema, bundleItemSchema

### 4. Utility Functions
- [ ] Port `parseContentStructure()` → `lib/utils/service-utils.ts`
  - JSON parse → array of {title, items[]}
  - Fallback: legacy text parse (header detection)
- [ ] Tạo `generateServiceCode()` — Format: SV-YYYYMMDD-NNNN
- [ ] Port `sanitizeSearch()` — Strip SQL wildcards (%, _)

### 5. Server Actions — Queries
- [ ] Tạo `app/actions/service-queries.ts`
  - `getServices(filters)` — paginated, join category, search, soft delete filter
  - `getServiceById(id)` — single record + join
  - `getServiceCategories()` — cached, order by name (NOTE: đã có trong category-actions.ts, có thể re-export)
  - `getBundleItems(serviceId)` — join child_service
  - `searchServicesForBundle(query)` — lightweight, max 20
  - `getStudioInfo()` — for quote branding, cached

### 6. Server Actions — Mutations
- [ ] Tạo `app/actions/service-mutations.ts`
  - `createService(rawData, bundleItems?)` — Zod → auto-gen code → insert → bundle sync → audit
  - `updateService(id, rawData, bundleItems?, expectedUpdatedAt?)` — Zod → optimistic lock → update → bundle sync → audit
  - `deleteService(id)` — pre-check contract_details + service_bundles → soft delete → audit

## Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| [NEW] | `types/service.ts` | DB types + enums |
| [NEW] | `types/service-constants.ts` | Labels, maps, icons |
| [NEW] | `types/service-form.ts` | Form-specific types |
| [NEW] | `lib/validations/service.schema.ts` | Zod validation |
| [NEW] | `lib/utils/service-utils.ts` | parseContentStructure, generateServiceCode |
| [NEW] | `app/actions/service-queries.ts` | READ server actions |
| [NEW] | `app/actions/service-mutations.ts` | WRITE server actions |
| [KEEP] | `app/actions/category-actions.ts` | Already V2-compliant |
| [KEEP] | `app/actions/builder-actions.ts` | Already V2-compliant |

## Test Criteria
- [ ] `serviceCreateSchema.safeParse()` validates correct data
- [ ] `serviceCreateSchema.safeParse()` rejects: empty name, negative price
- [ ] `generateServiceCode()` returns format `SV-YYYYMMDD-NNNN`
- [ ] `parseContentStructure()` parses JSON and legacy text
- [ ] `getServices()` returns paginated results
- [ ] `createService()` inserts and returns `{ id }`
- [ ] `deleteService()` blocks if service is used in contracts

## V1 Features Covered
- [x] Service Code Auto-gen (#11)
- [x] Services CRUD backend (#1)

---
Next Phase: → [phase-1b-list-page.md](./phase-1b-list-page.md)
