# Phase 04: Migrate contracts module
Status: ⬜ Pending
Dependencies: Phase 02 + Phase 03

## Objective
Áp dụng SelectPill vào 2 filter pills còn lại trong contracts.
Đây là real-world validation của cả system.

## Scope
- `contracts-list-client.tsx` L160 — Service filter pill → `<SelectPill />`
- `contracts-list-client.tsx` L180 — Sort filter pill → `<SelectPill />`

## Implementation Steps
1. [ ] Import `SelectPill` vào `contracts-list-client.tsx`
2. [ ] Replace native `<select>` service filter → `<SelectPill>`
       - `defaultValue="all"` → inactive state
       - Active khi value !== "all"
3. [ ] Replace native `<select>` sort filter → `<SelectPill>`
       - `defaultValue="newest"` → inactive state
4. [ ] Remove unused `ChevronDown` icon import (Radix tự handle)
5. [ ] Browser verify: mở `/contracts`, test cả 2 pills

## Files to Modify
- `components/contracts/contracts-list-client.tsx`

## Test Criteria
- [ ] Service pill: chọn "Studio" → active style, filter hoạt động
- [ ] Sort pill: chọn "Giá cao" → active style, sort hoạt động
- [ ] Reset về "Tất cả" / "Sắp xếp" → inactive style
- [ ] Keyboard navigation works
- [ ] Mobile: dropdown hiển thị đúng (không bị clip)
- [ ] `npm run dev` no errors

## Notes
Sau phase này → System hoàn chỉnh, blueprint sẵn sàng cho CRM, Finance, etc.

---
✅ DONE: Radix Select System v1.0 complete
