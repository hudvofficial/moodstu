# Mood Studio - Long-Term Memory & Context

## Kiến trúc Hệ thống Hiện tại
- **Framework:** Next.js 16.2.6 (App Router), Tailwind CSS.
- **Database/Backend:** Supabase.
- **Deployment:** Vercel (Tài khoản hiện tại: `moodstudio`, Repo: `hudvofficial/moodstu`). Domain chính: `stu.moodwedding.com` (Đã được trỏ DNS qua Vercel CNAME).

## Module Quan Trọng & Các thay đổi gần đây
- **Module Calendar & Lịch Trình:**
  - Cập nhật logic đồng bộ hóa Lịch (Calendar Sync Worker) và Google Calendar Service.
  - Tối ưu hóa UI/UX các thành phần Calendar (tháng, tuần, các Drawer hiển thị ngày, và kéo thả sự kiện - draggable events).
- **Module Download ZIP Ảnh (Client-side):** 
  - Vừa được tối ưu hóa để tải và nén ảnh (ZIP) trực tiếp trên Client-side.
  - Xử lý dứt điểm tình trạng lỗi 500 do nghẽn RAM và hao tổn băng thông (Bandwidth) Server-side trên Vercel. 
  - Đã **bypass hoàn toàn API Proxy của Vercel**, trình duyệt (JSZip) sẽ tải ảnh trực tiếp từ Google Drive thông qua link gốc `lh3.googleusercontent.com/d/id=s0`. Điều này giúp đưa băng thông Fast Origin Transfer của Vercel về đúng mức 0.
- **Performance & Analytics:** Đã tích hợp thành công `@vercel/speed-insights` để theo dõi Core Web Vitals của khách hàng (giúp tối ưu tốc độ load ảnh cho người xem Gallery trên mobile/4G).

## Lưu ý Kỹ thuật (Technical Notes)
- **Vercel Deployment:** 
  - Vercel đang được liên kết với Github Repo: `hudvofficial/moodstu`.
  - Để lệnh Auto-Deploy từ GitHub qua Vercel chạy thành công (bypass bảo mật Vercel Team), cấu hình Git local BẮT BUỘC phải sử dụng email `hudvofficial@gmail.com`. (Đã cấu hình).
  - Sử dụng package manager chuẩn là **NPM**. Đã xóa bỏ toàn bộ file rác `pnpm-lock.yaml` để tránh đụng độ trong quá trình Vercel chạy lệnh `npm install`.
