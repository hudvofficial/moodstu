# 📋 Plan: Xóa Checklist + Chuẩn bị khỏi Contract Detail

**Ngày:** 2026-03-21
**Scope:** Chỉ trang Detail — KHÔNG đụng Drawer, Tooltip, List

---

## Phạm vi

- **File duy nhất:** `components/contracts/detail/contract-detail-client.tsx`
- **Hành động:** Xóa 2 component khỏi layout (desktop + mobile)

## Tasks

### Phase 1: Xóa khỏi Detail

- [ ] 1.1 Xóa import `ChecklistBlock` (dòng 28)
- [ ] 1.2 Xóa import `ContractChecklistManager` (dòng 29)
- [ ] 1.3 Xóa `<ChecklistBlock>` desktop sidebar (dòng 284)
- [ ] 1.4 Xóa `<ContractChecklistManager>` desktop sidebar (dòng 287-289)
- [ ] 1.5 Xóa `<ChecklistBlock>` mobile + div wrapper (dòng 352-355)
- [ ] 1.6 Xóa `<ContractChecklistManager>` mobile (dòng 357-360)

### Phase 2: Verify

- [ ] 2.1 Build thành công (không lỗi)
- [ ] 2.2 Mở browser → Desktop detail → confirm 2 section đã mất
- [ ] 2.3 Mở browser → Mobile detail → confirm 2 section đã mất
- [ ] 2.4 Event Timeline vẫn hoạt động bình thường
- [ ] 2.5 Workflow Stepper vẫn hoạt động bình thường

## KHÔNG ĐỤNG

- ❌ `checklist-block.tsx` (file vẫn giữ, chưa xóa)
- ❌ `checklist-manager.tsx` (file vẫn giữ, chưa xóa)
- ❌ Drawer (contract-drawer.tsx)
- ❌ ProgressBadge (tooltip)
- ❌ checklist-actions.ts
- ❌ Database / data queries
