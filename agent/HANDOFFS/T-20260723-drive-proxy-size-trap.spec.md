# HANDOFF — T-20260723-drive-proxy-size-trap — claude → codex

- **Task:** T-20260723-drive-proxy-size-trap — Gỡ 2 helper trả URL proxy Drive thiếu `?size` (bẫy nạp nguyên file gốc 15 MB làm thumbnail)
- **Từ → Đến:** claude → codex
- **Branch / worktree:** `codex/drive-proxy-size-trap` / (không cần worktree — 2 file)
- **Locks (vùng độc quyền):** `lib/google-drive.ts`, `components/contracts/gallery/gallery-helpers.ts`
- **Ngày:** 2026-07-23

## 1. Mục tiêu bước này

Xoá 2 chỗ **duy nhất còn lại** có thể sinh ra URL `/api/drive-download/<id>` **không kèm `?size`**. Cả hai hiện không có nơi gọi, nhưng còn nằm đó thì lần sau gọi vào là dính lại đúng bẫy vừa vá ở commit `01a2ca8`: proxy mặc định redirect sang `=s0` = **nguyên file gốc ~15 MB** để vẽ một ô thumbnail 600px.

Không đổi hành vi chạy thật (cả hai đều dead), không đụng đường tải ảnh.

## 2. Đã làm / hiện trạng

### Bối cảnh
Commit `01a2ca8` đã cho `/api/drive-download` nhận `?size=N` và sửa `use-masonry-grid.ts` truyền `?size=600`. Đo thật qua endpoint: **15.028 KB → 92 KB** (giảm 163 lần). Nhưng `?size` là **tuỳ chọn** — không truyền thì vẫn `=s0` (cố ý, để đường TẢI ẢNH giữ nguyên bản gốc). Nên bẫy chỉ thực sự đóng khi không còn helper nào trả URL proxy trần.

### Hai chỗ còn lại — đã xác minh là dead

**a) `lib/google-drive.ts:48-51` — `getDriveDownloadUrl`**
```ts
/** Build download URL via our proxy API */
export function getDriveDownloadUrl(fileId: string): string {
  return `/api/drive-download/${fileId}`;
}
```
Grep toàn repo (`*.ts, *.tsx, *.mjs, *.js`): chỉ khớp **đúng 1 dòng khai báo này**, cộng 1 entry rác trong `data/code-index/repo-map.json` (index sinh tự động, không phải code). **0 nơi gọi.**

Hai hàm anh em cùng khối "URL Builders" thì **VẪN SỐNG**, đừng đụng: `getDriveThumbnailUrl` và `getDriveImageUrl` được `app/actions/gallery-drive-actions.ts` + `app/actions/gallery-admin-actions.ts` dùng (5 chỗ).

**b) `components/contracts/gallery/gallery-helpers.ts:49,51-61` — tham số `useProxy` + nhánh Strategy 1**
```ts
export function getResponsiveThumbnailUrl(
  thumbnailUrl: string | null,
  imageUrl: string,
  targetSize: number,
  useProxy: boolean = false        // ← không caller nào truyền
): string {
  // Strategy 1: Use proxy for same-origin loading (public mode)
  if (useProxy) {                  // ← nhánh chết
    ...
    return `/api/drive-download/${fileId}`;   // ← thiếu ?size
  }
```
3 caller trong code ứng dụng, **tất cả đều chỉ truyền 3 đối số** → `useProxy` luôn `false`:
- `components/contracts/gallery/gallery-image-grid.tsx:99` (600)
- `components/contracts/gallery/gallery-image-grid-pinterest.tsx:102` (`resolveThumbnailSize(...)`)
- `components/contracts/gallery/gallery-image-list.tsx:134` (240)

Nhánh này bị bỏ dùng có chủ đích — lý do đã ghi ngay tại `gallery-image-grid.tsx:94`: Next.js `/_next/image` không tối ưu được một redirect → trả 400 trên mọi ô → vỡ lưới.

## 3. Files touched

- `lib/google-drive.ts` — xoá 1 hàm (4 dòng + 1 dòng doc)
- `components/contracts/gallery/gallery-helpers.ts` — xoá 1 tham số + 1 nhánh, đánh số lại comment Strategy

Chạm ngoài 2 file này → DỪNG, báo lại Claude.

## 4. Bước tiếp cần làm — 2 thay đổi, chép nguyên văn

### Task 1 — xoá `getDriveDownloadUrl`
File `lib/google-drive.ts`, **dòng 48-51**.

Xoá trọn khối này (kể cả dòng comment và 1 dòng trống phía trên nó):
```ts
/** Build download URL via our proxy API */
export function getDriveDownloadUrl(fileId: string): string {
  return `/api/drive-download/${fileId}`;
}
```
Kết quả: sau `getDriveImageUrl` (kết thúc dòng 46) là thẳng tới dòng phân cách `// ─── File Grouping ─────────────────────────────────`.

**KHÔNG** đụng `getDriveThumbnailUrl` và `getDriveImageUrl` phía trên — cả hai còn sống.

### Task 2 — xoá tham số `useProxy` + nhánh Strategy 1
File `components/contracts/gallery/gallery-helpers.ts`, **dòng 37-63**.

