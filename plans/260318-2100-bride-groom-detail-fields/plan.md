# Plan: Port V1 Contract Logic → V2 + Couple Detail Fields

Created: 2026-03-18T21:01:00+07:00
Updated: 2026-03-18T21:31:00+07:00
Status: 🟡 Pending
V1 Audit: [Full audit reference](file:///C:/Users/Admin/.gemini/antigravity/brain/d090de3e-95ef-4d96-b857-c0cc8ab7b026/v1_contract_audit.md)

## Overview

### Chiến lược: V1 Logic + V2 Architecture + Stitch UI

Port toàn bộ business logic đã proven từ V1, giữ nguyên kiến trúc clean hooks của V2, UI theo Stitch mockup.

### Scope tổng (từ V1 Audit):

| # | Feature | V1 Source | Mô tả |
|---|---------|-----------|-------|
| A | **Couple Detail Fields** | Stitch new | 8 field mới (phone/height/weight/shoe × 2) |
| B | **Contract Code Badge** | V1 `useContractForm.ts:404-410` | Fetch on mount + hiện badge |
| C | **Phone Dedup Guard** | V1 `contract.service.ts:56-80` | Tạo KH mới + SĐT trùng → reuse KH cũ |
| D | **Code Race Prevention** | V1 `mutations.ts:34-56` | Submit trùng mã → auto-retry 3 lần |
| E | **Grouped Service Dropdown** | V1 `SERVICE_TYPE_GROUPS` | 3 nhóm (Moodstudio/Photo/Media) |
| F | **"Mới" Badge** | V1 `ContractCustomerSection` | Hiện badge xanh sau tạo KH mới |
| G | **Confirm Dialog** | V1 `useContractForm.ts:307-375` | Confirm trước khi xóa item |

### Không port (giữ V2):
- ❌ Tasks trong form (V2 đã tách ra detail page — đúng hướng)
- ❌ String tiếng Việt cho status/service_type (V2 dùng slug — tốt hơn)
- ❌ Monolith hook 629 dòng (V2 đã split thành 4 hooks — cleaner)

---

## Phases

| Phase | Name | Status | Effort |
|-------|------|--------|:------:|
| 01 | Database Migration | ✅ Complete | 5 min |
| 02 | Port V1 Safety: Phone Dedup + Code Race | ✅ Complete | 30 min |
| 03 | Contract Code Badge (V1 UX) | ✅ Complete | 20 min |
| 04 | Types + Queries (Couple Fields) | ✅ Complete | 20 min |
| 05 | Form UI: Couple Fields | ✅ Complete | 45 min |
| 06 | Port V1 UX: Grouped Dropdown + Badges + Confirm | ✅ Complete | 1-2 hr |

---

## Phase 01: Database Migration
Status: ✅ Complete (2026-03-18T21:35)
Dependencies: None

### Objective
Thêm 8 cột mới vào bảng `customers` cho chi tiết cô dâu/chú rể.

### Schema
| Column | Type | Nullable | Default | Lý do type |
|--------|------|----------|---------|------------|
| `bride_phone` | varchar(20) | YES | NULL | SĐT format linh hoạt |
| `bride_height` | smallint | YES | NULL | Max 250cm < 32767 |
| `bride_weight` | smallint | YES | NULL | Max 200kg < 32767 |
| `bride_shoe_size` | smallint | YES | NULL | Max 50 < 32767 |
| `groom_phone` | varchar(20) | YES | NULL | |
| `groom_height` | smallint | YES | NULL | |
| `groom_weight` | smallint | YES | NULL | |
| `groom_shoe_size` | smallint | YES | NULL | |

### SQL
```sql
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS bride_phone varchar(20),
  ADD COLUMN IF NOT EXISTS bride_height smallint,
  ADD COLUMN IF NOT EXISTS bride_weight smallint,
  ADD COLUMN IF NOT EXISTS bride_shoe_size smallint,
  ADD COLUMN IF NOT EXISTS groom_phone varchar(20),
  ADD COLUMN IF NOT EXISTS groom_height smallint,
  ADD COLUMN IF NOT EXISTS groom_weight smallint,
  ADD COLUMN IF NOT EXISTS groom_shoe_size smallint;
```

### Test
- [ ] Migration chạy thành công
- [ ] 8 cột xuất hiện trong `customers` table
- [ ] Dữ liệu cũ không bị ảnh hưởng (nullable)

---

## Phase 02: Port V1 Safety — Phone Dedup + Code Race
Status: ✅ Complete (2026-03-18T21:41)
Dependencies: None (independent of Phase 01)

### Objective
Port 2 critical safety logic từ V1 vào V2 server actions.

### 2A. Phone Dedup Guard

**V1 Logic** (`contract.service.ts:56-80`):
```
Khi tạo khách hàng mới:
  1. Check SĐT đã tồn tại chưa
  2. Nếu trùng → UPDATE khách cũ (tên, địa chỉ, bride, groom)
  3. Return ID khách cũ (không tạo record mới)
  4. Nếu không trùng → INSERT mới + gen KH-XXXX code
```

**V2 hiện tại:** Không có phone dedup → tạo duplicate customer khi retry.

**File cần sửa:** `app/actions/contract-mutations.ts` — function `submitContract`
- Trong hàm xử lý customer (tìm hoặc tạo), thêm check phone trùng trước khi insert

### 2B. Contract Code Race Prevention

**V1 Logic** (`mutations.ts:34-56`):
```
Khi submit (create mode):
  1. Check contract_code đã tồn tại chưa
  2. Nếu trùng → auto-regenerate new code
  3. Retry tối đa 3 lần
  4. Nếu vẫn trùng sau 3 lần → throw error "Vui lòng tải lại trang"
```

**V2 hiện tại:** Không có → nếu 2 người tạo cùng lúc, 1 sẽ fail.

**File cần sửa:** `app/actions/contract-mutations.ts` — function `submitContract`
- Thêm retry loop trước khi insert contract

### Files to Modify
| File | Change |
|------|--------|
| `app/actions/contract-mutations.ts` | Thêm phone dedup + code race prevention |

### Test
- [ ] Tạo KH với SĐT đã tồn tại → reuse KH cũ (không duplicate)
- [ ] Tạo 2 HĐ cùng lúc → cả 2 đều thành công với mã khác nhau
- [ ] Tạo HĐ bình thường (sunny path) → vẫn hoạt động

---

## Phase 03: Contract Code Badge (V1 UX)
Status: ✅ Complete (2026-03-18T21:43)
Dependencies: None

### Objective
Hiển thị mã HĐ preview trên form tạo mới (giống V1 UX).

### Logic Flow
```
[CREATE mode] Form mount
  → useEffect: gọi getNextContractCode()
  → Set state: previewCode = "HĐ-2026-0007"
  → Hiển thị badge trên header section

[EDIT mode]
  → Hiện formData.contract_code (read-only, có sẵn)

[User nhấn Submit]
  → V2 logic giữ nguyên: gen FINAL code lúc submit
  → Nếu preview code bị chiếm → tự tăng (Phase 02 đã handle)
```

### Files to Modify

#### 1. `hooks/useContractForm.ts`
```diff
+ const [previewCode, setPreviewCode] = useState("");

  useEffect(() => {
+   if (mode === "create") {
+     getNextContractCode().then(result => {
+       if (result.success) setPreviewCode(result.data);
+     });
+   }
  }, [mode]);

  // Expose previewCode qua return
```

#### 2. `components/contracts/form/ContractInfoSection.tsx`
Thêm badge góc phải header (V1 placement):
```tsx
{mode === "create" && previewCode && (
  <div className="flex flex-col items-end">
    <span className="text-caption text-text-muted">Mã hợp đồng</span>
    <div className="flex items-center gap-1.5 bg-bg-secondary px-3 py-1 rounded-sm">
      <span className="text-body-sm font-semibold">{previewCode}</span>
      <span className="material-symbols-outlined text-xs text-text-muted">fingerprint</span>
    </div>
  </div>
)}
```

### V1 Reference (`ContractCustomerSection.tsx:25-36`)
```tsx
<div className="flex flex-col items-end">
  <span className="text-tiny font-semibold text-text-secondary opacity-70">
    Mã Hợp đồng
  </span>
  <div className="flex items-center gap-1.5 bg-surface px-3 py-1 rounded text-sm font-semibold text-text-secondary">
    {f.formData.contract_code}
    <span className="material-symbols-outlined text-xs text-text-muted">fingerprint</span>
  </div>
</div>
```

### Notes
- Preview code chỉ là "gợi ý", final code gen lúc submit giữ nguyên V2 logic
- Studio nhỏ → hiếm khi 2 người tạo cùng lúc → preview ≈ final 99% cases
- Edit mode: hiện formData.contract_code read-only (đã có sẵn)

### Test
- [ ] Create mode: mã HĐ hiện ngay khi mở form
- [ ] Create mode: submit → DB lưu đúng mã
- [ ] Edit mode: hiện mã hiện tại (read-only)
- [ ] Badge style đúng design token (không hardcode)

---

## Phase 04: Types + Queries (Couple Fields)
Status: ✅ Complete (2026-03-18T21:46)
Dependencies: Phase 01

### Objective
Cập nhật TypeScript types và queries để truyền 8 field mới.

### Files to Modify

#### 1. `types/contract-form.ts` — SelectedCustomer
```diff
 export interface SelectedCustomer {
   id: string;
   full_name: string;
   phone: string | null;
   bride_name: string | null;
   groom_name: string | null;
+  bride_phone: string | null;
+  bride_height: number | null;
+  bride_weight: number | null;
+  bride_shoe_size: number | null;
+  groom_phone: string | null;
+  groom_height: number | null;
+  groom_weight: number | null;
+  groom_shoe_size: number | null;
   wedding_date: string | null;
   address: string | null;
 }
```

#### 2. `types/contract-form.ts` — ContractFormData
```diff
 export interface ContractFormData {
   ...
   bride_name: string;
   groom_name: string;
+  bride_phone: string;
+  bride_height: string;  // string for input, convert on submit
+  bride_weight: string;
+  bride_shoe_size: string;
+  groom_phone: string;
+  groom_height: string;
+  groom_weight: string;
+  groom_shoe_size: string;
 }
```

#### 3. `app/actions/contract-queries.ts`
Thêm 8 field vào SELECT queries (`searchCustomers` + `getContractForEdit`):
```diff
-.select("id, full_name, phone, bride_name, groom_name, wedding_date, address")
+.select("id, full_name, phone, bride_name, groom_name, bride_phone, bride_height, bride_weight, bride_shoe_size, groom_phone, groom_height, groom_weight, groom_shoe_size, wedding_date, address")
```

#### 4. `hooks/useContractCustomer.ts` — selectCustomer callback
Map 8 field mới khi chọn khách cũ:
```diff
 const handleSelectCustomer = (c: CustomerSearchResult) => {
   setFormData(prev => ({
     ...prev,
     bride_name: c.bride_name || "",
     groom_name: c.groom_name || "",
+    bride_phone: c.bride_phone || "",
+    bride_height: c.bride_height?.toString() || "",
+    bride_weight: c.bride_weight?.toString() || "",
+    bride_shoe_size: c.bride_shoe_size?.toString() || "",
+    groom_phone: c.groom_phone || "",
+    groom_height: c.groom_height?.toString() || "",
+    groom_weight: c.groom_weight?.toString() || "",
+    groom_shoe_size: c.groom_shoe_size?.toString() || "",
   }));
 };
```

#### 5. `hooks/useContractForm.ts` — DEFAULT_FORM_DATA + loadContractForEdit
```diff
 const DEFAULT_FORM_DATA: ContractFormData = {
   ...
+  bride_phone: "",
+  bride_height: "",
+  bride_weight: "",
+  bride_shoe_size: "",
+  groom_phone: "",
+  groom_height: "",
+  groom_weight: "",
+  groom_shoe_size: "",
 };
```

### Test
- [ ] Build thành công (TSC no errors)
- [ ] Chọn khách cũ có data bride/groom → 8 field auto-fill
- [ ] Chọn khách cũ KHÔNG có data → 8 field empty

---

## Phase 05: Form UI — Couple Fields
Status: ✅ Complete (2026-03-18T21:49)
Dependencies: Phase 04

### Objective
Thêm input fields vào CoupleFields component + CustomerFormModal theo Stitch layout.

### Stitch Layout Reference
```
Mobile (< 640px):
┌─────────────────────────────┐
│ ♀ Thông tin Cô dâu         │
│                             │
│ Họ và tên          Số ĐT   │  ← 2 col
│ [____________] [__________] │
│                             │
│ Chiều cao  Cân nặng  Size  │  ← 3 col
│ [______] [______] [______] │
└─────────────────────────────┘

Desktop (≥ 640px) — 2 cards side by side:
┌──────────────────┐ ┌──────────────────┐
│ ♀ Cô dâu        │ │ ♂ Chú rể        │
│ [Tên]  [SĐT]    │ │ [Tên]  [SĐT]    │
│ [Cao] [Nặng] [G] │ │ [Cao] [Nặng] [G]│
└──────────────────┘ └──────────────────┘
```

### Files to Modify

#### 1. `components/contracts/form/ContractCustomerSection.tsx` — CoupleFields
Thêm các input theo layout:

Row 1 (2-col): Họ tên + Số ĐT
```tsx
<div className="grid grid-cols-2 gap-3">
  {/* Existing: bride_name input */}
  {/* NEW: bride_phone input */}
  <InputField label="Số điện thoại" icon="phone"
    value={formData.bride_phone}
    onChange={e => updateField("bride_phone", e.target.value)}
    type="tel" placeholder="09..." />
</div>
```

Row 2 (3-col): Chiều cao + Cân nặng + Size giày
```tsx
<div className="grid grid-cols-3 gap-2">
  <InputField label="Chiều cao" suffix="cm"
    value={formData.bride_height}
    onChange={e => updateField("bride_height", e.target.value)}
    type="number" inputMode="numeric" />
  <InputField label="Cân nặng" suffix="kg" ... />
  <InputField label="Size giày"
    value={formData.bride_shoe_size}
    onChange={e => updateField("bride_shoe_size", e.target.value)}
    type="number" inputMode="numeric" />
</div>
```

Tương tự cho Chú rể (groom_phone, groom_height, groom_weight, groom_shoe_size).

#### 2. `components/contracts/form/modals/CustomerFormModal.tsx`
Nếu `showCoupleFields=true`, thêm 4 field cho mỗi người (phone, height, weight, shoe_size).

**V1 Reference** (`CustomerFormModal.tsx:240-277`):
- Section "Thông tin Cặp đôi (Nếu là Cưới)" hiện khi serviceType = Moodstudio group
- Hiện tại V1 chỉ có tên dâu/rể → V2 sẽ thêm 4 field nữa

#### 3. `app/actions/contract-mutations.ts` — submitContract payload
Khi submit, convert string → number rồi ghi vào customer:
```ts
const customerPayload = {
  ...existingFields,
  bride_phone: formData.bride_phone || null,
  bride_height: formData.bride_height ? parseInt(formData.bride_height) : null,
  bride_weight: formData.bride_weight ? parseInt(formData.bride_weight) : null,
  bride_shoe_size: formData.bride_shoe_size ? parseInt(formData.bride_shoe_size) : null,
  // ...tương tự groom
};
```

### Input Specs
| Field | Type | InputMode | Placeholder | Suffix |
|-------|------|-----------|-------------|--------|
| bride_phone | tel | — | "09..." | — |
| bride_height | text | numeric | "" | cm |
| bride_weight | text | numeric | "" | kg |
| bride_shoe_size | text | numeric | "" | — |

### Test
- [ ] 8 field hiển thị đúng trong CoupleFields (cả dâu + rể)
- [ ] Layout responsive: mobile stacked, desktop side-by-side
- [ ] Nhập data → submit → check DB customers table
- [ ] Edit mode: load contract → 8 field pre-filled đúng
- [ ] CustomerFormModal cũng hiển thị 8 field khi showCoupleFields=true
- [ ] Form inputs chỉ cho nhập số (height/weight/shoe_size)

---

## Phase 06: Port V1 UX — Grouped Dropdown + Badges + Confirm
Status: ✅ Complete (2026-03-18T21:58)
Dependencies: None (independent, can do anytime)

### Objective
Port 3 UX features từ V1 → V2.

### 6A. Grouped Service Type Dropdown

**V1 Logic** (`SERVICE_TYPE_GROUPS` — `constants/contracts.ts:77-105`):
```
🩷 MOODSTUDIO (pink bg):
   Studio, Ngày Cưới, Combo

💙 PHOTO (blue bg):
   Baby, Gia đình, Sinh Nhật, Bầu, Concept, Couple, Kỷ yếu

💜 MEDIA (purple bg):
   Media, Khác
```

**V2 hiện tại:** Flat dropdown list, không phân nhóm.

**File cần sửa:**
- `types/contract-form.ts` — Thêm SERVICE_TYPE_GROUPS constant (slug format)
- `components/contracts/form/ContractInfoSection.tsx` — Render grouped optgroup

**V2 mapped (slug format):**
```ts
export const SERVICE_TYPE_GROUPS_V2 = [
  {
    groupName: "Moodstudio",
    color: "pink",
    types: ["studio", "ngay_cuoi", "combo"] as ServiceType[],
  },
  {
    groupName: "Photo",
    color: "blue",
    types: ["baby", "gia_dinh", "sinh_nhat", "bau", "concept", "couple", "ky_yeu"] as ServiceType[],
  },
  {
    groupName: "Media",
    color: "purple",
    types: ["media", "other"] as ServiceType[],
  },
];
```

### 6B. "Mới" Badge on Customer Input

**V1 Behavior:**
- Sau khi tạo KH mới thành công → hiện badge 🟢 "Mới" bên cạnh tên khách
- Khi clear → ẩn badge

**File cần sửa:**
- `hooks/useContractCustomer.ts` — thêm `isNewCustomer` state
- `components/contracts/form/ContractCustomerSection.tsx` — render badge

### 6C. Confirm Dialog Before Delete

**V1 Logic:**
- Xóa line item → askConfirm("Xóa dịch vụ", danger) → confirm → xóa
- Không xóa ngay khi click

**V2 hiện tại:** Xóa ngay (no confirm)

**File cần sửa:**
- `components/contracts/form/index.tsx` hoặc relevant section
- Có thể dùng existing `AlertDialog` hoặc `UnifiedModal` component

### Test
- [ ] Dropdown hiện 3 nhóm với header + màu khác nhau
- [ ] Chọn "Studio" → showCoupleFields = true
- [ ] Chọn "Baby" → showCoupleFields = false
- [ ] Tạo KH mới → "Mới" badge hiện
- [ ] Clear KH → badge ẩn
- [ ] Xóa line item → confirm dialog hiện → confirm → xóa
- [ ] Xóa line item → confirm dialog → cancel → không xóa

---

## Test Criteria (All Phases Combined)

### Functional
- [ ] Create mode: full flow from empty → submit → contract created
- [ ] Edit mode: load contract → all fields pre-filled → submit → updated
- [ ] Customer search → select → auto-fill all 10 fields (name, phone, address, bride×5, groom×5)
- [ ] Customer create new → modal with couple fields → created + auto-fill
- [ ] Phone dedup: same phone → reuse customer
- [ ] Code race: concurrent creates → both succeed
- [ ] Couple fields conditional: Moodstudio = show, Photo/Media = hide

### Visual
- [ ] Badge contract code visible on create
- [ ] Grouped dropdown with colored headers
- [ ] "Mới" badge green after customer creation
- [ ] Responsive layout on mobile and desktop

---

## Quick Commands
- Start: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
