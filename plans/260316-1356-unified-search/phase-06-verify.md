# Phase 06: Verify & Test
Status: ⬜ Pending
Dependencies: Phase 01-05

## Objective
Build thành công + visual test desktop & mobile.

## Checklist

### Build
- [ ] `npm run build` — no errors
- [ ] Kill port + `npm run dev`

### Desktop Test
- [ ] /crm/customers: Header search → filter works
- [ ] /crm/customers: Thêm khách hàng → refresh OK
- [ ] /crm/leads: Header search → filter works
- [ ] /crm/leads: Thêm lead → refresh OK
- [ ] F5 refresh → search persists
- [ ] Navigate Customers ↔ Leads → search clears

### Mobile Test
- [ ] Tap 🔍 → overlay opens
- [ ] Type → filter works
- [ ] Close overlay → filter chip visible
- [ ] Chip ✕ → filter cleared
- [ ] No inline search bars anywhere

### Regression
- [ ] Stats still loading
- [ ] CRUD (add/edit/delete) still working
- [ ] Dark mode — bg-bg-card correct
- [ ] Header title shows "Hệ thống CRM" (no duplicate)

---
Done! → `/audit` to verify SSOT or `/next`
