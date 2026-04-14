# Plan: Finance Logic Hardening
Created: 2026-04-14T06:40:00+07:00
Status: 🟡 In Progress

## Overview
Fix 9 lỗi nghiệp vụ core trong Finance module: schema drift, pipeline bypass, non-atomic writes, missing soft-delete filters, status mismatch, search injection, và seed bypass. Mục tiêu: deploy-ready DB + bulletproof server actions.

## Tech Stack
- Database: PostgreSQL (Supabase) — migrations, RPCs
- Backend: Next.js Server Actions (withAdmin/withAuth)
- Validation: Zod schemas
- Types: Generated from Supabase CLI

## Phases

| Phase | Name | Status | Files | Effort |
|-------|------|--------|-------|--------|
| 01 | Schema Migration | ✅ Complete | 3 SQL files mới | Low |
| 02 | Contract Receipt → Payment Pipeline | ✅ Reviewed | receipt-actions.ts | High |
| 03 | Soft-Delete Filters (RPC + TS) | ✅ Reviewed | 1 SQL + finance-dashboard-queries.ts | Low |
| 04 | Expense Field Fix | ✅ Reviewed | finance-dashboard-queries.ts | Low |
| 05 | Receipt Stats Status | ✅ Complete | finance-operations-queries.ts | Low |
| 06 | Search Sanitize | ✅ Reviewed | finance-operations-queries.ts | Low |
| 07 | Demo Seed Pipeline | ✅ Reviewed | seed-finance-demo.ts | Medium |
| 08 | Lint & Verify | ⬜ Pending | All changed files | Low |
| 09a | Receipts UI SSOT Compliance | ✅ Complete | 7 component files + lib/swr.ts | Medium |
| 09b | Receipt Row Actions + QR + Print | ✅ Reviewed | 4 new + 6 modified files | High |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`

## Finding → Phase Mapping

| Finding # | Mô tả | Phase |
|-----------|--------|-------|
| 1 | Schema/migration không khớp types | 01 |
| 2 | Thu HĐ phải đi qua payments pipeline | 02 |
| 3 | Sale receipt phải atomic | 01 (RPC) + 02 (action) |
| 4 | RPC dashboard/ledger phải filter soft delete | 03 |
| 5 | Demo seed phải đi qua pipeline thật | 07 |
| 6 | Search sanitize | 06 |
| 7 | Receipt stats status mismatch | 05 |
| 8 | Profit drawer expenses field | 04 |
| 9 | UI/lint SSOT | 08 (đã fix phần lớn) |
