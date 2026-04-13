# Plan: Finance Module V2
Created: 2026-04-11T11:07:00
Updated: 2026-04-11T15:30:00
Status: 🟡 Plan Audit (Round 3 — SSOT, Performance, Schema Blockers)

## Overview
Module Finance V2 trên spec `docs/specs/finance.md`. Giữ nguyên tất cả bảng DB hiện có — KHÔNG tạo `finance_ledger_entries`. Bổ sung 2 bảng mới cho Close Management. Harden toàn bộ actions.

## Source of Truth Decision
| Luồng tiền | Bảng SoT | Ghi chú |
|---|---|---|
| Thu từ hợp đồng | `payments` | FK `contract_id`, `customer_id`. `payment_plans.receipt_id` → FK `payments`. |
| Thu khác (bán vật tư, thu misc) | `receipts` | FK `contract_id` (optional). |
| Chi | `expenses` | Cột `amount` (KHÔNG phải `expense_amount`). **KHÔNG CÓ cột `status`** — approve dùng `approved_by IS NOT NULL`. |

## Canonical Status Decisions (Phase 00 Output)
| Bảng | Field | Giá trị canonical | Ghi chú |
|---|---|---|---|
| `payment_plans` | `status` | `"paid"` (English) | Code thực (`payment-actions.ts:100`). KHÔNG dùng `"da_thu"`. |
| `expenses` | approval | **KHÔNG dùng `status`** — cột không tồn tại | Derive: `approved_by IS NOT NULL` → "Đã duyệt". `NULL` → "Chờ duyệt". |
| `finance_monthly_closes` | `status` | `draft`, `in_progress`, `pending_review`, `locked` | — |
| `finance_close_tasks` | `status` | `chua_bat_dau`, `dang_thuc_hien`, `cho_duyet`, `hoan_thanh`, `co_van_de` | — |

## Tech Stack (Verified Against package.json)
- **Frontend**: Next.js 16.1.6 (App Router), SWR `2.4.1`, TailwindCSS v4, Zod `4.3.6`.
- **Backend / Actions**: Next.js Server Actions (`withAuth` / `withAdmin`), Supabase RPC.
- **Database**: PostgreSQL (Supabase).
- **Design System**: `app/design-system.css` (16 layers) → `app/globals.css @theme` tokens.
- **Shared Components**: `<KPICard>`, `<UnifiedModal>`, `<CurrencyInput>`, `<Skeleton>`, `<SkeletonCard>`, `<SkeletonTable>`, `<TableWrapper>`, `<THead>`, `<TBody>`, `<TH>`, `<TD>`, `<TR>`, `<Pagination>`.
- **Validation Pattern**: `lib/validations/*.schema.ts` (10 files hiện có, thêm `finance.schema.ts`).
- **KHÔNG CÓ trong package.json**: `react-hook-form`, `@tanstack/react-virtual` → dùng controlled form + pagination.
- **Route group**: `app/(protected)/finance/` (chưa tạo, sẽ tạo Phase 03a).

## SSOT Token Map
📌 **[`ssot-token-map.md`](./ssot-token-map.md)** — Token/class/component binding reference.

## Known Bugs (Tồn tại trước khi bắt đầu)

| # | Bug | File | Severity |
|---|-----|------|----------|
| B1 | `debt-actions.ts` dùng `debt_name` nhưng DB = `entity_name` | `debt-actions.ts` | 🔴 CRITICAL |
| B2 | `getBudgetsWithActuals` query `expense_amount` (không tồn tại) + `category_name` (expenses không có) | `goal-budget-actions.ts:172` | 🔴 CRITICAL |
| B3 | `createPaymentReceipt` KHÔNG ghi audit log | `payment-actions.ts` | 🟠 HIGH |
| B4 | `fireAuditLog` (fire-forget) cho mutation tài chính | `receipt-`, `debt-`, `salary-`, `goal-budget-actions.ts` | 🟠 HIGH |
| B5 | `recalculateEmployeeSalary` error bị nuốt | `salary-actions.ts:58` | 🟡 MEDIUM |
| B6 | Không có Zod cho bất kỳ finance action nào | All finance actions | 🟡 MEDIUM |
| B7 | `withAuth` (mọi user) cho financial mutations | All finance actions | 🟡 MEDIUM |
| **B8** | `approveExpense` set `status: "approved"` nhưng DB `expenses` KHÔNG CÓ cột `status` | `expense-actions.ts:29` | 🔴 CRITICAL |
| **B9** | `getBudgetsWithActuals` query cột `category_name` từ `expenses` nhưng expenses chỉ có `category_id` | `goal-budget-actions.ts:172` | 🔴 CRITICAL |

## Phases

| Phase | Name | Status | Verification Gate |
|-------|------|--------|-------------------|
| 00 | Inventory & Compatibility Audit | ✅ Done | Schema match, canonical decisions, SSOT + performance decisions |
| 01 | Database Schema & RPC | ✅ Done | `list_tables`, RPC test, index→query map, typegen, `npm run build` + blocker fixes (p_actor_id, RLS admin-only) |
| 02 | Server Actions Hardening | ✅ Done | Zod reject, permission, audit, performance contracts, `npm run build` |
| 03a | UI: Dashboard (6 sections) + Ledger | Done | V1 parity (KPIs, Revenue chart, Donut, Upcoming, Pending, Profit table) + Ledger + SSOT 100% + `npm run build` |
| 03b | UI: Create/Approve Thu Chi | Done | Receipts, expenses, categories, approve flow, SSOT scoped lint, `npm run build` |
| 03c | UI: Debts + Ghost + FixedCosts + Investments | Done | Debts, lab debts, ghost scan, fixed costs, investments, SSOT scoped lint, `npm run build` |
| 03d | UI: Payroll | Done | Salary list, detail, adjustments, SSOT scoped lint, `npm run build` |
| 03e | UI: Goals/Budget/Close | Done | Goals, budgets, closes, close detail, SSOT scoped lint, `npm run build` |
| 04 | Final Verification & Audit | Blocked: repo-wide lint legacy issues | Finance scoped verification passed; full `npm run lint` still fails on pre-existing non-finance SSOT violations. See `walkthrough.md`. |
