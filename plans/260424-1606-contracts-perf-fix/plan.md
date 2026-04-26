# Plan: Contracts Performance Fix
Created: 2026-04-24T16:06
Status: ✅ Complete

Update 2026-04-26:
- Phase files marked complete to match implementation status.
- Verified with `npx tsc --noEmit` and `npm run build`.

## Overview
Tối ưu tốc độ module Contracts dựa trên kết quả audit.
3 phases đã hoàn thành: Low-risk → Medium → Refactor.

## Tech Stack
- Server Actions: contract-queries.ts, contract-mutations.ts
- Database: Supabase PostgreSQL RPCs
- Client: SWR hooks, Realtime subscriptions
- Components: ContractForm, ContractDetailClient, ContractsListClient

## Phases

| Phase | Name | Status | Issues Fixed | Est. Impact |
|-------|------|--------|-------------|-------------|
| 01 | Parallelize & Batch | ✅ Complete | C2, W3, W4 | 350-750ms/create |
| 02 | Slim List Query | ✅ Complete | C1 | 200-500ms/list load |
| 03 | Auth Dedup & Polish | ✅ Complete | C3, W2, S1 | 150-250ms/create |

## Files Modified
- `app/actions/contract-mutations.ts` — Phase 01 + 03
- `app/actions/contract-queries.ts` — Phase 02
- `app/actions/contract-event-actions.ts` — Phase 03
- `app/actions/checklist-actions.ts` — Phase 03
- `app/actions/work-task-actions.ts` — Phase 03
- `components/contracts/contracts-list-client.tsx` — Phase 02
- `components/contracts/form/hooks/useContractForm.ts` — Phase 03
- `lib/hooks/use-contracts.ts` — Phase 03

## Verification
- TypeScript: ✅ 0 errors
- Build: ✅ Pass
