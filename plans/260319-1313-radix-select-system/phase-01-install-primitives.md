# Phase 01: Install + Build Radix Primitives
Status: ⬜ Pending
Dependencies: none

## Objective
Cài `@radix-ui/react-select`, tạo base Radix wrapper với CSS tokens.
Đây là foundation cho cả 3 variants phía sau.

## Implementation Steps
1. [ ] Run: `npm install @radix-ui/react-select`
2. [ ] Tạo `components/ui/select/` folder
3. [ ] Tạo `components/ui/select/radix-base.tsx` — shared Radix primitive (Trigger, Content, Item, ScrollArea)
4. [ ] Thêm CSS tokens cho select vào `design-system.css`:
       - `.select-content` (dropdown panel)
       - `.select-item` (option row)
       - `.select-item[data-highlighted]` (hover state)
       - `.select-item[data-state="checked"]` (selected state)
       - `.select-trigger-pill` (compact pill trigger)

## Files to Create/Modify
- `components/ui/select/radix-base.tsx` — NEW
- `app/design-system.css` — add select tokens

## Test Criteria
- [ ] Build thành công (`npm run dev` no errors)
- [ ] CSS tokens hiển thị đúng trong browser DevTools

---
Next Phase: phase-02-select-form.md
