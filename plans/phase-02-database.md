# Phase 02: Database Schema & RLS — DESIGN

**Status:** ✅ Done
**Dependencies:** Phase 01 (Foundation)
**Est.:** 1.5 days → Actual: ~1 hour
**Source:** V1 deep audit + brainstorm 2026-03-16
**Applied:** 2026-03-16 01:44 (8 migrations)

---

## Objective

Thiết kế và apply **35 bảng** database cho TOÀN BỘ hệ thống (không chỉ MVP).
Tạo RLS policies cho 5 roles. 13 ENUMs. Soft delete. Gallery support.

---

## 1. ENUMs (13 — thay thế mọi VARCHAR status/type)

```sql
-- 1. Loại dịch vụ (12 loại, 3 nhóm)
CREATE TYPE service_type_enum AS ENUM (
  'studio', 'ngay_cuoi', 'combo',
  'baby', 'gia_dinh', 'sinh_nhat',
  'bau', 'concept', 'couple', 'ky_yeu',
  'media', 'khac'
);

-- 2. Trạng thái HĐ (4 bước — V1 proven)
CREATE TYPE contract_status_enum AS ENUM (
  'cho_xu_ly', 'dang_thuc_hien', 'hoan_thanh', 'da_huy'
);

-- 3. Trạng thái thanh toán (TÁCH riêng — V2 cải tiến)
CREATE TYPE payment_status_enum AS ENUM (
  'chua_thanh_toan', 'da_coc', 'thanh_toan_mot_phan', 'da_thanh_toan', 'hoan_tien'
);

-- 4. Loại item trong HĐ (4 loại)
CREATE TYPE item_type_enum AS ENUM (
  'dich_vu', 'san_pham', 'trang_phuc', 'phat_sinh'
);

-- 5. Loại phát sinh (5 loại — V1 constants, giờ lưu DB)
CREATE TYPE addon_category_enum AS ENUM (
  'makeup', 'trang_phuc', 'phu_kien', 'them_gio', 'khac'
);

-- 6. Loại xuất
CREATE TYPE export_type_enum AS ENUM ('xuat_ban', 'xuat_thue');

-- 7. Phương thức thanh toán
CREATE TYPE payment_method_enum AS ENUM ('tien_mat', 'chuyen_khoan');

-- 8. Loại sự kiện
CREATE TYPE event_type_enum AS ENUM (
  'ngay_chup', 'ngay_to_chuc', 'hau_ky', 'giao_san_pham'
);

-- 9. Trạng thái task
CREATE TYPE task_status_enum AS ENUM (
  'chua_lam', 'dang_lam', 'hoan_thanh', 'da_huy'
);

-- 10. Loại công việc (13 loại)
CREATE TYPE work_type_enum AS ENUM (
  'concept', 'kich_ban', 'chup_anh', 'quay_phim', 'makeup',
  'tro_ly', 'cameraman', 'hau_ky_anh', 'dung_phim', 'retouch',
  'premiere', 'bien_tap', 'khac'
);

-- 11. Status in ấn pipeline
CREATE TYPE printing_status_enum AS ENUM (
  'moi', 'dang_in', 'da_ve', 'da_giao'
);

-- 12. Loại giao dịch (HĐ vs hoá đơn nhanh)
CREATE TYPE transaction_type_enum AS ENUM ('hop_dong', 'hoa_don');

-- 13. Role nhân viên
CREATE TYPE employee_role_enum AS ENUM (
  'admin', 'manager', 'sale', 'media', 'ctv'
);
```

---

## 2. Tables — 35 bảng, 9 nhóm

### Nhóm A: PEOPLE (3 bảng)

#### A1. `studio_info` — Thông tin studio (1 row)
| Cột | Type | V1? |
|-----|------|-----|
| id | UUID PK | ✅ |
| name | VARCHAR(255) NOT NULL | ✅ |
| address | TEXT | ✅ |
| hotline | VARCHAR(20) | ✅ |
| representative | VARCHAR(255) | ✅ |
| logo_url | TEXT | ✅ |
| bank_info | JSONB | 🆕 V1 dùng 2 cột → JSONB linh hoạt |
| social_links | JSONB | 🆕 {website, fanpage, zalo, email} |
| working_hours | JSONB | 🆕 {start, end, lunch_break, days_per_month} |
| timezone | VARCHAR(50) DEFAULT 'Asia/Ho_Chi_Minh' | 🆕 |
| created_at, updated_at | TIMESTAMPTZ | ✅ |

