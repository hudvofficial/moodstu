# Fix Plan — Contracts Module Audit v3 (27 issues) — v2 VERIFIED

> **Source:** `docs/reports/audit_contracts_deep_20260323.md`
> **Pre-flight:** 2026-03-24 00:13 — Query DB thật, verify columns, roles, CSS vars
> **Nguyên tắc:** 1 phase = 1 prompt `/code`, không mix scope, test sau mỗi phase

---

## 🔎 PRE-FLIGHT RESULTS (Query từ DB thật)

| Check | Kết quả | Impact |
|-------|---------|--------|
| `deleted_at` column | ❌ CHỈ có trên `contracts` — **KHÔNG CÓ** trên `contract_items`, `contract_events`, `work_tasks`, `payment_plans`, `printing_orders` | Phase 03 cần ALTER TABLE |
| Employee roles enum | `admin`, `manager`, `sale`, `media`, `ctv` | Plan v1 ghi `photographer` → sai, thật sự là `media` |
| Active employees | Chỉ có role `sale` trong DB hiện tại | Test RLS cần tạo thêm test user role khác |
| `printing_orders` | Có `status` (enum), KHÔNG có `deleted_at` | RPC cancel cascade cần handle |
| `contract_items` | 18 columns, KHÔNG có `deleted_at` | Hard delete hiện tại → cần thêm column |
| `contract_events` | 17 columns, có `is_manual_date`, KHÔNG có `deleted_at` | Tương tự |
| `updateContractStatus` | KHÔNG fetch current status trước update | Cần thêm SELECT trước UPDATE |
| CSS variables | `--color-success: #4caf50` ✅, `--color-error: #f44336` ✅, `--color-info: #2196f3` ✅ | Phase 07 safe |
| Code L101-111 | Comment nói "Soft delete" nhưng code dùng `.delete()` = HARD delete | Bug documentation |

---

## 🚫 DON'T TOUCH LIST

Các file/logic sau **TUYỆT ĐỐI KHÔNG SỬA** trong scope này:

- `app/actions/contract-profit.ts` — profit calculation logic chính xác
- `app/actions/contract-event-actions.ts` — date recalculation cascade
- `app/actions/contract-queries.ts` — search/edit queries
- `components/contracts/print/contract-template.tsx` — inline styles hợp lệ (print context)
- `lib/validations/contract.schema.ts` — Zod schemas đúng
- Admin gallery flow — không liên quan contracts core
- `fetchAllGalleryImages()` — đã audit riêng

---

## Phase 01 — RLS INSERT Policies (C3)
**Target:** Migration SQL | **Effort:** 15 phút | **Risk:** 🟡 Medium

> [!CAUTION]
> Sau khi apply, role `media` và `ctv` sẽ KHÔNG THỂ insert contracts/payments.
> Hiện DB chỉ có 1 employee role `sale` → impact thấp, nhưng phải verify.

### Pre-condition:
```sql
-- BACKUP: Lưu lại policies hiện tại trước khi DROP
-- (Đã export ở pre-flight step 517)
```

### Migration:
```sql
-- contracts: chỉ admin/manager/sale được tạo
DROP POLICY IF EXISTS contracts_insert ON contracts;
CREATE POLICY contracts_insert ON contracts FOR INSERT
WITH CHECK (get_current_employee_role() IN ('admin','manager','sale'));

-- contract_items
DROP POLICY IF EXISTS contract_items_insert ON contract_items;
CREATE POLICY contract_items_insert ON contract_items FOR INSERT
WITH CHECK (get_current_employee_role() IN ('admin','manager','sale'));

-- contract_events
DROP POLICY IF EXISTS contract_events_insert ON contract_events;
CREATE POLICY contract_events_insert ON contract_events FOR INSERT
WITH CHECK (get_current_employee_role() IN ('admin','manager','sale'));

-- payment_plans
DROP POLICY IF EXISTS payment_plans_insert ON payment_plans;
CREATE POLICY payment_plans_insert ON payment_plans FOR INSERT
WITH CHECK (get_current_employee_role() IN ('admin','manager','sale'));

-- payments: chỉ admin/manager (nhạy cảm hơn)
DROP POLICY IF EXISTS payments_insert ON payments;
CREATE POLICY payments_insert ON payments FOR INSERT
WITH CHECK (get_current_employee_role() IN ('admin','manager','sale'));

-- work_tasks
DROP POLICY IF EXISTS work_tasks_insert ON work_tasks;
CREATE POLICY work_tasks_insert ON work_tasks FOR INSERT
WITH CHECK (get_current_employee_role() IN ('admin','manager','sale'));
```

