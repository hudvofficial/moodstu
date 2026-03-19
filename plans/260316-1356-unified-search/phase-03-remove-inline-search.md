# Phase 03: Xóa Inline Search + Fix SSOT LeadList
Status: ⬜ Pending
Dependencies: Phase 02

## Objective
Xóa search bars khỏi CustomerList và LeadList.
Fix SSOT violations trong LeadList (same as CustomerList đã fix).

## Files to Modify
- `components/crm/customers/CustomerList.tsx`
- `components/crm/leads/LeadList.tsx`

## Implementation Steps

### CustomerList.tsx
1. [ ] Xóa search input block (đã thay bằng input-base ở SSOT fix trước)
2. [ ] Xóa props: `search`, `onSearchChange` khỏi interface
3. [ ] Giữ "Thêm khách hàng" button (đã SSOT compliant)

### LeadList.tsx  
1. [ ] Xóa search input block hoàn toàn
2. [ ] Xóa props: `search`, `onSearchChange` khỏi interface
3. [ ] Fix SSOT: search input hardcode → XÓA LUÔN (không cần fix vì xóa)
4. [ ] Fix SSOT: add button hardcode → `btn btn-primary` + wrapper div (Lesson #57)
5. [ ] Fix SSOT: `bg-white` → `bg-bg-card` (table container + mobile cards)

## SSOT Fixes (LeadList — same pattern as CustomerList)
- [ ] `bg-white` × 2 → `bg-bg-card`
- [ ] Add button hardcoded → `.btn .btn-primary`
- [ ] Wrapper div for button visibility (Lesson #57)

## Test Criteria
- [ ] Không còn search bar trong CustomerList/LeadList
- [ ] "Thêm" button vẫn hoạt động
- [ ] Table/cards hiển thị đúng
- [ ] Dark mode: bg-bg-card thay vì bg-white

---
Next Phase: phase-04-filter-chip.md
