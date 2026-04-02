# Audit Report — Settings Module
**Date:** 2026-04-02  
**Scope:** Full Audit (Code + Logic + UI + Security)  
**Files scanned:** 16 files (10 components, 4 actions, 1 schema, 1 types)

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 1 |
| 🟡 Warning | 5 |
| 🟢 Info | 3 |

---

## 🔴 Critical Issues (Phải sửa ngay)

### C1. `studio-info-form.tsx` vượt 250 dòng (336 lines)
- **File:** `components/settings/studio-info-form.tsx` (336 lines)
- **Rule vi phạm:** Lesson #7 — max 250 lines/file
- **Impact:** Khó maintain, khó review, che giấu bugs
- **Cách sửa:** Tách thành sub-components:
  - `studio-identity-section.tsx` (Logo + Name + Hotline)
  - `studio-bank-section.tsx` (Bank Info JSONB)
  - `studio-social-section.tsx` (Social Links)
  - `studio-hours-section.tsx` (Working Hours)
  - `studio-info-form.tsx` chỉ orchestrate state + save

---

## 🟡 Warnings (Nên sửa)

### W1. Vietnamese hardcoded status trong `user-management.ts`
- **File:** `app/actions/user-management.ts` L71, L245
- **Code:** `.eq("status", "Đang làm")`
- **Rule vi phạm:** Lesson #65 — V2 DB dùng snake_case ENUM, không dùng tiếng Việt
- **Impact:** Nếu DB đã migrate sang `active` (snake_case), query này trả rỗng
- **Cách sửa:** Xác nhận giá trị status thực tế trong DB, đổi sang `active` nếu đã migrate

### W2. Edit Profile Modal không gửi `department` và `position` khi save
- **File:** `components/settings/edit-profile-modal.tsx` L96-100
- **Code:**
  ```ts
  const result = await updateProfile({
    full_name: name.trim(),
    phone,
    gender,
  });
  ```
- **Impact:** Admin có thể thấy/sửa Department + Position trên UI, nhưng khi bấm "Lưu", giá trị KHÔNG được gửi lên server. Changes bị mất.
- **Cách sửa:** Task 4.1 — Tạo action `updateDepartmentPosition()` với guard `withAdmin`, hoặc thêm fields vào `updateProfile()` với admin check.

### W3. `profileSchema` thiếu `department` + `position` fields
- **File:** `lib/validations/settings.schema.ts` L49-53
- **Impact:** Dù muốn gửi department/position, Zod sẽ strip chúng vì không có trong schema
- **Cách sửa:** Thêm vào schema hoặc tạo schema riêng cho admin profile update

### W4. `initializeProfile()` dùng Vietnamese status `"Đang làm"` → nên check
- **File:** `app/actions/profile-actions.ts` L31
- **Code:** `status: "active"` ← ✅ Đã đúng `active`
- **Nhưng** `role: "User"` — cần xác nhận DB chấp nhận "User" hay "user"
- **Impact thấp:** Consistency risk nếu role enum không thống nhất

### W5. `user-management.ts` vượt 250 dòng (252 lines)
- **File:** `app/actions/user-management.ts` (252 lines)
- **Rule vi phạm:** Sát ngưỡng max 250 lines
- **Impact thấp:** Vẫn maintain được nhưng nên tách nếu thêm logic

---

## 🟢 Info (Đề xuất cải thiện)

### I1. Logo upload TODO chưa implement
- **File:** `studio-info-form.tsx` L81-83
- **Code:** `// TODO: Upload logo to Supabase Storage`
- **Impact:** Logo upload UI hoạt động nhưng file không persist

### I2. `member-card.tsx` dùng ROLES enum cứng, khác `roleSchema`
- **File:** `components/settings/member-card.tsx` L26-30
- **Code:** `ROLES = [{ value: "Admin" }, { value: "Manager" }, { value: "User" }]`
- **Vs:** `roleSchema = z.enum(["Admin", "Manager", "User"])` (user-management.ts L42)
- **Impact thấp:** Cả 2 nơi dùng cùng giá trị nhưng không shared SSOT constant

### I3. `edit-profile-modal.tsx` DEPARTMENTS hardcoded
- **File:** `components/settings/edit-profile-modal.tsx` L20-28
- **Code:** `DEPARTMENTS = ["Ban lãnh đạo", "PHOTO", ...]`
- **Lý tưởng:** Nên fetch từ DB hoặc centralize trong `constants/settings.ts`

---

## ✅ Passed Checks (Đạt)

| Check | Result |
|-------|--------|
| Auth: All actions use `withAuth` or `withAdmin` | ✅ |
| Auth: No `getUser()` inside action body | ✅ (dùng userId param) |
| Auth: Lookup via `auth_user_id`, not email | ✅ |
| Validation: Zod schemas on all mutations | ✅ |
| Audit: `fireAuditLog` on all write ops | ✅ |
| Icons: lucide-react only | ✅ |
| Components: SSOT tokens (`card-base`, `section-heading`, etc.) | ✅ |
| Components: `Input`, `CustomSelect`, `UnifiedModal`, `Button` | ✅ |
| Optimistic Locking: `updateStudioInfo` | ✅ |
| File size: 8/10 components ≤ 250 lines | ⚠️ (1 over, 1 borderline) |
| Types: Centralized in `types/settings.ts` | ✅ |
| isAdmin: Case-insensitive check | ✅ (just fixed) |

---

## Architecture Diagram

```
Settings Module
├── Pages
│   ├── /settings (page.tsx → SettingsView)
│   └── /settings/studio (page.tsx → StudioInfoForm)
│
├── Components (10 files)
│   ├── settings-view.tsx (168L) ✅ Orchestrator
│   ├── profile-card.tsx (81L) ✅
│   ├── edit-profile-modal.tsx (269L) ⚠️ Nearing limit
│   ├── notification-prefs.tsx (65L) ✅
│   ├── members-section.tsx (95L) ✅
│   ├── member-card.tsx (188L) ✅
│   ├── link-employee-modal.tsx (208L) ✅
│   ├── changelog-section.tsx (72L) ✅
│   ├── studio-info-form.tsx (336L) 🔴 OVER LIMIT
│   └── google-calendar-card.tsx (94L) ✅
│
├── Actions (4 files)
│   ├── settings-queries.ts (85L) ✅
│   ├── settings-mutations.ts (116L) ✅
│   ├── profile-actions.ts (135L) ✅
│   └── notification-actions.ts (140L) ✅
│   └── user-management.ts (252L) ⚠️ Borderline
│
├── Schema
│   └── settings.schema.ts (68L) ✅
│
└── Types
    └── settings.ts (95L) ✅
```

---

## Next Steps Priority

| # | Task | Severity | Effort |
|---|------|----------|--------|
| 1 | **W2/W3: Department/Position save logic** | 🟡 High | Medium |
| 2 | **C1: Split studio-info-form.tsx** | 🔴 Critical | Medium |
| 3 | **W1: Fix Vietnamese status strings** | 🟡 Medium | Low |
| 4 | **I3: Centralize DEPARTMENTS constant** | 🟢 Low | Low |
| 5 | **I1: Implement logo upload** | 🟢 Low | Medium |
