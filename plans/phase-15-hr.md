# Phase 15: HR & Attendance

**Status:** 🟡 Stitch Done (2/2 screens)
**Dependencies:** Phase 01 (Auth/Users), Phase 02 (Database)
**Est.:** 2 days

## Objective

Hồ sơ nhân viên (NV chính thức + CTV), chấm công, hoa hồng theo job. Đơn xin nghỉ/tạm ứng.

## Implementation Steps

### Nhân viên
- [ ] DB: Bảng `employees` (code, name, phone, department, role, type ENUM 'fulltime'|'parttime'|'collaborator')
- [ ] CRUD hồ sơ nhân viên
- [ ] Phân loại NV/CTV
- [ ] Hoa hồng theo job (link contract → employee → commission)
- [ ] Avatar upload (Supabase Storage)

### Chấm công
- [ ] DB: Bảng `attendance` (employee_id, date, check_in, check_out, status)
- [ ] Chấm công theo ngày
- [ ] Tổng hợp tháng: số ngày công, đi muộn, nghỉ
- [ ] Calendar view attendance

### Đơn xin
- [ ] DB: Bảng `requests` (type ENUM 'leave'|'advance', requester_id, amount, status, approver_id)
- [ ] Nghỉ phép: có lương / không lương
- [ ] Tạm ứng: amount + lý do
- [ ] Duyệt flow: Chờ → Duyệt / Từ chối (Manager/Admin)
- [ ] Liên kết bảng lương (tạm ứng → trừ vào salary)

## Test Criteria
- [ ] CRUD nhân viên OK
- [ ] Chấm công ghi đúng giờ
- [ ] Đơn xin duyệt → update status
- [ ] Tạm ứng link vào bảng lương

---
**Next Phase:** → Phase 16 (Payroll)