#### A2. `employees` — Nhân sự + auth
| Cột | Type | V1? |
|-----|------|-----|
| id | UUID PK | ✅ |
| auth_user_id | UUID UNIQUE | 🆕 FK → auth.users |
| employee_code | VARCHAR(50) UNIQUE NOT NULL | ✅ |
| full_name | VARCHAR(255) NOT NULL | ✅ |
| gender | VARCHAR(10) | ✅ |
| avatar_url | TEXT | ✅ |
| phone, email | VARCHAR | ✅ |
| department, position | VARCHAR(100) | ✅ |
| role | employee_role_enum | ✅→ENUM |
| status | VARCHAR(20) DEFAULT 'active' | ✅ |
| salary_info | JSONB | 🆕 {base, allowance, commission_rate} |
| start_date | DATE | ✅ |
| deleted_at | TIMESTAMPTZ | 🆕 Soft delete |
| created_at, updated_at | TIMESTAMPTZ | ✅ |

> ⚠️ Bỏ `password_hash` — dùng Supabase Auth

#### A3. `customers` — Khách hàng
| Cột | Type | V1? |
|-----|------|-----|
| id | UUID PK | ✅ |
| customer_code | VARCHAR(50) UNIQUE NOT NULL | ✅ |
| full_name | VARCHAR(255) NOT NULL | ✅ |
| phone, alt_phone | VARCHAR(20) | ✅ |
| email | VARCHAR(255) | ✅ |
| address | TEXT | ✅ |
| gender | VARCHAR(10) | ✅ |
| date_of_birth | DATE | ✅ |
| wedding_date | DATE | ✅ |
| avatar_url | TEXT | ✅ |
| source | VARCHAR(100) | 🆕 Facebook/Zalo/Walk-in/Referral |
| notes | TEXT | ✅ |
| tags | TEXT[] | 🆕 VIP, Regular, New |
| status | VARCHAR(20) DEFAULT 'active' | ✅ |
| deleted_at | TIMESTAMPTZ | 🆕 |
| created_by | UUID FK → employees | ✅ |
| created_at, updated_at | TIMESTAMPTZ | ✅ |

---

### Nhóm B: CONTRACTS (3 bảng)

#### B1. `contracts` — Hợp đồng (core)
| Cột | Type | V1? |
|-----|------|-----|
| id | UUID PK | ✅ |
| contract_code | VARCHAR(50) UNIQUE NOT NULL | ✅ |
| transaction_type | transaction_type_enum | 🆕 hop_dong/hoa_don |
| customer_id | UUID FK → customers | ✅ **FK only** |
| service_type | service_type_enum | ✅→ENUM 12 loại |
| status | contract_status_enum | ✅→ENUM 4 bước |
| payment_status | payment_status_enum | 🆕 Tách riêng |
| contract_date | DATE NOT NULL | ✅ |
| work_date | TIMESTAMPTZ | ✅ |
| delivery_date | DATE | ✅ |
| total_amount | DECIMAL(15,2) NOT NULL | ✅ |
| discount_amount | DECIMAL(15,2) DEFAULT 0 | ✅ |
| paid_amount | DECIMAL(15,2) DEFAULT 0 | ✅ |
| remaining_amount | DECIMAL(15,2) DEFAULT 0 | ✅ |
| description | TEXT | ✅ |
| notes | TEXT | ✅ |
| created_by | UUID FK → employees | ✅ |
| assigned_to | UUID FK → employees | 🆕 |
| updated_by | UUID FK → employees | 🆕 |
| deleted_at | TIMESTAMPTZ | 🆕 |
| created_at, updated_at | TIMESTAMPTZ | ✅ |

> Bỏ: customer_name, appointment_1..4, status_2, work_status, *_history TEXT dumps, selected_services

