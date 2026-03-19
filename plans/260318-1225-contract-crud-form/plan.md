# Plan: Contract CRUD Form (Create + Edit)
Created: 2026-03-18T12:25
Status: 🟡 In Progress

## Overview
Port V1 Contract Form logic (~5,000+ LOC) sang V2 architecture.
Tạo form tạo/sửa hợp đồng hoàn chỉnh — gồm customer, items, payment, tasks.

## Brainstorm Context
- V1 Audit: `v1_contract_crud_audit.md`
- Compatibility Analysis: `v1_v2_compatibility_analysis.md`
- Decisions: bride/groom ALTER, atomic RPC, cancel cascade

## Tech Stack
- Frontend: Next.js 15, React 19, SWR, Tailwind v4, Lucide-react
- Backend: Server Actions + Supabase (service_role bypass RLS)
- DB: PostgreSQL ENUM types (snake_case), Atomic RPC
- Design: design-system.css tokens, `components/ui/*` shared components
- Validation: Zod (contract.schema.ts)

## Quy tắc
- KHÔNG inline styles → dùng CSS tokens từ design-system.css
- KHÔNG hardcode colors → dùng CSS variables
- KHÔNG `any` types → full TypeScript
- Max 250 lines/file → split sớm
- Dùng shared components: Badge, UnifiedModal, CurrencyInput, DatePicker
- ENUM snake_case trong code → Vietnamese labels CHỈ ở display layer
- V1 = logic source, Stitch = style reference

## Phases

| Phase | Name | Status | Scope | Est. LOC |
|-------|------|--------|-------|----------|
| 00 | DB Migrations | ✅ Complete | ALTER tables + RPC | ~200 SQL |
| 01 | Types + Schemas | ✅ Complete | TS types + Zod validation | ~150 |
| 02 | Server Actions | ✅ Complete | CRUD mutations + queries | ~350 |
| 03 | Core Hooks | ✅ Complete | useContractForm + sub-hooks | ~500 |
| 04 | Form UI — Customer Section | ✅ Complete | Customer search + create | ~250 |
| 05 | Form UI — Items Section | ✅ Complete | Service/Product table + ItemModal | ~450 |
| 06 | Form UI — Payment + Financial | ✅ Complete | Payment form + auto-calc | ~200 |
| 07 | Form Shell + Integration | ✅ Complete | ContractForm index + routing | ~200 |
| 08 | Edit Mode + Delete | ✅ Complete | Pre-fill + update + delete | ~250 |
| 09 | Testing + Polish | ⬜ Pending | E2E test cases + edge cases | ~100 |

**Tổng:** ~2,650 LOC (V2 gọn hơn V1 nhờ shared components)

## Quick Commands
- Bắt đầu: `/code phase-00`
- Check progress: `/next`

## Dependencies
- Phase 00 → 01 → 02 (backend foundation)
- Phase 03 → 04,05,06 (hooks trước, UI sau)
- Phase 07 needs 04+05+06
- Phase 08 needs 07
- Phase 09 needs 08
