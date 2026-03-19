# Phase 03: Migrate GroupedSelect → Radix SelectGrouped
Status: ⬜ Pending
Dependencies: Phase 01, 02 done

## Objective
Thay `GroupedSelect` (custom click-outside + manual portal) bằng Radix Select với group support.

## Context
GroupedSelect hiện tại:
- Custom `useState(isOpen)` + `useRef` + click-outside handler + Escape key handler
- Manual positioning → có thể bị cắt bởi `overflow:hidden` parents
- Dùng bởi: `ContractInfoSection.tsx` (chọn dịch vụ có grouped by category)

Radix giải quyết tất cả những vấn đề trên built-in.

## Files to Create/Modify

### 1. `components/ui/select/SelectGrouped.tsx` — NEW
```tsx
// Radix Select + SelectGroup + SelectLabel
// API giống GroupedSelect:
// groups: OptionGroup[] (groupName, color, options[])
// value, onChange, label, placeholder
// Giữ color-coded group headers từ design-system.css
```

### 2. `components/ui/grouped-select.tsx` — MODIFY
- Re-export alias: `export { SelectGrouped as GroupedSelect }`

### 3. `components/contracts/form/ContractInfoSection.tsx` — VERIFY
- Import `GroupedSelect` vẫn OK (re-export alias)

### 4. Barrel export `components/ui/select/index.ts`
```ts
export { SelectGrouped } from "./SelectGrouped";
```

## Key Implementation Note
Radix SelectGroup + SelectLabel cho phép group headers.
Color tokens (gold/rose/sky) từ design-system.css vẫn dùng được qua className.

## Test Criteria
- [ ] ContractInfoSection: click "Loại dịch vụ" → Radix dropdown với group headers màu
- [ ] Portal thoát được overflow (không bị cắt)
- [ ] Keyboard navigation hoạt động (Tab, Arrow, Enter, Escape)
- [ ] Color-coded groups đẹp như trước

---
Next: Plan complete! Update plan.md status.
