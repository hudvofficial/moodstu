# Spec: Settings Module (V2)
Status: 📋 Draft v3 — chờ User duyệt

> **V2 = V1 SUPERSET** (Lesson #60, #77). Không được "lite" hơn V1.
> **Gold Standard:** Contract + Service modules — `withAuth` / `withAdmin` / `fireAuditLog` / Zod / Optimistic Locking.
> **V1 Reference:** `0Moodstudio/webapp/app/(protected)/settings/` (5 files + 6 components, ~1600 LOC total)

---

## 0. Gold Standard Reference (Bắt buộc tuân thủ)

> Mọi code trong Settings module PHẢI follow patterns đã proven trong Contract + Service modules.

### 0.1 Action File Pattern (từ `service-mutations.ts`)

```
"use server";
import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { fireAuditLog } from "@/lib/audit";
import { schema } from "@/lib/validations/xxx.schema";

export async function mutateXxx(rawData: unknown) {
  return withAuth(async (supabase, userId) => {
    // 1. Zod validate
    const parsed = schema.safeParse(rawData);
    if (!parsed.success) throw new Error(parsed.error.issues[0].message);
    
    // 2. Optimistic lock (nếu cần)
    const { data: current } = await supabase.from("xxx").select("updated_at")...;
    if (current.updated_at !== parsed.data.expected_updated_at) throw new Error("Conflict");
    
    // 3. DB operation
    const { error } = await supabase.from("xxx").update({ ...data, updated_by: userId });
    if (error) throw new Error(error.message);
    
    // 4. Audit
    fireAuditLog({ action: "UPDATE", tableName: "xxx", recordId: id, ... });
    
    // 5. Revalidate
    revalidatePath("/settings");
    return { id };
  });
}
```

### 0.2 Zod Schema Pattern (từ `contract.schema.ts`)

```
lib/validations/settings.schema.ts
- Enum validators match DB exactly
- Separate sub-schemas for JSONB fields
- Main schema wraps sub-schemas
- Export type inference: z.infer<typeof schema>
```

### 0.3 UI Pattern (từ `contracts-list-client.tsx`)

```
- Import icons: import { Plus, Settings } from "lucide-react";
- Import shared components: TabsFilter, SelectPill, FAB, Badge, Pagination
- Container: className="main-container"
- Cards: className="card-base"
- Buttons: className="btn btn-primary"
- Text: className="text-h2" or "text-body-sm text-text-secondary"
- Error: className="error-text"
- Loading: <Loader2 className="w-6 h-6 text-primary animate-spin" />
- Suspense wrapper: <Suspense><InnerComponent /></Suspense>
```

### 0.4 Error Boundary Pattern (từ `contracts/error.tsx`)

```tsx
"use client";
export default function SettingsError({ error, reset }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-6">
      <div className="text-4xl">😕</div>
      <h2 className="text-h2">Có lỗi xảy ra</h2>
      <p className="text-body text-text-secondary text-center max-w-md">{error.message}</p>
      <button onClick={() => reset()} className="btn btn-primary">Thử lại</button>
    </div>
  );
}
```

### 0.5 Existing Actions Gap Analysis (Cần refactor)

| File hiện tại | LOC | withAuth | Zod | AuditLog | Locking | Action |
|---|---|---|---|---|---|---|
| `studio.ts` (24) | 24 | ✅ | ❌ | ❌ | ❌ | MERGE → `settings-queries.ts` |
| `profile-actions.ts` (98) | 98 | ✅ | ❌ raw data | ❌ | ❌ | REFACTOR → add Zod + Audit |
| `notification-actions.ts` (122) | 122 | ✅ | ❌ | ❌ | ❌ | REFACTOR → add Zod + Audit cho update |

### 0.6 CSS Architecture (Phase 03 — 16 modular files)

Full token registry: xem `tasks/gates/settings-code-gate.md` (GATE A)

---

## 1. Mô tả nghiệp vụ

Module Settings quản lý **toàn bộ cấu hình** cho hệ thống studio, chia 2 lớp quyền:

### Mọi User (Employee đã đăng nhập):
- **Hồ sơ cá nhân**: Xem + sửa thông tin profile (tên, SĐT, ngân hàng, avatar...)
- **Thông báo**: Bật/tắt 5 loại notification (onsite, deadline, overdue, task, system)
- **Changelog**: Xem lịch sử phiên bản ứng dụng
- **Đăng xuất**: Logout

### Admin/Manager Only:
- **Thông tin Studio**: Name, hotline, address, representative, logo, working_hours, timezone
- **Ngân hàng**: bank_info (JSONB: bank_name, account_number, account_name, branch)
- **Mạng xã hội**: social_links (JSONB: website, facebook, instagram)
- **Tích hợp Google Calendar**: Connect/Disconnect OAuth (hiển thị trạng thái, nút kết nối/ngắt)
- **Quản lý thành viên**: Xem danh sách user, link/unlink employee ↔ auth user (V1 MembersSection)

> **NGOÀI SCOPE (Phase hiện tại):** API Keys management (Perplexity/Gemini) — V2 chưa có bảng `system_settings`. Sẽ bổ sung phase sau khi cần.
> **NGOÀI SCOPE:** Audit Logs viewer — đây là module riêng (`/audit-logs`), không thuộc Settings.

---

## 2. Database Schema

### 2.1 Bảng có sẵn (KHÔNG cần migration)

**`public.studio_info`** — Cấu hình chung (1 row duy nhất)

| Column | Type | Mô tả |
|--------|------|-------|
| `id` | uuid PK | Fixed UUID |
| `name` | varchar | Tên studio |
| `address` | text | Địa chỉ |
| `hotline` | varchar | Số hotline |
| `representative` | varchar | Người đại diện |
| `logo_url` | text | URL logo (Supabase Storage) |
| `bank_info` | jsonb | `{ bank_name, account_number, account_name, branch }` |
| `social_links` | jsonb | `{ website, facebook, instagram }` |
| `working_hours` | jsonb | `{ monday_friday: "09:00 - 21:00", saturday_sunday: "08:00 - 22:00" }` |
| `timezone` | varchar | `Asia/Ho_Chi_Minh` |
| `google_calendar_auth` | jsonb | OAuth tokens (access_token, refresh_token, expires_in, updated_at) |
| `created_at` | timestamptz | — |
| `updated_at` | timestamptz | Dùng cho Optimistic Locking |

**`public.notification_preferences`** — Tuỳ chọn thông báo per employee

| Column | Type | Mô tả |
|--------|------|-------|
| `employee_id` | uuid PK+FK→employees | Employee hiện tại |
| `onsite_reminder` | bool | Nhắc lịch on-set |
| `deadline_reminder` | bool | Nhắc deadline |
| `overdue_alert` | bool | Cảnh báo trễ hạn |
| `task_assignment` | bool | Phân công công việc |
| `system_alerts` | bool | Thông báo hệ thống |
| `updated_at` | timestamptz | — |

**`public.employees`** — Đọc để hiển thị profile (READ only, không sửa schema)

### 2.2 Schema khác biệt V1 → V2

| V1 (flat columns) | V2 (JSONB) |
|---|---|
| `bank_account_1`, `bank_account_2` | `bank_info` jsonb `{bank_name, account_number, account_name, branch}` |
| `working_hours_start`, `working_hours_end` | `working_hours` jsonb `{monday_friday, saturday_sunday}` |
| `qr_code_url` column | Chưa có trong V2 DB — SKIP hoặc thêm sau |

---

## 3. Server Actions

### 3.1 File Structure (Refactor từ existing)

```
app/actions/
├── settings-queries.ts    ← REFACTOR từ studio.ts (hiện có getStudioInfo) + add getSettingsPageData
├── settings-mutations.ts  ← MỚI (updateStudioInfo, disconnectGoogleCalendar)
├── profile-actions.ts     ← REFACTOR (đã có: add Zod + fireAuditLog)
└── notification-actions.ts ← REFACTOR (đã có: add Zod + fireAuditLog cho updatePrefs)
```

### 3.2 Queries: `settings-queries.ts`

**REFACTOR từ `studio.ts` (24 dòng hiện có) — mở rộng:**

| Function | Auth | Mô tả |
|----------|------|-------|
| `getStudioInfo()` | `withAuth` | Select 1 row from `studio_info`. **Đã có** — di chuyển + giữ nguyên |
| `getSettingsPageData()` | `withAuth` | Parallel fetch: employee profile + notification prefs + isAdmin check. **Port từ V1 `data.ts`** |
| `getSystemSettingsData()` | `withAdmin` | Fetch studio_info + google_calendar_auth status. **Port từ V1 `system/data.ts`** |

### 3.3 Mutations: `settings-mutations.ts` (MỚI)

| Function | Auth | Zod | AuditLog | Locking | Revalidate |
|----------|------|-----|----------|---------|------------|
| `updateStudioInfo(data, expectedUpdatedAt)` | `withAdmin` | ✅ `studioInfoSchema` | ✅ oldData+newData | ✅ check `updated_at` | `/settings` |
| `updateProfile(data)` | `withAuth` | ✅ `profileSchema` | ✅ | ❌ (personal) | `/settings` |
| `disconnectGoogleCalendar()` | `withAdmin` | N/A | ✅ | ❌ | `/settings` |

**Ghi chú:**
- `updateStudioInfo`: Sanitize HTML (XSS prevention) trước khi lưu — port `stripHtml()` từ V1.
- `updateProfile`: Chỉ update fields user sở hữu (`full_name`, `phone`, `bank_*`, `avatar_url`). KHÔNG cho sửa `role`, `email`.
- `disconnectGoogleCalendar`: Set `google_calendar_auth = null` trên `studio_info`.
- Google Calendar **Connect** dùng API Route (`/api/auth/google`), KHÔNG phải Server Action.

### 3.4 Profile Actions: `profile-actions.ts` (REFACTOR)

File hiện có (98 dòng). Gap analysis:
- ✅ `withAuth()` cho mọi function
- ✅ `revalidatePath('/settings')` khi update
- ❌ **THIẾU Zod** — `updateProfile()` dùng raw `data.full_name` KHÔNG validate
- ❌ **THIẾU `fireAuditLog`** — profile update KHÔNG được ghi log
- ❌ **THIẾU `uploadAvatar` audit** — avatar change KHÔNG có audit trail

**Refactor cần:**
1. Import + gọi `profileSchema.safeParse(rawData)` ở đầu `updateProfile`
2. Thêm `fireAuditLog({ action: "UPDATE", tableName: "employees", ... })` sau update thành công
3. Thêm `fireAuditLog` cho `uploadAvatar` (action: "UPDATE", description: "Cập nhật avatar")

### 3.5 Notification Actions: `notification-actions.ts` (REFACTOR)

File hiện có (122 dòng). Gap analysis:
- ✅ `withAuth()` cho mọi function
- ✅ `revalidatePath('/settings')` khi update
- ❌ **THIẾU Zod** — `updateNotificationPreferences()` nhận `Partial<NotificationPreferences>` KHÔNG validate
- ❌ **THIẾU `fireAuditLog`** — preference update KHÔNG ghi log

**Refactor cần:**
1. Import + gọi `notificationPrefsSchema.safeParse(prefs)` ở đầu `updateNotificationPreferences`
2. Thêm `fireAuditLog({ action: "UPDATE", tableName: "notification_preferences", ... })` sau upsert thành công

### 3.5 Zod Schemas: `lib/validations/settings.schema.ts` (MỚI)

```typescript
// studioInfoSchema — cho updateStudioInfo
{
  name: z.string().min(1, "Tên studio không được trống").max(100),
  hotline: z.string().min(1, "Hotline không được trống").max(20),
  address: z.string().max(500).optional(),
  representative: z.string().max(100).optional(),
  timezone: z.string().default("Asia/Ho_Chi_Minh"),
  bank_info: z.object({
    bank_name: z.string().max(100).optional(),
    account_number: z.string().max(50).optional(),
    account_name: z.string().max(100).optional(),
    branch: z.string().max(100).optional(),
  }).optional(),
  social_links: z.object({
    website: z.string().url().or(z.literal("")).optional(),
    facebook: z.string().max(200).optional(),
    instagram: z.string().max(200).optional(),
  }).optional(),
  working_hours: z.object({
    monday_friday: z.string().optional(),
    saturday_sunday: z.string().optional(),
  }).optional(),
}

// profileSchema — cho updateProfile
{
  full_name: z.string().min(1).max(100),
  phone: z.string().max(20).optional(),
  bank_name: z.string().max(100).optional(),
  bank_account_no: z.string().max(50).optional(),
  bank_account_name: z.string().max(100).optional(),
}
```

### 3.6 Google Calendar API Routes (PORT từ V1)

```
app/api/auth/google/
├── route.ts          ← Initiate OAuth flow (redirect to Google)
└── callback/route.ts ← Handle OAuth callback (save tokens to studio_info)
```

**Logic V1 đã proven** — port nguyên, chỉ adapt V2 Supabase client.

### 3.7 Enforcement Checks (Phase 2 verification)

```bash
grep -c "withAuth\|withAdmin" app/actions/settings-queries.ts     # ≥ 2
grep -c "withAdmin" app/actions/settings-mutations.ts              # ≥ 2
grep -c "fireAuditLog" app/actions/settings-mutations.ts           # ≥ 2
grep -c "safeParse" app/actions/settings-mutations.ts              # ≥ 2
grep -c "revalidatePath" app/actions/settings-mutations.ts         # ≥ 2
grep -c "any" app/actions/settings-queries.ts app/actions/settings-mutations.ts  # = 0
```

---

## 4. Types

### 4.1 `types/settings.ts` (MỚI — centralize StudioInfo, FIX duplicate)

```typescript
// ── Studio Info (DB row) ──
export interface StudioInfo {
  id: string;
  name: string;
  address: string | null;
  hotline: string | null;
  representative: string | null;
  logo_url: string | null;
  bank_info: BankInfo | null;
  social_links: SocialLinks | null;
  working_hours: WorkingHours | null;
  timezone: string | null;
  google_calendar_auth: GoogleCalendarAuth | null;
  created_at: string | null;
  updated_at: string | null;
}

// ── JSONB sub-types ──
export interface BankInfo {
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  branch?: string;
}

export interface SocialLinks {
  website?: string;
  facebook?: string;
  instagram?: string;
}

export interface WorkingHours {
  monday_friday?: string;
  saturday_sunday?: string;
}

export interface GoogleCalendarAuth {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  updated_at: string;
}
```

### 4.2 Cleanup: Remove Duplicates

| File | Action |
|------|--------|
| `types/contract.ts` L293-306 | DELETE `StudioInfo` → `import from '@/types/settings'` |
| `types/service.ts` L89-97 | DELETE `StudioInfo` (WRONG schema: has phone/email/tagline not in DB) → `import from '@/types/settings'` |
| `app/actions/studio.ts` | DELETE file → merge into `settings-queries.ts` |

---

## 5. UI Components

### 5.1 Routing & Pages

```
app/(protected)/settings/
├── page.tsx              ← Server Component: fetch profile + prefs → SettingsView
├── loading.tsx           ← Skeleton (BẮT BUỘC — module-blueprint §8)
├── error.tsx             ← Error boundary (BẮT BUỘC — v2-module-template §7.2)
├── studio/
│   ├── page.tsx          ← Server Component: withAdmin guard → StudioInfoForm
│   └── loading.tsx       ← Skeleton
└── layout.tsx            ← Pass-through (V1 pattern — giữ đơn giản)
```

### 5.2 Components

```
components/settings/
├── settings-view.tsx           ← Main client view (profile + notifs + admin links + logout)
├── profile-card.tsx            ← Profile display + edit button
├── edit-profile-modal.tsx      ← Modal chỉnh sửa profile (dùng openModal)
├── notification-prefs.tsx      ← Toggle switches (5 prefs, optimistic update)
├── studio-info-form.tsx        ← Admin form: Studio identity + Bank + Social + Calendar
├── google-calendar-card.tsx    ← Connect/Disconnect status card
└── toggle-switch.tsx           ← Reusable iOS-style toggle (port từ V1 ToggleSwitch)
```

### 5.3 SSOT Token Mapping (from before-edit.md §3)

| UI Element | SSOT Token/Component | Source |
|------------|---------------------|--------|
| Profile card | `.card-base` | `cards.css` |
| Section cards | `.card-base` + `.form-section-heading` | `cards.css` + `forms.css` |
| Text inputs | `.input-base` | `forms.css @layer base` |
| Labels | `.label-base` | `forms.css` |
| Error messages | `.error-text` | `forms.css` |
| Save button | `.btn-primary` | `buttons.css` |
| Cancel button | `.btn-secondary` | `buttons.css` |
| Danger button (logout/disconnect) | `.btn-danger` | `buttons.css` |
| Ghost button (edit) | `.btn-ghost` / `.btn-icon` | `buttons.css` |
| 2-column grid | `.form-grid-2col` | `forms.css` |
| Form actions footer | `.form-actions` | `forms.css` |
| Page container | `.main-container` | `layout.css` |
| Status badge (Google connected) | `<Badge>` + variant | `components/ui/badge` |
| Modal (edit profile) | `openModal()` (Lesson #81) | Global modal system |
| Icons | `lucide-react` only (Lesson #13-14) | — |

### 5.4 Cần Token/Component MỚI?

| Item | Cần mới? | Giải pháp |
|------|----------|-----------|
| Toggle Switch | ⚠️ CÓ THỂ | Check `components/ui/` trước. Nếu chưa có → SSOT CREATE REQUEST |
| Google Calendar status card | KHÔNG | Dùng `.card-base` + `<Badge>` + `.btn-outline` |
| Settings sidebar nav | KHÔNG CẦN | V1 cũng không dùng sidebar — dùng card links + route navigation |

### 5.5 V1 → V2 UI Adaptation

| V1 Pattern | V2 Adaptation |
|------------|--------------|
| `material-symbols-outlined` icons | → `lucide-react` (Lesson #13) |
| `border border-border` | → `box-shadow` via `.card-base` (Lesson #64) |
| Inline Tailwind colors/sizes | → CSS tokens `.input-base`, `.label-base` etc. |
| `<Section icon="..." title="...">` | → Dùng `.card-base` + `.form-section-heading` |
| V1 uppercase labels | → Sentence case (Lesson #51) |
| Google SVG inline icon | → `lucide-react` Calendar icon |

### 5.6 UX States (BẮT BUỘC — module-blueprint §8)

- [x] **Loading**: `loading.tsx` skeleton + `isSubmitting` cho buttons
- [ ] **Empty**: Profile chưa setup → fallback minimal UI (V1 đã có)
- [ ] **Error**: `error.tsx` boundary + inline error messages (`.error-text`)
- [ ] **Success**: `toast.success()` via sonner
- [ ] **Responsive**: Desktop (max-w-2xl center) + Mobile (full-width cards)

---

## 6. Status Transitions

Không có FSM cho Settings (cấu hình tĩnh).

Google Calendar có 2 states: **Disconnected** ↔ **Connected** — nhưng transition qua OAuth flow, không phải status column.

---

## 7. Performance Considerations (pre-code-checklist)

| Concern | Solution |
|---------|----------|
| Settings page data fetch | `Promise.all([employee, prefs])` parallel (V1 pattern) |
| Google Calendar token check | Lazy — chỉ check khi vào `/settings/studio` |
| Members list (admin) | Lazy-loaded component (V1: `MembersSection` lazy, không preload) |
| SWR | Không cần SWR cho settings — SSR + `revalidatePath` đủ |
| File upload (logo) | Direct to Supabase Storage — không qua server action |

---

## 8. Sidebar Navigation Update

Cần thêm "Cài đặt" vào sidebar chính. Check `components/layout/` cho navigation config.

---

## 9. Implementation Phases

### Phase 1: SCHEMA
- Không cần migration (bảng đã có sẵn)
- Tạo `types/settings.ts` — centralize types
- Cleanup duplicate `StudioInfo` từ `types/contract.ts` + `types/service.ts`

### Phase 2: ACTIONS
- Tạo `settings-queries.ts` (refactor từ `studio.ts`)
- Tạo `settings-mutations.ts` (updateStudioInfo, updateProfile, disconnectGoogleCalendar)
- Tạo `lib/validations/settings.schema.ts` (Zod)
- Port Google Calendar API routes từ V1
- Bổ sung `fireAuditLog` vào `notification-actions.ts`

### Phase 3: UI
- Tạo routes: `settings/page.tsx`, `settings/studio/page.tsx`, `loading.tsx`, `error.tsx`
- Tạo components (7 files, xem §5.2)
- SSOT scan trước khi code (before-edit.md §3)
- Responsive: Desktop max-w-2xl center + Mobile full-width

### Phase 4: VERIFY
- Build pass (`npm run build`)
- Visual verification (browser screenshot desktop + mobile)
- SSOT compliance (grep hardcoded hex, border, any)
- Business logic test (CRUD profile, toggle notifs, update studio info)

---

## 10. Module Compliance Checklist

### Architecture
- [ ] Actions split: `settings-queries.ts` + `settings-mutations.ts`
- [ ] All queries use `withAuth()`
- [ ] Admin mutations use `withAdmin()`
- [ ] Zod `safeParse()` ở đầu mọi mutation
- [ ] `fireAuditLog()` cho mọi mutation
- [ ] Optimistic Locking (check `updated_at`) cho `updateStudioInfo`
- [ ] `revalidatePath()` gọi sau mutations
- [ ] No `any` — full TypeScript types

### Types
- [ ] Types centralized in `types/settings.ts`
- [ ] Duplicate `StudioInfo` cleaned up
- [ ] Zod Schema tại `lib/validations/settings.schema.ts`

### UI
- [ ] No file > 250 lines
- [ ] CSS classes từ SSOT tokens (forms.css, cards.css, buttons.css)
- [ ] KHÔNG hardcode hex (Lesson #64)
- [ ] KHÔNG border — chỉ shadow (Lesson #64)
- [ ] Modal dùng `openModal()` (Lesson #81)
- [ ] Icons: `lucide-react` only (Lesson #13)
- [ ] `error.tsx` + `loading.tsx` có
- [ ] Responsive: Desktop + Mobile

### Database
- [ ] Không cần migration mới
- [ ] RLS đã có: `service_role_full_access` + `anon_no_access`

### Performance
- [ ] Parallel fetch cho settings page data
- [ ] Lazy-load cho admin-only sections
- [ ] Không dùng SWR (SSR đủ cho settings)
