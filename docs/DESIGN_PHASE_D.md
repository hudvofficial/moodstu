# 🎨 DESIGN: CRM Lead Analytics (Phase D)

## 1. Dữ liệu & Logic (Data Flow)
Dữ liệu sẽ được tính toán Client-side từ mảng `initialLeads` truyền từ Server component xuống `LeadListClient`. Điều này giúp tab Phân tích cập nhật ngay lập tức khi User thao tác kéo thả ở tab Kanban.

### 1.1. Logic tính toán Phễu (Funnel)
Mảng stages: `moi` -> `lien_he` -> `hen_gap` -> `coc` -> `hop_dong`.
Duyệt qua danh sách leads, đếm số lượng và tổng `deal_value` cho từng stage.

### 1.2. Logic tính toán Nguồn (Source)
Group by `lead.source`, tính tỉ lệ %. Sắp xếp giảm dần theo số lượng.

## 2. Các Màn Hình & Thành phần

### 2.1. ConversionFunnel Interface
- **Layout:** Column layout. 
- **Summary Strip:** Dùng `bg-bg-card` bo góc 16px. 
- **Progress Bar:** Vẽ bằng các thẻ `div` với width tính theo tỉ trọng %, màu sắc lấy từ `STATUS_BAR_COLORS`.
- **Funnel Visual:** Các thanh bar ngang có animation `duration-700`.

### 2.2. SourceChart Interface
- **Layout:** Flex row (Doughnut bên trái, Legend bên phải).
- **Chart:** Vẽ thủ công bằng `<svg>` và `<circle>` với `stroke-dasharray` để tối ưu performance.
- **Interactivity:** Hover vào chú thích sẽ highlight segment tương ứng.

## 3. Luồng Hoạt Động (User Flow)
1. User chọn tab "Phân tích".
2. Component thực hiện tính toán dữ liệu (vài ms).
3. Biểu đồ phễu trượt ra (animation).
4. Người dùng di chuột vào các stage để xem giá trị trung bình mỗi đơn.

## 4. Checklist Kiểm Tra (Acceptance Criteria)
- [ ] Tab Analytics hiển thị khi `view === "analytics"`.
- [ ] `ConversionFunnel` hiển thị biểu đồ 5 bước chuẩn.
- [ ] `SourceChart` vẽ đúng tỉ lệ Doughnut.
- [ ] Màu sắc đồng bộ với trạng thái Lead (Mới = Xanh, Quá hạn = Đỏ...).
- [ ] Responsive tốt trên cả Mobile (xếp chồng 1 cột).

---
*Tạo bởi Antigravity v4.0 - CRM v2 Design*
