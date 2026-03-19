# Plan: Global Scroll-Hide Header (Mặc định cho mọi trang)
Created: 2026-03-19T20:11
Status: 🟡 In Progress

## Mục tiêu
Scroll-hide header trở thành **behavior mặc định** trên mobile cho TẤT CẢ trang.

## Tiến độ
| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 1 | Global Context Setup | ✅ Complete | 100% |
| 2 | Hook Refactor | ✅ Complete | 100% |
| 3 | AppShell Integration | ✅ Complete | 100% |
| 4 | Consumer Integration (Header/Shell) | ✅ Complete | 100% |
| 5 | UI/Layout Polish (Gap Fix) | ⬜ Pending | 0% |

## Hoàn thành Session
- ✅ Setup `ScrollContainerContext`
- ✅ Refactor `useScrollDirection` hook hỗ trợ custom ref.
- ✅ Tích hợp vào `AppShell` (Provider bọc cả header).
- ✅ Tích hợp vào `Header` (Global) & `FullpageFormShell` (Mobile).
- ✅ Đã lưu Pattern vào `docs/patterns/scroll-container-pattern.md`.

## Nhiệm vụ còn lại
- [ ] Fix khoảng trống layout: Thêm negative margin (-mb-16) khi header ẩn để content lấp đầy UI mobile.
- [ ] Verify trên mobile thực tế cho Dashboard và List pages.

## Scope Guard
- ❌ KHÔNG thay đổi desktop behavior (lg:translate-y-0).
- ❌ KHÔNG dùng hardcoded element IDs.
