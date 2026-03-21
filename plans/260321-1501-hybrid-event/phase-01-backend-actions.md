# Phase 01: Backend Actions
Status: ✅ Complete
Dependencies: None (contract_events table + fields already exist)

## Objective
Tạo server actions để thêm và xóa events tùy chỉnh trong hợp đồng.

## Quyết Định Kiến Trúc
- **KHÔNG migration** — dùng `is_manual_date` + `title` có sẵn trong contract_events
- Template event: `is_manual_date = false`, `title = NULL`
- Custom event: `is_manual_date = true`, `title = "Engagement Party"`
- `event_type` vẫn giữ cho phân nhóm logic (on-set vs hậu kỳ)

## Implementation Steps

### 1. `addContractEvent()` — Thêm event mới
- [x] File: `app/actions/contract-event-actions.ts`
- [x] Input: `{ contractId, eventType, title, eventDate?, deadline?, location?, notes? }`
- [ ] Logic:
  - Validate: contractId required, eventType thuộc EventType enum
  - Auto sort_order: query MAX(sort_order) + 1 cho contract đó
  - Set `is_manual_date = true` (vì admin tạo tay)
  - Set `title` = input title (admin đặt tên)
  - Set `status = "chua_lam"`
  - On-set event → dùng `event_date`, post-production → dùng `deadline`
  - `revalidatePath("/contracts")`
  - `fireAuditLog` action CREATE
- [x] Return: `{ id, event_type, title, sort_order }`

### 2. `deleteContractEvent()` — Xóa event custom
- [ ] File: `app/actions/contract-event-actions.ts`
- [x] Input: `{ eventId }`
- [ ] Logic:
  - Fetch event → check `is_manual_date === true`
  - Nếu `is_manual_date === false` → throw Error "Không thể xóa event template"
  - Xóa tất cả work_tasks liên quan (cascade)
  - Xóa event
  - `revalidatePath("/contracts")`
  - `fireAuditLog` action DELETE, severity WARNING
- [x] Return: null

## Files to Create/Modify
- `app/actions/contract-event-actions.ts` — THÊM 2 functions (~60 lines)

## Test Criteria
- [ ] addContractEvent tạo event với is_manual_date=true
- [ ] addContractEvent tự gán sort_order (max+1)
- [ ] deleteContractEvent CHỈ xóa event có is_manual_date=true
- [ ] deleteContractEvent xóa cascade work_tasks
- [ ] Events template KHÔNG bị xóa

## Guard Rails
- ⚠️ KHÔNG sửa `updateContractEvent()` — đã hoạt động
- ⚠️ KHÔNG đổi DB schema
- ⚠️ File giới hạn 250 lines — hiện 170 lines, thêm ~60 → ~230 (OK)

---
Next Phase: phase-02-add-event-modal.md
