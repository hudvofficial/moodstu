# HANDOFF — T-20260806-gallery-filter-mode — claude → (chờ user duyệt)

- **Task:** T-20260806-gallery-filter-mode — Modal "Lọc ảnh": 3 radio đang là UI chết; cho chọn thật Ảnh khách chọn / Ảnh thả tim / Cả hai, áp cho cả 3 tab
- **Từ → Đến:** claude → claude (fallback, user đã chốt không qua Codex ở task trước — cần xác nhận lại cho task này)
- **Branch / worktree:** làm thẳng trên `main` (5 file, cùng 1 module gallery)
- **Locks (vùng độc quyền):**
  - `types/gallery.ts`
  - `components/contracts/gallery/gallery-full-page.tsx`
  - `components/contracts/gallery/gallery-filter-modal.tsx`
  - `components/contracts/gallery/tabs/gallery-filter-drive-tab.tsx`
  - `app/actions/gallery-drive-actions.ts`
- **Ngày:** 2026-08-06

## 1. Mục tiêu bước này

Người dùng chọn được **nguồn ảnh** để lọc (Ảnh khách chọn / Ảnh thả tim / Cả hai), lựa chọn đó **thật sự điều khiển** cả 3 tab (Copy tại Local, Google Drive, Export Pack), và **con số hiển thị khớp đúng số file sẽ được copy**.

## 2. Đã làm / hiện trạng — root cause đã truy xong

### Hiện tượng (user phát hiện 2026-08-06)

Trên `/contracts/<id>/gallery`, chip thống kê hiện **163 Khách chọn · 159 Thả tim**. Mở modal "Lọc ảnh vào Google Drive": tiêu đề ghi *"Có tổng cộng 159 file JPG được chọn"*, nhóm radio có 3 dòng, 2 dòng dưới bị xám.

### ĐO ĐƯỢC (đọc code, không suy đoán)