### Rollback:
```sql
-- Nếu cần revert → xóa WITH CHECK, quay lại unrestricted INSERT
DROP POLICY IF EXISTS contracts_insert ON contracts;
CREATE POLICY contracts_insert ON contracts FOR INSERT WITH CHECK (true);
-- (Tương tự cho từng table)
```

### Verify:
1. Login bằng user role `sale` → tạo HĐ → ✅ pass
2. Nếu có user role `media` → tạo HĐ → ❌ bị chặn
3. App vẫn hoạt động bình thường (list, detail, drawer)

---

## Phase 02 — RLS Checklists + Notes + Work Tasks (C4, C5, W3)
**Target:** Migration SQL | **Effort:** 15 phút | **Risk:** 🟡 Medium

### Migration:
```sql
-- ═══ C4: contract_checklists — restrict theo contract ownership ═══
DROP POLICY IF EXISTS contract_checklists_authenticated ON contract_checklists;

CREATE POLICY contract_checklists_select ON contract_checklists FOR SELECT
USING (EXISTS (
  SELECT 1 FROM contracts c
  WHERE c.id = contract_checklists.contract_id
  AND c.deleted_at IS NULL
  AND (get_current_employee_role() IN ('admin','manager')
       OR c.created_by = get_current_employee_id()
       OR c.assigned_to = get_current_employee_id())
));

CREATE POLICY contract_checklists_insert ON contract_checklists FOR INSERT
WITH CHECK (get_current_employee_role() IN ('admin','manager','sale'));

CREATE POLICY contract_checklists_update ON contract_checklists FOR UPDATE
USING (get_current_employee_role() IN ('admin','manager','sale'));

CREATE POLICY contract_checklists_delete ON contract_checklists FOR DELETE
USING (get_current_employee_role() IN ('admin','manager'));

-- ═══ C5: contract_notes — restrict theo contract access ═══
DROP POLICY IF EXISTS "Authenticated users can manage contract notes" ON contract_notes;

CREATE POLICY contract_notes_select ON contract_notes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM contracts c
  WHERE c.id = contract_notes.contract_id
  AND c.deleted_at IS NULL
  AND (get_current_employee_role() IN ('admin','manager')
       OR c.created_by = get_current_employee_id()
       OR c.assigned_to = get_current_employee_id())
));

CREATE POLICY contract_notes_insert ON contract_notes FOR INSERT
WITH CHECK (get_current_employee_role() IN ('admin','manager','sale'));

CREATE POLICY contract_notes_update ON contract_notes FOR UPDATE
USING (created_by = get_current_employee_id()
       OR get_current_employee_role() IN ('admin','manager'));

CREATE POLICY contract_notes_delete ON contract_notes FOR DELETE
USING (created_by = get_current_employee_id()
       OR get_current_employee_role() IN ('admin','manager'));

-- ═══ W3: work_tasks UPDATE — cho assigned_to tự update ═══
DROP POLICY IF EXISTS work_tasks_update ON work_tasks;
CREATE POLICY work_tasks_update ON work_tasks FOR UPDATE
USING (get_current_employee_role() IN ('admin','manager')
       OR assigned_to = get_current_employee_id());
```

### Rollback:
```sql
-- Revert checklists
DROP POLICY IF EXISTS contract_checklists_select ON contract_checklists;
DROP POLICY IF EXISTS contract_checklists_insert ON contract_checklists;
DROP POLICY IF EXISTS contract_checklists_update ON contract_checklists;
DROP POLICY IF EXISTS contract_checklists_delete ON contract_checklists;
CREATE POLICY contract_checklists_authenticated ON contract_checklists FOR ALL USING (true);
-- Revert notes
DROP POLICY IF EXISTS contract_notes_select ON contract_notes;
DROP POLICY IF EXISTS contract_notes_insert ON contract_notes;
DROP POLICY IF EXISTS contract_notes_update ON contract_notes;
DROP POLICY IF EXISTS contract_notes_delete ON contract_notes;
CREATE POLICY "Authenticated users can manage contract notes" ON contract_notes FOR ALL USING (auth.role() = 'authenticated');
-- Revert work_tasks
DROP POLICY IF EXISTS work_tasks_update ON work_tasks;
CREATE POLICY work_tasks_update ON work_tasks FOR UPDATE USING (get_current_employee_role() IN ('admin','manager'));
```

