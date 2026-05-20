# Phase 06: Google OAuth Unification & Selected JPG Copy

Status: ⬜ Pending  
Goal: Hợp nhất Google OAuth (Calendar + Drive) thành 1 flow duy nhất, sau đó dùng OAuth token để copy JPG đã chọn sang Drive folder.

## Audit Hiện Trạng (đã verify code)

| File | Vai trò | Column/Field dùng |
|---|---|---|
| `api/auth/google/route.ts` | Khởi tạo OAuth, scope: `calendar` only | — |
| `api/auth/google/callback/route.ts` | Nhận token, lưu encrypted vào DB | `studio_info.google_calendar_auth` |
| `lib/googleCalendarService.ts` | CRUD Calendar, có `ensureValidToken` + `refreshAccessToken` | `google_calendar_auth` |
| `lib/settings-secrets.ts` | Encrypt/decrypt helpers, tên `encryptGoogleCalendarAuth` | hardcode field names |
| `lib/google-drive.ts` | Fetch files bằng `API_KEY` (read-only, public folder) | `GOOGLE_DRIVE_API_KEY` env |
| `api/drive-download/[fileId]/route.ts` | Proxy download bằng `API_KEY` | `GOOGLE_DRIVE_API_KEY` env |
| `app/actions/gallery-drive-actions.ts` | createMultiFolderGalleries, updateDriveFolderUrl, getRetouchProgress | — |
| `app/actions/settings-mutations.ts` | Disconnect Google (clear token) | `google_calendar_auth` |
| `app/actions/settings-queries.ts` | Read studio info + auth status | `google_calendar_auth` |
| `app/actions/calendar-queries.ts` | Check Calendar connected | `google_calendar_auth` |
| `components/settings/studio-info-form.tsx` | Settings UI "Kết nối Calendar" | `google_calendar_auth` |

References to `google_calendar_auth`: ~30 chỗ across 8 files.

## Scope Decision

- `drive.file`: CHỈ truy cập file do app tạo/mở → **KHÔNG copy được** file photographer đã upload sẵn
- `drive.readonly`: Chỉ đọc, không tạo folder/copy
- `drive`: Full access → **BẮT BUỘC** cho `files.copy` trên file có sẵn

Scope mới: `https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/drive`

Dùng `include_granted_scopes=true` để incremental authorization — user đã consent Calendar thì chỉ thêm Drive consent.

## Kiến trúc mới

```
┌──────────────────────────────────────────┐
│  OAuth Flow (1 flow duy nhất)            │
│  Default scope: calendar + drive         │
│  include_granted_scopes=true             │
└──────────────────┬───────────────────────┘
                   │
         ┌─────────┴──────────┐
         │  lib/google-auth.ts │  ← MỚI: shared token layer
         │  - getValidToken()  │     extract từ googleCalendarService
         │  - refreshToken()   │
         │  - hasScope()       │
         └────┬──────────┬────┘
              │          │
   ┌──────────┴──┐  ┌───┴──────────────┐
   │ Calendar    │  │ Drive OAuth      │
   │ Service     │  │ Service           │  ← MỚI
   │ (import từ  │  │ - createFolder() │
   │  google-auth│  │ - copyFile()     │
   └─────────────┘  └──────────────────┘
```

Drive read (API_KEY) giữ nguyên — không đụng. Chỉ thêm Drive write qua OAuth.

---

## Steps (thứ tự an toàn, mỗi step verify trước khi tiếp)

### Step 1: Migration Supabase — rename column

```sql
ALTER TABLE studio_info
  RENAME COLUMN google_calendar_auth TO google_oauth;
```

- Migration file: `supabase/migrations/YYYYMMDD_rename_google_oauth.sql`
- Rollback: `ALTER TABLE studio_info RENAME COLUMN google_oauth TO google_calendar_auth;`

### Step 2: Rename helpers trong `lib/settings-secrets.ts`

| Cũ | Mới |
|---|---|
| `encryptGoogleCalendarAuth()` | `encryptGoogleOAuth()` |
| `decryptGoogleCalendarAuth()` | `decryptGoogleOAuth()` |
| `redactGoogleCalendarAuth()` | `redactGoogleOAuth()` |

Giữ old name as deprecated alias (1 dòng re-export) để không break import trong 1 lần. Xoá alias sau khi rename xong tất cả references.

### Step 3: Update tất cả references `google_calendar_auth` → `google_oauth`

Files cần sửa (đã verify):

