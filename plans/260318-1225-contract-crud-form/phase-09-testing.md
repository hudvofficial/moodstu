# Phase 09: Testing + Polish
Status: ⬜ Pending
Dependencies: Phase 08 (all CRUD complete)

## Objective
E2E testing scenarios, edge case handling, polish.

## Test Scenarios

### 9.1. CREATE Flow
- [ ] Create contract with minimum fields (customer + 1 item)
- [ ] Create contract with all fields filled
- [ ] Create with payment (deposit)
- [ ] Create with batch items (multiple at once)
- [ ] Create with new customer (via modal)
- [ ] Create with existing customer (search + select)
- [ ] Validate: empty customer → error
- [ ] Validate: 0 items → error
- [ ] Validate: negative amounts → error
- [ ] After create: contract appears in list

### 9.2. EDIT Flow
- [ ] Open edit → all fields pre-filled correctly
- [ ] Change customer → updates
- [ ] Add item → totals recalc
- [ ] Remove item → totals recalc
- [ ] Change discount → remaining updates
- [ ] Payment section hidden
- [ ] Optimistic lock: open in 2 tabs, edit in tab 1, try edit in tab 2 → error

### 9.3. CANCEL Flow
- [ ] Cancel from detail page → confirm dialog
- [ ] Reason required → cannot submit without
- [ ] After cancel: status badge changes, cancel banner shows
- [ ] Cascade: related tasks → da_huy
- [ ] Reactivate: status back to cho_xu_ly

### 9.4. DELETE Flow
- [ ] Delete blocked when has payments
- [ ] Delete requires code confirmation
- [ ] After delete: redirect to list, contract gone

### 9.5. Edge Cases
- [ ] Network error during submit → error toast, form not cleared
- [ ] Double-click submit → disabled after first click
- [ ] Very long customer name → truncate in display
- [ ] 100+ items → performance OK
- [ ] Mobile: all modals work as bottom drawers
- [ ] Couple fields: show/hide when changing service_type mid-form

### 9.6. Polish
- [ ] Loading states: skeleton for edit mode data fetch
- [ ] Success toasts: "Hợp đồng đã tạo thành công!"
- [ ] Error toasts: user-friendly messages
- [ ] Animations: entrance animations for form sections (`.entrance-*`)
- [ ] Accessibility: tab order, focus management

## Files to Verify
- All components respect design-system.css tokens
- No inline styles remaining
- No hardcoded colors
- No `any` types
- All files ≤ 250 lines

## Post-Completion
- [ ] Update plan.md: all phases ✅
- [ ] Update lessons.md if new patterns discovered
- [ ] Check build: `npm run build` passes

---
✅ FEATURE COMPLETE
