# Contract Module Clone-Readiness Audit
**Date:** 2026-03-24 | **PWA Score update:** 8/10 ✅

---

## A. Clone-Readiness Score Card

| # | Vấn đề | Score | Verdict |
|---|--------|-------|---------|
| 1 | File Size | ⚠️ Needs Work | 13 files > 200 lines, 3 files > 300 lines |
| 2 | Server Actions Pattern | ✅ Ready | Consistent "use server" + server actions, phù hợp V2 |
| 3 | Form State Pattern | ✅ Ready | Composition pattern đã tốt (orchestrator + 3 sub-hooks) |
| 4 | Naming Convention | ⚠️ Needs Work | Mixed placement + naming inconsistencies |
| 5 | Reusable Patterns | ✅ Ready | RLS, soft delete, status machine, CRUD đều chuẩn |

**Overall: 85% Clone-Ready** — Fix 2 issues nhỏ (file size + naming) là clone được.

---

## 1. FILE SIZE AUDIT

### 🔴 Cần split (> 300 lines)

| File | Lines | Đề xuất |
|------|-------|---------|
| `detail/event-task-modal.tsx` | **525** | Split → event form + task form + shared utils |
| `detail/contract-detail-client.tsx` | **401** | Split → tab container + tab content components |
| `form/ContractCustomerSection.tsx` | **362** | Split → customer search + couple fields + customer display |
| `useContractForm.ts` | **338** | OK — orchestrator pattern, nhưng sát threshold |
| `contract-drawer.tsx` | **331** | Split → drawer layout + drawer tabs + drawer actions |

### 🟡 Theo dõi (200-300 lines)

| File | Lines | Note |
|------|-------|------|
| `contracts-list-client.tsx` | 283 | Chấp nhận — list page phức tạp |
| `checklist-manager.tsx` | 283 | Cân nhắc split |
| `contract.ts` (types) | 280 | OK — type file, không cần split |
| `event-timeline.tsx` | 269 | Cân nhắc split |
| `payment-receipt-form.tsx` | 265 | Cân nhắc split |
| `contract-mutations.ts` | 262 | OK — 3 functions, mỗi function lớn |
| `contracts-table.tsx` | 252 | Chấp nhận — table columns phức tạp |
| `contract-event-actions.ts` | 236 | OK — 3 event CRUD functions |

### ✅ Actions (dưới threshold)

| File | Lines | Functions |
|------|-------|-----------|
| `contracts.ts` | 99 | getContracts, getContractStats |
| `contract-detail-actions.ts` | 83 | getContractById, getContractDrawerExtra |
| `contract-lifecycle.ts` | 78 | cancelContract, deleteContract, reactivateContract |
| `contract-queries.ts` | 178 | searchCustomers, getContractForEdit, etc. |
| `contract-profit.ts` | 169 | getContractProfit, getContractsProfitBatch |

---

## 2. SERVER ACTIONS PATTERN AUDIT

### Hiện tại: Server Actions ✅
Tất cả contract actions dùng `"use server"` + Next.js Server Actions. Đây là **V2 standard**.

### So sánh cross-module

| Module | Pattern | Consistent? |
|--------|---------|-------------|
| Contracts | Server Actions | ✅ |
| Finance (debt, expense, salary) | Server Actions | ✅ |
| CRM (lead, customer) | Server Actions | ✅ |
| Inventory | Server Actions | ✅ |
| Gallery | Server Actions | ✅ |

**Verdict:** Server Actions = V2 standard. **Không cần API Routes.**

### Vấn đề: Mixed Responsibility

```
❌ contract-queries.ts chứa:
   - searchCustomers()     → Thuộc customer module
   - quickCreateService()  → Thuộc service module
   - getAvailableServices() → Thuộc service module
   - upsertAddonHistory() → mutation trong query file

❌ contract-mutations.ts chứa:
   - getNextContractCode() → query trong mutation file
```

---

## 3. FORM STATE PATTERN AUDIT

