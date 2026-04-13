# Plan: Finance Module Audit Fix
Created: 2026-04-12T21:37
Status: 🟡 In Progress
Audit Source: `docs/reports/audit_2026-04-12_finance.md`

## Overview
Sửa tất cả lỗi tìm được trong audit toàn bộ module `/finance`.
Ưu tiên: Critical → Warning → Suggestion.

## Phases

| Phase | Name | Status | Items | Priority |
|-------|------|--------|-------|----------|
| 01 | Database Migrations (RPCs + Soft Delete) | ✅ Complete | C1, C2, C3 | 🔴 Critical |
| 02 | Server Action Hardening | ✅ Complete | C3, W1, W2, W7 | 🔴🟡 |
| 03 | Period Lock + Auth Consistency | ✅ Complete | W3, W4 | 🟡 Warning |
| 04 | Performance Optimization | ✅ Complete | W5, W6 | 🟡 Warning |
| 05 | Polish & Suggestions | ⬜ Pending | S2, S3, S4, S5 | 🟢 Suggestion |

## Audit → Phase Mapping

| Issue | Description | Phase |
|-------|-------------|-------|
| **C1** | Race condition `createPaymentReceipt` | 01 (RPC) + 02 (action) |
| **C2** | Non-atomic `undoContribution` | 01 (RPC) + 02 (action) |
| **C3** | Hard delete inconsistency | 01 (migration) + 02 (action) |
| **W1** | Missing Zod `fixed-cost-actions` | 02 |
| **W2** | Missing Zod `payment-actions` | 02 |
| **W3** | Missing period lock (6 modules) | 03 |
| **W4** | `eslint-disable` untyped supabase | 03 |
| **W5** | N+1 `fetchLabDebts` | 04 |
| **W6** | Sequential queries `getBudgetsWithActuals` | 04 |
| **W7** | `createDebt` raw input bypass | 02 |
| **S1** | AI stub (SKIP — roadmap) | — |
| **S2** | Error messages tiếng Việt không dấu | 05 |
| **S3** | Missing optimistic lock (3 functions) | 05 |
| **S4** | `fetchDebts` no pagination | 05 |
| **S5** | `fetchGoals`/`fetchFixedCosts` no pagination | 05 |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