#### B2. `contract_items` — Chi tiết HĐ (cải tiến V1)
| Cột | Type | V1? |
|-----|------|-----|
| id | UUID PK | ✅ |
| contract_id | UUID FK → contracts CASCADE | ✅ |
| type | item_type_enum | ✅→ENUM |
| is_addon | BOOLEAN DEFAULT false | 🆕 Phân biệt gốc vs phát sinh |
| addon_category | addon_category_enum | 🆕 Chỉ khi is_addon=true |
| service_id | UUID FK → services (nullable) | ✅ |
| item_name | VARCHAR(255) | ✅ |
| export_type | export_type_enum | ✅→ENUM |
| quantity | INTEGER DEFAULT 1 | ✅ |
| unit_price | DECIMAL(15,2) | ✅ |
| original_price | DECIMAL(15,2) | 🆕 So sánh giảm giá |
| discount_amount | DECIMAL(15,2) DEFAULT 0 | ✅ |
| total_amount | DECIMAL(15,2) | ✅ |
| inventory_item_id | UUID FK → inventory_items | 🆕 Liên kết kho |
| notes | TEXT | ✅ |
| added_by | UUID FK → employees | ✅ |
| created_at, updated_at | TIMESTAMPTZ | ✅ |

> Bỏ: customer_id, contract_date (thừa — đã trên contracts)

#### B3. `contract_events` — Sự kiện lịch (V2 mới)
| Cột | Type | Ghi chú |
|-----|------|---------|
| id | UUID PK | |
| contract_id | UUID FK → contracts | |
| event_type | event_type_enum | Ngày chụp/Tổ chức/Hậu kỳ/Giao SP |
| title | VARCHAR(255) | "Chụp ngoại cảnh Đà Lạt" |
| event_date | TIMESTAMPTZ | |
| end_date | TIMESTAMPTZ | |
| location | VARCHAR(255) | 🆕 |
| status | task_status_enum | |
| notes | TEXT | |
| created_at, updated_at | TIMESTAMPTZ | |

> Thay thế V1 `appointment_1..4` hardcode

---

### Nhóm C: WORK & TASKS (2 bảng)

#### C1. `work_tasks` — Công việc team media
| Cột | Type | V1? |
|-----|------|-----|
| id | UUID PK | ✅ |
| contract_id | UUID FK → contracts | ✅ |
| event_id | UUID FK → contract_events | 🆕 |
| work_type | work_type_enum | ✅→ENUM |
| assigned_to | UUID FK → employees | ✅ |
| status | task_status_enum | ✅→ENUM |
| deadline | TIMESTAMPTZ | ✅ |
| start_date, completion_date | TIMESTAMPTZ | ✅ |
| cost | DECIMAL(15,2) DEFAULT 0 | ✅ |
| notes | TEXT | ✅ |
| created_by | UUID FK → employees | ✅ |
| created_at, updated_at | TIMESTAMPTZ | ✅ |

#### C2. `schedules` — Lịch team
| Cột | Type | V1? |
|-----|------|-----|
| id | UUID PK | ✅ |
| contract_id | UUID FK → contracts | ✅ |
| employee_id | UUID FK → employees | ✅ |
| event_date, end_date | TIMESTAMPTZ | ✅ |
| location | VARCHAR(255) | ✅ |
| role_in_event | work_type_enum | 🆕 |
| notes | TEXT | ✅ |
| created_at, updated_at | TIMESTAMPTZ | ✅ |

---

### Nhóm D: FINANCE (6 bảng)

#### D1. `payments` — Phiếu thu
| Cột | Type | V1? |
|-----|------|-----|
| id | UUID PK | ✅ |
| receipt_code | VARCHAR(50) UNIQUE | ✅ |
| contract_id | UUID FK → contracts (nullable) | ✅ |
| customer_id | UUID FK → customers | ✅ |
| amount | DECIMAL(15,2) NOT NULL | ✅ |
| payment_method | payment_method_enum | ✅→ENUM |
| payment_date | DATE NOT NULL | ✅ |
| payment_stage | VARCHAR(100) | ✅ "Đặt cọc", "TT đợt 2" |
| category_id | UUID FK → transaction_categories | ✅ |
| image_url | TEXT | ✅ Ảnh biên nhận |
| notes | TEXT | ✅ |
| approved_by | UUID FK → employees | ✅ |
| created_by | UUID FK → employees | ✅ |
| deleted_at | TIMESTAMPTZ | 🆕 |
| created_at, updated_at | TIMESTAMPTZ | ✅ |

