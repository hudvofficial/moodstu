# 🎨 DESIGN: Mood Studio v2 — Wave 1 (MVP)

**Ngày tạo:** 2026-03-15
**Dựa trên:** [BRIEF.md](./BRIEF.md) | [V1_LESSONS.md](./V1_LESSONS.md)
**Scope:** Phase 01-07 (Foundation → Dashboard)

---

## 1. DATABASE SCHEMA

### 1.1. ENUMs (TUYỆT ĐỐI KHÔNG dùng VARCHAR cho status/type!)

```sql
-- Loại dịch vụ (6 loại)
CREATE TYPE service_type AS ENUM (
  'wedding',      -- Cưới
  'baby',         -- Baby / Kids
  'concept',      -- Concept / Art
  'rental',       -- Cho thuê trang phục
  'id_photo',     -- Hình thẻ / CMND
  'invitation'    -- Thiệp cưới
);

-- Trạng thái hợp đồng (9 bước lifecycle)
CREATE TYPE contract_status AS ENUM (
  'draft',        -- Nháp
  'deposited',    -- Đã cọc
  'preparing',    -- Đang chuẩn bị (thử váy, chọn váy)
  'shooting',     -- Đang chụp
  'editing',      -- Đang hậu kỳ
  'reviewing',    -- Khách đang duyệt ảnh
  'delivering',   -- Đang giao sản phẩm
  'completed',    -- Hoàn thành
  'cancelled'     -- Đã huỷ
);

-- Phương thức thanh toán
CREATE TYPE payment_method AS ENUM (
  'cash',         -- Tiền mặt
  'transfer'      -- Chuyển khoản
);

-- Trạng thái phiếu thu
CREATE TYPE receipt_status AS ENUM (
  'pending',      -- Chờ duyệt
  'confirmed'     -- Đã xác nhận
);

-- User roles (5 vai trò)
CREATE TYPE user_role AS ENUM (
  'admin',        -- Chủ studio / Full quyền
  'manager',      -- Quản lý
  'sale',         -- Tư vấn / Sale
  'media',        -- Team media (photographer, editor, makeup)
  'viewer'        -- Chỉ xem
);

-- Loại trang phục
CREATE TYPE costume_category AS ENUM (
  'wedding_dress',  -- Váy cưới
  'ao_dai',         -- Áo dài
  'vest',           -- Vest nam
  'evening_dress',  -- Đầm dạ hội
  'accessory'       -- Phụ kiện
);

-- Trạng thái trang phục
CREATE TYPE costume_status AS ENUM (
  'available',    -- Sẵn sàng
  'rented',       -- Đang cho thuê
  'reserved',     -- Đã đặt trước
  'washing',      -- Đang giặt
  'repairing',    -- Đang sửa chữa
  'retired'       -- Thanh lý
);
```

### 1.2. Tables (MVP = 10 tables)

