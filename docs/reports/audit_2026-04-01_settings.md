# Audit Report — Settings Module
**Date:** 2026-04-01  
**Scope:** Full Audit — `/settings` (10 components, 6 server actions, types, schemas)

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 5 |
| 🟡 Warning | 9 |
| 🟢 Info | 6 |
| **Total** | **20** |

---

## 🔴 Critical (5)

### C1: `withAdmin` role check case-sensitive → Admin bị chặn
- **File:** [auth_utils.ts:58-68](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/lib/auth_utils.ts#L58-L68)
- **Vấn đề:** `adminRoles = ["admin", "manager"]` (lowercase), DB/JWT dùng `"Admin"`, `"Manager"` (Title case). → `includes()` luôn false.
- **Hậu quả:** Mọi admin action fail. `/settings/studio` không load.
- **Fix:** `.includes(jwtRole?.toLowerCase())` và `.includes(employee.role?.toLowerCase())`.

### C2: Trang Settings hiện "Không tìm thấy dữ liệu"
- **File:** [settings-queries.ts:46-48](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/app/actions/settings-queries.ts#L46-L48)
- **Vấn đề:** Server-side `getUser()` trả `null` mặc dù sidebar client vẫn hiện user. Console: `[withAuth] Error: Chưa đăng nhập`.
- **Hậu quả:** Toàn bộ module Settings trắng, không dùng được.
- **Fix:** Debug cookie propagation flow: `createClient() → cookies() → getUser()`. Kiểm tra middleware session refresh.

### C3: `withAdmin` fallback dùng regular client → bị RLS block
- **File:** [auth_utils.ts:62-66](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/lib/auth_utils.ts#L62-L66)
- **Vấn đề:** Fallback query employees dùng regular client (subject to RLS), không phải admin client.
- **Hậu quả:** Nếu RLS không cho user đọc chính mình → admin bị lock out vĩnh viễn.
- **Fix:** Dùng admin client cho fallback query hoặc đảm bảo RLS policy cho phép.

### C4: Dead file `user-management-actions.ts` — bom nổ chậm
- **File:** [user-management-actions.ts](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/app/actions/user-management-actions.ts) (106 lines)
- **Vấn đề:** Bản duplicate cũ của `user-management.ts`. Hiện KHÔNG import ở đâu, nhưng chứa code nguy hiểm:

| | `user-management.ts` (đang dùng) | `user-management-actions.ts` (dead) |
|--|---|---|
| Auth | `withAdmin` ✅ | `withAuth` ❌ (mọi user gọi được) |
| Zod | Có ✅ | Không ❌ |
| Status filter | `"Đang làm"` ✅ | `"active"` ❌ (sai value) |

- **Fix:** Xóa file `user-management-actions.ts`.

### C5: Notification prefs query dùng sai loại ID
- **File:** [settings-queries.ts:59-61](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/app/actions/settings-queries.ts#L59-L61)
- **Vấn đề:** `.eq("employee_id", user.id)` — `user.id` là auth UUID (từ `auth.users`), `employee_id` là UUID từ bảng `employees`. Hai ID hoàn toàn khác nhau.
- **Hậu quả:** Query notification preferences **luôn trả empty** → mọi thay đổi preference không lưu đúng record.
- **Fix:** Fetch employee trước bằng `auth_user_id`, rồi dùng `employee.id` cho notification query.

---

## 🟡 Warning (9)

### W1: `studio-info-form.tsx` vượt 250 lines (336 dòng)
- **File:** [studio-info-form.tsx](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/settings/studio-info-form.tsx)
- **Fix:** Tách: `StudioIdentitySection`, `BankInfoSection`, `SocialLinksSection`, `WorkingHoursSection`.

### W2: `edit-profile-modal.tsx` vượt 250 lines (311 dòng)
- **File:** [edit-profile-modal.tsx](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/settings/edit-profile-modal.tsx)
- **Fix:** Tách avatar upload + form sections.

### W3: Logo upload TODO bị bỏ quên
- **File:** [studio-info-form.tsx:81](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/settings/studio-info-form.tsx#L79-L83)
- **Code:** `// TODO: Upload logo to Supabase Storage`
- **Hậu quả:** User chọn logo → preview hiện → save → logo mất. Gây confusion.
- **Fix:** Implement upload hoặc disable nút + tooltip "Coming soon".

### W4: Double `getUser()` — thừa roundtrip auth
- **Files:** [notification-actions.ts:34-38](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/app/actions/notification-actions.ts#L34-L38), [profile-actions.ts:16,50,92](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/app/actions/profile-actions.ts)
- **Vấn đề:** `getEmployeeId()` gọi `getUser()` lại, nhưng `withAuth` ĐÃ gọi rồi và truyền `userId` vào callback.
- **Fix:** Dùng `userId` có sẵn thay vì gọi `getUser()` lần nữa.

### W5: `GoogleCalendarCard` nhận prop `calendarEmail` nhưng không ai pass
- **Files:** [google-calendar-card.tsx:15](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/settings/google-calendar-card.tsx#L14-L16) vs [studio-info-form.tsx:312-315](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/settings/studio-info-form.tsx#L312-L315)
- **Hậu quả:** Badge "Đã kết nối" hiện nhưng không kèm email nào. UX thiếu.
- **Fix:** Pass `calendarEmail` từ settings data.

### W6: Initials logic copy-paste 4 lần
- **Files:** `profile-card.tsx:21`, `member-card.tsx:51`, `edit-profile-modal.tsx:124`, `link-employee-modal.tsx:185`
- **Code lặp:** `.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()`
- **Fix:** Extract `getInitials(name)` vào `lib/utils.ts`.

### W7: Social links validation không nhất quán
- **File:** [settings.schema.ts:21-25](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/lib/validations/settings.schema.ts#L21-L25)
- **Vấn đề:** `website` dùng `.url()`, `facebook`/`instagram` chỉ `.max(200)` — bất kỳ text nào cũng pass.
- **Fix:** Thêm `.url()` cho facebook/instagram, hoặc bỏ `.url()` của website cho nhất quán.

### W8: Schema vs Form conflict — hotline required nhưng form force default
- **Files:** [settings.schema.ts:34](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/lib/validations/settings.schema.ts#L34) vs [studio-info-form.tsx:87](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/settings/studio-info-form.tsx#L87)
- **Vấn đề:** Schema: `hotline: z.string().min(1)` (required). Form: `hotline.trim() || "N/A"` (force default).
- **Fix:** Quyết định 1 trong 2: required → bỏ fallback, hoặc optional → sửa schema.

### W9: Không có rate limiting trên mutations
- **Scope:** `updateProfile`, `updateNotificationPreferences`, `updateStudioInfo`, `updateUserRole`
- **Hậu quả:** Bot hoặc user spam unlimited requests.

---

## 🟢 Info (6)

### I1: `EditProfileModal` dùng `key={String(editOpen)}` — re-mount mỗi lần open
- **File:** [settings-view.tsx:159](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/settings/settings-view.tsx#L158-L164)

### I2: `admin.listUsers()` không pagination — max 50 users
- **File:** [user-management.ts:53](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/app/actions/user-management.ts#L53-L54)

### I3: `link-employee-modal.tsx` — indentation lệch ở line 142

### I4: `docs/specs/settings.md` được reference 6 files nhưng chưa verify nội dung khớp code

### I5: `loading.tsx` dùng `min-h-screen` → double container với AppShell

### I6: `error.tsx` dùng emoji `😕` → vi phạm lesson #13 "chỉ lucide-react"

---

## Compliance Matrix

| Tiêu chí | Kết quả |
|----------|---------|
| Lucide-react only | ⚠️ `error.tsx` dùng emoji |
| SSOT CSS tokens | ✅ |
| V2 UI components (Button, Input, Select, Modal) | ✅ |
| Zod validation | ⚠️ Có nhưng inconsistent (W7, W8) |
| Audit logging | ✅ Tất cả mutations |
| Optimistic locking | ✅ `expected_updated_at` |
| withAuth/withAdmin | ❌ Case-sensitive bug (C1) |
| No console.log | ✅ |
| File < 250 lines | ❌ 2 files vượt (W1, W2) |
| No hardcoded secrets | ✅ |
| .env in .gitignore | ✅ |
| No dead code | ❌ `user-management-actions.ts` (C4) |
| No code duplication | ❌ Initials x4 (W6) |
| Rate limiting | ❌ Không có (W9) |
| No XSS (dangerouslySetInnerHTML) | ✅ |
| Pagination | ⚠️ `listUsers()` thiếu (I2) |
| No TODO bị quên | ❌ 1 TODO logo upload (W3) |

---

## Priority Fix Order

| # | Issue | Type | Effort |
|---|-------|------|--------|
| 1 | C1 + C3: Auth case-sensitive + fallback client | 🔴 | 15 min |
| 2 | C2: Debug session propagation | 🔴 | 30 min |
| 3 | C5: Fix employee_id mismatch | 🔴 | 10 min |
| 4 | C4: Xóa dead file | 🔴 | 1 min |
| 5 | W5: Pass calendarEmail prop | 🟡 | 5 min |
| 6 | W3: Implement/disable logo upload | 🟡 | 20 min |
| 7 | W4: Loại bỏ double getUser() | 🟡 | 15 min |
| 8 | W6: Extract getInitials util | 🟡 | 10 min |
| 9 | W7 + W8: Đồng bộ validation | 🟡 | 10 min |
| 10 | W1 + W2: Tách file lớn | 🟡 | 30 min |
| 11 | W9: Rate limiting | 🟡 | 20 min |
