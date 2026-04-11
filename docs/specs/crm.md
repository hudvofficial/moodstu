# Spec: CRM Module V2 — Wedding Studio
Status: 📋 Draft — chờ User duyệt
Created: 2026-04-08T21:47+07:00
Updated: 2026-04-08T22:19+07:00

> **SSOT Sources đã đọc:**
> - `~/.gemini/antigravity/skills/business-wedding-crm/SKILL.md` — Pipeline stages (7 conceptual), call prep, health score
> - `v2-module-template.md` — Folder structure, action patterns, compliance checklist
> - `module-blueprint.md` — Clone templates, component catalog, CSS tokens
> - `action-template.md` — withAuth, try-catch, revalidatePath, error mapping
> - `REGISTRY.md` — UI component SSOT (Table, Select, Badge, Stats, FAB...)
> - `globals.css @theme` — Earth-tone color palette, spacing scale, shadow tokens
> - `utilities.css` — Scrollbar, modal backdrop, inset indicators
> - `pre-code-checklist.md` — 9-step gate + design system rules
> - `before-edit.md` — 10-section gate + SSOT auto-scan
> - `lessons.md` — 99+ lessons (Lesson #53-67-81-82-92-94-96-97 relevant)
> - `lib/audit.ts` — `fireAuditLog()` interface (action, tableName, recordId, old/newData)
> - `lib/swr.ts` — Cache keys: `customers`, `customerDetail`, `leads`, `leadDetail`

> **Pipeline Stage Mismatch Note:**
> `~/.gemini/antigravity/skills/business-wedding-crm/SKILL.md` (verified: file exists at `C:\Users\Admin\.gemini\antigravity\skills\business-wedding-crm\SKILL.md`) defines 7 conceptual stages with different names (`lien_he_moi`, `dang_tu_van`, `da_bao_gia`, `thuong_luong`, `cho_ky_hd`, `da_chot`, `mat`).
> Code/DB (`types/crm.ts` LeadStatus, `PIPELINE_STAGES`) uses **6 statuses**: `moi | da_lien_he | hen_gap | da_bao_gia | da_chot | huy`.
> **Decision:** Spec follows the 6 statuses from code/DB. Skill is a conceptual business reference, not SSOT for DB schema.

---

## 1. Mô Tả Nghiệp Vụ

### 1.1. Phễu Bán Hàng (Sales Pipeline — 6 Statuses)

| Stage | DB Value | Label | Xác suất | Tiêu chí chuyển |
|-------|----------|-------|----------|-----------------|
| 1 | `moi` | Mới | 10% | Khách inbox/gọi — chưa trao đổi |
| 2 | `da_lien_he` | Đã liên hệ | 25% | Đã trao đổi, gửi bảng giá |
| 3 | `hen_gap` | Hẹn gặp | 40% | Khách nhận giá, đang cân nhắc |
| 4 | `da_bao_gia` | Đã báo giá | 60% | Khách đàm phán giá/điều khoản |
| 5 | `da_chot` | Đã chốt | 100% | Đã ký HĐ + nhận cọc |
| 6 | `huy` | Huỷ | 0% | Khách từ chối / mất liên lạc |

**Status Transition Machine (CHỐT):**
```
moi → da_lien_he | huy
da_lien_he → hen_gap | huy
hen_gap → da_bao_gia | huy
da_bao_gia → da_chot | huy
da_chot → (no outgoing by default)
huy → moi (reopen only)
```

> **V1 Parity Note:** V1 Kanban cho phép kéo tự do giữa các stage. V2 intentionally tightened thành forward-only progression + cancel. Nếu cần V1 parity tuyệt đối (kéo ngược), update `VALID_LEAD_TRANSITIONS` cho phép active → any active stage. Current spec chọn **forward-only** cho data integrity.

**Khi `da_chot`:**
- Trigger RPC `convert_lead_to_customer`
- Redirect `/contracts/create?customer_id=xxx`
- Cross-module revalidate: `/crm`, `/contracts`, `/customers`

### 1.2. Quản Lý Khách Hàng (Customer Management)

- Customer profiles với soft delete (`deleted_at`) ✅ (đã implement)
- Auto-code: `KH-001`, `KH-002`... (RPC `nextval_customer_code`)
- Phone dedup guard: trùng SĐT → update existing thay vì tạo mới
- LTV calculation: Sum `contracts.total_value` per customer
- Wedding-specific fields: bride/groom names, wedding_date, measurements

### 1.3. Chăm Sóc Khách (Care Log)

- Timeline ghi chú tương tác (RPC `append_care_log`)
- Types: Ghi chú, Cuộc gọi, Gặp mặt, Email
- Gắn với lead → follow-up tracking

### 1.4. Risk Flags (Future — Phase 06)

| Flag | Điều kiện |
|------|----------|
| 🚩 Stale deal | Không hoạt động >14 ngày |
| 🚩 No next step | Không có task/hẹn tiếp theo |
| 🚩 Slipping | Ngày cưới <60 ngày mà chưa chốt |
| 🚩 Budget mismatch | Ngân sách <70% giá gói |

---

## 2. Database Schema

### 2.1. Existing Tables (KHÔNG cần migration — trừ 2.3)

**`crm_leads`** — Lead pipeline
- `id`, `contact_name`, `phone`, `email`, `source`, `needs`, `address`
- `potential` (hot/warm/cold), `status` (lead_status_enum)
- `deal_value`, `score`, `tags[]`, `pipeline_order`
- `assigned_to`, `next_contact_date`, `care_history` (TEXT — see §2.5)
- `status_changed_at`, `lost_reason`
- Audit: `created_by` (stores `auth.users.id` by action convention — DB FK constraint not verified), `created_at`, `updated_at`
- ⚠️ **Hiện KHÔNG CÓ `deleted_at`** — cần migration (xem §2.3)

**`customers`** — Customer profiles
- `id`, `customer_code`, `full_name`, `phone`, `alt_phone`, `email`
- `address`, `gender`, `date_of_birth`, `wedding_date`
- `bride_name`, `groom_name`, `bride_phone`, `groom_phone`
- Body measurements: `bride_height/weight/shoe_size`, `groom_height/weight/shoe_size`
- `avatar_url`, `source`, `notes`, `tags[]`, `status`, `lead_id`
- Audit: `created_by`, `created_at`, `updated_at`, `deleted_at` (soft delete ✅)

### 2.2. Existing RPCs
- `convert_lead_to_customer` — Atomic lead→customer conversion
- `append_care_log` — Append care log entry
- `nextval_customer_code` — Auto-increment customer code

### 2.3. ⚠️ Migration Cần Thiết: `crm_leads.deleted_at`

**Problem đã verify:**
- `getLeadById` (L108) đang query `.is("deleted_at", null)` → assume column tồn tại
- `deleteLead` (L97) dùng hard `.delete()` → bất nhất với getLeadById filter
- `CrmLead` interface KHÔNG có field `deleted_at`
- `v2-module-template.md` yêu cầu soft delete cho mọi entity

**Decision: Soft delete — cần migration:**
```sql
-- Phase 01 migration
ALTER TABLE crm_leads ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
```

**Code changes kèm (Phase 01) — FULL SOFT DELETE COVERAGE:**
- `types/crm.ts`: Add `deleted_at: string | null;` vào `CrmLead` interface
- `lead-actions.ts` `deleteLead` (L97): Đổi `.delete()` → `.update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })`
- `lead-actions.ts` `getLeads` (L27): Add `.is("deleted_at", null)` filter — **hiện KHÔNG CÓ filter này**
- `lead-actions.ts` `getLeadStats` (L119): Add `.is("deleted_at", null)` filter — **hiện KHÔNG CÓ, stats sẽ tính cả deleted leads**
- `lead-actions.ts` `createLead` phone dedup (L46): Add `.is("deleted_at", null)` — **hiện chỉ filter `.neq("status", "huy")`**, deleted leads sẽ block phone reuse
- `lead-actions.ts` `updateLead/moveLeadToStage/updateDealValue/updateLeadScore/updateLeadTags/assignLead/markLeadAsLost`: Fetch old row → reject nếu `deleted_at` IS NOT NULL (guard against stale client state)
- Verify `getLeadById` (L108) `.is("deleted_at", null)` filter đã có ✅ — không cần sửa

### 2.4. RLS (Existing)
- `service_role_full_access` — Server actions via `withAuth()`
- `anon_no_access` — Block anonymous

### 2.5. care_history Column Type Clarification

**Verified from `types/database.types.ts`:** `crm_leads.care_history` is `string | null` (TEXT column, NOT JSONB).

- RPC `append_care_log` (returns `Json` per DB types) constructs a JSON entry internally, then appends it as TEXT to the `care_history` column via `v_entry::TEXT` concatenation.
- Phase 01 does NOT migrate `care_history` to JSONB. Existing TEXT append pattern is preserved.
- If future phases need structured query on care history (e.g., filter by type), a JSONB migration would be needed.

---

## 3. Server Actions — Complete Mutation Inventory & Hardening Plan

### 3.1. Complete Function Inventory

**`lead-actions.ts`** (226 lines — 14 functions):

| # | Function | Type | Zod | Audit | Lock | Notes |
|---|----------|------|-----|-------|------|-------|
| 1 | `getLeads` | READ | ✅ params | — | — | Input validate search/status/source params |
| 2 | `createLead` | **MUTATION** | ✅ | ✅ | — | Phone dedup + date fallback fix |
| 3 | `updateLead` | **MUTATION** | ✅ | ✅ oldData | ✅ | Full form update + expectedUpdatedAt |
| 4 | `deleteLead` | **MUTATION** | ✅ id | ✅ | — | Convert to soft delete |
| 5 | `getLeadById` | READ | ✅ id | — | — | Already filters deleted_at |
| 6 | `getLeadStats` | READ | — | — | — | Aggregate only |
| 7 | `moveLeadToStage` | **MUTATION** | ✅ | ✅ oldData | defer | Transition validation |
| 8 | `updateDealValue` | **MUTATION** | ✅ | ✅ oldData | defer | `deal_value >= 0` |
| 9 | `updateLeadScore` | **MUTATION** | ✅ | ✅ oldData | defer | `score 0..100` |
| 10 | `updateLeadTags` | **MUTATION** | ✅ | ✅ oldData | defer | Trim tags, filter empty |
| 11 | `assignLead` | **MUTATION** | ✅ | ✅ oldData | defer | RBAC: Admin/Manager reassign freely; Sale self-assign only (see §3.6) |
| 12 | `markLeadAsLost` | **MUTATION** | ✅ | ✅ oldData | defer | Status → `huy` + reason |
| 13 | `convertLeadToCustomer` | **MUTATION** | ✅ id | ✅* | — | *Limitation: RPC may not return full data — log minimum `lead_id + customer_id` |
| 14 | `addCareLog` | **MUTATION** | ✅ | ✅ | — | content required, type validated |

**`customer-actions.ts`** (182 lines — 7 functions):

| # | Function | Type | Zod | Audit | Lock | Notes |
|---|----------|------|-----|-------|------|-------|
| 1 | `getCustomers` | READ | ✅ params | — | — | Input validate search param |
| 2 | `getCustomerById` | READ | ✅ id | — | — | |
| 3 | `createCustomer` | **MUTATION** | ✅ | ✅ (dual-branch) | — | Phone dedup: if match → UPDATE+oldData; if new → CREATE (see §3.3) |
| 4 | `updateCustomer` | **MUTATION** | ✅ | ✅ oldData | ✅ | Full form + expectedUpdatedAt |
| 5 | `deleteCustomer` | **MUTATION** | ✅ id | ✅ | — | Already soft delete ✅ |
| 6 | `getCustomerStats` | READ | — | — | — | Aggregate |
| 7 | `searchCustomers` | READ | ✅ query | — | — | Input validate search string |

**Summary: 21 functions total — 14 mutations need Zod+Audit, 7 reads need input validation only.**

> **Optimistic Locking Scope Decision:**
> Phase 01 applies `expectedUpdatedAt` for **full form updates only**: `updateLead` + `updateCustomer`.
> Quick actions (`moveLeadToStage`, `updateDealValue`, `updateLeadScore`, `updateLeadTags`, `assignLead`, `markLeadAsLost`) are marked "defer" — they get audit logs + Zod validation but NOT optimistic locking.
> Rationale: Quick actions are atomic single-field changes; conflict risk is low. Full form updates touch multiple fields → higher conflict risk.

### 3.2. Zod Validation Contract

**File: `lib/validations/crm.schema.ts`** (NEW)

**withAuth + safeParse Pattern (CHỐT: Cách A — throw on fail):**

`withAuth()` (L220-241 `lib/auth_utils.ts`) wraps callback result:
- callback returns `T` → `{ success: true, data: T }`
- callback throws → catch → `{ success: false, error: message }`

Nên **KHÔNG return ActionResult bên trong callback** (sẽ bị nested). Thay vào đó:
```typescript
export async function createLead(data: LeadFormData) {
  return withAuth(async (supabase, userId) => {
    const parsed = leadCreateSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
    }
    const payload = parsed.data;
    // ... insert with payload
  });
}
```

Rules:
- `safeParse()` ngay đầu callback trong `withAuth`. If fail → `throw new Error(message tiếng Việt)`. withAuth sẽ catch và trả `{ success: false, error }`.
- ID validation: `z.string().trim().min(1, "ID không hợp lệ")` (NOT `z.uuid()` vì có thể đụng external systems)
- Date validation: Parse real date, NOT just `.min(1)`. Use `z.string().refine(v => !isNaN(Date.parse(v)), "Ngày không hợp lệ")`
- Enum validation: Use `z.enum([...])` matching `LeadStatus`, `LeadPotential`, `LeadSource` from `types/crm.ts`
- Numeric: `deal_value: z.number().min(0, "Giá trị phải ≥ 0")`, `score: z.number().min(0).max(100, "Điểm từ 0-100")`
- Tags: `z.array(z.string().trim()).transform(tags => tags.filter(t => t.length > 0))`

**Schemas to define:**
1. `leadCreateSchema` — Full lead form (contact_name required, phone optional...)
2. `leadUpdateSchema` — Partial `.partial()` of create
3. `leadIdSchema` — `z.object({ leadId: z.string().trim().min(1) })`
4. `leadStatusTransitionSchema` — `leadId + newStatus (z.enum(LeadStatus))`
5. `leadDealValueSchema` — `leadId + dealValue (z.number().min(0))`
6. `leadScoreSchema` — `leadId + score (z.number().min(0).max(100))`
7. `leadTagsSchema` — `leadId + tags (z.array(z.string().trim()).transform(...))`
8. `leadAssignSchema` — `leadId + employeeId (nullable)`
9. `leadLostSchema` — `leadId + reason (z.string().trim().min(1))`
10. `careLogSchema` — `leadId + content (required) + type (z.enum(...))`
11. `customerCreateSchema` — Full customer form
12. `customerUpdateSchema` — Partial `.partial()` of create
13. `customerIdSchema` — `z.object({ id: z.string().trim().min(1) })`

### 3.3. Audit Log Contract

**Apply `fireAuditLog()` to ALL 14 mutations:**

| Mutation | action | tableName | oldData | newData | description |
|----------|--------|-----------|---------|---------|-------------|
| `createLead` | CREATE | crm_leads | — | payload | "Tạo lead: {name}" |
| `updateLead` | UPDATE | crm_leads | ✅ fetch old | payload | "Cập nhật lead: {id}" |
| `deleteLead` | DELETE | crm_leads | ✅ fetch old | — | "Xóa lead: {name}" |
| `moveLeadToStage` | UPDATE | crm_leads | ✅ fetch old status | new status | "Pipeline: {old} → {new}" |
| `updateDealValue` | UPDATE | crm_leads | ✅ fetch old | { deal_value } | "Deal value: {old} → {new}" |
| `updateLeadScore` | UPDATE | crm_leads | ✅ fetch old | { score } | "Score: {old} → {new}" |
| `updateLeadTags` | UPDATE | crm_leads | ✅ fetch old | { tags } | "Tags: {old} → {new}" |
| `assignLead` | UPDATE | crm_leads | ✅ fetch old | { assigned_to } | "Assign: {old} → {new}" |
| `markLeadAsLost` | UPDATE | crm_leads | ✅ fetch old | { status, lost_reason } | "Lead huỷ: {reason}" |
| `convertLeadToCustomer` | CREATE | customers | — | { lead_id, customer_id }* | "Convert lead → customer" |
| `addCareLog` | UPDATE | crm_leads | ⚠️ exception* | { care_log_entry } | "Thêm ghi chú: {type}" |
| `createCustomer` (new insert) | CREATE | customers | — | payload | "Tạo KH: {name}" |
| `createCustomer` (phone dedup) | UPDATE | customers | ✅ fetch old | payload | "Cập nhật KH trùng SĐT: {name}" |
| `updateCustomer` | UPDATE | customers | ✅ fetch old | payload | "Cập nhật KH: {id}" |
| `deleteCustomer` | DELETE | customers | ✅ fetch old | — | "Xóa KH: {name}" |

> **`convertLeadToCustomer` Limitation:** RPC `convert_lead_to_customer` may not return full customer data. Minimum audit record: `{ lead_id, customer_id_if_returned }`. If RPC doesn't return customer_id, log `lead_id` only with description noting conversion triggered.

> **`addCareLog` oldData Exception (⚠️):** RPC `append_care_log` atomically appends a text log entry to `crm_leads.care_history` (TEXT column, NOT JSONB — see §2.5). Fetching `care_history` before RPC introduces a race condition. **Decision:** Do NOT fetch oldData for addCareLog. Audit log records only `newData: { content, type }` with description. This is an accepted limitation for atomic text append operations.

> **`createCustomer` Dual-Branch Audit:** Code L70-80 checks phone dedup: if existing customer found, it **updates** that customer and returns existing id (NOT insert). Phase 01 must audit both branches:
> - **New insert path (L86-92):** `fireAuditLog(CREATE, customers, newId, null, payload)`
> - **Phone dedup update path (L72-79):** Fetch old customer data BEFORE update → `fireAuditLog(UPDATE, customers, existingId, oldData, updatePayload)`. Description: "Cập nhật KH trùng SĐT: {phone}"

### 3.4. Date Fallback Fix

**Problem:** `createLead` L55: `data.contact_date || new Date().toISOString().split("T")[0]`
- `toISOString()` always returns UTC → date can drift by -1 day in UTC+7

**Fix (Phase 01) — dùng `date-fns` (verified: đã là dependency, Calendar module dùng rộng rãi):**
```typescript
import { format } from "date-fns";

// Replace:
contact_date: data.contact_date || new Date().toISOString().split("T")[0]

// With:
contact_date: data.contact_date || format(new Date(), "yyyy-MM-dd")
```

### 3.5. Performance Considerations

- **Pagination:** Already implemented (default 50 leads, 20 customers)
- **SWR Cache Keys:** Already in `lib/swr.ts` — `cacheKeys.leads()`, `cacheKeys.customers()`
- **LTV Query:** `getCustomers` joins contracts for LTV — OK for current scale
- **Stats:** `getLeadStats` fetches all leads → consider `count` aggregate for >10K leads
- **Search:** `ilike` pattern — OK for current scale, consider `pg_trgm` index if >5K records
- **Audit fetch for oldData:** Quick select by PK before update — minimal overhead

### 3.6. assignLead RBAC Decision (CHỐT)

**Problem verified:** `assignLead` (L174-181) currently uses `withAuth` — ANY authenticated user can assign ANY lead to ANY employee. No role check, no ownership guard.

**Decision:**

| Role | Permission | Implementation |
|------|-----------|----------------|
| **Admin** | Assign/reassign any lead to any employee | `withAuth` + no restriction |
| **Manager** | Assign/reassign any lead to any employee | Check `shellRole` in `[admin, manager]` |
| **Sale** | Self-assign only: assign lead to **self** if lead is currently unassigned OR already assigned to self. Cannot steal lead from another employee | Check `employee.id === assignToEmployeeId` AND (`oldLead.assigned_to IS NULL` OR `oldLead.assigned_to === employee.id`) |
| **Media** | No CRM mutation access | Reject with `"Bạn không có quyền thực hiện thao tác này"` |
| **Viewer** | No CRM mutation access | Same reject |

**Implementation pattern (Phase 01):**
```typescript
export async function assignLead(leadId: string, assignToEmployeeId: string | null) {
  return withAuth(async (supabase, userId) => {
    // 1. Zod validate
    // 2. Get user context (role + employee.id)
    const ctx = await getAuthenticatedUserContext();
    const role = ctx?.shellRole;
    
    // 3. Fetch old lead
    const { data: oldLead } = await supabase
      .from("crm_leads").select("assigned_to, contact_name")
      .eq("id", leadId).is("deleted_at", null).single();
    
    // 4. RBAC check
    if (role === "admin" || role === "manager") {
      // Allow any assignment
    } else if (role === "sale") {
      if (assignToEmployeeId !== ctx?.employee?.id) {
        throw new Error("Sale chỉ được assign lead cho chính mình");
      }
      if (oldLead.assigned_to && oldLead.assigned_to !== ctx?.employee?.id) {
        throw new Error("Không thể nhận lead đang thuộc nhân viên khác");
      }
    } else {
      throw new Error("Bạn không có quyền thực hiện thao tác này");
    }
    
    // 5. Update + audit
  });
}
```

> **Note:** `assignLead` has extra RBAC beyond `requireCrmAccess` — see role table above for sale self-assign restriction.

### 3.7. requireCrmAccess — Module-Level RBAC Gate (CHỐT)

**Problem verified:** ALL CRM server actions use `withAuth()` which creates an admin Supabase client (bypasses RLS). Any authenticated user (including `media`/`viewer`) can call these actions directly if they know the function name. `types/roles.ts` L7-41 shows only `admin`/`manager`/`sale` have `"crm"` permission; `media`/`viewer` do NOT.

**Decision: Add `requireCrmAccess` gate to ALL 21 CRM server actions (Phase 01).**

**Implementation:**
```typescript
// lib/auth_utils.ts or inline in each action
import { getAuthenticatedUserContext } from "@/lib/auth_utils";
import { canAccess } from "@/types/roles";

async function requireCrmAccess(): Promise<AuthenticatedUserContext> {
  const ctx = await getAuthenticatedUserContext();
  if (!ctx) throw new Error("Chưa đăng nhập");
  if (!canAccess(ctx.shellRole, "crm")) {
    throw new Error("Bạn không có quyền truy cập CRM");
  }
  return ctx;
}
```

**Coverage: ALL 21 functions (14 mutations + 7 reads):**

| Function | Gate | Extra RBAC |
|----------|------|------------|
| `getLeads` | `requireCrmAccess` | — |
| `getLeadById` | `requireCrmAccess` | — |
| `getLeadStats` | `requireCrmAccess` | — |
| `createLead` | `requireCrmAccess` | — |
| `updateLead` | `requireCrmAccess` | — |
| `deleteLead` | `requireCrmAccess` | — |
| `moveLeadToStage` | `requireCrmAccess` | — |
| `updateDealValue` | `requireCrmAccess` | — |
| `updateLeadScore` | `requireCrmAccess` | — |
| `updateLeadTags` | `requireCrmAccess` | — |
| `assignLead` | `requireCrmAccess` | + §3.6 sale self-assign |
| `markLeadAsLost` | `requireCrmAccess` | — |
| `convertLeadToCustomer` | `requireCrmAccess` | — |
| `addCareLog` | `requireCrmAccess` | — |
| `getCustomers` | `requireCrmAccess` | — |
| `getCustomerById` | `requireCrmAccess` | — |
| `getCustomerStats` | `requireCrmAccess` | — |
| `searchCustomers` | `requireCrmAccess` | — |
| `createCustomer` | `requireCrmAccess` | — |
| `updateCustomer` | `requireCrmAccess` | — |
| `deleteCustomer` | `requireCrmAccess` | — |

**Verification (Phase 01):**
```powershell
Select-String "requireCrmAccess" app/actions/lead-actions.ts | Measure-Object   # ≥ 14
Select-String "requireCrmAccess" app/actions/customer-actions.ts | Measure-Object # ≥ 7
```

---

## 4. UI Components — Phân Pha Chi Tiết

### SSOT Token Mapping (PRE-SCAN — 0 new tokens needed)

| UI Element | SSOT Source | File |
|------------|------------|------|
| Page wrapper | `.main-container` | `layout.css` |
| Stats row | `<StatsBar items={...}>` | `components/ui/stats-bar` |
| Status tabs | `<TabsFilter tabs={...}>` | `components/ui/tabs-filter` |
| Filter pills | `<SelectPill options={...}>` | `components/ui/select/SelectPill` |
| Form selects | `<SelectForm options={...}>` | `components/ui/select/SelectForm` |
| Table | `<TableWrapper>` `<THead>` `<TBody>` `<TH>` `<TD>` `<TR>` | `components/ui/table` |
| Cards | `.card-base` / `.card-interactive` | `cards.css` |
| Badges | `<Badge variant={getStatusVariant(...)}>` | `components/ui/badge` |
| Form layout | `.form-grid-2col` + `.input-base` + `.label-base` | `forms.css` |
| Buttons | `.btn` `.btn-primary` `.btn-outline` `.btn-danger` | `buttons.css` |
| Modal/Form | `openModal()` via `UnifiedModal` | `components/ui/unified-modal` |
| Delete confirm | `<ConfirmDialog>` | `components/ui/confirm-dialog` |
| Currency | `<CurrencyInput>` | `components/ui/currency-input` |
| Detail layout | `.detail-grid` + `.detail-main` + `.detail-sidebar` | `cards.css` |
| Empty state | `<EmptyState>` | `components/ui/ux-states` |
| Mobile FAB | `<FAB>` | `components/ui/fab` |
| Pagination | `<Pagination>` | `components/ui/pagination` |
| Drawer | `<Drawer>` (side panel desktop / bottom sheet mobile) | `components/ui/drawer` |
| Loading | `<Skeleton>` + `Loader2` spinner | `components/ui/skeleton` |
| Breadcrumb | `<Breadcrumb>` | `components/ui/breadcrumb` |
| Shadows | `shadow-xs` `shadow-sm` `shadow-md` (NO borders — Lesson #64) | `globals.css @theme` |
| Colors | ONLY via `@theme` CSS variables (NO hardcode hex — Lesson #53) | `globals.css` |
| Typography | `.text-h1` `.text-h2` `.text-h3` `.text-body` `.text-caption` etc. | `typography.css` |
| Spacing | `--spacing-xs/sm/md/base/lg/xl` (4-8-12-16-24-32) | `globals.css @theme` |
| Radius | `--radius-sm/md/lg/xl` (6-8-12-16) | `globals.css @theme` |
| Animation `to` | `transform: none` (NOT `translateY(0)` — Lesson #82) | `animations.css` |
| Modal | `openModal()` only (NOT self-render backdrop — Lesson #81) | `modals.css` |
| Responsive | `max-lg:` override pattern (NOT change default — Lesson #63) | — |

> **Design Token Warning — Hex Maps Legacy:**
> `types/crm.ts` chứa hex color maps (`LEAD_STATUS_MAP`, `SOURCE_MAP`, `POTENTIAL_MAP` — lines 16-45).
> UI Phases (02-05) **KHÔNG dùng trực tiếp hex maps** trong components mới. Thay vào đó:
> - Dùng `<Badge variant={...}>` với semantic variant names
> - Dùng CSS token classes (`.badge-success`, `.badge-warning`, etc.)
> - Hex maps marked **legacy** — schedule refactor to CSS variable-based system khi Kanban (Phase 06) build.

---

## Phase 01: Action Hardening (Zod + Audit + Locking + Soft Delete)

**Scope:** Backend only — KHÔNG sửa UI
**5 Pillars: Zod + Audit + Locking + RBAC + Soft Delete**
**Files:**
```
[NEW]    lib/validations/crm.schema.ts      — 13 Zod schemas
[MODIFY] app/actions/lead-actions.ts        — Zod + Audit + Lock + soft delete + requireCrmAccess
[MODIFY] app/actions/customer-actions.ts    — Zod + Audit + Lock + requireCrmAccess
[NEW]    app/actions/lead-lifecycle.ts       — Status transition machine (tách)
[MODIFY] types/crm.ts                       — Add deleted_at to CrmLead
[MODIFY] lib/auth_utils.ts                  — Add requireCrmAccess helper (or inline)
```

**Migration (if DB column missing):**
```sql
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
```

**Complete Checklist (21 functions = 14 mutations + 7 reads):**

RBAC gate (all 21):
- [ ] Add `requireCrmAccess` helper (§3.7) — must be called at top of every CRM action callback

Lead mutations (11):
- [ ] `createLead` → Zod `leadCreateSchema.safeParse()` + `fireAuditLog(CREATE)` + date fallback fix
- [ ] `updateLead` → Zod `leadUpdateSchema.safeParse()` + fetch oldData + `fireAuditLog(UPDATE)` + `expectedUpdatedAt`
- [ ] `deleteLead` → Convert to soft delete `.update({ deleted_at })` + `fireAuditLog(DELETE)`
- [ ] `moveLeadToStage` → Zod `leadStatusTransitionSchema` + `VALID_LEAD_TRANSITIONS` check + fetch old status + `fireAuditLog(UPDATE)`
- [ ] `updateDealValue` → Zod `leadDealValueSchema` (>=0) + fetch old + `fireAuditLog(UPDATE)`
- [ ] `updateLeadScore` → Zod `leadScoreSchema` (0-100) + fetch old + `fireAuditLog(UPDATE)`
- [ ] `updateLeadTags` → Zod `leadTagsSchema` (trim+filter empty) + fetch old + `fireAuditLog(UPDATE)`
- [ ] `assignLead` → Zod `leadAssignSchema` + RBAC check (§3.6) + fetch old + `fireAuditLog(UPDATE)`
- [ ] `markLeadAsLost` → Zod `leadLostSchema` (reason required) + fetch old + `fireAuditLog(UPDATE)`
- [ ] `convertLeadToCustomer` → Zod `leadIdSchema` + `fireAuditLog(CREATE)` (minimum: lead_id)
- [ ] `addCareLog` → Zod `careLogSchema` (content required, type enum) + `fireAuditLog(UPDATE)` (NO oldData — RPC atomic exception)

Customer mutations (3):
- [ ] `createCustomer` → Zod `customerCreateSchema.safeParse()` + dual-branch audit: CREATE (new) / UPDATE+oldData (phone dedup)
- [ ] `updateCustomer` → Zod `customerUpdateSchema.safeParse()` + fetch oldData + `fireAuditLog(UPDATE)` + `expectedUpdatedAt`
- [ ] `deleteCustomer` → Zod `customerIdSchema` + `fireAuditLog(DELETE)`

Read input validation (7 — NO audit log):
- [ ] `getLeads` — validate search/status/source params
- [ ] `getLeadById` — validate id
- [ ] `getLeadStats` — no input
- [ ] `getCustomers` — validate search param
- [ ] `getCustomerById` — validate id
- [ ] `getCustomerStats` — no input
- [ ] `searchCustomers` — validate query string

**Verification (Phase 01):**
```powershell
# TypeScript check
npx tsc --noEmit --incremental false --pretty false

# Build
npm run build

# RBAC coverage (all 21 functions)
Select-String "requireCrmAccess" app/actions/lead-actions.ts | Measure-Object   # ≥ 14
Select-String "requireCrmAccess" app/actions/customer-actions.ts | Measure-Object # ≥ 7

# Zod coverage (14 mutations)
Select-String "safeParse" app/actions/lead-actions.ts | Measure-Object   # ≥ 6
Select-String "safeParse" app/actions/customer-actions.ts | Measure-Object # ≥ 3
Select-String "safeParse" app/actions/lead-lifecycle.ts | Measure-Object   # ≥ 1

# Audit coverage (14 mutations)
Select-String "fireAuditLog" app/actions/lead-actions.ts | Measure-Object   # ≥ 8
Select-String "fireAuditLog" app/actions/customer-actions.ts | Measure-Object # ≥ 3
Select-String "fireAuditLog" app/actions/lead-lifecycle.ts | Measure-Object   # ≥ 2

# Locking coverage (2 full form updates)
Select-String "expectedUpdatedAt" app/actions/lead-actions.ts | Measure-Object     # ≥ 1
Select-String "expectedUpdatedAt" app/actions/customer-actions.ts | Measure-Object  # ≥ 1

# Soft delete full coverage verify
Select-String "\.delete\(\)" app/actions/lead-actions.ts | Measure-Object   # = 0 (no hard delete)
Select-String 'is\("deleted_at"' app/actions/lead-actions.ts | Measure-Object   # ≥ 3 (getLeads, getLeadById, getLeadStats)
Select-String 'is\("deleted_at"' app/actions/customer-actions.ts | Measure-Object  # ≥ 2 (getCustomers, getCustomerStats already have it)

# No `any`
Select-String ": any" app/actions/lead-actions.ts | Measure-Object       # = 0
Select-String ": any" app/actions/customer-actions.ts | Measure-Object   # = 0

# Schema file exists
Test-Path lib/validations/crm.schema.ts   # True

# date-fns usage (no toISOString().split date fallback)
Select-String 'toISOString\(\).split' app/actions/lead-actions.ts | Measure-Object  # = 0
Select-String 'from "date-fns"' app/actions/lead-actions.ts | Measure-Object        # ≥ 1

# Migration verify (if applied)
# SELECT column_name FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'deleted_at';
```

---

## Phase 02: Route + Layout + Lead List Page

**Scope:** Lead list UI (table + filters + stats)
**Clone Source:** `components/employees/` (Gold Standard)
**Files:**
```
[NEW] app/(protected)/crm/page.tsx              — Redirect → /crm/leads
[NEW] app/(protected)/crm/loading.tsx           — Skeleton loader
[NEW] app/(protected)/crm/error.tsx             — ErrorFallback
[NEW] app/(protected)/crm/layout.tsx            — CRM tab navigation (Sale | Hồ sơ KH)
[NEW] app/(protected)/crm/leads/page.tsx        — SSR fetch → LeadListPage
[NEW] app/(protected)/crm/leads/loading.tsx     — Skeleton
[NEW] components/crm/lead-list-page.tsx         — SWR + filters + pagination
[NEW] components/crm/lead-filters.tsx           — TabsFilter + SelectPill (TÁCH FILE RIÊNG)
[NEW] components/crm/lead-stats-bar.tsx         — StatsBar (TÁCH FILE RIÊNG)
[NEW] components/crm/lead-table.tsx             — Desktop <TableWrapper>
[NEW] components/crm/lead-card.tsx              — Mobile card-interactive
```

**Lead Table Columns (V1 parity):**

| Column | Component | Width |
|--------|-----------|-------|
| Khách hàng | Avatar + name + date | 25% |
| Liên hệ | Phone | 10% |
| Nguồn | `<Badge>` source | 10% |
| Nhu cầu | Text truncate | 15% |
| Score | Score badge (color by level) | 8% |
| Deal Value | `formatCurrency()` | 12% |
| Trạng thái | `<Badge variant={...}>` | 10% |
| Tiềm năng | `<Badge>` potential | 8% |
| Thao tác | Detail + Edit icons | auto |

**Lead Filters:**
- Mobile: `<TabsFilter variant="pills">` + `<SelectPill>` (lg:hidden, scrollbar-hide)
- Desktop: `<TabsFilter>` + `<SelectPill>` (hidden lg:flex lg:justify-between)
- Tabs: Tất cả | Mới | Đã liên hệ | Hẹn gặp | Đã báo giá | Đã chốt | Huỷ
- Pills: Nguồn (all/facebook/zalo/walk_in/referral), Nhân viên

**UX States (module-blueprint §8):**
- Loading: `loading.tsx` + `Loader2` spinner
- Empty (no data): `<EmptyState icon={Users} title="Chưa có lead">`
- Empty (no filter): `<EmptyState icon={FilterX} title="Không tìm thấy">`
- Error: `error.tsx` ErrorFallback
- Submit loading: `isSubmitting` disable button

**Performance:**
- SWR cache key: `cacheKeys.leads()` (already exists)
- Pagination: 50 items/page (via server action params)
- Debounced search: `useDebounce(300ms)` hook

**Checklist:**
- [ ] Clone structure from employees Gold Standard
- [ ] Filters TÁCH FILE RIÊNG (`lead-filters.tsx`)
- [ ] Stats bar TÁCH FILE RIÊNG (`lead-stats-bar.tsx`)
- [ ] Table dùng `<TableWrapper>` `<TH>` `<TD>` `<TR>` (REGISTRY)
- [ ] Mobile cards dùng `.card-interactive` (lg:hidden space-y-2)
- [ ] Badge dùng `<Badge variant={...}>` (NO inline hex, NO `LEAD_STATUS_MAP.color`)
- [ ] FAB sau stats container
- [ ] Pagination + footer count
- [ ] 0 hardcoded hex, 0 borders, 0 inline styles
- [ ] Max 250 lines/file

---

## Phase 03: Lead Form + Detail Drawer

**Scope:** Create/Edit lead + detail panel
**Files:**
```
[NEW] components/crm/lead-form-modal.tsx        — Create/Edit (UnifiedModal + openModal)
[NEW] components/crm/lead-detail-drawer.tsx      — Drawer (summary + care log + actions)
[NEW] components/crm/lead-care-log.tsx           — Care log timeline (TÁCH FILE RIÊNG)
```

**Lead Form Fields (form-grid-2col):**

| Row | Col 1 | Col 2 |
|-----|-------|-------|
| 1 | Tên liên hệ (`input-base`) | SĐT (`input-base`) |
| 2 | Email (`input-base`) | Nguồn (`<SelectForm>`) |
| 3 | Nhu cầu (`textarea input-base`) | Tiềm năng (`<SelectForm>`) |
| 4 | Deal Value (`<CurrencyInput>`) | Score (input-base type=number) |
| 5 | Ngày liên hệ tiếp (`<DatePicker>`) | Nhân viên phụ trách (`<SelectForm>`) |
| 6 | Ghi chú (`textarea input-base` col-span-2) | |
| 7 | Tags (multi-select chips) | |

**Detail Drawer:**
- Header: Name + Status badge + Score
- Summary: Deal value, source, potential, assigned, next contact date
- Care Log timeline (tách file riêng `lead-care-log.tsx`)
- Actions: Edit, Move stage, Add care log, Convert to customer, Mark as lost

**Checklist:**
- [ ] Modal dùng `openModal()` (Lesson #81)
- [ ] Form inputs dùng `.input-base` `.label-base` `.error-text`
- [ ] Grid dùng `.form-grid-2col` (NOT inline grid-cols-2)
- [ ] Footer dùng `.form-actions`
- [ ] Currency dùng `<CurrencyInput>` (NOT input type=number)
- [ ] Delete dùng `<ConfirmDialog>`
- [ ] Drawer dùng `<Drawer>` (desktop side panel / mobile bottom sheet)
- [ ] Care log tách file riêng (max 250 lines)
- [ ] `isSubmitting` state on all buttons
- [ ] `expectedUpdatedAt` passed from SWR data to updateLead

---

## Phase 04: Customer List + Detail

**Scope:** Customer list + detail page
**Files:**
```
[NEW] app/(protected)/crm/customers/page.tsx    — SSR fetch → CustomerListPage
[NEW] app/(protected)/crm/customers/loading.tsx  — Skeleton
[NEW] components/crm/customer-list-page.tsx      — SWR + filters + pagination
[NEW] components/crm/customer-filters.tsx        — SearchBar + SelectPill (TÁCH FILE RIÊNG)
[NEW] components/crm/customer-stats-bar.tsx      — StatsBar (TÁCH FILE RIÊNG)
[NEW] components/crm/customer-table.tsx          — Desktop table
[NEW] components/crm/customer-card.tsx           — Mobile card
[NEW] components/crm/customer-form-modal.tsx     — Create/Edit customer
[NEW] components/crm/customer-detail-drawer.tsx  — Detail + contracts + LTV
```

**Customer Table Columns:**

| Column | Component |
|--------|-----------|
| Mã KH | Text (KH-001) |
| Tên | Avatar + full_name |
| SĐT | Phone |
| Wedding Date | Formatted date |
| Nguồn | Badge |
| LTV | `formatCurrency()` |
| Ngày tạo | Formatted date |

**Customer Stats:**
- Total customers
- New this month
- Average LTV

**Checklist:** Same as Phase 02 (clone employees pattern) + `expectedUpdatedAt` for updateCustomer

---

## Phase 05: Sidebar + Navigation + Polish

**Scope:** Wire CRM vào app shell
**Files:**
```
[MODIFY] components/layout/sidebar.tsx          — Add "CRM" link (short label)
[MODIFY] components/layout/bottom-nav.tsx       — Add CRM for mobile
```

**CRM Layout Tabs (V1 parity):**
- **Sale** → `/crm/leads` (Lead list)
- **Hồ sơ KH** → `/crm/customers` (Customer list)

**Route Decision:** `/crm` redirects → `/crm/leads` (Sale tab default)

**Sidebar Label Decision:** `"CRM"` (ngắn gọn, không dùng "Hệ thống CRM" V1)

**Final Verification (All Phases):**
```powershell
# Build
npm run build

# TypeScript
npx tsc --noEmit --incremental false --pretty false

# SSOT compliance grep (Phase 02-05 components):
Get-ChildItem components/crm -Recurse -Filter *.tsx | Select-String -Pattern '#[0-9a-fA-F]{3,8}'  # = 0 (no hardcoded hex)
Get-ChildItem components/crm -Recurse -Filter *.tsx | Select-String -Pattern 'divide-border'      # = 0 (banned)
# border-border is ALLOWED — Tailwind v4 @theme SSOT token mapping to var(--color-border). Expected: ~22 hits.
# style={{ is ALLOWED for chart components only (dynamic runtime SVG). Expected: ~5 hits.
#   Allowed files: components/crm/lead-analytics.tsx, components/crm/widgets/widget-source-donut.tsx
Get-ChildItem components/crm -Recurse -Filter *.tsx | Select-String -Pattern '<th |<td |<tbody|<thead'  # = 0 (use SSOT table)
Get-ChildItem components/crm -Recurse -Filter *.tsx | Select-String -Pattern '<select'  # = 0 (use SelectForm/SelectPill)

# Audit + Zod coverage (Phase 01):
Select-String "fireAuditLog" app/actions/lead-actions.ts,app/actions/customer-actions.ts,app/actions/lead-lifecycle.ts | Measure-Object  # ≥ 14
Select-String "safeParse" app/actions/lead-actions.ts,app/actions/customer-actions.ts,app/actions/lead-lifecycle.ts,lib/validations/crm.schema.ts | Measure-Object  # ≥ 14

# File size check:
Get-ChildItem components/crm -Recurse -Filter *.tsx | ForEach-Object { "$($_.Name): $((Get-Content $_.FullName | Measure-Object).Count) lines" }
# All should be ≤ 300 lines
```

---

## Decisions (Chốt — Không Còn Open)

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Lead hard vs soft delete | **Soft delete** | v2-module-template requires it; `getLeadById` already filters `deleted_at`; need migration for column |
| 2 | `/crm` default route | **Redirect → `/crm/leads`** | Sale tab is primary workspace |
| 3 | Kanban Pipeline | **Phase 06 future** | Not blocking Phase 01-05; table list + inline status change covers MVP |
| 4 | "Bảng tin" Dashboard | **Phase 06 future** | Not blocking; stats visible via StatsBar on lead list |
| 5 | Sidebar label | **"CRM"** (short) | Consistent with other short labels (Dịch vụ, Vật tư) |
| 6 | Pipeline stages count | **6 statuses from code/DB** | Skill (verified file) has 7 conceptual stages; code/DB is authoritative |
| 7 | Optimistic locking scope | **Full form updates only** (P01) | Quick actions defer; low conflict risk |
| 8 | Status transitions | **Forward-only + cancel** | Intentional V2 change from V1 free-drag Kanban |

---

## Future Phase Questions (NOT blocking Phase 01-05)

These questions only become relevant when Phase 06+ is planned:
- Kanban: Drag-and-drop library choice? V1 used what library?
- Dashboard: Which charts? Recharts or built-in?
- Analytics: Funnel visualization + conversion tracking scope?
- Risk flags: Automated cron vs on-demand calculation?
- Bulk actions: Select multiple leads → assign/move/tag?

---

## 6. Compliance Checklist (v2-module-template §8)

### Architecture
- [ ] Actions split: `lead-actions.ts` + `customer-actions.ts` + `lead-lifecycle.ts`
- [ ] No cross-module functions in action files
- [ ] All actions use `withAuth()` ✅ (already)
- [ ] **Zod Validation** via `safeParse()` — 14 mutations (Phase 01)
- [ ] **Audit Logs** via `fireAuditLog()` — 14 mutations (Phase 01)
- [ ] **Optimistic Locking** via `expectedUpdatedAt` — 2 full updates (Phase 01)
- [ ] `revalidatePath()` after mutations ✅ (already)
- [ ] `created_by` stores current `auth.users.id` by action convention ✅ (DB FK constraint not verified — existing pattern, no migration needed)

### Naming
- [ ] Functions: verb + Module + Detail (camelCase) ✅
- [ ] Files: kebab-case ✅
- [ ] DB enums: snake_case tiếng Việt không dấu ✅
- [ ] Display labels: Sentence case ✅

### Types & Validations
- [ ] Types centralized in `types/crm.ts` ✅
- [ ] Constants/labels: `LEAD_STATUS_MAP`, `SOURCE_MAP` etc. ✅
- [ ] Zod Schema: `lib/validations/crm.schema.ts` (Phase 01)
- [ ] No `any` (Phase 01 enforcement)

### Components
- [ ] No file > 300 lines → split
- [ ] Form: composition hook pattern
- [ ] CSS classes from SSOT tokens (0 hardcoded hex)
- [ ] `error.tsx` per route
- [ ] Responsive: Desktop 1440 + Mobile 375
- [ ] Currency via `formatCurrency()` + `CURRENCY_SYMBOL`

### Database
- [ ] Soft delete: `deleted_at` ✅ (customers already; leads after Phase 01 migration)
- [ ] RLS: `service_role_full_access` + `anon_no_access` ✅
- [ ] Audit columns ✅

### Performance
- [ ] SWR cache keys ✅ (lib/swr.ts)
- [ ] Pagination ✅ (50 leads, 20 customers)
- [ ] Debounced search: `useDebounce(300ms)`
- [ ] No foreignTable sub-select for large tables
