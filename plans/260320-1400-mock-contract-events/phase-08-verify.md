# Phase 08: Verify trên Browser
Status: ⬜ Pending
Dependencies: Phase 02-07

## Objective
Mở Contract Detail page trên browser, kiểm tra TẤT CẢ data mock hiển thị đúng.
Screenshot gửi sếp.

## Full Checklist

### Desktop View (2-column layout)
**Left Column (67%):**
- [ ] SummaryCard: HĐ-0003, Combo, 68M, ngày giao 01/07
- [ ] CustomerInfoBlock: Lê Thị Y Linh
- [ ] EventTimeline: 4 event cards
  - [ ] Ngày Chụp (📸) — Đà Lạt — dang_lam — progress 1/4
  - [ ] Ngày Tổ Chức (💒) — Diamond Palace — chua_lam — progress 0/2
  - [ ] Hậu Kỳ (✏️) — chua_lam — progress 0/2
  - [ ] Giao SP (📦) — chua_lam — progress 0/1
- [ ] ServiceDetailsBlock: 3 items (55M + 8M + 5M)
- [ ] CostumesBlock: 2 trang phục (vest + váy)

**Right Column (33%):**
- [ ] FinancialDashboard: 35M/63M paid, 3 payment milestones
- [ ] PrintOrdersBlock: (empty — OK)
- [ ] ChecklistBlock: 9 tasks grouped
- [ ] ContractChecklistManager: 10 items, 3 ticked

**Top:**
- [ ] WorkflowStepper: 4 steps, step 1 = active (dang_lam)

### Mobile View
- [ ] SummaryCard compact
- [ ] FinancialDashboard
- [ ] WorkflowStepper
- [ ] MobileTabNav
- [ ] EventTimeline
- [ ] ChecklistBlock
- [ ] NotesTimeline: 3 notes

### Drawer View (từ Contract List)
- [ ] DrawerEventTimeline: 4-step vertical stepper
- [ ] Status icons đúng

### Data Integrity
- [ ] Total events = 4
- [ ] Total tasks = 9
- [ ] Total checklists = 10
- [ ] Total payment_plans = 3
- [ ] Total reservations = 2
- [ ] Total notes = 3

## Screenshot Output
- [ ] Desktop full page → gửi sếp
- [ ] Mobile view → gửi sếp
- [ ] Drawer preview → gửi sếp

---
✅ DONE — All phases complete!
