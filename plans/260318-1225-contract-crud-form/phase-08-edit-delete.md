# Phase 08: Edit Mode + Delete + Cancel UX
Status: ✅ Complete
Dependencies: Phase 07 (Form shell working) ✅

## Objective
Edit mode pre-fill, delete with protection, cancel with cascade, reactivate.
These are the "safety guard" features from V1.

## Tasks

### 8.1. Edit Mode Pre-fill
- [ ] `getContractForEdit(id)` fetches full contract data
- [ ] Pre-fill all form fields from contract data
- [ ] Pre-fill items array from contract_items
- [ ] Pre-fill customer from customer_id (auto-select)
- [ ] Show paid_amount (read-only) from existing payments sum
- [ ] Hide payment section
- [ ] Show "Sửa hợp đồng" title instead of "Tạo hợp đồng"

### 8.2. Optimistic Lock on Update
- [ ] Pass `expectedUpdatedAt` (from initial fetch) to submitContract
- [ ] Server checks: `updated_at === expectedUpdatedAt`  
- [ ] If mismatch: return error "Hợp đồng đã được người khác cập nhật. Vui lòng tải lại."
- [ ] UI: show error toast, do NOT overwrite

### 8.3. Cancel Contract UX
- [ ] Cancel button on Contract Detail page (not form)
- [ ] Confirm dialog: "Bạn có chắc muốn hủy hợp đồng?"
- [ ] Required: cancel_reason textarea
- [ ] Submit → `cancelContract()` server action (cascade)
- [ ] After cancel: show cancel banner on detail page
- [ ] Reactivate button: "Kích hoạt lại" → `reactivateContract()`

### 8.4. Delete Contract UX
- [ ] Delete button: show ONLY if `hasReceipts === false`
- [ ] If hasReceipts: button disabled, tooltip "Không thể xóa — đã có phiếu thu"
- [ ] Confirm dialog with contract code typing:
  - "Gõ lại mã HĐ [HĐ-2026-XXXX] để xác nhận xóa"
  - Input must match exactly
  - Submit enabled only when match
- [ ] Submit → `deleteContract()` server action (soft delete)
- [ ] After delete: redirect to `/contracts`

### 8.5. Cancel Banner Component
- [ ] `CancelBanner.tsx` — shows on cancelled contracts
- [ ] Display: cancel_reason, cancelled_at, cancelled_by
- [ ] "Kích hoạt lại" button
- [ ] Existing component `cancel-banner.tsx` may need update

## Constraints
- Delete MUST check hasReceipts (lesson #8)
- Cancel MUST cascade (decisions from brainstorm)
- Optimistic lock prevents data loss
- Confirm dialogs use <UnifiedModal>

## Files to Create/Modify
- Components: may update existing `cancel-banner.tsx`
- Create confirm dialog for delete (reuse UnifiedModal pattern)
- Update `top-action-bar.tsx` for cancel/delete buttons
- Update server actions (already done in Phase 02)

## Test Criteria
- [ ] Edit mode pre-fills all fields correctly
- [ ] Optimistic lock rejects stale updates
- [ ] Cancel requires reason + cascades tasks
- [ ] Delete blocked when hasReceipts
- [ ] Delete requires code confirmation
- [ ] Reactivate clears cancel fields

---
Next Phase: → phase-09-testing.md
