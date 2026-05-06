# Phase 01: Instant Skeleton — `loading.tsx`
Status: ✅ Done
Dependencies: None
Est: 15 phút

## Objective
Thêm `loading.tsx` cho route `/contracts` để Next.js stream skeleton ngay lập tức thay vì blank page.

## Rationale
Hiện tại không có `loading.tsx` → user thấy blank page ~1-1.5s trước khi server trả HTML hoàn chỉnh.
Với `loading.tsx`, Next.js sẽ:
1. Stream layout shell + skeleton HTML ngay khi request bắt đầu
2. Song song: server fetch data ở background
3. Khi data ready → swap skeleton → real content

## Implementation Steps
1. [x] Tạo `app/(protected)/contracts/loading.tsx` — shimmer skeleton giống layout thật
   - Stats bar skeleton (1 hàng compact-stats)
   - Tab filter skeleton
   - Table/Card list skeleton (5-6 rows shimmer)
   - Sử dụng `animate-pulse` + `bg-bg-hover` (giống pattern trong `contracts/[id]/loading.tsx`)

## Files to Create/Modify
- `app/(protected)/contracts/loading.tsx` — [NEW] Skeleton cho contract list page
- `components/contracts/contracts-list-skeleton.tsx` — [NEW] Skeleton dùng lại cho route loading và SWR initial state

## Test Criteria
- [x] Mở `/contracts` → thấy skeleton ngay lập tức, không blank page
- [x] Skeleton layout match với real UI layout
- [x] `npm run build` pass

## Impact
- **-800ms perceived load time** — user thấy UI ngay thay vì blank page

---
Next Phase: → phase-02-auth-waterfall-kill.md
