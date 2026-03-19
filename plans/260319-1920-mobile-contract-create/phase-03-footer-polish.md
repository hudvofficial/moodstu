# Phase 03: Footer Polish
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Fix FormActions fixed footer theo lessons learned:
- Lesson #64: V2 không dùng border → đổi sang shadow
- Thêm safe-area padding cho iPhone notch

## File: `components/contracts/form/FormActions.tsx` (dòng 88)

## Implementation

### Before:
```tsx
<footer className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg-card border-t border-border-light py-4 px-6">
```

### After:
```tsx
<footer className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg-card shadow-[0_-2px_8px_rgba(0,0,0,0.06)] py-4 px-6 pb-[calc(1rem+env(safe-area-inset-bottom))]">
```

### Changes:
1. `border-t border-border-light` → `shadow-[0_-2px_8px_rgba(0,0,0,0.06)]` (top shadow)
2. `py-4` stays, add `pb-[calc(1rem+env(safe-area-inset-bottom))]` for safe-area

## Impact Assessment
- ✅ Visual: subtle shadow thay vì border line → V2 consistent
- ✅ iPhone X+: content không bị che bởi home indicator
- ✅ Desktop: không ảnh hưởng (footer đã `lg:hidden`)

## Test Criteria
- [ ] Mobile: footer có shadow mịn hướng lên
- [ ] Mobile: không có border-t
- [ ] iPhone (simulator): safe-area padding hoạt động

---
Next Phase: phase-04-verify.md
