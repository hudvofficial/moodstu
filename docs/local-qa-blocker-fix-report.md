# Báo cáo sửa lỗi Local QA Playwright Blocker

## 1. Triệu chứng ban đầu
* **Lỗi 1:** Playwright mở `/login`, điền form và ấn submit nhưng trang **không chuyển hướng** và cũng không có API auth/Supabase nào được gọi.
* **Lỗi 2:** Màn hình Splash (`#splash-screen`) **không tự biến mất** mà che toàn bộ nội dung, buộc Playwright phải dùng script xoá thủ công DOM.
* **Lỗi 3:** Console liên tục báo lỗi `WebSocket connection to 'ws://127.0.0.1:3000/_next/webpack-hmr?id=...' failed: net::ERR_INVALID_HTTP_RESPONSE`.

## 2. Nguyên nhân gốc rễ (Root Cause)
Lỗi cấu hình trong `middleware.ts` của Next.js:
* Next.js Middleware (`lib/supabase/middleware.ts`) được dùng để kiểm tra Authentication Session thông qua Supabase.
* Trong cấu hình `matcher` của `middleware.ts`, các đường dẫn tĩnh (như `_next/static`, `_next/image`) đã được loại trừ, tuy nhiên **bỏ sót đường dẫn WebSocket cho HMR (`_next/webpack-hmr`)**.
* Khi trình duyệt gửi request nâng cấp giao thức (Protocol Upgrade) lên WebSocket để tạo kết nối HMR, Middleware đã chặn request này lại, thấy người dùng chưa đăng nhập nên trả về HTTP Status `307 Temporary Redirect` (redirect về `/login`).
* Việc trả về mã HTTP tĩnh (`307`) thay vì mã nâng cấp giao thức (`101 Switching Protocols`) làm hỏng quá trình bắt tay (handshake) của WebSocket, sinh ra lỗi `ERR_INVALID_HTTP_RESPONSE`.

## 3. Quá trình tác động dây chuyền (Domino Effect)
1. **HMR WebSocket thất bại**: Kết nối giao tiếp giữa trình duyệt và dev server bị đứt.
2. **Hydration bị hỏng**: Do module tải động của HMR sụp đổ, luồng JavaScript khởi tạo của Next.js (Hydration) trên client bị dừng hoặc rơi vào vòng lặp lỗi.
3. **Mất logic Client-Side**: 
   - Hàm `useEffect` điều khiển màn hình Splash (tạo hiệu ứng fade-out) không bao giờ được thực thi, làm Splash Screen tồn tại vô hạn định.
   - Form Đăng nhập của React không được hệ thống gắn sự kiện `onSubmit`. Nút Submit trở thành nút bấm HTML tĩnh thông thường, hoàn toàn không kích hoạt các request API tới hệ thống Supabase.

## 4. Cách khắc phục (Resolution)
Đã cập nhật file `middleware.ts` bằng cách bổ sung `_next/webpack-hmr` vào Regex loại trừ của mảng `matcher` để Next.js bỏ qua logic kiểm tra Auth cho request này.

**Mã nguồn thay đổi:**
```diff
// middleware.ts
export const config = {
  matcher: [
-   "/((?!_next/static|_next/image|api/monitoring/web-vitals|monitoring|favicon.ico|manifest.json|sw.js|push-sw.js|workbox-.*\\.js|fallback-.*\\.js|swe-worker-.*\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
+   "/((?!_next/static|_next/image|_next/webpack-hmr|api/monitoring/web-vitals|monitoring|favicon.ico|manifest.json|sw.js|push-sw.js|workbox-.*\\.js|fallback-.*\\.js|swe-worker-.*\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
```

## 5. Kết quả xác minh (Verification)
Đã chạy script Playwright cục bộ để kiểm tra trực tiếp dev server:
* Kết nối WebSocket HMR (`_next/webpack-hmr`) thành công, không còn lỗi `net::ERR_INVALID_HTTP_RESPONSE` trong Console.
* Tiến trình React Hydration hoàn tất bình thường.
* Splash Screen tự động mờ đi và biến mất như thiết kế ban đầu.
* Nút Login bắt được sự kiện và gửi request Authentication chính xác, giải quyết triệt để Blocker để Hermes có thể tiếp tục chạy QA Script.
