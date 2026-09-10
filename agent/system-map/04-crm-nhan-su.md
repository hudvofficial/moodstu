# Bản đồ kiến trúc — Miền CRM/Khách hàng + Nhân sự/Lương

> Gốc: `C:\Users\Admin\Desktop\Ai\mood saas\mood-studio`. Mọi đường dẫn dưới đây là **tương đối** so với gốc đó.
> Quy tắc: chỉ đọc file, **không chạm DB**. Mọi khẳng định có `file:dòng`. Không đọc được → mục 8 "Chưa xác minh".

---

## 1. Bảng dữ liệu

### 1.1 Quan hệ khoá ngoại quanh `employees` — chỗ hay nhầm nhất

Ba id khác nhau trong hệ thống:

| Khái niệm | Nằm ở đâu | Ghi chú |
|---|---|---|
| **auth user id** (`auth.users.id`) | `employees.auth_user_id` | Cột thật tên `auth_user_id`. **KHÔNG tồn tại cột `employees.user_id`** — `types/database.types.ts:1619-1637` liệt kê đủ 18 cột của `employees`, không có `user_id`; mọi hit `user_id` trong repo đều thuộc bảng `moodie_*` (`app/actions/moodie-mutations.ts:85` v.v.). `types/employee.ts:19` cũng chỉ khai `auth_user_id`. |
| **employee id** (`employees.id`) | khoá chính | Là đích của mọi FK nhân sự. |
| **id hợp nhất (bẫy)** | trigger tự tạo | `supabase/migrations/20260521230000_auto_provision_employees_from_google.sql:30-31` INSERT `id = NEW.id` **và** `auth_user_id = NEW.id`. → Với mọi nhân sự do trigger sinh, `employees.id === auth_user_id`. Hệ quả: **nhầm lẫn giữa hai id không gây lỗi hiện hình trên dữ liệu hiện có**, nó chỉ nổ khi có dòng `employees` tạo tay (createEmployee) rồi mới gắn auth. |

FK thật (đọc từ `types/database.types.ts`, sinh từ DB):

| Cột | Trỏ tới | Bằng chứng |
|---|---|---|
| `crm_leads.created_by` | **`employees.id`** (FK `crm_leads_created_by_fkey`) | `types/database.types.ts` khối `crm_leads` → Relationships, `foreignKeyName: "crm_leads_created_by_fkey"`, `referencedRelation: "employees"` (dòng ~975-985); vault `30-du-lieu/luoc-do-khach-hang-crm.md:118` ghi ON DELETE SET NULL |
| `crm_leads.assigned_to` | `employees.id` (FK `crm_leads_assigned_to_fkey`) | như trên; code embed FK: `app/actions/lead-actions.ts:379` `.select("*, employees:assigned_to ( id, full_name )")` |
| `customers.created_by` | **KHÔNG có FK** | `types/database.types.ts` khối `customers` → `Relationships` chỉ có duy nhất `customers_lead_id_fkey` (`lead_id → crm_leads.id`). `created_by` là uuid tự do. |
| `customers.lead_id` | `crm_leads.id` | như trên |
| `work_tasks.assigned_to` | `employees.id` | `types/database.types.ts` khối `work_tasks` → `work_tasks_assigned_to_fkey` → `employees` |
| `work_tasks.vendor_id` | `vendors.id` | `work_tasks_vendor_id_fkey` |
| `employee_salaries.employee_id` | `employees.id` | vault `luoc-do-nhan-su.md:114` |
| `employee_salaries.monthly_salary_id` | `monthly_salaries.id` ON DELETE CASCADE | vault `luoc-do-nhan-su.md:114` |
| `salary_adjustments.employee_salary_id` | `employee_salaries.id` ON DELETE CASCADE | vault `luoc-do-nhan-su.md:182` |

### 1.2 `created_by` — ai ghi giá trị gì (đây là chỗ **thật sự** lệch)

| Đường ghi | Cột | Giá trị được ghi | file:dòng |
|---|---|---|---|
| `createLead()` | `crm_leads.created_by` | **`employee.id`** | `app/actions/lead-actions.ts:212` (`created_by: employee.id`) |
| `createCustomer()` | `customers.created_by` | **`userId`** = auth user id | `app/actions/customer-actions.ts:168` (`created_by: userId`) |
| RPC `convert_lead_to_customer` | `customers.created_by` | **`v_lead.created_by`** = `employees.id` | `supabase/migrations/20260427030000_crm_rpc_hardening.sql:141,152` |
| `addSalaryAdjustment()` | `salary_adjustments.created_by` | `userId` (auth) | `app/actions/salary-actions.ts:106` |
| `generateMonthlySalaryAction()` | `monthly_salaries.created_by` | `userId` (auth) | `app/actions/salary-actions.ts:326` |
| `addTask()` / `_generateWorkTasksInternal()` | `work_tasks.created_by` | `userId` (auth) | `app/actions/work-task-actions.ts:160, 240, 381` |

→ **`customers.created_by` chứa HAI loại id khác nhau tuỳ đường tạo.** Vì cột không có FK, DB không chặn. Hiện tại không màn hình nào đọc `customers.created_by` (không tìm thấy select nào lấy cột này ở `app/actions/customer-actions.ts` — `CUSTOMER_LIST_FIELDS` `:20-46` không có `created_by`; `getCustomerById` select `*` `:115` nhưng UI không hiển thị) nên chưa gây sai số.

### 1.3 Bảng CRM

| Bảng | Vai trò | Cột dẫn xuất | Cột nhập tay | Ai ghi | file:dòng |
|---|---|---|---|---|---|
| `crm_leads` | Phễu lead. Xoá mềm (`deleted_at`) | `status_changed_at` (server đặt khi status đổi), `updated_at` | `contact_name`, `phone`, `email`, `source`, `needs`, `address`, `potential`, `notes`, `social_link`, `next_contact_date`, `deal_value`, `tags`, `score`, `contact_date` | `lead-actions.ts` (create/update/delete), `lead-lifecycle.ts` (move stage/assign/lost/convert), RPC `append_care_log` | `app/actions/lead-actions.ts:198-218, 269-312, 345-351`; `app/actions/lead-lifecycle.ts:45-46, 167-168, 195-202` |
| | | `care_history`, `care_type` — **chỉ RPC ghi** (append, không đọc-sửa-ghi) | | RPC `append_care_log` | `supabase/migrations/20260427030000_crm_rpc_hardening.sql:65-72` |
| | | `pipeline_order` — có cột, **không code nào ghi** (chỉ đọc trong `LEAD_LIST_FIELDS`) | | — | `app/actions/lead-actions.ts:43` (đọc); không tìm thấy chỗ ghi |
| `customers` | Hồ sơ khách. Xoá mềm | `customer_code` (`nextval_customer_code`, **không optimistic-patch**), `updated_at`, `lead_id` (chỉ RPC convert đặt) | `full_name`, `phone` (chuẩn hoá), `alt_phone`, `email`, `address`, `gender`, `date_of_birth`, `wedding_date`, `bride_*`, `groom_*`, `source`, `notes`, `tags` | `customer-actions.ts`, RPC `convert_lead_to_customer` | `app/actions/customer-actions.ts:150-151, 153-169, 228-243, 279-284` |
| | `ltv` | **tính ở TS**, không phải cột | | `getCustomers`/`getCustomerById` cộng `contracts.total_amount` | `app/actions/customer-actions.ts:93-97, 120` |

Chuẩn hoá SĐT: `normalizePhone` bỏ khoảng trắng/`-`/`()`/`.` và đổi `+84 → 0` — `app/actions/customer-actions.ts:53-55`. **Chỉ `createCustomer` gọi** (`:135`); `updateCustomer` chỉ `.trim()` (`:230`) → sửa SĐT qua form không chuẩn hoá. RPC convert dùng `BTRIM(v_lead.phone)` (`crm_rpc_hardening.sql:119,146`) — cũng không chuẩn hoá `+84`.

### 1.4 Bảng nhân sự / lương

