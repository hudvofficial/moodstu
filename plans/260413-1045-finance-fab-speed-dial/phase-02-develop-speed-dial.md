# Phase 02: Develop Speed Dial UI Logic
Status: ✅ Complete
Dependencies: Phase 01

## Objective
Xây dựng logic Native CSS Speed Dial trong `finance-fab.tsx` bằng 100% Tailwind V2 Tokens, đạt chuẩn 60FPS.

## Requirements
### Functional
- [x] Thiết lập state `isOpen` bằng `useState`.
- [x] Render Backdrop (`bg-black/40 backdrop-blur-sm z-40`) hiển thị lên khi `isOpen = true`.
- [x] Render 3 nút lơ lửng: Tạo Thu (TrendingUp), Tạo Chi (TrendingDown) và Trợ lý AI (Sparkles).
- [x] Đóng menu khi người dùng click vào Backdrop.
- [x] Hỗ trợ Navigation cho các nút bằng `useRouter` hoặc thẻ Link.

### Non-Functional
- [x] Tuân thủ V2 Tokens (ví dụ: `text-h3`, `spacing-md`).
- [x] Hiệu ứng Stagger delay khi chồi lên để tạo sự bồng bềnh (0ms, 50ms, 100ms).

## Implementation Steps
1. [x] Bọc `FAB` và hệ thống Speed Menu vào chung 1 root component (`<>...()</>`).
2. [x] Inject Backdrop Overlay quản lý sự kiện `onClick={() => setIsOpen(false)}`.
3. [x] Tạo container cho 3 nút floating với class `pointer-events-none` mờ đi khi đóng và `opacity-100 pointer-events-auto` khi mở.
4. [x] Bổ sung label nhỏ (chỉ hiện text) bên trái của từng nút floating action để giúp nhân viên dễ đọc trên PC.

## Files to Modify
- `components/finance/finance-fab.tsx` (MODIFY)

---
Next Phase: `phase-03-testing.md`