Từ:
```ts
/**
 * Get responsive thumbnail URL with fallback to proxy
 *
 * Strategy:
 * 1. Proxy mode: use /api/drive-download for same-origin loading
 * 2. Prefer lh3.googleusercontent.com (whitelisted in next.config.ts)
 * 3. Fallback to drive.google.com/thumbnail (requires <img> tag or config update)
 */
export function getResponsiveThumbnailUrl(
  thumbnailUrl: string | null,
  imageUrl: string,
  targetSize: number,
  useProxy: boolean = false
): string {
  // Strategy 1: Use proxy for same-origin loading (public mode)
  if (useProxy) {
    const fileIdMatch =
      thumbnailUrl?.match(/[?&]id=([^&]+)/) ||
      imageUrl?.match(/\/d\/([^/?]+)/);
    const fileId = fileIdMatch?.[1] || fileIdMatch?.[2];

    if (fileId) {
      return `/api/drive-download/${fileId}`;
    }
  }

  const normalizedSize = Math.max(200, Math.round(targetSize));
```
Thành:
```ts
/**
 * Get responsive thumbnail URL
 *
 * Strategy:
 * 1. Prefer lh3.googleusercontent.com (whitelisted in next.config.ts)
 * 2. Fallback to drive.google.com/thumbnail (requires <img> tag or config update)
 *
 * KHÔNG trả URL /api/drive-download ở đây: proxy đó mặc định redirect sang =s0
 * (nguyên file gốc ~15 MB). Muốn dùng proxy làm thumbnail thì PHẢI tự truyền
 * ?size=N — xem use-masonry-grid.ts, commit 01a2ca8.
 */
export function getResponsiveThumbnailUrl(
  thumbnailUrl: string | null,
  imageUrl: string,
  targetSize: number,
): string {
  const normalizedSize = Math.max(200, Math.round(targetSize));
```

Sau đó đánh số lại 2 comment còn lại trong cùng hàm cho khớp doc mới (chúng đang trỏ sai sau khi Strategy 1 biến mất):
- `// Strategy 2: Prefer lh3.googleusercontent.com (already whitelisted for Next.js Image)` → đổi `Strategy 2` thành `Strategy 1`
- `// Strategy 3: Fallback to drive.google.com/thumbnail` → đổi `Strategy 3` thành `Strategy 2`

**KHÔNG** đổi logic bên trong 2 nhánh đó, **KHÔNG** đổi 3 call site (cả 3 đang truyền đúng 3 đối số nên không cần sửa gì).

## 5. Cách verify

1. `npx eslint lib/google-drive.ts components/contracts/gallery/gallery-helpers.ts` → exit 0
2. `npm run build` → exit 0 (đây là cổng TypeScript: nếu còn chỗ nào gọi `getDriveDownloadUrl` hoặc truyền 4 đối số thì build sẽ đỏ)
3. Grep xác nhận sạch — cả 2 lệnh phải **không ra kết quả nào**:
   ```
   grep -rn "getDriveDownloadUrl" --include=*.ts --include=*.tsx .
   grep -rn "useProxy" --include=*.ts --include=*.tsx components/ lib/ app/
   ```
4. Render: `npm run dev`, mở `http://localhost:3001/gallery/amtgzexYOnXG` ở viewport `390x844x3,mobile,touch`, đợi 8 giây rồi chạy trong console — phải trả `khong_co_size: 0`:
   ```js
   performance.getEntriesByType('resource')
     .filter(r => r.name.includes('/api/drive-download'))
     .reduce((a, r) => ({
       tong: a.tong + 1,
       khong_co_size: a.khong_co_size + (r.name.includes('size=') ? 0 : 1),
     }), { tong: 0, khong_co_size: 0 });
   ```
5. Mắt: lưới album hiện ảnh bình thường, không ô nào thành "Lỗi nguồn Drive" mới so với trước khi sửa.

## 6. Ràng buộc / cạm bẫy phải giữ

- **GIỮ NGUYÊN mặc định `=s0`** của `/api/drive-download` khi không có `?size` — đó là đường TẢI ẢNH GỐC cho khách, không phải bug. Đừng "sửa" thành bắt buộc có size.
- **KHÔNG đụng** `getDriveThumbnailUrl` / `getDriveImageUrl` (còn sống, 5 call site).
- **KHÔNG đụng** `components/contracts/gallery/use-masonry-grid.ts` — đã vá ở `01a2ca8`, ngoài locks.
- Giữ style code hiện có, không format lại cả file.

## 7. Câu hỏi mở / rủi ro

- **Rủi ro thấp nhưng có thật:** nếu sau này cần lại chế độ proxy same-origin cho album công khai thì phải viết lại nhánh đã xoá — nhưng lúc đó bắt buộc kèm `?size`. Lý do bỏ đã ghi tại `gallery-image-grid.tsx:94` (Next Image không tối ưu được redirect → 400).

- **Ngoài phạm vi, chỉ ghi nhận — cần bạn quyết mới làm:**
  1. `components/gallery/gallery-virtual-grid.tsx` — **cả file không có bất kỳ nơi nào import**. Bên trong có **bản sao thứ hai** của `getResponsiveThumbnailUrl` (bản rút gọn 3 tham số, không có nhánh proxy nên không dính bẫy).
  2. `scripts/test-url-helper.mjs` — **bản sao thứ ba**, tự chứa, gọi `useProxy = true`. Không có npm script nào trỏ tới. Vì nó copy độc lập nên Task 2 **không** làm hỏng script này.
  3. `components/contracts/gallery/gallery-image-grid-pinterest.tsx` — được `gallery-image-grid-index.tsx` import nhưng `USE_PINTEREST = false` nên không bao giờ render; vẫn bị đóng gói vào bundle.
  4. `data/code-index/repo-map.json` còn entry `getDriveDownloadUrl` — file index sinh tự động, sẽ tự hết khi chạy lại `scripts/build-code-index.mjs`.
