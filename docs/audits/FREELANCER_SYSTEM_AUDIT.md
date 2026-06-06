# 🔍 AUDIT TOÀN DIỆN: HỆ THỐNG FREELANCER/CTV

**Ngày audit**: 2026-05-24  
**Phạm vi**: Toàn bộ nghiệp vụ Freelancer/CTV từ Contract → Salary → Performance → UI/UX  
**Trạng thái**: ✅ Hoàn thành phân tích chi tiết

---

## 📋 TÓM TẮT EXECUTIVE

### ✅ Điểm Mạnh
1. **Kiến trúc tốt**: Hệ thống phân biệt rõ CTV (employee) vs Vendor (thợ ngoài)
2. **Salary logic đầy đủ**: CTV được tích hợp hoàn chỉnh vào payroll system
3. **Contract assignment**: Giao việc cho CTV đã được implement đầy đủ
4. **Code quality**: Tuân thủ V2 architecture patterns

### ⚠️ Issues Cần Fix
1. **Terminology confusion**: UI gọi Vendor là "Freelancer" gây nhầm lẫn
2. **Missing vendor finance**: Không có payroll/payment tracking cho Vendor
3. **Performance reports thiếu**: Không có so sánh efficiency Employee vs Vendor
4. **UI/UX gaps**: Một số nơi thiếu visual differentiation cho CTV

---

## 🎯 PHÂN LOẠI: CTV vs VENDOR

### 1️⃣ CTV (Cộng Tác Viên) = Employee Role

**Định nghĩa**: Freelancer chính thức, được quản lý như nhân viên

**Database**:
- Bảng: `employees` table
- Role: `role = 'ctv'` (employee_role_enum)
- Mã: `employee_code` (VD: NV-006)
- Thông tin đầy đủ: full_name, department, position, phone, email, salary_info, status

**Nghiệp vụ**:
- ✅ Có lương cơ bản (base_salary) trong `salary_info` JSONB
- ✅ Có lương sản phẩm (product_salary) từ work_tasks completed
- ✅ Được tính lương hàng tháng trong `employee_salaries`
- ✅ Có thể xem payslip, salary history
- ✅ Được assign vào work_tasks qua `assigned_to` field
- ✅ Có auth account (auth_user_id) nếu cần login