#### D2. `payment_plans` — Kế hoạch thanh toán
| Cột | Type | V1? |
|-----|------|-----|
| id | UUID PK | ✅ |
| contract_id | UUID FK → contracts | ✅ |
| stage_name | VARCHAR(100) | ✅ |
| amount | DECIMAL(15,2) | ✅ |
| due_date | DATE | ✅ |
| status | VARCHAR(20) | ✅ pending/paid/overdue |
| receipt_id | UUID FK → payments | ✅ |
| created_at | TIMESTAMPTZ | ✅ |

#### D3. `expenses` — Phiếu chi
| Cột | Type | V1? |
|-----|------|-----|
| id | UUID PK | ✅ |
| expense_date | DATE NOT NULL | ✅ |
| payment_method | payment_method_enum | ✅→ENUM |
| category_id | UUID FK → transaction_categories | ✅ |
| contract_id | UUID FK → contracts (nullable) | ✅ |
| employee_salary_id | UUID FK → employee_salaries | ✅ |
| amount | DECIMAL(15,2) NOT NULL | ✅ |
| description | TEXT | ✅ |
| recipient | VARCHAR(255) | ✅ |
| image_url | TEXT | ✅ |
| approved_by | UUID FK → employees | ✅ |
| created_by | UUID FK → employees | ✅ |
| deleted_at | TIMESTAMPTZ | 🆕 |
| created_at, updated_at | TIMESTAMPTZ | ✅ |

#### D4. `transaction_categories` — Danh mục thu/chi
| Cột | Type | V1? |
|-----|------|-----|
| id | UUID PK | ✅ |
| category_code | VARCHAR(50) UNIQUE NOT NULL | ✅ |
| name | VARCHAR(255) NOT NULL | ✅ |
| type | VARCHAR(20) NOT NULL | ✅ 'thu'/'chi' |
| is_default | BOOLEAN DEFAULT false | ✅ |
| created_at, updated_at | TIMESTAMPTZ | ✅ |

#### D5. `debts` — Công nợ
| Cột | Type | V1? |
|-----|------|-----|
| id | UUID PK | ✅ |
| type | VARCHAR(20) | ✅ 'receivable'/'payable' |
| entity_type | VARCHAR(50) | ✅ customer/supplier/lab/employee |
| entity_id | UUID | ✅ |
| entity_name | VARCHAR(255) | ✅ **Chấp nhận denormalize** |
| amount, paid_amount, remaining | DECIMAL(15,2) | ✅ |
| due_date | DATE | ✅ |
| status | VARCHAR(20) | ✅ open/partial/closed |
| notes | TEXT | ✅ |
| created_by | UUID FK → employees | ✅ |
| created_at, updated_at | TIMESTAMPTZ | ✅ |

#### D6. `fixed_costs` — Chi phí cố định
| Cột | Type | V1? |
|-----|------|-----|
| id | UUID PK | ✅ |
| cost_code | VARCHAR(50) UNIQUE NOT NULL | ✅ |
| cost_name | VARCHAR(255) NOT NULL | ✅ |
| cost_type | VARCHAR(100) | ✅ |
| monthly_amount | DECIMAL(15,2) DEFAULT 0 | ✅ |
| start_date, end_date | DATE | ✅ |
| created_by | UUID FK → employees | ✅ |
| created_at, updated_at | TIMESTAMPTZ | ✅ |

---

### Nhóm E: INVENTORY (4 bảng)

#### E1. `services` — Catalog dịch vụ/sản phẩm
| Cột | Type | V1? |
|-----|------|-----|
| id | UUID PK | ✅ |
| service_code | VARCHAR(50) UNIQUE NOT NULL | ✅ |
| name | VARCHAR(255) NOT NULL | ✅ |
| service_type | service_type_enum | ✅→ENUM |
| category_id | UUID FK → service_categories | 🆕 |
| selling_price | DECIMAL(15,2) NOT NULL | ✅ |
| cost_price | DECIMAL(15,2) DEFAULT 0 | ✅ |
| description | TEXT | ✅ |
| image_url | TEXT | ✅ |
| status | VARCHAR(20) DEFAULT 'active' | ✅ |
| created_at, updated_at | TIMESTAMPTZ | ✅ |

> Bỏ: quantity_in/out/stock (→ dùng inventory_items riêng)

