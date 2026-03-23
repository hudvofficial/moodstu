# Contract Clone-Ready Fix Plan
**Created:** 2026-03-24 | **Audit ref:** `docs/reports/audit_contract_clone_readiness_20260324.md`
**Goal:** Fix naming + splitting → 100% clone-ready → V2 Module Template Spec

---

## Progress

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Naming Cleanup | ✅ Done | 100% |
| 02 | File Splitting | ✅ Done | 100% |
| 03 | V2 Module Template Spec | ✅ Done | 100% |

---

## Phase 01: Naming Cleanup (P1 — 30 phút)

> **Constraint:** KHÔNG thay đổi logic — chỉ move functions + rename + update imports

### 1A: Remove duplicates từ contract-queries.ts

`contract-queries.ts` chứa functions DUPLICATE đã tồn tại ở đúng module:

| Function | Đã có tại | Action |
|----------|-----------|--------|
| `searchAddonHistory()` (L101) | `addon-actions.ts` (L19) | **XÓA** khỏi contract-queries |
| `upsertAddonHistory()` (L121) | `addon-actions.ts` (L40) | **XÓA** khỏi contract-queries |

**Import updates:** Không cần — contract components KHÔNG import 2 functions này từ contract-queries.

### 1B: Move cross-module functions

| Function | Từ | Đến | Reason |
|----------|-----|------|--------|
| `searchCustomers()` (L14) | `contract-queries.ts` | `customer-actions.ts` | Customer domain |
| `getAvailableServices()` (L159) | `contract-queries.ts` | `category-actions.ts` | Service domain |
| `quickCreateService()` (L180) | `contract-queries.ts` | `category-actions.ts` | Service domain |

**Import updates (3 files):**

| Consumer file | Cũ | Mới |
|---------------|-----|------|
| `form/hooks/useContractCustomer.ts` (L5) | `from "@/app/actions/contract-queries"` | `from "@/app/actions/customer-actions"` |
| `form/modals/CustomerFormModal.tsx` (L6) | `from "@/app/actions/contract-queries"` | `from "@/app/actions/customer-actions"` |
| `form/modals/ServiceItemForm.tsx` (L6) | `from "@/app/actions/contract-queries"` | `from "@/app/actions/category-actions"` |
| `form/modals/CreateServiceModal.tsx` (L5) | `from "@/app/actions/contract-queries"` | `from "@/app/actions/category-actions"` |

### 1C: Move query out of mutations

| Function | Từ | Đến |
|----------|-----|------|
| `getNextContractCode()` (L17) | `contract-mutations.ts` | `contract-queries.ts` |

**Import updates (1 file):**

| Consumer file | Cũ | Mới |
|---------------|-----|------|
| `form/hooks/useContractForm.ts` (L5) | `import { submitContract, getNextContractCode } from ".../contract-mutations"` | Split: `submitContract` from mutations, `getNextContractCode` from queries |

### 1D: Rename submitContract → createContract

| File | Line | Cũ | Mới |
|------|------|----|------|
| `contract-mutations.ts` | L43 | `submitContract` | `createContract` |
| `form/hooks/useContractForm.ts` | L5 | `import { submitContract` | `import { createContract` |
| `form/hooks/useContractForm.ts` | L203 | `await submitContract(payload)` | `await createContract(payload)` |

### Verify
- `npm run build` pass
- No broken imports
- UI unchanged

### Rollback
- Git revert — chỉ move/rename, không thay đổi logic

---

## Phase 02: File Splitting (P2 — 1-2 giờ)

> **Constraint:** KHÔNG thay đổi logic/UI — chỉ split + barrel exports

### 2A: event-task-modal.tsx (525 lines) → 2 files

**Current:** 1 file chứa cả event form + task list + shared state

**Split strategy:**
- `detail/event-task-modal.tsx` → orchestrator (modal shell + state) ~150 lines
- `detail/event-form-content.tsx` → event form fields + validation ~200 lines
- `detail/task-list-content.tsx` → task list + CRUD ~175 lines

### 2B: contract-detail-client.tsx (401 lines) → 2 files

**Current:** Tab container + all tab panel content in 1 file

**Split strategy:**
- `detail/contract-detail-client.tsx` → tab container + routing ~150 lines
- `detail/detail-tab-panels.tsx` → tab panel components ~250 lines

### 2C: ContractCustomerSection.tsx (362 lines) → 2 files

**Current:** Customer search + couple detail fields in 1 file

**Split strategy:**
- `form/ContractCustomerSection.tsx` → orchestrator + customer search ~180 lines
- `form/CoupleDetailFields.tsx` → bride/groom fields component ~180 lines

### 2D: contract-drawer.tsx (331 lines) → 2 files

**Current:** Drawer layout + tab navigation + tab content in 1 file

**Split strategy:**
- `contract-drawer.tsx` → drawer shell + tabs ~150 lines
- `drawer-tab-panels.tsx` → tab panels content ~180 lines

### Export Strategy
Mỗi split dùng **re-export** từ file gốc để không break external imports:
```typescript
// contract-drawer.tsx (giữ nguyên path)
export { ContractDrawer } from "./contract-drawer-layout";
// Hoặc giữ component chính trong file gốc, chỉ extract child components
```

### Verify
- `npm run build` pass
- Navigate contracts list, detail, form, drawer → UI unchanged
- No broken imports

### Rollback
- Git revert

---

## Phase 03: V2 Module Template Spec (P3 — 30 phút)

> **Documentation only — no code changes**

### 3A: Tạo `docs/specs/v2-module-template.md`

Nội dung chuẩn hóa từ audit Section B:
- Folder structure (actions / components / hooks / types / validations)
- File naming convention (kebab-case files, PascalCase form sections)
- Function naming convention (get/create/update/delete + Module + Detail)
- CRUD server actions pattern template
- Hook composition pattern template
- RLS policy SQL template
- Soft delete migration template
- Status machine TypeScript template
- File size threshold (300 lines max)

### 3B: Tạo Module Compliance Checklist

Checklist để validate bất kỳ module nào:
- [ ] Actions split: queries / mutations / lifecycle
- [ ] No cross-module functions in action files
- [ ] Naming: verb + Module + Detail
- [ ] Types centralized in types/
- [ ] Zod schema in validations/
- [ ] Form uses composition hook pattern
- [ ] No file > 300 lines
- [ ] RLS policies follow template
- [ ] Soft delete pattern (nếu có)

### Verify
- Document review bởi user
- Checklist áp dụng thử lên Contract module → 100% pass

---

## Quick Commands

```
Start Phase 1:  @[/code] Phase 01 — Naming Cleanup
Start Phase 2:  @[/code] Phase 02 — File Splitting
Start Phase 3:  @[/code] Phase 03 — V2 Template Spec
```
