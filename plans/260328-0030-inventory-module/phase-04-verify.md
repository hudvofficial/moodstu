# Phase 04: Verify (Testing)

Status: ⬜ Pending
Dependencies: Phase 03 (UI) ⬜

## Objective

Full verification: build, browser test, CRUD + Stock In/Out flow.

## Test Plan

### Automated
- [ ] `npm run build` → 0 errors
- [ ] `grep -r "inventory" app/actions/` → all imports valid
- [ ] Types match DB schema

### Browser Testing (Manual)
- [ ] Navigate to `/inventory` → page loads
- [ ] Stats bar shows correct numbers
- [ ] Filter by category → results update
- [ ] Filter by status → results update
- [ ] Search by name/code → results update
- [ ] Create item → appears in list with auto VT-XXX code
- [ ] Edit item → changes saved (opt lock works)
- [ ] Delete item → soft deleted, disappears from list
- [ ] Stock In → quantity increases, avg price recalculated
- [ ] Stock Out → quantity decreases, warning if low stock
- [ ] Stock Out (insufficient) → error message shown
- [ ] Transaction history → shows all IN/OUT records
- [ ] Mobile responsive → cards layout on small screen
- [ ] Desktop responsive → table layout on large screen

### Edge Cases
- [ ] Create with duplicate code → retry works
- [ ] Stock Out more than available → rejected
- [ ] Edit with stale data → opt lock rejects

---
Previous Phase: [phase-03-ui.md](./phase-03-ui.md)
