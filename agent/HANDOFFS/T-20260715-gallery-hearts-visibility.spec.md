# SPEC — T-20260715-gallery-hearts-visibility (v2 — sau screenshot thực trạng từ user)

- **Task:** Khách thả tim nhưng admin không thấy / thấy số sai — tách bạch 2 hệ "Chọn" vs "Tim" trên admin + làm nút Chọn phía khách hết mờ nhạt
- **Owner khi implement:** codex · **Branch:** `codex/gallery-hearts-visibility`
- **Ngày:** 2026-07-15 · **Trạng thái:** chờ user duyệt

## 1. Root cause (verify bằng query prod read-only + screenshot user)

Hai hệ dữ liệu độc lập: **"Chọn"** = `gallery_images.is_selected` · **"Tim"** = bảng `gallery_reactions` (668 rows — DB khỏe, RPC trả đúng). Nhưng UI trộn chúng bằng `||` ở mọi nơi:

| # | Vấn đề | Bằng chứng |
|---|---|---|
| 1 | Nút **Chọn chỉ có trong lightbox**, icon 20px không nhãn cạnh nút Heart → khách tưởng tim = chọn | `image-viewer.tsx:635-651`; DB: "Thị Cầm"/"CD Bé - Hảo" **53 tim / 0 chọn** |
| 2 | Tile public: nút tim `opacity-0 group-hover` → **mobile vô hình** | `gallery-image-grid.tsx:191` |
| 3 | Card detail HĐ: `❤️ {selectedCount}` — icon tim, số CHỌN (screenshot: "❤️ 1" trong khi 4 tim) | `drive-gallery-block.tsx:236` |
| 4 | Toolbar gallery full: stat "khách chọn" = `totalHearts` = **số GỘP** `is_selected \|\| hearts` (screenshot: "❤️ 5 Khách chọn" = 1 chọn + 4 tim) | `gallery-toolbar.tsx:189-196` + `use-gallery-data.ts:378` |
| 5 | Filter "hearted" cũng gộp (`is_selected \|\|`) — bấm stat tim ra cả ảnh chọn | `use-gallery-data.ts:336` |
| 6 | Download "ảnh tim" cũng gộp | `gallery-image-helpers.ts:122` |
| 7 | Chip trên tile + list admin: ảnh `is_selected` hiện icon **tim** (title "Khách chọn") cạnh chip đếm tim thật — 2 chip cùng hình tim, 2 nghĩa | `gallery-image-grid.tsx:232-235`, `gallery-image-list.tsx:187-190` |

**Quy ước sau fix:** ✔ CircleCheck (xanh `success`) = Chọn · ❤️ Heart (đỏ `error`) = Tim. KHÔNG gộp ở bất cứ đâu.

## 2. Thay đổi (7 file, thuần UI/additive — KHÔNG migration, KHÔNG đổi write path)

### A. `components/gallery/image-viewer.tsx` — nút Chọn thành pill có nhãn (dòng 635-651)
Giữ `actionButtonStyle` base + logic `onToggleStar(img.id)`:
```tsx
<Button unstyled
  type="button"
  onClick={(e) => { e.stopPropagation(); onToggleStar(img.id); }}
  style={{
    ...actionButtonStyle,
    width: "auto",
    borderRadius: 9999, // actionButtonStyle có borderRadius "50%" — trên pill rộng sẽ thành elip, phải override
    paddingLeft: 14,
    paddingRight: 14,
    gap: 6,
    background: img.is_selected ? "rgba(34,197,94,0.28)" : actionButtonStyle.background,
    color: img.is_selected ? "#22c55e" : actionButtonStyle.color,
    boxShadow: img.is_selected ? "0 0 14px rgba(34,197,94,0.35)" : undefined,
  }}
  aria-label={img.is_selected ? "Bỏ chọn ảnh" : "Chọn ảnh"}
  title={img.is_selected ? "Bỏ chọn ảnh" : "Chọn ảnh"}
>
  <CircleCheck size={18} fill={img.is_selected ? "#22c55e" : "none"} />
  <span className="text-sm font-semibold whitespace-nowrap">{img.is_selected ? "Đã chọn" : "Chọn"}</span>
</Button>
```
(Nếu `actionButtonStyle` có `width` cố định — spread trước, override `width:"auto"` sau như trên. Các nút khác GIỮ NGUYÊN.)

### B. `components/contracts/gallery/gallery-image-grid.tsx` — 2 chỗ
**B1 (dòng 191):** tile heart hiện luôn ở publicMode; admin giữ hover:
```tsx
className={`absolute ${publicMode ? 'right-2 bottom-2' : 'left-2 top-2'} z-20 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
  publicMode
    ? (isClientReacted ? "opacity-100" : "opacity-90")
    : (image.is_starred ? "opacity-100" : "opacity-0 group-hover:opacity-100")
}`}
```
kèm nền cho publicMode (dòng 192):
```tsx
style={publicMode ? { background: "rgba(0,0,0,0.28)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" } : overlayChipStyle}
```
**B2 (dòng 232-235):** chip `is_selected` đổi icon tim → CircleCheck xanh:
```tsx
{image.is_selected && (
  <span className="flex h-5 items-center justify-center rounded-full px-2" style={overlayChipStyle} title="Khách chọn">
    <CircleCheck size={12} className="fill-success/20 text-success" />
  </span>
)}
```
(import `CircleCheck` từ lucide-react; chip đếm tim dòng 237-242 GIỮ NGUYÊN.)

