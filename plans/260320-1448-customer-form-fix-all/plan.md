# Plan: CustomerFormModal — Fix All Remaining Bugs
Created: 2026-03-20 14:48
Status: 🟡 Chờ duyệt

## Overview
Fix tất cả bugs còn lại trong CustomerFormModal.
Audit cho thấy Phase A (UI) đã xong. Phase B (data layer) cũng **đã được fix sẵn** trong code.
Chỉ còn **2 bugs thật sự cần sửa + 1 improvement**:

## 🔍 Audit Results (20/03/2026)

### ✅ ĐÃ FIX (không cần làm gì thêm):
| Bug | Mô tả | Evidence |
|-----|-------|----------|
| B1 | Label "Tên khách hàng *" | ✅ Line 135 CustomerFormModal.tsx |
| B2+B3 | DatePicker + Source đã xóa | ✅ Comment line 187 |
| B4 | formKey reset | ✅ Line 45 |
| B5+B6 | bride/groom vào INSERT | ✅ crm.ts line 173-175 (new) + 142-143 (dedup update) |
| B8 | DatePicker xóa khỏi modal | ✅ Đã xóa |

### ❌ BUGS CÒN LẠI (cần fix):

| # | Bug | File | Mức độ | Mô tả |
|---|-----|------|--------|-------|
| B7 | onCreated không pass bride/groom | CustomerFormModal.tsx | 🟡 Medium | Line 99-100: `bride_name: form.bride_name` ĐÃ có → **CẦN VERIFY** |
| B9 | Couple fields luôn hiện khi service chưa chọn | CustomerFormModal.tsx + index.tsx | 🟡 Medium | `showCoupleFields` = `form.shouldShowCoupleFields` → cần check logic |
| B10 | Phone dedup không debounce | CustomerFormModal.tsx | 🟢 Low | Gọi API mỗi keystroke → spam |

---

## Scope: 2 Phases (15 phút)

### Phase A: Verify & Fix B7 + B9
**Files:** `CustomerFormModal.tsx`, kiểm tra `useContractForm` hook

**B7 verify:**
- Line 99: `bride_name: form.bride_name?.trim() || null` → ĐÃ CÓ ✅
- Line 100: `groom_name: form.groom_name?.trim() || null` → ĐÃ CÓ ✅
- **Kết luận: B7 đã fix rồi!** Chỉ cần verify runtime.

**B9 fix — showCoupleFields khi chưa chọn service:**
- Kiểm tra `shouldShowCoupleFields` logic trong hook
- Nếu default = true → couple fields hiện ngay khi mở form
- Cần đảm bảo: khi chưa chọn service_type → couple fields **ẩn**

### Phase B: Add Debounce cho Phone Check (B10)
**File:** `CustomerFormModal.tsx`

**Fix:**
```tsx
// TRƯỚC (mỗi keystroke = 1 API call):
onChange={(e) => {
  updateField("phone", e.target.value);
  checkPhoneDuplicate(e.target.value);
}}

// SAU (debounce 500ms):
// Dùng useRef + setTimeout pattern
```

### Phase C: Verify trên browser
- Mở /contracts/create
- Chưa chọn service → couple fields ẩn
- Chọn Studio → couple fields hiện
- Chọn Media → couple fields ẩn
- Gõ phone → debounce hoạt động
- Submit → data lưu đúng

---

## Files to Modify

| File | Phase | Changes |
|------|-------|---------|
| `components/contracts/form/modals/CustomerFormModal.tsx` | B | B10 debounce |
| `hooks/useContractForm.ts` (nếu cần) | A | B9 verify showCoupleFields |
