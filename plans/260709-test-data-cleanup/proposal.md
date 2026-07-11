# Proposal — Safe Cleanup of Test Data from mood-studio Production DB

**Project:** mood-studio (Next.js 15 App Router + Supabase/Postgres) · linked project `moodweddingstudio` (`mnoqeluywookswpcykha`)
**Date:** 2026-07-09 · **Status:** ⬜ DRAFT — awaiting user review. **No production data is touched until this is approved.**
**Author:** Claude (via Iris) · **Constraint:** zero downtime, fully reversible.

---

## 1. Objective & scope

Remove **test / demo data** from the production database — covering **users (auth + employees), customers, contracts, and all related child records** — without downtime and without ever risking real business data. Deliver a reviewed, reversible plan before any write happens.

In scope (data domains found in schema):
- **Users:** `auth.users` (Supabase Auth) ↔ `employees` (mirror, linked by `employees.auth_user_id`; auto-created by the `on_auth_user_created` trigger).
- **Customers:** `customers`.
- **Contracts:** `contracts`, `contract_details`, `service_details`, `payment_plans` + `payment_plan_allocations`, `receipts`, `payments`, `order_payments`, `documents`, `printing_orders`, `dress_rentals`, `work_progress`.
- **CRM / misc:** `crm_leads`, `notifications`, `requests`, `evaluations`, `attendance`, `audit_logs` (see §4 for handling).

Out of scope: reference/config tables (`services`, `labs`, `transaction_categories`, `studio_info`, `regulations`, `fixed_costs`, etc.) unless a specific test row is identified.

---

## 2. Key findings that drive the strategy (verified from schema/migrations)

