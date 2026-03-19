# Phase 03: CRM Module (10/10)

**Status:** 🎨 Designing
**Dependencies:** Phase 02 ✅
**Est.:** 2 days
**Brief:** `docs/BRIEF-crm.md`
**Strategy:** Copy ALL V1 features + V2 code quality + fix V1 thiếu sót

---

## 📊 1. DB Schema hiện tại + Migrations cần thêm

### Bảng `customers` (đã có)
| Column | Type | Note |
|--------|------|------|
| id | UUID PK | auto |
| customer_code | VARCHAR NOT NULL | KH-001 |
| full_name | VARCHAR NOT NULL | |
| phone | VARCHAR | search chính |
| alt_phone | VARCHAR | SĐT phụ |
| email | VARCHAR | |
| address | TEXT | |
| gender | VARCHAR | |
| date_of_birth | DATE | |
| wedding_date | DATE | |
| avatar_url | TEXT | |
| source | VARCHAR | facebook/zalo/walk_in/referral |
| notes | TEXT | |
| tags | TEXT[] | ['VIP', 'Regular'] |
| status | VARCHAR default 'active' | |
| deleted_at | TIMESTAMPTZ | soft delete |
| created_by | UUID FK → employees | |
| created_at / updated_at | TIMESTAMPTZ | |

### Bảng `crm_leads` (đã có)
| Column | Type | Note |
|--------|------|------|
| id | UUID PK | auto |
| contact_date | DATE default today | |
| contact_name | VARCHAR | |
| phone | VARCHAR | |
| email | VARCHAR | |
| source | VARCHAR | |
| needs | VARCHAR | nhu cầu ban đầu |
| address | TEXT | |
| potential | VARCHAR | hot/warm/cold |
| status | VARCHAR default 'moi' | ⚠️ CẦN ĐỔI SANG ENUM |
| notes | TEXT | |
| care_history | TEXT | |
| care_type | VARCHAR | |
| social_link | TEXT | link FB/Zalo |
| next_contact_date | DATE | nhắc liên hệ |
| assigned_to | UUID FK → employees | |
| created_by | UUID FK → employees | |
| created_at / updated_at | TIMESTAMPTZ | |

### ⚠️ Migration #9: CRM Enhancements