### C. `components/contracts/gallery/use-gallery-data.ts` — bỏ gộp, 2 dòng
**C1 (dòng 378):**
```ts
const totalHearts = images.filter((img) => (reactionCounts[img.id]?.hearts || 0) > 0).length;
```
**C2 (dòng 336):**
```ts
filtered = filtered.filter((g) => g.images.some((img) => (reactionCounts[img.id]?.hearts || 0) > 0));
```

### D. `components/contracts/gallery/gallery-toolbar.tsx` — tách stat gộp thành 2 (dòng 189-196)
Thay stat "khách chọn" hiện tại bằng 2 stat (import `CircleCheck`; prop `selectedCount` đã có sẵn dòng 84/130):
```ts
{
  icon: CircleCheck,
  label: "khách chọn",
  value: String(selectedCount),
  tone: "success",
  active: activeFilter === "selected",
  onClick: () => onSetActiveFilter(activeFilter === "selected" ? "all" : "selected"),
},
{
  icon: Heart,
  label: "thả tim",
  value: String(totalHearts),
  tone: "error",
  active: activeFilter === "hearted",
  onClick: () => onSetActiveFilter(activeFilter === "hearted" ? "all" : "hearted"),
},
```
Thêm `selectedCount` vào deps của `useMemo` (dòng 205). Nếu union type `tone` chưa có `"success"` → thêm vào union + map màu theo pattern tone hiện có trong file (Codex đọc cách `tone: "error"`/`"info"` đang render để làm y hệt).

### E. `app/actions/gallery-image-helpers.ts` — download tim = tim thật (dòng 122)
```ts
.filter((img) => heartedIds.has(img.id))
```
(`fetchAllSelectedDownloadFiles` đã lo phần chọn — không đụng.)

### F. `app/actions/gallery-admin-actions.ts` — thêm `heartCount` vào summaries (dòng 401-415, additive)
Sau khi RPC trả data:
```ts
// Đếm tim (reactions) per gallery — additive, 1 query
const galleryIds = data.map((g: any) => g.id);
const { data: heartRows } = await supabase
  .from("gallery_reactions")
  .select("gallery_id")
  .in("gallery_id", galleryIds)
  .eq("reaction_type", "heart");
const heartMap: Record<string, number> = {};
for (const row of heartRows || []) {
  heartMap[row.gallery_id] = (heartMap[row.gallery_id] || 0) + 1;
}
```
Trong `summaries = data.map(...)` thêm: `heartCount: heartMap[gallery.id] || 0,`

### G. `types/gallery.ts` — `GallerySummary` thêm `heartCount?: number;` (additive)

### H. `components/contracts/detail/drive-gallery-block.tsx` — card stats đúng nghĩa
- Interface `GalleryRow` (dòng 30-43) thêm `heartCount?: number;`
- Dòng 236:
```tsx
<span className="text-caption text-text-muted block truncate">
  {g.imageCount} ảnh
  {g.selectedCount > 0 ? ` · ✓ ${g.selectedCount} chọn` : ""}
  {(g.heartCount || 0) > 0 ? ` · ❤️ ${g.heartCount} tim` : ""}
</span>
```

### I. `components/contracts/gallery/gallery-image-list.tsx` — list view chip selected (dòng 187-190)
```tsx
) : image.is_selected ? (
  <span className="inline-flex items-center" title="Khách chọn">
    <CircleCheck size={14} className="fill-success/20 text-success" />
  </span>
) : null}
```
(import `CircleCheck`.)

## 3. CẤM (hard constraints)
- KHÔNG đụng `toggleReaction` / `toggleImageSelection` / RPC / migration.
- KHÔNG sync tim → is_selected (đổi nghiệp vụ = ADR riêng).
- KHÔNG xoá dead code (`detail/gallery-grid.tsx`, `detail/gallery-stats.tsx`, `gallery-virtual-grid.tsx`) — chỉ ghi nhận.
- KHÔNG sửa gì ngoài các dòng nêu trên; match style hiện có (inline style, comment tiếng Việt).
- Public gallery tab "ĐÃ CHỌN" (`public-gallery-client.tsx:368`) GIỮ NGUYÊN — đúng nghĩa is_selected sẵn rồi.

## 4. Locks
`components/gallery/image-viewer.tsx` · `components/contracts/gallery/{gallery-image-grid,gallery-toolbar,use-gallery-data,gallery-image-list}.tsx` · `components/contracts/detail/drive-gallery-block.tsx` · `app/actions/{gallery-admin-actions,gallery-image-helpers}.ts` · `types/gallery.ts`

## 5. Acceptance criteria + verify
1. `npx eslint <các file sửa>` 0 lỗi mới · `npm run build` pass.
2. Render @375px:
   - Public: tile thấy nút tim NGAY không cần hover; lightbox có pill "Chọn"→"Đã chọn" xanh.
   - Admin `/contracts/[id]` (HĐ "Văn Tiêm - Dịu Êm"): card hiện `95 ảnh · ✓ 1 chọn · ❤️ 4 tim`.
   - Admin `/contracts/[id]/gallery` cùng HĐ: toolbar hiện `✔ 1 khách chọn` VÀ `❤️ 4 thả tim` (hết "5 Khách chọn" gộp); bấm stat tim → chỉ ảnh có tim; bấm stat chọn → chỉ ảnh đã chọn.
3. Render @768px + @1023px: bottom bar lightbox + toolbar không vỡ.
4. Download "ảnh tim" chỉ tải ảnh có reaction.