| Bảng | Vai trò | Cột dẫn xuất | Cột nhập tay | Ai ghi | file:dòng |
|---|---|---|---|---|---|
| `employees` | Danh bạ nhân sự (≠ tài khoản). Xoá mềm + `status` | `employee_code` (RPC `next_employee_code`), `updated_at` | `full_name`, `gender`, `phone`, `email`, `department`, `position`, `role`, `start_date`, `salary_info` (jsonb), `avatar_url`, `notes` | `employee-mutations.ts`; trigger `on_auth_user_created` | `app/actions/employee-mutations.ts:118, 120-124, 213-216, 274-281, 323-330, 369-372`; whitelist cột: `types/employee-form.ts:41-45` |
| | `salary_info` được **merge** chứ không ghi đè | | | | `app/actions/employee-mutations.ts:207-210` |
| `employee_salaries` | Sheet lương tháng. **Hard delete, không có `deleted_at`** | `total_salary` = base + product + bonus − penalty; `net_salary` = total − advance; `bonus`/`penalty` = Σ `salary_adjustments`; `paid_amount`/`remaining_amount` | `notes` (không có UI ghi được tìm thấy) | `generateMonthlySalaryAction` (insert), `recalculateEmployeeSalary` (bonus/penalty/total/net/remaining), RPC `sync_employee_salary_paid` (paid/remaining) | `app/actions/salary-actions.ts:413-441, 56-70, 218`; `supabase/migrations/20260827130000_luong_cung_m5.sql:104-119` |
| | `monthly_salary`, `attendance_days`, `additional_days`, `total_work_days`, `total_work_hours`, `kpi_*` — **không code nào ghi** | | | — | ADR ghi rõ: `agent/DECISIONS.md:147` ("cột `monthly_salary` **không code nào ghi**"); `salary-actions.ts:424-438` insert không có các cột này |
| | `product_salary` **cố định = 0** từ ADR-016 M3 | | | | `app/actions/salary-actions.ts:420-421` (`void taskMap; const productSalary = 0;`) |
| `monthly_salaries` | Sổ tháng (1 dòng / tháng, UNIQUE `(year,month)`) | `total_salary` = Σ `net_salary`, `total_employees` | `salary_code` = `BL-YYYY-MM` | `generateMonthlySalaryAction`, `recalculateEmployeeSalary`, `deleteEmployeeMonthlySalaryAction` | `app/actions/salary-actions.ts:320-327, 446-448, 81-85, 230-232` |
| | `base_salary_total`, `product_salary_total`, `bonus_total`, `penalty_total`, `advance_total` — **không code nào ghi**, nhưng **UI đọc** | | | | ghi: không tìm thấy; đọc: `app/actions/finance-operations-queries.ts:711, 749-753` |
| `salary_adjustments` | Thưởng/phạt. CHECK `amount>0`, `type ∈ {bonus,penalty}`. **Hard delete** | — | `type`, `amount`, `reason`, `date` | `addSalaryAdjustment` / `deleteSalaryAdjustment` | `app/actions/salary-actions.ts:100-107, 142` |
| `work_tasks` | Phân công việc theo `contract_events`. **Hard delete** (`:278`) | `completion_date` (đặt khi `hoan_thanh`), `updated_at` | `work_type`, `assigned_to` **hoặc** `vendor_id`, `deadline`, `start_date`, `start_time`, `end_time`, `cost`, `notes`, `status` | `work-task-actions.ts`, `task-assign-actions.ts`, `calendar-task-actions.ts` | `app/actions/work-task-actions.ts:222-246, 296-298`; `app/actions/task-assign-actions.ts:81, 100, 135`; `app/actions/calendar-task-actions.ts:163-166, 279-283` |
| `schedules` | Lịch cá nhân/ekip (khác `work_tasks`) | `updated_at` | `event_date`, `end_date`, `location`, `role_in_event`, `event_type`, `notes` | `schedule-actions.ts` | `app/actions/schedule-actions.ts:27,47,69` |
| `attendance`, `work_shifts`, `evaluations`, `requests` | **Đã dựng, chưa dùng** — 0 dòng theo vault `luoc-do-nhan-su.md:20-25`; không tìm thấy server action nào ghi | — | — | — | không có `app/actions/*` nào tham chiếu (grep `attendance`/`work_shifts`/`evaluations`/`requests` trong `app/actions` không ra đường ghi) |

`work_tasks` có **CHECK ràng buộc loại trừ**: `(assigned_to NULL AND vendor_id NULL) OR (assigned_to NOT NULL AND vendor_id NULL) OR (assigned_to NULL AND vendor_id NOT NULL)` — vault `luoc-do-nhan-su.md:287` (introspect DB thật). **Code không kiểm** trước khi insert: `addTask` truyền cả hai nếu client gửi cả hai (`app/actions/work-task-actions.ts:223, 236`) → dựa hoàn toàn vào DB ném lỗi.

---

## 2. RPC & hàm DB

| Tên | Bảng chạm | Atomic | Gọi từ đâu | Trạng thái | file:dòng (bản mới nhất) |
|---|---|---|---|---|---|
| `convert_lead_to_customer(uuid)` | `crm_leads` (SELECT FOR UPDATE + UPDATE status), `customers` (INSERT hoặc UPDATE `lead_id`) | ✅ plpgsql, `FOR UPDATE` trên lead | `convertLeadToCustomer` | **còn sống** (chỉ 1 migration định nghĩa) | `supabase/migrations/20260427030000_crm_rpc_hardening.sql:82-168`; gọi ở `app/actions/lead-lifecycle.ts:240` |
| `nextval_customer_code()` | sequence `customer_code_seq` | ✅ (nextval) | `createCustomer`; và **bên trong** `convert_lead_to_customer` | **còn sống** | `..._crm_rpc_hardening.sql:28-35`; gọi ở `app/actions/customer-actions.ts:150`, `..._crm_rpc_hardening.sql:144` |
| `append_care_log(uuid,text,text)` | `crm_leads.care_history`, `care_type`, `updated_at` | ✅ (UPDATE append 1 câu) | `addCareLog` | **còn sống** | `..._crm_rpc_hardening.sql:37-80`; gọi ở `app/actions/lead-lifecycle.ts:282` |
| `get_crm_lead_stats()` | `crm_leads` (đọc) | — | `getLeadStatsScoped` (**chỉ khi role ≠ sale**) | **còn sống, bản mới nhất 30/05** (bản 27/04 bị thay) | `supabase/migrations/20260530120000_crm_audit_followups.sql:16-64`; gọi ở `app/actions/lead-actions.ts:405` |
| `get_crm_customer_stats()` | `customers`, `contracts` (đọc) | — | `getCustomerStats` | **còn sống, bản mới nhất 30/05** — bản 27/04 dùng cột `contracts.total_value` **không tồn tại**, migration 30/05 sửa thành `total_amount` | `..._crm_audit_followups.sql:66-105` (xem chú thích `:4`); gọi ở `app/actions/customer-actions.ts:309` |
| `get_customer_ltv(uuid[])` | `contracts` | — | **KHÔNG AI GỌI** | còn sống trong DB nhưng **dead** ở tầng app — chỉ xuất hiện ở `types/database.types.ts:6266`; `getCustomers` vẫn fetch `contracts` + cộng bằng JS | `..._crm_audit_followups.sql:110-122`; chỗ lẽ ra dùng: `app/actions/customer-actions.ts:92-98` |
| `next_employee_code()` | sequence `employee_code_seq` | ✅ | `createEmployee`, `getNextEmployeeCode` | **còn sống** | `supabase/migrations/20260429130000_employees_audit_fix.sql:18-25`; gọi ở `app/actions/employee-mutations.ts:46`, `app/actions/employee-queries.ts:198` |
| `employee_stats()` | `employees` | — | `getEmployeeStats` (có fallback TS nếu RPC thiếu) | **còn sống, bản mới nhất 29/04** (thay bản 22/04) | `..._employees_audit_fix.sql:27-54`; gọi ở `app/actions/employee-queries.ts:141` |
| `get_employee_productivity(date,date)` | `work_tasks` ⨝ `contracts` ⨝ `contract_events` ⨝ `employees` | — | `fetchTeamOverview` (**admin client**) | **còn sống** (DROP+CREATE 28/04) | `supabase/migrations/20260428170000_productivity_rpc_hardening.sql:10-84`; gọi ở `app/actions/productivity-actions.ts:52` |
| `get_my_employee_productivity(date,date)` | gọi lại hàm trên, lọc theo `auth.uid()`; **`total_cost` trả NULL** | — | `fetchSelfOverview` (**user client**, không phải admin) | **còn sống** | `..._productivity_rpc_hardening.sql:146-193` (NULL cost ở `:189`); gọi ở `app/actions/productivity-actions.ts:94` |
| `get_employee_job_details(uuid,date,date)` | `work_tasks` ⨝ `contracts` ⨝ `customers` ⨝ `contract_events` | — | `fetchJobDetailsInternal` chế độ team (admin client) | **còn sống** | `..._productivity_rpc_hardening.sql:86-144`; gọi ở `app/actions/productivity-actions.ts:138` |
| `get_my_employee_job_details(date,date)` | như trên, tự lọc `auth.uid()`, **`cost` NULL** | — | `fetchJobDetailsInternal` chế độ self (user client) | **còn sống** | `..._productivity_rpc_hardening.sql:195-241` (NULL cost ở `:238`); gọi ở `app/actions/productivity-actions.ts:125` |
| `sync_employee_salary_paid(uuid)` | `employee_salaries.paid_amount/remaining_amount` ← Σ `expense_allocations` (loại `employee_salary`, phiếu chi chưa xoá mềm) | ✅ (1 UPDATE) | **chỉ được gọi từ trong DB**: `record_payee_payment_atomic` và `void_payee_payment_atomic` | **mới, còn sống (M5, 27/08)** | `supabase/migrations/20260827130000_luong_cung_m5.sql:104-119`; điểm gọi `:236-237` và `:265-266` |
| `payable_items(text,uuid)` | `printing_orders`/`work_tasks`/`employee_salaries`/`inventory_transactions` + `expense_allocations` | — | `fetchPayableItems`; và nội bộ `record_payee_payment_atomic` (FIFO), `finance_payable_summary` | **còn sống, bản M5** — bản 26/08 (M3) **đã bỏ** nhánh `employee_salary`, bản 27/08 (M5) **thêm lại** | mới: `..._luong_cung_m5.sql:124-160` (nhánh lương `:144-147`); bản bị thay: `supabase/migrations/20260826180000_tien_ekip_va_can_thu.sql:46-...`; gọi ở `app/actions/payable-actions.ts:66` |
| `payable_remaining(text,uuid,uuid)` | như trên, 1 target | — | nội bộ `record_payee_payment_atomic` | **còn sống, bản 26/08** (M5 không thay) | `..._tien_ekip_va_can_thu.sql:26-43` (nhánh `employee_salary` ở `:38`) |
| `record_payee_payment_atomic(...)` | INSERT `expenses` + `expense_allocations`, gọi `sync_employee_salary_paid` | ✅ plpgsql SECURITY DEFINER, kiểm khoá kỳ, kiểm tổng phân bổ = số tiền | `payEmployeeSalaryAction`, `recordPayeePayment` | **còn sống, bản M5 (27/08)** — 4 bản chồng nhau: 25/08 → 26/08 (m2b) → 26/08 (ekip) → **27/08 M5** | `..._luong_cung_m5.sql:165-239`; gọi ở `app/actions/salary-actions.ts:182`, `app/actions/payable-actions.ts:112` |
| `void_payee_payment_atomic(uuid,uuid)` | xoá mềm `expenses`, gọi lại `sync_employee_salary_paid` | ✅ `FOR UPDATE`, kiểm khoá kỳ | `voidPayeePayment` | **còn sống, bản M5** | `..._luong_cung_m5.sql:244-269`; gọi ở `app/actions/payable-actions.ts:182` |
| `finance_payable_summary()` | gộp `labs`/`vendors`/`employees` ⨝ `payable_items` | — | `fetchPayables` | **còn sống, bản 26/08** (thêm nhánh `employee`) | `..._tien_ekip_va_can_thu.sql:84-104` (nhánh employee `:93`); gọi ở `app/actions/payable-actions.ts:39` |
| `finance_period_ledger(date,date)` | trả `cost_salary_base` = Σ `employee_salaries.total_salary` | — | tầng tài chính (ngoài miền này) | **còn sống, bản M5** — M2 dùng nhầm cột `monthly_salary` (luôn 0), M5 đổi sang `total_salary` | `..._luong_cung_m5.sql:8-99` (`:85-89`); bản bị thay: `supabase/migrations/20260826120000_cashflow_m2_ba_so.sql:105-108` |
| `handle_new_user()` + trigger `on_auth_user_created` | INSERT `public.employees` khi tạo `auth.users` | — (AFTER INSERT trigger) | tự động | **còn sống, chỉ 1 định nghĩa** (grep `handle_new_user` chỉ ra 1 file) | `supabase/migrations/20260521230000_auto_provision_employees_from_google.sql:2-49` |
| `is_active_employee()` | `employees` (SECURITY DEFINER) | — | dùng trong RLS policy `work_tasks_authenticated_read` v.v. | **còn sống** | `supabase/migrations/20260605030000_active_employee_rls_helper.sql:23-36` |
| `finance_health_check()` — mục `allocation_to_missing_target` | phát hiện `expense_allocations` trỏ `employee_salary` đã bị xoá | — | kiểm tra toàn vẹn | còn sống | `supabase/migrations/20260825200000_cashflow_m1_expense_allocations.sql:733-737` |

