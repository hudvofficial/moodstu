# 💡 BRIEF: Quản Lý Lịch Trình Đa Ngày & Thợ Ngoài (Vendor Management)

**Ngày tạo:** 23/05/2026
**Dự án:** Mood Studio
**Brainstorm cùng:** Admin

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
1. **Lịch trình đa ngày:** Hiện tại hệ thống (DB và logic tự động) chỉ hỗ trợ 1 mốc "Ngày cưới", khiến các hợp đồng chụp 2-3 ngày không thể giao việc chính xác theo từng ngày. Phải tạo thủ công rất mất thời gian.
2. **Quản lý thợ ngoài (Freelancer):** Hệ thống đang ép tạo thợ ngoài thành 1 nhân viên nội bộ (`role = ctv`) để có thể giao việc. Việc này gây rác dữ liệu nhân sự, trộn lẫn luồng tính lương (Payroll) và công nợ (Payables).

## 2. GIẢI PHÁP ĐỀ XUẤT (HƯỚNG 2 CHUYÊN SÂU)

### A. Nâng cấp Lịch Trình (Flexible Timeline)
- **Hợp đồng (Contract):** Giữ nguyên bảng `contracts` làm "vỏ" (Container).
- **Sự kiện (Events):** Form tạo hợp đồng cho phép **thêm nhiều ngày chụp**. Hàm `generateContractEvents` sẽ tự động đẻ ra nhiều sự kiện "Ngày cưới 1", "Ngày cưới 2" tương ứng trên Timeline.

### B. Tách Module Thợ Ngoài (Vendor Management)
- **Database:** Tạo bảng `vendors` mới (Tên, SĐT, Dịch vụ cung cấp).
- **Giao việc (`work_tasks`):** Bổ sung thêm trường `vendor_id` song song với `assigned_to` (nhân viên nội bộ). Một task chỉ được có 1 trong 2.
- **UI Giao việc (Quick-Add):** Tại ô chọn người, chia 2 tab: "Nội bộ" và "Thợ ngoài". Cho phép gõ tên thợ ngoài mới và lưu ngay lập tức (Quick-Add) mà không cần vào trang Quản lý nhân sự.

## 3. ẢNH HƯỞNG HỆ THỐNG (IMPACT ANALYSIS)

### 💰 Tài chính & Kế toán
- **Tính Lợi Nhuận (Profit):** Không đổi. Chi phí thợ ngoài (`cost` trong `work_tasks`) vẫn được trừ trực tiếp vào doanh thu hợp đồng để ra biên lợi nhuận chính xác.
- **Tính Lương (Payroll):** `salary-actions.ts` sẽ chỉ tính lương theo show cho những task có `assigned_to` (nhân viên nội bộ). Khắc phục triệt để lỗi thợ ngoài bị lọt vào bảng lương.
- **Công Nợ (Payables):** Tách ra một mục "Công nợ thợ ngoài" riêng. Kế toán sẽ tổng hợp công nợ theo từng `vendor_id` và tạo Phiếu Chi (Expense) để thanh toán.

### 📈 Năng suất (Productivity)
- **Nhân sự nội bộ:** Báo cáo KPI, năng suất (số show, khối lượng công việc) vẫn giữ nguyên.
- **Thợ ngoài:** Không tính vào KPI nội bộ. Thay vào đó, có một báo cáo riêng là "Tần suất sử dụng thợ ngoài" (Vendor Usage Report) để biết đang thuê ai nhiều nhất, chi phí bao nhiêu.

## 4. TÍNH NĂNG

### 🚀 MVP (Bắt buộc có):
- [ ] Cho phép thêm nhiều mốc "Ngày sự kiện" lúc tạo/sửa hợp đồng.
- [ ] Tạo bảng `vendors` và cập nhật bảng `work_tasks` thêm `vendor_id`.
- [ ] Cập nhật UI Giao Việc (EventTaskModal) để có tab "Thợ ngoài" + tính năng Quick-Add.
- [ ] Cập nhật UI Báo cáo Năng suất: Ẩn thợ ngoài khỏi bảng KPI nội bộ.
- [ ] Xây dựng màn hình "Công nợ thợ ngoài" cơ bản cho kế toán.

### 🎁 Phase 2 (Làm sau):
- [ ] Gửi SMS/Email tự động báo lịch cho thợ ngoài (không cần tài khoản login).
- [ ] Đánh giá (Rating) chất lượng thợ ngoài sau mỗi show.

## 5. BƯỚC TIẾP THEO
→ Hệ thống đã sẵn sàng. Vui lòng chạy lệnh `/plan` để lên thiết kế chi tiết (Database Schema, API, Frontend Changes).