```sql
-- 1. Tạo lead_status_enum
CREATE TYPE lead_status_enum AS ENUM (
  'moi', 'da_lien_he', 'hen_gap', 'da_bao_gia', 'da_chot', 'huy'
);

-- 2. Tạo lead_potential_enum
CREATE TYPE lead_potential_enum AS ENUM (
  'hot', 'warm', 'cold'
);

-- 3. Đổi crm_leads.status VARCHAR → ENUM
ALTER TABLE crm_leads
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE lead_status_enum USING status::lead_status_enum,
  ALTER COLUMN status SET DEFAULT 'moi';

-- 4. Đổi crm_leads.potential VARCHAR → ENUM
ALTER TABLE crm_leads
  ALTER COLUMN potential TYPE lead_potential_enum USING potential::lead_potential_enum;

-- 5. Thêm customers.lead_id FK (track conversion)
ALTER TABLE customers
  ADD COLUMN lead_id UUID REFERENCES crm_leads(id);

-- 6. Index cho lead_id
CREATE INDEX idx_customers_lead_id ON customers(lead_id);

-- 7. RPC: convert_lead_to_customer (copy V1 atomic logic)
CREATE OR REPLACE FUNCTION convert_lead_to_customer(p_lead_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead crm_leads%ROWTYPE;
  v_customer_id UUID;
  v_existing_customer_id UUID;
BEGIN
  -- Lock lead row
  SELECT * INTO v_lead FROM crm_leads WHERE id = p_lead_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  IF v_lead.phone IS NULL OR v_lead.phone = '' THEN
    RAISE EXCEPTION 'phone is required';
  END IF;

  -- Check existing customer by phone
  SELECT id INTO v_existing_customer_id
  FROM customers
  WHERE phone = v_lead.phone AND deleted_at IS NULL
  LIMIT 1;

  IF v_existing_customer_id IS NOT NULL THEN
    -- Link to existing customer
    v_customer_id := v_existing_customer_id;
    -- Update lead_id if not set
    UPDATE customers SET lead_id = p_lead_id WHERE id = v_customer_id AND lead_id IS NULL;
  ELSE
    -- Create new customer
    INSERT INTO customers (
      customer_code, full_name, phone, email, address, source,
      notes, lead_id, created_by
    ) VALUES (
      'KH-' || LPAD(nextval('customer_code_seq')::TEXT, 3, '0'),
      COALESCE(v_lead.contact_name, 'Khách hàng mới'),
      v_lead.phone,
      v_lead.email,
      v_lead.address,
      v_lead.source,
      v_lead.needs,
      p_lead_id,
      v_lead.created_by
    )
    RETURNING id INTO v_customer_id;
  END IF;

  -- Mark lead as closed
  UPDATE crm_leads
  SET status = 'da_chot', updated_at = NOW()
  WHERE id = p_lead_id;

  RETURN jsonb_build_object(
    'customer_id', v_customer_id,
    'lead', row_to_json(v_lead)
  );
END;
$$;

-- 8. Sequence cho customer_code (KH-001, KH-002...)
CREATE SEQUENCE IF NOT EXISTS customer_code_seq START 1;

-- 9. RPC: append_care_log (copy V1 atomic append)
CREATE OR REPLACE FUNCTION append_care_log(
  p_lead_id UUID,
  p_content TEXT,
  p_type TEXT DEFAULT 'Ghi chú'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry JSONB;
  v_current TEXT;
BEGIN
  v_entry := jsonb_build_object(
    'type', p_type,
    'content', p_content,
    'timestamp', NOW()
  );

  -- Atomic append
  UPDATE crm_leads
  SET
    care_history = COALESCE(care_history, '') || E'\n' || v_entry::TEXT,
    care_type = p_type,
    updated_at = NOW()
  WHERE id = p_lead_id;

  RETURN jsonb_build_object('log', v_entry);
END;
$$;
```

---

## 🗂️ 2. Route & File Structure

```
app/(protected)/crm/
  ├── layout.tsx              ← CRM layout (tabs header + FAB)
  ├── page.tsx                ← Redirect to /crm/customers
  ├── customers/
  │   ├── page.tsx            ← Customer list (server component)
  │   └── data.ts             ← getCustomers, getCustomerStats
  └── leads/
      ├── page.tsx            ← Lead list (server component)
      └── data.ts             ← getLeads, getLeadStats

app/actions/
  └── crm.ts                 ← ALL server actions (CRUD + convert + pipeline)

components/crm/
  ├── CrmTabs.tsx             ← Tab switcher (Khách hàng | Tiềm năng)
  ├── CrmStats.tsx            ← Stats strip (shared for both tabs)
  ├── CrmFab.tsx              ← Mobile FAB button
  ├── customers/
  │   ├── CustomerList.tsx    ← Table/card list
  │   ├── CustomerDetail.tsx  ← Slide panel detail + lifetime value
  │   ├── CustomerForm.tsx    ← Create/Edit modal
  │   └── CustomerStats.tsx   ← Customer-specific stats
  ├── leads/
  │   ├── LeadList.tsx        ← Table/card list
  │   ├── LeadForm.tsx        ← Create/Edit modal
  │   ├── LeadDetail.tsx      ← Detail + care timeline
  │   ├── LeadKanban.tsx      ← Kanban board (drag-drop)
  │   ├── LeadViewToggle.tsx  ← List ↔ Kanban switch
  │   ├── ConvertButton.tsx   ← Convert lead → customer
  │   ├── CareTimeline.tsx    ← Care log timeline view
  │   └── LeadStats.tsx       ← Lead-specific stats + funnel
  └── shared/
      ├── SourceBadge.tsx     ← Source badge (FB/Zalo/Walk-in)
      ├── StatusBadge.tsx     ← Pipeline status badge (5 colors)
      ├── OverdueBadge.tsx    ← Overdue reminder badge
      └── PhoneLink.tsx       ← Tap-to-call + Zalo link
```