#### E2. `service_categories` — Phân loại DV (V2 mới)
| Cột | Type |
|-----|------|
| id | UUID PK |
| name | VARCHAR(100) NOT NULL |
| parent_id | UUID FK → self (nullable) |
| sort_order | INTEGER DEFAULT 0 |
| created_at, updated_at | TIMESTAMPTZ |

#### E3. `inventory_items` — Kho trang phục + vật tư
| Cột | Type | V1? |
|-----|------|-----|
| id | UUID PK | ✅ |
| item_code | VARCHAR(50) UNIQUE NOT NULL | ✅ |
| name | VARCHAR(255) NOT NULL | ✅ |
| category | VARCHAR(100) | ✅ Váy cưới/Áo dài/Vest/Phụ kiện/Vật tư |
| size | VARCHAR(20) | ✅ |
| color | VARCHAR(50) | ✅ |
| condition | VARCHAR(50) | ✅ new/good/fair/damaged |
| rental_price | DECIMAL(15,2) DEFAULT 0 | ✅ |
| sale_price | DECIMAL(15,2) DEFAULT 0 | ✅ |
| current_stock | INTEGER DEFAULT 0 | ✅ (cho vật tư tiêu hao) |
| min_stock | INTEGER DEFAULT 0 | ✅ |
| image_url | TEXT | ✅ |
| status | VARCHAR(20) DEFAULT 'available' | ✅ |
| notes | TEXT | ✅ |
| created_at, updated_at | TIMESTAMPTZ | ✅ |

> Gom V1 `wedding_dresses` + `inventory_items` vào 1 bảng — dùng `category` phân biệt

#### E4. `inventory_reservations` — Đặt trước trang phục (V2 mới)
| Cột | Type |
|-----|------|
| id | UUID PK |
| inventory_item_id | UUID FK → inventory_items |
| contract_id | UUID FK → contracts (nullable) |
| contract_item_id | UUID FK → contract_items (nullable) |
| customer_id | UUID FK → customers |
| start_date, end_date | DATE |
| export_type | export_type_enum |
| status | VARCHAR(20) | reserved/active/returned/cancelled |
| notes | TEXT |
| created_at, updated_at | TIMESTAMPTZ |

---

### Nhóm F: PRINTING (3 bảng)

#### F1. `labs` — Xưởng in
V1 giữ nguyên: id, name, contact_person, phone, address, created_at

#### F2. `lab_services` — Bảng giá lab
V1 giữ nguyên: id, lab_id FK, item_name, cost_price, created_at, updated_at

#### F3. `printing_orders` — Đơn in
| Cột | Type | V1? |
|-----|------|-----|
| id | UUID PK | ✅ |
| order_code | VARCHAR(50) UNIQUE | 🆕 |
| contract_id | UUID FK → contracts | ✅ |
| lab_id | UUID FK → labs | ✅ |
| items | JSONB | ✅ [{name, size, qty, price}] |
| total_amount | DECIMAL(15,2) | ✅ |
| status | printing_status_enum | ✅→ENUM |
| payment_status | VARCHAR(50) | ✅ |
| order_date, expected_date, received_date | DATE | ✅ |
| notes | TEXT | ✅ |
| created_by | UUID FK → employees | ✅ |
| created_at, updated_at | TIMESTAMPTZ | ✅ |

---

### Nhóm G: HR (6 bảng)

#### G1. `work_shifts` — Ca làm việc
V1 giữ nguyên: id, shift_name, start_time, end_time, lunch_break_hours, total_hours

#### G2. `attendance` — Chấm công
V1 giữ nguyên + **bỏ** employee_name/employee_code/department (denormalize)

#### G3. `monthly_salaries` — Bảng lương tháng
V1 giữ nguyên: id, salary_code, year, month, totals

#### G4. `employee_salaries` — Lương chi tiết NV/tháng
V1 giữ nguyên + **bỏ** employee_name/department (denormalize)

#### G5. `requests` — Đơn xin nghỉ/tạm ứng
V1 giữ nguyên: id, request_date, request_type, leave_type, reason, amount, requester_id, approver_id, status

#### G6. `evaluations` — Thưởng/Phạt
V1 giữ nguyên + **bỏ** employee_name/employee_code (denormalize)

---

### Nhóm H: GALLERY (2 bảng — V2 mới)

