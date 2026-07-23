# HANDOFF — T-20260723-gallery-dead-code-cleanup — claude → codex

- **Task:** T-20260723-gallery-dead-code-cleanup — Gỡ 5 file gallery chết, trong đó 1 chuỗi 3 file đang bị đóng gói vào bundle gửi khách
- **Từ → Đến:** claude → codex
- **Branch / worktree:** `codex/gallery-dead-code-cleanup` / (không cần worktree)
- **Locks (vùng độc quyền):**
  - `scripts/test-url-helper.mjs`
  - `components/gallery/gallery-virtual-grid.tsx`
  - `components/contracts/gallery/gallery-image-grid-pinterest.tsx`
  - `components/contracts/gallery/use-masonry-pinterest.ts`
  - `components/contracts/gallery/gallery-image-grid-index.tsx`
  - `app/actions/gallery-masonry-layout.ts`
- **Ngày:** 2026-07-23

## 1. Mục tiêu bước này

Xoá code gallery không còn đường sống. Ưu tiên số 1 là **chuỗi Pinterest 3 file** — đã đo được là **thật sự nằm trong bundle client gửi tới khách** dù chưa bao giờ chạy.

Mục tiêu phụ nhưng mới là gốc rễ: logic dựng URL ảnh đang có **3 bản sao ở 3 nơi**, nên tôi vá bẫy `?size` ở `01a2ca8` + `1477090` mà vẫn còn 2 bản sao khác nằm ngoài tầm vá. Task này rút xuống còn **1 bản duy nhất**.

## 2. Đã làm / hiện trạng — đã đo, không suy đoán

### a) Chuỗi Pinterest — 3 file, dead nhưng CÓ trong bundle

`components/contracts/gallery/gallery-image-grid-index.tsx` là wrapper:
```tsx
const USE_PINTEREST = false; // Using CSS Grid (better width calculation)
export default USE_PINTEREST ? GalleryImageGridPinterest : GalleryImageGridOriginal;
```
Cờ `false` cứng → nhánh Pinterest **không bao giờ render**. Nhưng câu `import` vẫn còn, nên bundler vẫn gói nó vào.

**Bằng chứng đo được** (không phải suy luận): lấy chuỗi class chỉ tồn tại trong file Pinterest — `"max-w-full truncate px-3 text-micro font-medium"` — rồi grep bundle client đã build:
```
1 file chứa: .next/static/chunks/7260-0e8f77e05f9ea258.js  (20 KB)
```
Chuỗi phụ thuộc chết theo, mỗi mắt xích **chỉ có đúng 1 nơi gọi là mắt xích trước nó**:
```
gallery-image-grid-pinterest.tsx (271 dòng)
  └─ use-masonry-pinterest.ts            ← chỉ pinterest import
       └─ app/actions/gallery-masonry-layout.ts (3.2 KB)   ← chỉ hook đó import
            (calculateMasonryLayout, filterVisiblePositions, getResponsiveColumnCount)
```

### b) `components/gallery/gallery-virtual-grid.tsx` (181 dòng) — không ai import

Grep `gallery-virtual-grid` + `GalleryVirtualGrid` trong `components/`, `app/`, `lib/`: **0 kết quả** ngoài chính nó. Bên trong chứa **bản sao thứ 2** của `getResponsiveThumbnailUrl`.

Nó import `@tanstack/react-virtual`, nhưng gói này còn **2 consumer khác** (`contracts-tablet-table.tsx`, `use-masonry-virtual.ts`) → **KHÔNG đụng `package.json`/lockfile**.

### c) `scripts/test-url-helper.mjs` (75 dòng) — bản sao thứ 3

Script rời, tự chứa một bản copy của `getResponsiveThumbnailUrl` (bản còn nhánh `useProxy` đã bị xoá ở `1477090`). Không có npm script nào trỏ tới (grep `test-url-helper` trong `package.json` → rỗng).

### d) Không có hàm dùng chung nào bị mồ côi

`resolveThumbnailSize` xuất hiện 2 lần, nhưng là **2 bản khai báo cục bộ nằm trong chính 2 file sắp xoá** (`gallery-image-grid-pinterest.tsx:26`, `gallery-virtual-grid.tsx:22`). Xoá file là mất luôn, không ai khác dùng.

## 3. Files touched

Xoá hẳn 5 file:
- `scripts/test-url-helper.mjs`
- `components/gallery/gallery-virtual-grid.tsx`
- `components/contracts/gallery/gallery-image-grid-pinterest.tsx`
- `components/contracts/gallery/use-masonry-pinterest.ts`
- `app/actions/gallery-masonry-layout.ts`

Sửa 1 file:
- `components/contracts/gallery/gallery-image-grid-index.tsx`

Chạm ngoài danh sách này → DỪNG, báo lại Claude.

## 4. Bước tiếp cần làm — 4 task, làm theo đúng thứ tự

Thứ tự này cố ý: rủi ro tăng dần, mỗi bước build xanh rồi mới sang bước sau. Sai ở đâu thì biết ngay tại đó.

### Task 1 — xoá script rời (rủi ro gần như bằng không)
```
git rm scripts/test-url-helper.mjs
```
Verify ngay: `npm run build` → exit 0.

### Task 2 — xoá lưới ảo không ai dùng
```
git rm components/gallery/gallery-virtual-grid.tsx
```
Verify ngay: `npm run build` → exit 0. (Build là cổng TypeScript — nếu còn ai import thì đỏ ngay tại đây.)

### Task 3 — sửa wrapper để cắt đường vào Pinterest
File `components/contracts/gallery/gallery-image-grid-index.tsx` — thay **toàn bộ** nội dung file bằng:

