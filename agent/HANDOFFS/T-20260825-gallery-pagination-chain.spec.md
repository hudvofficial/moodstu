# T-20260825-gallery-pagination-chain — Chặn `setSize` trùng + sửa `loadingMoreImages` ở trang khách (M3-B)

**Owner:** claude (spec) → coder (fallback) · **Trạng thái:** `spec` — user đã duyệt hướng ("A rồi B"), code chỉ bắt đầu sau khi M3-A xanh trên production
**Module:** gallery (mặt tiền khách) · **Bối cảnh:** trang khách mỗi lượt mở album 517 ảnh có **5 request phân trang bị `net::ERR_ABORTED`** (2G page 20 → ~26); trang bị hủy chỉ được tải bù nhờ khách cuộn tiếp. Gốc rễ đã đo (spec M3-A §0): 2 nguồn kích `onLoadMore` (sentinel + AUTO-TRIGGER) gọi trong cùng tick → `setSize` 2 lần → 2 request song song → 1 bị hủy.

**Locks:**
- `components/gallery/public-gallery-client.tsx` (file DUY NHẤT)

**Không đổi:** `use-masonry-grid.ts` (hook dùng chung với lưới admin — cố tình không chạm, xem §0), `use-gallery-data.ts` (admin đã có chốt chặn riêng), mọi server action, tab ĐÃ CHỌN / GHI CHÚ (đã dùng danh sách server, không qua chuỗi này).

---

## 0. Vì sao chỉ sửa phía trang khách, không sửa hook

`components/contracts/gallery/use-gallery-data.ts:90-96` (admin) đã chẩn đoán và vá **đúng lỗi này** từ trước:

> "Điều phối nạp trang bằng ref, KHÔNG bằng state: có 2 nguồn kích onLoadMore (use-masonry-grid.ts:120 intersection + :146 auto-trigger) và chốt chặn bằng state `loadingMore` không chặn được 2 lời gọi trong CÙNG một tick — đo được trên prod: 2 lần 'Loading more nextPage=5' liên tiếp, append trùng 60 ảnh, rồi nhảy thẳng sang trang 7 làm mất trọn trang 6." → `isLoadingMoreRef` + `nextPageRef` (`:241-255`).

Trang khách (`public-gallery-client.tsx`) dùng `useSWRInfinite` và **chưa có chốt tương đương**: `loadMoreServerImages` chỉ gate bằng `!isValidating` (state, chưa kịp đổi trong cùng tick) → lọt 2 lời gọi. Sửa phía consumer theo đúng tiền lệ admin = nhất quán, không đụng hook dùng chung, verify chỉ cần 1 mặt tiền.

Thêm 1 lỗi nhỏ cùng chỗ: `loadingMoreImages = isValidating && pagesData.length === size` **ngược nghĩa** — khi đang tải trang mới thì `size = n+1 > pagesData.length = n` → `false`; chỉ `true` thoáng qua lúc trang vừa về. Grid dùng prop này để (a) hiện "Đang tải thêm ảnh..." và (b) phanh AUTO-TRIGGER (`!loadingMore`) → cả hai đều sai lúc cần.

## 1. Hành vi sau sửa

- Mỗi thời điểm tối đa **1** request trang đang bay; trigger trùng (từ sentinel hoặc AUTO-TRIGGER) bị bỏ qua im lặng.
- Trang về → trigger kế mới được nhận → tải tuần tự đủ trang, **không trang nào bị hủy/bỏ sót**.
- Spinner "Đang tải thêm ảnh..." hiện **trong lúc** đang tải trang mới (trước đây không).
- Nếu request lỗi (SWR tự retry theo `swrConfig.onErrorRetry`; nếu vẫn lỗi) → chốt được mở lại để lần cuộn kế thử lại, không kẹt vĩnh viễn.
- Tab ĐÃ CHỌN / GHI CHÚ: không đổi (không dùng chuỗi này).

## 2. Thay đổi — `components/gallery/public-gallery-client.tsx`

**(a) Import dòng 4:**

```tsx
// Trước:
import { useEffect, useState, useCallback, useMemo } from "react";
// Sau:
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
```

**(b) `useSWRInfinite` — lấy thêm `error`:**

```tsx
// Trước:
  const { data: pagesData, size, setSize, isValidating, mutate: mutatePages } = useSWRInfinite(
// Sau:
  const { data: pagesData, size, setSize, isValidating, error: pagesError, mutate: mutatePages } = useSWRInfinite(
```

