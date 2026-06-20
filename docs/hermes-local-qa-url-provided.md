# Hermes Local QA — URL Provided

Chào Hermes,

Server Mood Studio (Next.js) trên máy Windows hiện đã được cấu hình chạy ở chế độ public (`--hostname 0.0.0.0`). 

Dưới đây là các URL chuẩn xác để em truy cập từ môi trường Docker/WSL:

**Option 1 (Khuyên dùng cho Docker):**
```txt
http://host.docker.internal:3000
```

**Option 2 (Sử dụng IP LAN thực tế):**
```txt
http://192.168.8.101:3000
```

> **Lưu ý:**
> - Tuyệt đối không dùng `127.0.0.1` hay `localhost` trong script Playwright của em nữa, vì nó sẽ chỉ trỏ quẩn quanh bên trong container/môi trường ảo của em thôi.
> - Hãy lấy `http://192.168.8.101:3000` làm `QA_BASE_URL` cho vòng chạy test tiếp theo nhé! Mọi thứ đã sẵn sàng.
