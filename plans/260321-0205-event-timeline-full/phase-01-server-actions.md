# Phase 01: Server Actions — Event CRUD
Status: ⬜ Pending
Dependencies: None

## Objective
Tạo `app/actions/contract-event-actions.ts` với 3 server actions port từ V1,
tối ưu bằng V2 patterns (withAuth, proper typing, revalidatePath).

## V1 Source → V2 Target

| V1 Function | V1 File | V2 Tối ưu |
|---|---|---|
| `updateContractEvent` | `contract-events/crud.ts:238` | `withAuth` thay `withAdmin`, proper Pick types |
| `checkAndCompleteEvent` | `contract-events/crud.ts` | Giữ nguyên logic, dùng `withAuth` |
| `recalculateDownstreamDates` | `contract-events/crud.ts:287` | Private helper, giữ nguyên cascade logic |

## Implementation Steps

1. [ ] Tạo file `app/actions/contract-event-actions.ts`
2. [ ] Implement `updateContractEvent(eventId, updates)`
   - V1 logic: update `contract_events` row
   - V2: `withAuth`, proper typing, `revalidatePath`
   - Auto trigger: nếu `event_type === "NGÀY TỔ CHỨC"` + `event_date` changed → `recalculateDownstreamDates`
3. [ ] Implement `checkAndCompleteEvent(eventId)`
   - V1 logic: count tasks, nếu tất cả "hoan_thanh" → event status = "hoan_thanh"
   - Nếu có task chưa xong nhưng event đã complete → revert "dang_lam"
   - V2 status keys: `cho`, `dang_lam`, `hoan_thanh` (khác V1: `PENDING`, `IN_PROGRESS`, `COMPLETED`)
4. [ ] Implement `recalculateDownstreamDates(supabase, contractId, sortOrder, newDate)`
   - V1 logic nguyên bản: cascade downstream hậu kỳ deadlines
   - Skip `is_manual_date = true`
   - Stop khi gặp on-set event tiếp theo

## Files
- `app/actions/contract-event-actions.ts` (NEW)

## V2 Status Mapping (V1 → V2)
| V1 | V2 |
|----|----|
| `PENDING` | `cho` |
| `IN_PROGRESS` | `dang_lam` |
| `COMPLETED` | `hoan_thanh` |
| `CANCELLED` | `da_huy` |

## Test Criteria
- [ ] Build pass
- [ ] `updateContractEvent` updates event_date + triggers downstream recalc
- [ ] `checkAndCompleteEvent` auto-completes event when all tasks done

---
Next Phase: phase-02-modal-header.md
