---
title: "Bẫy — UI, React, CSS"
tags: [bay, ui]
cap-nhat: 2026-08-07
---

# Bẫy UI / React / CSS

## React Compiler

`reactCompiler: true` bật toàn app.

**Triệu chứng:** Sentry báo `"Rendered more hooks than during the previous render"` **chỉ trên production**, dev không tái hiện, đọc hết source không thấy vi phạm hooks nào.

**Nguyên nhân:** compiler chèn `useMemoCache` và tái cấu trúc code path ở component phức tạp (>10 hooks, nhiều nhánh render, hàm inline trả JSX động).

**Fix:** thêm `"use no memo"` vào đúng component/hook đó. Đã áp cho `CalendarWrapper` + `useCalendarData` — **đừng gỡ**.

## Điều hướng từ drawer/modal

`onClose()` **trước** `router.push()` = race: drawer unmount nuốt lần navigate đầu → người dùng phải bấm 2 lần.

**Fix:** push thẳng, bỏ `onClose()`. Route mới tự unmount cả list lẫn drawer.

⚠️ **Automation không tái hiện được lỗi này** (click tổng hợp không có timing/animation như con trỏ thật). Đừng kết luận "không có bug" chỉ vì automation pass — tin người dùng, sửa nguyên nhân race.

## Drawer hiện skeleton dù list đã có data

List query đã JOIN sẵn (data đó đang tạo badge "4/5" ngoài list) nhưng drawer fetch lại → `isLoading=true` → skeleton che mất data có sẵn.

**Fix:** seed `placeholderData` / `fallbackData` cho `useQuery` từ data list. Chỉ seed được cái list thật sự có.

## Ảnh: chớp đen khi mở xem trước

Nạp ảnh gốc `=s0` cùng lúc với ảnh xem trước → khung trắng vài giây (đo prod: 450KB và **19,4MB** khởi động cùng lúc).

**Thứ tự đúng:** placeholder `=s600` từ cache lưới → ảnh xem trước → *rồi mới* `=s0`.
Desktop phải khoá `md:h-[90vh]`, không thì khung nhảy cỡ khi đổi nguồn.

## LCP: src ảnh phải ổn định giữa SSR và client

`imageSrc` phụ thuộc `columnWidth` runtime → SSR đoán 5 cột desktop, client mobile 2 cột → src khác → **trình duyệt vứt ảnh HTML, tải lại bằng JS**.
Cộng thêm `opacity-0` chờ `onLoad` → LCP buộc phải đợi JS.

**Nguyên tắc:** thumbnail dùng **một cỡ cố định** cho mọi ảnh.

## Tailwind v4

1. **Cấm định nghĩa `--spacing-*` / `--container-*`** hay bất kỳ namespace utility nào trong `@theme`. Token `--spacing-*` của dự án từng làm mọi `max-w-sm/md/lg/xl` co về 8–32px — vỡ 18 chỗ cùng lúc. Đã đổi sang `--space-*`.
2. **v4 bỏ reset `cursor: pointer` cho `<button>`** → fix bằng 1 rule `@layer base`, đừng gắn `.btn`.
3. **`invisible` / `opacity-0` vẫn chiếm layout** → tooltip absolute phình `scrollHeight` bảng.
4. **CSS không-layer đè `@layer base`** — `base.css:46-53` nuốt mọi `box-shadow` focus khai trong layer. Style focus form phải đặt **ngoài** layer (`forms.css`). Đọc computed style phải chờ hết transition 350ms.
5. **`border-border-subtle` là class chết.** Panel không viền: `bg-bg-hover shadow-sm`. Divider: `h-px bg-border/30`. Ngoại lệ hợp lệ: `.input-base`, `.accent-card-*`.
6. Grep class Tailwind trong file CSS phải dùng `grep -F` (ký tự bị escape).

## Ô nhập số xoá trắng búng về 0

`Number("") === 0`. Dùng **state string + `placeholder="0"`**. Mẫu gốc: `stock-in-modal`.

## File trùng tên = dead code

`header-v2.tsx`, `header-old.tsx` là **dead code**; bản chạy thật là `header.tsx` (app-shell import `./header`). Cấu trúc gần giống nhau nên rất dễ sửa nhầm file rồi tưởng code không ăn.

**Grep import trước khi sửa file trùng tên.**

## Verify UI phải chạy code thật

Inject DOM bằng CDP chỉ chứng minh CSS, không chứng minh code. Vài lưu ý khi verify bằng chrome-devtools:
- `resize_page` hay không ăn → dùng `emulate` với `1600x880x1`
- Cần đăng nhập prod một lần (nhờ người dùng) mới verify được trang admin
- Text tiếng Việt inject qua CDP bị mojibake — không phải lỗi app

## Không giả định hành vi WebView

Đã sửa lưng một lần: Messenger iOS **có** menu lưu ảnh khi nhấn giữ. Giả UA desktop chỉ test **nhánh code**, không test **hành vi WebView thật**.

Liên quan: nhấn giữ trên iOS chết là do `-webkit-touch-callout: none` (đặt theo quyền tải + view-token), **không phải** do WebView. Chrome desktop không có thuộc tính này nên kiểm computed style bị mù → **grep source**.

Và: đừng chen toast/UI vào giữa một gesture native đang chạy.

## Liên quan

[[responsive-3-tier]] · [[quy-uoc-code]] · [[gallery]]