### Verify:
1. Drawer → Checklist section vẫn render ✅
2. Detail → Notes section vẫn CRUD được bằng sale ✅
3. Detail → Notes: user khác không thể sửa/xóa notes của người khác ✅

---

## Phase 03 — Transactional Lifecycle + Soft Delete (C1, C2, W2)
**Target:** 1 migration (ALTER + RPC) + refactor `contract-lifecycle.ts`
**Effort:** 1 session | **Risk:** 🔴 High — phức tạp nhất

> [!WARNING]
> **CRITICAL PRE-CONDITION:** `contract_items` và `contract_events` **KHÔNG CÓ cột `deleted_at`**.
> Phải ALTER TABLE thêm cột TRƯỚC KHI tạo RPC function.
> `printing_orders` cũng KHÔNG có `deleted_at` — cascade cancel dùng status update, KHÔNG soft delete.

### Step 3A: ALTER TABLE — Thêm deleted_at columns
```sql
-- Thêm deleted_at cho bảng chưa có
ALTER TABLE contract_items ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE contract_events ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Tạo index partial cho soft delete filter
CREATE INDEX IF NOT EXISTS idx_contract_items_active ON contract_items (contract_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contract_events_active ON contract_events (contract_id) WHERE deleted_at IS NULL;
```

### Step 3B: RPC Functions (Transactional)
```sql
-- ═══ Cancel Cascade (Atomic) ═══
CREATE OR REPLACE FUNCTION cancel_contract_cascade(
  p_contract_id UUID,
  p_reason TEXT,
  p_user_id UUID
) RETURNS void AS $$
DECLARE
  v_now timestamptz := now();
BEGIN
  -- Verify contract exists and is not deleted
  IF NOT EXISTS (SELECT 1 FROM contracts WHERE id = p_contract_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Contract not found or already deleted';
  END IF;

  -- 1. Update contract
  UPDATE contracts SET
    status = 'da_huy',
    cancel_reason = trim(p_reason),
    cancelled_at = v_now,
    cancelled_by = p_user_id,
    updated_by = p_user_id,
    updated_at = v_now
  WHERE id = p_contract_id AND deleted_at IS NULL;

  -- 2. Cancel tasks
  UPDATE work_tasks SET status = 'da_huy', updated_at = v_now
  WHERE contract_id = p_contract_id AND status NOT IN ('hoan_thanh','da_huy');

  -- 3. Cancel print orders
  UPDATE printing_orders SET status = 'da_huy', updated_at = v_now
  WHERE contract_id = p_contract_id AND status NOT IN ('da_giao','da_huy');

  -- 4. Cancel payment plans
  UPDATE payment_plans SET status = 'cancelled', updated_at = v_now
  WHERE contract_id = p_contract_id AND status NOT IN ('paid','cancelled');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restrict access
REVOKE EXECUTE ON FUNCTION cancel_contract_cascade FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cancel_contract_cascade TO authenticated;

-- ═══ Delete Cascade (Atomic, Soft Delete ALL) ═══
CREATE OR REPLACE FUNCTION delete_contract_cascade(
  p_contract_id UUID,
  p_user_id UUID
) RETURNS void AS $$
DECLARE
  v_now timestamptz := now();
  v_payment_count int;
BEGIN
  -- Block if payments exist
  SELECT count(*) INTO v_payment_count
  FROM payments WHERE contract_id = p_contract_id AND deleted_at IS NULL;

  IF v_payment_count > 0 THEN
    RAISE EXCEPTION 'Không thể xóa hợp đồng đã có phiếu thu. Hãy hủy thay vì xóa.';
  END IF;

  -- Soft delete ALL (thống nhất)
  UPDATE contract_items SET deleted_at = v_now WHERE contract_id = p_contract_id AND deleted_at IS NULL;
  UPDATE contract_events SET deleted_at = v_now WHERE contract_id = p_contract_id AND deleted_at IS NULL;
  UPDATE contracts SET deleted_at = v_now, updated_by = p_user_id, updated_at = v_now
  WHERE id = p_contract_id AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION delete_contract_cascade FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_contract_cascade TO authenticated;
```