### Hiện tại: Composition Pattern ✅ (Đã tốt!)

```
useContractForm (orchestrator, 338 lines)
├── useContractCustomer (customer search, selection)
├── useContractItems (service line items, add/remove)
└── useContractFinancials (totals, discounts, calculations)
```

> Pattern này **ĐÃ ĐẠT CHUẨN** — từ V1 (629 lines) đã compress xuống ~300 lines bằng composition.

### Validation: Zod Schema ✅

```
lib/validations/contract.schema.ts (115 lines)
→ Zod validation cho create + update
```

### Clone Template cho V2:

```typescript
// Pattern chuẩn cho mỗi module form:
useModuleForm (orchestrator)
├── useModuleSection1 (domain sub-hook)
├── useModuleSection2 (domain sub-hook)
└── useModuleFinancials (nếu có tính toán tiền)
```

**Verdict:** ✅ Ready to clone. Không cần abstract thêm.

---

## 4. NAMING CONVENTION AUDIT

### Exported Functions (21 total)

| Pattern | Functions | Consistent? |
|---------|-----------|-------------|
| `get[Module]` | getContracts, getContractById, getContractForEdit, getContractStats, getContractDrawerExtra, getContractProfit, getContractsProfitBatch | ✅ |
| `[verb][Module]` | submitContract, cancelContract, deleteContract, reactivateContract | ✅ |
| `update[Module]Event` | updateContractEvent, addContractEvent, deleteContractEvent | ✅ |
| `updateContractStatus` | updateContractStatus | ✅ |
| **❌ Non-contract in contract file** | searchCustomers, searchAddonHistory, upsertAddonHistory, getAvailableServices, quickCreateService, getNextContractCode | ❌ Sai placement |

### Naming Inconsistencies

| Issue | Example | Đề xuất V2 |
|-------|---------|-------------|
| get vs fetch | `getContracts` ✅ | Thống nhất: **get** cho tất cả |
| ForEdit suffix | `getContractForEdit` | OK — rõ intent |
| submit vs create | `submitContract` (không phải createContract) | **Quyết định:** `create` cho V2 |
| ById vs no suffix | `getContractById` vs `getContractForEdit` | OK — khác intent |

### V2 Naming Standard

```
ACTIONS:
  Queries:    get[Module]s, get[Module]ById, get[Module]ForEdit, get[Module]Stats
  Mutations:  create[Module], update[Module], delete[Module]
  Lifecycle:  cancel[Module], reactivate[Module], archive[Module]
  Sub-entity: add[Module]Event, update[Module]Event, delete[Module]Event

HOOKS:
  use[Module]Form, use[Module]Filters, use[Module]s (list SWR)

COMPONENTS:
  [module]-list-client.tsx, [module]-drawer.tsx
  detail/[module]-detail-client.tsx
  form/[Module]Section.tsx
```

---

## 5. REUSABLE PATTERNS EXTRACTION

### ✅ Patterns sẵn sàng clone:

| Pattern | Source File | Clone cho |
|---------|-----------|-----------|
| **RLS Policy** | Supabase migrations | Mọi module có data |
| **Soft Delete** | contract-lifecycle.ts + migration | Mọi module cần archive |
| **Status Machine** | contract-mutations.ts (VALID_TRANSITIONS) | Orders, Tasks, Leads |
| **CRUD Actions** | contract-mutations + contract-queries | Mọi module |
| **Composition Hook** | useContractForm pattern | Mọi form phức tạp |
| **Drawer Pattern** | contract-drawer.tsx | CRM drawer, Inventory drawer |
| **Detail + Tabs** | contract-detail-client.tsx | Mọi detail page |
| **List + Filters** | contracts-list-client + useContractFilters | Mọi list page |
| **Zod Schema** | contract.schema.ts | Mọi form validation |

---

## B. V2 Module Template Spec

