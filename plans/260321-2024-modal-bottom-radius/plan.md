# Plan: Fix UnifiedModal Bottom Radius on Desktop
Created: 2026-03-21T20:24
Status: ⬜ Pending

## Vấn đề
Modal trên desktop không bo góc dưới (bottom corners vuông).
Trên mobile (bottom sheet) thì đúng — chỉ bo góc trên.

## Root Cause
File: `components/ui/unified-modal.tsx` line 166

```tsx
"rounded-t-2xl lg:rounded-xl"
```

Tailwind v4: `rounded-t-2xl` tạo **longhand** CSS (`border-start-start-radius`, `border-start-end-radius`).
`lg:rounded-xl` tạo **shorthand** CSS (`border-radius`).
CSS rule: longhand LUÔN thắng shorthand → bottom corners không bao giờ được set.

## Scope
**CHỈ SỬA 1 FILE:** `components/ui/unified-modal.tsx`
**CHỈ SỬA 1 DÒNG:** line 166
**KHÔNG SỬA:** logic, animation, scroll lock, backdrop, footer, portal

---

## PHASES

| Phase | Nội dung | Status |
|-------|----------|--------|
| 01 | Fix CSS class line 166 | ⬜ |
| 02 | Build verify + Visual test desktop + mobile | ⬜ |

---

## Phase 01: Fix CSS class

**Line 166 — hiện tại:**
```tsx
"rounded-t-2xl lg:rounded-xl",
```

**Thay bằng:**
```tsx
"rounded-t-2xl lg:rounded-t-xl lg:rounded-b-xl",
```

**Giải thích:**
- Mobile: `rounded-t-2xl` → top bo 2xl, bottom 0 (bottom sheet) ✅
- Desktop: `lg:rounded-t-xl` override top từ 2xl → xl, `lg:rounded-b-xl` set bottom xl ✅
- Dùng longhand override longhand → không bị CSS specificity conflict

**Kết quả mong đợi:**

| Breakpoint | Top corners | Bottom corners |
|------------|-------------|----------------|
| Mobile (<1024px) | 2xl (16px) | 0 (vuông - bottom sheet) |
| Desktop (≥1024px) | xl (12px) | xl (12px) - BO TRÒN |

## Phase 02: Build verify + Visual test

1. Kill port → `npm run dev` → verify build OK
2. Mở browser desktop (1424px) → mở modal "Tạo dịch vụ mới" trên `/contracts/create`
3. Verify: 4 góc modal đều bo tròn trên desktop
4. Thu viewport về 375px (mobile) → verify: chỉ bo trên, dưới vuông (bottom sheet)

---

## Ghi chú
- Fix này cũng sẽ ảnh hưởng TẤT CẢ modal dùng UnifiedModal (vì sửa shared component)
- Tuy nhiên đều sẽ tốt hơn: desktop bo 4 góc, mobile vẫn bottom sheet
- Nên ghi lesson mới về TW4 longhand vs shorthand conflict
