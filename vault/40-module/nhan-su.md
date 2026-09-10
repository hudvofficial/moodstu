---
title: "Module Nhân sự & công việc"
tags: [module, nhan-su]
cap-nhat: 2026-08-31
trang-thai: da-kiem-2026-08-31
doi-chieu: agent/system-map/04-crm-nhan-su.md · 08-dichvu-muctieu-nangsuat.md · vault/30-du-lieu/than-ham/nhan-su.md
---

# Module Nhân sự & công việc

Danh bạ nhân sự, phân công việc theo hợp đồng, lương, năng suất.

**Số nhân sự đang lệch giữa 3 nguồn** — đừng chép số vào đây: bản cũ của trang này ghi 7, [[luoc-do-nhan-su]] (introspect DB) ghi **12 dòng**, `agent/CURRENT_STATE.md:40` (đo prod 26/08) ghi **10 nhân viên active**. Lấy số ở nguồn sinh tự động.

Điều **không đổi**: chỉ admin + kinh doanh có đăng nhập; phần lớn dòng `employees` là hồ sơ để phân công và tính lương, không phải tài khoản. → [[xac-thuc-phan-quyen]]

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

`productivity-actions.ts` chỉ gọi RPC, không chạm bảng **nghiệp vụ**: `get_employee_productivity`, `get_my_employee_productivity`, `get_employee_job_details`, `get_my_employee_job_details`. (Gián tiếp vẫn đọc `studio_info` để lấy múi giờ, qua `resolveProductivityViewerContext` → `lib/productivity-auth.ts:37-42`, admin client.)

Cặp `get_X` / `get_my_X` = xem người khác vs xem chính mình — **giữ đúng cặp khi sửa quyền**. Bảo vệ ở đây mạnh hơn mô tả cũ: hai nhánh dùng **hai loại Supabase client khác nhau** (`createAdminClient` `:46` cho nhánh team vs `createClient` `:93` cho nhánh self), hai mức GRANT khác nhau, và bản self **ép `total_cost = NULL` ngay ở tầng DB** (`20260428170000:189`). Hai lớp DB + TS, hiếm trong repo — đừng làm phẳng.

⚠️ **Quyền vào `/productivity` KHÔNG do `ROLE_PERMISSIONS` quyết định.** Ma trận ở `types/roles.ts` chỉ điều khiển hiển thị nav (`sidebar.tsx:39`, `bottom-nav.tsx:56`); route thật gác bằng `PRODUCTIVITY_ALLOWED_ROLES` (`types/productivity-constants.ts:27-31`) ở `page.tsx:27-33`, còn `canAccess(role,"productivity")` có **0 call-site**. Hôm nay hai nguồn trùng nhau (admin/manager/media) nên chưa phát tác — nhưng sửa `roles.ts` sẽ **không** đổi được quyền vào trang.

## Bảng

[[luoc-do-nhan-su]] — `employees` · `employee_salaries` · `monthly_salaries` · `salary_adjustments` · `attendance` · `work_shifts` · `work_tasks` · `schedules` · `evaluations` · `requests`

`attendance`, `work_shifts`, `evaluations`, `requests` hiện **rỗng** — đã dựng, chưa dùng.

## Bẫy đã cháy

**Seed E2E rò vào dropdown production.** Test E2E seed vào DB chung; dọn dẹp chỉ ở `afterAll` → khi fail, nhân sự tên "E2E" ở trạng thái active lọt vào mọi picker nhân sự thật.
Fix: quét tự lành có giới hạn thời gian ở `beforeAll` (`tests/e2e/e2e-sweep.ts`).

**Ô nhập số xoá trắng búng về 0** — `Number("") === 0`. Dùng state string + `placeholder="0"`.

**Cảnh báo payroll đã chết lặng.** `salary-actions.ts:259` và `:355` lọc `work_tasks.status = "Hoàn thành"` (chuỗi hoa có dấu) trong khi giá trị thật là `hoan_thanh` (`types/contract.ts:55`, `constants/work-statuses.ts:5,10`) → `validatePayrollWarningsAction` **luôn trả không cảnh báo** và `taskMap` trong `generateMonthlySalaryAction` luôn rỗng. Không sai tiền (vì `product_salary` bị ép 0 từ M3), nhưng cảnh báo "task chưa gán / cost 0đ" không còn chạy.

**Cột tổng của `monthly_salaries` là dead column đọc được.** `base_salary_total` · `product_salary_total` · `bonus_total` · `penalty_total` · `advance_total` được UI **đọc** (`finance-operations-queries.ts:711,749-753`) nhưng **không code nào ghi** → luôn 0/NULL, luôn rơi vào nhánh `||` tính lại từ `items`. Đừng "sửa" bằng cách tin giá trị trong cột.

**Hai cách cộng `monthly_salaries.total_salary` không khớp nhau:** Σ `total_salary` khi lập (`salary-actions.ts:445`) nhưng Σ `net_salary` khi điều chỉnh (`:79`) và khi xoá dòng (`:227`). Hiện `advance_payment` luôn 0 nên hai cách trùng — **sẽ lệch ngay khi có tạm ứng**.

## Liên quan

[[hop-dong]] · [[tai-chinh]] · [[nha-cung-cap]] · [[xac-thuc-phan-quyen]]