**Grant**: mọi RPC CRM + nhân sự đều `REVOKE ... FROM PUBLIC, anon, authenticated` + `GRANT ... TO service_role` (`..._crm_rpc_hardening.sql:278-288`, `..._crm_audit_followups.sql:171-177`, `..._employees_audit_fix.sql:79-83`, `..._productivity_rpc_hardening.sql:243-251`). **Ngoại lệ duy nhất**: `get_my_employee_productivity` và `get_my_employee_job_details` được GRANT thêm cho `authenticated` (`..._productivity_rpc_hardening.sql:250-251`) — đúng vì `fetchSelfOverview` gọi bằng user client (`app/actions/productivity-actions.ts:93`).

---

## 3. Server action & route

### 3.1 CRM

| Action | Route/UI dùng | RPC | file:dòng |
|---|---|---|---|
| `getLeads` / `getLeadsBootstrap` | `/crm`, `/crm/leads` | `get_crm_lead_stats` (chỉ non-sale) | `app/actions/lead-actions.ts:160, 458` |
| `getLeadStats` | `/crm/leads` | `get_crm_lead_stats` | `app/actions/lead-actions.ts:447` |
| `createLead` / `updateLead` / `deleteLead` (xoá mềm) / `getLeadById` | `components/crm/lead-form-modal.tsx`, `lead-detail-drawer.tsx` | — | `app/actions/lead-actions.ts:169, 239, 331, 370` |
| `moveLeadToStage` | kéo thả `components/crm/pipeline-board.tsx` | — | `app/actions/lead-lifecycle.ts:28` |
| `updateDealValue` / `updateLeadScore` / `updateLeadTags` / `assignLead` / `markLeadAsLost` | drawer lead | — | `app/actions/lead-lifecycle.ts:63, 90, 117, 144, 185` |
| `convertLeadToCustomer` | drawer lead → điều hướng `/contracts/create?...` | **`convert_lead_to_customer`** | `app/actions/lead-lifecycle.ts:220`, trả URL ở `:269` |
| `addCareLog` | `components/crm/lead-care-log.tsx` | **`append_care_log`** | `app/actions/lead-lifecycle.ts:275` |
| `getCustomers` | `/crm/customers` (SSR, `app/(protected)/crm/customers/page.tsx:24`) | — (LTV bằng JS) | `app/actions/customer-actions.ts:61` |
| `getCustomerById` | `/crm/customers/[id]` (SSR, `.../[id]/page.tsx:24`) | — | `app/actions/customer-actions.ts:108` |
| `createCustomer` / `updateCustomer` / `deleteCustomer` | `customer-form-modal.tsx`, `customer-drawer.tsx` | `nextval_customer_code` (create) | `app/actions/customer-actions.ts:128, 210, 265` |
| `getCustomerStats` | thanh thống kê KH | **`get_crm_customer_stats`** | `app/actions/customer-actions.ts:305` |
| `searchCustomers` | autocomplete tạo hợp đồng | — | `app/actions/customer-actions.ts:331` |

Route CRM: `/crm` (`app/(protected)/crm/page.tsx` — render lại `LeadsRoute`), `/crm/leads`, `/crm/customers`, `/crm/customers/[id]`.

### 3.2 Nhân sự

| Action | Route/UI | RPC | file:dòng |
|---|---|---|---|
| `getEmployeeList` | `/employees` (SSR) | — | `app/actions/employee-queries.ts:47` |
| `getEmployeeById` | `/employees/[id]` (SSR) — select `*`, **gồm `salary_info`** | — | `app/actions/employee-queries.ts:117, 125-129` |
| `getEmployeeStats` | `/employees` | **`employee_stats`** (+ fallback TS) | `app/actions/employee-queries.ts:137-141` |
| `getNextEmployeeCode` | form tạo NV | **`next_employee_code`** | `app/actions/employee-queries.ts:196` |
| `getActiveEmployees` | mọi picker nhân sự (task, lịch, lead) | — | `app/actions/employee-queries.ts:204` |
| `createEmployee` (retry 3 lần khi trùng mã 23505) | modal | **`next_employee_code`** | `app/actions/employee-mutations.ts:100, 117-142` |
| `updateEmployee` | modal (optimistic lock `expectedUpdatedAt`) | — | `app/actions/employee-mutations.ts:154, 218-227` |
| `softDeleteEmployee` / `restoreEmployee` | list/detail | — | `app/actions/employee-mutations.ts:254, 305` |
| `updateEmployeeNotes` | `employee-notes.tsx` | — | `app/actions/employee-mutations.ts:353` |

### 3.3 Lương

| Action | Route/UI | RPC | file:dòng |
|---|---|---|---|
| `generateMonthlySalaryAction` | `/finance/salaries` nút "Lập bảng lương" (`components/finance/salaries/salaries-client.tsx:310`) | — (thao tác bảng trực tiếp) | `app/actions/salary-actions.ts:299` |
| `validatePayrollWarningsAction` | chạy trước khi lập (`salaries-client.tsx:277`) | — | `app/actions/salary-actions.ts:250` |
| `addSalaryAdjustment` | `components/finance/salaries/salary-adjustment-modal.tsx:52` | — | `app/actions/salary-actions.ts:89` |
| `deleteSalaryAdjustment` | `salaries-client.tsx:253` | — | `app/actions/salary-actions.ts:126` |
| **`payEmployeeSalaryAction`** | `salaries-client.tsx:116` | **`record_payee_payment_atomic('employee')`** | `app/actions/salary-actions.ts:161, 182-191` |
| `deleteEmployeeMonthlySalaryAction` | `salaries-client.tsx:98` | — (hard delete + tính lại `monthly_salaries`) | `app/actions/salary-actions.ts:207, 218` |
| `fetchSalaries` | `/finance/salaries` SSR (`app/(protected)/finance/salaries/page.tsx:29`) | — | `app/actions/finance-operations-queries.ts:698` |
| `fetchPayables` / `fetchPayableItems` / `recordPayeePayment` / `voidPayeePayment` | `/finance/payables` › Ekip | `finance_payable_summary`, `payable_items`, `record_payee_payment_atomic`, `void_payee_payment_atomic` | `app/actions/payable-actions.ts:37, 62, 100, 175` |

