# T-20260825 — Gallery khách: header hiện 💬 số ảnh có ghi chú

**Owner:** claude (spec) → codex (implement) · **Trạng thái:** `spec` — CHỜ USER DUYỆT
**Module:** gallery (mặt tiền khách `/gallery/[accessUrl]`) · **Bối cảnh:** user gửi ảnh header album share `🖼 115 · ✓ 0 · ❤️ 0` — "thiếu icon báo hiển thị hình khách note, nhiều khi khách đã note mà không nhớ mình note bao nhiêu tấm".

**Locks:**
- `components/gallery/public-gallery-client.tsx` (file DUY NHẤT được sửa)

**Không đổi:** `selection-summary.tsx`, `gallery-image-grid.tsx`, `image-viewer.tsx`, mọi server action, DB. Không đụng `notedCount` hiện có.

---

## 0. Trace — vì sao thiếu (đã đọc code thật, không suy đoán)

| Vị trí | Hiện trạng |
|---|---|
| Header stats `public-gallery-client.tsx:365-370` | Chỉ 3 số: `ImageIcon` tổng · `CircleCheck` đã chọn · `Heart` tổng lượt tim. **Không có ghi chú.** |
| `notedCount` `public-gallery-client.tsx:150-153` | Đã tính sẵn = **đã chọn ∩ có ghi chú** (đếm từ `commentsPerImage`, commit `76beee9`). Chỉ truyền xuống thanh đáy `SelectionSummary` (`selection-summary.tsx:209-214`) — chip ẩn khi `0`, và cả thanh đáy ẩn ở view-only. |
| Tile badge `gallery-image-grid.tsx:246-254` | Mỗi ảnh có ghi chú có chip `MessageSquare` góc trái-trên — nhưng phải cuộn tìm từng tấm, không có tổng. |
| Nút ghi chú trong viewer `image-viewer.tsx:926-930` | `if (onSaveNote) setNoteOpen(true)` — **KHÔNG gate `is_selected`** → khách ghi chú được cả ảnh chưa chọn. Vì vậy `notedCount` (chỉ đếm trong ảnh đã chọn) **không phải** số khách cần ("đã note bao nhiêu tấm"). |
| `commentsPerImage` `public-gallery-client.tsx:96-100` | SWR key `gallery-comments-<id>` → `getGalleryComments()` trả map `image_id → comment[]` của **CẢ gallery** từ server (không phụ thuộc trang đã cuộn). `handleSaveNote` (dòng 344) đã `mutate` đúng key này sau khi lưu → header sẽ tự cập nhật, không cần thêm wiring. |
| Token | `getGalleryComments` chấp nhận cả view-token lẫn token đầy đủ (`gallery-reaction-actions.ts:174-181`) → link view-only (`?mode=view` / capability `view`/`download`) cũng có dữ liệu. Tile badge ghi chú hiện đã hiện ở view-only (dòng 246 không gate `showClientNote`), nên header hiện ở view-only là nhất quán. |

**Kết luận:** thiếu 1 chip trong header + cần 1 memo mới đếm đúng nghĩa. Dữ liệu, fetch, revalidate đã có đủ.

## 1. Định nghĩa số hiển thị (chốt để không lệch nghĩa như vụ "tim" — xem `vault/40-module/gallery.md` §"Chọn và Tim")

`notedImageCount` = **số ẢNH có ≥ 1 ghi chú trên cả gallery** (đếm `image_id` phân biệt trong `commentsPerImage`), KHÔNG phải số lượt ghi chú, KHÔNG lọc theo đã chọn.

- Khác `notedCount` (đã chọn ∩ có ghi chú) — giữ nguyên `notedCount` cho chip thanh đáy vì nó đứng cạnh "Đã chọn N ảnh" nên nghĩa "trong số đã chọn" ở đó là đúng chỗ (quyết định của `76beee9`, không đảo).
- Hiện **cả khi = 0** (giống ✓ 0 và ❤️ 0 trong cùng hàng) — đây chính là icon user thấy thiếu; `0` cho khách biết tính năng tồn tại.
- Hiện ở **cả select lẫn view-only** — cùng lý do dòng 367 đã cho view-only xem tiến độ chọn; dữ liệu có sẵn ở cả 2 mode.