**(a) 3 radio là UI chết.** [gallery-filter-drive-tab.tsx:136-148](components/contracts/gallery/tabs/gallery-filter-drive-tab.tsx#L136-L148): `<Radio name="filterType" defaultChecked />` — không state, không `onChange`, và `handleCopyDrive` (dòng 28-129) **không đọc** giá trị nào. Bấm "Bắt đầu lọc" luôn ra cùng kết quả.

**(b) Ba tab đang dùng HAI nguồn dữ liệu khác nhau:**

| Tab | Nguồn danh sách file | Predicate thật |
|---|---|---|
| Google Drive | server tự query trong `initDriveCopyJob`, **bỏ qua** danh sách client gửi lên | `is_selected = true` **OR** có reaction `heart` — [gallery-drive-actions.ts:272-297](app/actions/gallery-drive-actions.ts#L272-L297) |
| Copy tại Local | prop `selectedJpgNames` | **chỉ tim** |
| Export Pack | prop `selectedJpgNames` | **chỉ tim** |

`selectedJpgNames` = `fullSelectedJpgNames`, nạp ở [gallery-full-page.tsx:107](components/contracts/gallery/gallery-full-page.tsx#L107) bằng `fetchAllHeartedDownloadFiles()` → `getAllHeartedImagesForAction` ([gallery-image-helpers.ts:103](app/actions/gallery-image-helpers.ts#L103)) — chỉ đọc `gallery_reactions.reaction_type = 'heart'`, **không** đụng `is_selected`.

**(c) Hai hệ quả sai:**
1. Số "159 file JPG được chọn" lấy từ danh sách **tim**, nhưng job Drive copy **union(khách chọn ∪ tim) ≥ 163** → số hiển thị không khớp việc thật sự làm.
2. Tab Local/Export **bỏ sót** ảnh khách chọn mà không thả tim, dù nhãn tab là "Lọc & Copy Ảnh Đã Chọn" và cảnh báo trong tab ghi *"ảnh khách chọn không có trong thư mục gốc"*.

**(d) Lệch phụ ở server:** `jpgImages` ([gallery-drive-actions.ts:293-297](app/actions/gallery-drive-actions.ts#L293-L297)) **không lọc `drive_file_id`**, trong khi mọi fetcher client đều lọc (`use-gallery-data.ts:441,449`). Ảnh thiếu `drive_file_id` sẽ vào `filesToCopy` rồi chắc chắn fail khi tạo shortcut, và làm `total_count` của job phồng lên.

**(e) "Ảnh có tag" không có dữ liệu.** Bảng `gallery_images` không có cột tag nào (`types/database.types.ts:2747-2764`); cột `tags` là của bảng `galleries`. "Ảnh có bình luận" thì có dữ liệu (`gallery_comments`) nhưng **ngoài phạm vi task này**.

**(f) `initDriveCopyJob` chỉ có 1 nơi gọi** (grep toàn repo): `gallery-filter-drive-tab.tsx:36`. Đổi chữ ký an toàn.

### Quyết định nghiệp vụ user đã chốt (2026-08-06)

Radio hoạt động thật với **3 lựa chọn: Ảnh khách chọn / Ảnh thả tim / Cả hai**, áp cho **cả 3 tab**, số hiển thị đổi theo lựa chọn.

## 3. Files touched

1. `types/gallery.ts` — thêm 2 type (additive)
2. `components/contracts/gallery/gallery-full-page.tsx` — nạp cả 2 danh sách, đổi props truyền xuống
3. `components/contracts/gallery/gallery-filter-modal.tsx` — state chế độ + nhóm radio dùng chung + tính danh sách theo chế độ
4. `components/contracts/gallery/tabs/gallery-filter-drive-tab.tsx` — bỏ khối radio chết, nhận prop chế độ, gửi lên server
5. `app/actions/gallery-drive-actions.ts` — nhận `filterMode`, query theo chế độ, lọc `drive_file_id`

Chạm ngoài 5 file này → DỪNG.

## 4. Bước tiếp cần làm — 9 task, chép nguyên văn

### Task 1 — thêm type dùng chung
File `types/gallery.ts`, **thêm vào cuối file**:

```ts
/** Nguồn ảnh cho modal "Lọc ảnh": khách bấm chọn (is_selected), khách thả tim (gallery_reactions), hoặc cả hai. */
export type GalleryFilterMode = "selected" | "hearted" | "both";

/** 1 file ứng viên để lọc — imageId dùng để khử trùng khi hợp 2 nguồn. */
export interface GalleryFilterFile {
  imageId: string;
  fileName: string;
}
```

### Task 2 — `gallery-full-page.tsx`: nạp CẢ HAI danh sách
File `components/contracts/gallery/gallery-full-page.tsx`, **dòng 82**.

Từ:
```tsx
  const [fullSelectedJpgNames, setFullSelectedJpgNames] = useState<string[]>([]);
```
Thành:
```tsx
  const [heartedFiles, setHeartedFiles] = useState<GalleryFilterFile[]>([]);
  const [clientSelectedFiles, setClientSelectedFiles] = useState<GalleryFilterFile[]>([]);
```

### Task 3 — `gallery-full-page.tsx`: import type mới
File `components/contracts/gallery/gallery-full-page.tsx`, **dòng 21**.

Từ:
```tsx
import type { GallerySummary } from "@/types/gallery";
```
Thành:
```tsx
import type { GallerySummary, GalleryFilterFile } from "@/types/gallery";
```

### Task 4 — `gallery-full-page.tsx`: nạp song song 2 nguồn
File `components/contracts/gallery/gallery-full-page.tsx`, **dòng 101-115** (cả hàm `handleOpenFilterModal`).

Từ:
```tsx
  const handleOpenFilterModal = async (tab?: "drive" | "local" | "export") => {
    if (tab) setFilterTab(tab);
    setIsFilterModalOpen(true);
    
    // Fetch full list of hearted JPGs directly from DB to bypass pagination limits
    try {
      const files = await fetchAllHeartedDownloadFiles();
      const jpgNames = files
        .filter((f: { fileName: string }) => f.fileName && /\.(jpe?g)$/i.test(f.fileName))
        .map((f: { fileName: string }) => f.fileName);
      setFullSelectedJpgNames(jpgNames);
    } catch (e) {
      console.error("Lỗi lấy danh sách JPG tim", e);
    }
  };
```
Thành:
```tsx
  const handleOpenFilterModal = async (tab?: "drive" | "local" | "export") => {
    if (tab) setFilterTab(tab);
    setIsFilterModalOpen(true);

    // Nạp thẳng từ DB để không dính giới hạn pagination. Nạp CẢ HAI nguồn vì
    // modal cho đổi qua lại giữa "khách chọn" / "thả tim" / "cả hai" — lọc đuôi
    // JPG để trong modal (một chỗ duy nhất).
    try {
      const [hearted, selected] = await Promise.all([
        fetchAllHeartedDownloadFiles(),
        fetchAllSelectedDownloadFiles(),
      ]);
      setHeartedFiles(hearted);
      setClientSelectedFiles(selected);
    } catch (e) {
      console.error("Lỗi lấy danh sách ảnh để lọc", e);
      toast.error("Không lấy được danh sách ảnh để lọc. Đóng modal và thử lại.");
    }
  };
```

> `fetchAllSelectedDownloadFiles` đã có sẵn trong destructuring ở dòng 51 — không cần thêm gì. `toast` đã import sẵn ở dòng 8.

### Task 5 — `gallery-full-page.tsx`: đổi props truyền xuống modal
File `components/contracts/gallery/gallery-full-page.tsx`, **dòng 195**.

Từ:
```tsx
        selectedJpgNames={fullSelectedJpgNames}
```
Thành:
```tsx
        heartedFiles={heartedFiles}
        clientSelectedFiles={clientSelectedFiles}
```

### Task 6 — `gallery-filter-modal.tsx`: props + hằng + state + danh sách hiệu lực
File `components/contracts/gallery/gallery-filter-modal.tsx`, **dòng 3** (import React hooks).

Từ:
```tsx
import { useState, useEffect } from "react";
```
Thành:
```tsx
import { useState, useEffect, useMemo } from "react";
```

**Dòng 14-15** (sau import `GalleryFilterDriveTab`, trước `interface`), thêm:

```tsx
import type { GalleryFilterFile, GalleryFilterMode } from "@/types/gallery";

const FILTER_MODE_OPTIONS: { value: GalleryFilterMode; label: string }[] = [
  { value: "selected", label: "Ảnh khách chọn" },
  { value: "hearted", label: "Ảnh yêu thích (thả tim)" },
  { value: "both", label: "Cả hai (khách chọn + thả tim)" },
];

const FILTER_MODE_LABELS: Record<GalleryFilterMode, string> = {
  selected: "khách chọn",
  hearted: "khách thả tim",
  both: "khách chọn hoặc thả tim",
};
```

**Dòng 16-23** (interface props). Từ:
```tsx
interface GalleryFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedJpgNames: string[];
  contractId: string;
  galleryId: string | null;
  defaultTab?: "drive" | "local" | "export";
}
```
Thành:
```tsx
interface GalleryFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  heartedFiles: GalleryFilterFile[];
  clientSelectedFiles: GalleryFilterFile[];
  contractId: string;
  galleryId: string | null;
  defaultTab?: "drive" | "local" | "export";
}
```

**Dòng 25-32** (destructuring). Từ:
```tsx
export default function GalleryFilterModal({
  isOpen,
  onClose,
  selectedJpgNames,
  contractId,
  galleryId,
  defaultTab = "local",
}: GalleryFilterModalProps) {
```
Thành:
```tsx
export default function GalleryFilterModal({
  isOpen,
  onClose,
  heartedFiles,
  clientSelectedFiles,
  contractId,
  galleryId,
  defaultTab = "local",
}: GalleryFilterModalProps) {
```

**Dòng 58** (`const totalSelected = ...`). Từ:
```tsx
  const totalSelected = selectedJpgNames.length;
```
Thành:
```tsx
  const [filterMode, setFilterMode] = useState<GalleryFilterMode>("selected");

  // Danh sách file hiệu lực theo chế độ đang chọn. Khử trùng theo imageId vì 1 ảnh
  // có thể vừa được khách chọn vừa được thả tim — nếu không, chế độ "Cả hai" sẽ
  // đếm đôi và copy đôi.
  const selectedJpgNames = useMemo(() => {
    const source =
      filterMode === "hearted"
        ? heartedFiles
        : filterMode === "selected"
          ? clientSelectedFiles
          : [...clientSelectedFiles, ...heartedFiles];

    const seen = new Set<string>();
    const names: string[] = [];
    for (const file of source) {
      if (seen.has(file.imageId)) continue;
      seen.add(file.imageId);
      if (!file.fileName || !/\.(jpe?g)$/i.test(file.fileName)) continue;
      names.push(file.fileName);
    }
    return names;
  }, [filterMode, heartedFiles, clientSelectedFiles]);

  const totalSelected = selectedJpgNames.length;
```

> Giữ nguyên tên biến `selectedJpgNames` để **không phải sửa** 4 chỗ dùng nó ở tab Local (dòng 83, 115, 133) và Export Pack (dòng 349) — thay đổi tối thiểu, ý nghĩa vẫn đúng ("tên các file JPG đang được lọc").

### Task 7 — `gallery-filter-modal.tsx`: nhóm radio dùng chung + mô tả theo chế độ
File `components/contracts/gallery/gallery-filter-modal.tsx`, **dòng 156** (prop `description` của `UnifiedModal`).

Từ:
```tsx
      description={`Có tổng cộng ${totalSelected} file JPG được chọn. Chọn phương thức lọc dưới đây.`}
```
Thành:
```tsx
      description={`Có tổng cộng ${totalSelected} file JPG ${FILTER_MODE_LABELS[filterMode]}. Chọn phương thức lọc dưới đây.`}
```

**Dòng 159-169** — ngay SAU khối `<TabsFilter ... />` (tức chèn giữa `/>` của TabsFilter và `<div className="p-1 max-h-[50vh] overflow-y-auto">`), thêm:

```tsx
        {/* Nguồn ảnh — áp cho CẢ 3 tab. Trước đây khối radio này nằm trong tab Drive
            và là UI chết: không state, không onChange, handleCopyDrive không đọc. */}
        <div className="space-y-3">
          <h4 className="text-body-sm font-semibold text-text-primary">Vui lòng chọn mục bạn muốn lọc</h4>
          <div className="space-y-3">
            {FILTER_MODE_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center gap-3 cursor-pointer">
                <Radio
                  name="filterMode"
                  value={option.value}
                  checked={filterMode === option.value}
                  onChange={() => setFilterMode(option.value)}
                  disabled={isCopying}
                />
                <span className="text-body-sm text-text-primary">{option.label}</span>
              </label>
            ))}
            <label className="flex items-center gap-3 cursor-not-allowed opacity-50">
              <Radio name="filterMode" disabled />
              <span className="text-body-sm text-text-primary">Ảnh có bình luận</span>
            </label>
            <label className="flex items-center gap-3 cursor-not-allowed opacity-50">
              <Radio name="filterMode" disabled />
              <span className="text-body-sm text-text-primary">Ảnh có tag</span>
            </label>
          </div>
        </div>
```

> `Radio` đã được import sẵn ở dòng 9 của file này (hiện đang **không** dùng — thành ra import chết; task này làm nó sống lại).

### Task 8 — `gallery-filter-drive-tab.tsx`: bỏ radio chết, nhận + gửi chế độ
File `components/contracts/gallery/tabs/gallery-filter-drive-tab.tsx`.

**8a. Dòng 1-13** (import + props). Từ:
```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Radio } from "@/components/ui/radio";
import { initDriveCopyJob, processDriveCopyChunk, finalizeDriveCopyJob } from "@/app/actions/gallery-drive-actions";
import { toast } from "sonner";

interface GalleryFilterDriveTabProps {
  totalSelected: number;
  galleryId: string | null;
  contractId: string;
  contractName: string;
}
```
Thành:
```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initDriveCopyJob, processDriveCopyChunk, finalizeDriveCopyJob } from "@/app/actions/gallery-drive-actions";
import { toast } from "sonner";
import type { GalleryFilterMode } from "@/types/gallery";

interface GalleryFilterDriveTabProps {
  totalSelected: number;
  galleryId: string | null;
  contractId: string;
  contractName: string;
  filterMode: GalleryFilterMode;
}
```

**8b. Dòng 15-20** (destructuring). Từ:
```tsx
export function GalleryFilterDriveTab({
  totalSelected,
  galleryId,
  contractId,
  contractName,
}: GalleryFilterDriveTabProps) {
```
Thành:
```tsx
export function GalleryFilterDriveTab({
  totalSelected,
  galleryId,
  contractId,
  contractName,
  filterMode,
}: GalleryFilterDriveTabProps) {
```

**8c. Dòng 36** (gọi action). Từ:
```tsx
      const initRes = await initDriveCopyJob(galleryId, contractId, driveFolderName);
```
Thành:
```tsx
      const initRes = await initDriveCopyJob(galleryId, contractId, driveFolderName, filterMode);
```

**8d. Dòng 133-149** — **XOÁ** cả khối radio cũ (từ `<div className="space-y-4">` chứa `<h4>Vui lòng chọn mục bạn muốn lọc</h4>` đến `</div>` đóng khối đó), vì đã chuyển lên modal ở Task 7. Khối cần xoá:
```tsx
      <div className="space-y-4">
        <h4 className="text-body-sm font-semibold text-text-primary">Vui lòng chọn mục bạn muốn lọc</h4>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <Radio name="filterType" defaultChecked />
            <span className="text-body-sm text-text-primary">Ảnh yêu thích</span>
          </label>
          <label className="flex items-center gap-3 cursor-not-allowed opacity-50">
            <Radio name="filterType" disabled />
            <span className="text-body-sm text-text-primary">Ảnh có bình luận</span>
          </label>
          <label className="flex items-center gap-3 cursor-not-allowed opacity-50">
            <Radio name="filterType" disabled />
            <span className="text-body-sm text-text-primary">Ảnh có tag</span>
          </label>
        </div>
      </div>
```

**8e.** Trong `gallery-filter-modal.tsx` **dòng 303-308**, truyền prop mới cho tab Drive. Từ:
```tsx
            <GalleryFilterDriveTab
              totalSelected={totalSelected}
              galleryId={galleryId}
              contractId={contractId}
              contractName={contractId}
            />
```
Thành:
```tsx
            <GalleryFilterDriveTab
              totalSelected={totalSelected}
              galleryId={galleryId}
              contractId={contractId}
              contractName={contractId}
              filterMode={filterMode}
            />
```

### Task 9 — `gallery-drive-actions.ts`: query theo chế độ + lọc `drive_file_id`
File `app/actions/gallery-drive-actions.ts`.

**9a.** Thêm import type — đặt ngay dưới dòng `import { requireContractAccess, withAuth } from "@/lib/auth_utils";` (dòng 3):
```ts
import type { GalleryFilterMode } from "@/types/gallery";
```

**9b. Dòng 232** (chữ ký). Từ:
```ts
export async function initDriveCopyJob(galleryId: string, contractId: string, destFolderName: string) {
```
Thành:
```ts
export async function initDriveCopyJob(
  galleryId: string,
  contractId: string,
  destFolderName: string,
  filterMode: GalleryFilterMode = "both",
) {
```

**9c. Dòng 272-301** (khối query ảnh + lọc JPG). Từ:
```ts
    const { data: heartReactions, error: reactionsError } = await supabase
      .from("gallery_reactions")
      .select("image_id")
      .eq("gallery_id", galleryId)
      .eq("reaction_type", "heart");

    if (reactionsError) throw new Error("Failed to load hearted images");

    const reactionHeartedIds = (heartReactions || []).map((row) => row.image_id).filter(Boolean);

    const { data: images, error: imagesError } = await supabase
      .from("gallery_images")
      .select("id, drive_file_id, file_name, sort_order, created_at, is_selected")
      .eq("gallery_id", galleryId)
      .or(`is_selected.eq.true,id.in.(${reactionHeartedIds.length > 0 ? reactionHeartedIds.join(",") : "00000000-0000-0000-0000-000000000000"})`)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (imagesError) throw new Error("Failed to load hearted gallery images");
    if (!images || images.length === 0) return { error: "No hearted images found" };
    // Filter JPG/JPEG files (case-insensitive).
    const jpgImages = images.filter((img) => {
      if (!img.file_name) return false;
      const lower = img.file_name.toLowerCase();
      return lower.endsWith(".jpg") || lower.endsWith(".jpeg");
    });

    if (jpgImages.length === 0) {
      return { error: "Không tìm thấy file định dạng JPG/JPEG trong các ảnh khách đã chọn" };
    }
```
Thành:
```ts
    // filterMode quyết định nguồn ảnh — PHẢI khớp với danh sách client đang hiển thị
    // trong modal, nếu không số đếm trên UI sẽ lệch với số file thật sự copy.
    const NO_MATCH_UUID = "00000000-0000-0000-0000-000000000000";
    let reactionHeartedIds: string[] = [];

    if (filterMode !== "selected") {
      const { data: heartReactions, error: reactionsError } = await supabase
        .from("gallery_reactions")
        .select("image_id")
        .eq("gallery_id", galleryId)
        .eq("reaction_type", "heart");

      if (reactionsError) throw new Error("Failed to load hearted images");

      reactionHeartedIds = (heartReactions || []).map((row) => row.image_id).filter(Boolean);
    }

    const heartedIdList = reactionHeartedIds.length > 0 ? reactionHeartedIds.join(",") : NO_MATCH_UUID;

    let imagesQuery = supabase
      .from("gallery_images")
      .select("id, drive_file_id, file_name, sort_order, created_at, is_selected")
      .eq("gallery_id", galleryId);

    if (filterMode === "selected") {
      imagesQuery = imagesQuery.eq("is_selected", true);
    } else if (filterMode === "hearted") {
      imagesQuery = imagesQuery.in("id", reactionHeartedIds.length > 0 ? reactionHeartedIds : [NO_MATCH_UUID]);
    } else {
      imagesQuery = imagesQuery.or(`is_selected.eq.true,id.in.(${heartedIdList})`);
    }

    const { data: images, error: imagesError } = await imagesQuery
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (imagesError) throw new Error("Failed to load gallery images");
    if (!images || images.length === 0) return { error: "Không có ảnh nào khớp mục đã chọn" };
    // Chỉ giữ JPG/JPEG (không phân biệt hoa thường) và ảnh CÓ drive_file_id — ảnh
    // thiếu drive_file_id chắc chắn fail khi tạo shortcut và làm phồng total_count.
    const jpgImages = images.filter((img) => {
      if (!img.file_name || !img.drive_file_id) return false;
      const lower = img.file_name.toLowerCase();
      return lower.endsWith(".jpg") || lower.endsWith(".jpeg");
    });

    if (jpgImages.length === 0) {
      return { error: "Không tìm thấy file định dạng JPG/JPEG trong các ảnh khớp mục đã chọn" };
    }
```

**KHÔNG** đổi gì khác trong file: giữ nguyên `findOrCreateDriveFolder`, khối insert `gallery_filter_jobs`, `processDriveCopyChunk`, `finalizeDriveCopyJob`.

## 5. Cách verify

1. `npx eslint types/gallery.ts components/contracts/gallery/gallery-full-page.tsx components/contracts/gallery/gallery-filter-modal.tsx components/contracts/gallery/tabs/gallery-filter-drive-tab.tsx app/actions/gallery-drive-actions.ts` → exit 0 (luật: exit ≠ 0 là KHÔNG push).
2. `npm run build` → exit 0. Build là cổng TypeScript: đổi chữ ký `initDriveCopyJob` và đổi props modal sai chỗ nào sẽ đỏ ở đây.
3. **Render thật** bằng chrome-devtools trên gallery của hợp đồng đang có 163 khách chọn / 159 thả tim (URL user đang mở lúc báo lỗi), viewport 1024x900x1:
   - Mở modal Lọc ảnh → mặc định radio **"Ảnh khách chọn"**, dòng mô tả phải đọc `Có tổng cộng 163 file JPG khách chọn` (bằng đúng chip "163 Khách chọn", trừ đi ảnh không phải JPG hoặc thiếu `drive_file_id` — nếu lệch thì ghi lại số lệch và **báo user**, đừng tự sửa số).
   - Bấm **"Ảnh yêu thích (thả tim)"** → số phải đổi thành **159** (khớp chip "159 Thả tim").
   - Bấm **"Cả hai"** → số phải **≥ 163** và **≤ 163 + 159 = 322**; ghi lại con số thật vào phần result của task.
   - Đổi qua cả 3 tab (Copy tại Local / Google Drive / Export Pack) → nhóm radio vẫn hiện, lựa chọn **không bị reset**.
4. Đo bằng script trong console để chắc số hiển thị = số phần tử danh sách, không phải chữ tĩnh:
   ```js
   document.querySelector('[role="dialog"]')?.textContent.match(/Có tổng cộng \d+ file JPG [^.]+/)?.[0]
   ```
   Chạy lại sau mỗi lần đổi radio, xác nhận chuỗi đổi theo.
5. **Chạy copy Drive thật: KHÔNG tự chạy.** Tạo thư mục + shortcut trên Drive thật của khách là hành động khó lùi. Sau khi 1-4 xanh, báo user tự bấm "Bắt đầu lọc" 1 lần với chế độ "Ảnh khách chọn" trên 1 gallery test, rồi đối chiếu số file trong thư mục Drive với số hiển thị.

## 6. Ràng buộc / cạm bẫy phải giữ

- **Chọn và Tim là 2 hệ độc lập** (quy ước đã chốt) — union CHỈ được xảy ra khi người dùng chủ động chọn "Cả hai". Cấm gộp ngầm ở bất kỳ đường nào khác.
- **Khử trùng theo `imageId`, không theo `fileName`** — 2 ảnh khác nhau có thể trùng tên file giữa các thư mục.
- Số hiển thị và số server copy phải cùng một predicate: client lọc `drive_file_id` (trong fetcher) + đuôi JPG (trong modal); server sau Task 9c cũng lọc cả hai. Đổi một bên mà quên bên kia = tái sinh đúng cái bug này.
- **Không đụng** `getAllHeartedImagesForAction` / `getAllSelectedImagesForAction` / `use-gallery-data.ts` — đang được `gallery-toolbar.tsx` dùng chung cho nút Tải xuống. Ngoài locks.
- Giữ style file hiện có (2 space, chuỗi tiếng Việt trực tiếp trong JSX, không format lại cả file).
- Không xoá 2 dòng radio "Ảnh có bình luận" / "Ảnh có tag" — giữ disabled như hiện tại (roadmap user biết).

## 7. Câu hỏi mở / rủi ro

- **Mặc định = "Ảnh khách chọn"** là quyết định của mình, chưa hỏi user: modal tên là "Lọc & Copy Ảnh Đã Chọn" và `is_selected` là danh sách chính thức để giao hậu kỳ. Hệ quả: **hành vi mặc định đổi so với hiện tại** (đang là union ở tab Drive, chỉ-tim ở 2 tab kia). Nếu user muốn giữ "Ảnh yêu thích" làm mặc định thì sửa đúng 1 chỗ: `useState<GalleryFilterMode>("selected")` → `"hearted"` (Task 6).
- **Chưa đo union thật.** Chưa query DB nên chưa biết bao nhiêu ảnh vừa-chọn-vừa-tim. Bước verify 3 sẽ ra con số này.
- **Chưa chạy copy Drive thật** trong quy trình verify (xem §5.5) — phần server chỉ được che bởi build + đọc code. Rủi ro còn lại: cú pháp `.or()`/`.in()` của PostgREST sai ở nhánh mới. Giảm rủi ro bằng cách verify số đếm client trước, và chạy thử trên gallery test chứ không phải gallery khách thật.
- **"Ảnh có bình luận" làm được nhưng không nằm trong task này** — dữ liệu có sẵn ở `gallery_comments`. **"Ảnh có tag" thì chưa có mô hình dữ liệu** (`gallery_images` không có cột tag) → muốn làm phải mở task riêng có migration.
