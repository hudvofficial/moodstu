# 💡 BRIEF: Tối ưu hoá Giao diện Danh sách Khách hàng CRM (/crm/customers)

**Ngày tạo:** 23/05/2026
**Brainstorm cùng:** User

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
- Hiện tại, trang danh sách khách hàng (`/crm/customers`) đang sử dụng giao diện dạng Card (Thẻ) (`CustomerCard` và `CustomerCompactCard`).
- Việc hiển thị bằng Card gây chiếm không gian màn hình, khó bao quát thông tin khi số lượng khách hàng lớn.
- Thiếu tính trực quan khi muốn so sánh và quét (scan) thông tin các khách hàng nhanh chóng, đặc biệt trên màn hình Desktop.
- Cần một trải nghiệm tương tác liền mạch hơn (không cần chuyển trang) khi xem chi tiết khách hàng và thực hiện các thao tác nghiệp vụ.

## 2. GIẢI PHÁP ĐỀ XUẤT (THEO CHUẨN `/contracts`)
Thay thế hoàn toàn cấu trúc Card hiện tại bằng cấu trúc **Data Table + Drawer** (giống với thiết kế đang rất thành công ở module `/contracts`):

1. **Customers Table (Dạng Bảng)**
   - Hiển thị trực quan dưới dạng bảng với các cột thiết yếu: Mã KH, Thông tin KH (Avatar, Tên, SĐT), Nguồn (Source Badge), Ngày tạo, Phân loại/Tags.
   - Hỗ trợ cuộn ngang trên mobile hoặc có layout tối ưu riêng cho mobile (giữ nguyên List/Card trên mobile nếu cần, nhưng Desktop phải là Bảng).
   - Sticky header và sticky action column.

2. **Customer Drawer (Khay chi tiết)**
   - Khi người dùng click vào một khách hàng, một Drawer sẽ trượt ra từ bên phải.
   - **Nội dung Drawer:**
     - **Header:** Tên khách hàng, Mã KH, SĐT, Avatar. Các action buttons: Chỉnh sửa (Edit), Xoá (Delete), Gọi điện/Zalo.
     - **Tab 1: Thông tin chung:** Các thông tin chi tiết (Email, Địa chỉ, Ngày sinh, Ngày cưới, Thông tin Cô dâu/Chú rể, Notes...).
     - **Tab 2: Lịch sử tương tác/Hợp đồng:** (Tính năng mở rộng - Nice to have) Các hợp đồng liên quan đến khách hàng này.

3. **Nghiệp vụ đầy đủ**
   - Tích hợp Dropdown Menu ở cột "Thao tác" trên Table và các nút thao tác trên Header của Drawer.
   - Các tính năng: Thêm mới, Chỉnh sửa, Xoá khách hàng.
   - Realtime update khi có thay đổi (sử dụng SWR và Realtime hooks sẵn có).

## 3. ĐỐI TƯỢNG SỬ DỤNG
- **Primary:** Nhân viên Sales / Telesales (cần quét danh sách nhanh, gọi điện, thao tác liên tục).
- **Secondary:** Quản lý / Admin (cần xem tổng quan dữ liệu).

## 4. NGHIÊN CỨU & AUDIT HIỆN TRẠNG (MAPPING)

### Các Components Cần Thay Đổi/Tạo Mới:
| Hiện tại (`/crm/customers`) | Thay thế / Cập nhật thành |
|---|---|
| `CustomerCompactCard`, `CustomerCard` | ➡️ `CustomersTable` (tương tự `ContractsTable`) |
| `CustomerListPage` | ➡️ `CustomerListClient` (Tích hợp Table và quản lý state Drawer) |
| Chuyển trang khi click xem chi tiết | ➡️ Bật `CustomerDrawer` ngay trên màn hình hiện tại |

### Ưu điểm của giải pháp mới:
- **Tốc độ:** Xem chi tiết tức thì (0 delay) nhờ Drawer thay vì tải trang mới.
- **Không gian:** Table hiển thị được nhiều hàng hơn trên một màn hình Desktop so với Card.
- **Đồng bộ UX:** Người dùng đã quen với cách hoạt động của `/contracts`, áp dụng chung một pattern sẽ giúp giảm thời gian làm quen (learning curve).

## 5. TÍNH NĂNG CHI TIẾT

### 🚀 MVP (Bắt buộc có):
- [ ] Component `CustomersTable` cho màn hình lớn (Desktop/Tablet).
- [ ] Component `CustomerDrawer` với thiết kế giống `ContractDrawer`.
- [ ] Tích hợp đầy đủ CRUD (Tạo mới qua modal cũ, Sửa qua Drawer/Modal, Xoá qua Dialog xác nhận).
- [ ] Giữ nguyên các bộ lọc (Filters) hiện tại và áp dụng vào cấu trúc mới.

### 🎁 Phase 2 (Làm sau):
- [ ] Tab "Hợp đồng liên quan" ngay trong `CustomerDrawer` để xem khách hàng này đã chốt bao nhiêu HĐ.

## 6. ƯỚC TÍNH SƠ BỘ
- **Độ phức tạp:** Trung bình (Medium). Form khách hàng đã có sẵn (`CustomerFormModal`), chỉ cần build lại Table và Drawer.
- **Rủi ro:** Cần chú ý responsive trên màn hình Mobile (nếu dùng Table trên mobile có thể khó nhìn, cần cân nhắc render dạng Card trên Mobile và Table trên Desktop, giống cách `/contracts` đang làm).

## 7. BƯỚC TIẾP THEO
→ **Anh xem qua Brief này, nếu thấy chuẩn rồi thì gõ `/plan` để em bắt đầu thiết kế chi tiết (component tree, data flow) nhé!**
