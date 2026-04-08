# Phase 01: Action Hardening
Status: ⬜ Pending
Dependencies: None

## Objective
Harden CRM Server Actions to ensure robust security and data integrity. This phase implements the "5 Pillars" across 21 action functions (14 mutations, 7 reads) on the backend without touching any UI.

## Detailed Requirements \& Decisions

### 1. Zod Validation & Error Pattern
- Use strict `safeParse` inside the `withAuth` callback.
- **Fail Pattern:** If `parsed.success === false`, `throw new Error(...)`. Do NOT return nested `ActionResult`. `withAuth` will catch and format.

### 2. Date Fallback
- Use `format(new Date(), "yyyy-MM-dd")` from `date-fns` for time-zone safe defaults.
- Do NOT use `new Date().toISOString().split("T")[0]`.

### 3. Care History & addCareLog
- `care_history` is a `TEXT`/`string` column (NOT JSONB).
- `addCareLog` uses the `append_care_log` RPC which is atomic. 
- **Audit Decision:** Do NOT fetch `oldData` because fetching before the atomic RPC creates a race condition. Audit log records only `newData`.

### 4. Customer Dual-Branch Audit
- `createCustomer` logic handles both inserting new records and updating duplicates by phone.
- **Audit Branches:** 
  - New Insert => `fireAuditLog(CREATE, ...)`
  - Phone Dedup => fetch `oldData` + `fireAuditLog(UPDATE, ...)` (Do not log CREATE)

### 5. RBAC Enforcement
- Define `requireCrmAccess(supabase, userId)` exported from `lib/auth_utils.ts` returning `{ employee, role }` to avoid calling auth/session twice.
- **Enforcement:** Called at the top of *all* 21 CRM action callbacks.
- **`assignLead` Specific RBAC:**
  - `admin`/`manager`: allowed to assign/reassign any lead.
  - `sale`: allowed to self-assign ONLY IF lead is unassigned or already belongs to them.
  - `media`/`viewer`: rejected by base CRM access block.

### 6. Full Soft Delete Coverage (Leads)
- **Migration:** Must be written to `docs/migrations/crm-v2-leads-soft-delete.sql`.
- **Delete Action:** `deleteLead` must `.update({ deleted_at, updated_at })` instead of `.delete()`.
- **Query Protection:** `getLeads`, `getLeadStats`, phone dedup checks, and stale update guards must filter `.is("deleted_at", null)`.

### 7. Lead Lifecycle Split (Public API Preservation)
- Move `moveLeadToStage`, `markLeadAsLost`, `convertLeadToCustomer` etc. to `app/actions/lead-lifecycle.ts`.
- **Critical:** `app/actions/lead-actions.ts` MUST re-export these moved actions to ensure zero breakage to existing UI components or imports. Public names remain identical.

## Implementation Steps
1. [ ] **Migration**: Create `docs/migrations/crm-v2-leads-soft-delete.sql` containing the `deleted_at` schema change.
2. [ ] **Utilities**: Export `requireCrmAccess(supabase, userId)` from `lib/auth_utils.ts` and create `lib/validations/crm.schema.ts`.
3. [ ] **Lifecycle Split**: Create `lead-lifecycle.ts` and migrate advanced state actions, ensuring `lead-actions.ts` re-exports them.
4. [ ] **Harden Actions**: Update all functions across `lead-actions.ts`, `customer-actions.ts`, and `lead-lifecycle.ts` enforcing the specific patterns outlined above.

## Verification
- [ ] TypeScript & Build: `npx tsc --noEmit && npm run build`
- [ ] RBAC Check: `Select-String "requireCrmAccess" app/actions/lead-actions.ts,app/actions/customer-actions.ts,app/actions/lead-lifecycle.ts | Measure-Object # >= 21`
- [ ] Audit Check: `Select-String "fireAuditLog" app/actions/lead-actions.ts,app/actions/customer-actions.ts,app/actions/lead-lifecycle.ts | Measure-Object # >= 14`
- [ ] Zod Check: `Select-String "safeParse" app/actions/lead-actions.ts,app/actions/customer-actions.ts,app/actions/lead-lifecycle.ts,lib/validations/crm.schema.ts | Measure-Object # >= 14`
- [ ] No `any` type overrides in action files.

---
Next Phase: Phase 02 (UI Layout)