## 2. Thay đổi — `components/gallery/public-gallery-client.tsx`

### 2.1. Import (dòng 7)

```tsx
// Trước:
import { Camera, CircleCheck, Image as ImageIcon, Heart, Download } from "lucide-react";
// Sau:
import { Camera, CircleCheck, Image as ImageIcon, Heart, Download, MessageSquare } from "lucide-react";
```

Dùng `MessageSquare` — đúng icon tile badge (`gallery-image-grid.tsx:252`) và chip thanh đáy (`selection-summary.tsx:211`). **KHÔNG** dùng `MessageCircle` (chỉ admin `contracts/detail/gallery-stats.tsx` dùng) — trang khách phải 1 ngôn ngữ icon.

### 2.2. Memo mới — đặt NGAY SAU `notedCount` (sau dòng 153)

```tsx
  // T-20260825: số ẢNH có ≥1 ghi chú trên CẢ gallery — khác notedCount ở trên (đã chọn ∩ có ghi chú,
  // dành cho chip thanh đáy). Ghi chú KHÔNG bắt buộc ảnh phải được chọn (nút ghi chú trong viewer
  // không gate is_selected) nên header phải đếm toàn bộ. commentsPerImage là map cả gallery từ server
  // (không phụ thuộc trang đã cuộn) → đếm key có ≥1 comment là đủ, không cần query thêm.
  const notedImageCount = useMemo(
    () => Object.values(commentsPerImage).filter((list) => list.length > 0).length,
    [commentsPerImage],
  );
```

### 2.3. Header — dòng 359-370

```tsx
// Trước:
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-primary opacity-70" />
            <h1 className="text-base font-semibold tracking-tight truncate max-w-[200px] md:max-w-[400px] text-text-primary">
              {gallery.title || "Album ảnh"}
            </h1>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-text-secondary">
            <span className="flex items-center gap-1.5"><ImageIcon size={14} className="opacity-60" /> {totalImageCount}</span>
            {/* Số ĐÃ CHỌN — cùng ngôn ngữ nút ✓ trên tile (✓ xanh = chọn, ❤️ đỏ = tim); link view-only vẫn xem được tiến độ chọn */}
            <span className="flex items-center gap-1.5 text-[#34c759]"><CircleCheck size={14} className="fill-[#34c759] text-white" /> {selectedCount}</span>
            <span className="flex items-center gap-1.5 text-[#ff3b30]"><Heart size={14} className="fill-[#ff3b30]" /> {totalLikes}</span>
          </div>

// Sau:
          <div className="flex min-w-0 items-center gap-2">
            <Camera size={18} className="shrink-0 text-primary opacity-70" />
            <h1 className="text-base font-semibold tracking-tight truncate max-w-[200px] md:max-w-[400px] text-text-primary">
              {gallery.title || "Album ảnh"}
            </h1>
          </div>
          {/* T-20260825: thêm chip 💬 số ảnh có ghi chú (khách hay quên đã note bao nhiêu tấm).
              4 chip @375 ≈ 164px → gap-3 trên mobile + shrink-0 ở đây + min-w-0 ở khối tiêu đề
              để tiêu đề dài bị cắt "…" đúng chỗ thay vì đẩy chip tràn ngang. */}
          <div className="flex shrink-0 items-center gap-3 md:gap-4 text-sm font-medium text-text-secondary">
            <span className="flex items-center gap-1.5"><ImageIcon size={14} className="opacity-60" /> {totalImageCount}</span>
            {/* Số ĐÃ CHỌN — cùng ngôn ngữ nút ✓ trên tile (✓ xanh = chọn, ❤️ đỏ = tim); link view-only vẫn xem được tiến độ chọn */}
            <span className="flex items-center gap-1.5 text-[#34c759]"><CircleCheck size={14} className="fill-[#34c759] text-white" /> {selectedCount}</span>
            <span className="flex items-center gap-1.5 text-[#ff3b30]"><Heart size={14} className="fill-[#ff3b30]" /> {totalLikes}</span>
            {/* 💬 = cùng icon + màu primary với chip trên tile và chip thanh đáy */}
            <span className="flex items-center gap-1.5 text-primary" title="Ảnh có ghi chú" aria-label="Ảnh có ghi chú"><MessageSquare size={14} /> {notedImageCount}</span>
          </div>
```

