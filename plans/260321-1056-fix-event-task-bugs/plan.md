# Plan: Fix Event Task Logic Bugs
Created: 2026-03-21T10:56
Status: 🟡 Chờ duyệt

## Overview
Audit phát hiện server action `getContractById` thiếu fields quan trọng
trong select query, gây ra 2 bugs trên EventTimeline + EventTaskModal.

## Audit Summary

| # | Bug | Mức độ | Root Cause | File |
|---|-----|--------|-----------|------|
| BUG-3 | Progress bar không hiện trên cards | 🟡 Medium | `work_tasks` select thiếu `event_id` | contracts.ts L230 |
| BUG-4 | Thêm nhân sự báo OK nhưng không lưu DB | 🔴 Critical | `contract_events` select thiếu `contract_id` | contracts.ts L224 |

## Root Cause Analysis

**File:** `app/actions/contracts.ts` — function `getContractById`

### BUG-3: work_tasks thiếu event_id
```
Hiện tại:  work_tasks (id, work_type, assigned_to, status, ...)
Thiếu:     event_id
Hậu quả:   tasks.filter(t => t.event_id === event.id) → luôn trả []
           → progress bar trên card không hiện
```

### BUG-4: contract_events thiếu contract_id  
```
Hiện tại:  contract_events (id, event_type, title, ...)
Thiếu:     contract_id
Hậu quả:   modalEvent.contract_id = undefined
           → addTask({ contractId: undefined }) 
           → DB insert fail (FK constraint)
           → Toast "thành công" nhưng data không lưu
```

## Phases

| Phase | Name | Status | File |
|-------|------|--------|------|
| 01 | Fix server action select query | ⬜ Pending | app/actions/contracts.ts |
| 02 | Build + Kill port + Restart | ⬜ Pending | — |
| 03 | Browser verify (thêm nhân sự + progress bar) | ⬜ Pending | — |

---

## Phase 01: Fix server action select query

### File: `app/actions/contracts.ts`

**Sửa 1 — contract_events thêm `contract_id` (BUG-4):**
```diff
 contract_events (
-  id, event_type, title, event_date, end_date,
+  id, contract_id, event_type, title, event_date, end_date,
   location, status, notes, sort_order, deadline,
   start_time, end_time, is_manual_date, phase
 ),
```

**Sửa 2 — work_tasks thêm `event_id` (BUG-3):**
```diff
 work_tasks (
-  id, work_type, assigned_to, status, deadline,
+  id, event_id, work_type, assigned_to, status, deadline,
   start_date, completion_date, cost, notes
 ),
```

### Không sửa file khác
- event-timeline.tsx: đã dùng `modalEvent.contract_id` (đúng)
- event-task-modal.tsx: logic addTask đúng, chỉ thiếu data đầu vào

---

## Phase 02: Build + Kill port + Restart
- [ ] `npx next build` → pass
- [ ] `npx kill-port 3000`
- [ ] `npm run dev`

## Phase 03: Browser Verify
- [ ] Mở event "Hậu kỳ Pre-wedding" → thêm nhân sự → data hiện ngay
- [ ] Đóng modal → card hiện progress bar (VD: 1/1)
- [ ] Mở lại modal → nhân sự vừa thêm vẫn còn
- [ ] Check "Chụp Pre-wedding Đà Lạt" → progress 2/2 vẫn đúng