### 3.4 Công việc / năng suất

| Action | Route/UI | RPC | file:dòng |
|---|---|---|---|
| `getTasksByEvent` / `addTask` / `deleteTask` / `toggleTaskStatus` / `copyTasksFromPreviousEvent` / `generateWorkTasksForContract` | chi tiết hợp đồng | — | `app/actions/work-task-actions.ts:91, 195, 270, 291, 318, 186` |
| `assignTask` / `updateTaskDeadline` / `updateTaskDetails` / `checkEmployeeAvailability` | lịch (ngữ cảnh schedule) | — | `app/actions/task-assign-actions.ts:67, 92, 111, 146` |
| `assignCalendarTask` / `updateCalendarTaskDetails` / `checkEmployeeAvailability` | `/calendar` | — | `app/actions/calendar-task-actions.ts:149, 247, 174` |
| `checkEmployeeTimeOverlap` / `checkEmployeeDeadlineOverlap` | kiểm chồng lịch | — | `app/actions/task-overlap-actions.ts:17, 50` |
| `fetchProductivityData` / `fetchEmployeeJobDetails` | `/productivity` | 4 RPC năng suất | `app/actions/productivity-actions.ts:157, 199` |

`_generateWorkTasksInternal` hiện **luôn sinh 0 task**: `getDefaultWorkTypes` trả `[]` vô điều kiện — `app/actions/work-task-actions.ts:22-29`, dẫn tới `:164-166` trả `"Automatic staff task generation disabled"`.

---

## 4. Luồng nghiệp vụ

### (a) Lead → khách hàng → hợp đồng

```
 [createLead]  crm_leads.created_by = employee.id      lead-actions.ts:212
 chặn trùng SĐT (status<>'huy', deleted_at IS NULL)    lead-actions.ts:191-196
 chỉ cho tạo ở status 'moi'                            lead-actions.ts:177-179
        │
        v
   ┌──────┐   ┌─────────────┐   ┌─────────┐   ┌─────────────┐   ┌──────────┐
   │ moi  │──>│ da_lien_he  │──>│ hen_gap │──>│ da_bao_gia  │──>│ da_chot  │ (tận cùng)
   └──┬───┘   └──────┬──────┘   └────┬────┘   └──────┬──────┘   └──────────┘
      │              │               │               │
      └──────────────┴───────────────┴───────────────┴────> [ huy ] ──> quay lại 'moi'
                                                              ^
   Ma trận: types/crm.ts:31-38 (VALID_LEAD_TRANSITIONS)
   Bắt buộc ở: lead-lifecycle.ts:38-43 (moveLeadToStage)
               lead-actions.ts:106-116 + :278-283 (updateLead)
   ⚠ da_chot: [] → KHÔNG có đường ra, kể cả sang 'huy'.
   ⚠ markLeadAsLost đặt thẳng status='huy' KHÔNG qua ma trận
     (lead-lifecycle.ts:195-202) → huỷ được cả lead 'da_chot'.

 ─── Chuyển đổi ────────────────────────────────────────────────────────────
 convertLeadToCustomer (lead-lifecycle.ts:220)
   1. requireCrmAccess                                          :222
   2. đọc lead (deleted_at IS NULL)                             :226
   3. tra customers theo phone → existingCustomer (chỉ để ghi audit) :229-236
   4. RPC convert_lead_to_customer(p_lead_id)                   :240
        ├─ SELECT lead FOR UPDATE                    migration :97-102
        ├─ NÉM nếu phone rỗng                                  :108-110
        ├─ NÉM nếu status đã = 'da_chot' (chống convert 2 lần) :112-114
        ├─ tìm customers theo BTRIM(phone), deleted_at IS NULL :116-121
        │    ├─ CÓ  → dùng lại customer, set lead_id (chỉ khi lead_id đang NULL) :123-130
        │    └─ KHÔNG → INSERT customers:
        │          customer_code = 'KH-' || LPAD(nextval_customer_code,3,'0')  :144
        │          created_by    = v_lead.created_by  ← employees.id !!        :152
        └─ UPDATE crm_leads SET status='da_chot', status_changed_at=NOW()      :157-161
   5. 2 audit log (crm_leads UPDATE + customers CREATE/UPDATE)  :243-259
   6. trả { url: "/contracts/create?customer_id=...&phone=...&contact_name=...&needs=..." } :261-269
        │
        v
   /contracts/create  → contracts.customer_id  → miền HỢP ĐỒNG (ngoài phạm vi)
```

Chi tiết đáng nhớ:
- **Mã KH sinh 2 nơi, cùng 1 sequence**: `createCustomer` ghép ở TS (`customer-actions.ts:151`), RPC convert ghép trong SQL (`migration:144`). Cùng `LPAD(...,3,'0')` nên định dạng khớp.
- **Fallback ngẫu nhiên**: nếu `nextval_customer_code` lỗi, `createCustomer` đặt `KH-<4 ký tự random>` (`customer-actions.ts:151`) — phá quy ước mã.
- **Convert không chuẩn hoá `+84`**: RPC so `BTRIM(phone)` (`migration:119`) còn `createCustomer` lưu bản đã `normalizePhone` (`:135-156`) → lead ghi `+84...` sẽ **không** khớp customer đã lưu `0...` → tạo KH trùng.

### (b) Sheet lương tháng `employee_salaries`

```
 [Lập bảng lương] generateMonthlySalaryAction(month, year)   salary-actions.ts:299
   guard: withAdmin (canManageSettings)                                   :300
   1. checkPeriodLock('YYYY-MM-01')                                       :303-304
   2. monthly_salaries theo (month,year): có → dùng; không → INSERT
      salary_code='BL-YYYY-MM', created_by = userId(auth)                 :308-335
   3. nếu ĐÃ có employee_salaries cho tháng → NÉM "đã được khởi tạo"      :338-346
   4. đọc work_tasks .eq(status,"Hoàn thành") trong khoảng deadline       :352-357
        ⚠ CHUỖI SAI: giá trị thật là 'hoan_thanh'
          (types/contract.ts:55; constants/work-statuses.ts:5,10)
        → workProgress LUÔN RỖNG → taskMap rỗng, cảnh báo không bao giờ bắn
        (không ảnh hưởng tiền: product_salary bị ép 0 ở bước 6)
   5. AI ĐỦ ĐIỀU KIỆN:
        employees .eq("status","active")            ← KHÔNG lọc deleted_at :384-387
          rồi .filter(salary_info.base_salary > 0)                        :407-408
          → 0 người   ⇒ NÉM "Chưa nhân viên nào có lương cơ bản…"         :409-411
        (CURRENT_STATE.md:13 — sau migration 20260827150000, prod đang ở đúng trạng thái này)
   6. total_salary MỖI DÒNG:
        base   = Number(salary_info.base_salary)                          :416
        product = 0            ← ADR-016 M3, `void taskMap`               :420-421
        total  = base + product = base                                    :422
        net_salary = total ; bonus=0 ; penalty=0 ; advance_payment=0
        paid_amount = 0 ; remaining_amount = total                        :424-438
   7. INSERT employee_salaries hàng loạt                                  :441
   8. monthly_salaries.total_salary = Σ total_salary ; total_employees=n  :445-448
        ⚠ Ở ĐÂY dùng Σ total_salary; recalculate + delete dùng Σ net_salary
          (:79, :227) → 2 định nghĩa khác nhau cho cùng 1 cột.

 [Thưởng/Phạt] addSalaryAdjustment / deleteSalaryAdjustment  salary-actions.ts:89 / :126
   → recalculateEmployeeSalary(salaryId)                                  :31-87
       bonus   = Σ adjustments(type='bonus')
       penalty = Σ adjustments(type='penalty')
       total_salary     = base + product + bonus − penalty                :56
       net_salary       = total − advance_payment                         :57
       remaining_amount = max(0, net − paid_amount)   ← M5                :67
       monthly_salaries.total_salary = Σ net_salary các dòng cùng tháng   :74-85

 ─── TRẢ LƯƠNG: hai cửa, MỘT đường ─────────────────────────────────────────
  cửa 1: /finance/salaries → payEmployeeSalaryAction(salaryId, amount, method)
                                                        salary-actions.ts:161
     guard withAdmin :162 · amount>0 :163 · checkPeriodLock :167
     chặn remaining<=0 :171-173 · chặn amount>remaining :174-176
  cửa 2: /finance/payables › Ekip → recordPayeePayment  payable-actions.ts:100
     guard withAdmin :109 · checkPeriodLock :110
                    │                        │
                    └────────┬───────────────┘
                             v
        RPC record_payee_payment_atomic(p_payee_type='employee', …)
                        luong_cung_m5.sql:165-239
          · chặn khoá kỳ :177 · nhận `employee` :191-194
            (recipient = employees active chưa xoá; category "Chi lương nhân viên")
          · INSERT expenses (payee_type='employee', payee_id=employee_id) :200-202
          · MỖI khoản phân bổ tự suy loại:                                :209-211
              target_id có trong employee_salaries của người này
                 → 'employee_salary'  (lương cứng)
              ngược lại → 'work_task' (công theo hợp đồng)
          · payable_remaining kiểm còn nợ, chặn quá số :212-214
          · INSERT expense_allocations :215
          · nếu KHÔNG gửi allocations → FIFO theo payable_items :218-229
          · Σ phân bổ phải = số tiền phiếu chi :231
          · PERFORM sync_employee_salary_paid(...) cho các phân bổ 'employee_salary' :236-237
                             │
                             v
        employee_salaries.paid_amount     = Σ allocations (expenses chưa xoá mềm)
        employee_salaries.remaining_amount = max(net_salary − Σ, 0)
                        luong_cung_m5.sql:109-118   ← HAI CỘT NÀY LÀ DẪN XUẤT

 ─── HUỶ PHIẾU CHI → NỢ QUAY LẠI ───────────────────────────────────────────
  voidPayeePayment  payable-actions.ts:175
     → void_payee_payment_atomic(expense_id, actor)  luong_cung_m5.sql:244-269
         · chặn huỷ 2 lần :257 · chặn khoá kỳ :259
         · expenses.deleted_at = now()  (xoá MỀM phiếu chi) :261
         · PERFORM sync_employee_salary_paid(...) :265-266
             → allocations vẫn còn dòng, nhưng JOIN có `e.deleted_at IS NULL`
               (luong_cung_m5.sql:116) nên KHÔNG được cộng nữa
             → paid_amount tụt, remaining_amount phồng lại = nợ quay về
```

