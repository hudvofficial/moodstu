# T-20260716-mobile-download-ux — Khách mất ảnh khi tải + ZIP sập điện thoại

**Owner:** Codex · **Spec:** Claude · **Status:** APPROVED (user duyệt 16/07)
**Locks (3 file):**
- `app/actions/gallery-selection-actions.ts` (chỉ **THÊM** 1 hàm + 1 import)
- `components/gallery/public-gallery-client.tsx` (chỉ nguồn `selectedImages`)
- `components/gallery/selection-summary.tsx` (chỉ `handleBatchDownload` + detect platform)

---

## ⛔ RÀNG BUỘC SỐ 1 — BĂNG THÔNG VERCEL (user đã sập prod 1 lần)

**TUYỆT ĐỐI KHÔNG cho byte ảnh đi qua server.** Ảnh phải tiếp tục đi thẳng `browser ↔ lh3.googleusercontent.com`.

| Được phép | CẤM |
|---|---|
| Server action trả **JSON metadata** (id, file_name, drive_file_id) — vài KB, trang đang làm vậy rồi | ❌ Proxy/stream/redirect byte ảnh qua route |
| Client `fetch` thẳng `lh3.googleusercontent.com` | ❌ Zip ở server |
| | ❌ Resize/xử lý ảnh ở server |

Task này **không thêm route mới, không đụng route `/api/gallery-download*`**. Nếu Codex thấy mình sắp truyền byte ảnh qua server → **DỪNG, báo lại**.

---

## Bối cảnh — 3 lỗi đo được trên prod (album `jjay1sJ9hhPq`, 585 ảnh)

### Lỗi 1 — Khách chọn 9 ảnh, nút chỉ tải 5 (mất 4 ảnh, im lặng) 🔴
**Đã chứng minh bằng thực nghiệm:**

| Ảnh đã cuộn/load | Nút hiện |
|---|---|
| 200 (vừa mở album) | **"Tải 5 ảnh"** |
| 585 (cuộn hết) | **"Tải 9 ảnh"** |