### Step 3C: Refactor `contract-lifecycle.ts`
```typescript
// cancelContract() — thay 4 sequential updates:
const { error } = await supabase.rpc('cancel_contract_cascade', {
  p_contract_id: contractId,
  p_reason: reason.trim(),
  p_user_id: userId,
});
if (error) throw new Error(`Lỗi hủy HĐ: ${error.message}`);

// deleteContract() — thay hard delete:
const { error } = await supabase.rpc('delete_contract_cascade', {
  p_contract_id: contractId,
  p_user_id: userId,
});
if (error) throw new Error(error.message);

// reactivateContract() — THÊM reactivate payment_plans (W2):
// Sau dòng reactivate tasks (L140-144), thêm:
await supabase
  .from("payment_plans")
  .update({ status: "pending", updated_at: now })
  .eq("contract_id", contractId)
  .eq("status", "cancelled");
```

### Step 3D: Update queries filter deleted
Tất cả query `contract_items` và `contract_events` cần thêm `.is("deleted_at", null)`:
- `contract-detail-actions.ts` — getContractById items/events queries
- `contract-queries.ts` — getContractForEdit items query

### Verify:
1. Cancel HĐ → check DB: ALL tables đều status cancelled (1 transaction)
2. Delete HĐ → check DB: items + events có `deleted_at`, KHÔNG bị HARD delete
3. Reactivate HĐ → check: payment_plans status = pending

### Rollback:
```sql
DROP FUNCTION IF EXISTS cancel_contract_cascade;
DROP FUNCTION IF EXISTS delete_contract_cascade;
-- Revert sang code cũ trong contract-lifecycle.ts (git stash)
```

---

## Phase 04 — Status Machine + Date Validation (W1, W5)
**Target:** `contract-mutations.ts` + `useContractForm.ts` | **Effort:** 30 phút

### 4A. Status transition validation (`contract-mutations.ts`)

> [!IMPORTANT]
> `updateContractStatus()` hiện KHÔNG fetch current status. Cần thêm SELECT trước UPDATE.

```typescript
const VALID_TRANSITIONS: Record<string, string[]> = {
  cho_xu_ly: ["dang_thuc_hien", "da_huy"],
  dang_thuc_hien: ["hoan_thanh", "da_huy"],
  hoan_thanh: [],   // admin override only
  da_huy: [],        // reactivate via separate function
};

export async function updateContractStatus(id: string, newStatus: ContractStatus) {
  return withAuth(async (supabase, userId) => {
    // THÊM: Fetch current status trước
    const { data: current } = await supabase
      .from("contracts")
      .select("status")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (!current) throw new Error("Hợp đồng không tồn tại");

    const allowed = VALID_TRANSITIONS[current.status] || [];
    if (!allowed.includes(newStatus)) {
      // Check admin override
      const { data: emp } = await supabase.rpc("get_current_employee_role");
      if (emp !== "admin") {
        throw new Error(`Không thể đổi trạng thái từ "${current.status}" sang "${newStatus}"`);
      }
    }

    const { error } = await supabase.from("contracts").update({
      status: newStatus,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (error) throw error;
    revalidatePath("/contracts");
    revalidatePath(`/contracts/${id}`);
    return null;
  });
}
```

### 4B. Date validation (`useContractForm.ts` validate())
```typescript
// Thêm vào hàm validate(), sau check items:
if (formData.work_date && formData.contract_date) {
  if (formData.work_date < formData.contract_date) {
    newErrors.work_date = "Ngày làm việc không được trước ngày ký hợp đồng";
  }
}
if (formData.delivery_date && formData.work_date) {
  if (formData.delivery_date < formData.work_date) {
    newErrors.delivery_date = "Ngày giao không được trước ngày làm việc";
  }
}
```

### Verify:
1. UI: đổi status `hoan_thanh → cho_xu_ly` bằng sale → expect error toast
2. Form: nhập ngày giao < ngày làm → expect inline validation error
3. Admin vẫn có thể override status transition

---

## Phase 05 — Hook Bugs (W4, W6, W7)
**Target:** 3 hook files | **Effort:** 20 phút | **Risk:** 🟢 Low