#### H1. `galleries` — Bộ ảnh online cho khách
| Cột | Type |
|-----|------|
| id | UUID PK |
| contract_id | UUID FK → contracts |
| title | VARCHAR(255) |
| access_url | TEXT |
| password | VARCHAR(100) |
| status | VARCHAR(20) DEFAULT 'draft' | draft/shared/completed |
| selection_deadline | DATE |
| shared_at | TIMESTAMPTZ |
| created_by | UUID FK → employees |
| created_at, updated_at | TIMESTAMPTZ |

#### H2. `gallery_images` — Ảnh trong gallery
| Cột | Type |
|-----|------|
| id | UUID PK |
| gallery_id | UUID FK → galleries CASCADE |
| image_url | TEXT NOT NULL |
| thumbnail_url | TEXT |
| sort_order | INTEGER DEFAULT 0 |
| is_selected | BOOLEAN DEFAULT false |
| client_note | TEXT |
| created_at | TIMESTAMPTZ |

---

### Nhóm I: SYSTEM (6 bảng)

#### I1. `notifications` — Thông báo
V1 giữ nguyên + thêm `resource_type`, `resource_id`

#### I2. `audit_logs` — Nhật ký thao tác
V1 giữ nguyên. JSONB old_data/new_data. Trigger cho bảng nhạy cảm.

#### I3. `crm_leads` — Khách hàng tiềm năng
V1 giữ nguyên: contact_date, phone, source, needs, assigned_to, potential, status, care_history

#### I4. `equipment` — Tài sản/Thiết bị
V1 giữ nguyên: equipment_code, name, type, purchase_price, depreciation, current_holder

#### I5. `promotions` — Khuyến mãi/Voucher
V1 giữ nguyên: promo_code, discount_type, discount_value, start/end_date, usage_limit/count

#### I6. `documents` — Tài liệu + Nội quy (gom 2 bảng V1)
| Cột | Type | V1? |
|-----|------|-----|
| id | UUID PK | ✅ |
| document_code | VARCHAR(50) UNIQUE NOT NULL | ✅ |
| document_type | VARCHAR(100) | ✅ 'tai_lieu'/'noi_quy' |
| name | VARCHAR(255) NOT NULL | ✅ |
| department | VARCHAR(100) | ✅ |
| description | TEXT | ✅ |
| file_url | TEXT | ✅ |
| penalty_amount | DECIMAL(15,2) | ✅ Chỉ cho nội quy |
| status | VARCHAR(50) | ✅ |
| created_by | UUID FK → employees | ✅ |
| created_at, updated_at | TIMESTAMPTZ | ✅ |

---

## 3. Key Indexes

```sql
-- Contracts
CREATE INDEX idx_contracts_customer ON contracts(customer_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_service_type ON contracts(service_type);
CREATE INDEX idx_contracts_date ON contracts(contract_date);
CREATE INDEX idx_contracts_active ON contracts(status) WHERE status != 'hoan_thanh' AND deleted_at IS NULL;

-- Contract Items
CREATE INDEX idx_contract_items_contract ON contract_items(contract_id);
CREATE INDEX idx_contract_items_addon ON contract_items(contract_id) WHERE is_addon = true;

-- Payments
CREATE INDEX idx_payments_contract ON payments(contract_id);
CREATE INDEX idx_payments_date ON payments(payment_date);

-- Inventory Reservations (conflict check!)
CREATE INDEX idx_reservations_item_dates ON inventory_reservations(inventory_item_id, start_date, end_date);

-- Employees
CREATE UNIQUE INDEX idx_employees_auth ON employees(auth_user_id);

-- Work Tasks
CREATE INDEX idx_tasks_contract ON work_tasks(contract_id);
CREATE INDEX idx_tasks_assigned_status ON work_tasks(assigned_to, status);

-- Galleries
CREATE INDEX idx_galleries_contract ON galleries(contract_id);

-- Customers
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_tags ON customers USING GIN (tags);
```

---

## 4. RLS Policies (V1 lessons applied)

```
Strategy: SELECT qua RLS, WRITE qua Server Actions + Service Role

Roles:
- admin: xem/sửa tất cả
- manager: xem tất cả, sửa trừ salary settings
- sale: xem/sửa HĐ do mình tạo + khách hàng
- media: xem tasks assigned, xem schedules
- ctv: xem tasks assigned only
```