Nguyên nhân [public-gallery-client.tsx:420](components/gallery/public-gallery-client.tsx#L420): `selectedImages={images.filter((i) => i.is_selected)}` — lọc từ **ảnh đã load ở client**, trong khi `selectedCount` (chữ "Đã chọn 9") lấy từ **server**. Ảnh đã chọn nằm ở trang chưa load thì bị bỏ rơi.

### Lỗi 2 — ZIP dựng trong RAM trình duyệt → sập iPhone 🔴
[selection-summary.tsx:82-110](components/gallery/selection-summary.tsx#L82): JSZip nạp toàn bộ ảnh vào RAM. **Đo thật: 1 ảnh gốc = 15,54 MB.** Giới hạn client là 50 ảnh → **775 MB**, cộng bản sao lúc `zip.generateAsync` → **~1,5 GB**. Safari iOS giết tab ở ~200–400 MB → sập, mất trắng, không error handler nào bắt được.

> **Chuẩn ngành (Pixieset — nghiên cứu 16/07):** trên mobile họ **zip ở SERVER** rồi gửi link, và khuyên khách *"tải cả loạt thì dùng máy tính"*. Ta **không zip server được** (ràng buộc băng thông) → **user chốt: mobile chọn nhiều → hiện thông báo gợi ý dùng máy tính.**

### Lỗi 3 — `window.open` gọi SAU `await` → iOS chặn popup, báo thành công giả 🟠
[selection-summary.tsx:128→132](components/gallery/selection-summary.tsx#L128): `await fetch(url)` **rồi mới** `window.open(data.url)`. iOS Safari huỷ "user gesture" sau await → popup bị chặn → khách không thấy gì.

**Lời giải ĐÃ CÓ trong repo:** [image-viewer.tsx:325-341](components/gallery/image-viewer.tsx#L325) làm ĐÚNG — mở tab rỗng **TRƯỚC** khi await:
```ts
    if (detectIOS()) {
      const tab = window.open("", "_blank");   // ← mở TRƯỚC, gesture còn nguyên
      try {
        const response = await fetch(`/api/gallery-download/${accessToken}/${img.id}`);
        ...
        if (tab && data.url) { tab.location.href = data.url; }
```
→ **Task 3 = đồng bộ `selection-summary` về đúng cách `image-viewer` đang làm.** Không phát minh gì mới.

---

## Task 1 — Thêm `getPublicSelectedImages` (JSON metadata, KHÔNG byte ảnh)

File `app/actions/gallery-selection-actions.ts`.

### 1a. Sửa import ([dòng 15](app/actions/gallery-selection-actions.ts#L15)) — thêm `requirePublicGalleryAccess`:
```ts
import { requirePublicGalleryAccess, requirePublicGalleryImageAccess, updateGalleryImageSelection, fetchGalleryImageCount } from "./gallery-core";
```

### 1b. THÊM hàm mới ngay SAU `getSelectedImages` (kết thúc ở [dòng 156](app/actions/gallery-selection-actions.ts#L156)):
```ts
/**
 * Ảnh khách đã CHỌN của cả gallery — bản public (khách không login).
 * Bản admin `getSelectedImages` ở trên khoá withAuth nên trang khách gọi không được.
 * CHỈ trả JSON metadata (id/tên/drive_file_id) — KHÔNG truyền byte ảnh qua server.
 */
export async function getPublicSelectedImages(
  galleryId: string,
  accessUrl: string,
  accessToken: string,
) {
  try {
    if (!accessUrl?.trim() || !accessToken?.trim()) return [];
    const supabase = await createAdminClient();
    // Chấp nhận view-token (album có pass) LẪN token đầy đủ (album không pass) — xem toggleReaction.
    try {
      await requirePublicGalleryAccess(supabase, accessUrl.trim(), accessToken.trim(), galleryId, "view");
    } catch {
      await requirePublicGalleryAccess(supabase, accessUrl.trim(), accessToken.trim(), galleryId);
    }
    const { data, error } = await supabase
      .from("gallery_images")
      .select("id, file_name, drive_file_id, client_note")
      .eq("gallery_id", galleryId)
      .eq("is_selected", true)
      .order("sort_order", { ascending: true });
    if (error) return [];
    return data || [];
  } catch (error) {
    console.error("getPublicSelectedImages error:", error);
    return [];
  }
}
```
> Cột `client_note` giữ trong select để `notedCount` (chip 💬 thanh đáy) **không đổi hành vi**. *(Ghi nhận: chip đó đọc cột cũ nên chỉ đếm ghi chú legacy — sót của d45ea00, **KHÔNG sửa ở task này**.)*
> **KHÔNG động** `getSelectedImages` (admin) — để nguyên.

---

## Task 2 — Lấy `selectedImages` từ server

File `components/gallery/public-gallery-client.tsx`.

### 2a. Import ([dòng 10](components/gallery/public-gallery-client.tsx#L10)):
```ts
import { getPublicSelectedImages, toggleImageSelection } from "@/app/actions/gallery-selection-actions";
```

### 2b. Thêm SWR ngay SAU khối stats (sau [dòng 138](components/gallery/public-gallery-client.tsx#L138), TRƯỚC dòng `const selectedCount = ...`):
```ts
  // SWR: ẢNH ĐÃ CHỌN của CẢ gallery (server) — KHÔNG lọc từ ảnh đã load,
  // vì khách chưa cuộn hết thì thiếu ảnh → nút "Tải N" báo sai và tải sót.
  const { data: selectedImages = [], mutate: mutateSelectedImages } = useSWR(
    gallery.id && accessUrl && accessToken ? `gallery-selected-${gallery.id}` : null,
    () => getPublicSelectedImages(gallery.id, accessUrl, accessToken),
    { fallbackData: [] },
  );
```

### 2c. Nạp lại sau khi chọn/bỏ chọn thành công — sửa [dòng 254-257](components/gallery/public-gallery-client.tsx#L254):
```ts
      } else if (res.newSelectedCount !== undefined) {
        // Sync with exact server count
        mutateStats((prev) => ({ imageCount: totalImageCount, ...prev, selectedCount: res.newSelectedCount }), false);
        void mutateSelectedImages();
      }
```

### 2d. Thêm `mutateSelectedImages` vào deps của `useCallback` ([dòng 261](components/gallery/public-gallery-client.tsx#L261)):
```ts
    [accessToken, accessUrl, images, isViewOnly, selectedCount, totalImageCount, mutateStats, mutateSelectedImages, gallery.needsPassword, clientCapability],
```

### 2e. Truyền xuống SelectionSummary — sửa [dòng 420](components/gallery/public-gallery-client.tsx#L420):
```ts
          selectedImages={selectedImages}
```
*(bỏ `images.filter((i) => i.is_selected)`)*

---

## Task 3 — Bỏ ZIP trên mobile + sửa popup bị chặn

File `components/gallery/selection-summary.tsx`.

### 3a. Import `detectPlatform`, XOÁ hàm `detectIOS` cục bộ ([dòng 45-52](components/gallery/selection-summary.tsx#L45)):
Thêm vào cụm import đầu file:
```ts
import { detectPlatform } from "@/lib/detect-platform";
```
Xoá trọn khối:
```ts
  // iOS device detection (iPad/iPhone/iPod + iPad Pro desktop mode)
  const detectIOS = (): boolean => { ... };
```
> `lib/detect-platform.ts` đã tồn tại sẵn (`"ios-safari" | "ios-webview" | "android" | "desktop"`), nhận diện được cả webview Zalo/FB. Đang là dead code — task này dùng lại đúng mục đích header của nó ghi.

### 3b. Sửa đầu `handleBatchDownload` ([dòng 55-66](components/gallery/selection-summary.tsx#L55)) — thay:
```ts
    if (downloadableImages.length > 50) {
      toast.error(`Vui lòng tải tối đa 50 ảnh mỗi lần. Bạn đang chọn ${downloadableImages.length} ảnh.`);
      return;
    }

    setDownloading(true);
    const isIOS = detectIOS();

    if (downloadableImages.length > 1) {
```
bằng:
```ts
    const platform = detectPlatform();
    const isIOS = platform === "ios-safari" || platform === "ios-webview";
    const isMobile = platform !== "desktop";

    // MOBILE + nhiều ảnh: KHÔNG zip. JSZip nạp ảnh gốc (15,5MB/ảnh) vào RAM →
    // 50 ảnh ~1,5GB → Safari giết tab. Chuẩn ngành (Pixieset): khuyên dùng máy tính.
    if (isMobile && downloadableImages.length > 1) {
      toast.info(
        `Điện thoại chỉ tải được từng ảnh. Mở album trên máy tính để tải cả ${downloadableImages.length} ảnh, hoặc mở từng ảnh rồi nhấn giữ để lưu.`,
        { duration: 7000 },
      );
      return;
    }

    if (downloadableImages.length > 50) {
      toast.error(`Vui lòng tải tối đa 50 ảnh mỗi lần. Bạn đang chọn ${downloadableImages.length} ảnh.`);
      return;
    }

    setDownloading(true);

    if (downloadableImages.length > 1) {
```
> Sau đổi này nhánh ZIP **chỉ còn chạy trên desktop** → giữ nguyên toàn bộ code ZIP bên trong, KHÔNG sửa.

### 3c. Sửa nhánh tải 1 ảnh trên iOS — thay [dòng 125-144](components/gallery/selection-summary.tsx#L125):
```ts
      if (isIOS) {
        const toastId = toast.loading("Đang chuẩn bị ảnh...");
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = await response.json();
          if (!data.url) throw new Error("No direct URL returned");
          window.open(data.url, "_blank", "noopener,noreferrer");
          toast.info('Nhấn giữ ảnh → chọn "Lưu hình ảnh"', {
            id: toastId,
            duration: 5000,
          });
        } catch (error) {
          console.error("[selection-download][ios] Error:", error);
          toast.error("Không chuẩn bị được ảnh tải xuống. Vui lòng thử lại.", { id: toastId });
        } finally {
          setDownloading(false);
        }
        return;
      }
```
bằng (mở tab RỖNG trước khi await — copy đúng cách image-viewer.tsx:326 làm):
```ts
      if (isIOS) {
        // PHẢI mở tab TRƯỚC khi await: iOS Safari huỷ user-gesture sau await → popup bị chặn.
        // Giống image-viewer.tsx:326. KHÔNG đảo thứ tự 2 dòng này.
        const tab = window.open("", "_blank");
        const toastId = toast.loading("Đang chuẩn bị ảnh...");
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = await response.json();
          if (!data.url) throw new Error("No direct URL returned");
          if (!tab) throw new Error("Popup bị chặn");
          tab.location.href = data.url;
          toast.info('Nhấn giữ ảnh → chọn "Lưu hình ảnh"', {
            id: toastId,
            duration: 5000,
          });
        } catch (error) {
          console.error("[selection-download][ios] Error:", error);
          tab?.close();
          toast.error("Không chuẩn bị được ảnh tải xuống. Vui lòng thử lại.", { id: toastId });
        } finally {
          setDownloading(false);
        }
        return;
      }
```
> Khác bản cũ: (1) `window.open` chuyển lên TRƯỚC `await`; (2) `tab.location.href` thay vì mở URL trực tiếp; (3) popup bị chặn → **báo lỗi thật**, không còn toast thành công giả.

**KHÔNG động** nhánh non-iOS ([dòng 146-181](components/gallery/selection-summary.tsx#L146)) và nhánh ZIP.

---

## Bảng hành vi sau khi sửa

| Thiết bị | Số ảnh chọn | Hành vi |
|---|---|---|
| Mobile (iOS/Android/webview) | **> 1** | Toast gợi ý dùng máy tính. **Không zip, không sập.** |
| iOS | 1 | Mở tab ảnh gốc → nhấn giữ lưu (**chuẩn Pixieset**) |
| Android | 1 | Tải blob như cũ |
| Desktop | > 1 | **ZIP giữ nguyên** |
| Desktop | 1 | Blob như cũ |
| Mọi thiết bị | — | Nút hiện **đúng số ảnh đã chọn** (từ server) |

---

## Verify (Codex tự chạy — KHÔNG tin "should work")
1. `npx eslint app/actions/gallery-selection-actions.ts components/gallery/public-gallery-client.tsx components/gallery/selection-summary.tsx` → **0 lỗi, 0 warning** (chú ý deps array của useCallback — tiền lệ đã dính 1 lần).
2. `npm run build` → **PASS** (tự chạy — Codex từng báo pass sai 2/2 lần).
3. Báo diff từng file + kết quả. **KHÔNG commit, KHÔNG push.**

## Verify sau (Claude, trên prod)
- **Lỗi 1:** mở album `jjay1sJ9hhPq` ở viewport phone, **không cuộn** → nút phải hiện ngay **"Tải 9 ảnh"** (trước fix: "Tải 5 ảnh"); cuộn hết vẫn 9.
- **Lỗi 2:** viewport phone + >1 ảnh chọn → bấm tải → **hiện toast gợi ý máy tính, KHÔNG tải ZIP**.
- **Lỗi 3:** đọc code đã deploy xác nhận `window.open` đứng TRƯỚC `await`. *(Popup thật trên iPhone cần user test — mình không có iPhone thật.)*
- **Băng thông:** Network không có request byte ảnh nào đi qua `stu.moodwedding.com` — ảnh vẫn từ `lh3.googleusercontent.com`.

## Ràng buộc
- Chỉ 3 file trong locks. KHÔNG đụng route `/api/*`, `lib/gallery-download.ts`, `image-viewer.tsx`, `download-manager.tsx` (admin).
- KHÔNG sửa cổng thanh toán (user chốt: không có nhu cầu).
- Match style hiện có (toast sonner, comment tiếng Việt).