1. **Soft-delete is the app's native convention.** `deleted_at TIMESTAMPTZ` exists on the core tables (`contracts`, `customers`, `employees`, `crm_leads`, `receipts`, `payments`, `services`, `printing_orders`, `inventory_items`, …), and the finance RPCs already filter `WHERE deleted_at IS NULL`. → **Soft-delete hides a row from the entire app immediately and is reversible by `SET deleted_at = NULL`.** This is the safest primary mechanism and needs no downtime.
2. **There is an established test-data marker: the `DEMO`/`DEMO-` prefix.** The repo's seed pipeline (`scripts/seed-finance-demo.ts`, plan `phase-07-demo-seed.md`) creates and cleans demo data via `contract_code LIKE 'DEMO-%'`, `customers.full_name LIKE 'DEMO%'`, `notes LIKE 'DEMO%'`, in the order **payments → receipts → contracts → customers**. We reuse this convention as the authoritative identifier and extend the discovery to catch un-prefixed test rows.
3. **Foreign keys are mostly `RESTRICT` (no cascade).** Most FKs (`created_by`, `contract_id`, `customer_id`, `assigned_to`, `approved_by`) are plain `REFERENCES` → Postgres blocks a parent delete while children exist. A few are `ON DELETE CASCADE` (`contract_details.contract_id`, some `*_allocations`). Implication: **hard deletion must be strictly child-first**, and RESTRICT is actually a safety net. Soft-delete sidesteps FK ordering entirely.
4. **`*_by` audit columns reference `auth.users(id)`** (Lesson #72 in code) and `employees.created_by` etc. reference `employees(id)`. → **Hard-deleting a test user can orphan/block historical rows created by that user.** Test users should be soft-disabled, not hard-deleted, unless they created nothing real.
5. **Access is via Supabase service-role** (`SUPABASE_SERVICE_ROLE_KEY`, used by scripts) — RLS is bypassed, so the cleanup script must be written and reviewed with extra care (no RLS backstop).

---

## 3. Risk analysis

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | **Deleting real customer/contract data** mistaken for test | Med | Critical | Discovery dry-run + explicit allow-list of IDs reviewed by user before any write; soft-delete first (reversible); backup before execution |
| R2 | **FK RESTRICT aborts a hard delete mid-way**, partial state | Med | High | Soft-delete primary path (no FK issues). If hard purge: single transaction, child-first order, `ON CONFLICT`/existence checks |
| R3 | **Orphaned audit history** from deleting a test `auth.users` referenced by `*_by` on real rows | Med | High | Soft-disable users (ban + `employees.deleted_at`) instead of hard delete; only hard-delete users with zero real references |
| R4 | **Financial totals shift** because a "test" receipt/payment was actually counted | Low | High | Compare dashboard revenue/debt snapshots before vs. after; demo receipts already excluded when `deleted_at` set |
| R5 | **Service-role script bypasses RLS** → a bad `WHERE` hits all tenants/rows | Low | Critical | Mandatory `LIMIT`/count assertion, dry-run row counts must match reviewed expectation, peer-reviewed SQL, run in a transaction with `SELECT` verification before `COMMIT` |
| R6 | **Downtime / lock contention** on large deletes | Low | Med | Soft-delete = cheap single-column `UPDATE`; batch in chunks (e.g. 500 rows); run off-peak; no schema changes |
| R7 | **Trigger side-effects** (`on_auth_user_created`, receipt/payment `AFTER UPDATE OF deleted_at` triggers) | Med | Med | Enumerate triggers on target tables first; test the exact soft-delete path on a staging clone |
| R8 | **Irreversible hard delete** removes something needed later | — | Critical | Two-stage: soft-delete now, hard-purge only after a retention window (e.g. 30 days) and a fresh backup |

---

## 4. Test-data identification strategy (patterns / identifiers)

**Principle: identify → review → act.** We never delete by pattern blindly; patterns produce a *candidate set* that the user approves as an explicit ID list.

**Tier 1 — authoritative marker (high confidence):**
- `contracts.contract_code LIKE 'DEMO-%'`
- `customers.full_name LIKE 'DEMO%'` / `customer_code LIKE 'DEMO%'` / `TEST%`
- `notes LIKE 'DEMO%'` on `payments`, `receipts`

**Tier 2 — heuristic candidates (require review):**
- Names/codes matching `^(test|demo|aaa|abc|xxx|zzz|qa|sample)` (case-insensitive), Vietnamese `thử`/`test`.
- Placeholder phones: `0000000000`, `1234567890`, repeated digits, obviously fake.
- Test emails: `@test.`, `@example.`, `+test@`, `mailinator`, disposable domains.
- Employees with `employee_code LIKE 'TEST%'` or `email` test-pattern, or `auth.users` created before go-live / by the dev team's known addresses.
- Rows created in a known QA window (`created_at` between staging dates) **and** with no linked real financials.
- Contracts with `total_amount = 0`/absurd values **and** a Tier-2 customer.

**Tier 3 — relational expansion:** for every approved parent (customer/contract/user), collect its dependents via FK (contract → contract_details, receipts, payments, payment_plans+allocations, documents, printing_orders, dress_rentals, work_progress; customer → contracts…; user → employee row).

**Deliverable of the discovery phase:** a read-only report (counts per table + full candidate ID lists + a sample of rows) exported to `plans/260709-test-data-cleanup/discovery-report.json`, for user sign-off. Nothing is deleted in this phase.

---

## 5. Backup strategy

1. **Full logical backup immediately before execution:** Supabase dashboard PITR checkpoint + `pg_dump` of the whole DB (schema + data) to an off-box encrypted file. Record the timestamp/restore point.
2. **Targeted snapshot of affected rows:** before any write, `COPY (SELECT * FROM <table> WHERE id = ANY(<candidate ids>)) TO` a CSV/JSON per table, stored under `plans/260709-test-data-cleanup/snapshots/`. This gives a row-level restore path independent of the full dump.
3. **PITR confirmation:** confirm Supabase Point-in-Time-Recovery is enabled and note the recovery window, so the operation can be rewound wholesale if needed.
4. **Retention:** keep backups + snapshots ≥ 30 days after the hard-purge stage.

---

## 6. Phased execution plan (no downtime, reversible)

**Phase 0 — Prep & staging rehearsal.** Clone prod (or use a staging snapshot). Enumerate triggers/RPCs on target tables. Build & test the discovery + soft-delete scripts against the clone. Confirm dashboard metrics unchanged after excluding candidates. *(No prod writes.)*

**Phase 1 — Discovery (read-only, prod).** Run the Tier 1–3 queries against prod with the service role, **SELECT only**. Produce `discovery-report.json` (counts + IDs + samples). → **User reviews and approves the exact ID set.** Gate: explicit approval.

**Phase 2 — Backup.** Execute §5 (full dump + PITR checkpoint + per-table row snapshots of the approved IDs).

**Phase 3 — Soft-delete (reversible, primary).** In a transaction, for each approved ID set, `UPDATE <table> SET deleted_at = NOW() WHERE id = ANY(...) AND deleted_at IS NULL`, child-to-parent, batched (≤500). For test **users**: ban the `auth.users` account (Auth admin API) **and** soft-delete the `employees` row; do **not** hard-delete auth if it authored real rows. Verify counts match the approved set; `SELECT` sanity-check inside the txn; then `COMMIT`. App immediately stops showing the data (RPCs filter `deleted_at`). **Reversible via `SET deleted_at = NULL`.**

**Phase 4 — Verification & soak.** Compare pre/post dashboard snapshots (revenue, debts, counts) — deltas must be zero for real data. Monitor for the retention window (default 30 days). Users/stakeholders confirm nothing is missing.

**Phase 5 — Hard purge (optional, after soak).** Only after a fresh backup and confirmed soak: within a single transaction, hard-`DELETE` the soft-deleted test rows **child-first** in FK order (allocations → payments/receipts → contract_details/service_details/documents/printing_orders/dress_rentals/work_progress → contracts → customers → employees → auth.users for zero-reference test users). Verify FK integrity; `COMMIT`. This reclaims space; skip it entirely if soft-delete is sufficient.

**Rollback at any phase:** Phase 3 → `deleted_at = NULL` + unban. Any phase → restore from Phase-2 snapshots or PITR to the recorded checkpoint.

---

## 7. Deliverables for the actual run (built after approval)
- `scripts/cleanup/discover-test-data.ts` — read-only, emits `discovery-report.json`.
- `scripts/cleanup/soft-delete-test-data.ts` — transactional, batched, approved-ID-driven, dry-run flag default ON.
- `scripts/cleanup/hard-purge-test-data.ts` — Phase 5 only, child-first, guarded.
- Per-table snapshot exporter + a `restore-from-snapshot.ts`.
All service-role scripts require an explicit `--confirm` and print row counts before writing.

---

## 8. Open questions for the user (please confirm before I proceed)
1. **Approve soft-delete-first, hard-purge-later?** (Recommended.) Or is a hard delete required now?
2. **Is `DEMO`/`TEST` prefix the reliable marker,** or should I widen Tier-2 heuristics? Any known test account emails/phones to seed the list?
3. **Test users:** OK to *ban + soft-delete* (preserve audit history) rather than hard-delete auth accounts?
4. **Retention window** before hard purge — 30 days OK?
5. **Execution window** — any off-peak time preferred? (Soft-delete is light, but to be safe.)
6. **Who signs off** on the discovery ID list before Phase 3?

> On approval, I proceed to Phase 0–1 (staging rehearsal + read-only discovery) and bring back `discovery-report.json` for your sign-off. No production data is modified before that sign-off.
