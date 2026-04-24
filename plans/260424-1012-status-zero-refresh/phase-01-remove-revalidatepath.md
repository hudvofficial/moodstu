# Phase 01: Remove Redundant revalidatePath
Status: ✅ Complete
Dependencies: None

## Objective
Xóa `revalidatePath()` trong các server action **chỉ update status** (1-2 field). Client đã có Optimistic UI + SWR + Realtime để cập nhật UI mà không cần RSC full re-render.

> **Nguyên tắc:** `revalidatePath` chỉ nên dùng cho mutations thay đổi nhiều data hoặc tạo/xóa record. Status update là lightweight operation — không cần invalidate toàn bộ RSC cache.

## Files to Modify

### 1. `app/actions/work-task-actions.ts`
- **Hàm `toggleTaskStatus` (line 187-203):**
  - Xóa `revalidatePath("/contracts")` (line 200)
  - Giữ nguyên: DB update, `checkAndCompleteEvent`, `fireAuditLog`

### 2. `app/actions/printing-actions.ts`  
- **Hàm `updateReservationStatus` (line 29-84):**
  - Xóa `revalidatePath(\`/contracts/${contractId}\`)` (line 81)
  - Giữ nguyên: DB update, dress status refresh

### 3. `app/actions/printing-mutations.ts`
- **Hàm `updatePrintingOrderStatus` (line 225-293):**
  - Xóa `revalidatePath("/printing")` (line 289)
  - Xóa `revalidatePath(\`/contracts/${contractId}\`)` (line 290)
  - Giữ nguyên: DB update, transition validation, `fireAuditLog`

### 4. `app/actions/dress-mutations.ts`
- **Hàm `updateReservationStatus` (line 356-395):**
  - Xóa `revalidatePath("/dresses")` (line 388)
  - Xóa `revalidatePath(\`/contracts/${contractId || reservation.contract_id}\`)` (line 389-391)
  - Giữ nguyên: DB update, `refreshDressStatus`, audit

## Implementation Steps
1. [x] Xác định tất cả server actions có revalidatePath cho status updates
2. [x] Xóa revalidatePath trong `toggleTaskStatus`
3. [x] Xóa revalidatePath trong `updateReservationStatus` (printing-actions.ts)
4. [x] Xóa revalidatePath trong `updatePrintingOrderStatus` (printing-mutations.ts)
5. [x] Xóa revalidatePath trong `updateReservationStatus` (dress-mutations.ts)

## ⚠️ KHÔNG ĐƯỢC SỬA:
- Các hàm CREATE/DELETE (addTask, deleteTask, createPrintingOrder...) → GIỮ NGUYÊN revalidatePath
- DB update logic → GIỮ NGUYÊN
- fireAuditLog → GIỮ NGUYÊN
- checkAndCompleteEvent → GIỮ NGUYÊN

## Test Criteria
- [ ] Click select status trên task → UI KHÔNG nhấp nháy
- [ ] Status vẫn update đúng trong DB (check Supabase)
- [ ] Realtime vẫn hoạt động (mở 2 tab, đổi status tab 1, tab 2 auto-update)

---
Next Phase: phase-02-optimistic-ui.md
