# Truy lỗi "trang in/xuất hợp đồng tự nhảy sang /dashboard" — 2026-10-20

Phạm vi: chỉ đọc + thử trên dev server cục bộ (dữ liệu prod chỉ đọc). Không sửa code app. Một đoạn ghi log tạm (`TEMP-NAV-DEBUG` trong `app/layout.tsx`, chỉ chạy ở development) đã được **gỡ bằng `git checkout`** sau khi thử.

## Hiện tượng gốc (2 lần, trong browser pane của Claude, dev server)

| Lần | Chuỗi sự kiện (log dev server + pane) |
|---|---|
| 1 | Lệnh điều hướng của pane tới `/contracts/<id>/print?isExportMode=true` báo lỗi `navigation to http://localhost:3000 was denied or failed` (chỉ có origin, không có đường dẫn) → server: `Compiling /contracts/[id]/print` · `GET …/print 200 in 5.5s` · `GET / 307` · `GET /dashboard 200` |
| 2 | Bấm link Xuất file (client nav) → lệnh pane "back" (popstate) → `unhandledRejection: InvalidStateError: Transition was aborted because of invalid state` → lệnh pane điều hướng thẳng tới trang in (`GET …/print 200 in 3.0s`) → trong lúc script đo đang chạy, trang bị điều hướng: `GET / 307` → `/dashboard` |

`GET /` luôn kết thúc ở `/dashboard` vì `app/page.tsx` chỉ có `redirect("/dashboard")`.

## Đã kiểm

### 1. Code app có chỗ nào tự điều hướng về `/` hay `/dashboard` không? → KHÔNG (đọc code)
- Client: `router.replace("/")` chỉ có ở `components/layout/offline-page-client.tsx` và **chỉ chạy khi bấm "Thử kết nối lại"**. `router.replace("/dashboard")` chỉ ở trang đăng nhập.
- Server: `redirect("/dashboard")` chỉ ở `app/page.tsx` (gốc) và `app/(protected)/productivity/page.tsx`; middleware (`lib/supabase/middleware.ts`) chỉ chuyển `/login` (chưa đăng nhập) và `/dashboard` (đang đăng nhập mà vào `/login`). `app/(protected)/contracts/layout.tsx` không chuyển hướng khi thiếu quyền (hiện `AccessDenied`).
- Các cơ chế tải lại (`ServiceWorkerUpdateReload`, `StaleServerActionRecovery`) đều `location.reload()` **cùng URL**, không về `/`; ServiceWorkerUpdateReload chỉ chạy ở production.

### 2. Thử tái hiện có ghi log điều hướng cấp tài liệu (Navigation API `navigate`, `pushState/replaceState`, `popstate`, `pagehide`, `unhandledrejection` — lưu sessionStorage, gắn từ đầu `<head>`)
| Kịch bản (viewport 375, mobile UA) | Kết quả |
|---|---|
| Chi tiết HĐ → bấm "Xuất file hợp đồng (PDF)" (client nav), chờ 12s | Ở lại trang in. Không có điều hướng lạ |
| Trên trang in: `history.back()` rồi `history.forward()` | Mỗi lần popstate sinh `InvalidStateError: Transition was aborted…`, **nhưng không nhảy trang** |
| Bấm link → lệnh pane "back" → lệnh pane điều hướng thẳng trang in (lặp lại chuỗi lần 2), chờ 10s | Ở lại trang in. Không có điều hướng lạ |
| Xoá `.next`, khởi động lại (route biên dịch nguội như lần 1) → điều hướng thẳng trang in | Ở lại trang in. Không có điều hướng lạ |
| Đổi kích thước pane (desktop ↔ mobile) trên trang in | Không có điều hướng |

**0/5 kịch bản tái hiện được.** Log cấp tài liệu không ghi nhận lần nào app tự khởi tạo điều hướng tới `/`.

### 3. `InvalidStateError: Transition was aborted because of invalid state` — có thật, nhưng không gây nhảy trang
- Nguồn: thư viện `next-view-transitions@0.3.5` (bọc ở `app/layout.tsx`). Khi có `popstate` (back/forward) nó gọi `document.startViewTransition(...)` mà không bắt lỗi promise.
- Trong pane, tài liệu luôn ở trạng thái `document.visibilityState = "hidden"` (đo được) → Chrome huỷ view transition → promise bị reject không ai bắt → `unhandledrejection`.
- Trang vẫn render bình thường sau đó (đã đo: `replaceState` của router chạy tiếp, trang đúng).
- Ngoài đời: chỉ xảy ra khi back/forward lúc tài liệu đang ẩn — chủ yếu là **nhiễu log/Sentry**, không đổi trang.

## Kết luận — CHƯA xác định được nguyên nhân