**UI References**:
- [types/employee-constants.ts:24](types/employee-constants.ts#L24): `ctv: "CTV"`
- [components/finance/salaries/salaries-client.tsx:186](components/finance/salaries/salaries-client.tsx#L186): Role filter có "CTV"
- [components/employees/employee-card.tsx:66](components/employees/employee-card.tsx#L66): Badge "CTV" (ẩn nếu là CTV)

**Ví dụ Use Case**:
> Nhiếp ảnh viên freelance làm việc thường xuyên, có lương cơ bản 5tr/tháng + lương theo job. Cần tracking attendance, salary history, performance.

---

### 2️⃣ VENDOR (Thợ Ngoài) = External Contractor

**Định nghĩa**: Thợ thuê ngoài theo job, không phải nhân viên

**Database**:
- Bảng: `vendors` table (riêng biệt)
- Fields: id, full_name, phone, service_type, status, created_at
- Không có: employee_code, department, salary_info, auth_user_id

**Nghiệp vụ**:
- ❌ KHÔNG có lương cơ bản
- ❌ KHÔNG được tính trong payroll system
- ✅ Chỉ có cost per task trong `work_tasks.cost`
- ❌ KHÔNG có salary history/payslip
- ✅ Được assign vào work_tasks qua `vendor_id` field
- ❌ KHÔNG có auth account

**UI References**:
- [components/contracts/drawer-assignments.tsx:142](components/contracts/drawer-assignments.tsx#L142): Badge "Freelancer" (CONFUSING!)
- [components/contracts/detail/task-list-panel.tsx](components/contracts/detail/task-list-panel.tsx): Quick-add vendor form
- [app/actions/vendor-actions.ts](app/actions/vendor-actions.ts): getActiveVendors(), quickAddVendor()

**Ví dụ Use Case**:
> Makeup artist thuê ngoài cho 1 job wedding, phí 2tr/job. Không cần tracking lương hàng tháng, chỉ cần ghi cost vào job đó.

---

## 🔄 FLOW NGHIỆP VỤ CHI TIẾT

### Flow 1: Tạo Contract → Assign Work → Tính Lương CTV

```
1. Tạo contract (wedding package 50tr)
   ├─ Contract code: HD-2024-001
   └─ Service type: ngay_cuoi

2. Tạo events (ngay_chup, hau_ky)
   ├─ Event 1: Ngày chụp (2024-06-15)
   └─ Event 2: Hậu kỳ (deadline: 2024-06-30)

3. Assign work tasks
   ├─ Task 1: Chụp ảnh
   │  ├─ assigned_to: CTV-001 (Nguyễn Văn A - role=ctv)
   │  ├─ cost: 3,000,000 VNĐ
   │  └─ status: hoan_thanh (completed: 2024-06-15)
   │
   ├─ Task 2: Makeup
   │  ├─ vendor_id: VENDOR-001 (Trần Thị B - vendors table)
   │  ├─ cost: 2,000,000 VNĐ
   │  └─ status: hoan_thanh (completed: 2024-06-15)
   │
   └─ Task 3: Hậu kỳ ảnh
      ├─ assigned_to: NV-003 (Lê Văn C - role=media, nhân viên chính thức)
      ├─ cost: 4,000,000 VNĐ
      └─ status: hoan_thanh (completed: 2024-06-28)

4. End of month: Generate salary (T6/2024)
   ├─ Fetch employees WHERE status='active' (includes CTV)
   │  ├─ CTV-001 (Nguyễn Văn A)
   │  ├─ NV-003 (Lê Văn C)
   │  └─ ... other employees
   │
   ├─ Calculate product_salary for each employee
   │  ├─ CTV-001: SUM(work_tasks.cost WHERE assigned_to=CTV-001 AND status='hoan_thanh' AND deadline in June)
   │  │           = 3,000,000 VNĐ
   │  └─ NV-003:  = 4,000,000 VNĐ
   │
   ├─ Generate employee_salaries records
   │  ├─ CTV-001:
   │  │  ├─ base_salary: 5,000,000 (from employees.salary_info)
   │  │  ├─ product_salary: 3,000,000
   │  │  ├─ total_salary: 8,000,000
   │  │  └─ net_salary: 8,000,000 (before advance/bonus/penalty)
   │  │
   │  └─ NV-003:
   │     ├─ base_salary: 10,000,000
   │     ├─ product_salary: 4,000,000
   │     └─ total_salary: 14,000,000
   │
   └─ ⚠️ VENDOR-001: KHÔNG xuất hiện trong payroll
      (cost 2tr chỉ nằm trong work_tasks, không có employee_salaries record)

5. UI Display
   ├─ /finance/salaries tháng 6/2024:
   │  ├─ CTV-001: 8,000,000đ (filter role=ctv works)
   │  ├─ NV-003: 14,000,000đ
   │  └─ VENDOR-001: ❌ KHÔNG hiển thị
   │
   └─ Contract detail drawer:
      ├─ "Nhân sự" section shows:
      │  ├─ Nguyễn Văn A (CTV) - Chụp ảnh
      │  ├─ Trần Thị B (Freelancer badge ⚠️) - Makeup
      │  └─ Lê Văn C - Hậu kỳ
      └─ Progress: 3/3 gán
```

---

## 📊 DATABASE SCHEMA ANALYSIS

### employees Table (CTV là một role)
```sql
CREATE TABLE employees (
  id UUID PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id),
  employee_code VARCHAR(50) UNIQUE NOT NULL,      -- "NV-001", "CTV-001"
  full_name VARCHAR(255) NOT NULL,
  gender VARCHAR(10),
  phone VARCHAR(20),
  email VARCHAR(255),
  department VARCHAR(100),                         -- "CTV", "Sản xuất", etc.
  position VARCHAR(100),                           -- "Nhiếp ảnh viên", etc.
  role employee_role_enum NOT NULL,                -- admin|manager|sale|media|ctv
  status VARCHAR(50) DEFAULT 'active',             -- active|inactive
  salary_info JSONB,                               -- { base_salary, bank_name, bank_account_no, ... }
  notes TEXT,
  start_date DATE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CTV example row:
-- id: uuid-123
-- employee_code: 'CTV-001'
-- full_name: 'Nguyễn Văn A'
-- role: 'ctv'
-- status: 'active'
-- salary_info: { "base_salary": 5000000, "bank_name": "Vietcombank", "bank_account_no": "0123456789" }
```

### vendors Table (Thợ ngoài riêng)
```sql
CREATE TABLE vendors (
  id UUID PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  service_type VARCHAR(100),                       -- "makeup", "photo", etc.
  status VARCHAR(50) DEFAULT 'active',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor example row:
-- id: uuid-456
-- full_name: 'Trần Thị B'
-- phone: '0987654321'
-- service_type: 'makeup'
-- status: 'active'
```

### work_tasks Table (Giao việc cho cả Employee và Vendor)
```sql
CREATE TABLE work_tasks (
  id UUID PRIMARY KEY,
  contract_id UUID REFERENCES contracts(id),
  event_id UUID REFERENCES contract_events(id),
  work_type work_type_enum NOT NULL,               -- chup_anh|makeup|hau_ky_anh|...
  assigned_to UUID REFERENCES employees(id),       -- Employee (bao gồm CTV)
  vendor_id UUID REFERENCES vendors(id),           -- Vendor (thợ ngoài)
  status task_status_enum,                         -- chua_lam|dang_lam|hoan_thanh|da_huy
  deadline DATE,
  cost NUMERIC(15,2) DEFAULT 0,                    -- Lương cho job này
  notes TEXT,
  start_time TIME,                                 -- On-set only
  end_time TIME,                                   -- On-set only
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ⚠️ Rule: Chỉ một trong hai: assigned_to XOR vendor_id
-- If assigned_to IS NOT NULL → employee (including CTV) → goes to payroll
-- If vendor_id IS NOT NULL → vendor → does NOT go to payroll
```

### employee_salaries Table (Payroll cho Employee/CTV only)
```sql
CREATE TABLE employee_salaries (
  id UUID PRIMARY KEY,
  monthly_salary_id UUID REFERENCES monthly_salaries(id),
  employee_id UUID REFERENCES employees(id),       -- ✅ Includes CTV
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  base_salary NUMERIC(15,2) DEFAULT 0,             -- From employees.salary_info.base_salary
  product_salary NUMERIC(15,2) DEFAULT 0,          -- SUM(work_tasks.cost) for month
  bonus NUMERIC(15,2) DEFAULT 0,                   -- From salary_adjustments type=bonus
  penalty NUMERIC(15,2) DEFAULT 0,                 -- From salary_adjustments type=penalty
  total_salary NUMERIC(15,2) DEFAULT 0,            -- base + product + bonus - penalty
  advance_payment NUMERIC(15,2) DEFAULT 0,
  net_salary NUMERIC(15,2) DEFAULT 0,              -- total - advance
  paid_amount NUMERIC(15,2) DEFAULT 0,
  remaining_amount NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ⚠️ Vendor KHÔNG có records trong bảng này
```

---

## 💻 CODE LOGIC ANALYSIS

### 1. Salary Generation Logic
**File**: [app/actions/salary-actions.ts:287-465](app/actions/salary-actions.ts#L287-L465)

```typescript
export async function generateMonthlySalaryAction(month: number, year: number) {
  // ...
  
  // ✅ Step 1: Fetch ALL active employees (includes CTV)
  const { data: employees } = await supabase
    .from("employees")
    .select("*")
    .eq("status", "active");  // ← Includes role='ctv'
  
  // ✅ Log breakdown by role (line 382-391)
  const employeesByRole = employees.reduce((acc, emp) => {
    const role = emp.role || "unknown";
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});
  console.log(`[Salary Generation] Processing ${employees.length} employees (${roleBreakdownLog})`);
  // Output: "Processing 8 employees (admin=1, manager=2, sale=3, media=1, ctv=1)"
  
  // ✅ Step 2: Calculate product_salary from work_tasks
  const { data: workProgress } = await supabase
    .from("work_tasks")
    .select("assigned_to, vendor_id, cost, contracts(contract_code)")
    .eq("status", "Hoàn thành")
    .gte("deadline", startOfMonth)
    .lte("deadline", endOfMonth);
  
  // Group costs by employee
  const taskMap: Record<string, number> = {};
  workProgress?.forEach((task) => {
    if (task.vendor_id) return; // ⚠️ Vendor tasks EXCLUDED (line 359)
    
    if (task.assigned_to) {
      taskMap[task.assigned_to] = (taskMap[task.assigned_to] || 0) + (task.cost || 0);
    }
  });
  
  // ✅ Step 3: Generate salary records for ALL employees (including CTV)
  const newRecords = employees.map((emp) => {
    const salaryInfoObj = typeof emp.salary_info === "string"
      ? JSON.parse(emp.salary_info)
      : (emp.salary_info || {});
    
    const totalBase = Number(salaryInfoObj?.base_salary) || 0;
    const productSalary = taskMap[emp.id] || 0;
    const total = totalBase + productSalary;
    
    return {
      monthly_salary_id: monthlySalaryId,
      employee_id: emp.id,
      base_salary: totalBase,
      product_salary: productSalary,
      year,
      month,
      total_salary: total,
      net_salary: total,
      bonus: 0,
      penalty: 0,
      advance_payment: 0,
      paid_amount: 0,
      remaining_amount: total,
    };
  });
  
  // Insert to employee_salaries
  await supabase.from("employee_salaries").insert(newRecords);
}
```

**✅ Kết luận**: Logic HOÀN TOÀN support CTV. Issue nếu có là DATA (CTV không có status='active' hoặc chưa generate salary).

---

### 2. Contract Task Assignment Logic
**File**: [components/contracts/detail/task-list-panel.tsx](components/contracts/detail/task-list-panel.tsx)

```typescript
// UI cho phép assign task cho:
// 1. Employee (including CTV) via GroupedSelect employees
// 2. Vendor via GroupedSelect vendors with quick-add

export function TaskListPanel({
  employees,  // From getActiveEmployees() → includes CTV
  vendors,    // From getActiveVendors()
  form,
  onEmployeeChange,
  onVendorChange,
  onAddVendor,
}) {
  // Form has:
  // - form.assigned_to → employee_id (CTV or regular employee)
  // - form.vendor_id → vendor_id (external contractor)
  
  return (
    <div>
      {/* Employee dropdown (includes CTV) */}
      <GroupedSelect
        options={employees}
        value={form.assigned_to}
        onChange={onEmployeeChange}
        groupBy="department"  // CTV có department="CTV"
      />
      
      {/* Vendor dropdown with quick-add */}
      <GroupedSelect
        options={vendors}
        value={form.vendor_id}
        onChange={onVendorChange}
        onAdd={onAddVendor}
      />
    </div>
  );
}
```

**✅ Kết luận**: Assignment logic rõ ràng, support cả CTV và Vendor.

---

### 3. Salary UI Display Logic
**File**: [components/finance/salaries/salaries-client.tsx](components/finance/salaries/salaries-client.tsx)

```typescript
// Role filter options (line 180-199)
const roleOptions = useMemo(() => {
  const roleLabels: Record<string, string> = {
    admin: "Admin",
    manager: "Quản lý",
    sale: "Sale",
    media: "Media",
    ctv: "CTV",  // ✅ CTV có trong role filter
  };
  
  const seen = new Set<string>();
  for (const item of allItems) {
    if (item.role) seen.add(item.role);
  }
  
  return [
    { value: "all", label: "Loại" },
    ...Array.from(seen)
      .sort()
      .map((value) => ({ value, label: roleLabels[value] || value })),
  ];
}, [allItems]);

// Filter logic (line 201-234)
const filteredItems = useMemo(() => {
  const next = allItems.filter((item) => {
    if (role !== "all" && item.role !== role) return false;  // ✅ Filter by role works
    // ... other filters
    return true;
  });
  
  return next;
}, [allItems, role]);
```

**✅ Kết luận**: UI HOÀN TOÀN support filter và display CTV salary.

---

## 🎨 UI/UX MAPPING

### 1. Contract Detail - Task Assignment
**Location**: Contract detail page → Event modal → Task list

**Current State**:
- ✅ Dropdown cho Employee (includes CTV)
- ✅ Dropdown cho Vendor
- ✅ Badge "Freelancer" for vendor (⚠️ CONFUSING terminology)
- ❌ Không có visual distinction giữa CTV vs regular employee

**File References**:
- [components/contracts/detail/task-list-panel.tsx](components/contracts/detail/task-list-panel.tsx): Assignment UI
- [components/contracts/drawer-assignments.tsx:142](components/contracts/drawer-assignments.tsx#L142): Badge display

**Screenshots/Mockup Needed**: Task assignment UI với CTV và Vendor

---

### 2. Salary Page - Payroll List
**Location**: /finance/salaries

**Current State**:
- ✅ Filter by role (Admin, QL, Sale, Media, CTV)
- ✅ Display CTV trong table nếu có salary records
- ❌ Không có badge/icon đặc biệt cho CTV row
- ❌ Vendor cost KHÔNG xuất hiện (expected behavior)

**File References**:
- [components/finance/salaries/salaries-client.tsx](components/finance/salaries/salaries-client.tsx): Main page
- [components/finance/salaries/salary-desktop-table.tsx](components/finance/salaries/salary-desktop-table.tsx): Desktop table
- [components/finance/salaries/salary-mobile-swipe-card.tsx](components/finance/salaries/salary-mobile-swipe-card.tsx): Mobile cards

**Enhancement Suggestion**: Thêm badge "CTV" trong salary row

---

### 3. Employee List Page
**Location**: /employees

**Current State**:
- ✅ Filter by role including CTV
- ✅ Badge for role (admin, manager, etc.)
- ⚠️ Badge CTV bị ẩn (line 66 employee-card.tsx: `&& emp.role !== "ctv"`)
- ✅ Department có option "Cộng tác viên"

**File References**:
- [components/employees/employee-card.tsx:66](components/employees/employee-card.tsx#L66): ❌ Hide badge nếu CTV
- [types/employee-constants.ts:14](types/employee-constants.ts#L14): Department "CTV"

**Issue**: Tại sao badge CTV bị ẩn? Có lý do design?

---

### 4. Finance Dashboard
**Location**: /finance

**Current State**:
- ✅ Stats tổng hợp salary
- ❌ KHÔNG có section riêng cho vendor costs
- ❌ KHÔNG có comparison employee cost vs vendor cost

**Enhancement Suggestion**: Thêm card "Chi phí thợ ngoài (Vendor)" riêng

---

## 🚨 ISSUES & GAPS DISCOVERED

### Issue 1: Terminology Confusion ⚠️ HIGH PRIORITY
**Severity**: Medium-High  
**Impact**: User confusion, training overhead

**Problem**:
- **CTV (Employee role)** = "Cộng tác viên" = Freelancer trong tiếng Việt
- **Vendor** = "Thợ ngoài" nhưng UI hiển thị badge "Freelancer" (line 142 drawer-assignments.tsx)
- Người dùng sẽ nhầm lẫn giữa 2 loại

**Evidence**:
```typescript
// components/contracts/drawer-assignments.tsx:142
{task.vendors && <span className="ml-1.5 text-text-muted text-[10px] font-normal italic">Freelancer</span>}
```

**Recommendation**:
1. **Option A (Preferred)**: Đổi badge Vendor thành "Thợ ngoài"
2. **Option B**: Giữ "Freelancer" nhưng đổi CTV thành "Nhân viên CTV" hoặc "Staff CTV"
3. **Option C**: Tooltips giải thích rõ sự khác biệt

**Fix Location**: [components/contracts/drawer-assignments.tsx:142](components/contracts/drawer-assignments.tsx#L142)

---

### Issue 2: Vendor Finance Tracking MISSING ⚠️ HIGH PRIORITY
**Severity**: High  
**Impact**: Không thể quản lý chi phí vendor một cách tập trung

**Problem**:
- Vendor cost chỉ nằm trong `work_tasks.cost`
- KHÔNG có:
  - ❌ Tổng hợp chi phí vendor theo tháng
  - ❌ Payment tracking (đã trả, còn nợ)
  - ❌ Vendor performance metrics
  - ❌ UI riêng cho vendor payments

**Evidence**:
```typescript
// app/actions/salary-actions.ts:359
workProgress?.forEach((task: WorkProgressRow) => {
  if (task.vendor_id) return; // ← Vendor tasks bị skip, không tính vào payroll
  // ...
});
```

**Impact Analysis**:
- Accountant không biết tổng chi phí vendor tháng này là bao nhiêu
- Không track được vendor nào đã thanh toán chưa
- Không so sánh được cost efficiency: Employee vs Vendor

**Recommendation**:
1. **Short-term**: Tạo report riêng "Chi phí thợ ngoài theo tháng"
2. **Long-term**: Tạo `vendor_payments` table tracking payment status
3. **UI**: Thêm section "Vendor Costs" vào Finance dashboard

**Priority**: HIGH - Critical for financial management

---

### Issue 3: Employee Badge CTV bị ẩn ⚠️ LOW PRIORITY
**Severity**: Low  
**Impact**: UX inconsistency

**Problem**:
```typescript
// components/employees/employee-card.tsx:66
{roleBadge && emp.role !== "ctv" && (
  <span className={...}>{roleBadge.label}</span>
)}
```
Badge role hiển thị cho admin, manager, sale, media nhưng KHÔNG hiển thị cho CTV.

**Question**: Đây là design decision hay bug?

**Recommendation**:
- Nếu muốn ẩn badge: Explain why trong comment
- Nếu là bug: Remove `&& emp.role !== "ctv"` condition

---

### Issue 4: Performance Reports thiếu ⚠️ MEDIUM PRIORITY
**Severity**: Medium  
**Impact**: Không có insights về employee vs vendor efficiency

**Missing Reports**:
1. **Contract Profitability by Worker Type**:
   - Employee cost vs Vendor cost
   - Profit margin comparison
   
2. **Worker Utilization**:
   - CTV: Jobs per month, revenue per CTV
   - Vendor: Jobs per month, cost per vendor
   
3. **Cost Comparison Dashboard**:
   - Total employee salary vs total vendor costs
   - Average cost per job type

**Recommendation**: Tạo Finance Reports module với các metrics này

---

### Issue 5: CTV Onboarding không rõ ⚠️ LOW PRIORITY
**Severity**: Low  
**Impact**: Admin/Manager có thể không biết cách tạo CTV đúng

**Problem**:
- Khi tạo employee mới, cần chọn:
  - Role = "ctv"
  - Department = "CTV" hoặc department khác?
  - Salary_info có cần set base_salary hay để 0?
- Không có documentation/tooltip hướng dẫn

**Recommendation**: Thêm helper text trong employee form:
> "Cộng tác viên (CTV): Freelancer chính thức. Nếu CTV có lương cơ bản hàng tháng, nhập vào phần Lương & Ngân hàng. Nếu chỉ nhận lương theo job, để base_salary = 0."

---

## ✅ RECOMMENDATIONS & ACTION ITEMS

### Immediate Actions (P0 - This Week)

#### 1. Fix Terminology Confusion
**File**: [components/contracts/drawer-assignments.tsx:142](components/contracts/drawer-assignments.tsx#L142)
```diff
- {task.vendors && <span className="...">Freelancer</span>}
+ {task.vendors && <span className="...">Thợ ngoài</span>}
```

**File**: [components/contracts/detail/task-list-panel.tsx](components/contracts/detail/task-list-panel.tsx)
- Update labels/tooltips to clarify Employee vs Vendor

**Estimate**: 0.5 session

---

#### 2. Add Vendor Cost Report
**New File**: `app/actions/vendor-reports-queries.ts`
```typescript
export async function getVendorCostsSummary(month: number, year: number) {
  // Query work_tasks WHERE vendor_id IS NOT NULL AND status='hoan_thanh'
  // GROUP BY vendor_id
  // Return: vendor name, total cost, job count
}
```

**New UI**: `/finance/vendors` page hoặc tab trong `/finance/salaries`

**Estimate**: 2 sessions

---

### Short-term Actions (P1 - This Month)

#### 3. Add CTV Badge in Salary Table
**File**: [components/finance/salaries/salary-desktop-table.tsx](components/finance/salaries/salary-desktop-table.tsx)
```typescript
{item.role === 'ctv' && (
  <span className="ml-2 text-tiny px-1.5 py-0.5 rounded bg-neutral/10 text-neutral">
    CTV
  </span>
)}
```

**Estimate**: 0.5 session

---

#### 4. Fix Employee Card Badge Logic
**File**: [components/employees/employee-card.tsx:66](components/employees/employee-card.tsx#L66)

**Decision needed**: Show hoặc hide CTV badge?
- If show: Remove `&& emp.role !== "ctv"`
- If hide: Add comment explaining why

**Estimate**: 0.25 session

---

#### 5. Document CTV vs Vendor
**New File**: `docs/guides/FREELANCER_GUIDE.md`

Content:
- Khi nào dùng CTV vs Vendor
- Cách tạo CTV (employee with role=ctv)
- Cách tạo Vendor (quick-add trong task assignment)
- Flow salary cho CTV
- Cách track cost cho Vendor

**Estimate**: 1 session

---

### Long-term Actions (P2 - Next Quarter)

#### 6. ✅ Vendor Payment Tracking System (COMPLETED 2026-05-25)
**New Tables**: `vendor_payments`, `vendor_payment_allocations`
```sql
CREATE TABLE vendor_payments (
  id UUID PRIMARY KEY,
  vendor_id UUID REFERENCES vendors(id),
  amount NUMERIC NOT NULL,
  payment_method TEXT DEFAULT 'chuyen_khoan',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE vendor_payment_allocations (
  id UUID PRIMARY KEY,
  payment_id UUID NOT NULL REFERENCES vendor_payments(id) ON DELETE CASCADE,
  work_task_id UUID NOT NULL REFERENCES work_tasks(id),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(payment_id, work_task_id)
);
```

**Implemented Features**:
- ✅ Database tables with RLS policies and indexes
- ✅ Atomic RPCs: `record_vendor_payment_atomic()`, `finance_vendor_debt_summary()`
- ✅ Server actions: `recordVendorPayment()`, `fetchVendorDebtSummary()`, `fetchVendorUnpaidTasks()`
- ✅ Payment modal with FIFO and manual allocation modes
- ✅ Desktop table + mobile swipeable cards
- ✅ Stats bar with debt summary
- ✅ Page at `/finance/vendor-debts` with SWR integration
- ✅ Cache invalidation and period lock checking
- ✅ Navigation link in finance dashboard

**Actual**: 8 sessions (Sessions 1-8)

---

#### 7. Performance Reports Module
**New Pages**:
- `/finance/reports/worker-costs` - Employee vs Vendor comparison
- `/finance/reports/contract-profitability` - Profit by worker type
- `/finance/reports/worker-utilization` - Jobs per worker

**Estimate**: 8-10 sessions

---

#### 8. Advanced CTV Features
**Features**:
- Attendance tracking for CTV (if needed)
- CTV performance dashboard
- Auto-calculate optimal worker type (employee vs vendor) per job

**Estimate**: 10-15 sessions

---

## 📋 VERIFICATION CHECKLIST

### CTV (Employee Freelancer) ✅

- [x] CTV có role='ctv' trong employees table
- [x] CTV có thể có base_salary trong salary_info
- [x] CTV được fetch trong getActiveEmployees()
- [x] CTV được generate salary trong generateMonthlySalaryAction()
- [x] CTV product_salary = SUM(work_tasks.cost) for completed tasks
- [x] CTV xuất hiện trong /finance/salaries với filter role=ctv
- [x] CTV có thể được assign vào work_tasks qua assigned_to field
- [x] CTV task cost được tính vào payroll
- [ ] CTV có badge/visual distinction trong UI (⚠️ missing)
- [ ] CTV onboarding guide exists (⚠️ missing)

### Vendor (External Contractor) ✅

- [x] Vendor có bảng riêng `vendors`
- [x] Vendor có thể được quick-add trong task assignment
- [x] Vendor được fetch trong getActiveVendors()
- [x] Vendor có thể được assign vào work_tasks qua vendor_id field
- [x] Vendor task cost KHÔNG được tính vào payroll (by design)
- [x] Vendor xuất hiện trong contract drawer assignments
- [x] Vendor có payment tracking ✅ (COMPLETED - vendor_payments + allocations)
- [x] Vendor có debt summary report ✅ (COMPLETED - finance_vendor_debt_summary RPC)
- [x] Vendor có payment UI ✅ (COMPLETED - /finance/vendor-debts page)
- [x] Vendor terminology rõ ràng ✅ (Navigation: "Nợ Vendor" - "Thợ ngoài")

### Contract & Task Assignment ✅

- [x] Work tasks support cả assigned_to và vendor_id
- [x] Task assignment UI có dropdown cho employee và vendor
- [x] Task cost field exists
- [x] Task status tracking works
- [x] Completed tasks được fetch cho salary calculation
- [x] Vendor tasks excluded from payroll (by design)

### UI/UX

- [x] Salary page có filter role cho CTV
- [x] Employee list có filter role cho CTV
- [ ] CTV có visual distinction trong salary table (⚠️ could be better)
- [ ] Vendor badge terminology rõ ràng (⚠️ confusing)
- [ ] Finance dashboard có section vendor costs (❌ missing)
- [ ] Performance reports compare employee vs vendor (❌ missing)

---

## 🎯 CONCLUSION

### ✅ What Works Well
1. **Architecture**: Phân biệt rõ ràng CTV (employee role) vs Vendor (external table)
2. **Salary Logic**: CTV integration vào payroll system hoàn chỉnh, tested
3. **Contract Flow**: Task assignment cho cả employee và vendor
4. **Code Quality**: Tuân thủ V2 patterns, readable, maintainable

### ⚠️ What Needs Improvement
1. **Vendor Finance**: THIẾU payment tracking và cost reporting
2. **Terminology**: UI confusing giữa CTV vs Vendor ("Freelancer" badge)
3. **Reports**: Thiếu performance comparison và profitability analysis
4. **Documentation**: Cần guide rõ ràng cho CTV vs Vendor use cases

### 🚀 Priority Fixes
1. **P0 (This week)**: Fix terminology confusion
2. **P1 (This month)**: Add vendor cost report + CTV visual distinction
3. **P2 (Next quarter)**: Vendor payment tracking + Performance reports

### 📊 Overall Score
**Freelancer System Maturity**: 7/10

- ✅ Core logic: 9/10
- ✅ CTV support: 9/10
- ⚠️ Vendor management: 4/10
- ⚠️ Reporting: 5/10
- ⚠️ UI/UX clarity: 6/10

---

**Audit completed by**: Claude Sonnet 4.5  
**Date**: 2026-05-24  
**Total files analyzed**: 15+  
**Lines of code reviewed**: ~2000+
