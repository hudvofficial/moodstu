# 🎨 DESIGN: Photo Gallery từ Google Drive

Ngày tạo: 2026-03-22
Dựa trên: plans/260322-0003-photo-gallery-drive/plan.md
Brainstorm: ShotPik analysis + Google Drive API research

---

## 1. 📊 Database Schema (Cách Lưu Thông Tin)

### 1.1. Tables ĐÃ CÓ SẴN (không cần tạo mới)

```
┌────────────────────────────────────────────────────────────────┐
│  📁 GALLERIES (Bộ ảnh)                             ✅ ĐÃ CÓ   │
│  ├── id (uuid, PK)                                            │
│  ├── contract_id (uuid, FK → contracts)                       │
│  ├── title (varchar) — tên album                              │
│  ├── access_url (text) — link public cho khách                │
│  ├── password (varchar) — mật khẩu bảo vệ (optional)         │
│  ├── status (varchar, default 'draft')                        │
│  ├── selection_deadline (date) — hạn chọn ảnh                 │
│  ├── shared_at (timestamptz) — lúc gửi link cho khách         │
│  ├── created_by (uuid, FK → auth.users)                       │
│  ├── created_at, updated_at                                   │
│  │                                                             │
│  ├── 🆕 drive_folder_id (varchar 100) — ID folder Google Drive│
│  └── 🆕 drive_folder_url (text) — Link gốc anh dán vào       │
└──────────────────────┬─────────────────────────────────────────┘
                       │ 1 gallery có nhiều ảnh
                       ▼
┌────────────────────────────────────────────────────────────────┐
│  🖼️ GALLERY_IMAGES (Ảnh trong gallery)             ✅ ĐÃ CÓ   │
│  ├── id (uuid, PK)                                            │
│  ├── gallery_id (uuid, FK → galleries)                        │
│  ├── image_url (text) — URL ảnh full-size từ Drive            │
│  ├── thumbnail_url (text) — URL thumbnail từ Drive            │
│  ├── sort_order (int, default 0)                              │
│  ├── is_selected (bool, default false) — ❤️ khách đã chọn     │
│  ├── client_note (text) — ghi chú của khách                   │
│  ├── created_at                                               │
│  │                                                             │
│  ├── 🆕 drive_file_id (varchar 100) — ID file trên Drive      │
│  ├── 🆕 file_name (varchar 500) — tên file gốc trên Drive     │
│  └── 🆕 selected_at (timestamptz) — lúc khách chọn            │
└────────────────────────────────────────────────────────────────┘
```

### 1.2. Migration SQL

```sql
-- Phase 01: Thêm cột Drive vào galleries
ALTER TABLE galleries
  ADD COLUMN IF NOT EXISTS drive_folder_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS drive_folder_url TEXT;

-- Phase 01: Thêm cột Drive vào gallery_images
ALTER TABLE gallery_images
  ADD COLUMN IF NOT EXISTS drive_file_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS file_name VARCHAR(500),
  ADD COLUMN IF NOT EXISTS selected_at TIMESTAMPTZ;

-- Index cho tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_gallery_images_drive_file_id
  ON gallery_images(drive_file_id);
CREATE INDEX IF NOT EXISTS idx_galleries_contract_id
  ON galleries(contract_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_galleries_access_url
  ON galleries(access_url) WHERE access_url IS NOT NULL;
```

### 1.3. RLS Hiện Tại (ĐÃ CÓ — cần bổ sung)

**Hiện có:**

- galleries: admin/manager SELECT, INSERT, UPDATE, DELETE | media INSERT, UPDATE | creator SELECT
- gallery_images: admin/manager/media CRUD | SELECT qua gallery ownership

**CẦN THÊM:** Policy cho anonymous/public access (khách xem gallery qua access_url)

