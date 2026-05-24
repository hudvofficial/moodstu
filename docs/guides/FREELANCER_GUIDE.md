# 📘 Hướng Dẫn: Quản Lý Freelancer - CTV vs Thợ Ngoài

**Audience**: Admin, Manager, Kế toán  
**Last Updated**: 2026-05-25

---

## 🎯 Tổng Quan

Hệ thống hỗ trợ **2 loại freelancer khác nhau** với mục đích và cách quản lý khác nhau:

### 1️⃣ CTV (Cộng Tác Viên) - Employee Freelancer

**Định nghĩa**: Freelancer chính thức, được quản lý như nhân viên

**Khi nào dùng:**
- Làm việc thường xuyên, dài hạn
- Cần tracking lương hàng tháng
- Có lương cơ bản + lương theo sản phẩm
- Cần payslip, báo cáo lương
- Có thể cần tài khoản login

**Ví dụ**: Nhiếp ảnh viên freelance làm 3-4 job/tháng, nhận lương cơ bản 5tr + lương theo job

---

### 2️⃣ Thợ Ngoài (Vendor) - External Contractor

**Định nghĩa**: Thợ thuê ngoài theo job, không phải nhân viên

**Khi nào dùng:**
- Thuê theo job, ngắn hạn
- Không cần tracking lương hàng tháng
- Chỉ thanh toán theo job hoàn thành
- Không cần payslip
- Không cần tài khoản login

**Ví dụ**: Makeup artist thuê ngoài cho 1 job wedding, phí 2tr/job

---

## 🔄 So Sánh Chi Tiết

| Tiêu Chí | CTV (Employee) | Thợ Ngoài (Vendor) |
|----------|----------------|---------------------|
| **Loại** | Nhân viên freelance | Thợ thuê ngoài |
| **Bảng database** | `employees` (role='ctv') | `vendors` |
| **Mã** | employee_code (VD: NV-006) | Không có mã riêng |
| **Lương cơ bản** | ✅ Có (trong salary_info) | ❌ Không |
| **Lương sản phẩm** | ✅ Có (từ work_tasks) | ❌ Không (chỉ cost/job) |
| **Payroll hàng tháng** | ✅ Có (employee_salaries) | ❌ Không |
| **Giao việc** | assigned_to trong work_tasks | vendor_id trong work_tasks |
| **UI hiển thị** | Badge "CTV" | Badge "Thợ ngoài" |
| **Tài khoản login** | ✅ Có thể có | ❌ Không |
| **Báo cáo** | Trong /finance/salaries | Trong /finance/salaries tab "Chi phí thợ ngoài" |

---

## 📝 Cách Tạo CTV

### Bước 1: Tạo Nhân Viên Mới
1. Vào **Nhân sự** → **Thêm nhân viên**
2. Điền thông tin cơ bản:
   - Họ tên
   - Số điện thoại
   - Email (nếu cần login)

### Bước 2: Chọn Role và Department
- **Role**: Chọn "CTV"
- **Department**: "Cộng tác viên" hoặc department tương ứng (VD: "Sản xuất")
- **Vị trí**: VD: "Nhiếp ảnh viên freelance"

### Bước 3: Cấu Hình Lương (Admin Only)
- **Lương cơ bản**: 
  - Nếu CTV có lương cố định hàng tháng → nhập số tiền (VD: 5,000,000)
  - Nếu CTV chỉ nhận lương theo job → để `0`
- **Thông tin ngân hàng**: Điền để thanh toán lương

### Bước 4: Lưu
- System tự generate mã nhân viên (VD: NV-006, CTV-001)
- CTV xuất hiện trong danh sách nhân viên với badge "CTV"

---

## 📝 Cách Tạo Thợ Ngoài (Vendor)

### Quick-Add trong Task Assignment
1. Mở **Hợp đồng** → **Chi tiết hợp đồng**
2. Click vào event (VD: "Ngày chụp")
3. Trong modal giao việc:
   - Chọn tab **"Thợ ngoài"**
   - Click **"+ Thêm thợ ngoài mới"**
4. Điền:
   - Họ tên thợ ngoài
   - Số điện thoại
   - Loại dịch vụ (VD: "Makeup", "Cameraman")
5. **Lưu** → Thợ ngoài được tạo và gán vào job luôn

**Lưu ý**: Không cần tạo vendor trước, quick-add khi cần dùng

---

## 💰 Cách Tính Lương

### CTV (Employee)
**Tự động mỗi cuối tháng:**

```
Lương CTV = Base Salary + Product Salary + Bonus - Penalty

Trong đó:
- Base Salary: Lương cơ bản từ salary_info (cố định)
- Product Salary: Tổng cost các work_tasks hoàn thành trong tháng
- Bonus/Penalty: Điều chỉnh thủ công (nếu có)
```

**Ví dụ**: CTV Nguyễn Văn A
- Base salary: 5,000,000đ
- Jobs hoàn thành tháng 6:
  - Job 1: 3,000,000đ (chụp cưới)
  - Job 2: 2,500,000đ (chụp concept)
- **Tổng lương tháng 6**: 5,000,000 + 3,000,000 + 2,500,000 = **10,500,000đ**

