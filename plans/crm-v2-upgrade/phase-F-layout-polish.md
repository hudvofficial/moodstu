# Phase F: Layout & Polish
**Status:** ⬜ Pending
**Dependencies:** Phase B-E ✅
**Est.:** 30 min

---

## Objective
Port SmartCRMFab, CRMLayoutHeader, CRMSkeletons. Final dark mode + Stitch sweep.

## V1 Source Files
- `components/crm/SmartCRMFab.tsx` (52 lines)
- `components/crm/CRMLayoutHeader.tsx` (66 lines)
- `components/crm/CRMSkeletons.tsx`

## V2 Target Files
- `components/crm/CrmFab.tsx` — upgrade to SmartCRMFab
- `app/(protected)/crm/layout.tsx` — integrate header
- `components/crm/CrmSkeletons.tsx` — **CREATE**

---

## Implementation Steps

### F1. Port SmartCRMFab
- [ ] Upgrade V2 `CrmFab.tsx` with V1 `SmartCRMFab.tsx` logic
- [ ] Auto-detect: `pathname === "/crm/customers"` → Customer modal, else → Lead modal
- [ ] Hide on detail pages: `pathname.includes("/crm/leads/")`
- [ ] Use V2 FABButton component (nếu có) hoặc port inline
- [ ] Wire LeadFormModal (from Phase E) + CustomerFormModal

### F2. Port CRMLayoutHeader
- [ ] Route-aware search: different placeholder per tab
  - Customers: "Tìm tên, SĐT khách hàng..."
  - Leads: "Tìm tên khách, số điện thoại..."
- [ ] Route-aware create button:
  - Customers: link to `?create=true`
  - Leads: link to `/crm/leads/create`
- [ ] Integrate with V2 Header component
- [ ] Verify CrmTabs still renders correctly below header

### F3. Port CRMSkeletons
- [ ] Tạo `components/crm/CrmSkeletons.tsx`
- [ ] Skeletons for: stats strip, table rows, kanban columns
- [ ] Use V2 animation: `animate-pulse bg-bg-card`
- [ ] Wire into `loading.tsx` files

### F4. Dark mode sweep
- [ ] Open app in dark mode
- [ ] Check EVERY ported component:
  - [ ] Stats cards: no `bg-white`
  - [ ] Kanban cards: `bg-elevated` not hardcoded
  - [ ] Table headers: `bg-surface` works in dark
  - [ ] CareLog: `ring-white` → `ring-bg-card` or `ring-elevated`
  - [ ] SourceChart: hardcoded `#f3f4f6` → use CSS variable
  - [ ] Funnel bars: colors visible in dark

### F5. Stitch visual sweep
- [ ] Spacing: consistent 4-8-12-16-24-32 system
- [ ] Border radius: `rounded-soft-lg` / `rounded-xl` consistent
- [ ] Shadows: `shadow-soft` consistent
- [ ] Typography: text sizes use design system classes where possible
- [ ] Icon sizing: Lucide icons at 16-20px consistent

### F6. Final build + test
- [ ] `npm run build` — zero errors
- [ ] Quick smoke test in browser:
  - CRM Customers page loads
  - CRM Leads page loads
  - Kanban drag works
  - View toggle works
  - Analytics tab works
  - Mobile responsive works

---

## Files to Create/Modify
| File | Action |
|------|--------|
| `components/crm/CrmFab.tsx` | **MODIFY** — SmartCRMFab |
| `app/(protected)/crm/layout.tsx` | **MODIFY** — integrate header |
| `components/crm/CrmSkeletons.tsx` | **CREATE** |
| Various | **MODIFY** — dark mode + Stitch fixes |

## Test Criteria
- [ ] FAB shows correct label per tab (KH vs Lead)
- [ ] FAB hidden on detail pages
- [ ] Header search works with debounce
- [ ] Skeletons visible during loading
- [ ] Dark mode: zero hardcoded white backgrounds
- [ ] All components use V2 design tokens
- [ ] Build pass: `npm run build`
- [ ] Browser smoke test pass

---

## 🏁 COMPLETION

When Phase F is done:
1. Update `plans/crm-v2-upgrade/plan.md` — all phases ✅
2. Run full BRIEF checklist (`docs/BRIEF-crm-v2-upgrade.md` §7)
3. Mark Phase 03b complete in `plans/phase-03-customers.md`
4. Celebrate 🎉 — V2 CRM ≥ V1 CRM

**Next:** Contract module integration (LTV, convert flow)
