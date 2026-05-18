# 📊 BÁO CÁO DỰ ÁN: Module /contracts

## 🎯 App này làm gì?
Module `/contracts` (Hợp đồng) là trung tâm quản lý hoạt động kinh doanh cốt lõi của Mood Studio. Giúp quản lý danh sách hợp đồng, chi tiết từng dịch vụ, thanh toán, phân công nhân sự (Event-Task) và theo dõi tiến độ công việc một cách tự động.

## 📁 Cấu trúc chính
```
app/(protected)/contracts/
├── page.tsx               # Trang danh sách chính
├── create/                # Tạo hợp đồng mới
└── [id]/
    ├── page.tsx           # Chi tiết hợp đồng & Timeline
    ├── edit/              # Sửa hợp đồng
    ├── gallery/           # Thư viện ảnh hợp đồng
    └── print/             # In ấn hợp đồng

components/contracts/
├── contracts-list-client.tsx   # Quản lý state danh sách & SWR
├── contracts-table.tsx         # Bảng hiển thị
├── contract-drawer.tsx         # Drawer xem nhanh thông tin
└── ...
```

## 🛠️ Công nghệ sử dụng
| Thành phần | Công nghệ |
|------------|-----------|
| Framework | Next.js 16.1 (App Router, Server Actions) |
| State/Cache| SWR & React Query |
| Giao diện | TailwindCSS 4, Radix UI |
| Database | Supabase (PostgreSQL, Realtime, RPC) |

## 🚀 Tính năng & Kiến trúc hiện tại
- **SWR + Server Actions:** Danh sách lấy dữ liệu thực tế từ DB qua actions, không còn dùng dữ liệu giả (mock data).
- **Realtime Sync:** Tự động lắng nghe thay đổi từ các bảng `contracts`, `contract_events`, `work_tasks`, `payment_plans` để cập nhật UI ngay lập tức.
- **Event-First Architecture:** Thay vì task rời rạc, mọi task nhân sự đều được gắn vào **Event (Sự kiện)**.
- **Tự động hóa (Auto-provision):** Khi tạo hợp đồng, hệ thống sẽ gọi RPC `submit_contract_v4` để tạo luôn các sự kiện mặc định (Thực hiện, Hậu kỳ, Giao SP) thay vì để trống.
- **Tính toán Lợi nhuận Server-side:** Profit và tiến độ được tính toán sẵn từ Server trước khi trả về Client.

## 🏥 ĐÁNH GIÁ SỨC KHỎE CODE
| Chỉ số | Kết quả | Đánh giá |
|--------|---------|----------|
| Build | ✅ Thành công | Ổn định |
| TypeScript | 0 errors | Rất Tốt |
| Kiến trúc | Event-Task | Chuẩn hóa, không còn Legacy |
| Hiệu năng | Server Components | Tốt (đã cache & tính sẵn số liệu) |

## ⚠️ Lưu ý khi tiếp nhận / Sửa đổi
- **Quy tắc Event-Task:** Không được tạo task mồ côi (orphaned task), tất cả task (chụp ảnh, makeup...) **phải** thuộc về một Event. 
- **The F5 Refresh Bug:** Khi có sự cố data không cập nhật, hãy kiểm tra lại cấu hình revalidate của SWR hoặc `revalidatePath` trong Server Action. Hiện tại đã cấu hình `revalidateContractListCaches()` cho realtime.
- **Cấu trúc Drawer:** Tính năng xem nhanh dùng Drawer. Nó lazy-load các tab (assignments, checklist, timeline, notes) để tối ưu tốc độ mở, đừng đổi sang load đồng loạt (eager load).
- **Status Normalization:** Cần chú ý ánh xạ (mapping) đúng giữa `TaskStatus` trong UI và trong CSDL.

## 🔧 Kế hoạch & Gợi ý nâng cấp tiếp theo
1. Theo dõi logs realtime từ Supabase để đảm bảo việc lắng nghe đa bảng (Multi-channel) không gây nghẽn socket trên UI nếu lượng hợp đồng quá lớn.
2. Cân nhắc lazy-loading kĩ hơn cho `ContractsTable` trên mobile nếu danh sách render quá nặng.