```sql
-- =====================================================
-- T1: STUDIO INFO (Thông tin studio)
-- =====================================================
CREATE TABLE studio_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  logo_url TEXT,
  bank_name VARCHAR(100),
  bank_account VARCHAR(50),
  bank_owner VARCHAR(100),
  tax_id VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- T2: PROFILES (User profiles, linked to Supabase Auth)
-- =====================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'viewer',
  department VARCHAR(100),  -- 'Photo', 'Makeup', 'Sale', 'Admin'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- T3: CUSTOMERS (Khách hàng)
-- =====================================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  notes TEXT,
  source VARCHAR(100),   -- 'Facebook', 'Zalo', 'Walk-in', 'Referral'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_name ON customers USING gin(full_name gin_trgm_ops);

-- =====================================================
-- T4: CONTRACTS (Hợp đồng — BẢNG TRUNG TÂM)
-- =====================================================
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_code VARCHAR(50) UNIQUE NOT NULL,  -- Auto-gen: MS-2026-001
  customer_id UUID NOT NULL REFERENCES customers(id),
  
  -- Loại dịch vụ
  service_type service_type NOT NULL,
  service_description TEXT,         -- Mô tả chi tiết gói DV
  
  -- Thời gian
  contract_date DATE NOT NULL DEFAULT CURRENT_DATE,
  event_date DATE,                  -- Ngày chụp / ngày cưới
  delivery_date DATE,               -- Ngày giao sản phẩm
  
  -- Tài chính
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  final_amount DECIMAL(15,2) NOT NULL DEFAULT 0,    -- = total - discount
  paid_amount DECIMAL(15,2) DEFAULT 0,              -- Auto-calc from receipts
  remaining_amount DECIMAL(15,2) DEFAULT 0,         -- = final - paid
  
  -- Trạng thái
  status contract_status NOT NULL DEFAULT 'draft',
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_contracts_customer ON contracts(customer_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_date ON contracts(contract_date);
CREATE INDEX idx_contracts_code ON contracts(contract_code);
CREATE INDEX idx_contracts_service_type ON contracts(service_type);

-- =====================================================
-- T5: CONTRACT ITEMS (Chi tiết dịch vụ trong HĐ)
-- =====================================================
CREATE TABLE contract_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,    -- 'Chụp ảnh cưới outdoor', 'Album 30x40'
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(15,2) DEFAULT 0,
  subtotal DECIMAL(15,2) DEFAULT 0,   -- = quantity * unit_price
  notes TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX idx_contract_items_contract ON contract_items(contract_id);

-- =====================================================
-- T6: RECEIPTS (Phiếu thu)
-- =====================================================
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id),
  
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(15,2) NOT NULL,
  payment_method payment_method NOT NULL DEFAULT 'cash',
  
  -- Tính toán (snapshot tại thời điểm thu)
  previous_paid DECIMAL(15,2) DEFAULT 0,     -- Đã trả trước đó
  remaining_after DECIMAL(15,2) DEFAULT 0,   -- Còn nợ sau lần này
  
  status receipt_status NOT NULL DEFAULT 'confirmed',
  notes TEXT,
  image_url TEXT,           -- Ảnh chứng từ
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_receipts_contract ON receipts(contract_id);
CREATE INDEX idx_receipts_date ON receipts(receipt_date);

-- =====================================================
-- T7: COSTUMES (Trang phục — váy, áo dài, vest)
-- =====================================================
CREATE TABLE costumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  costume_code VARCHAR(50) UNIQUE NOT NULL,   -- V-001, AD-001
  name VARCHAR(255) NOT NULL,
  category costume_category NOT NULL,
  color VARCHAR(50),
  size VARCHAR(20),
  image_url TEXT,
  purchase_price DECIMAL(15,2) DEFAULT 0,
  rental_price DECIMAL(15,2) DEFAULT 0,
  status costume_status NOT NULL DEFAULT 'available',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_costumes_code ON costumes(costume_code);
CREATE INDEX idx_costumes_category ON costumes(category);
CREATE INDEX idx_costumes_status ON costumes(status);

-- =====================================================
-- T8: COSTUME RENTALS (Lịch thuê trang phục)
-- =====================================================
CREATE TABLE costume_rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  costume_id UUID NOT NULL REFERENCES costumes(id),
  contract_id UUID NOT NULL REFERENCES contracts(id),
  pickup_date DATE NOT NULL,
  return_date DATE NOT NULL,
  actual_return_date DATE,
  status VARCHAR(20) DEFAULT 'reserved',  -- reserved, picked_up, returned
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Conflict check: không cho thuê 2 HĐ cùng ngày
  CONSTRAINT no_overlap_check EXCLUDE USING gist (
    costume_id WITH =,
    daterange(pickup_date, return_date, '[]') WITH &&
  )
);

CREATE INDEX idx_rentals_costume ON costume_rentals(costume_id);
CREATE INDEX idx_rentals_contract ON costume_rentals(contract_id);
CREATE INDEX idx_rentals_dates ON costume_rentals(pickup_date, return_date);

-- =====================================================
-- T9: ACTIVITY LOGS (Nhật ký hoạt động MVP — đơn giản)
-- =====================================================
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action VARCHAR(100) NOT NULL,        -- 'created_contract', 'added_receipt'
  entity_type VARCHAR(50) NOT NULL,    -- 'contract', 'receipt', 'costume'
  entity_id UUID,
  metadata JSONB,                      -- Chi tiết thêm
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_user ON activity_logs(user_id);
CREATE INDEX idx_activity_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_created ON activity_logs(created_at);
```