Không có đường nào **sửa tay** `paid_amount`/`remaining_amount` sau M5: `payEmployeeSalaryAction` chỉ tính `newPaid` để ghi audit (`salary-actions.ts:193, 199`), **không UPDATE** bảng.

### (c) Phân công `work_tasks`: ekip nội bộ vs thợ ngoài

```
                     work_tasks (1 dòng / 1 người / 1 việc)
                              cost = CAM KẾT chi phí
   CHECK: (assigned_to,vendor_id) chỉ được (NULL,NULL) | (X,NULL) | (NULL,Y)
          — vault/30-du-lieu/luoc-do-nhan-su.md:287 (introspect DB)
          — code KHÔNG kiểm: work-task-actions.ts:223,236 truyền cả hai
   ┌────────────────────────────────┬────────────────────────────────┐
   │  EKIP NỘI BỘ                   │  THỢ NGOÀI                     │
   │  assigned_to = employees.id    │  vendor_id = vendors.id        │
   │  vendor_id IS NULL             │  assigned_to IS NULL           │
   ├────────────────────────────────┼────────────────────────────────┤
   │ status → 'hoan_thanh' & cost>0 │ status → 'hoan_thanh' & cost>0 │
   │   payable_items('employee')    │   payable_items('vendor')      │
   │   luong_cung_m5.sql:139-142    │   luong_cung_m5.sql:134-137    │
   │   (lọc rõ vendor_id IS NULL)   │                                │
   │            │                   │            │                   │
   │            v                   │            v                   │
   │  /finance/payables › Ekip      │  /finance/payables › Thợ ngoài │
   │            └──────────┬────────┴────────────┘                   │
   │                       v                                          │
   │        record_payee_payment_atomic → expenses + expense_allocations │
   │        (payee_type='employee' | 'vendor', target_type='work_task')  │
   ├────────────────────────────────┴────────────────────────────────┤
   │ CHẶN TRẢ TRÙNG (ADR-016 M3): sheet lương KHÔNG cộng cost nữa —   │
   │ product_salary = 0 cứng, salary-actions.ts:420-421.              │
   │ Cột `cost` xuất hiện ở CẢ HAI nơi chỉ khi đọc, không khi trả.    │
   ├─────────────────────────────────────────────────────────────────┤
   │ NĂNG SUẤT: get_employee_productivity chỉ đếm task có             │
   │ assigned_to IS NOT NULL (productivity_rpc_hardening.sql:55)      │
   │ → task thợ ngoài KHÔNG vào bảng năng suất. total_cost = Σ cost   │
   │   nhưng bị che với người không phải admin                        │
   │   (PRODUCTIVITY_COST_ROLES = ['admin'],                           │
   │    types/productivity-constants.ts:34; RPC bản `_my_` trả NULL,   │
   │    productivity_rpc_hardening.sql:189,238)                        │
   ├─────────────────────────────────────────────────────────────────┤
   │ CẢNH BÁO LẬP LƯƠNG (task chưa gán / cost=0): CHẾT LẶNG           │
   │ salary-actions.ts:259 & :355 lọc status="Hoàn thành" ≠            │
   │ 'hoan_thanh' → workProgress rỗng → không cảnh báo bao giờ         │
   └─────────────────────────────────────────────────────────────────┘
   Task KHÔNG gán ai (cả hai NULL): status ép 'chua_lam'
     work-task-actions.ts:226,239 — không sinh khoản phải trả nào.
   Xoá task = HARD DELETE (work-task-actions.ts:278) → nếu task đã được
     phân bổ phiếu chi, allocation trở thành mồ côi
     (finance_health_check 'allocation_to_missing_target',
      cashflow_m1_expense_allocations.sql:733-735)
```

---

## 5. Phân quyền

### 5.1 Ma trận vai trò (nguồn: `types/roles.ts:7-47`)

DB enum `employee_role_enum = admin | manager | sale | media | ctv` (`types/database.types.ts:6792`); kiểu app `Role = admin | manager | sale | media | viewer` (`types/roles.ts:3`). Cầu: `normalizeRole` (`:51-62`, mọi giá trị lạ **âm thầm** → `viewer`), `normalizeEmployeeRole` (`:64-79`, `viewer → ctv`).

| Module trong miền này | admin | manager | sale | media | viewer |
|---|:-:|:-:|:-:|:-:|:-:|
| `crm` | ✅ | ✅ | ✅ | | |
| `employees` | ✅ | ✅ | | | |
| `salaries` | ✅ | ✅ | | | |
| `productivity` | ✅ | ✅ | | ✅ | |
| `finance` (chứa `/finance/salaries`, `/finance/payables`) | ✅ | ✅ | | | |
| `calendar` (điều kiện để sửa `work_tasks`) | ✅ | ✅ | ✅ | ✅ | |

`admin` và `manager` có **danh sách module y hệt** (`types/roles.ts:8-43`); khác biệt chỉ nằm ở guard hẹp bên dưới.

### 5.2 Guard trong code

| Guard | Cho ai qua | file:dòng |
|---|---|---|
| `withAuth` | có phiên (`getVerifiedUser`, gọi mạng GoTrue) → trả **service-role client** | `lib/auth_utils.ts:401-423` |
| `withAuthRead` | có phiên (`getClaimsUser`, verify JWT tại chỗ) → cũng service-role | `lib/auth_utils.ts:436-458` |
| `withAdmin` | `canCurrentUserManageSettings` (admin/manager) | `lib/auth_utils.ts:460-489` |
| `resolveActiveUserRole` | **ném** nếu employee tồn tại nhưng không active; nếu **không có** dòng employee thì rơi về `app_metadata.role`/`user_metadata.role` | `lib/auth_utils.ts:491-520` |
| `requireCrmAccess` | `canAccess(role,"crm")` **VÀ bắt buộc có dòng employee** | `lib/auth_utils.ts:544-556` (chặn `!employee` ở `:547-549`) |
| `requireEmployeesAccess` | `canAccess(role,"employees")` — **KHÔNG** bắt buộc có employee | `lib/auth_utils.ts:744-752` |
| `requireEmployeesWriteAccess` | thêm điều kiện role ∈ {admin, manager} | `lib/auth_utils.ts:754-765` |
| `requireEmployeeDirectoryAccess` | mọi role **trừ** `viewer` (dùng cho picker nhân sự) | `lib/auth_utils.ts:767-778` |
| `requireFinanceAccess` / `withFinanceRead` | `canAccess(role,"finance")` | `lib/auth_utils.ts:581-598` |
| `requireCalendarAccess` | bắt buộc employee **active** + `ROLE_PERMISSIONS[role].includes("calendar")`; `isGlobalAdmin = admin\|manager` | `lib/calendar-auth.ts:27-58` |
| `requireCalendarTaskEditable` | không phải global admin → `task.assigned_to` phải = mình | `lib/calendar-auth.ts:140-162` |
| `requireCalendarTaskAssignable` | thêm: không cướp task người khác | `lib/calendar-auth.ts:164-179` |
| `requireCalendarTargetEmployee` | không phải global admin → chỉ thao tác cho chính mình | `lib/calendar-auth.ts:88-98` |
| `getTaskMutationContext` (task-assign) | employee theo `auth_user_id` + quyền `calendar` | `app/actions/task-assign-actions.ts:15-38` |
| `resolveProductivityViewerContext` | role ∈ `PRODUCTIVITY_ALLOWED_ROLES`; `viewMode = team` nếu admin/manager, ngược lại `self`; `canViewCost` chỉ admin | `lib/productivity-auth.ts:57-85`; hằng số `types/productivity-constants.ts:27-34` |

