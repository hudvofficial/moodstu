# Phase 02: FAB Button + Page Layout
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Tách FAB button ("Tạo hợp đồng") ra khỏi stats bar trên mobile → floating button góc dưới phải.
Desktop giữ nguyên inline button.

## Implementation Steps

### Step 1: Tách CTA button responsive
- [ ] Desktop (lg:): giữ nguyên inline trong stats bar → `<span className="max-lg:hidden">Tạo hợp đồng</span>`
- [ ] Mobile (<lg): ẩn button inline, hiện FAB floating
- [ ] FAB: `fixed bottom-20 right-4` (trên bottom nav), tròn, bg-primary, shadow-lg
- [ ] Size: 56x56, icon Plus (lucide), text-white
- [ ] Z-index: z-40 (dưới modal, trên content)

### Step 2: Dùng design tokens
- [ ] Background: `bg-primary` (từ @theme)
- [ ] Shadow: `shadow-lg` (từ @theme)
- [ ] Text: `text-text-inverse` (white)
- [ ] Hover: `hover:bg-primary-dark`

### Step 3: Pagination mobile
- [ ] Giữ nguyên pagination trên cả mobile và desktop (V2 standard)
- [ ] Hoặc ẩn trên mobile nếu có infinite scroll — TBD

## Files to Modify
- `components/contracts/contracts-list-client.tsx` — CHỈ JSX layout (L188-196)

## Guard Rails
- [ ] Desktop stats bar + inline button KHÔNG thay đổi visual
- [ ] FAB chỉ hiện trên mobile (<lg breakpoint)
- [ ] Không hardcode colors

## Test Criteria
- [ ] Desktop: button "Tạo hợp đồng" vẫn hiện inline trong stats bar
- [ ] Mobile: FAB tròn nâu ở góc phải dưới, trên bottom nav
- [ ] Tap FAB → future handler (console or TODO)
- [ ] Build pass

---
Next Phase: phase-03-verify-polish.md
