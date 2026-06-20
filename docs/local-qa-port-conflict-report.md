# Báo cáo Phát Hiện Xung Đột Cổng (Port Conflict) & Service Worker

## 1. Phát hiện chẩn đoán
Mặc dù đã fix `middleware.ts` nhưng lỗi `net::ERR_INVALID_HTTP_RESPONSE` cho WebSocket HMR vẫn xảy ra. Thông qua kiểm tra hệ thống tiến trình (`netstat` và `wmic`), Antigravity đã tìm ra nguyên nhân gốc rễ thực sự cho hiện tượng kỳ lạ này: **Port 3000 hiện tại KHÔNG PHẢI do Next.js của Mood Studio chạy, mà đang bị chiếm dụng bởi Remotion Studio!**

* Tiến trình PID `68716` đang lắng nghe trên port 3000.
* Command line của tiến trình này là: `"node" "...\@remotion\cli\remotion-cli.js" studio`.

## 2. Tại sao giao diện Mood Studio vẫn hiện ra?
Lý do Playwright và trình duyệt vẫn thấy trang Đăng nhập của Mood Studio (chứ không phải giao diện của Remotion) là do **Service Worker (PWA)**:
1. Dự án Mood Studio có tích hợp `next-pwa`.
2. Trong các lần chạy Next.js trước đó, Service Worker đã được cài đặt vào hệ thống ở domain `http://127.0.0.1:3000`.
3. Khi Playwright gọi tới `http://127.0.0.1:3000/login`, Service Worker của Next.js lập tức chặn (intercept) request này và trả về **bản cache HTML/JS cũ** của Mood Studio mà không cần gọi xuống server backend.
4. Trình duyệt bắt đầu chạy đống JS của Next.js (từ cache) và tự động thiết lập kết nối WebSocket tới `ws://127.0.0.1:3000/_next/webpack-hmr`.

## 3. Tại sao lại sinh ra lỗi WebSocket `ERR_INVALID_HTTP_RESPONSE`?
* Request WebSocket HMR được bắn xuống server thực ở port 3000.
* Nhưng server thực sự đang chạy trên port 3000 lúc này là **Remotion Studio**.
* Remotion Studio không hiểu path `_next/webpack-hmr` là gì, theo mặc định của SPA nó sẽ trả về trang `index.html` của Remotion (với HTTP Status `200 OK`).
* Giao thức WebSocket đang mong đợi phản hồi HTTP `101 Switching Protocols` để cấp quyền nâng cấp giao thức, nhưng lại nhận được `200 OK` (mang theo nội dung text/html). Sự phi lý này khiến trình duyệt quăng thẳng lỗi `net::ERR_INVALID_HTTP_RESPONSE` và đóng sập kết nối.
* Kéo theo đó: Hydration của Next.js bị kẹt, Splash Screen không tắt, Form Login không hoạt động.

## 4. Cách khắc phục dứt điểm
Vấn đề hoàn toàn do **Môi trường chạy (Environment)** chứ không phải do code Next.js bị lỗi. Bạn cần thực hiện các bước sau:

1. **Tắt hoàn toàn Remotion Studio:** Tắt terminal đang chạy Remotion hoặc chạy lệnh kill PID `68716`.
2. **Khởi động lại Next.js:** Chạy `npm run dev` ở thư mục Mood Studio, và kiểm tra chắc chắn terminal báo dòng chữ: `started server on 0.0.0.0:3000` (đảm bảo không bị đẩy sang port 3001).
3. **Reset Service Worker (nếu cần):** Script QA của Playwright đã chạy với `--no-sandbox` trên context mới nên thường SW không bị lưu. Nếu test trên trình duyệt thật, hãy clear cache / unregister Service Worker.
4. **Chạy lại QA script.** 

Chỉ cần đúng port 3000 là của Next.js thì toàn bộ mọi thứ sẽ hoạt động!