### 5.3 Quyền hẹp bên trong CRM (mã hoá thẳng trong action, không phải guard chung)

| Luật | Nội dung | file:dòng |
|---|---|---|
| Phạm vi nhìn thấy của `sale` | chỉ lead của mình **+ lead chưa giao** (`assigned_to.eq.me,assigned_to.is.null`) | `app/actions/lead-actions.ts:58-67` (áp ở `:153`) |
| Thống kê của `sale` | **không** dùng RPC (RPC đếm toàn bộ) mà gộp trong TS trên tập đã lọc → số khớp danh sách | `app/actions/lead-actions.ts:399-445` |
| Mở/sửa lead | `sale` không đụng lead đã giao người khác | `app/actions/lead-actions.ts:69-79`, áp ở `:253` (update) và `:387` (getLeadById) |
| Nhận/nhả lead | `sale` chỉ tự nhận cho mình, hoặc nhả lead đang giữ | `app/actions/lead-actions.ts:81-104`; bản song song trong `app/actions/lead-lifecycle.ts:153-165` |
| Xoá lead | chỉ admin/manager | `app/actions/lead-actions.ts:335-337` |
| Xoá khách hàng | chỉ admin/manager | `app/actions/customer-actions.ts:269-271` |

⚠ `moveLeadToStage`, `updateDealValue`, `updateLeadScore`, `updateLeadTags`, `markLeadAsLost`, `addCareLog`, `convertLeadToCustomer` **chỉ gọi `requireCrmAccess`, KHÔNG gọi `assertLeadVisibleToRole`** (`lead-lifecycle.ts:30, 65, 92, 119, 187, 222, 277`). → Một `sale` biết id lead của người khác vẫn kéo được trạng thái / đổi deal value / huỷ / chuyển đổi lead đó. Chỉ `assignLead` có kiểm (`:146, 153-165`).

Tương tự bên khách hàng: `getCustomers`/`getCustomerById`/`createCustomer`/`updateCustomer`/`searchCustomers` **không phân phạm vi theo người** — mọi role có `crm` thấy toàn bộ khách (`customer-actions.ts:65, 110, 130, 212, 333`).

### 5.4 Guard mức route (server component)

| Route | Có guard? | file:dòng |
|---|---|---|
| `/crm`, `/crm/leads`, `/crm/customers`, `/crm/customers/[id]` | **KHÔNG** — layout là passthrough thuần | `app/(protected)/crm/layout.tsx:5-7` |
| `/employees`, `/employees/[id]` | ✅ `canAccess(shellRole,"employees")` → `<AccessDenied>` | `app/(protected)/employees/layout.tsx:11-14` |
| `/finance/**` (gồm `/salaries`, `/payables`) | ✅ `canAccess(shellRole,"finance")` | `app/(protected)/finance/layout.tsx:16-19` |
| `/productivity` | ✅ role ∈ `PRODUCTIVITY_ALLOWED_ROLES` → redirect `/dashboard` | `app/(protected)/productivity/page.tsx:22-33` |

Với `/crm` việc thiếu guard route **hiện không rò dữ liệu**: `/crm/leads` render vỏ rỗng (`app/(protected)/crm/leads/page.tsx:26-33`, `leads={[]}`), `/crm/customers` gọi `getCustomers` có `requireCrmAccess` (`.../customers/page.tsx:24`) nên trả lỗi → fallback rỗng (`:26-29`). Tức là bảo vệ đến từ tầng action, đúng như `vault/10-nen-tang/xac-thuc-phan-quyen.md:32` mô tả — nhưng người không có quyền vẫn **vào được** URL và thấy khung trống thay vì `<AccessDenied>`.

### 5.5 RLS / GRANT tìm được trong migration

| Bảng | Trạng thái | file:dòng |
|---|---|---|
| `employees`, `employee_salaries`, `monthly_salaries`, `attendance`, `evaluations` | `ENABLE` + **`FORCE ROW LEVEL SECURITY`**, `REVOKE ALL FROM PUBLIC/anon/authenticated`, `GRANT ALL TO service_role` | `supabase/migrations/20260429130000_employees_audit_fix.sql:56-74` |
| `work_tasks` | policy `work_tasks_service_role_all` (ALL) + `work_tasks_authenticated_read` (SELECT, `USING public.is_active_employee()`) | tạo: `supabase/migrations/20260605000000_contracts_rls_hardening.sql:87-91`; **viết lại (bản đang dùng)**: `supabase/migrations/20260605030000_active_employee_rls_helper.sql:54-56` |
| `is_active_employee()` | SECURITY DEFINER, `GRANT EXECUTE TO authenticated, service_role` | `..._active_employee_rls_helper.sql:23-39` |
| `employees_public` (VIEW) | chiếu 6 cột an toàn (`id, full_name, avatar_url, department, position, status`); `REVOKE FROM anon`, `GRANT SELECT TO authenticated`; bảng `employees` vẫn khoá | `supabase/migrations/20260605020000_client_direct_rls_prereq.sql:29-43` |
| `anon` | `REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public`; `ALTER DEFAULT PRIVILEGES ... REVOKE`; re-grant **duy nhất** `login_attempts` | `supabase/migrations/20260610150000_revoke_anon_table_privileges.sql:29-36` |
| `crm_leads`, `customers` | thêm vào publication `supabase_realtime`; comment nói policy tên `crm_leads_select` / `customers_select` "role sale/manager/admin" — **nhưng migration này không tạo policy, và không migration nào trong repo tạo chúng** | `supabase/migrations/20260610120000_realtime_publication_crm_calendar_dashboard.sql:8-9, 28-49` → xem mục 8 |

---

## 6. Bất biến (phát biểu → căn cứ → câu SQL kiểm, **KHÔNG chạy**)

**BB-1. `crm_leads.created_by` và `crm_leads.assigned_to` luôn là `employees.id`, không bao giờ là auth user id.**
Căn cứ: FK `crm_leads_created_by_fkey`/`crm_leads_assigned_to_fkey` → `employees` (`types/database.types.ts` khối `crm_leads` Relationships); ghi bởi `app/actions/lead-actions.ts:212`.
```sql
SELECT COUNT(*) FROM crm_leads l
LEFT JOIN employees e ON e.id = l.created_by
WHERE l.created_by IS NOT NULL AND e.id IS NULL;   -- kỳ vọng 0 (FK đã bảo đảm)
```

**BB-2. `customers.created_by` KHÔNG có bất biến — chứa lẫn auth user id và employees.id.**
Căn cứ: `app/actions/customer-actions.ts:168` ghi `userId`; `supabase/migrations/20260427030000_crm_rpc_hardening.sql:152` ghi `v_lead.created_by` (employees.id); `customers` không có FK trên cột này (`types/database.types.ts` khối `customers` Relationships chỉ có `lead_id`).
```sql
SELECT
  COUNT(*) FILTER (WHERE c.created_by IN (SELECT id FROM employees))       AS ma_employee_id,
  COUNT(*) FILTER (WHERE c.created_by IN (SELECT auth_user_id FROM employees WHERE auth_user_id IS NOT NULL)) AS ma_auth_id,
  COUNT(*) FILTER (WHERE c.created_by IS NOT NULL
                     AND c.created_by NOT IN (SELECT id FROM employees)
                     AND c.created_by NOT IN (SELECT COALESCE(auth_user_id,'00000000-0000-0000-0000-000000000000') FROM employees)) AS mo_coi
FROM customers c;
-- lưu ý: 2 cột đầu ĐẾM TRÙNG với nhân sự do trigger sinh (id = auth_user_id).
```

**BB-3. Nhân sự do `on_auth_user_created` sinh có `employees.id = employees.auth_user_id`.**
Căn cứ: `supabase/migrations/20260521230000_auto_provision_employees_from_google.sql:30-31`.
```sql
SELECT COUNT(*) FILTER (WHERE id = auth_user_id)  AS trigger_sinh,
       COUNT(*) FILTER (WHERE auth_user_id IS NOT NULL AND id <> auth_user_id) AS tao_tay_roi_gan_auth,
       COUNT(*) FILTER (WHERE auth_user_id IS NULL) AS chua_co_tai_khoan
FROM employees;
```