Đúng 3 thay đổi trong khối này: (a) `min-w-0` + `shrink-0` cho Camera ở khối tiêu đề, (b) `shrink-0 gap-3 md:gap-4` ở khối stats, (c) thêm span thứ 4. Ba span cũ **không đổi 1 ký tự**.

**Cố tình KHÔNG làm:**
- Không ẩn chip khi `0` (khác chip thanh đáy) — lý do §1.
- Không sửa `notedCount`/`SelectionSummary` — nghĩa hiện tại đúng chỗ, và tránh 2 file lock cho 1 việc.
- Không thêm tab lọc "GHI CHÚ" / không cho chip bấm được — xem §5, chờ user quyết.
- Không sửa `getGalleryComments` (select 1 phát, không `selectAllRows` → trần 1000 dòng/gallery — nợ có sẵn từ trước, gallery thật nhiều ghi chú nhất 148, tile badge hiện cũng chịu chung trần này). Ghi nhận, không sửa trong task này.

## 3. Acceptance criteria

1. Header album share có **4** chip theo thứ tự `🖼 tổng · ✓ đã chọn · ❤️ tim · 💬 ảnh có ghi chú`; chip 💬 màu `text-primary`, hiện cả khi `0`.
2. Số 💬 = `SELECT count(DISTINCT image_id) FROM gallery_comments WHERE gallery_id = <id>` của gallery đang mở (đối chiếu trực tiếp DB khi verify).
3. Ghi chú 1 ảnh **chưa chọn** trong viewer → 💬 tăng 1 ngay sau khi lưu (không reload); xoá ghi chú (lưu rỗng) → giảm 1. Chip thanh đáy (`notedCount`) **không** tăng ở trường hợp ảnh chưa chọn — đúng thiết kế, không phải bug.
4. Link view-only (`?mode=view`) vẫn hiện chip 💬 với số đúng (dù tab + thanh đáy ẩn).
5. @375 với tiêu đề dài (≥ 30 ký tự): không tràn ngang, tiêu đề cắt "…", đủ 4 chip trên 1 hàng. @768/@1024: không đổi so với trước ngoài chip thứ 4.
6. `npx eslint components/gallery/public-gallery-client.tsx` 0 lỗi · `npm run build` exit 0.

## 4. Verify (Roo/Claude — không tạo dữ liệu thật)

1. `npx eslint components/gallery/public-gallery-client.tsx` → 0 error. `npm run build` → exit 0.
2. Render thật local (`next start` hoặc dev): mở 1 link chia sẻ của gallery **có ghi chú thật** (148 ghi chú legacy đã migrate ở `d45ea00` → chọn gallery có nhiều ghi chú nhất qua `SELECT gallery_id, count(DISTINCT image_id) FROM gallery_comments GROUP BY 1 ORDER BY 2 DESC LIMIT 3`). Đối chiếu số 💬 với count DB. **Chỉ đọc**, không bấm gì trên gallery thật.
3. Gallery E2E tạm (seed rồi xoá): ghi chú 1 ảnh chưa chọn → 💬 `0→1`, thanh đáy vẫn không có chip; chọn ảnh đó → thanh đáy hiện chip `1`; lưu ghi chú rỗng → 💬 `1→0`. Xoá gallery test sau khi xong.
4. Cùng gallery E2E: mở `?mode=view` → 💬 vẫn hiện đúng.
5. Chụp @375 (tiêu đề dài) / @768 / @1024 — không tràn ngang (kiểm `document.documentElement.scrollWidth <= innerWidth`).

## 5. Đề xuất mở rộng — CHƯA LÀM, chờ user duyệt riêng (M2)