### 1.3. ERD (Entity Relationship Diagram)

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│  profiles   │     │    customers      │     │  studio_info │
│  (auth.users)│     │                  │     │  (singleton) │
│─────────────│     │──────────────────│     └──────────────┘
│ id (PK=auth)│     │ id               │
│ full_name   │     │ full_name        │
│ role (ENUM) │     │ phone            │
│ department  │     │ source           │
└──────┬──────┘     └────────┬─────────┘
       │                     │
       │ created_by          │ customer_id
       │                     │
       ▼                     ▼
┌─────────────────────────────────────────┐
│            contracts (CENTER)            │
│─────────────────────────────────────────│
│ id                                       │
│ contract_code (UNIQUE)                   │
│ customer_id → customers                  │
│ service_type (ENUM)                      │
│ status (ENUM, 9 steps)                   │
│ total / discount / final / paid / remain │
│ contract_date / event_date / delivery    │
└───────┬──────────┬──────────┬───────────┘
        │          │          │
        ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌─────────────────┐
│contract_ │ │ receipts │ │ costume_rentals  │
│items     │ │          │ │                  │
│──────────│ │──────────│ │─────────────────│
│item_name │ │ amount   │ │ costume_id →     │
│quantity  │ │ method   │ │   costumes       │
│unit_price│ │ status   │ │ pickup_date      │
│subtotal  │ │ image_url│ │ return_date      │
└──────────┘ └──────────┘ │ EXCLUDE overlap  │
                          └────────┬────────┘
                                   │
                                   ▼
                          ┌──────────────┐
                          │   costumes   │
                          │──────────────│
                          │ costume_code │
                          │ category ENUM│
                          │ status ENUM  │
                          │ rental_price │
                          └──────────────┘
```

### 1.4. Triggers & Functions

```sql
-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER trg_studio_info_updated BEFORE UPDATE ON studio_info
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_contracts_updated BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_receipts_updated BEFORE UPDATE ON receipts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_costumes_updated BEFORE UPDATE ON costumes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-generate contract code: MS-2026-001
CREATE OR REPLACE FUNCTION generate_contract_code()
RETURNS TRIGGER AS $$
DECLARE
  year_str TEXT;
  next_num INTEGER;