**BB-4. `employee_salaries.paid_amount` và `remaining_amount` là DẪN XUẤT từ `expense_allocations` (loại `employee_salary`, phiếu chi chưa xoá mềm) — không đường nào ghi tay sau M5.**
Căn cứ: `supabase/migrations/20260827130000_luong_cung_m5.sql:104-119`; điểm gọi duy nhất `:236-237` và `:265-266`; `app/actions/salary-actions.ts:182-193` không UPDATE hai cột.
```sql
SELECT s.id, s.paid_amount, s.remaining_amount, s.net_salary,
       COALESCE(a.alloc,0) AS alloc_thuc
FROM employee_salaries s
LEFT JOIN LATERAL (
  SELECT SUM(x.amount) alloc FROM expense_allocations x JOIN expenses e ON e.id = x.expense_id
  WHERE x.target_type='employee_salary' AND x.target_id=s.id AND e.deleted_at IS NULL
) a ON TRUE
WHERE s.paid_amount <> COALESCE(a.alloc,0)
   OR s.remaining_amount <> GREATEST(COALESCE(s.net_salary,0) - COALESCE(a.alloc,0), 0);  -- kỳ vọng 0 dòng
```

**BB-5. `employee_salaries.total_salary = base_salary + product_salary + bonus − penalty`, `net_salary = total_salary − advance_payment`, `product_salary = 0`.**
Căn cứ: `app/actions/salary-actions.ts:56-57` (đường điều chỉnh), `:420-422, 432-433` (đường sinh mới).
```sql
SELECT COUNT(*) FROM employee_salaries
WHERE total_salary <> COALESCE(base_salary,0)+COALESCE(product_salary,0)+COALESCE(bonus,0)-COALESCE(penalty,0)
   OR net_salary   <> total_salary - COALESCE(advance_payment,0)
   OR COALESCE(product_salary,0) <> 0;   -- kỳ vọng 0
```

**BB-6. `bonus`/`penalty` của một dòng lương = Σ `salary_adjustments` cùng `employee_salary_id` theo `type`.**
Căn cứ: `app/actions/salary-actions.ts:31-57`.
```sql
SELECT s.id FROM employee_salaries s
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(amount) FILTER (WHERE type='bonus'),0) b,
         COALESCE(SUM(amount) FILTER (WHERE type='penalty'),0) p
  FROM salary_adjustments WHERE employee_salary_id = s.id
) a ON TRUE
WHERE COALESCE(s.bonus,0) <> a.b OR COALESCE(s.penalty,0) <> a.p;   -- kỳ vọng 0
```

**BB-7. Một `work_tasks` không bao giờ vừa có `assigned_to` vừa có `vendor_id` (CHECK ở DB, code không kiểm).**
Căn cứ: `vault/30-du-lieu/luoc-do-nhan-su.md:287`; code không kiểm: `app/actions/work-task-actions.ts:223, 236`.
```sql
SELECT COUNT(*) FROM work_tasks WHERE assigned_to IS NOT NULL AND vendor_id IS NOT NULL;  -- kỳ vọng 0
```

**BB-8. Công theo hợp đồng của ekip nội bộ được trả ĐÚNG MỘT ĐƯỜNG — không nằm trong sheet lương.**
Căn cứ: `app/actions/salary-actions.ts:420-421` (`product_salary = 0`); `supabase/migrations/20260827130000_luong_cung_m5.sql:139-142` (`payable_items('employee')` đọc `work_tasks`).
```sql
SELECT COUNT(*) FROM employee_salaries WHERE COALESCE(product_salary,0) <> 0;  -- kỳ vọng 0
```

**BB-9. Mỗi cặp (year, month) có tối đa 1 `monthly_salaries` (UNIQUE ở DB) và mọi `employee_salaries` cùng tháng trỏ về nó.**
Căn cứ: index `UNIQUE btree (year, month)` — `vault/30-du-lieu/luoc-do-nhan-su.md:162`; ghép ở `app/actions/salary-actions.ts:308-335, 424-426`.
```sql
SELECT COUNT(*) FROM employee_salaries s
JOIN monthly_salaries m ON m.id = s.monthly_salary_id
WHERE m.year <> s.year OR m.month <> s.month;   -- kỳ vọng 0
SELECT COUNT(*) FROM employee_salaries WHERE monthly_salary_id IS NULL;  -- kỳ vọng 0
```

**BB-10. Không có `expense_allocations` loại `employee_salary` trỏ vào dòng lương đã bị hard-delete.**
Căn cứ: `employee_salaries` xoá cứng (`app/actions/salary-actions.ts:218`) và **không kiểm phân bổ trước khi xoá** (`:207-244` không có truy vấn `expense_allocations`); check chính thức: `supabase/migrations/20260825200000_cashflow_m1_expense_allocations.sql:733-737`.
```sql
SELECT COUNT(*) FROM expense_allocations a JOIN expenses e ON e.id=a.expense_id AND e.deleted_at IS NULL
WHERE a.target_type='employee_salary'
  AND NOT EXISTS (SELECT 1 FROM employee_salaries s WHERE s.id = a.target_id);  -- kỳ vọng 0
```

**BB-11. Một lead `da_chot` đã có `customers.lead_id` trỏ về; convert 2 lần bị RPC chặn.**
Căn cứ: `supabase/migrations/20260427030000_crm_rpc_hardening.sql:112-114, 127, 151`.
```sql
SELECT COUNT(*) FROM crm_leads l
WHERE l.status='da_chot' AND l.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM customers c WHERE c.lead_id = l.id AND c.deleted_at IS NULL);
-- >0 nghĩa là lead được đặt 'da_chot' bằng updateLead/moveLeadToStage chứ không qua RPC convert
```

**BB-12. `customer_code` duy nhất và theo dạng `KH-<số>`; fallback ngẫu nhiên là dấu hiệu `nextval_customer_code` từng lỗi.**
Căn cứ: `app/actions/customer-actions.ts:150-151`; `supabase/migrations/20260427030000_crm_rpc_hardening.sql:144`.
```sql
SELECT COUNT(*) FROM customers WHERE customer_code !~ '^KH-[0-9]+$';  -- kỳ vọng 0
SELECT (SELECT last_value FROM customer_code_seq) AS seq_hien_tai,
       (SELECT MAX((regexp_match(customer_code,'([0-9]+)$'))[1]::bigint) FROM customers WHERE customer_code ~ '[0-9]+$') AS max_ma;
```

**BB-13. Sheet lương chỉ có dòng cho nhân sự `status='active'` và `salary_info.base_salary > 0` tại thời điểm lập.**
Căn cứ: `app/actions/salary-actions.ts:384-387, 407-411`.
```sql
SELECT s.id, e.status, e.deleted_at, e.salary_info->>'base_salary'
FROM employee_salaries s JOIN employees e ON e.id = s.employee_id
WHERE COALESCE((e.salary_info->>'base_salary')::numeric,0) <= 0;
-- >0 dòng: hoặc lương cơ bản bị sửa sau khi lập, hoặc sheet cũ trước ADR-016 M5
```

**BB-14. `employees.employee_code` duy nhất, dạng `NV-<số>` (đường app) — trigger auth sinh dạng `NV-<6 hex>` khác quy ước.**
Căn cứ: `supabase/migrations/20260429130000_employees_audit_fix.sql:18-25` (app) vs `supabase/migrations/20260521230000_auto_provision_employees_from_google.sql:16` (trigger: `'NV-' || upper(substr(md5(random()::text),1,6))`).
```sql
SELECT employee_code FROM employees WHERE employee_code !~ '^NV-[0-9]+$';  -- các dòng do trigger sinh
```

---

## 7. Mâu thuẫn tài liệu (vault ↔ code — **code thắng**)

