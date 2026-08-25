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

1. **Gate đo được (production, album "Xuân Phúc – Ngọc Huy" `IjbQItqZSBUz`, 517 ảnh, chỉ đọc):** mở album, cuộn tới hết như khách thật (probe `probe-all-tab.mjs`): request phân trang bị hủy **5 → 0**; tổng request trang = đúng số trang cần (6 với page 100, không trùng); cuối cùng **517/517** tile; các response `page=` liên tục 1,2,3,4,5 không thiếu số nào.
2. Cùng kịch bản trên local `next start` (page đầu 30 → nhiều trang hơn): 0 request hủy, tile cuối = tổng header.
3. Spinner "Đang tải thêm ảnh..." xuất hiện ít nhất 1 lần trong lúc cuộn (trước fix: không).
4. Regression: ĐÃ CHỌN 70/70 và GHI CHÚ 126/126 trên gallery thật (không đổi); @375 không tràn.
5. eslint 0 (yếu — file có `eslint-disable`) · `tsc --noEmit` 0 · `npm run build` exit 0.

## 4. Verify

1. eslint · tsc · build.
2. `next start -p 3005` + PowerShell: `probe-all-tab.mjs` trỏ local (AC2/AC3), `verify-selected-tab.mjs` phần chỉ đọc (AC4).
3. Sau merge: `probe-all-tab.mjs` trên production (AC1) — so với số đo trước fix đã lưu: `abortedAt: ["4.1","4.8","11.6","12.0","15.0"]`, `pagesReceived` thiếu số.