BEGIN
  year_str := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(contract_code, '-', 3) AS INTEGER)
  ), 0) + 1 INTO next_num
  FROM contracts
  WHERE contract_code LIKE 'MS-' || year_str || '-%';
  
  NEW.contract_code := 'MS-' || year_str || '-' || LPAD(next_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_contract_code BEFORE INSERT ON contracts
  FOR EACH ROW WHEN (NEW.contract_code IS NULL)
  EXECUTE FUNCTION generate_contract_code();

-- Auto-update contract financials after receipt
CREATE OR REPLACE FUNCTION update_contract_paid()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE contracts SET
    paid_amount = (
      SELECT COALESCE(SUM(amount), 0)
      FROM receipts
      WHERE contract_id = COALESCE(NEW.contract_id, OLD.contract_id)
      AND status = 'confirmed'
    ),
    remaining_amount = final_amount - (
      SELECT COALESCE(SUM(amount), 0)
      FROM receipts
      WHERE contract_id = COALESCE(NEW.contract_id, OLD.contract_id)
      AND status = 'confirmed'
    )
  WHERE id = COALESCE(NEW.contract_id, OLD.contract_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_receipt_sync AFTER INSERT OR UPDATE OR DELETE ON receipts
  FOR EACH ROW EXECUTE FUNCTION update_contract_paid();
```

### 1.5. RLS Policies (Row Level Security)

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE costumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE costume_rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- STRATEGY: Single-tenant → tất cả authenticated users đọc được
-- Mutations qua Server Actions + service_role (bypass RLS)
-- Chỉ RLS cho SELECT (read protection)

-- Profiles: ai cũng đọc được (single tenant)
CREATE POLICY "Authenticated read profiles"
  ON profiles FOR SELECT TO authenticated
  USING (true);

-- Customers: ai cũng đọc (cần xem khách để tạo HĐ)  
CREATE POLICY "Authenticated read customers"
  ON customers FOR SELECT TO authenticated
  USING (true);

-- Contracts: ai cũng đọc (Sale xem của mình, Admin xem tất cả)
CREATE POLICY "Authenticated read contracts"
  ON contracts FOR SELECT TO authenticated
  USING (true);

-- Contract Items: theo contract
CREATE POLICY "Authenticated read contract_items"
  ON contract_items FOR SELECT TO authenticated
  USING (true);

-- Receipts: ai cũng đọc (kế toán cần xem tất cả)
CREATE POLICY "Authenticated read receipts"
  ON receipts FOR SELECT TO authenticated
  USING (true);

-- Costumes: ai cũng đọc (xem kho)
CREATE POLICY "Authenticated read costumes"
  ON costumes FOR SELECT TO authenticated
  USING (true);

-- Costume Rentals: ai cũng đọc (check conflict)
CREATE POLICY "Authenticated read costume_rentals"
  ON costume_rentals FOR SELECT TO authenticated
  USING (true);

-- Activity Logs: chỉ Admin/Manager
CREATE POLICY "Admin read activity_logs"
  ON activity_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'manager')
    )
  );

-- INSERT/UPDATE/DELETE: Qua SERVER ACTIONS + service_role
-- Server Actions kiểm tra role bằng withAdmin/withAuth helpers
-- → KHÔNG cần INSERT/UPDATE/DELETE policies (service_role bypass)
```

---

## 2. SERVER ACTIONS & API DESIGN

### 2.1. Auth Actions (`app/actions/auth.ts`)

| Action | Role | Mô tả |
|--------|------|-------|
| `signIn(email, password)` | Public | Đăng nhập |
| `signOut()` | Any | Đăng xuất |
| `getProfile()` | Authenticated | Lấy profile hiện tại |

### 2.2. Customer Actions (`app/actions/customers.ts`)

| Action | Role | Mô tả |
|--------|------|-------|
| `getCustomers(search?, page?)` | Any | Danh sách + search + pagination |
| `getCustomer(id)` | Any | Chi tiết 1 khách |
| `createCustomer(data)` | Admin, Manager, Sale | Tạo mới |
| `updateCustomer(id, data)` | Admin, Manager, Sale | Cập nhật |
| `deleteCustomer(id)` | Admin | Xoá (soft delete) |

### 2.3. Contract Actions (`app/actions/contracts.ts`)

| Action | Role | Mô tả |
|--------|------|-------|
| `getContracts(filters?)` | Any | List + filter (status, type, date) |
| `getContract(id)` | Any | Chi tiết + items + receipts + rentals |
| `createContract(data)` | Admin, Manager, Sale | Tạo HĐ + items |
| `updateContract(id, data)` | Admin, Manager | Cập nhật |
| `updateContractStatus(id, status)` | Admin, Manager | Chuyển status |
| `deleteContract(id)` | Admin | Xoá (chỉ draft) |

### 2.4. Receipt Actions (`app/actions/receipts.ts`)

| Action | Role | Mô tả |
|--------|------|-------|
| `getReceipts(contractId?)` | Any | Danh sách phiếu thu |
| `createReceipt(data)` | Admin, Manager, Sale | Tạo phiếu thu (auto update contract.paid) |
| `deleteReceipt(id)` | Admin | Xoá (auto update contract.paid) |

### 2.5. Costume Actions (`app/actions/costumes.ts`)

| Action | Role | Mô tả |
|--------|------|-------|
| `getCostumes(category?, status?)` | Any | List + filter |
| `getCostume(id)` | Any | Chi tiết + rentals history |
| `createCostume(data)` | Admin, Manager | Tạo mới |
| `updateCostume(id, data)` | Admin, Manager | Cập nhật |
| `checkAvailability(costumeId, from, to)` | Any | Check conflict date range |
| `createRental(data)` | Admin, Manager, Sale | Đặt thuê (auto check conflict) |

### 2.6. Dashboard Actions (`app/actions/dashboard.ts`)

| Action | Role | Mô tả |
|--------|------|-------|
| `getDashboardStats()` | Admin, Manager | KPIs: doanh thu, HĐ mới, công nợ |
| `getRevenueChart(period)` | Admin, Manager | Doanh thu theo tháng |
| `getServiceBreakdown()` | Admin, Manager | Phân bổ theo loại DV |
| `getRecentContracts(limit)` | Any | HĐ mới nhất |

---

## 3. FRONTEND PAGES & COMPONENTS

### 3.1. Route Structure

```
app/
  login/page.tsx
  (protected)/               ← Auth guard layout
    layout.tsx               ← Sidebar + Header
    page.tsx                 ← Redirect → /dashboard
    dashboard/page.tsx       ← P07: KPIs, charts
    contracts/
      page.tsx               ← P04: List + filters
      [id]/page.tsx          ← P04: Detail view
      new/page.tsx           ← P04: Create form
    customers/
      page.tsx               ← P03: List + search
      [id]/page.tsx          ← P03: Detail + history
    payments/
      page.tsx               ← P05: All receipts
    inventory/
      page.tsx               ← P06: Costume grid
      [id]/page.tsx          ← P06: Detail + calendar
    settings/
      page.tsx               ← Studio info, profile
```

### 3.2. Shared Components

| Component | Mô tả | Nguồn |
|-----------|-------|-------|
| `Modal` | Slide-up mobile, scale-in desktop | Coffee (44 lines) |
| `CurrencyInput` | Input tiền VND format | Coffee (79 lines) |
| `TabsFilter` | Pill-style filter tabs | Coffee (29 lines) |
| `SearchBar` | Search input | Coffee |
| `Skeleton` | Loading placeholder | Coffee |
| `Badge` | Status badges | Custom |
| `EmptyState` | No data state | Custom |
| `FABButton` | Mobile floating action button | v1 |

### 3.3. Key UI Patterns

```
CONTRACTS LIST:
┌─────────────────────────────────────────┐
│ [Tabs: Tất cả | Đang xử lý | Hoàn thành | Đã huỷ] │
├─────────────────────────────────────────┤
│ [Search bar]                   [+ Tạo HĐ]│
├─────────────────────────────────────────┤
│ MS-2026-001 | Nguyễn A   | Cưới  | 15M │
│ [●Đã cọc]              Còn nợ: 10M     │
├─────────────────────────────────────────┤
│ MS-2026-002 | Trần B    | Baby  | 5M   │
│ [●Hoàn thành]           Đã TT đủ       │
└─────────────────────────────────────────┘

DASHBOARD:
┌──────────┬──────────┬──────────┬──────────┐
│ Doanh thu│  HĐ mới  │ Công nợ  │ Hoàn thành│
│  45.5M   │    12    │  23.2M   │     8    │
│ ↑12%     │ ↑3       │ ↓5%      │ ↑2       │
└──────────┴──────────┴──────────┴──────────┘
┌────────────────────────────────────────────┐
│           📊 Doanh thu theo tháng          │
│     ████                                   │
│     ████  ██                               │
│  ██ ████  ████  ██                         │
│  T1  T2   T3   T4                          │
└────────────────────────────────────────────┘

INVENTORY (Costume Grid):
┌──────────┬──────────┬──────────┐
│  [IMG]   │  [IMG]   │  [IMG]   │
│  V-001   │  V-002   │  AD-001  │
│  Váy A   │  Váy B   │  Áo dài  │
│ 🟢Sẵn sàng│ 🔴Đang thuê│ 🟡Đang giặt│
│  3.5M    │  4.0M    │  1.5M    │
└──────────┴──────────┴──────────┘
```

---

## 4. SWR CACHE KEYS (Data Fetching)

```typescript
// lib/swr.ts
export const cacheKeys = {
  // Dashboard
  dashboardStats: () => 'dashboard:stats',
  revenueChart: (period: string) => `dashboard:revenue:${period}`,
  serviceBreakdown: () => 'dashboard:breakdown',
  
  // Contracts
  contracts: (filters?: string) => `contracts${filters ? `:${filters}` : ''}`,
  contract: (id: string) => `contract:${id}`,
  
  // Customers
  customers: (search?: string) => `customers${search ? `:${search}` : ''}`,
  customer: (id: string) => `customer:${id}`,
  
  // Receipts
  receipts: (contractId?: string) => `receipts${contractId ? `:${contractId}` : ''}`,
  
  // Costumes
  costumes: (filters?: string) => `costumes${filters ? `:${filters}` : ''}`,
  costume: (id: string) => `costume:${id}`,
  costumeAvailability: (id: string, from: string, to: string) => 
    `costume:${id}:avail:${from}:${to}`,
};
```

---

## 5. ACCEPTANCE CRITERIA (Test Cases)

### 5.1. Auth & RBAC
- [ ] Login bằng email+password → redirect /dashboard
- [ ] User chưa login → redirect /login
- [ ] Role Admin thấy tất cả menu
- [ ] Role Viewer KHÔNG thấy nút Tạo/Sửa/Xoá
- [ ] Role Sale KHÔNG xem được Settings system

### 5.2. Contracts
- [ ] Tạo HĐ: chọn loại DV, nhập items, auto tính tổng
- [ ] Contract code auto-gen: MS-2026-XXX
- [ ] Status transition: draft → deposited (khi có phiếu thu đầu tiên)
- [ ] Filter theo status, service_type, date range
- [ ] Search theo tên khách / mã HĐ

### 5.3. Payments
- [ ] Tạo phiếu thu → auto update contract.paid_amount
- [ ] Xoá phiếu thu → auto giảm contract.paid_amount
- [ ] remaining_amount = final_amount - paid_amount (luôn đúng!)
- [ ] CurrencyInput format: 15.000.000 VND

### 5.4. Inventory
- [ ] CRUD trang phục OK
- [ ] Conflict check: đặt thuê cùng váy cùng ngày → báo lỗi!
- [ ] Calendar view: xem lịch thuê của từng bộ
- [ ] Status badges color-coded (🟢🔴🟡)

### 5.5. Dashboard
- [ ] KPI cards: doanh thu tháng, HĐ mới, công nợ, hoàn thành
- [ ] Revenue chart: bar chart theo tháng
- [ ] Service breakdown: pie chart theo loại DV
- [ ] Recent contracts: 5 HĐ mới nhất

---

## 6. REALTIME SUBSCRIPTIONS

```typescript
// Các bảng cần realtime (useRealtime hook)
useRealtime('contracts');        // Dashboard, Contract list
useRealtime('receipts');         // Payment page, Contract detail
useRealtime('costumes');         // Inventory page
useRealtime('costume_rentals'); // Inventory calendar
```

---

## 7. ARCHITECTURE STANDARDS & ENFORCEMENT (AWF 2.0)

*(Cập nhật 2026-03-25 — Phase A standardization)*

### 7.1. Hybrid Gold Standard
Mọi module mới/refactor phải tuân thủ bộ quy tắc:
1. **SSOT Metadata**: Mỗi page (server component) phải có metadata title/description.
2. **Server-Side Fetch**: Ưu tiên fetch data ở Page level (Server Component) và pass xuống Client Component để SWR hydrate.
3. **Audit Logging**: Mọi mutation (Insert/Update/Delete) trong Server Actions PHẢI gọi `fireAuditLog()` sau khi thành công.
4. **Zod Validation**: Input của Server Actions PHẢI được validate qua Zod schema (đặt tại `lib/validations/`).
5. **Error Boundaries**: Mỗi folder module PHẢI có `error.tsx` để handle server failures.

### 7.2. Audit Logging Pattern
Sử dụng `lib/audit.ts` (fire-and-forget logic):
```typescript
fireAuditLog({
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  tableName: 'string',
  recordId: 'uuid',
  description: 'Mô tả thân thiện',
  newData: object,
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
});
```

### 7.3. Error Boundary UI Standard
Sử dụng SSOT tokens từ `design-system.css`:
- Container: `flex flex-col items-center justify-center min-h-[400px]`
- Heading: `text-h2`
- Body: `text-body text-text-secondary`
- Action: `.btn .btn-primary` calling `reset()`

---

*Tạo bởi AWF — Design Phase | 2026-03-25*