```sql
-- Cho phép anonymous đọc gallery qua access_url
CREATE POLICY "galleries_public_read" ON galleries
  FOR SELECT TO anon
  USING (access_url IS NOT NULL AND status = 'published');

-- Cho phép anonymous đọc ảnh trong gallery đã published
CREATE POLICY "gallery_images_public_read" ON gallery_images
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM galleries g
    WHERE g.id = gallery_images.gallery_id
    AND g.access_url IS NOT NULL
    AND g.status = 'published'
  ));

-- Cho phép anonymous UPDATE is_selected (toggle heart)
CREATE POLICY "gallery_images_public_select" ON gallery_images
  FOR UPDATE TO anon
  USING (EXISTS (
    SELECT 1 FROM galleries g
    WHERE g.id = gallery_images.gallery_id
    AND g.status = 'published'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM galleries g
    WHERE g.id = gallery_images.gallery_id
    AND g.status = 'published'
  ));
```

---

## 2. 🔗 Google Drive Integration

### 2.1. Cách lấy ảnh từ Drive (Chi tiết kỹ thuật)

```
ADMIN DÁN LINK:
https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz?usp=sharing
                                         ↑
                              FOLDER_ID = 1AbCdEfGhIjKlMnOpQrStUvWxYz

SERVER ACTION GỌI API:
GET https://www.googleapis.com/drive/v3/files
  ?q='FOLDER_ID'+in+parents+and+mimeType+contains+'image'
  &fields=files(id,name,mimeType,thumbnailLink,imageMediaMetadata)
  &key=GOOGLE_DRIVE_API_KEY
  &pageSize=100

RESPONSE → Danh sách files:
[
  { id: "fileId1", name: "DSC_0001.jpg", mimeType: "image/jpeg" },
  { id: "fileId2", name: "DSC_0002.jpg", mimeType: "image/jpeg" },
  ...
]

LƯU VÀO DB:
- image_url    = "https://lh3.googleusercontent.com/d/fileId1"
- thumbnail_url = "https://drive.google.com/thumbnail?id=fileId1&sz=s800"
- file_name    = "DSC_0001.jpg"
- drive_file_id = "fileId1"
```

### 2.2. URL Patterns

| Mục đích       | URL Format                                    | Dùng ở đâu         |
| -------------- | --------------------------------------------- | ------------------ |
| Grid thumbnail | `drive.google.com/thumbnail?id={ID}&sz=s400`  | Gallery grid (nhẹ) |
| Preview lớn    | `drive.google.com/thumbnail?id={ID}&sz=s1600` | Full-screen viewer |
| Ảnh full       | `lh3.googleusercontent.com/d/{ID}`            | Download/zoom      |

### 2.3. Lib: google-drive.ts

```typescript
// lib/google-drive.ts

/** Parse folder ID từ nhiều format URL */
export function parseDriveFolderUrl(url: string): string | null {
  // Format 1: https://drive.google.com/drive/folders/FOLDER_ID
  // Format 2: https://drive.google.com/drive/folders/FOLDER_ID?usp=sharing
  // Format 3: https://drive.google.com/drive/u/0/folders/FOLDER_ID
  const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/** Build thumbnail URL từ file ID */
export function getDriveThumbnailUrl(
  fileId: string,
  size: number = 400,
): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=s${size}`;
}

/** Build full image URL */
export function getDriveImageUrl(fileId: string): string {
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

/** Fetch file list từ Drive folder (server-side only) */
export async function fetchDriveFiles(folderId: string): Promise<DriveFile[]> {
  const API_KEY = process.env.GOOGLE_DRIVE_API_KEY;
  if (!API_KEY) throw new Error("Missing GOOGLE_DRIVE_API_KEY");

  const allFiles: DriveFile[] = [];
  let pageToken: string | null = null;

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and mimeType contains 'image'`,
      fields: "nextPageToken,files(id,name,mimeType)",
      key: API_KEY,
      pageSize: "100",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params}`,
      { next: { revalidate: 0 } }, // No cache
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "Drive API error");
    }

    const data = await res.json();
    allFiles.push(...data.files);
    pageToken = data.nextPageToken || null;
  } while (pageToken);

  return allFiles;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}
