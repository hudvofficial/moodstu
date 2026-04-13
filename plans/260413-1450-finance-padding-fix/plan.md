# Plan: Finance Layout Spacing Fix
Created: 2026-04-13T14:50:00+07:00
Status: 🟡 Pending

## Overview
Giao diện module `/finance` đang bị lỗi khoảng cách (padding) lề 2 bên rộng gấp đôi so với module `/contracts`. Nguyên nhân cốt lõi là do sự vi phạm nguyên tắc "Container lồng nhau" (Nested Container). Token class `.main-container` đã bị gọi hai lần liên tiếp theo cấu trúc App Router của Next.js:
- Lần 1: Trong `app/(protected)/finance/layout.tsx`
- Lần 2: Trong `components/finance/dashboard/finance-dashboard-client.tsx` (Thành phần chính hiển thị giao diện báo cáo)

Mục tiêu của fix này là loại bỏ lớp vỏ `.main-container` dư thừa ở `layout.tsx` module-level để tránh nhân đôi padding, thiết lập lại khoảng cách 2 bên dựa trên duy nhất 1 lớp container tiêu chuẩn, đảm bảo thiết kế module Finance 100% nhất quán với module Contracts (Gold Standard).

## Tech Stack
- Frontend: Next.js App Router (`layout.tsx`)
- Styling: `main-container` utility CSS class.

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Audit & Root Cause Layout Fix | ⬜ Pending | 0% |
| 02 | Browser Visual Verification | ⬜ Pending | 0% |

## Implementation Steps

### Phase 01: Audit & Root Cause Layout Fix
- [ ] Mở file `app/(protected)/finance/layout.tsx`
- [ ] Xem xét cấu trúc wrapper hiện tại (`<div className="main-container relative">`) đang bọc thẻ `{children}`.
- [ ] Xóa bỏ class `main-container`. Thay vì dùng thẻ `<div className="main-container relative">`, ta sẽ đổi thành thẻ `<div className="relative">` hoặc React Fragment `<>` (hiện `FinanceFAB` dùng vị trí fixed nên relative là dư thừa, nhưng để an toàn cứ dùng Fragment rỗng là tối ưu DOM nhất).

### Phase 02: Browser Visual Verification
- [ ] Dùng `browser_subagent` mở trang `localhost:3000/finance`.
- [ ] Chụp lại ảnh screenshot thực tế.
- [ ] Xác nhận khoảng cách lề (padding) 2 bên đã co hẹp lại, grid trải đều 12 cột một cách logic giống hệt module `/contracts` trên desktop và mobile.
- [ ] Báo cáo kết quả bằng ảnh đính kèm.

## Files to Create/Modify
- `[MODIFY] app/(protected)/finance/layout.tsx` - Loại bỏ `.main-container` dư thừa.

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