**(c) Thay khối `hasMoreImages` / `loadingMoreImages` / `loadMoreServerImages`:**

```tsx
// Trước:
  const hasMoreImages = pagesData ? pagesData[pagesData.length - 1].hasMore : false;
  // isValidating is true during any request, but we only want to show 'loading more' if we are fetching the next page
  const loadingMoreImages = isValidating && pagesData && pagesData.length === size;

  const loadMoreServerImages = useCallback(() => {
    if (hasMoreImages && !isValidating) {
      setSize(size + 1);
    }
  }, [hasMoreImages, isValidating, size, setSize]);

// Sau:
  const hasMoreImages = pagesData ? pagesData[pagesData.length - 1].hasMore : false;
  // T-20260825-pagination-chain: đang tải trang MỚI = size đã tăng mà pagesData chưa bắt kịp. Bản cũ viết ngược
  // (pagesData.length === size) → false đúng lúc đang tải → spinner không hiện và phanh AUTO-TRIGGER của grid không ăn.
  const loadingMoreImages = isValidating && !!pagesData && size > pagesData.length;

  // Chốt chặn bằng REF như admin đã làm ở use-gallery-data.ts:90-96 (cùng lỗi, đã đo trên prod): sentinel + AUTO-TRIGGER
  // của grid gọi onLoadMore trong CÙNG một tick, `isValidating` (state) chưa kịp đổi → setSize 2 lần → 2 request trang
  // song song → 1 bị net::ERR_ABORTED → trang đó mất (đo prod: 5 request hủy/lượt mở album 517 ảnh; 2G page 20 → ~26).
  // requestedSizeRef = trang cao nhất đã yêu cầu; reset về số trang ĐÃ VỀ mỗi khi pagesData đổi (hoặc lỗi) để trigger
  // kế được nhận và lỗi không kẹt vĩnh viễn.
  const requestedSizeRef = useRef(0);
  useEffect(() => {
    requestedSizeRef.current = pagesData?.length ?? 0;
  }, [pagesData?.length, pagesError]);

  const loadMoreServerImages = useCallback(() => {
    if (!hasMoreImages || !pagesData) return;
    const next = pagesData.length + 1;
    if (requestedSizeRef.current >= next) return; // trang này đã được yêu cầu và đang bay → bỏ qua trigger trùng
    requestedSizeRef.current = next;
    setSize(next);
  }, [hasMoreImages, pagesData, setSize]);
```

`setSize(next)` với `next = pagesData.length + 1` (thay vì `size + 1`): luôn xin đúng trang kế sau những trang **đã về**, nên dù `size` có lệch vì lý do gì cũng không nhảy cóc trang.

**Cố tình KHÔNG làm:**
- Không sửa `use-masonry-grid.ts` (effect có dep `onLoadMore`, side-effect trong updater `setVisibleCount`, observer tạo lại khi callback đổi identity) — đúng là nguồn bắn đôi, nhưng hook dùng chung cho lưới admin (`gallery-full-page.tsx`), admin đã tự chốt phía consumer, và với chốt ref ở trang khách thì trigger trùng vô hại. Nếu sau này cần dọn hook → task riêng, verify 2 mặt tiền.
- Không xoá các `console.log('[useMasonryGrid] ...')` đang chạy trên production (nhiễu, nhưng ngoài scope và là công cụ đo của chính task này).
- Không đụng `pageSize` động theo mạng.

## 3. Acceptance criteria

1. **Gate đo được (production, album "Xuân Phúc – Ngọc Huy" `IjbQItqZSBUz`, 517 ảnh, chỉ đọc):** mở album, cuộn tới hết như khách thật (probe `probe-all-tab.mjs`, theo dõi TỪNG trang qua body request): **`duplicatePageRequests = []`** (trước fix: `[0,1,2,3,3,4,5,5]` → trùng p3, p5) và **`pagesNeverReceived = []`**; cuối cùng **517/517** tile; đo 2 lần liên tiếp đều đạt.
   *Thước đo đã chỉnh sau khi trace sâu hơn:* số POST `net::ERR_ABORTED` thô **không** là gate — phần lớn là Next.js đóng RSC stream **sau khi đã nhận 200** (xảy ra cả với stats/reactions, dữ liệu vẫn vào grid) → lành tính. Cái làm mất trang là **request trùng** (2 `setSize` cùng tick) — đó mới là thứ B chặn.
