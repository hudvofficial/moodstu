# Phase 03: SelectPill — New Filter Pill Component
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Tạo `SelectPill` — compact filter dropdown dùng Radix internal.
Style: `h-8`, `rounded-full` (mobile) / `rounded-md` (desktop), pill trigger.
Reusable cho TẤT CẢ modules: contracts, CRM, finance, schedules...

## Interface
```tsx
interface SelectPillProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;      // hiện khi chưa chọn gì (="Dịch vụ", "Sắp xếp")
  isActive?: boolean;        // tự detect từ value !== "" hoặc value !== defaultValue
  defaultValue?: string;     // value "all" / "newest" → considered inactive
}
```

## Implementation Steps
1. [ ] Tạo `components/ui/select/SelectPill.tsx` dùng `radix-base.tsx`
       - Trigger: compact pill style, hiển thị `placeholder` khi inactive
       - Active state: `bg-primary/10 text-primary` (match V1 logic)
       - Dropdown: same Radix Content từ base
2. [ ] Export từ `components/ui/select/index.ts`
3. [ ] Visual test: story/test với contracts filters

## Files to Create/Modify
- `components/ui/select/SelectPill.tsx` — NEW
- `components/ui/select/index.ts` — export barrel

## Test Criteria
- [ ] Pill hiển thị đúng label khi inactive
- [ ] Pill đổi màu khi active (value đã chọn)
- [ ] Dropdown mở/đóng mượt
- [ ] Click outside để close
- [ ] Keyboard nav (Enter, Arrow, Esc)

---
Next Phase: phase-04-migrate-contracts.md
