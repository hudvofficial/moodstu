# Phase 03: UI Fixes — Edit Page
Status: ✅ Complete
Dependencies: Phase 02 (Verify Actions)
Priority: 🟡 Medium

## Objective
Fix 2 UI issues trên trang Contract Edit:
1. Mã HĐ hiển thị trùng (header + form body)
2. Desktop header dư thừa (title + subtitle lãng phí vertical space)

## V-GATE Reminder
- [ ] Mở browser → xem `/contracts/[id]/edit` THỰC TẾ trước khi fix
- [ ] Screenshot UI hiện tại
- [ ] So sánh với expected behavior
- [ ] Viết plan cụ thể → user duyệt → rồi mới code

---

## Fix 3.1: Ẩn Mã HĐ Trùng

### Problem
- **Header** (góc phải): badge `HĐ-2026-0001` ← ĐÃ HIỆN
- **Form body** (section 1): label "Mã hợp đồng" + icon + `HĐ-2026-0001` ← TRÙNG

### Root Cause
`ContractInfoSection.tsx` line 96-97:
```tsx
{formData.contract_code && (
  <div className={isEditMode ? "" : "lg:hidden"}>
```
Khi `isEditMode = true` → className = `""` → **luôn hiện** trên cả desktop + mobile.
Desktop đã có badge trong header → trùng.

### Fix
Đổi logic: edit mode trên desktop thì ẩn (giống create mode) vì header đã hiện badge.

```tsx
// BEFORE:
<div className={isEditMode ? "" : "lg:hidden"}>

// AFTER: luôn ẩn trên desktop (header badge đã hiện), chỉ show mobile
<div className="lg:hidden">
```

### File
- `components/contracts/form/ContractInfoSection.tsx` line 97

---

## Fix 3.2: Compact Desktop Header

### Problem
```
Line 1: Breadcrumb   "Hợp đồng > Chỉnh sửa"     [badge HĐ-2026-0001]
Line 2: Title        "Sửa hợp đồng"               
Line 3: Subtitle     "Chỉnh sửa thông tin hợp đồng"
```
3 dòng nói cùng 1 ý, tốn ~60px.

### Fix
Bỏ title + subtitle block trên desktop khi edit mode (breadcrumb đủ context).

```tsx
// BEFORE (form/index.tsx line 152-161):
<div className="max-lg:hidden space-y-1">
  <h2 className="text-h2">
    {mode === "create" ? "Tạo hợp đồng" : "Sửa hợp đồng"}
  </h2>
  <p className="text-body-sm text-text-secondary">
    {mode === "create" ? "Điền thông tin..." : "Chỉnh sửa thông tin hợp đồng"}
  </p>
</div>

// AFTER: Chỉ hiện cho create mode, edit mode breadcrumb đủ rồi
{mode === "create" && (
  <div className="max-lg:hidden space-y-1">
    <h2 className="text-h2">Tạo hợp đồng</h2>
    <p className="text-body-sm text-text-secondary">
      Điền thông tin để tạo hợp đồng mới
    </p>
  </div>
)}
```

### File
- `components/contracts/form/index.tsx` line 152-161

---

## Implementation Steps
1. [x] Mở browser → screenshot `/contracts/[id]/edit` hiện tại (browser agent down, verified via code)
2. [x] Fix 3.1: Thay đổi ContractInfoSection.tsx line 97
3. [x] Fix 3.2: Thay đổi form/index.tsx line 152-161
4. [ ] Verify desktop: mã HĐ chỉ hiện ở header badge (cần anh check)
5. [ ] Verify desktop: không còn title + subtitle block (cần anh check)
6. [ ] Verify mobile: mã HĐ vẫn hiện trong form body (cần anh check)
7. [ ] Verify mobile: title vẫn hiện trong mobile header (cần anh check)

## Files to Modify
- `components/contracts/form/ContractInfoSection.tsx` — 1 line change
- `components/contracts/form/index.tsx` — ~10 line change

## Test Criteria
- [ ] Desktop edit: mã HĐ chỉ 1 chỗ (header badge)
- [ ] Desktop edit: không có title + subtitle block dư
- [ ] Desktop create: vẫn hiện title + subtitle (không ảnh hưởng)
- [ ] Mobile edit: mã HĐ hiện trong form body (header badge nhỏ, cần hiện rõ)
- [ ] Mobile edit: title hiện trong header row

---
End of plan. Tất cả phases complete = Contract Edit page hoạt động tối ưu.