**Đã đo được:**
- Cả hai lần đều là điều hướng tới **`/` trần** (`GET / 307` → `/dashboard`), không phải tới `/dashboard` trực tiếp.
- App **không có đường code nào** tự điều hướng tới `/` trần: không có link `href="/"` (grep 0 kết quả), `router.replace("/")` duy nhất nằm ở nút "Thử kết nối lại" của trang offline (phải bấm). Mọi đường về dashboard khác đều nhắm thẳng `/dashboard` (đăng nhập, productivity, middleware).
- 5 kịch bản có log điều hướng cấp tài liệu: 0 lần tái hiện; không lần nào app tự khởi tạo điều hướng.

**Đính chính:** bản đầu của báo cáo này coi câu lỗi `navigation to http://localhost:3000 was denied or failed` là dấu hiệu pane điều hướng về gốc preview. **Sai** — thử điều hướng pane tới một cổng không có gì (`http://localhost:3999/khong-ton-tai`) cho thấy công cụ luôn chỉ in **origin của URL đích** trong câu lỗi; tab nằm lại ở trạng thái lỗi, không tự về gốc. Câu đó không chứng minh gì.

**Giả thuyết còn lại (suy ra, chưa kiểm được):**
1. Ngoài app (môi trường pane): cả hai lần xảy ra trên trang **xuất PDF** ngay sau khi tải, đúng lúc trang tự dựng PDF (html2canvas tốn bộ nhớ) — nếu tiến trình trang bị sập, pane có thể nạp lại tab ở URL gốc của preview `http://localhost:3000`. Không có quyền xem log của pane để xác nhận.
2. Hành vi trình duyệt/Next.js chưa biết. Chưa tìm thấy bằng chứng.

**Liên quan điện thoại thật (bối cảnh, không phải kết luận):** `public/manifest.json` có `start_url: "/login?source=pwa"`. Người đã đăng nhập vào `/login` sẽ bị middleware chuyển về `/dashboard`. Nếu app cài dạng PWA bị hệ điều hành đóng rồi mở lại (ví dụ lúc đang ở bảng chia sẻ hoặc chạy nền), người dùng sẽ thấy app "về dashboard". Chưa kiểm chứng được trên máy thật; cần chủ cho biết máy, cách mở (Safari / app cài PWA / Zalo / Messenger), lối vào (nút trong trang chi tiết mở cùng tab; icon ở drawer danh sách mở `target="_blank"`) và thao tác ngay trước đó.

## Phát hiện phụ
1. **Dev server trả 404 cho MỌI trang sau khi chạy `npm run build`** (dev và build dùng chung `.next`). Cách xử: dừng dev, xoá `.next`, khởi động lại. Không ảnh hưởng prod.
2. `next-view-transitions` sinh `unhandledrejection` khi back/forward lúc tài liệu ẩn (mục 3) — nhiễu Sentry, chưa sửa (sửa = bọc/thay thư viện, cần chủ quyết).

## Cập nhật sau khi chủ trả lời (20/10): iPhone · app cài màn hình chính (PWA) · "gặp khá nhiều, không chỉ riêng nút xuất"
Đo thêm (dev cục bộ):
- `public/manifest.json` → `start_url: "/login?source=pwa"`; mở URL này khi đang đăng nhập → **1 lần chuyển hướng về `/dashboard`** (đo `redirectCount=1`).
- Trang cần đăng nhập mà không có phiên (curl, request tài liệu và RSC) → `307 → /login` **không mang theo trang đang mở**.
- Token phiên `ES256`, sống 3600s → middleware chỉ gọi mạng khi token hết hạn (refresh); `getClaims()` lỗi mạng trả `error` và middleware coi mọi lỗi là chưa đăng nhập.

Hai cơ chế khớp triệu chứng của chủ, cùng một điểm hỏng — **đi qua `/login` thì đích luôn là `/dashboard`, trang gốc bị bỏ**:
1. **iOS đóng app chạy nền, mở lại** → `start_url` → `/dashboard` (cơ chế phía app đã đo; hành vi iOS chưa kiểm trên máy thật).
2. **Quay lại app sau > 1 giờ, refresh token lỗi thoáng qua** → bị coi là chưa đăng nhập → `/login` → request sau refresh được → `/dashboard`, ở bất kỳ trang nào.

Đã loại trừ (đo DB): tranh chấp refresh token song song — 30 ngày qua 0 refresh token cha có > 1 con.

Đề xuất sửa: `agent/HANDOFFS/T-20261020-giu-trang-sau-auth.spec.md` + ADR-021 trong `agent/DECISIONS.md` (chủ duyệt 20/10). Hai lần nhảy trong pane (mục đầu báo cáo) vẫn chưa xác định nguyên nhân; không liên quan trực tiếp tới iPhone.

