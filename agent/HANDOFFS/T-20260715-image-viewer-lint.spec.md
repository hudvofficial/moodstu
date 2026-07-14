# SPEC — T-20260715-image-viewer-lint

- **Task:** T-20260715-image-viewer-lint — Làm sạch lint `components/gallery/image-viewer.tsx` (10 lỗi: 1 bug hook + 9 SSOT)
- **Từ → Đến:** claude (spec) → **user duyệt** → codex (implement)
- **Branch / worktree:** `codex/image-viewer-lint` / `.worktrees/image-viewer-lint`
- **Locks (độc quyền):** `components/gallery/image-viewer.tsx` ONLY
- **Ngày:** 2026-07-15
- **Loại:** dogfood pipeline lần đầu (Claude→Codex→Roo→CI→merge)

## 1. Mục tiêu
`image-viewer.tsx` **0 lỗi eslint**, trong đó fix đúng **1 bug runtime thật** (hook có điều kiện) mà KHÔNG đổi giao diện/hành vi của lightbox gallery public.

## 2. Vì sao task này (bối cảnh)
- CI (`quality`) lint **file thay đổi**. Chạm file này → CI soi cả 10 lỗi. Muốn PR xanh phải sạch cả file.
- Lỗi `rules-of-hooks` (267) là **bug thật**: cùng lớp bug "Rendered more hooks" từng nổ ở /calendar (LESSONS A13).

## 3. 10 lỗi phải xử lý (nguồn: `npx eslint components/gallery/image-viewer.tsx`)

| Dòng | Rule | Nội dung |
|---|---|---|
| **267:27** | `react-hooks/rules-of-hooks` | `useCallback` (handleLongPress) gọi SAU early return `if (!img) return null` (233) |
| 525:14 · 578:14 · 595:14 · 636:18 · 654:18 · 676:14 · 689:16 · 709:14 | `react/forbid-elements` | native `<button>` → phải dùng `<Button>` từ `@/components/ui/button` |
| 672:59 | `no-restricted-syntax` | arbitrary Tailwind `fill-[#ff3b30] text-[#ff3b30]` → semantic token |

## 4. Cách fix (theo nhóm — Codex tự quyết chi tiết trong ràng buộc)

**4a. Bug hook (267):** Chuyển khai báo `const handleLongPress = useCallback(...)` (267–~300) lên **TRƯỚC** dòng `if (!img) return null;` (233), đặt cùng cụm hook với các `useEffect` phía trên. Callback đã tự guard `if (!showDownloadButton || !img) return;` nên chạy trước null-guard vẫn an toàn. Lưu ý `downloadFileName` (235) định nghĩa sau guard → tính giá trị đó **bên trong** callback (`img.file_name || "photo.jpg"`, đã có guard `!img`) thay vì tham chiếu biến ngoài. `handleLongPress` là hook DUY NHẤT sau 233 (đã verify) — không có hook nào khác cần chuyển.

**4b. 8 native `<button>` → `<Button>`:** Các button dùng **inline `style={{...actionButtonStyle, ...}}`** + `onClick`/`aria-*`/`title`. Dùng `<Button asChild>` HOẶC `<Button variant="ghost" size="icon">` sao cho **giữ NGUYÊN**: mọi `style` inline, `onClick`, `aria-label/title/aria-disabled`, `type`, và icon con. **KHÔNG được đổi diện mạo/hành vi** — đây là lightbox gallery public. Đọc `components/ui/button.tsx` để chọn cách giữ style inline không bị variant đè (có thể cần `variant`/`className` phù hợp hoặc `asChild`).

**4c. Arbitrary Tailwind (672):** `#ff3b30` = màu đỏ "heart". Thay `fill-[#ff3b30] text-[#ff3b30]` bằng **semantic token có sẵn** — grep `app/globals.css` / `components.css` / token đỏ hiện có (vd `text-destructive`, hoặc biến `--...` cho heart/like). **KHÔNG tự bịa token mới**; nếu không có token phù hợp → DỪNG, viết handoff hỏi Claude (đừng đoán màu).

## 5. Ràng buộc cứng (đọc kỹ)
- **Surgical:** chỉ đụng đúng 10 chỗ lỗi + phần bắt buộc để fix (vd chuyển hook). KHÔNG refactor/format phần khác của file. Mỗi dòng đổi trace về 1 lỗi trong §3.
- **Chỉ file `image-viewer.tsx`** (lock). Nếu buộc phải đụng file khác (vd thêm token vào css) → DỪNG, handoff Claude (đổi lock = đổi spec).
- **KHÔNG đổi kiến trúc** (không thêm lib, không đổi data-flow). Chỉ là lint/bug-fix cục bộ.
- Giữ style hiện có của file (inline style, comment tiếng Việt).

## 6. Acceptance (phải đạt hết)
1. `npx eslint components/gallery/image-viewer.tsx` → **0 error, 0 warning mới** (warning cũ không phát sinh thêm).
2. `npm run build` xanh.
3. **Roo verify render** (bắt buộc — có đổi UI): mở lightbox gallery, kiểm **pixel-giống trước khi sửa** + hoạt động đủ: chuyển ảnh (←/→), nút Download, Print, Note (mở/gõ/auto-save), Heart/Star, long-press download (non-iOS), đóng (X/Esc). Screenshot @ desktop + @768.
4. Bug hook: không còn cảnh báo, và không tái hiện lỗi "Rendered more hooks" khi `images` rỗng / `img` undefined (test mở viewer với danh sách rỗng).

## 7. Verify (lệnh cụ thể)
- Codex (local, trước handoff Roo): `npx eslint components/gallery/image-viewer.tsx` + `npm run build`.
- Roo: chạy app, mở 1 gallery public có ảnh → thao tác §6.3 + screenshot; thử mở viewer khi `images=[]` (§6.4).
- CI: PR `codex/image-viewer-lint` → job `quality` xanh (lint-diff sẽ soi đúng file này).

## 8. Câu hỏi mở / rủi ro
- **Rủi ro chính:** convert `<button>`→`<Button>` làm lệch diện mạo lightbox (variant đè inline style). → Roo verify pixel là chốt chặn; lệch → Codex chỉnh `variant`/`asChild` cho khớp.
- Token đỏ heart: nếu không có token semantic sẵn → handoff Claude quyết (đừng bịa).
