# Phase 02: Add Event Modal
Status: ⬜ Pending
Dependencies: Phase 01 (addContractEvent + deleteContractEvent actions)

## Objective
Tạo modal UI cho admin thêm event mới vào lịch trình HĐ.

## Implementation Steps

### 1. Tạo `AddEventModal` component
- [ ] File: `components/contracts/detail/add-event-modal.tsx` (NEW)
- [ ] Props: `{ isOpen, contractId, onClose, onSaved }`
- [ ] Layout (UnifiedModal):
  ```
  ┌─────────────────────────────┐
  │  + Thêm sự kiện             │
  ├─────────────────────────────┤
  │  Tên sự kiện:    [_______]  │  ← text input, required
  │  Loại:      [▼ Dropdown___]  │  ← EventType enum (5 loại)
  │  Ngày:      [📅 DatePicker]  │  ← on-set → event_date, hậu kỳ → deadline
  │  Địa điểm:  [_______]       │  ← optional, text
  │  Ghi chú:   [_______]       │  ← optional, textarea
  ├─────────────────────────────┤
  │             [Hủy] [Thêm]   │
  └─────────────────────────────┘
  ```
- [ ] UI Components sử dụng:
  - `UnifiedModal` (size="md")
  - `.input-base`, `.label-base` (SSOT)
  - `SimpleSelect` cho event_type dropdown
  - `DatePicker` cho ngày
  - `.btn .btn-primary`, `.btn .btn-secondary`
- [ ] Logic:
  - Submit → gọi `addContractEvent()` từ phase 01
  - Success → toast.success + onSaved() + onClose()
  - Fail → toast.error
  - Loading state khi submit
- [ ] Validation:
  - `title` required (tên sự kiện)
  - `event_type` required
  - Ngày optional

### 2. Event type options
- [ ] Sử dụng `EVENT_TYPE_MAP` từ `contract-constants.ts` làm SSOT
- [ ] SimpleSelect options: 5 loại event
- [ ] Label hiển thị tiếng Việt (getEventTypeLabel)

## Files to Create/Modify
- `components/contracts/detail/add-event-modal.tsx` — NEW (~120 lines)

## Test Criteria
- [ ] Modal mở/đóng đúng
- [ ] Form validation: title required
- [ ] Submit gọi addContractEvent thành công
- [ ] Toast feedback (success/error)
- [ ] Loading state khi submit

## Guard Rails
- ⚠️ Dùng SSOT components (UnifiedModal, SimpleSelect, DatePicker)
- ⚠️ KHÔNG tạo custom inputs — dùng .input-base
- ⚠️ KHÔNG import trực tiếp supabase — chỉ qua server actions

---
Next Phase: phase-03-wire-ui.md
