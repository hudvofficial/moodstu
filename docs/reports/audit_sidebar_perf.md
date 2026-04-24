# Audit Report - 24/04/2026

## Summary
- 🔴 Critical Issues: 1
- 🟡 Warnings: 1
- 🟢 Suggestions: 1

## 🔴 Critical Issues (Phải sửa ngay)
1. Nghẽn mạng và Server do cơ chế "Prewarm" sai cách (Network Contention)
   - **File:** `lib/navigation-data-prefetch.ts` và `components/layout/sidebar.tsx`
   - **Nguy hiểm:** Khi di chuột (hover) hoặc bấm vào các mục menu bên trái, code đang kích hoạt hàm `warmRoute()`. Hàm này lại đi gọi thẳng các Server Actions rất nặng (như `getContractList`, `getLeads`, `getServices`) để ép tải dữ liệu trước. Việc này sẽ bắn liên tục các HTTP POST requests cực kỳ nặng lên server cùng lúc. Kết quả: App bị nghẽn (freeze), chuyển trang cực chậm và có cảm giác "bị đơ".
   - **Cách sửa:** Xóa bỏ hoàn toàn hàm `prewarmRouteData` và các lệnh gọi Server Actions khi di chuột. Next.js App Router đã có cơ chế tự động prefetch trang tĩnh khi hover rất mượt, việc gọi thêm data động (bằng Server Action) là phản tác dụng.

## 🟡 Warnings (Nên sửa)
1. Component Sidebar bị Re-render dư thừa khi click
   - **File:** `components/layout/sidebar.tsx`
   - **Nguy hiểm:** Sự kiện `onClick={() => markPending(item.href)}` ép Sidebar cập nhật state `pendingHref` đồng bộ khi người dùng click. Nó bắt React vẽ lại toàn bộ Menu ngay tại khoảnh khắc bấm, gây ra sự khựng nhẹ về UI.
   - **Cách sửa:** Gỡ bỏ state `pendingHref` và các sự kiện `onPointerEnter`, `onFocus`, `onClick` tự chế. Chỉ dùng `usePathname` là đủ để đánh dấu menu đang active.

## 🟢 Suggestions (Tùy chọn)
1. Quản lý Cache SWR
   - Thay vì ép tải data khi chưa bấm, hãy để SWR tự động fetch và lưu cache bình thường khi trang render. Như vậy UI chuyển đổi rất nhanh rồi mới hiện thanh loading ở nội dung bên trong.

## Next Steps
Menu hành động được đưa ra ở tin nhắn tiếp theo.