### 5A. Fix async saveDraft (`useContractForm.ts`)
```diff
-const handleSubmitInternal = useCallback(async (isDraft = false) => {
+const handleSubmitInternal = useCallback(async (isDraft = false, overrideStatus?: string) => {
   ...
   const payload = {
     formData: {
       ...formData,
+      status: overrideStatus || formData.status,
       contract_code: contractCode,

-const handleSaveDraft = useCallback(async () => {
-  updateField("status", "cho_xu_ly");
-  await handleSubmitInternal(true);
-}, [updateField, handleSubmitInternal]);
+const handleSaveDraft = useCallback(async () => {
+  await handleSubmitInternal(true, "cho_xu_ly");
+}, [handleSubmitInternal]);
```

### 5B. Extract DEPOSIT_THRESHOLD (`useContractFinancials.ts`)
```diff
+/** 50% = ranh giới "đặt cọc" vs "thanh toán một phần" */
+const DEPOSIT_THRESHOLD = 0.5;
 ...
-if (paidAmount < totalAmount * 0.5) return "da_coc";
+if (paidAmount < totalAmount * DEPOSIT_THRESHOLD) return "da_coc";
```

### 5C. Fix tempIdCounter module global (`useContractItems.ts`)
```diff
-let tempIdCounter = 0;
-function generateTempId(): string {
-  tempIdCounter += 1;
-  return `temp-${Date.now()}-${tempIdCounter}`;
-}
+function generateTempId(): string {
+  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
+}
```

### Verify:
1. Build pass ✅
2. Tạo HĐ draft → submit → contract status = `cho_xu_ly` ✅
3. Thêm nhiều items → mỗi item có unique tempId ✅

---

## Phase 06 — Performance (W8, W9, W10)
**Target:** `contracts.ts` + `contract-detail-client.tsx` | **Effort:** 45 phút

### 6A. Parallel stats queries (`contracts.ts`)
Wrap 4 sequential DB queries trong `Promise.all()`:
```typescript
const [lifetimeResult, dataResult, thisMonthResult, lastMonthResult] = await Promise.all([
  supabase.from("contracts").select("*", { count: "exact", head: true }).is("deleted_at", null),
  supabase.from("contracts").select("...").is("deleted_at", null).range(from, to),
  supabase.from("contracts").select("status").is("deleted_at", null).gte("created_at", thisMonthStart),
  supabase.from("contracts").select("status").is("deleted_at", null).gte("created_at", lastMonthStart),
]);
```

### 6B. Extract HEADER_OFFSET constant (`contract-detail-client.tsx`)
```diff
+const HEADER_OFFSET = 64; // header height (56px) + gap (8px)
 ...
-const offset = 56 + 8;
-scrollEl.scrollTo({ top: el.offsetTop - offset, behavior: "smooth" });
+scrollEl.scrollTo({ top: el.offsetTop - HEADER_OFFSET, behavior: "smooth" });
```
Apply ở cả `handleQuickAction` (L139) và `handleTabClick` (L169).

### 6C. Extract scroll hook (Optional — giảm file size)
Tách `useScrollHeader()` từ `contract-detail-client.tsx`:
```typescript
// hooks/useScrollHeader.ts
export function useScrollHeader(scrollElId = "main-scroll") {
  const [headerVisible, setHeaderVisible] = useState(true);
  const [tabsMerged, setTabsMerged] = useState(false);
  const tabSentinelRef = useRef<HTMLDivElement>(null);
  // ... scroll + intersection logic
  return { headerVisible, tabsMerged, tabSentinelRef };
}
```
Giảm `contract-detail-client.tsx` từ 456 → ~400 lines.

### Verify:
1. Dev tools Network → stats API: 4 requests fire cùng lúc ✅
2. Scroll behavior trên mobile detail page vẫn đúng ✅

---

## Phase 07 — Code Quality: Hardcode Colors + Types (Q1-Q4, Q6-Q8, Q11)
**Target:** 8 component files | **Effort:** 1 session | **Risk:** 🟢 Low

### 7A. Gallery hardcode hex → CSS vars (verified tồn tại)
| From | To | Verified |
|------|----|----------|
| `#4CAF50` | `var(--color-success)` | ✅ globals.css L49 |
| `#F44336` | `var(--color-error)` | ✅ globals.css L51 |
| `#2196F3` | `var(--color-info)` | ✅ globals.css L52 |
| `rgba(0,0,0,0.6)` | tạo `--color-overlay: rgba(0,0,0,0.6)` | Cần thêm vào globals.css |
| `#fff` (icon color) | `var(--color-text-inverse)` | Cần verify |

