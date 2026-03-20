# Plan: Contract Drawer Full Port (07D.2 → 07D.7)

Created: 2026-03-19T23:40
Status: 🟡 Planning

## Data Availability Audit

| Data | V2 Query | Status |
|------|----------|--------|
| `contract_events` | ✅ `getContractById` joins | Available |
| `work_tasks` + `employees` | ✅ `getContractById` joins | Available |
| `customers.address` | ✅ `getContractById` joins | Available |
| `contract_items` | ✅ `getContractById` joins | Available |
| `contract_notes` | ✅ `note-actions.ts` (add/delete) | Available |
| `contract_checklists` | ❌ NOT in `getContractById` | **Needs adding** |
| `toggleChecklist` action | ❌ NOT in V2 | **Needs creating** |
| `payments` + `payment_plans` | ✅ `getContractById` parallel | Available |

---

## Phases Overview

| Phase | Name | New Files | Modified Files | Estimate |
|-------|------|-----------|----------------|----------|
| 07D.2 | Data Fields Enhancement | 0 | 1 | 20 min |
| 07D.3 | Event Timeline | 1 | 1 | 1 hr |
| 07D.4 | Checklist Compact | 2 | 2 | 2 hr |
| 07D.5 | Work Assignments | 1 | 1 | 45 min |
| 07D.6 | Notes Quick View | 1 | 1 | 1 hr |
| 07D.7 | Polish & Realtime | 0 | 2 | 45 min |

---

## Phase 07D.2 — Data Fields Enhancement

> Thêm thông tin đã có sẵn trong `useContractDetail()` vào drawer

### MODIFY: contract-drawer.tsx

**Section Khách hàng — thêm:**
- Địa chỉ (`customers.address`) — icon MapPin
- Ngày làm (`work_date`) — icon Calendar
- Ngày trả đồ (`dress_return_date`) — icon CalendarCheck

**Header — thêm:**  
- Nút In HĐ → `<a href="/contracts/{id}/print" target="_blank">`

**Section Tài chính — thêm:**
- Loại thanh toán (từ payments data)

**Dependencies:** None — data đã có

---

## Phase 07D.3 — Event Timeline

> Hiện 4-stage event lifecycle trong drawer

### NEW: drawer-event-timeline.tsx (~120 LOC)

Component hiển thị:
- Vertical stepper: 4 stages (NGÀY CHỤP → TỔ CHỨC → HẬU KỲ → GIAO SP)
- Mỗi stage: ngày, location, badge trạng thái (✅/⏳/⬜)
- Empty state: "Chưa có lịch sự kiện"

**Data:** `contract_events[]` từ `useContractDetail()` response

### MODIFY: contract-drawer.tsx

- Import + render `<DrawerEventTimeline events={contract.contract_events} />`
- Đặt sau section Tài chính, trước Payment Timeline

---

## Phase 07D.4 — Checklist Compact

> Port V1 ChecklistManager (540 LOC) → compact 200 LOC cho drawer

### MODIFY: contracts.ts (server action)

- Thêm `contract_checklists(id, event_stage, category, item_name, is_completed)` vào `getContractById` select query

### NEW: checklist-actions.ts (~30 LOC)

Server Actions:
- `toggleChecklist(id, isCompleted)` — update + revalidate
- `refreshContractsData()` — revalidatePath

### NEW: drawer-checklist.tsx (~200 LOC)

Features:
- Tab pills chọn Stage (nếu multi-stage)
- Tab pills chọn Category (Lễ tân / Makeup / Photo)
- Checkbox items — **optimistic toggle** + rollback
- Progress: `done/total` badge per stage
- Collapsible section

**Key V1 patterns to port:**
- `lastInteractionRef` (anti-stale 2s guard)
- `window.dispatchEvent(CustomEvent)` (sync badge trên table)
- `CATEGORY_STYLES` map (màu theo category)

### MODIFY: contract-drawer.tsx

- Import + render `<DrawerChecklist checklists={contract.contract_checklists} />`

---

## Phase 07D.5 — Work Assignments Summary

> Hiện nhân sự phân công (ai làm gì khi nào)

### NEW: drawer-assignments.tsx (~80 LOC)

Features:
- Group by event_type (Ngày Chụp → Hậu Kỳ...)
- Mỗi item: avatar + tên NV + badge work_type + deadline
- Compact: max 5 items, "Xem tất cả" link
- Empty state: "Chưa phân công"

**Data:** `work_tasks[]` từ `useContractDetail()` — đã join `employees`

### MODIFY: contract-drawer.tsx

- Import + render `<DrawerAssignments tasks={contract.work_tasks} />`

---

## Phase 07D.6 — Notes Quick View

> Read-only ghi chú gần nhất + input thêm note

### NEW: drawer-notes.tsx (~120 LOC)

Features:
- Show 3 notes gần nhất (collapsible)
- Mỗi note: tên NV + thời gian + nội dung
- Input gõ nhanh + Enter gửi (optimistic add)
- Dùng existing `addContractNote()`, `deleteContractNote()` từ `note-actions.ts`

### MODIFY: contract-drawer.tsx

- Import + render `<DrawerNotes contractId={id} />`

---

## Phase 07D.7 — Polish & Realtime (Tùy chọn)

> Auto-refresh khi người khác sửa

### MODIFY: contract-drawer.tsx

- SWR `refreshInterval: 30000` (polling mỗi 30s khi drawer mở)

### MODIFY: contracts-list-client.tsx

- Listen `CustomEvent("contract-checklist-updated")` → update badge count

---

## Verification Plan

### Per-phase
- Build pass (no TS errors)
- Browser test desktop + mobile
- Screenshot so sánh V1 vs V2

### Final
- Click row → drawer hiện đầy đủ: KH + Finance + Events + Checklist + Assignments + Notes
- Toggle checklist → instant UI update + server persist
- Add note → optimistic insert + server persist
- Mobile bottom sheet → tất cả sections scroll OK
