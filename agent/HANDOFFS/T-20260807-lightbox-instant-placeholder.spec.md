# HANDOFF — T-20260807-lightbox-instant-placeholder — claude → claude (fallback, user duyệt)

- **Task:** T-20260807-lightbox-instant-placeholder — Mở ảnh bị "chớp" (khung đen 0,3–2,3s rồi ảnh mới bung): hiện ngay ảnh lưới =s600 đã có trong cache + hoãn nạp bản gốc =s0
- **Từ → Đến:** claude → claude (user chốt tự code, không qua Codex)
- **Branch / worktree:** làm thẳng trên `main` (2 file, cùng một cách sửa)
- **Locks (vùng độc quyền):**
  - `components/contracts/gallery/gallery-lightbox.tsx`
  - `components/gallery/image-viewer.tsx`
- **Ngày:** 2026-08-07

## 1. Mục tiêu bước này

Mở 1 ảnh trong lightbox phải **thấy ảnh ngay** (≤150ms) thay vì khung đen 0,3–2,3 giây, và bản gốc 19,4 MB **không được giành đường truyền** với bản đang cần hiển thị.

## 2. Đã làm / hiện trạng — root cause đã đo xong (prod, Chrome 1440×900)

### Triệu chứng user báo (2026-08-07)
Mở preview ảnh ở admin: "chớp rồi mới hiển thị". Đã hỏi lại, user xác nhận = **màn đen rồi ảnh mới bung ra** (không phải ảnh hiện rồi nháy).

### Số đo trên prod (gallery `hoaikha-thihiu`, 209 ảnh)

Mỗi lần mở 1 ảnh, trình duyệt tải **2 bản cùng lúc**, cả hai bắt đầu ở t≈106ms:

| Bản | Kích thước | Dung lượng | Thời gian tải |
|---|---|---|---|
| `=s2048` (bản hiển thị) | 1366×2048 | ~450 KB | 2100 ms |
| `=s0` (bản gốc, nạp ngầm) | 4730×7092 | **~19,4 MB** | 2507 ms |

Khung ảnh trên màn hình chỉ **540×810 px**.

Timeline đo bằng rAF từng frame, 3 lần mở khác nhau: thẻ `<img>` có `height=0` (không vẽ gì) trong **334ms / 1319ms / 2337ms** đầu, rồi ảnh mới hiện. Đây chính là "chớp".

Đo bổ sung để chọn cách sửa:
- Ảnh lưới `=s600` (đúng URL grid đang dùng): tải lại **0 ms, `transferSize` 0** → **đã nằm trong cache trình duyệt**, vẽ được ngay.
- Bản `=s2048` tải **một mình** (không có `=s0` song song): vẫn **1613 ms**.

⇒ Hoãn `=s0` thôi **không đủ** — vẫn đen ~1,6s. Thứ diệt triệu chứng là **hiện ngay bản =s600**. Hoãn `=s0` là phần phụ (bỏ tranh băng thông).

### Nguồn
Commit `2e4ea54` (admin, 24/07) và `48672c8` (gallery khách) thêm cơ chế nạp nền `=s0` để chuột-phải/nhấn-giữ "Lưu ảnh" ra file gốc. Comment trong code ghi *"hiện bản nhẹ trước nên tốc độ mở không đổi"* — **đo thực tế sai**: hai request chạy song song ngay từ đầu.

### Đã loại trừ
KHÔNG phải nháy do đổi src sang `=s0`: theo dõi từng frame quanh thời điểm đổi, chiều cao thẻ `<img>` giữ nguyên 810px, không frame nào về 0, `layout-shift` rỗng, CLS 0.00. Chrome giữ khung ảnh cũ tới khi bản mới giải mã xong.

### Quyết định user chốt (2026-08-07)
- **Giữ** tính năng lưu-ảnh-ra-gốc, chỉ **hoãn** nạp `=s0` tới sau khi ảnh xem đã hiện.
- Áp cho **cả admin lẫn gallery khách** (2 file, cùng bệnh).

