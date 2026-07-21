# PLAN — Gallery mobile LCP: 4.9s → mục tiêu <2.5s (ADR-012)

**Nguồn số đo:** Speed Insights mobile LCP P75 4.92s + trace lab 21/07 (LCP 5.76s; load delay 2.76s + render delay 2.56s; LCPDiscovery 3/3 FAILED).
**Phạm vi:** 2 file trong `components/contracts/gallery/` (grid dùng CHUNG admin + public → verify cả hai). KHÔNG đụng server actions, KHÔNG đụng masonry logic.
**Nguyên tắc:** học albumse (thumbnail 1 cỡ cố định), mỗi task 1 thay đổi độc lập, trace đo lại sau từng bước.

## Task 1 — Cố định cỡ thumbnail: src không phụ thuộc `columnWidth` runtime

**Vấn đề:** `gallery-image-grid.tsx:108-113` — `imageSrc = getResponsiveThumbnailUrl(thumbnail_url, image_url, resolveThumbnailSize(columnWidth))`. SSR giả định desktop 5 cột, client mobile đo lại 2 cột → `columnWidth` đổi → src đổi → React thay img node → trình duyệt coi ảnh là script-injected (mất discovery từ HTML, chính là 2.76s load delay).

**Sửa (gallery-image-grid.tsx, ngay chỗ khai báo `imageSrc`):**
```tsx
// TRƯỚC:
const imageSrc = getResponsiveThumbnailUrl(
  image.thumbnail_url,
  image.image_url,
  resolveThumbnailSize(columnWidth),
);
// SAU — cỡ CỐ ĐỊNH để src SSR === src client (albumse dùng w601 cố định cho mọi ảnh):
const imageSrc = getResponsiveThumbnailUrl(
  image.thumbnail_url,
  image.image_url,
  600,
);
```
Nếu `resolveThumbnailSize` không còn caller nào khác sau thay đổi này → gỡ import/hàm đó (chỉ khi thay đổi này làm nó thừa). Grep xác nhận trước khi gỡ.

**Trade-off ghi nhận:** desktop cột hẹp tải =s600 thay =s400 (nặng hơn ~30-40KB/ảnh nhưng nét hơn); khách cũ re-download thumbnail 1 lần do đổi URL (cache cũ =s400 bỏ). Chấp nhận.

## Task 2 — First-viewport: tăng eager + ép fetchpriority

**Vấn đề:** `gallery-image-grid.tsx:115` — `eagerLoad = index < Math.max(columnCount, 3)` → mobile 2 cột chỉ 3 ảnh eager, và HTML thực tế (curl 21/07) có 0 `fetchpriority`.

**Sửa (gallery-image-grid.tsx:115):**
```tsx
// TRƯỚC:
const eagerLoad = index < Math.max(columnCount, 3);
// SAU — phủ ~2 hàng đầu mobile (2 cột × 2 hàng) lẫn desktop:
const eagerLoad = index < Math.max(columnCount * 2, 4);
```

**Sửa (gallery-image-tile.tsx, thẻ `<Image>` ~dòng 66-84):** thêm 1 prop ép fetchpriority xuống HTML (priority hiện có nhưng attr không ra HTML SSR — curl xác nhận):
```tsx
priority={eagerLoad}
fetchPriority={eagerLoad ? "high" : undefined}
```
(giữ nguyên mọi prop khác của `<Image>`).

## Task 3 — Gỡ `opacity-0` khỏi đường paint LCP

**Vấn đề:** `gallery-image-tile.tsx:71` — img class `${imageLoaded ? "opacity-100" : "opacity-0"}` → ảnh tải xong vẫn vô hình cho tới khi JS onLoad + setState + re-render chạy (một phần của 2.56s render delay trên CPU yếu).

**Sửa (gallery-image-tile.tsx:71):** img LUÔN hiển thị — lúc chưa decode nó tự trong suốt, lớp blurhash NẰM DƯỚI (dòng 48-62, fade theo `imageLoaded`) vẫn lo phần placeholder, hành vi thị giác không đổi:
```tsx
// TRƯỚC:
className={`object-cover transition-all duration-500 group-hover:scale-[1.025] ${imageLoaded ? "opacity-100" : "opacity-0"}`}
// SAU:
className="object-cover transition-all duration-500 group-hover:scale-[1.025]"
```
Lưu ý: KHÔNG đụng lớp blurhash + `onImageLoad` (vẫn cần cho fade-out blur + aspectRatios). `imageLoaded` prop vẫn dùng cho blur layer — không gỡ.

## Task 4 — Verify (bắt buộc trước deploy)

1. `npx eslint` 2 file đổi + `npm run build` → exit 0.
2. Trace lại đúng điều kiện cũ (chrome-devtools: viewport 390x844x3 mobile, Fast 4G, CPU 4x, reload trace trên prod-build local hoặc preview): **LCP < 2.5s** và LCPDiscovery 3 check PASS (discoverable-in-document, không lazy, fetchpriority high).
3. Render check @390 (mobile 2 cột) + @768 + @1280: public gallery `dr-thitam-vandan` VÀ admin gallery (contracts/[id]/gallery) — lưới không vỡ, blur placeholder vẫn mượt, CLS không tăng (aspectRatio giữ chỗ như cũ).
4. Reviewer độc lập soi diff vs plan này.
5. Deploy `git push origin main` → trace lại trên prod thật → sau 3-4 ngày check Speed Insights mobile LCP.

## Self-review (§5 CLAUDE.md)
- Coverage: 3 nguyên nhân trong ADR-012 ↔ Task 1/2/3, 1-1. ✓
- Placeholder scan: không TBD/TODO; mọi task có path + code thật. ✓
- Type consistency: chỉ đổi giá trị/props có sẵn (`eagerLoad`, `fetchPriority` là prop hợp lệ của next/image), không đổi chữ ký hàm. ✓
- Rủi ro lớn nhất: Task 1 đổi URL thumbnail toàn lưới (cả admin) — đã ghi trade-off; Task 3 đổi cảm giác fade — blur layer giữ nguyên nên khác biệt tối thiểu.

---

## KẾT QUẢ (đo prod sau deploy 2c8ced0, cùng điều kiện trace ban đầu: mobile 390, 4xCPU, Fast 4G)

| Chỉ số | Trước | Sau | Ghi chú |
|---|---|---|---|
| **LCP (lab)** | 5.760ms | **3.323ms** | **-42%** |
| Load delay (phát hiện ảnh) | 2.757ms | **274ms** | Mục tiêu chính — giảm 10 lần |
| Insight LCPDiscovery | FAILED ×3 | **Biến mất (pass)** | Ảnh tải thẳng từ HTML |
| Render delay | 2.557ms | 2.557ms | KHÔNG đổi — đây là chi phí hydration JS trên CPU yếu, NGOÀI scope ADR-012. Muốn giảm tiếp = giảm bundle/hydration → đợt khác, chỉ mở nếu Speed Insights field vẫn xấu sau khi số sạch |
| CLS | 0.08 | 0.08 | Không regression từ việc bỏ opacity |

Tiêu chí "lab <2.5s" chưa chạm (3.32s) vì phần còn lại là render delay ngoài scope; tiêu chí discovery 3/3 PASS đạt trọn. Field P75 kỳ vọng ~2.5-3s (từ 4.92s). **Theo dõi Speed Insights mobile LCP sau 3-4 ngày** — nếu vẫn vàng/đỏ thì cân nhắc ADR mới cho hydration, KHÔNG tự mở.
