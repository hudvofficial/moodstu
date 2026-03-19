# 🎨 DESIGN: CRM Lead Detail & History (Phase E)

## 1. Dữ liệu & Cấu trúc (Data Architecture)

### 1.1. Care Log Structure
Mỗi entry trong `care_history` sẽ có cấu trúc JSON:
```json
{
  "id": "uuid",
  "type": "call" | "meeting" | "note" | "quote",
  "content": "string",
  "date": "ISOString",
  "author": "EmployeeName"
}
```

### 1.2. Convert Lead Logic
Khi bấm "Chuyển thành Hợp đồng":
1. Kiểm tra Lead đã có SĐT chưa.
2. Gọi server action `convertToContract`.
3. Action này sẽ tạo 1 `Customer` mới (nếu chưa có).
4. Tạo `Contract` nháp (Draft) với thông tin từ Lead nhu cầu.
5. Redirect người dùng sang trang soạn thảo Hợp đồng V2.

## 2. Các Thành phần Giao diện

### 2.1. CareTimeline (Stripe Style)
- **Visual:** Đường line mờ chạy dọc bên trái. Các icon Lucide (`Phone`, `MessageSquare`, `Calendar`) nằm trong vòng tròn badge.
- **Interaction:** Input "Type something..." mờ, khi click vào mới mở rộng thành textarea và nút "Lưu".

### 2.2. TagsInput (Keyboard-First)
- **Visual:** Chip tags bo góc tròn (`rounded-full`). 
- **Interaction:** 
  - Gõ vào hiện danh sách gợi ý.
  - Phím Enter để chọn.
  - Phím Backspace để xóa tag cuối cùng.

### 2.3. LeadFormModal (Slide-up)
- **Mobile:** Trượt từ dưới lên (Drawer).
- **Desktop:** Modal scale-in trung tâm.
- **Fields:** Chia thành 2 cột trên Desktop để tối ưu không gian.

## 3. Quy tắc Kiểm tra (Acceptance Criteria)
- [ ] Timeline hiển thị đúng thứ tự thời gian (mới nhất trên cùng).
- [ ] Form chăm sóc có loading state khi đang lưu.
- [ ] Nút "Chuyển đổi" chỉ hiện khi Lead chưa là Hợp đồng.
- [ ] Xóa Lead có xác nhận (Confirmation Dialog) chuẩn V2.

---
*Tạo bởi Antigravity v4.0 - CRM v2 Design Phase E*