### Dữ kiện kỹ thuật cần biết trước khi sửa
- Ô lưới (cả admin lẫn gallery khách — public dùng chung `gallery-image-grid.tsx` qua `gallery-image-grid-index.tsx`) dựng URL bằng `getResponsiveThumbnailUrl(image.thumbnail_url, image.image_url, 600)` ([gallery-image-grid.tsx:99-103](components/contracts/gallery/gallery-image-grid.tsx#L99-L103)). Gọi **đúng hàm, đúng tham số** trong viewer thì URL trùng khít → chắc chắn cache hit.
- `image-viewer.tsx` (public) đã có tiền lệ import chéo từ `@/components/contracts/gallery/gallery-helpers` (`public-gallery-client.tsx:12`).
- Chuỗi `sizes` `"(max-width: 768px) 100vw, 95vw"` hiện viết inline trong JSX ở cả 2 file; loader nền phải dùng **cùng chuỗi** thì trình duyệt mới chọn cùng candidate trong `srcSet` → mới cache hit khi gắn vào thẻ thật.

## 3. Files touched

1. `components/contracts/gallery/gallery-lightbox.tsx` — admin
2. `components/gallery/image-viewer.tsx` — gallery khách

Chạm ngoài 2 file này → DỪNG.

## 4. Bước tiếp cần làm — 8 task, chép nguyên văn

### Task 1 — admin: import helper lưới
File `components/contracts/gallery/gallery-lightbox.tsx`, **dòng 12**.

Từ:
```tsx
import { formatDate } from "@/lib/utils";
```
Thành:
```tsx
import { formatDate } from "@/lib/utils";
import { getResponsiveThumbnailUrl } from "./gallery-helpers";
```

### Task 2 — admin: hằng `sizes` dùng chung
File `components/contracts/gallery/gallery-lightbox.tsx`, ngay **trước** `function withThumbSize` (dòng 28), thêm:

```tsx
// Loader nền PHẢI dùng đúng chuỗi sizes của thẻ <img> thật, nếu không trình duyệt
// chọn candidate khác trong srcSet → tải 2 lần, gắn vào thẻ vẫn trắng.
const PREVIEW_SIZES = "(max-width: 768px) 100vw, 95vw";
```

### Task 3 — admin: ảnh chờ + nạp nền bản xem + hoãn bản gốc
File `components/contracts/gallery/gallery-lightbox.tsx`, **dòng 96-111** (khối comment + `fullState` + effect nạp `full`).

Từ:
```tsx
  // Nạp nền bản gốc (=s0) rồi thay vào <img>, để chuột-phải "Lưu ảnh"/nhấn giữ ra bản gốc.
  // Hiện bản nhẹ trước nên tốc độ mở không đổi. State gắn KHÓA theo url gốc thay vì
  // reset trong effect — tránh setState đồng bộ trong effect (react-hooks/set-state-in-effect).
  const [fullState, setFullState] = useState<{ key: string; ok: boolean } | null>(null);
  const needsUpgrade = Boolean(full && full !== src);
  const displaySrc = needsUpgrade && fullState?.key === full && fullState.ok ? full : src;

  useEffect(() => {
    if (!full || full === src) return;
    let cancelled = false;
    const loader = new window.Image();
    loader.onload = () => { if (!cancelled) setFullState({ key: full, ok: true }); };
    loader.onerror = () => { if (!cancelled) setFullState({ key: full, ok: false }); };
    loader.src = full;
    return () => { cancelled = true; loader.onload = null; loader.onerror = null; };
  }, [full, src]);
```
Thành:
```tsx
  // Ảnh chờ = ĐÚNG url ô lưới đang dùng (=s600) → đã nằm trong cache trình duyệt nên vẽ
  // ngay (đo prod: load 0ms, transferSize 0). Trước đây thẻ <img> trống 0,3–2,3s vì bản
  // =s2048 phải tải mới hoàn toàn — đó là cái "chớp" user thấy khi mở ảnh.
  const placeholder = useMemo(
    () => getResponsiveThumbnailUrl(img.thumbnail_url, img.image_url, 600),
    [img],
  );

  // Nạp nền bản xem rồi mới gắn vào thẻ — đổi src trực tiếp sẽ có khoảnh khắc thẻ rỗng.
  const [previewState, setPreviewState] = useState<{ key: string; ok: boolean } | null>(null);
  const previewReady = Boolean(src) && previewState?.key === src && previewState.ok;

  useEffect(() => {
    if (!src || src === placeholder) return;
    let cancelled = false;
    const loader = new window.Image();
    if (srcSet) {
      loader.sizes = PREVIEW_SIZES;
      loader.srcset = srcSet;
    }
    loader.onload = () => { if (!cancelled) setPreviewState({ key: src, ok: true }); };
    loader.onerror = () => { if (!cancelled) setPreviewState({ key: src, ok: false }); };
    loader.src = src;
    return () => { cancelled = true; loader.onload = null; loader.onerror = null; };
  }, [src, srcSet, placeholder]);

  // Nạp nền bản gốc (=s0) rồi thay vào <img>, để chuột-phải "Lưu ảnh"/nhấn giữ ra bản gốc.
  // HOÃN tới khi bản xem đã hiện: đo prod cho thấy bản gốc 19,4 MB chạy SONG SONG với bản
  // 450 KB ngay từ đầu và giành băng thông của nó. State gắn KHÓA theo url gốc thay vì
  // reset trong effect — tránh setState đồng bộ trong effect (react-hooks/set-state-in-effect).
  const [fullState, setFullState] = useState<{ key: string; ok: boolean } | null>(null);
  const needsUpgrade = Boolean(full && full !== src);
  const displaySrc = needsUpgrade && fullState?.key === full && fullState.ok
    ? full
    : previewReady ? src : placeholder;

  useEffect(() => {
    if (!full || full === src) return;
    if (!previewReady) return;
    let cancelled = false;
    const loader = new window.Image();
    loader.onload = () => { if (!cancelled) setFullState({ key: full, ok: true }); };
    loader.onerror = () => { if (!cancelled) setFullState({ key: full, ok: false }); };
    loader.src = full;
    return () => { cancelled = true; loader.onload = null; loader.onerror = null; };
  }, [full, src, previewReady]);
```

### Task 4 — admin: thẻ `<img>` chỉ gắn srcSet khi đang hiện bản xem
File `components/contracts/gallery/gallery-lightbox.tsx`, **dòng 357-359**.

Từ:
```tsx
        src={displaySrc}
        srcSet={displaySrc === full ? undefined : srcSet}
        sizes={displaySrc === full ? undefined : "(max-width: 768px) 100vw, 95vw"}
```
Thành:
```tsx
        src={displaySrc}
        srcSet={displaySrc === src ? srcSet : undefined}
        sizes={displaySrc === src ? PREVIEW_SIZES : undefined}
```

> Bắt buộc đảo điều kiện: nếu vẫn để `!== full` thì lúc hiện ảnh chờ (=s600) thẻ sẽ mang `srcSet` của bản 2048 → trình duyệt bỏ qua `src` và tải lại bản nặng, mất sạch tác dụng.

### Task 5 — khách: import helper lưới
File `components/gallery/image-viewer.tsx`, **dòng 14**.

Từ:
```tsx
import { getComments, type GalleryComment } from "@/app/actions/gallery-reaction-actions";
```
Thành:
```tsx
import { getComments, type GalleryComment } from "@/app/actions/gallery-reaction-actions";
import { getResponsiveThumbnailUrl } from "@/components/contracts/gallery/gallery-helpers";
```

### Task 6 — khách: hằng `sizes` dùng chung
File `components/gallery/image-viewer.tsx`, ngay **trước** `function withThumbSize` (dòng 37), thêm:

```tsx
// Loader nền PHẢI dùng đúng chuỗi sizes của thẻ <img> thật, nếu không trình duyệt
// chọn candidate khác trong srcSet → tải 2 lần, gắn vào thẻ vẫn trắng.
const PREVIEW_SIZES = "(max-width: 768px) 100vw, 95vw";
```

### Task 7 — khách: ảnh chờ + nạp nền bản xem + hoãn bản gốc
File `components/gallery/image-viewer.tsx`, **dòng 126-151**.

Từ:
```tsx
  // Nạp nền bản gốc (=s0) rồi thay vào thẻ <img>, để nhấn-giữ lưu được ảnh gốc.
  // Hiện bản nhẹ trước nên tốc độ mở ảnh không đổi; chỉ đổi thứ nằm trong <img> sau vài giây.
  // State gắn KHÓA theo url gốc (mỗi ảnh 1 url riêng) thay vì reset trong effect —
  // tránh setState đồng bộ trong effect (react-hooks/set-state-in-effect).
  const [fullState, setFullState] = useState<{ key: string; ok: boolean } | null>(null);
  const needsUpgrade = Boolean(full && full !== src);
  const fullSrc = needsUpgrade && fullState?.key === full && fullState.ok ? full : null;
  const loadingFull = needsUpgrade && fullState?.key !== full;

  useEffect(() => {
    if (!full || full === src) return;
    let cancelled = false;
    const loader = new window.Image();
    loader.onload = () => {
      if (!cancelled) setFullState({ key: full, ok: true });
    };
    loader.onerror = () => {
      if (!cancelled) setFullState({ key: full, ok: false });
    };
    loader.src = full;
    return () => {
      cancelled = true;
      loader.onload = null;
      loader.onerror = null;
    };
  }, [full, src]);
```
Thành:
```tsx
  // Ảnh chờ = ĐÚNG url ô lưới đang dùng (=s600) → đã nằm trong cache trình duyệt nên vẽ
  // ngay (đo prod: load 0ms, transferSize 0). Trước đây thẻ <img> trống 0,3–2,3s vì bản
  // =s2048 phải tải mới hoàn toàn — khách thấy màn đen rồi ảnh mới bung ra.
  const placeholder = useMemo(
    () => (img ? getResponsiveThumbnailUrl(img.thumbnail_url, img.image_url, 600) : ""),
    [img],
  );

  // Nạp nền bản xem rồi mới gắn vào thẻ — đổi src trực tiếp sẽ có khoảnh khắc thẻ rỗng.
  const [previewState, setPreviewState] = useState<{ key: string; ok: boolean } | null>(null);
  const previewReady = Boolean(src) && previewState?.key === src && previewState.ok;

  useEffect(() => {
    if (!src || src === placeholder) return;
    let cancelled = false;
    const loader = new window.Image();
    if (srcSet) {
      loader.sizes = PREVIEW_SIZES;
      loader.srcset = srcSet;
    }
    loader.onload = () => {
      if (!cancelled) setPreviewState({ key: src, ok: true });
    };
    loader.onerror = () => {
      if (!cancelled) setPreviewState({ key: src, ok: false });
    };
    loader.src = src;
    return () => {
      cancelled = true;
      loader.onload = null;
      loader.onerror = null;
    };
  }, [src, srcSet, placeholder]);

  // Nạp nền bản gốc (=s0) rồi thay vào thẻ <img>, để nhấn-giữ lưu được ảnh gốc.
  // HOÃN tới khi bản xem đã hiện: đo prod cho thấy bản gốc 19,4 MB chạy SONG SONG với bản
  // 450 KB ngay từ đầu và giành băng thông của nó — khách 4G lãnh đủ.
  // State gắn KHÓA theo url gốc (mỗi ảnh 1 url riêng) thay vì reset trong effect —
  // tránh setState đồng bộ trong effect (react-hooks/set-state-in-effect).
  const [fullState, setFullState] = useState<{ key: string; ok: boolean } | null>(null);
  const needsUpgrade = Boolean(full && full !== src);
  const fullSrc = needsUpgrade && fullState?.key === full && fullState.ok ? full : null;
  const loadingFull = needsUpgrade && fullState?.key !== full;

  useEffect(() => {
    if (!full || full === src) return;
    if (!previewReady) return;
    let cancelled = false;
    const loader = new window.Image();
    loader.onload = () => {
      if (!cancelled) setFullState({ key: full, ok: true });
    };
    loader.onerror = () => {
      if (!cancelled) setFullState({ key: full, ok: false });
    };
    loader.src = full;
    return () => {
      cancelled = true;
      loader.onload = null;
      loader.onerror = null;
    };
  }, [full, src, previewReady]);
```

### Task 8 — khách: thẻ `<img>` chỉ gắn srcSet khi đang hiện bản xem
File `components/gallery/image-viewer.tsx`, **dòng 580-583**.

Từ:
```tsx
        src={fullSrc || src}
        srcSet={fullSrc ? undefined : srcSet}
        sizes={fullSrc ? undefined : "(max-width: 768px) 100vw, 95vw"}
```
Thành:
```tsx
        src={fullSrc || (previewReady ? src : placeholder)}
        srcSet={!fullSrc && previewReady ? srcSet : undefined}
        sizes={!fullSrc && previewReady ? PREVIEW_SIZES : undefined}
```

**KHÔNG** đổi gì khác ở 2 file: giữ nguyên prefetch prev/next, xử lý nhấn-giữ/`WebkitTouchCallout`, chỉ báo "Đang tải ảnh gốc…", logic ghi chú/bình luận.

## 5. Cách verify

1. `npx eslint components/contracts/gallery/gallery-lightbox.tsx components/gallery/image-viewer.tsx` → exit 0 (luật: exit ≠ 0 là KHÔNG push).
2. `npm run build` → exit 0.
3. **Đo lại đúng cách đã dùng để tìm bug** — dev server local, gallery `hoaikha-thihiu` (contract `3e06afcf-8607-4e53-9ba4-cabe0d5077a9`), viewport 1440×900, sampler rAF ghi `getBoundingClientRect().height` của `<img>` trong lightbox:
   - **Frame đầu tiên có `height > 0` phải ≤ 150ms** kể từ lúc click (trước: 334 / 1319 / 2337ms). Đây là tiêu chí đậu/rớt chính.
   - Chuỗi `src` phải theo thứ tự: `=s600` → `=s2048` → `=s0`.
4. Kiểm **thứ tự tải** bằng Resource Timing: `startTime` của request `=s0` phải **lớn hơn** `responseEnd` của `=s2048`. Trước khi sửa hai giá trị này chênh nhau ~0ms (cùng bắt đầu t≈106ms).
5. Kiểm ảnh chờ đúng là **cache hit**: entry Resource Timing của URL `=s600` sau khi mở lightbox phải có `transferSize === 0` và không sinh request mạng mới.
6. **Gallery khách**: mở link chia sẻ public của chính gallery đó ở viewport 390×844×3 (mobile), lặp lại bước 3 + 4. Thêm: nhấn-giữ vẫn ra menu lưu ảnh, và chỉ báo "Đang tải ảnh gốc…" vẫn hiện rồi tắt.
7. Screenshot @1440 (admin) + @390 (khách) ngay sau khi mở ảnh — mắt phải thấy ảnh, không thấy khung đen.

## 6. Ràng buộc / cạm bẫy phải giữ

- **Ảnh chờ phải dùng ĐÚNG `getResponsiveThumbnailUrl(thumbnail_url, image_url, 600)`** — tự chế URL khác (vd `withThumbSize(base, 600)`) sẽ trượt cache của lưới và thành request thừa.
- **Phải đảo điều kiện `srcSet`/`sizes`** (Task 4, 8). Để nguyên `!== full` là thẻ mang srcSet 2048 lúc đang hiện ảnh chờ → trình duyệt bỏ `src`, tải lại bản nặng, coi như không sửa gì.
- Loader nền của bản xem phải set **cả `srcset` lẫn `sizes`** trước khi gán `src`, đúng thứ tự đó.
- Không đụng `getPreviewUrls`, không đổi `key={img.id}` của thẻ `<img>`, không gỡ prefetch prev/next.
- Không sửa `sizes="95vw"` cho khớp khung thật (540px) — đúng là đang tải dư, nhưng đó là task khác, ngoài phạm vi (ghi nhận ở §7).

## 7. Câu hỏi mở / rủi ro

- **Ảnh chờ mờ trên màn DPR cao:** ở desktop 1440 (DPR 1) khung ảnh dọc chỉ 540×810 nên bản 600px vừa đủ nét; trên điện thoại DPR 3 thì 600px sẽ mờ rõ trong 1–2 giây đầu trước khi bản 2048 vào. Đây là đánh đổi có chủ đích: mờ-rồi-nét tốt hơn đen-rồi-hiện. Nếu user không thích, nâng ảnh chờ lên 1200 — nhưng mất cache hit của lưới, phải tải mới.
- **Chỉ báo "Đang tải ảnh gốc…" (gallery khách) sẽ hiện lâu hơn** vì bản gốc giờ mới bắt đầu sau khi bản xem xong. Đúng ý nghĩa của nó, nhưng là thay đổi cảm nhận.
- **Vẫn tải ~19,4 MB mỗi ảnh** — user đã chốt giữ (đổi lấy lưu-ảnh-ra-gốc). Nếu sau này thấy tốn data, phương án là bỏ hẳn nạp `=s0` (nút "Tải xuống" vẫn ra gốc).
- **Ngoài phạm vi, chỉ ghi nhận:** `sizes="(max-width: 768px) 100vw, 95vw"` sai với ảnh dọc (khung thật 540px, đang tải bản 2048px ≈ gấp 4 lần cần thiết). Sửa được nhưng phải đo lại chất lượng hiển thị — mở task riêng.
