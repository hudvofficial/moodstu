# 🏥 Audit Report — Module Contracts (Deep v3 — Level 10/10)
> **Date:** 2026-03-23 23:55 | **Auditor:** Antigravity  
> **Files scanned:** 25 files | **DB tables:** 8 | **RLS policies:** 26 | **Indexes:** 26

---

## 🔴 CRITICAL (5 issues — phải fix ngay)

### C1. Lifecycle Cascade KHÔNG Transactional
- **File:** [contract-lifecycle.ts](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/app/actions/contract-lifecycle.ts#L13-L72)
- **Vấn đề:** `cancelContract()` chạy 4 UPDATE tuần tự (contract → tasks → prints → payments) **KHÔNG trong transaction**. Nếu step 2 fail → contract `da_huy` nhưng tasks vẫn active.
- **deleteContract()** cũng tương tự: soft delete contract → hard delete items → hard delete events. Step 2 fail → zombie contract.
- **Hậu quả:** Data inconsistency — HĐ cancelled nhưng tasks/payments vẫn chạy
- **Fix:** Wrap trong Supabase RPC: `CREATE FUNCTION cancel_contract_cascade(...)` đảm bảo atomicity

### C2. Delete Inconsistency — Hard vs Soft Delete
- **File:** [contract-lifecycle.ts](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/app/actions/contract-lifecycle.ts#L101-L111)
- **Vấn đề:**
  - Contracts: **soft delete** (`deleted_at = now`)
  - Contract items (L104): **HARD delete** (`.delete()`)
  - Contract events (L110): **HARD delete** (`.delete()`)
- **Hậu quả:** Xóa HĐ → items/events mất vĩnh viễn, không thể rollback
- **Fix:** Đổi `.delete()` → `.update({ deleted_at: now })` cho items + events

### C3. INSERT RLS Policies Thiếu WITH CHECK
- **Tables:** contracts, contract_items, contract_events, payment_plans, payments, work_tasks
- **Vấn đề:** Tất cả INSERT policies có `qual: null` → bất kỳ authenticated user role nào cũng insert được
- **Hậu quả:** Photographer có thể tạo HĐ, tạo payment — bypass RBAC
- **Fix:** Thêm WITH CHECK:
  ```sql
  -- VD cho contracts
  CREATE POLICY contracts_insert ON contracts FOR INSERT
  WITH CHECK (get_current_employee_role() IN ('admin', 'manager', 'sale'));
  ```

### C4. `contract_checklists` RLS — `ALL` + `true`
- **Policy:** `contract_checklists_authenticated` — cmd: `ALL`, qual: `true`
- **Vấn đề:** Mọi authenticated user CRUD ALL checklists, bất kể thuộc HĐ nào
- **Fix:** Restrict theo contract ownership (join contracts table)

### C5. `contract_notes` RLS — `ALL` + `auth.role() = 'authenticated'`
- **Policy:** `Authenticated users can manage contract notes`
- **Vấn đề:** Tương tự C4 — không restrict theo contract access
- **Fix:** Restrict SELECT/UPDATE/DELETE theo `created_by` hoặc contract ownership

---

## 🟡 WARNING (10 issues — nên fix)

### W1. `updateContractStatus()` — Thiếu State Machine
- **File:** [contract-mutations.ts](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/app/actions/contract-mutations.ts#L244-L265)
- **Vấn đề:** Cho phép đổi status tùy ý. VD: `hoan_thanh → cho_xu_ly` không bị chặn.
- **Fix:** Thêm transition map:
  ```
  cho_xu_ly → dang_thuc_hien, da_huy
  dang_thuc_hien → hoan_thanh, da_huy
  hoan_thanh → (admin override only)
  da_huy → cho_xu_ly (reactivate — đã có riêng)
  ```

### W2. `reactivateContract()` — Không Reactivate Payment Plans
- **File:** [contract-lifecycle.ts](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/app/actions/contract-lifecycle.ts#L118-L150)
- **Vấn đề:** Cancel → payment plans set `cancelled`. Reactivate → tasks restored nhưng payment plans vẫn cancelled.
- **Fix:** Thêm `.update({ status: 'pending' }).eq('contract_id', id).eq('status', 'cancelled')` cho payment_plans

### W3. `work_tasks` UPDATE RLS — Assigned User Không Thể Update
- **Policy:** `work_tasks_update` — only `admin`, `manager`
- **Vấn đề:** Người được assign task (`assigned_to`) **KHÔNG THỂ** tự update status (mark completed)
- **Fix:** Thêm `OR (assigned_to = get_current_employee_id())` vào UPDATE policy

### W4. `handleSaveDraft()` — Async setState Bug
- **File:** [useContractForm.ts](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/contracts/form/hooks/useContractForm.ts#L206-L209)
- **Code:** `updateField("status", "cho_xu_ly"); await handleSubmitInternal(true);`
- **Vấn đề:** `updateField` gọi `setFormData` (async setState). `handleSubmitInternal` chạy ngay → có thể dùng `formData.status` cũ.
- **Fix:** Truyền status trực tiếp vào `handleSubmitInternal` thay vì rely on state

### W5. `validate()` — Thiếu Date Validation
- **File:** [useContractForm.ts](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/contracts/form/hooks/useContractForm.ts#L123-L135)
- **Vấn đề:** Chỉ check `customer` + `items.length`. Không validate dates:
  - `work_date` > `contract_date`?
  - `delivery_date` > `work_date`?
  - Dates trong tương lai?
- **Fix:** Thêm date logic checks

### W6. `paymentStatus` Magic Number — 50% Threshold
- **File:** [useContractFinancials.ts](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/contracts/form/hooks/useContractFinancials.ts#L44-L50)
- **Code:** `if (paidAmount < totalAmount * 0.5) return "da_coc";`
- **Vấn đề:** `0.5` (50%) hardcode, không rõ business rule. Nên extract constant.
- **Fix:** `const DEPOSIT_THRESHOLD = 0.5;` + comment giải thích

### W7. `tempIdCounter` Global Mutable
- **File:** [useContractItems.ts](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/contracts/form/hooks/useContractItems.ts#L30-L34)
- **Vấn đề:** `let tempIdCounter = 0` ở module scope → shared across ALL form instances. HMR hoặc multiple tabs → counter accumulates.
- **Fix:** Dùng `useRef` bên trong hook, hoặc `crypto.randomUUID()`

### W8. `contract-detail-client.tsx` — 456 Lines (Vượt Threshold)
- **File:** [contract-detail-client.tsx](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/contracts/detail/contract-detail-client.tsx)
- **Vấn đề:** 456 lines > 250 lines threshold (lesson #7). Scroll logic, tab state, modal state tất cả trong 1 file.
- **Fix:** Extract `useContractDetailScroll()` hook + `ContractDetailModals` component

### W9. `getContractStats()` — Sequential Queries
- **File:** [contracts.ts](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/app/actions/contracts.ts#L85-L117)
- **Vấn đề:** 4 DB queries chạy tuần tự: lifetimeCount → data → thisMonth → lastMonth
- **Fix:** Wrap trong `Promise.all()` → save ~200-300ms

### W10. Magic Offset `56 + 8` Hardcode
- **File:** [contract-detail-client.tsx](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/contracts/detail/contract-detail-client.tsx#L139) + L169
- **Vấn đề:** `const offset = 56 + 8` hardcode (header height + padding). Nếu header height đổi → scroll sai.
- **Fix:** `const HEADER_OFFSET = 64` hoặc đọc từ CSS var

---

## 🔵 CODE QUALITY (12 issues — cải thiện)

### Q1. Hardcode Hex Colors — Gallery Components (~25 occurrences)
| File | Colors | Suggestion |
|------|--------|------------|
| `gallery-toolbar.tsx` | `#4CAF50`, `#F44336`, `#2196F3` | → `var(--color-success)`, `var(--color-error)`, `var(--color-info)` |
| `gallery-image-grid.tsx` | `#4CAF50`, `rgba(0,0,0,0.6)`, `#fff` | → semantic tokens |
| `gallery-image-list.tsx` | `#4CAF50`, `#F44336`, `#fff` | → semantic tokens |
| `share-gallery-modal.tsx` | `#3d2b1f`, `#8B5E3C`, `#e5e0d8` | → đã dùng `var()` fallback ✅ OK |
| `gallery-sort-dropdown.tsx` | `#8B5E3C`, `#3D2B1F`, `#F0E8DB` | → đã dùng `var()` fallback ✅ OK |

> **Print template:** 45+ inline hex colors → ✅ **HỢP LỆ** (print cần inline, không load CSS)

### Q2. Hardcode `text-[Xpx]` — 4 Occurrences
| File | Code | Suggestion |
|------|------|------------|
| `financial-dashboard.tsx:81` | `text-[14px]` | → `text-body-sm` |
| `financial-dashboard.tsx:89` | `text-[14px]` | → `text-body-sm` |
| `financial-dashboard.tsx:133` | `text-[15px]` | → `text-body` |
| `compact-stats.tsx:85` | `text-[11px]` | → `text-tiny` |

### Q3. `Record<string, unknown>` Typing — ~10 Occurrences
- **Files:** `use-contracts.ts`, `contracts-table.tsx`, `contract-drawer.tsx`, `contracts-list-client.tsx`
- **Vấn đề:** Dùng `Record<string, unknown>` thay vì proper Contract/Event types → cần `as` casts khắp nơi
- **Fix:** Import proper types từ `@/types/contract`

### Q4. `as any[]` TypeScript Escape — 3 Occurrences
- **File:** [contract-drawer.tsx](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/contracts/contract-drawer.tsx#L353-L362)
- **Code:** `events as any[]`, `checklists as any[]`, `tasks as any[]`
- **Fix:** Define proper prop types cho `DrawerEventTimeline`, `DrawerChecklist`, `DrawerAssignments`

### Q5. `handleDelete` — TODO Chưa Implement
- **File:** [contracts-list-client.tsx](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/contracts/contracts-list-client.tsx#L134)
- **Code:** `const handleDelete = (id: string) => void id; // TODO: Phase 05`
- **Fix:** Implement hoặc remove nếu không cần

### Q6. Dynamic Class String — Có Thể Bị Purge
- **File:** [contracts-table.tsx](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/contracts/contracts-table.tsx#L195)
- **Code:** `` `entrance-${Math.min(i + 1, 5)}` ``
- **Vấn đề:** Tailwind purge không detect dynamic class strings
- **Fix:** Safelist trong tailwind.config hoặc dùng conditional object

### Q7. `bg-neutral-100/60` — Không Dùng Token
- **File:** [contract-drawer.tsx](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/contracts/contract-drawer.tsx#L335)
- **Fix:** → `bg-bg-hover` hoặc `bg-surface`

### Q8. `text-emerald-600` — Không Dùng Token
- **File:** [financial-dashboard.tsx](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/contracts/detail/financial-dashboard.tsx#L81)
- **Fix:** → `text-success`

### Q9. `pageSize = 20` Inline Constant
- **File:** [contracts.ts](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/app/actions/contracts.ts#L27)
- **Fix:** Extract to `const DEFAULT_PAGE_SIZE = 20`

### Q10. `contracts-list-client.tsx` — 319 Lines (Near Threshold)
- **Fix nhẹ:** Extract `MobileFilterBar` + `DesktopFilterBar` thành separate components

### Q11. Duplicate `fmt()` Helper
- **Files:** `contract-drawer.tsx:72` + `contracts-table.tsx:25` — exact same function
- **Fix:** Move to shared util

### Q12. `console.error` In Server Action (Acceptable)
- **File:** [contract-mutations.ts](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/app/actions/contract-mutations.ts#L230)
- ✅ OK — Non-blocking error logging, no sensitive data exposed

---

## 🟢 OK (22 checks passed — không cần sửa)

| # | Area | Status | Chi tiết |
|---|------|--------|----------|
| 1 | **Zod Schema** | ✅ | Đầy đủ, match DB enums, constrainted |
| 2 | **withAuth()** | ✅ | Tất cả 17 server actions wrapped |
| 3 | **Input Sanitize** | ✅ | `sanitizeSearch()` escape `%`, `_` |
| 4 | **Optimistic Lock** | ✅ | `expectedUpdatedAt` check edit mode |
| 5 | **Ghost Payment** | ✅ | `deleteContract` block nếu có payments |
| 6 | **SWR Cache Keys** | ✅ | Factory pattern `contractKeys.*` |
| 7 | **SWR Revalidation** | ✅ | `revalidateContractCaches()` helper |
| 8 | **SWR Config** | ✅ | `revalidateOnFocus: false`, dedup 60s |
| 9 | **Prefetch** | ✅ | `prefetchContract()` on hover |
| 10 | **Soft Delete Filter** | ✅ | `.is("deleted_at", null)` nhất quán |
| 11 | **DB Indexes** | ✅ | 26 indexes: status, customer, date, code |
| 12 | **Pagination** | ✅ | Server-side, pageSize=20 |
| 13 | **Date Recalc** | ✅ | Downstream cascade chính xác |
| 14 | **Manual Event Guard** | ✅ | Delete chỉ `is_manual_date = true` |
| 15 | **Audit Logging** | ✅ | `fireAuditLog` cho event CRUD |
| 16 | **Profit Calc** | ✅ | Parallel, exclude `[Auto-Print]` |
| 17 | **RLS SELECT** | ✅ | Admin/manager all, others own only |
| 18 | **z-index** | ✅ | 0 z-[xxx] trong contracts components |
| 19 | **border-radius** | ✅ | 0 rounded-[xxx] hardcode |
| 20 | **console.log** | ✅ | 0 hits trong server actions |
| 21 | **Loading State** | ✅ | Spinner + text "Đang tải dữ liệu..." |
| 22 | **Empty State** | ✅ | Icon + text + CTA rõ ràng |

---

## 📡 REALTIME & SYNC Assessment

| Check | Status | Chi tiết |
|-------|--------|----------|
| useRealtime usage | ❌ | 0 lần trong contracts components |
| Stale data risk | 🟡 | Tab A sửa → Tab B cũ cho đến refresh |
| SWR refresh | ✅ | `revalidatePath` + SWR mutate sau mọi mutation |
| Recommendation | ℹ️ | Acceptable cho team < 5. Thêm realtime khi multi-user editing cần thiết |

---

## 📊 TỔNG KẾT

| Severity | Count |
|----------|-------|
| 🔴 Critical | **5** |
| 🟡 Warning | **10** |
| 🔵 Code Quality | **12** |
| 🟢 OK | **22** checks passed |

### Scan Coverage

```
Files analyzed: 25
├── Server Actions: 7 (contracts, mutations, lifecycle, queries, detail, events, profit)
├── Hooks: 5 (useContracts, useContractForm, useContractItems, useContractFinancials, useContractCustomer)
├── Components: 6 (list-client, table, drawer, detail-client, form sections, gallery components)
├── Schema: 1 (contract.schema.ts)
├── DB: RLS 26 policies, Indexes 26, Tables 8
├── Grep: hex colors (53 hits), text-[px] (4), z-index (0), rounded-px (0), console.log (0)
└── Realtime: useRealtime (0 in contracts)
```

### Fix Priority Order

| Priority | Issues | Effort | Impact |
|----------|--------|--------|--------|
| **P0** | C3+C4+C5 (RLS) | 1 session | 🔒 Security |
| **P1** | C1 (Transactional cascade) | 1 session | 💾 Data integrity |
| **P2** | C2 (Delete consistency) | 30 min | 💾 Data safety |
| **P3** | W1 (Status machine) | 30 min | 🧠 Logic |
| **P4** | W3 (Task update RLS) | 15 min | 🔒 UX blocking |
| **P5** | W4 (Async bug) | 15 min | 🐛 Bug |
| **P6** | W2+W5+W6+W7 (Logic) | 1 session | 🧠 Correctness |
| **P7** | W8+W9+W10 (Perf/Code) | 1 session | ⚡ Performance |
| **P8** | Q1-Q12 (Code Quality) | 2 sessions | 🧹 Maintainability |

### Total Estimated Effort: **6-8 sessions**
