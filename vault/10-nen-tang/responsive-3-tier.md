---
title: "Responsive 3 tầng"
tags: [nen-tang, ui]
cap-nhat: 2026-08-07
---

# Responsive 3 tầng

Chốt 2026-06-06. Nguồn: `lib/breakpoints.ts`, `plans/260606-tablet-design-layer/PLAN.md`.

**Bối cảnh thật:** người dùng thao tác trên **cả PC, mobile và iPad**. Không tầng nào là phụ.

## Ba tầng

| Tầng | Bề rộng | Tiền tố Tailwind |
|---|---|---|
| Phone | `< 768px` | (mặc định, không tiền tố) |
| Tablet | `768–1023px` | `md:` |
| Desktop | `≥ 1024px` | `lg:` |

## Chuyển gì ở đâu

- **Mật độ layout** (bảng ↔ thẻ, 1 ↔ 2 cột) chuyển ở **`md:`**
- **Chrome full-width** (sidebar, header rộng) giữ ở **`lg:`**
- **Overlay/modal căn giữa** ở `sm:` (640px)

Component `<TierSwitch>` đã rollout toàn bộ 56 file module dữ liệu (Phase 0+1 xong). Phase 2 (chi tiết 2 cột) chưa làm; Phase 3 (sidebar) đã quyết định **dừng**.

## Bắt buộc khi đổi responsive

Verify **@768px và @1023px** — hai mép của tầng tablet. Đây là chỗ vỡ nhiều nhất vì dễ quên tầng giữa.

Kiểm bằng chrome-devtools: `emulate` với `1600x880x1` (lệnh `resize_page` hay không ăn).

## Bẫy Tailwind v4 đã dẫm

1. **Token `--spacing-*` đụng namespace Tailwind v4.** Định nghĩa `--spacing-*` trong `@theme` làm mọi `max-w-sm/md/lg/xl` co về 8–32px (18 chỗ vỡ cùng lúc). Đã đổi toàn cục sang `--space-*`.
   **CẤM** định nghĩa `--spacing-*`, `--container-*`, hay bất kỳ namespace utility Tailwind nào trong `@theme`.
2. **v4 bỏ reset `cursor: pointer` cho `<button>`.** Fix bằng 1 rule trong `@layer base`, đừng gắn vào `.btn`.
3. **`invisible` / `opacity-0` vẫn chiếm layout** → tooltip absolute làm phình `scrollHeight` của bảng.
4. **CSS không-layer đè `@layer base`.** `base.css:46-53` nuốt mọi `box-shadow` focus khai báo trong layer → style focus của form phải đặt **ngoài** layer, ở `forms.css`. Đọc computed style phải chờ hết transition 350ms.
5. **Class `border-border-subtle` là class chết** (token không tồn tại). Panel không viền dùng `bg-bg-hover shadow-sm`; divider dùng `h-px bg-border/30`. Ngoại lệ hợp lệ: `.input-base`, `.accent-card-*`.

## Liên quan

[[quy-uoc-code]] · [[bay-ui-react]]