**Tổng: ~20 files** (V1 = 30 files)
**Max: 250 lines/file** (V1 = 500+)

---

## 🔌 3. Server Actions API

### File: `app/actions/crm.ts`

```typescript
// ═══ CUSTOMER ACTIONS ═══
getCustomers(params: { search?, page?, source?, tags? })
  → { customers[], total, page, pageSize }

getCustomerById(id: string)
  → { customer, contracts[], lifetimeValue }

createCustomer(data: CustomerFormData)
  → { success, customer_id, error? }
  // Auto-gen customer_code via sequence

updateCustomer(id: string, data: Partial<CustomerFormData>)
  → { success, error? }

deleteCustomer(id: string)
  → { success, error? }
  // Soft delete: set deleted_at

getCustomerStats()
  → { total, newThisMonth, avgLifetimeValue }

// ═══ LEAD ACTIONS ═══
getLeads(params: { search?, status?, source?, assigned?, page? })
  → { leads[], total, page, pageSize }

createLead(data: LeadFormData)
  → { success, error? }
  // Duplicate phone check before insert

updateLead(id: string, data: Partial<LeadFormData>)
  → { success, error? }

deleteLead(id: string)
  → { success, error? }

getLeadStats()
  → { total, active, closed, conversionRate, byStatus, bySource }

// ═══ PIPELINE ACTIONS (copy V1) ═══
moveLeadToStage(leadId: string, newStatus: lead_status_enum)
  → { success }

assignLead(leadId: string, employeeId: string | null)
  → { success }

markLeadAsLost(leadId: string, reason: string)
  → { success }

// ═══ CONVERT (copy V1 RPC) ═══
convertLeadToCustomer(leadId: string)
  → { success, url: '/contracts/create?customer_id=...&phone=...' }

// ═══ CARE LOG (copy V1 RPC) ═══
addCareLog(leadId: string, content: string, type?: string)
  → { success, log }
```

---

## 📱 4. UI Components Design

### 4.1 CRM Layout

```
┌──────────────────────────────────────────────┐
│  CRM                    [+ Thêm mới]        │
│  ┌────────────┬────────────┐                 │
│  │ Khách hàng │ Tiềm năng  │ ← CrmTabs      │
│  └────────────┴────────────┘                 │
│                                              │
│  {children} ← page content                  │
│                                              │
│                     [+ FAB] ← mobile only    │
└──────────────────────────────────────────────┘
```

### 4.2 Tab Khách hàng