### Thợ Ngoài (Vendor)
**Không có payroll tự động**

- Mỗi job có cost riêng trong work_tasks
- Admin xem tổng chi phí vendor trong `/finance/salaries` → tab "Chi phí thợ ngoài"
- Thanh toán thủ công theo từng job hoặc định kỳ (chưa có payment tracking tự động)

**Ví dụ**: Vendor Trần Thị B (makeup artist)
- Job 1: 2,000,000đ (wedding)
- Job 2: 1,500,000đ (concept)
- **Tổng chi phí tháng 6**: 3,500,000đ (không tự động vào payroll)

---

## 🔄 Workflow: Giao Việc

### 1. Giao Việc Cho CTV
```
Contract → Event → Modal giao việc
  → Tab "Nhân viên"
  → Dropdown: Chọn CTV từ danh sách employees
  → Nhập cost (lương cho job này)
  → Lưu
```

✅ **Kết quả**: 
- work_tasks.assigned_to = CTV_ID
- Cost được tính vào product_salary cuối tháng

### 2. Giao Việc Cho Thợ Ngoài
```
Contract → Event → Modal giao việc
  → Tab "Thợ ngoài"
  → Dropdown: Chọn vendor (hoặc quick-add mới)
  → Nhập cost (chi phí thuê)
  → Lưu
```

✅ **Kết quả**:
- work_tasks.vendor_id = VENDOR_ID
- Cost KHÔNG tính vào payroll (chỉ tracking riêng)

---

## 📊 Xem Báo Cáo

### CTV: Trong Bảng Lương
1. Vào **Tài chính** → **Bảng lương**
2. Chọn tháng/năm
3. Filter **Loại** → **CTV**
4. Xem chi tiết: base_salary, product_salary, total

### Thợ Ngoài: Trong Tab Riêng
1. Vào **Tài chính** → **Bảng lương**
2. Click tab **"Chi phí thợ ngoài"**
3. Chọn tháng/năm
4. Xem:
   - Tổng chi phí vendor
   - Chi phí từng vendor
   - Số job / vendor
   - Hợp đồng liên quan

---

## ❓ FAQ

### Q1: Khi nào nên dùng CTV thay vì Thợ Ngoài?
**A**: Dùng CTV khi:
- Làm việc thường xuyên (≥ 3-4 jobs/tháng)
- Cần lương cơ bản hàng tháng
- Cần tracking chặt chẽ (payslip, báo cáo)

Dùng Thợ Ngoài khi:
- Thuê theo job, không thường xuyên
- Chỉ thanh toán theo job hoàn thành
- Không cần lương cố định hàng tháng

### Q2: CTV có thể có lương cơ bản = 0 không?
**A**: Có. Nếu CTV chỉ nhận lương theo job (product_salary), set base_salary = 0.

### Q3: Vendor có xuất hiện trong bảng lương không?
**A**: KHÔNG. Vendor chỉ xuất hiện trong tab "Chi phí thợ ngoài", không có employee_salaries records.

### Q4: Làm sao biết CTV hay Vendor khi xem task?
**A**: Xem badge:
- Badge **"CTV"**: Employee freelancer
- Badge **"Thợ ngoài"**: Vendor

### Q5: Có thể chuyển Vendor thành CTV không?
**A**: Không tự động. Cần:
1. Tạo employee mới với role=ctv
2. Gán jobs cho employee đó thay vì vendor
3. (Optional) Xóa vendor record nếu không dùng nữa

---

## 🚨 Lưu Ý Quan Trọng

### 1. CTV Không Xuất Hiện Trong Bảng Lương?
**Check**:
- CTV có `status='active'`? (không phải 'inactive')
- CTV có `base_salary` trong salary_info? (có thể = 0)
- Đã generate salary cho tháng đó chưa? (Click "Tạo bảng lương")

**Fix**: Chạy script `scripts/check-freelancer-salary.sql`

### 2. Vendor Cost Không Tracking Được?
**Hiện tại**: Vendor cost chỉ xem được tổng hợp theo tháng, chưa có:
- Payment tracking (đã trả/chưa trả)
- Advance payment
- Remaining amount

**Roadmap**: Sẽ có `vendor_payments` table trong tương lai.

### 3. Terminology Đã Đổi
- **Cũ**: Vendor badge hiển thị "Freelancer"
- **Mới**: Vendor badge hiển thị "Thợ ngoài"
- **Lý do**: Tránh nhầm lẫn với CTV (cũng là freelancer)

---

## 🔗 Tài Liệu Liên Quan

- [FREELANCER_SYSTEM_AUDIT.md](../../FREELANCER_SYSTEM_AUDIT.md) - Audit chi tiết toàn bộ hệ thống
- [EMPLOYEES_BRIEF.md](../briefs/EMPLOYEES_BRIEF.md) - Brief module nhân sự
- [FINANCE_ISSUES_FIX_GUIDE.md](../../FINANCE_ISSUES_FIX_GUIDE.md) - Fix guide cho finance module

---

**Version**: 1.0  
**Author**: System Documentation  
**Last Updated**: 2026-05-25