2. Cùng kịch bản trên local `next start`: 0 trùng, 0 trang không về, tile cuối = tổng header — 2 lần.
3. **Slow 3G** (CDP 50KB/s, 1.5s latency): cuộn 1 lần → thấy "Đang tải thêm ảnh..." (`spinnerSlow3G = true`; trước fix: `loadingMoreImages` false lúc đang tải → không hiện).
4. Regression: ĐÃ CHỌN 70/70 và GHI CHÚ 126/126 trên gallery thật (không đổi); @375 không tràn.
5. eslint 0 (yếu — file có `eslint-disable`) · `tsc --noEmit` 0 · `npm run build` exit 0.

## 4. Verify

1. eslint · tsc · build.
2. `next start -p 3005` + PowerShell: `probe-all-tab.mjs` trỏ local (AC2/AC3), `verify-selected-tab.mjs` phần chỉ đọc (AC4).
3. Sau merge: `probe-all-tab.mjs` trên production (AC1) — so với số đo trước fix đã lưu: `abortedAt: ["4.1","4.8","11.6","12.0","15.0"]`, `pagesReceived` thiếu số.

---

## 5. Kết quả thực thi (2026-08-25) — local ĐẠT

**Review diff-vs-spec:** ĐẠT — đúng 3 hunk (a)(b)(c), 1 file, +21/−8; code M2/M3-A byte-identical. eslint 0 (yếu) · tsc 0 · build exit 0.

**Baseline production TRƯỚC B** (probe phân loại từng trang, 2 lần): lần 1 `duplicatePageRequests: ["p4x2"]`, lần 2 `[]` (trùng xuất hiện ngẫu nhiên theo thời điểm — các lần đo trước: `[0,1,2,3,3,4,5,5]`); `spinnerSlow3G: false` **cả 2 lần** (tín hiệu "trước" ổn định); `pagesNeverReceived: []` cả 2 (tab TẤT CẢ tự bù nhờ cuộn — đúng như đã ghi ở CURRENT_STATE).

**Local `next start` SAU B** (2 lần): `pagesRequested [0..5]`, **`duplicatePageRequests: []` ×2**, `pagesNeverReceived: []` ×2, 517/517 ×2, **`spinnerSlow3G: true` ×2**, spinner lúc cuộn thường thấy 1/2 lần (server local nhanh, trang về < 300ms — không dùng làm gate). Regression `verify-selected-tab` chỉ-đọc **6/6** (ĐÃ CHỌN 70, GHI CHÚ 126, @375, Slow 3G tab).

**Production SAU B** (merge `f687cff`, Vercel deploy xong sau 158s; probe 3 lần + verify chỉ-đọc): `pagesNeverReceived: []` ×3, 517/517 ×3, **`spinnerSlow3G: true` ×3** (trước: false ×2), spinner lúc cuộn 3/2/2 lần (trước: 0); `duplicatePageRequests` `[]` ở lần 2 và 3 — lần 3 ghi kèm size: `p0@100 → p1 → p2 → p3 → p4 → p5`, mỗi trang đúng 1 lần. **Lần 1 thấy `p0x2`** (trang 0 gọi 2 lần): trang 0 do SWR fetch lúc mount, **không đi qua chốt `setSize`** của B; nghi `pageSize` theo mạng đổi sau mount làm đổi key (`size-…`) → refetch trang 0 — có sẵn từ trước, không tái hiện được ở 2 lần sau → ghi nhận, không kết luận, không nằm trong scope B. Regression `verify-selected-tab` chỉ-đọc trên production **6/6**.

**Điều chỉnh thước đo (trung thực):** `failedPageRequests` (POST `ERR_ABORTED`) vẫn còn sau B (vd `p1,p2,p3`) nhưng **mỗi trang đó đều đã nhận 200 và ảnh vào grid** — đây là Next.js đóng RSC stream sau khi đọc xong kết quả action (xảy ra cả với `getPublicGalleryStats`/reactions), không phải mất dữ liệu. Thứ B chặn là **request trùng** (2 `setSize` cùng tick) — trước B chính là thứ tạo ra trang bị bỏ và chuỗi chết ở tab lọc. Gate AC1 đã sửa theo đó.