```
Desktop:
┌──────────────────────────────────────────────────────────────┐
│ Stats: [42 tổng KH] │ [5 mới tháng này] │ [25M avg value]  │
├──────────────────────────────────────────────────────────────┤
│ 🔍 Tìm kiếm...        [Source ▼] [Tags ▼]                  │
├────┬─────────────┬──────────┬──────────┬────────┬───────────┤
│ #  │ Tên         │ SĐT      │ Nguồn    │ Tags   │ LTV       │
├────┼─────────────┼──────────┼──────────┼────────┼───────────┤
│ 1  │ Nguyễn A    │ 0909...  │ 🔵 FB    │ VIP    │ 25.000.000│
│ 2  │ Trần B      │ 0912...  │ 🟢 Zalo  │        │ 15.000.000│
│    │             │          │          │        │           │
│ Click row → Slide panel detail                               │
└──────────────────────────────────────────────────────────────┘

Mobile:
┌─────────────────────────────┐
│ Stats: [42] [5 mới] [25M]  │ ← horizontal scroll
├─────────────────────────────┤
│ 🔍 Tìm kiếm...             │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ Nguyễn A      🔵 FB     │ │
│ │ 0909...    VIP  25M     │ │ ← Card view
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Trần B        🟢 Zalo   │ │
│ │ 0912...           15M   │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### 4.3 Tab Tiềm năng — List View

```
Desktop:
┌──────────────────────────────────────────────────────────────┐
│ Stats: [28 leads] │ [12 active] │ [5 chốt] │ [18% convert] │
├──────────────────────────────────────────────────────────────┤
│ 🔍 Tìm kiếm...   [Status ▼] [Source ▼]   [List|Kanban] ← toggle
├────┬──────────┬──────────┬──────────┬─────────┬─────────────┤
│ #  │ Tên      │ SĐT      │ Status   │ Assign  │ Next        │
├────┼──────────┼──────────┼──────────┼─────────┼─────────────┤
│ 1  │ Lê C     │ 0938...  │ 🟠 Hẹn   │ Sale A  │ 🔴 Quá hạn! │
│ 2  │ Phạm D   │ 0977...  │ 🔵 Mới   │ —       │ 2 ngày nữa  │
│ 3  │ Hoàng E  │ 0965...  │ 🟢 Chốt  │ Sale B  │ [→ Ký HĐ]  │
└──────────────────────────────────────────────────────────────┘
```

### 4.4 Tab Tiềm năng — Kanban View

```
┌──────────┬──────────┬──────────┬──────────┬──────────┐
│ 🔵 Mới   │ 🟡 Liên  │ 🟠 Hẹn   │ 🟣 Báo   │ 🟢 Chốt  │
│    (8)   │  hệ (5)  │ gặp (3)  │ giá (2)  │   (5)    │
├──────────┼──────────┼──────────┼──────────┼──────────┤
│┌────────┐│┌────────┐│┌────────┐│┌────────┐│┌────────┐│
││ Phạm D ││ │ Trần F ││ │ Lê C   │││ Ngô G  │││ Hoàng E││
││ 0977.. ││ │ 0912.. ││ │ 0938.. │││ 0923.. │││ 0965.. ││
││ FB     ││ │ Zalo   ││ │ Walk-in│││ FB     │││ Zalo   ││
││ 2 ngày ││ │ Hôm nay││ │ 🔴 5d! │││ 1 ngày │││ [Ký HĐ]││
│└────────┘│└────────┘│└────────┘│└────────┘│└────────┘│
│┌────────┐│          │          │          │          │
││ ...    ││          │          │          │          │
│└────────┘│          │          │          │          │
│ Drag ↔   │ Drag ↔   │ Drag ↔   │ Drag ↔   │          │
└──────────┴──────────┴──────────┴──────────┴──────────┘
```

### 4.5 Customer Detail — Slide Panel

```
┌──────────────────────────────────┐
│ ← Đóng          [Sửa] [Xoá]    │
├──────────────────────────────────┤
│ 👤 Nguyễn Văn A                 │
│ 📱 0909.xxx.xxx  [Zalo] [Gọi]  │
│ 📧 a@email.com                  │
│ 🏠 123 Nguyễn Huệ, Q1          │
│ 🔵 Facebook  │ 🏷️ VIP           │
│ 🎂 15/06/1998 │ 💒 20/12/2026   │
├──────────────────────────────────┤
│ 💰 TỔNG GIÁ TRỊ: 25.000.000đ   │
├──────────────────────────────────┤
│ 📋 HỢP ĐỒNG (2)                │
│ ┌──────────────────────────────┐ │
│ │ HD-001 │ Chụp cưới │ 15M    │ │
│ │ HD-005 │ Album thêm │ 10M   │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

---

## 📦 5. Status Badge Color Map

