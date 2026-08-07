# HANDOFF — T-20260807-gallery-pagination-race — claude → (chờ user duyệt)

- **Task:** T-20260807-gallery-pagination-race — Lưới ảnh admin nạp trùng trang + nhảy cóc trang → mất 81/501 ảnh, chip "Thả tim" nhảy số (67 / 94 / 102 cho cùng một gallery)
- **Từ → Đến:** claude → claude (fallback, chờ user chốt 2 điểm ở §3)
- **Branch / worktree:** làm thẳng trên `main` (1 file)
- **Locks (vùng độc quyền):** `components/contracts/gallery/use-gallery-data.ts`
- **Ngày:** 2026-08-07

## 1. Mục tiêu bước này

Lưới ảnh admin phải hiển thị **đủ và không lặp** toàn bộ ảnh của gallery, và chip thống kê phải **ra một con số duy nhất** bất kể người dùng đã cuộn tới đâu.

## 2. Đã làm / hiện trạng — root cause đã đo xong

### Hiện tượng user báo (2026-08-07)
Gallery "CD Kim Chuẩn": admin hiện **95 Thả tim**, trang khách hiện **116**.

### ĐO ĐƯỢC — phần 1: 95 vs 116 KHÔNG phải mất dữ liệu

Query thẳng DB (gallery `dr-chuan-din`, id `34163bb6-715c-4790-8efd-3a0de443184e`):

| Chỉ số | Giá trị |
|---|---|
| Ảnh trong gallery | 501 (501 `drive_file_id` khác nhau, không bản ghi trùng) |
| Dòng `gallery_reactions` type heart | **116** |
| Ảnh khác nhau có tim | **95** |
| Số khách đã tim | 2 (78 + 38 lượt) |
| Reaction trỏ tới ảnh ngoài gallery | 0 |