Khách biết "đã note 7 tấm" nhưng vẫn phải cuộn tìm 7 tấm đó. Có thể thêm **tab thứ 3 "GHI CHÚ"** cạnh `TẤT CẢ / ĐÃ CHỌN` (`activeGroup: "all" | "selected" | "noted"`, lọc `images.filter(i => (commentsPerImage[i.id]?.length ?? 0) > 0)`) và cho chip 💬 header bấm được → nhảy sang tab đó. Cùng file lock, ~20 dòng. Giới hạn kế thừa (đã có sẵn ở tab ĐÃ CHỌN): lọc trên ảnh **đã tải** theo trang, chưa cuộn hết thì chưa thấy hết — không tệ hơn hiện trạng. Nếu duyệt M2 → cập nhật spec này thêm §2.4 + AC riêng trước khi Codex làm; không gộp vào M1 khi chưa duyệt.

---

## 6. Kết quả thực thi (2026-08-25) — M1 ĐẠT, 14/14 verify PASS

**Đường đi thật:** user duyệt "triển khai đi bạn" → giao Codex CLI (0.144.5) qua `codex:codex-rescue` → **Codex lỗi credential** (`404 No active credentials for provider: codex` @ router `localhost:20128`, tái hiện 2/2 lần dù `setup --json` báo `ready: true`) → chuyển **Claude fallback** (AGENT_RULES §2): subagent coder áp §2.1–2.3 verbatim → Claude review diff-vs-spec: ĐẠT (3 span cũ byte-identical, chỉ context line; +18/−4 dòng, không đổi encoding/CRLF).

**Verify đã chạy thật:**
1. `npx eslint components/gallery/public-gallery-client.tsx` → exit 0 (**bằng chứng yếu**: file có sẵn `/* eslint-disable */` dòng 2 từ trước, không đụng). `npx tsc --noEmit` toàn dự án → 0 lỗi (41s). `npm run build` → exit 0, PWA artifact OK.
2. Render thật `next start -p 3005` + Playwright (PowerShell — chạy dưới Git Bash node crash libuv `UV_HANDLE_CLOSING`, không liên quan code):
   - Gallery thật "Huyền - Vinh Ngày cưới final" (`jjay1sJ9hhPq`, chỉ đọc): header `585 · ✓9 · ❤️135 · 💬126` — **126 = `count(DISTINCT image_id)` DB** ✓ (AC1/AC2). @1024/@768/@375 `scrollWidth == innerWidth` ✓ (AC5). `?mode=view`: chip 💬126 hiện, tab ẩn ✓ (AC4).
   - Gallery E2E tạm (clone "CD Bé - Hảo", 3 ảnh chưa chọn, tiêu đề 62 ký tự): @375 chip `0`, không tràn, `h1` scrollWidth 505 > clientWidth 165 (cắt "…") ✓. Ghi chú ảnh **chưa chọn** trong viewer → 💬 `0→1` không reload, thanh đáy không có chip ✓; bấm ✓ chọn ảnh → thanh đáy `Đã chọn 1 ảnh / 3 · 💬1` ✓; lưu ghi chú rỗng → 💬 `1→0` ✓ (AC3).
   - Dọn sạch: `remaining E2E-TEST galleries: 0` (comments/reactions/images/gallery đều xoá).
3. **Production** sau merge `78a4fb5`: poll `stu.moodwedding.com/gallery/jjay1sJ9hhPq` tới khi chip xuất hiện (Vercel deploy xong sau 191s) → chạy lại bộ chỉ-đọc: **7/7 PASS** (💬126 @1024/768/375, `scrollWidth == innerWidth` cả 3, `?mode=view` chip hiện + tab ẩn). Không chạy AC3 trên production (không tạo dữ liệu test ở production; AC3 đã verify local trên cùng DB).
4. Ảnh chụp header @375/@768/@1024 + view-only lưu ở scratchpad phiên (không đưa vào repo). Ảnh `test-375.png` chụp ra nền trơn (race lúc chụp), nhưng 3 assertion DOM @375 của gallery test đều PASS và ảnh `real-375.png` xác nhận layout 4 chip @375 bằng mắt.

**Ghi nhận thêm:** `agent/TASKS.yaml` + `CURRENT_STATE.md` sửa cho task này bị cuốn vào commit của phiên song song (`652caf6`, `be301f3` — task finance-nav-guard) do 2 phiên cùng working tree; nội dung nguyên vẹn, chỉ lệch commit message.