```

---

## 3. 📡 Server Actions

### 3.1. File: `app/actions/gallery-actions.ts`

| Action                 | Auth                     | Mô tả                                         |
| ---------------------- | ------------------------ | --------------------------------------------- |
| `createGallery`        | withAuth (admin/manager) | Tạo gallery + sync folder Drive               |
| `getGalleryByContract` | withAuth                 | Lấy gallery + images theo contract_id         |
| `syncDriveFolder`      | withAuth (admin/manager) | Re-sync file mới từ Drive                     |
| `deleteGallery`        | withAuth (admin)         | Xóa gallery + all images                      |
| `shareGallery`         | withAuth (admin/manager) | Publish gallery + tạo access_url              |
| `getPublicGallery`     | NO AUTH                  | Lấy gallery public cho khách (qua access_url) |
| `toggleImageSelection` | NO AUTH                  | Khách toggle ❤️ (qua gallery access check)    |
| `getSelectedImages`    | withAuth                 | Lấy danh sách ảnh đã chọn (cho admin filter)  |

### 3.2. Flow Chart

```
ADMIN FLOW:
─────────────────────────────────────────────────────
Dán link Drive → parseDriveFolderUrl()
      ↓
createGallery(contractId, title, driveUrl)
      ↓
  ├─ INSERT galleries (drive_folder_id, access_url = nanoid)
  ├─ fetchDriveFiles(folderId)
  └─ BULK INSERT gallery_images (drive_file_id, file_name, URLs)
      ↓
Gallery hiển thị trên Contract Detail
      ↓
Bấm "Chia sẻ" → shareGallery() → status='published'
      ↓
Copy link: /gallery/{access_url}

CLIENT FLOW:
─────────────────────────────────────────────────────
Mở link /gallery/{access_url}
      ↓
getPublicGallery(accessUrl) — kiểm tra status='published'
      ↓
Hiển thị grid ảnh (thumbnail từ Drive)
      ↓
Bấm ❤️ → toggleImageSelection(imageId)
      ↓
UPDATE gallery_images SET is_selected, selected_at
```

---

## 4. 📱 Các Màn Hình (Components)

### 4.1. Admin: DriveGalleryBlock (thay FilesDrivePlaceholder)

```
┌─ DriveGalleryBlock ──────────────────────────────────────────┐
│                                                               │
│  📁 File & Drive                                              │
│  ─────────────────────────────────────────────────────────── │
│                                                               │
│  STATE 1: Chưa có gallery (empty)                            │
│  ┌───────────────────────────────────────────────────┐       │
│  │  🖼️ Dán link Google Drive folder                  │       │
│  │  [____________________________________] [Đồng bộ] │       │
│  └───────────────────────────────────────────────────┘       │
│                                                               │
│  STATE 2: Đang sync (loading)                                │
│  ┌───────────────────────────────────────────────────┐       │
│  │  ⏳ Đang đồng bộ ảnh từ Google Drive...           │       │
│  │  ██████████░░░░ 67/111 ảnh                        │       │
│  └───────────────────────────────────────────────────┘       │
│                                                               │
│  STATE 3: Gallery loaded                                     │
│  ┌───────────────────────────────────────────────────┐       │
│  │  🖼️ 111  │  ❤️ 14  │  💬 0     [Chia sẻ] [Sync] │       │
│  │  ──────────────────────────────────────────────── │       │
│  │  [Tất cả] [❤️ Đã chọn (14)] [Chưa chọn]         │       │
│  │  ──────────────────────────────────────────────── │       │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐            │       │
│  │  │      │ │      │ │  ❤️  │ │      │            │       │
│  │  │ img1 │ │ img2 │ │ img3 │ │ img4 │            │       │
│  │  │      │ │      │ │      │ │      │            │       │
│  │  └──────┘ └──────┘ └──────┘ └──────┘            │       │
│  │  DSC_001  DSC_002  DSC_003  DSC_004              │       │
│  └───────────────────────────────────────────────────┘       │
│                                                               │
│  [📋 Xuất tên file đã chọn]                                  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### 4.2. Public: /gallery/[accessUrl]