```tsx
"use client";

/**
 * Gallery Grid Wrapper
 *
 * Chỉ còn một bản: CSS Grid masonry (./gallery-image-grid).
 * Bản Pinterest (positions tính sẵn, cần width/height trong DB) đã gỡ 2026-07-23:
 * cờ USE_PINTEREST để false nên nó chưa từng chạy, nhưng câu import vẫn kéo nó vào
 * bundle client (đo được ở chunk 7260-*.js trước khi gỡ).
 */

import GalleryImageGridOriginal from "./gallery-image-grid";

export default GalleryImageGridOriginal;
```

Verify ngay: `npm run build` → exit 0.

### Task 4 — xoá chuỗi Pinterest 3 file
Chỉ làm SAU khi Task 3 đã build xanh (lúc đó không còn ai import chúng nữa).
```
git rm components/contracts/gallery/gallery-image-grid-pinterest.tsx
git rm components/contracts/gallery/use-masonry-pinterest.ts
git rm app/actions/gallery-masonry-layout.ts
```
Verify ngay: `npm run build` → exit 0.

## 5. Cách verify

1. `npx eslint components/contracts/gallery/gallery-image-grid-index.tsx` → exit 0
2. `npm run build` → exit 0
3. Grep phải **rỗng** cả 4 lệnh:
   ```
   grep -rn "gallery-virtual-grid\|GalleryVirtualGrid" --include=*.ts --include=*.tsx components/ app/ lib/
   grep -rn "gallery-image-grid-pinterest\|GalleryImageGridPinterest" --include=*.ts --include=*.tsx components/ app/
   grep -rn "use-masonry-pinterest\|useMasonryPinterest" --include=*.ts --include=*.tsx components/ app/
   grep -rn "gallery-masonry-layout\|calculateMasonryLayout" --include=*.ts --include=*.tsx components/ app/ lib/
   ```
4. **Chỉ số quan trọng nhất — Pinterest phải RỜI KHỎI bundle.** Sau khi build lại, lệnh này phải in ra `0`:
   ```
   grep -rl -F "max-w-full truncate px-3 text-micro font-medium" .next/static/chunks/ | wc -l
   ```
   (Trước khi sửa, lệnh này in ra `1`. Đây là bằng chứng bundle gửi khách đã nhẹ đi, không phải suy đoán.)
5. Chỉ còn **1 bản** `getResponsiveThumbnailUrl` trong repo — lệnh này phải in ra đúng `1`:
   ```
   grep -rn "function getResponsiveThumbnailUrl" --include=*.ts --include=*.tsx --include=*.mjs . | grep -v node_modules | grep -v "\.claude/worktrees" | wc -l
   ```
6. Render: `npm run dev`, mở `http://localhost:3001/gallery/amtgzexYOnXG` ở viewport `390x844x3,mobile,touch`, đợi 8 giây. Lưới phải hiện ảnh bình thường; chạy đoạn dưới, `oLoi` phải bằng `0`:
   ```js
   ({
     soAnhTaiXong: [...document.querySelectorAll('img')].filter(i => i.complete && i.naturalWidth > 0).length,
     oLoi: document.body.innerText.split('Lỗi nguồn Drive').length - 1,
   })
   ```
7. Mở thêm 1 album ở giao diện admin (`/contracts/<id>` → tab Album) để chắc lưới phía admin — cùng dùng `gallery-image-grid-index` — không vỡ.

## 6. Ràng buộc / cạm bẫy phải giữ

- **KHÔNG đụng `package.json` / `package-lock.json` / `pnpm-lock.yaml`.** `@tanstack/react-virtual` vẫn còn 2 consumer khác. Repo có dual-lockfile, sửa nhầm là CI xanh mà prod vỡ (xem CLAUDE.md).
- **KHÔNG đụng** `components/contracts/gallery/gallery-image-grid.tsx` (bản đang chạy thật), `gallery-helpers.ts`, `use-masonry-grid.ts` — ngoài locks.
- **Giữ file wrapper** `gallery-image-grid-index.tsx`, chỉ đổi nội dung. Đừng xoá rồi sửa import ở các nơi gọi — đó là refactor rộng hơn, ngoài phạm vi.
- Làm **đúng thứ tự 4 task**, build xanh sau mỗi task.

## 7. Câu hỏi mở / rủi ro

- **Mất khả năng bật lại Pinterest.** Bản này từng được viết để dùng `width`/`height` có sẵn trong DB, tính layout trước nên không giật khi ảnh tải. Xoá đi là mất luôn đường lùi đó; muốn quay lại phải lấy từ git history (commit trước `1477090`). Đánh giá: cờ đã `false` rất lâu và bản CSS Grid đã qua đợt tối ưu LCP ADR-012, nên khả năng quay lại thấp — nhưng đây là mất mát thật, không phải dọn rác thuần tuý.
- **Chưa đo được phần KB mà riêng Pinterest chiếm.** Tôi chỉ chứng minh được nó *nằm trong* chunk `7260-*.js` (20 KB tổng, còn chứa thứ khác). Con số "giảm bao nhiêu KB" chỉ biết chắc sau khi build lại ở bước verify 4.
- **Ngoài phạm vi task này:** 2 worktree cũ ở `.claude/worktrees/` chiếm **5.2 GB** đĩa và **đều có thay đổi chưa commit chưa hề có trên main**. Đã tách thành task riêng `T-20260723-worktree-salvage-prune` vì bản chất khác hẳn (cứu việc dở + dọn môi trường, không phải xoá dead code).