```typescript
const LEAD_STATUS_MAP = {
  moi:         { label: 'Mới',        color: '#3B82F6', bg: '#EFF6FF' },  // Blue
  da_lien_he:  { label: 'Đã liên hệ', color: '#F59E0B', bg: '#FFFBEB' },  // Yellow
  hen_gap:     { label: 'Hẹn gặp',    color: '#F97316', bg: '#FFF7ED' },  // Orange
  da_bao_gia:  { label: 'Đã báo giá', color: '#8B5CF6', bg: '#F5F3FF' },  // Purple
  da_chot:     { label: 'Đã chốt',    color: '#22C55E', bg: '#F0FDF4' },  // Green
  huy:         { label: 'Huỷ',        color: '#EF4444', bg: '#FEF2F2' },  // Red
} as const;

const SOURCE_MAP = {
  facebook:  { label: 'Facebook', icon: 'Facebook', color: '#1877F2' },
  zalo:      { label: 'Zalo',     icon: 'MessageCircle', color: '#0068FF' },
  walk_in:   { label: 'Walk-in',  icon: 'MapPin', color: '#8B5E3C' },
  referral:  { label: 'Giới thiệu', icon: 'Users', color: '#C9A96E' },
} as const;
```

---

## ✅ 6. Test Criteria

### Customer Tab
- [ ] Tạo KH → customer_code auto-gen (KH-001)
- [ ] Sửa KH → data update, toast success
- [ ] Xoá KH → soft delete (deleted_at set, ẩn khỏi list)
- [ ] Search → tìm theo tên hoặc SĐT
- [ ] Filter → source, tags
- [ ] Detail panel → hiện đúng thông tin + lifetime value
- [ ] Lịch sử HĐ → hiện contracts linked

### Lead Tab
- [ ] Tạo lead → duplicate phone check
- [ ] Pipeline stages → 5 bước đúng thứ tự
- [ ] Kanban → drag-drop thay đổi status
- [ ] List ↔ Kanban toggle → giữ filter state
- [ ] Assign sale → dropdown chọn NV
- [ ] Mark lost → modal nhập lý do
- [ ] Overdue badge → đỏ nếu quá next_contact_date
- [ ] Care log → thêm entry → timeline hiện

### Convert Flow
- [ ] Click "Ký HĐ" → confirm → create customer → redirect /contracts/create
- [ ] URL params: customer_id, phone, contact_name, needs
- [ ] Lead status = da_chot sau convert
- [ ] Duplicate phone → link existing customer (không tạo mới)
- [ ] customers.lead_id → ghi lại để track conversion

### Analytics
- [ ] Stats strip → số liệu đúng
- [ ] Conversion rate % = leads chốt / tổng
- [ ] Source breakdown → đúng tỷ lệ

### Mobile
- [ ] Card view thay table trên mobile
- [ ] FAB button → tạo nhanh
- [ ] Slide panel detail responsive
- [ ] Kanban horizontal scroll trên mobile

---

## 🗓️ 7. Implementation Plan

### Day 1: Foundation + Tab Khách hàng
1. [x] Apply migration #9 (enum + lead_id + RPCs) ✅
2. [x] Create `app/actions/crm.ts` — customer CRUD + server actions ✅
3. [x] Create CRM layout + tabs + routing ✅
4. [x] Build CustomerList + CustomerForm + CustomerDetail ✅
5. [x] Build CustomerStats + SourceBadge + PhoneLink ✅
6. [ ] Test customer CRUD end-to-end

### Day 2: Tab Tiềm năng + Kanban + Analytics
7. [x] Add lead server actions to `actions/crm.ts` ✅ (already done Day 1)
8. [x] Build LeadList + LeadForm + LeadDetail ✅
9. [x] Build pipeline actions (move, assign, mark lost) ✅ (already done Day 1)
10. [x] Build CareTimeline + ConvertButton ✅
11. [x] Build LeadKanban (drag-drop) ✅
12. [x] Build LeadViewToggle (List ↔ Kanban) ✅
13. [x] Build LeadStats (funnel + source chart) ✅
14. [x] Build OverdueBadge + CrmFab ✅ (already done Day 1)
15. [x] Polish: portal modal fix, form serialization fix ✅
16. [x] Full test + build check ✅
17. [x] Fix RLS — all functions use withAuth (admin client) ✅
18. [x] Sample data imported (10 customers + 10 leads) ✅
19. [ ] **UI Polish → Phase 03b** (Stitch design compliance)

---
**Next Phase:** → Phase 03b (CRM Stitch UI Polish) → Phase 04 (Contracts Core)