```
LANDING (giống ShotPik):
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│              📷 Album: Bé My — Tết 2026                      │
│                                                               │
│                   [ Xem Album ]                               │
│                                                               │
│                    Mood Studio                                │
│                                                               │
└───────────────────────────────────────────────────────────────┘

GALLERY:
┌───────────────────────────────────────────────────────────────┐
│  📷 Bé My — Tết 2026             ❤️ 0/111 đã chọn           │
│  ─────────────────────────────────────────────────────────── │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
│  │          │ │          │ │          │                     │
│  │   img1   │ │   img2   │ │   img3   │                     │
│  │          │ │    ❤️    │ │          │                     │
│  └──────────┘ └──────────┘ └──────────┘                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
│  │          │ │          │ │          │                     │
│  │   img4   │ │   img5   │ │   img6   │                     │
│  │          │ │          │ │          │                     │
│  └──────────┘ └──────────┘ └──────────┘                     │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │  ❤️ Đã chọn 1 ảnh         [ Hoàn tất chọn ảnh ]    │   │
│  └───────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘

FULL-SCREEN VIEWER (click ảnh):
┌───────────────────────────────────────────────────────────────┐
│  ✕                                    DSC_0002.jpg   ❤️     │
│                                                               │
│                                                               │
│                                                               │
│         ◀        [ FULL SIZE IMAGE ]          ▶               │
│                                                               │
│                                                               │
│                                                               │
│  Ghi chú: [________________________________]                 │
│                                                               │
│  ● ○ ○ ○ ○ ○ ○ ○ ○ ○                    2 / 111              │
└───────────────────────────────────────────────────────────────┘
```

### 4.3. Component Tree

```
app/
├── gallery/
│   └── [accessUrl]/
│       └── page.tsx              ← Public gallery route (NO auth)
│
components/
├── contracts/detail/
│   ├── drive-gallery-block.tsx   ← THAY files-drive-placeholder.tsx
│   ├── gallery-grid.tsx          ← Admin grid (dùng chung client)
│   └── gallery-stats.tsx         ← Stats bar (tổng/chọn/note)
│
├── gallery/                      ← Components public gallery
│   ├── gallery-landing.tsx       ← Hero + "Xem Album"
│   ├── client-gallery-grid.tsx   ← Masonry grid cho khách
│   ├── image-viewer.tsx          ← Full-screen slider
│   └── selection-summary.tsx     ← Bottom bar "Đã chọn X"
│
lib/
└── google-drive.ts               ← Parse URL + API helper

app/actions/
└── gallery-actions.ts            ← TẤT CẢ server actions
```

---

## 5. 🚶 Luồng Hoạt Động (User Journeys)

### 5.1. Admin: Tạo Gallery

```
1️⃣ Admin mở Contract Detail → scroll đến "File & Drive"
2️⃣ Dán link Google Drive folder → bấm "Đồng bộ"
3️⃣ App: parse URL → gọi Drive API → fetch danh sách file
4️⃣ App: lưu metadata vào DB → hiển thị grid ảnh
5️⃣ Admin: xem qua ảnh → bấm "Chia sẻ" → copy link
6️⃣ Admin: gửi link cho khách (Zalo/Telegram)
```

### 5.2. Khách: Xem + Chọn Ảnh

```
1️⃣ Khách nhận link → mở trên trình duyệt
2️⃣ Thấy landing page "Album: Bé My" → bấm "Xem Album"
3️⃣ Lướt gallery → bấm ❤️ để chọn ảnh yêu thích
4️⃣ (Optional) Bấm ảnh → full-screen → viết ghi chú
5️⃣ Bottom bar hiển thị "Đã chọn X ảnh"
6️⃣ (Optional) Bấm "Hoàn tất" → khóa selection
```

### 5.3. Admin: Filter + Export

```
1️⃣ Admin quay lại Contract Detail
2️⃣ Tab "❤️ Đã chọn" → thấy 14 ảnh khách chọn
3️⃣ Bấm "Xuất tên file" → clipboard có:
     DSC_0003.jpg
     DSC_0015.jpg
     DSC_0028.jpg
     ...
4️⃣ Paste vào Lightroom → filter → edit ảnh
```

---

## 6. ⚠️ Tình Huống Đặc Biệt