Files: `gallery-toolbar.tsx` (3 colors), `gallery-image-grid.tsx` (4 colors), `gallery-image-list.tsx` (4 colors)

### 7B. Design token alignment
| From | To | File |
|------|----|------|
| `text-[14px]` | `text-body-sm` | `financial-dashboard.tsx` L81,89 |
| `text-[15px]` | `text-body` | `financial-dashboard.tsx` L133 |
| `text-[11px]` | `text-tiny` | `compact-stats.tsx` L85 |
| `text-emerald-600` | `text-success` | `financial-dashboard.tsx` L81 |
| `bg-neutral-100/60` | `bg-bg-hover` | `contract-drawer.tsx` L335 |

### 7C. Shared `fmtCurrency()` util (Q11)
```typescript
// lib/format-helpers.ts (NEW)
import { formatCurrency, CURRENCY_SYMBOL } from "@/lib/utils";
export function fmtCurrency(amount: number): string {
  return formatCurrency(amount) + " " + CURRENCY_SYMBOL;
}
```
Import trong `contract-drawer.tsx` + `contracts-table.tsx`, xóa local `fmt()`.

### 7D. Safelist dynamic entrance classes (Q6)
```javascript
// tailwind.config.ts → safelist
safelist: ['entrance-1','entrance-2','entrance-3','entrance-4','entrance-5']
```

### 7E. Fix `Record<string, unknown>` + `as any[]` (Q3, Q4)
- `contract-drawer.tsx`: define proper interfaces cho `OperationsTabs` props
- `contracts-table.tsx`: import `Contract` type thay vì `Record<string, unknown>`

### GIỮ NGUYÊN:
- Print template inline styles (hợp lệ — print context)
- `share-gallery-modal.tsx` (đã dùng `var()` fallback)
- `gallery-sort-dropdown.tsx` (đã dùng `var()` fallback)

### Verify:
1. Build pass ✅
2. Visual: mở trang contracts list + detail → pixel-perfect so với trước ✅
3. Gallery admin → filters (star/heart/comment) vẫn hiện đúng màu ✅

---

## Phase 08 — Cleanup (Q5, Q9, Q10)
**Target:** `contracts-list-client.tsx` + `contracts.ts` | **Effort:** 20 phút

1. **Q5:** `handleDelete` TODO → Nếu chưa cần UI → xóa `onDelete` prop khỏi `ContractsTable` interface + JSX. Giữ `deleteContract()` action cho sau.
2. **Q9:** `const DEFAULT_PAGE_SIZE = 20` — extract constant
3. **Q10:** Optional: Extract `MobileFilterBar` component (~80 lines) nếu file > 300L

### Verify:
1. Build pass ✅
2. TypeScript: no `unused` warnings ✅

---

## Tổng kết

| Phase | Issues | Files | Effort | Risk |
|-------|--------|-------|--------|------|
| 01 | C3 | 1 migration | 15 min | 🟡 |
| 02 | C4, C5, W3 | 1 migration | 15 min | 🟡 |
| 03 | C1, C2, W2 | 1 migration + 1 TS + 2 TS query updates | **1 session** | 🔴 |
| 04 | W1, W5 | 2 TS | 30 min | 🟢 |
| 05 | W4, W6, W7 | 3 TS hooks | 20 min | 🟢 |
| 06 | W8, W9, W10 | 2 TS | 45 min | 🟢 |
| 07 | Q1-Q4, Q6-Q8, Q11 | 8 files | 1 session | 🟢 |
| 08 | Q5, Q9, Q10 | 2 TS | 20 min | 🟢 |
| **Total** | **27 issues** | **~18 files** | **~6-8 sessions** | |

### Quy trình mỗi phase:
```
1. User gõ `/code phase-XX` kèm prompt
2. Em đọc tasks/pre-code-checklist.md + tasks/lessons.md
3. Em mở browser → xem UI hiện tại (V-GATE nếu là UI change)
4. Code theo plan → build → test → verify
5. Nếu Phase 03: run ALTER TABLE TRƯỚC, verify column tồn tại, rồi mới tạo RPC
```

### Emergency Rollback:
- Phase 01-02: Rollback SQL có sẵn trong plan ↑
- Phase 03: `DROP FUNCTION` + git revert `contract-lifecycle.ts`
- Phase 04-08: git stash / git revert (chỉ thay đổi TypeScript)