- Trang khách = **tổng lượt tim**: [public-gallery-client.tsx:157](components/gallery/public-gallery-client.tsx#L157) `Object.values(reactionCounts).reduce((s, c) => s + c.hearts, 0)`.
- Trang admin = **số ảnh có tim**: [use-gallery-data.ts:382](components/contracts/gallery/use-gallery-data.ts#L382) `images.filter((img) => (reactionCounts[img.id]?.hearts || 0) > 0).length`.

Hai đại lượng khác nhau, cùng biểu tượng ❤️ và cùng chữ "tim".

### ĐO ĐƯỢC — phần 2: lỗi nặng hơn, lưới admin MẤT ẢNH

Mở đúng gallery đó trên prod, đo 3 lần:

| Thời điểm | Chip "Thả tim" |
|---|---|
| Vừa vào (240 ảnh đã tải) | **67** |
| Cuộn hết, lần 1 | **102** |
| Tải lại trang rồi cuộn hết, lần 2 | **94** |

Sự thật là 95. Đếm DOM sau khi cuộn hết: **540 ô ảnh, chỉ 420 ảnh khác nhau** trên tổng 501 → **81 ảnh không bao giờ được hiển thị**, 120 ô là bản sao. Hai bản sao nằm trong **cùng một lưới** (kiểm chuỗi phần tử cha giống hệt nhau), không phải hai lưới chồng nhau.

Log thật, thu bằng cách chèn hook vào `console.log` rồi cuộn:

```
Loading more: {"nextPage":5,"pageSize":60,"currentLoaded":300}
Loading more: {"nextPage":5,"pageSize":60,"currentLoaded":300}     ← gọi 2 lần cùng lúc, cùng trang
Loaded more:  {"fetched":60,"afterDedup":60,"newTotal":360}
Loaded more:  {"fetched":60,"afterDedup":60,"newTotal":360}        ← cả hai đều append 60 ảnh Y HỆT
Loading more: {"nextPage":7,"pageSize":60,"currentLoaded":420}     ← TRANG 6 bị nhảy cóc, mất vĩnh viễn
```

### Root cause — 3 lỗi chồng nhau ở [use-gallery-data.ts:226-266](components/contracts/gallery/use-gallery-data.ts#L226-L266)

1. **Chốt chặn dùng state, không chặn được cùng tick.** `if (loadingMore) return` đọc giá trị state trong closure; `setLoadingMore(true)` chỉ có hiệu lực ở lần render sau. Hai lời gọi trong cùng một tick đều thấy `false` → lọt cả hai. Có **2 nguồn kích** trong [use-masonry-grid.ts:120-122](components/contracts/gallery/use-masonry-grid.ts#L120-L122) (intersection) và [use-masonry-grid.ts:146-148](components/contracts/gallery/use-masonry-grid.ts#L146-L148) (auto-trigger) — nhánh đầu **không** kiểm `loadingMore`.
2. **Khử trùng so với ảnh chụp cũ, không so trong updater.** `res.data.images.filter((n) => !paginatedImages.some(...))` dùng `paginatedImages` của closure. Hai lời gọi song song có cùng snapshot → cả hai kết luận "60 ảnh này đều mới" → `setPaginatedImages(prev => [...prev, ...newImages])` chạy hai lần → mảng có 60 bản sao.
3. **Số trang tính từ độ dài mảng đã phồng.** `const nextPage = Math.floor(paginatedImages.length / pageSize)` — mảng phồng vì trùng nên `nextPage` nhảy 5 → 7, trang 6 không ai tải. Mỗi lần trùng là mất trọn 1 trang ảnh.

### Dữ kiện kỹ thuật cần biết trước khi sửa

- `reactionCounts` do RPC `get_gallery_data_v3` trả về là **của TOÀN gallery**, không theo trang: [migration dòng 77-86](supabase/migrations/20260606000000_gallery_data_v3_with_blur.sql#L77-L86) — `WHERE gallery_id = p_gallery_id`, gom nhóm trong SQL nên không dính trần 1000 dòng của PostgREST. ⇒ đếm chip từ `reactionCounts` là **đúng và đủ**, không cần query mới.
- `pageSize` **không cố định**: [use-gallery-data.ts:38-44](components/contracts/gallery/use-gallery-data.ts#L38-L44) đổi theo chất lượng mạng (30 / 50 / 60). Nếu mạng đổi giữa chừng mà vẫn tính trang theo `pageSize` hiện tại thì offset lệch → lại sót ảnh. Phải chốt `pageSize` của phiên nạp.
- `currentPage` (state, dòng 85) **không ai đọc** — chỉ được set. Dead state, **mention chứ không xoá** (luật surgical).
- `starredCount` (chip "Đề xuất", dòng 379) đếm `images.filter(is_starred)` → **cùng lỗi phụ thuộc cuộn**, hiện chưa lộ vì gallery này có 0 ảnh đề xuất. RPC **không** trả tổng số starred nên không sửa được bằng dữ liệu sẵn có → xem §3.

## 3. Hai điểm cần user chốt TRƯỚC khi code

**(a) Chip "Đề xuất" (`starredCount`) xử lý sao?**
- **A1 — Sửa luôn, thêm 1 count query nhẹ**: thêm `starredCount` vào action metadata bằng `select('id', { count: 'exact', head: true }).eq('is_starred', true)`. Thêm ~10 dòng, không migration.
- **A2 — Sửa luôn, thêm vào RPC**: chuẩn hơn (1 round-trip) nhưng phải viết migration sửa `get_gallery_data_v3`.
- **A3 — Để lại task sau**: task này chỉ lo phần đang gây mất ảnh. Chip "Đề xuất" vẫn sai theo cuộn nhưng hiện tại đang là 0 ở gallery đang gặp lỗi.

**(b) Nhãn tim admin vs khách?**
- **B1 — Giữ hai đại lượng, đổi chữ cho rõ**: admin "95 ảnh được tim", khách "116 lượt tim".
- **B2 — Cho hai bên cùng đếm số ảnh** (95 ở cả hai màn hình).
- **B3 — Không đụng chữ nghĩa lúc này.**

Mặc định nếu user không nói gì: **A3 + B3** (task chỉ sửa đúng phần mất ảnh + chip tim ổn định).

## 4. Bước tiếp cần làm — 5 task, chép nguyên văn

*(Mọi task đều trong `components/contracts/gallery/use-gallery-data.ts`.)*

### Task 1 — thêm 3 ref điều phối nạp trang
Ngay **sau dòng 88** (`const [totalImageCount, setTotalImageCount] = useState(seedData?.totalCount ?? 0);`), thêm:

```tsx
  // Điều phối nạp trang bằng ref, KHÔNG bằng state: có 2 nguồn kích onLoadMore
  // (use-masonry-grid.ts:120 intersection + :146 auto-trigger) và chốt chặn bằng
  // state `loadingMore` không chặn được 2 lời gọi trong CÙNG một tick — đo được
  // trên prod: 2 lần "Loading more nextPage=5" liên tiếp, append trùng 60 ảnh,
  // rồi nhảy thẳng sang trang 7 làm mất trọn trang 6.
  const isLoadingMoreRef = useRef(false);
  const nextPageRef = useRef(1);
  // pageSize đổi theo chất lượng mạng (30/50/60). Chốt lại theo phiên nạp để
  // offset = page × pageSize luôn khớp với các trang đã lấy.
  const loadPageSizeRef = useRef(pageSize);
```

> `useRef` đã được import sẵn ở dòng 3 của file (`import { useState, useEffect, useMemo, useCallback, useRef } from "react";`). Nếu chưa có `useRef` trong danh sách import thì thêm vào đúng dòng đó.

### Task 2 — reset ref khi đổi gallery (nhánh RPC thành công)
Trong effect nạp gallery, **dòng 157-164** (khối "Reset state").

Từ:
```tsx
    // Reset state
    setPaginatedImages([]);
    setCurrentPage(0);
    setHasMoreImages(false);
    setTotalImageCount(0);
    setLoadingMore(true);
    setActiveAlbumId(null);
    setActiveFilter("all");
```
Thành:
```tsx
    // Reset state
    setPaginatedImages([]);
    setCurrentPage(0);
    setHasMoreImages(false);
    setTotalImageCount(0);
    setLoadingMore(true);
    setActiveAlbumId(null);
    setActiveFilter("all");
    // Trang 0 do effect này nạp → lần load-more đầu tiên là trang 1.
    isLoadingMoreRef.current = false;
    nextPageRef.current = 1;
    loadPageSizeRef.current = pageSize;
```

### Task 3 — viết lại `loadMoreImages`
**Dòng 226-266**, thay trọn hàm.

Từ:
```tsx
  const loadMoreImages = useCallback(async () => {
    if (!activeGalleryId || loadingMore || !hasMoreImages) {
      console.log('[useGalleryData] 🚫 LOAD MORE BLOCKED:', {
        activeGalleryId,
        loadingMore,
        hasMoreImages,
        currentImages: paginatedImages.length,
        totalCount: totalImageCount,
        reason: !activeGalleryId ? 'NO_GALLERY' : loadingMore ? 'ALREADY_LOADING' : 'NO_MORE_DATA'
      });
      return;
    }
    console.log('[useGalleryData] 🔄 LOAD MORE STARTING...');
    setLoadingMore(true);

    // Calculate exact page based on loaded images to avoid overlapping offsets when pageSize changes
    const nextPage = Math.floor(paginatedImages.length / pageSize);
    console.log('[useGalleryData] Loading more:', { nextPage, pageSize, currentLoaded: paginatedImages.length });

    const res = await getGalleryImagesPaginated(activeGalleryId, nextPage, pageSize);

    if (res.success && res.data) {
      // Filter duplicates in case the math still caused an overlap
      const newImages = res.data.images.filter(
        (newImg) => !paginatedImages.some((existingImg) => existingImg.id === newImg.id)
      );

      console.log('[useGalleryData] Loaded more:', {
        fetched: res.data.images.length,
        afterDedup: newImages.length,
        newTotal: paginatedImages.length + newImages.length,
        hasMore: res.data.hasMore,
      });

      setPaginatedImages((prev) => [...prev, ...newImages]);
      setTotalImageCount(res.data.totalCount);
      setHasMoreImages(res.data.hasMore);
      setCurrentPage(nextPage);
    }
    setLoadingMore(false);
  }, [activeGalleryId, loadingMore, hasMoreImages, paginatedImages, pageSize, totalImageCount]);
```
Thành:
```tsx
  const loadMoreImages = useCallback(async () => {
    // Chốt chặn PHẢI là ref: state `loadingMore` chỉ đổi ở lần render sau nên
    // 2 lời gọi trong cùng một tick đều lọt qua (đo được trên prod).
    if (!activeGalleryId || isLoadingMoreRef.current || !hasMoreImages) {
      console.log('[useGalleryData] 🚫 LOAD MORE BLOCKED:', {
        activeGalleryId,
        loadingMore: isLoadingMoreRef.current,
        hasMoreImages,
        currentImages: paginatedImages.length,
        totalCount: totalImageCount,
        reason: !activeGalleryId ? 'NO_GALLERY' : isLoadingMoreRef.current ? 'ALREADY_LOADING' : 'NO_MORE_DATA'
      });
      return;
    }
    isLoadingMoreRef.current = true;
    console.log('[useGalleryData] 🔄 LOAD MORE STARTING...');
    setLoadingMore(true);

    // Số trang đi theo ref, KHÔNG suy ra từ độ dài mảng: mảng có thể ngắn hơn
    // (khử trùng) hoặc dài hơn (bug cũ) → tính lại là nhảy cóc, mất trọn 1 trang.
    const nextPage = nextPageRef.current;
    const size = loadPageSizeRef.current;
    console.log('[useGalleryData] Loading more:', { nextPage, pageSize: size, currentLoaded: paginatedImages.length });

    try {
      const res = await getGalleryImagesPaginated(activeGalleryId, nextPage, size);

      if (res.success && res.data) {
        const fetched = res.data.images;

        // Khử trùng BÊN TRONG updater — so với `prev` là trạng thái mới nhất,
        // không phải ảnh chụp cũ trong closure.
        setPaginatedImages((prev) => {
          const seen = new Set(prev.map((img) => img.id));
          const merged = [...prev];
          for (const img of fetched) {
            if (seen.has(img.id)) continue;
            seen.add(img.id);
            merged.push(img);
          }
          return merged;
        });

        console.log('[useGalleryData] Loaded more:', {
          page: nextPage,
          fetched: fetched.length,
          hasMore: res.data.hasMore,
        });

        nextPageRef.current = nextPage + 1;
        setTotalImageCount(res.data.totalCount);
        setHasMoreImages(res.data.hasMore);
        setCurrentPage(nextPage);
      }
    } finally {
      isLoadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [activeGalleryId, hasMoreImages, paginatedImages.length, totalImageCount]);
```

> Bỏ `loadingMore` và `pageSize` khỏi dependency là **có chủ đích**: chốt chặn và cỡ trang giờ nằm ở ref, để lại trong deps chỉ khiến hàm bị tạo mới liên tục và kích thêm lượt gọi. Giữ `paginatedImages.length` (thay vì cả mảng) để log vẫn đúng mà không tạo hàm mới mỗi lần mảng đổi tham chiếu.

### Task 4 — chip "Thả tim" đếm trên dữ liệu toàn gallery
**Dòng 382.**

Từ:
```tsx
  const totalHearts = images.filter((img) => (reactionCounts[img.id]?.hearts || 0) > 0).length;
```
Thành:
```tsx
  // Đếm trên reactionCounts (RPC trả cho TOÀN gallery) chứ không trên `images`
  // (chỉ là các trang đã tải) — nếu không, con số đổi theo mức độ cuộn: đo được
  // 67 khi vừa vào, 102 sau khi cuộn, trong khi sự thật là 95.
  const totalHearts = Object.values(reactionCounts).filter((c) => c.hearts > 0).length;
```

### Task 5 — ghi chú cạm bẫy tại chỗ đếm còn lại
**Dòng 379**, thêm comment ngay trên dòng `starredCount` (KHÔNG đổi logic ở task này):

```tsx
  // ⚠️ Vẫn đếm trên `images` = các trang ĐÃ TẢI nên phụ thuộc mức độ cuộn.
  // Chưa sửa được bằng dữ liệu sẵn có: RPC get_gallery_data_v3 không trả tổng số
  // ảnh is_starred. Xem T-20260807-gallery-pagination-race §3(a).
  const starredCount = images.filter((i) => i.is_starred).length;
```

*(Nếu user chọn A1 hoặc A2 ở §3 thì task 5 bị thay bằng một task riêng, sẽ viết thêm khi có quyết định.)*

## 5. Cách verify

Chạy trên dev server local, gallery **CD Kim Chuẩn** — contract `e41e7c10-cc27-4e0a-980e-7047eb6523f6`, gallery `34163bb6-715c-4790-8efd-3a0de443184e`, 501 ảnh / 95 ảnh có tim / 116 lượt.

1. `npx eslint components/contracts/gallery/use-gallery-data.ts` → exit 0.
2. `npm run build` → exit 0.
3. **Chip tim ổn định**: mở trang, đọc chip "Thả tim" **ngay khi vừa vào** (mới tải 60 ảnh) → phải là **95**. Cuộn hết → vẫn **95**. (Trước khi sửa: 67 → 102.)
4. **Không trùng, không sót** — cuộn hết rồi chạy trong console:
   ```js
   (() => {
     const t = [...document.querySelectorAll('img')].map(i => i.getAttribute('src') || '').filter(s => /=s600|sz=w600/.test(s));
     const ids = t.map(s => (s.match(/\/d\/([^=?&]+)/) || s.match(/id=([^&]+)/) || [])[1]).filter(Boolean);
     return { tiles: t.length, distinct: new Set(ids).size };
   })()
   ```
   Kỳ vọng `tiles === distinct === 501`. (Trước khi sửa: 540 ô / 420 ảnh khác nhau.)
5. **Không trang nào bị gọi 2 lần hoặc bị nhảy** — chèn hook thu log trước khi cuộn:
   ```js
   window.__logs = []; const o = console.log; console.log = (...a) => { window.__logs.push(a.map(String).join(' ')); o(...a); };
   ```
   Cuộn hết rồi lọc `window.__logs.filter(l => l.includes('Loading more'))`: mỗi `nextPage` xuất hiện **đúng 1 lần**, dãy phải là 1, 2, 3, … liên tục không nhảy số.
6. Bấm sang gallery khác rồi quay lại (nếu hợp đồng có nhiều album) → số trang phải reset, không nạp tiếp từ trang cũ.
7. Sau deploy: lặp lại bước 3 + 4 trên prod với chính gallery này.

## 6. Ràng buộc / cạm bẫy phải giữ

- **KHÔNG đụng `use-masonry-grid.ts`.** Việc 2 nguồn cùng kích `onLoadMore` là hợp lệ; chỗ phải chịu trách nhiệm chống trùng là hàm nạp. Thêm cờ ở lưới chỉ giấu bớt triệu chứng và làm hai nơi cùng giữ trạng thái.
- **KHÔNG suy số trang từ `paginatedImages.length`** dưới bất kỳ hình thức nào — đó chính là lỗi #3.
- **KHÔNG khử trùng ngoài updater.**
- Giữ nguyên các `console.log` chẩn đoán đang có (đúng phong cách file này, và chúng là công cụ đã bắt được bug).
- Không đổi `pageSize` theo mạng, không đụng `usePrefetchGallery` (prefetch không setState nên vô can — đã kiểm).
- Dead state `currentPage`: **giữ nguyên**, chỉ ghi nhận.

## 7. Câu hỏi mở / rủi ro

- **Phân trang theo offset là đủ, KHÔNG cần đổi sang con trỏ.** User sửa lưng 2026-08-07: chỉ admin mới upload/xoá ảnh. Kiểm lại toàn repo, chỉ có 3 nơi ghi vào `gallery_images` và cả ba đều do admin bấm — [gallery-admin-actions.ts:358](app/actions/gallery-admin-actions.ts#L358) (thêm ảnh), [gallery-drive-actions.ts:70](app/actions/gallery-drive-actions.ts#L70) (import Drive), [gallery-selection-actions.ts:335](app/actions/gallery-selection-actions.ts#L335) (kéo thả đổi `sort_order`). Không có cron/webhook nào tự chèn. Người đang cuộn chính là người duy nhất có quyền đổi tập ảnh, nên tập ảnh đứng yên trong suốt phiên cuộn → offset không thể trôi. Đừng mở lại phương án con trỏ nếu không có yêu cầu mới.
- **`reactionCounts` có thể chứa ảnh đã bị xoá**: nếu một reaction còn trỏ tới ảnh không còn trong `gallery_images` thì chip đếm dư. Ở gallery này đo được **0 reaction mồ côi**; chưa kiểm ràng buộc khoá ngoại có `ON DELETE CASCADE` hay không.
- **Ngoài phạm vi, nhưng cùng họ lỗi — cần task riêng:**
  1. `getReactionCounts` ([gallery-reaction-actions.ts:104](app/actions/gallery-reaction-actions.ts#L104)) và query đếm tim ở [gallery-admin-actions.ts:407](app/actions/gallery-admin-actions.ts#L407) **không phân trang** → PostgREST cắt ở 1000 dòng, gallery trên 1000 lượt tim sẽ đếm thiếu ở cả admin lẫn trang khách, không có lỗi nào được ném.
  2. Chế độ **"Ảnh thả tim"** trong modal lọc (commit `091d40b`) dùng `.in('id', <danh sách id>)`. Đo được hôm nay: 500 id làm URL dài 19 670 ký tự và Supabase trả lỗi *"HTTP headers exceeded server limits (typically 16KB)"*. Gallery trên khoảng 400 ảnh tim sẽ lỗi khi bấm lọc. Code cũ (`.or(id.in.(…))`) cùng bệnh, nhưng chế độ mới làm nó dễ chạm hơn.
