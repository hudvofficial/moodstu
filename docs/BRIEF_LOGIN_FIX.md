# 💡 BRIEF: Login Page Stabilization (Modern Grid Edition)

**Ngày tạo:** 2026-03-15
**Brainstorm Partner:** Hà (PM) & User

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
- Giao diện Login V2 hiện tại bị lỗi "Squashing" (co cụm chữ theo chiều dọc) do dùng Flexbox không có mốc chặn chiều rộng.
- Các icon và nút bấm bị bóp méo thành hình thù kỳ dị trên một số độ phân giải.
- Trải nghiệm người dùng cực kỳ tệ khi chữ nhảy múa.

## 2. GIẢI PHÁP ĐỀ XUẤT (MODERN GRID)
- **Cấu trúc:** Sử dụng CSS Grid làm "bộ khung bê tông" cho trang.
- **Desktop (>= 1024px):** Chia Grid 2 cột tỉ lệ `[2fr, 1fr]` (Ảnh chiếm 66%, Form chiếm 33%).
- **Mobile (< 1024px):** Chuyển về Grid 1 cột duy nhất, ẩn ảnh bìa, tập trung vào Form với padding an toàn.
- **Khóa chiều rộng:** Form container luôn có `min-width: 320px` và `max-width: 420px` để đảm bảo Inputs và Buttons luôn đẹp.

## 3. PHONG CÁCH & ĐỐI TƯỢNG
- **Style:** Mood V2 Earth-tone (Warm Cream, Dark Green accents).
- **Typography:** San Francisco (Apple Standard).
- **Icons:** Lucide-react (SF Symbols style).
- **Đối tượng:** Admin và nhân viên Studio cưới (Yêu cầu sự chuyên nghiệp, sang trọng).

## 4. TÍNH NĂNG CẦN GIỮ LẠI
- Đăng nhập qua Supabase Auth.
- Rate Limiting dựa trên database (login_attempts).
- Ghi nhớ đăng nhập (Remember Me).
- Hiệu ứng chuyển trang (LoginTransition).

## 5. THỨ TỰ ƯU TIÊN (MVP)
1. **MVP:** Sửa triệt để lỗi vỡ chữ, đảm bảo Form đọc được và cân đối trên mọi màn hình.
2. **Polish:** Thêm các hiệu ứng hover, focus mượt mà chuẩn Apple HIG.

## 6. BƯỚC TIẾP THEO
→ Chuyển sang `/plan` để chia giai đoạn triển khai code.
