# Phase 01: Critical Fixes
Status: ⬜ Pending
Dependencies: None

## Objective
Fix 3 lỗi critical ảnh hưởng trực tiếp đến UX mobile.

---

## F1: Mobile Sub-navigation giữa Leads ↔ Customers

**Vấn đề:** Sub-tabs `[DS Sale | Hồ sơ KH]` dùng `hidden lg:flex` → mobile users KHÔNG THỂ chuyển giữa 2 sub-page.

**Gold Standard:** Printing không cần vì chỉ có 1 page. CRM có 2 sub-pages → cần sub-nav mobile.

### Files to Modify
- `components/crm/lead-list-page.tsx`
- `components/crm/customer-list-page.tsx`

### Implementation Steps
1. [ ] Thêm block `lg:hidden` ngay trước stats bar row (ĐẦU return)
2. [ ] Block chứa 2 `<Link>` pills: "DS Sale" + "Hồ sơ KH"
3. [ ] Active page: `bg-primary/10 text-primary` | Inactive: `text-text-secondary hover:bg-bg-hover`
4. [ ] Dùng `usePathname()` (đã import sẵn) hoặc hardcode active state theo file

### Code Pattern (cả 2 files, chỉ đổi active state)
```tsx
{/* ── Mobile Sub-nav ── */}
<div className="lg:hidden flex items-center gap-2 px-1">
  <Link href="/crm/leads"
    className={`flex-1 text-center py-2 text-sm font-medium rounded-lg transition-colors
      ${isLeadsPage ? "bg-primary/10 text-primary" : "text-text-secondary hover:bg-bg-hover"}`}
  >
    DS Sale
  </Link>
  <Link href="/crm/customers"
    className={`flex-1 text-center py-2 text-sm font-medium rounded-lg transition-colors
      ${!isLeadsPage ? "bg-primary/10 text-primary" : "text-text-secondary hover:bg-bg-hover"}`}
  >
    Hồ sơ KH
  </Link>
</div>
```

**Trong `lead-list-page.tsx`:** `isLeadsPage = true` (hardcode)
**Trong `customer-list-page.tsx`:** `isLeadsPage = false` (hardcode)

### Test Criteria
- [ ] Mobile 375px: thấy 2 pills "DS Sale" / "Hồ sơ KH"
- [ ] Click "Hồ sơ KH" → navigate sang `/crm/customers`
- [ ] Desktop: pills ẩn (chỉ hiện desktop sub-tabs cũ)

---

## F2: pageSize mismatch (server=10, client=20)

**Vấn đề:**
- Server `customers/page.tsx` line 25: `pageSize: 10`
- Client `customer-list-page.tsx` line 47: `const pageSize = 20` (HARDCODED)
- Hậu quả: text "Hiển thị 1–20 của 15" → SAI

**Gold Standard (Leads):** Server pass `pageSize` qua props → client dùng prop.

### Files to Modify
- `app/(protected)/crm/customers/page.tsx` — thêm `pageSize` vào props truyền xuống
- `components/crm/customer-list-page.tsx` — nhận pageSize từ props thay vì hardcode

### Implementation Steps
1. [ ] `customers/page.tsx`: Thêm `pageSize` vào object `initialData` truyền xuống
2. [ ] `customer-list-page.tsx`: Đổi `const pageSize = 20` → dùng `initialData.pageSize` hoặc fallback `10`
3. [ ] Verify text pagination đúng: "Hiển thị 1–10 của 15"

### Code Changes

**customers/page.tsx** — Sửa initialData để include pageSize:
```tsx
const initialData = (initialDataReq.success 
  ? initialDataReq.data 
  : { customers: [], total: 0, totalPages: 1, page: 1, pageSize: 10 }
) as unknown as { customers: Customer[]; total: number; totalPages: number; page: number; pageSize: number };
```

**customer-list-page.tsx** — Nhận pageSize từ props:
```tsx
// TRƯỚC (SAI):
const pageSize = 20;

// SAU (ĐÚNG — match Leads pattern):
const pageSize = initialData.pageSize || 10;
```

### Test Criteria
- [ ] Text hiển thị "Hiển thị 1–10 của 15" (không còn 1–20)
- [ ] Pagination totalPages tính đúng

---

## F3: Customer SelectPills thiếu placeholder + defaultValue

**Vấn đề:** 4 instances SelectPill (2 mobile + 2 desktop) hiện "Chọn" generic thay vì labels mô tả.

**Gold Standard:**
- Printing: `placeholder="Lab"`, `placeholder="Thanh toán"` + `defaultValue="all"`
- Leads: `placeholder="Nguồn"`, `placeholder="Nhân viên"` + `defaultValue="all"`

### File to Modify
- `components/crm/customer-filters.tsx`

### Implementation Steps
1. [ ] Mobile source SelectPill: thêm `placeholder="Nguồn"` + `defaultValue="all"`
2. [ ] Mobile tags SelectPill: thêm `placeholder="Tags"` + `defaultValue="all"`
3. [ ] Desktop source SelectPill: thêm `placeholder="Nguồn"` + `defaultValue="all"`
4. [ ] Desktop tags SelectPill: thêm `placeholder="Tags"` + `defaultValue="all"`

### Test Criteria
- [ ] Mobile: pills hiện "Nguồn ▾" và "Tags ▾" (không còn "Chọn")
- [ ] Desktop: pills hiện "Nguồn ▾" và "Tags ▾"
- [ ] Filter vẫn hoạt động đúng khi chọn option

---

## Verification (sau khi xong Phase 01)
```bash
npx tsc --noEmit  # Zero errors
```
- [ ] Browser 375px → `/crm/leads` → mobile sub-nav hiện đúng
- [ ] Click "Hồ sơ KH" → navigate → sub-nav switch active state
- [ ] Customer filters hiện "Nguồn" / "Tags"
- [ ] Pagination text đúng

---
Next Phase: phase-02-warning-fixes.md