```sql
-- Pattern chuẩn V2 (dùng subquery cho performance)
CREATE POLICY "role_based_read" ON contracts
  FOR SELECT USING (
    (SELECT role FROM employees WHERE auth_user_id = (SELECT auth.uid()))
    IN ('admin', 'manager')
    OR created_by = (SELECT id FROM employees WHERE auth_user_id = (SELECT auth.uid()))
  );

-- Writes: KHÔNG dùng RLS policy — dùng Server Actions + Service Role
-- Server action gọi withAdmin() → supabaseAdmin → bypass RLS → audit log
```

---

## 5. Database Functions (RPCs)

```sql
-- 1. Dashboard KPIs
CREATE FUNCTION get_dashboard_stats() RETURNS JSON ...

-- 2. Check trang phục conflict
CREATE FUNCTION check_inventory_conflict(
  p_item_id UUID, p_start DATE, p_end DATE, p_exclude_reservation_id UUID DEFAULT NULL
) RETURNS BOOLEAN ...

-- 3. Tính công nợ 1 HĐ
CREATE FUNCTION get_contract_balance(p_contract_id UUID) RETURNS JSON ...

-- 4. Auto-update totals khi thêm/sửa items
CREATE FUNCTION recalc_contract_totals(p_contract_id UUID) RETURNS VOID ...

-- 5. Báo cáo phát sinh (V2 mới)
CREATE FUNCTION get_addon_report(p_month INT, p_year INT) RETURNS JSON ...

-- 6. Doanh thu theo tháng
CREATE FUNCTION get_monthly_revenue(p_year INT) RETURNS JSON ...
```

---

## 6. Triggers

```sql
-- Auto update updated_at
CREATE FUNCTION update_updated_at_column() ...
-- Apply cho mọi bảng có updated_at

-- Audit logging cho bảng nhạy cảm
-- contracts, payments, expenses, inventory_items, employee_salaries
-- Truyền user_id qua parameter, KHÔNG dùng auth.uid() (V1 bug fix)
```

---

## 7. Implementation Steps

### Migration 1: ENUMs + Core Tables
- [x] Apply 13 ENUMs
- [x] Create: studio_info, employees, customers
- [x] Create: contracts, contract_items, contract_events
- [x] Create: services, service_categories

### Migration 2: Finance + Inventory
- [x] Create: payments, payment_plans, expenses, transaction_categories, debts, fixed_costs
- [x] Create: inventory_items, inventory_reservations

### Migration 3: Work + HR
- [x] Create: work_tasks, schedules
- [x] Create: work_shifts, attendance, monthly_salaries, employee_salaries, requests, evaluations

### Migration 4: Printing + Gallery + System
- [x] Create: labs, lab_services, printing_orders
- [x] Create: galleries, gallery_images
- [x] Create: notifications, audit_logs, crm_leads, equipment, promotions, documents

### Migration 5: Indexes + RLS + Functions
- [x] Apply all indexes
- [x] Apply RLS policies (SELECT by role)
- [x] Create RPCs (3 functions + 2 helpers)
- [x] Create triggers (updated_at + audit)
- [x] Fix search_path security warnings

### Migration 6: Seed + Verify
- [x] Seed: 1 studio_info, 10 transaction_categories, 1 work_shift, 6 service_categories
- [x] Generate TypeScript types (2507 lines → types/database.types.ts)
- [x] Run Supabase security advisor (0 critical — 7 WARN fixed)
- [x] Run Supabase performance advisor (INFO only — unindexed FKs + unused indexes normal)

---

## 8. Test Criteria

- [x] 35 tables tạo OK trong Supabase (36 total incl. login_attempts)
- [x] 13 ENUMs hoạt động
- [ ] RLS: sale chỉ thấy HĐ của mình (cần test với real users)
- [ ] RLS: media chỉ thấy tasks assigned (cần test với real users)
- [ ] RLS: admin thấy tất cả (cần test với real users)
- [x] `check_inventory_conflict()` tạo OK
- [ ] Soft delete: records có `deleted_at` không hiện trong queries (cần test với data)
- [x] TypeScript types generated & importable
- [x] Supabase advisors: 0 critical issues

---

**Next Phase:** → Phase 03 (Customers CRUD)