| # | Vault nói | Code nói | Bằng chứng | Kết luận |
|---|---|---|---|---|
| 1 | `vault/40-module/khach-hang-crm.md:40`: "`crm_leads` và `customers` **có** trong publication `supabase_realtime` (đủ RLS + grant) → dùng `postgres_changes` **trực tiếp**" | Cả hai màn hình dùng `useRealtimeSignal` (bảng trung gian `realtime_signals`), **không** subscribe trực tiếp bảng nguồn | `components/crm/lead-list-page.tsx:13, 179`; `components/crm/customer-list-client.tsx:12, 101, 105`; cơ chế: `hooks/use-realtime-signal.ts:6-12, 32-41` | **Vault sai về cách hiện thực.** Việc có trong publication (`..._realtime_publication_crm_calendar_dashboard.sql:33-34`) là đúng nhưng app không dùng đường đó. |
| 2 | `vault/40-module/khach-hang-crm.md:26` + `vault/10-nen-tang/xac-thuc-phan-quyen.md:83`: "`crm_leads.created_by` trỏ `employees.id`, **khác phần còn lại của hệ thống** (chỗ khác dùng auth user id)" | Đúng phần đầu, nhưng **thiếu vế nguy hiểm hơn**: `customers.created_by` cũng nhận `employees.id` khi đi qua RPC convert, còn nhận auth user id khi tạo tay | `supabase/migrations/20260427030000_crm_rpc_hardening.sql:152` vs `app/actions/customer-actions.ts:168` | Vault **chưa đủ**. Ngoại lệ không chỉ ở `crm_leads`. |
| 3 | `vault/40-module/nhan-su.md:11`: "**7 nhân sự** trong DB" | `vault/30-du-lieu/luoc-do-nhan-su.md:16` (introspect DB) nói **12 dòng**; `agent/CURRENT_STATE.md:40` nói **10 nhân viên active** (đo prod 26/08) | 3 con số, 3 mốc thời gian | Không xác minh được (cấm chạm DB). Số trong vault là ảnh chụp, đừng dùng làm căn cứ. |
| 4 | `vault/40-module/nhan-su.md:54-55`: "`productivity-actions.ts` **chỉ gọi RPC, không chạm bảng**" | Đúng với bảng nghiệp vụ, nhưng file gọi `createAdminClient()` cho nhánh team và `createClient()` cho nhánh self — hai loại client khác nhau, đây mới là điểm cần giữ khi sửa quyền | `app/actions/productivity-actions.ts:46, 93, 137` | Vault đúng nhưng thiếu chi tiết quyết định bảo mật. |
| 5 | `vault/40-module/nhan-su.md:48-50` (ADR-016 M3/M5) mô tả sheet lương và `payable_items('employee')` | Khớp code + migration | `app/actions/salary-actions.ts:405-422`; `supabase/migrations/20260827130000_luong_cung_m5.sql:144-147` | **Vault đúng.** |
| 6 | `vault/30-du-lieu/luoc-do-nhan-su.md:97` liệt kê cột `monthly_salary` như cột thường | `agent/DECISIONS.md:147`: "cột `monthly_salary` **không code nào ghi**"; không đường ghi nào trong `app/actions/salary-actions.ts` | grep `monthly_salary` (khác `monthly_salary_id`) trong `app/actions` không ra chỗ ghi | Cột **chết**, giữ lại. Vault lược đồ nên chú thích. |
| 7 | `vault/10-nen-tang/xac-thuc-phan-quyen.md:62`: guard `requireEmployeesWriteAccess` = admin, manager | Khớp | `lib/auth_utils.ts:754-765` | **Vault đúng.** |
| 8 | `vault/10-nen-tang/xac-thuc-phan-quyen.md:66` ngụ ý guard `crm` "chỉ gọi `canAccess(role,'crm')`" | Thiếu: `requireCrmAccess` còn **bắt buộc có dòng employee** (`!employee → ném`), khác `requireEmployeesAccess` | `lib/auth_utils.ts:547-549` vs `:744-752` | Vault **chưa đủ**; sự bất đối xứng này là thật. |
| 9 | `vault/40-module/nhan-su.md:36` nói task ekip/thợ ngoài đều là cam kết `work_tasks.cost` | Khớp; `toggleTaskStatus` có ghi chú ADR-016 và **không** tạo phiếu chi | `app/actions/work-task-actions.ts:308-309` | **Vault đúng.** |
| 10 | `vault/40-module/khach-hang-crm.md:22` "Nhật ký chăm sóc ghi bằng `append_care_log`" | Khớp | `app/actions/lead-lifecycle.ts:282` | **Vault đúng.** |

**Lỗi thật trong code phát hiện khi map** (không phải mâu thuẫn tài liệu, ghi ở đây để khỏi lạc):
- `app/actions/salary-actions.ts:259` và `:355` lọc `work_tasks.status = "Hoàn thành"` (chuỗi hoa có dấu) trong khi giá trị thật là `hoan_thanh` (`types/contract.ts:55`, `constants/work-statuses.ts:5,10`, `app/actions/calendar-task-actions.ts:43`). → `validatePayrollWarningsAction` **luôn trả không cảnh báo**; `taskMap` trong `generateMonthlySalaryAction` luôn rỗng. Không sai tiền (vì `product_salary` bị ép 0) nhưng **cảnh báo "task chưa gán / cost 0đ" đã chết lặng**.
- `monthly_salaries.total_salary` được tính bằng **Σ `total_salary`** khi lập (`salary-actions.ts:445`) nhưng bằng **Σ `net_salary`** khi điều chỉnh (`:79`) và khi xoá dòng (`:227`). Hiện `advance_payment` luôn 0 nên hai cách trùng nhau — sẽ lệch ngay khi có tạm ứng.
- `monthly_salaries.base_salary_total / product_salary_total / bonus_total / penalty_total / advance_total`: **UI đọc** (`app/actions/finance-operations-queries.ts:711, 749-753`) nhưng **không code nào ghi** → luôn 0/NULL, luôn rơi vào nhánh `||` tính lại từ `items`. Dead columns đọc được.
- `get_customer_ltv(uuid[])` được tạo riêng để gộp LTV trong SQL (`..._crm_audit_followups.sql:6, 110-122`) nhưng `getCustomers` vẫn fetch `contracts` rồi cộng ở JS (`customer-actions.ts:92-98`) → tối ưu chưa được nối vào.
- `updateCustomer` không chuẩn hoá SĐT như `createCustomer` (`customer-actions.ts:230` chỉ `.trim()` vs `:135` gọi `normalizePhone`) → sửa SĐT có thể phá cả dedup lẫn khớp lead↔customer.

---

## 8. Chưa xác minh

1. **Policy RLS thật của `crm_leads` và `customers`.** Migration `20260610120000_realtime_publication_crm_calendar_dashboard.sql:8-9` chỉ **nhắc tên** `crm_leads_select` / `customers_select` ("role sale/manager/admin") trong comment; **không migration nào trong `supabase/migrations/` tạo chúng** (grep `CREATE POLICY` trên 2 bảng này không ra kết quả). Nội dung `USING`/`WITH CHECK` thật, và các helper `get_current_employee_role()` / `get_current_employee_id()` mà comment nhắc, chưa xác minh được từ repo.
2. **Policy RLS của `employees`, `employee_salaries`, `monthly_salaries`, `schedules`.** Vault ghi 4 policy mỗi bảng (`luoc-do-nhan-su.md:16-18, 23`) nhưng migration chỉ ENABLE/FORCE + REVOKE/GRANT (`..._employees_audit_fix.sql:56-74`), không tạo policy. Vì `authenticated` bị REVOKE và app dùng service_role, các policy này gần như không đường nào chạm — nhưng nội dung thật **chưa xác minh**.
3. **`salary_adjustments` có 0 policy** theo vault (`luoc-do-nhan-su.md:169`) trong khi các bảng lương khác có 4 — RLS bật mà không policy = fail-closed cho mọi role trừ service_role. Chưa xác minh trạng thái hiện tại.
4. **Số dòng thực tế** của mọi bảng (`employees` 7 hay 12 hay 10 active; `crm_leads` 4; `customers` 65) — cấm chạm DB, mọi con số trong vault/agent là ảnh chụp cũ.
5. **`employees.salary_info.base_salary` hiện có ai > 0 không.** `agent/CURRENT_STATE.md:13` nói migration `20260827150000_admin_salary_info_bo_so_test.sql` đã áp prod và "0 nhân viên có lương cơ bản > 0", nhưng đó là ghi chép, không phải đo tại thời điểm này. Nếu đúng thì `generateMonthlySalaryAction` **luôn ném lỗi** (`salary-actions.ts:409-411`) → chức năng lập bảng lương hiện không chạy được, đúng theo thiết kế M5.
6. **Trigger `on_auth_user_created` còn sống trên DB thật hay không.** Repo chỉ có 1 migration tạo nó (`20260521230000`), không có migration nào DROP — nhưng không xác minh được trạng thái DB.
7. **`convert_lead_to_customer` / `nextval_customer_code` / `append_care_log` có bị `CREATE OR REPLACE` ngoài migration (qua dashboard) hay không.** `agent/DECISIONS.md:150` cảnh báo tiền lệ: M5 phải sinh 3 RPC "từ thân đang chạy trên DB — **không tin file migration cũ** (bài học M4)". Cùng rủi ro áp cho các RPC CRM 27/04 — 4 tháng chưa đụng file.
8. **`attendance`, `work_shifts`, `evaluations`, `requests`**: không tìm được server action nào ghi vào chúng. Có thể có đường ghi ngoài `app/actions/` (API route, script, Moodie tool) mà tôi chưa quét hết.
9. **Ai đọc `customers.created_by`** *(đã thu hẹp)*: `CUSTOMER_LIST_FIELDS` không lấy cột này (`customer-actions.ts:20-46`); `getCustomerById` select `*` (`:115`) nên cột **có** tới client; nhưng grep `created_by` trong toàn bộ `components/crm/` **không ra kết quả nào** → không component CRM nào hiển thị. Chưa loại trừ được các nơi ngoài `components/crm/` (Moodie, báo cáo).
10. **`pipeline_order`** (`crm_leads`) *(đã xác minh là cột chết ở tầng ghi)*: grep toàn `app/ components/ lib/ types/` chỉ ra 3 nhóm — đọc trong `LEAD_LIST_FIELDS` (`app/actions/lead-actions.ts:43`), khai kiểu (`types/crm.ts:118`), và schema sinh (`types/database.types.ts:893, 921, 949`). **Không có đường ghi nào trong repo** → mọi lead giữ mặc định `0`; thứ tự cột kéo-thả trên `pipeline-board` không được lưu.