| Tình huống                     | Xử lý                                                               |
| ------------------------------ | ------------------------------------------------------------------- |
| Link Drive sai format          | Hiện lỗi "Link không đúng. Hãy dán link folder Google Drive"        |
| Folder không public            | Hiện lỗi "Folder chưa được chia sẻ. Hãy bật 'Anyone with the link'" |
| Folder rỗng (0 ảnh)            | Hiện "Folder này chưa có ảnh nào"                                   |
| Album > 200 ảnh                | Phân trang (Load More), Drive API tự paginate                       |
| Google API quota hết           | Retry logic + thông báo "Thử lại sau 1 phút"                        |
| Khách mở link khi chưa publish | Hiện "Album chưa sẵn sàng"                                          |
| Admin sync lại (có ảnh mới)    | So sánh drive_file_id → chỉ INSERT ảnh mới, giữ selection cũ        |
| Ảnh bị xóa trên Drive          | Thumbnail hiện lỗi → badge "Ảnh đã xóa"                             |

---

## 7. ✅ Test Cases

### TC-01: Admin Sync Drive (Happy Path)

```
Given: Admin đang ở Contract Detail, chưa có gallery
When:  Dán "https://drive.google.com/drive/folders/abc123?usp=sharing"
       Bấm "Đồng bộ"
Then:  ✓ Gallery được tạo trong DB
       ✓ Hiện grid ảnh với thumbnail
       ✓ Stats: "111 ảnh | 0 đã chọn"
       ✓ Tên file hiện đúng dưới mỗi ảnh
```

### TC-02: Khách Thả Tim

```
Given: Khách mở link gallery đã published
When:  Bấm ❤️ trên ảnh DSC_0003
Then:  ✓ is_selected = true trong DB
       ✓ selected_at ghi timestamp
       ✓ Animation tim đỏ
       ✓ Counter "Đã chọn 1" cập nhật
```

### TC-03: Admin Filter

```
Given: Khách đã chọn 14 ảnh
When:  Admin bấm tab "❤️ Đã chọn"
Then:  ✓ Chỉ hiện 14 ảnh
       ✓ Tên file rõ ràng
       ✓ Bấm "Xuất tên file" → clipboard có 14 tên file
```

### TC-04: Link Drive Sai

```
Given: Admin ở "File & Drive"
When:  Dán "https://google.com/abc"
Then:  ✓ Hiện lỗi "Link không hợp lệ"
       ✓ Không tạo gallery
       ✓ Input highlight đỏ
```

### TC-05: Re-sync (Ảnh mới)

```
Given: Gallery đã có 100 ảnh, admin up thêm 11 ảnh trên Drive
When:  Bấm "Đồng bộ lại"
Then:  ✓ 11 ảnh mới được thêm
       ✓ 100 ảnh cũ giữ nguyên (kể cả selection)
       ✓ Stats: "111 ảnh"
```

### TC-06: Responsive Mobile

```
Given: Khách mở gallery trên điện thoại (375px)
When:  Lướt gallery
Then:  ✓ Grid 2 cột
       ✓ Swipe left/right trong viewer
       ✓ Bottom bar không che ảnh
```

---

## 8. 🛠️ Tech Notes

### 8.1. Env Variables

```
GOOGLE_DRIVE_API_KEY=AIza...     # Server-side only, restricted to Drive API
```

### 8.2. Dependencies Mới

- `nanoid` (hoặc uuid) — tạo access_url ngắn gọn (đã có uuid_generate_v4)
- Không cần thêm package — dùng fetch native cho Drive API

### 8.3. Performance

- Thumbnail grid: `sz=s400` (~20KB/ảnh × 20 visible = 400KB)
- Full-screen: `sz=s1600` (lazy load khi bấm)
- Intersection Observer cho lazy load grid
- DB: index trên gallery_id, drive_file_id, access_url

### 8.4. Security

- Google API Key: chỉ dùng server-side (process.env, không expose client)
- Public gallery: chỉ READ + toggle selection, KHÔNG CRUD
- access_url: random string (nanoid 12 chars), khó đoán
- Optional: password protection trên gallery

---

_Tạo bởi AWF 2.1 - Design Phase | 2026-03-22_