- `app/api/auth/google/callback/route.ts` — `.select("id, google_oauth")`, `.update({ google_oauth: ... })`
- `lib/googleCalendarService.ts` — `studioInfo.google_oauth`
- `app/actions/settings-mutations.ts` — disconnect logic
- `app/actions/settings-queries.ts` — read logic
- `app/actions/calendar-queries.ts` — connection check
- `components/settings/studio-info-form.tsx` — UI display
- `app/(protected)/services/[id]/quote/page.tsx` — read check

**Verify**: Calendar CRUD vẫn hoạt động sau rename.

### Step 4: Extract shared auth → `lib/google-auth.ts`

Extract từ `lib/googleCalendarService.ts`:
- `refreshAccessToken()` → move nguyên xi
- `ensureValidToken()` → move + rename thành `getValidGoogleToken()`
- Thêm `hasGoogleScope(scopes: string, required: string): boolean`

`googleCalendarService.ts` sẽ import từ `google-auth.ts` thay vì tự chứa.

**Verify**: Calendar CRUD vẫn hoạt động sau extract.

### Step 5: Update OAuth route — thêm Drive scope

`api/auth/google/route.ts`:
- Scope: `calendar drive` (cả 2)
- Thêm `include_granted_scopes=true`
- Thêm `state` payload chứa `requested_scopes` để callback biết

`api/auth/google/callback/route.ts`:
- Lưu `scope` response từ Google vào token blob field `granted_scopes`
- Dùng `encryptGoogleOAuth()` (đã rename ở Step 2)

### Step 6: Settings UI — đổi thành "Kết nối Google"

`components/settings/studio-info-form.tsx`:
- Label: "Kết nối Google" (thay vì "Kết nối Calendar")
- Hiện scope status: `Calendar ✅` / `Drive ✅` hoặc `Drive ❌ — Cần kết nối lại`
- Nút "Kết nối lại" nếu thiếu Drive scope

### Step 7: Tạo `lib/google-drive-oauth.ts` — Drive write operations

```typescript
// Dùng OAuth token (không phải API key)
export async function createDriveFolder(accessToken: string, parentId: string, name: string): string
export async function copyDriveFile(accessToken: string, fileId: string, destFolderId: string): { id: string; name: string }
```

### Step 8: Server action `copySelectedJpgToDrive`

`app/actions/gallery-drive-actions.ts` thêm:

```typescript
export async function copySelectedJpgToDrive(galleryId: string, contractCode: string)
```

Workflow:
1. Check OAuth token + Drive scope → nếu thiếu → return `{ error: "needs_drive_scope" }`
2. Query selected images (is_selected = true, file extension = jpg/jpeg)
3. Nếu image group có cả RAW + JPG → chỉ copy JPG row
4. Tạo destination folder: `Selected - {contractCode}`
5. Copy từng file bằng `copyDriveFile()`
6. Ghi progress vào `gallery_filter_jobs` table
7. Return destination folder URL + success/failed counts

### Step 9: Admin UI — nút "Lọc JPG đã chọn"

`gallery-toolbar.tsx` hoặc `gallery-toolbar-actions.tsx`:
- Nút chỉ hiện khi `selectedCount > 0`
- Bấm → check scope → nếu OK → confirm dialog → run copy
- Progress indicator (toast hoặc inline)
- Kết quả: link tới folder Drive đích

---

## File Rules

- Chỉ copy JPG/JPEG
- KHÔNG copy RAW/XMP
- KHÔNG move/delete source files
- Nếu selected row là RAW → skip
- Nếu selected group có cả RAW + JPG → copy JPG only
- Drive cho phép duplicate filename → ghi file ID vào job result

## Failure Handling

- Token expired: auto-refresh qua `getValidGoogleToken()` → retry
- Missing source file (404): mark failed, tiếp tục file khác
- Permission denied (403): mark failed với message "Cần kết nối Drive"
- Duplicate destination filename: Drive tự handle, ghi ID

## Acceptance

- [ ] Migration `google_calendar_auth` → `google_oauth` đã chạy
- [ ] Calendar CRUD vẫn hoạt động bình thường sau rename
- [ ] Settings UI hiện đúng "Kết nối Google" + scope status
- [ ] OAuth consent xin cả Calendar + Drive scope
- [ ] Drive copy hoạt động trên test folder nhỏ
- [ ] Job có thể retry
- [ ] Failed files hiển thị rõ
- [ ] Destination folder URL lưu và hiển thị cho admin
- [ ] `npm run build` pass