```
modules/[module-name]/
├── actions/
│   ├── [module]-queries.ts       # get*, search* (READ only)
│   ├── [module]-mutations.ts     # create*, update*, delete* (WRITE only)
│   └── [module]-lifecycle.ts     # cancel*, reactivate*, archive* (Status changes)
│
├── components/
│   ├── [module]-list-client.tsx   # List page (SSR → client hydration)
│   ├── [module]-drawer.tsx        # Quick-view drawer
│   ├── [module]-table.tsx         # Table with columns
│   ├── [module]-filters.tsx       # Dropdown/search filters
│   ├── detail/
│   │   ├── [module]-detail-client.tsx  # Detail page orchestrator
│   │   ├── summary-card.tsx            # Top summary
│   │   ├── [section]-block.tsx         # Each tab/section
│   │   └── [module]-actions-menu.tsx   # Action dropdown
│   └── form/
│       ├── [Module]MainSection.tsx     # PascalCase for form sections
│       ├── [Module]DetailsSection.tsx
│       └── hooks/
│           ├── use[Module]Form.ts      # Orchestrator
│           └── use[Module][Sub].ts     # Sub-hooks
│
├── hooks/
│   ├── use[Module]Filters.ts     # URL-based filters (nuqs)
│   └── use[Module]s.ts           # SWR list hook
│
├── types/
│   ├── [module].ts               # Main types + interfaces
│   ├── [module]-constants.ts     # SSOT constants, status maps
│   └── [module]-form.ts          # Form-specific types
│
└── validations/
    └── [module].schema.ts        # Zod validation
```

### Conventions:

| Aspect | Standard |
|--------|----------|
| File naming | kebab-case: `contract-mutations.ts` |
| Component naming | PascalCase for form sections, kebab for pages |
| Function naming | `verb` + `Module` + `Detail`: `getContractById` |
| Queries | READ-ONLY: get*, search* |
| Mutations | WRITE-ONLY: create*, update*, delete* |
| Lifecycle | STATUS: cancel*, reactivate*, archive* |
| Validation | Zod schema, centralized in `validations/` |
| Form hooks | Composition: orchestrator + sub-hooks |
| RLS | role-based via `get_current_employee_role()` |
| Soft delete | `deleted_at IS NULL` filter + partial index |
| Status | `VALID_TRANSITIONS` map + type-safe check |

---

## C. Fix Plan

### Priority 1: Naming Cleanup (30 min)

| Task | File | Action |
|------|------|--------|
| C1 | `contract-queries.ts` | Move `searchCustomers`, `getAvailableServices`, `quickCreateService` → `customer-actions.ts` / `category-actions.ts` |
| C2 | `contract-queries.ts` | Move `upsertAddonHistory`, `searchAddonHistory` → `addon-actions.ts` |
| C3 | `contract-mutations.ts` | Move `getNextContractCode()` → `contract-queries.ts` |
| C4 | `contract-mutations.ts` | Rename `submitContract` → `createContract` (V2 naming) |

### Priority 2: File Splitting (1-2 hours)

| Task | File | Lines | Split Strategy |
|------|------|-------|----------------|
| S1 | `event-task-modal.tsx` | 525 | → `event-form.tsx` + `task-list.tsx` + shared |
| S2 | `contract-detail-client.tsx` | 401 | → `detail-layout.tsx` + `tab-panels.tsx` |
| S3 | `ContractCustomerSection.tsx` | 362 | → `customer-search.tsx` + `couple-fields.tsx` |
| S4 | `contract-drawer.tsx` | 331 | → `drawer-layout.tsx` + `drawer-tabs.tsx` |

### Priority 3: Document Module Template (30 min)

| Task | Action |
|------|--------|
| T1 | Tạo `docs/specs/v2-module-template.md` từ Section B ở trên |
| T2 | Tạo example folder structure cho module "orders" |

---

## Tổng kết

> **Contract module hiện tại 85% ready.** Fix P1 (naming, 30 phút) + P2 (splitting, 1-2 giờ) = **100% clone-ready**.
> Sau đó tạo V2 Module Template Spec = có thể clone cho CRM, Orders, Inventory ngay.
