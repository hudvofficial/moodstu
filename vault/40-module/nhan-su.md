---
title: "Module Nhân sự & công việc"
tags: [module, nhan-su]
cap-nhat: 2026-08-07
---

# Module Nhân sự & công việc

Danh bạ nhân sự, phân công việc theo hợp đồng, lương, năng suất.

**Thực tế: 7 nhân sự trong DB nhưng chỉ admin + kinh doanh có đăng nhập.** Phần lớn dòng `employees` là hồ sơ để phân công và tính lương, không phải tài khoản. → [[xac-thuc-phan-quyen]]

## Route

`/employees` · `/employees/[id]` (admin, manager) · `/productivity` (admin, manager, media)

## Vai trò trong DB vs trong app

`employee_role_enum` = `admin · manager · sale · media · **ctv**`
`Role` trong app = `admin · manager · sale · media · **viewer**`

`normalizeRole()` map `ctv → viewer`; giá trị lạ **âm thầm** tụt xuống `viewer`, không báo lỗi.

**CTV trả theo job, không có lương cơ bản** → UI ẩn ô "Lương cơ bản" cho vai `ctv`.

## Tự động tạo hồ sơ

Trigger **`on_auth_user_created`** tự chèn dòng `employees` khi tạo auth user.
→ Script seed phải **`UPDATE`**, không `INSERT`, nếu không sẽ trùng.

## Công việc (`work_tasks`)

`work_type_enum` 13 loại: `concept · kich_ban · chup_anh · quay_phim · makeup · tro_ly · cameraman · hau_ky_anh · dung_phim · retouch · premiere · bien_tap · khac`

Task gắn với `contract_events`. Có kiểm chồng lịch (`task-overlap-actions.ts`).
Công việc giao **nhà cung cấp ngoài** hay **ekip nội bộ** đều là cam kết chi phí `work_tasks.cost` (ADR-016); tiền trả ghi ở `/finance/payables` (thợ ngoài · ekip) — không còn `upsert_vendor_expense` → [[nha-cung-cap]], [[luong-tien]].

## Lương

| Bảng | Ý nghĩa |
|---|---|
| `employee_salaries` | **dữ liệu dẫn xuất, tái sinh được** |
| `monthly_salaries` | lương tháng |
| `salary_adjustments` | điều chỉnh |

⚠️ **`employee_salaries` cố ý hard delete** — không có `deleted_at`. Đừng "sửa" thành soft delete: sẽ phá chức năng tái tạo và làm sai tổng.

**ADR-016 M3 (2026-08-26):** công theo hợp đồng của ekip **không** đi qua sheet lương nữa — `generateMonthlySalaries` đặt `product_salary = 0`; từng task hoàn thành là một khoản **phải trả** ở `/finance/payables` › Ekip (`payable_items('employee')` đọc `work_tasks.assigned_to`), trả bằng phiếu chi `payee_type='employee'` + `expense_allocations(work_task)`. Sheet lương tháng chỉ còn lương cứng (`employees.salary_info.base_salary`) — Mood chưa có → tạm không dùng; dòng test 100.000.000 T6/2026 đã xoá. Chi tiết: [[luong-tien]].

**ADR-016 M5 (2026-08-27):** sheet chỉ sinh dòng cho người có `salary_info.base_salary > 0` (`generateMonthlySalaryAction`); `total_salary` (cơ bản + thưởng − phạt) là **overhead accrual** `cost_salary_base` của sổ kỳ (cột `monthly_salary` bỏ dùng — không code nào ghi). Trả lương (`payEmployeeSalaryAction` hoặc `/finance/payables › Ekip`) đi qua `record_payee_payment_atomic('employee')` → phiếu chi + `expense_allocations(employee_salary)`; `paid_amount/remaining_amount` của dòng lương **dẫn xuất** từ phân bổ (`sync_employee_salary_paid`) — huỷ phiếu chi thì nợ quay lại; thưởng/phạt đổi thực nhận thì còn lại đi theo. Cấu hình lương test `base_salary` 100tr ở tài khoản Admin: user quyết xoá.

## Năng suất

`productivity-actions.ts` chỉ gọi RPC, không chạm bảng: `get_employee_productivity`, `get_my_employee_productivity`, `get_employee_job_details`, `get_my_employee_job_details`.
Cặp `get_X` / `get_my_X` = xem người khác vs xem chính mình — **giữ đúng cặp khi sửa quyền**.

## Bảng

[[luoc-do-nhan-su]] — `employees` · `employee_salaries` · `monthly_salaries` · `salary_adjustments` · `attendance` · `work_shifts` · `work_tasks` · `schedules` · `evaluations` · `requests`

`attendance`, `work_shifts`, `evaluations`, `requests` hiện **rỗng** — đã dựng, chưa dùng.

## Bẫy đã cháy

**Seed E2E rò vào dropdown production.** Test E2E seed vào DB chung; dọn dẹp chỉ ở `afterAll` → khi fail, nhân sự tên "E2E" ở trạng thái active lọt vào mọi picker nhân sự thật.
Fix: quét tự lành có giới hạn thời gian ở `beforeAll` (`tests/e2e/e2e-sweep.ts`).

**Ô nhập số xoá trắng búng về 0** — `Number("") === 0`. Dùng state string + `placeholder="0"`.

## Liên quan

[[hop-dong]] · [[tai-chinh]] · [[nha-cung-cap]] · [[xac-thuc-phan-quyen]]
