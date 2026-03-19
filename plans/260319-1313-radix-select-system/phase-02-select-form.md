# Phase 02: SelectForm — Migrate SimpleSelect
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Tạo `SelectForm` component (thay thế `SimpleSelect`) dùng Radix internal,
giữ nguyên 100% API để zero breaking change.

## Interface (giữ nguyên của SimpleSelect)
```tsx
interface SelectFormProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}
```

## Implementation Steps
1. [ ] Tạo `components/ui/select/SelectForm.tsx` dùng `radix-base.tsx`
2. [ ] Re-export từ `components/ui/simple-select.tsx`:
       `export { SelectForm as SimpleSelect } from './select/SelectForm'`
       → Tất cả import hiện tại vẫn chạy được
3. [ ] Visual test: mở browser, kiểm tra SimpleSelect trong CustomerFormModal
4. [ ] Verify keyboard nav: Tab → Enter → Arrow keys

## Files to Create/Modify
- `components/ui/select/SelectForm.tsx` — NEW
- `components/ui/simple-select.tsx` — re-export alias

## Test Criteria
- [ ] CustomerFormModal dropdown mở được
- [ ] Keyboard navigation works
- [ ] Selected value hiển thị đúng
- [ ] Error state hiển thị đúng
- [ ] `npm run dev` no TypeScript errors

---
Next Phase: phase-03-select-pill.md
