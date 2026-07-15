# SPEC — T-20260715-gallery-password-gating (+ T-20260715-css-spacing-tokens)

- **Ngày:** 2026-07-15 · **Trạng thái:** chờ user duyệt
- **Nghiệp vụ user chốt (nguyên văn):** *"album ngoài giao cô dâu, chú rể, thì họ còn share cho người thân, bạn bè, chúng ta chỉ cần pass khi họ bấm chọn (vì hình họ chọn nhân sự mood phải lọc ra để hậu kì, hoặc in ấn nên chỉ dâu rể có pass mà admin cung cấp mới đc chọn), còn lại xem thì vẫn đc"*

## Ma trận quyền (chốt)

| Hành động | Ai | Mật khẩu? |
|---|---|---|
| Xem album | Mọi người có link | KHÔNG |
| Thả tim ❤️ | Mọi người có link | KHÔNG *(hiện tại đang hỏi pass — SAI, phải bỏ)* |
| Chọn ảnh ✓ | Chỉ dâu rể (admin cấp pass) | CÓ *(hiện tại fail im lặng — SAI, phải hiện modal pass)* |
| Ghi chú ảnh | Đi cùng chọn (input hậu kỳ) | CÓ — cùng gate với chọn |

**Giả định nêu rõ (user phủ quyết nếu sai):** ghi chú ảnh cần pass như chọn (vì là chỉ dẫn hậu kỳ). Comment (bình luận) giữ nguyên hành vi hiện tại — ngoài scope.

---

# TASK 1 — T-20260715-css-spacing-tokens (làm TRƯỚC, độc lập)

## Root cause (đo thực nghiệm trên prod bằng chrome-devtools)
`app/globals.css:128-133` define `--spacing-xs/sm/md/lg/xl` trong `@theme` — namespace `--spacing-*` là **spacing scale đặc biệt của Tailwind v4** → utility `max-w-sm` bị generate thành `max-width: var(--spacing-sm)` = **8px** (đo được), tương tự xs=4px, md=12px, lg=24px, xl=32px. **18 chỗ / 15 file vỡ**: heart-password-modal (cột 48px), 7 trang error module, access-denied, offline-page, mobile-bottom-bar, moodie-filters, QuoteModernView, account-disabled, productivity/loading.

## Fix: rename namespace `--spacing-*` → `--space-*`
1. `app/globals.css` dòng 128-136: đổi 7 token: `--spacing-xs`→`--space-xs`, `--spacing-sm`→`--space-sm`, `--spacing-md`→`--space-md`, `--spacing-base`→`--space-base`, `--spacing-lg`→`--space-lg`, `--spacing-xl`→`--space-xl`, `--spacing-main-y`→`--space-main-y`. GIỮ comment y nguyên.
2. Toàn repo: thay **mọi** `var(--spacing-xs|sm|md|base|lg|xl|main-y)` → `var(--space-...)`. Đã đếm: **54 chỗ** trong components/, app/, lib/ (tsx/ts/css). Tìm bằng: `grep -rn "var(--spacing-" --include="*.tsx" --include="*.ts" --include="*.css" components/ app/ lib/`
3. KHÔNG đổi `--spacing` (không hậu tố, = .25rem — của Tailwind, không phải của dự án). KHÔNG đụng token khác.
4. Đã verify: KHÔNG ai dùng class `p-sm`/`gap-md`/... (match `w-md` chỉ là lẹm từ `max-w-md`) → rename không làm chết utility nào. Ngoại lệ cần kiểm khi làm: 1 hit `h-xl` — xác định nó là gì trước, nếu là class `h-xl` thật thì báo lại, đừng tự xử.

## Verify Task 1
- `grep -rn "var(--spacing-" --include="*.tsx" --include="*.ts" --include="*.css" components/ app/ lib/ | grep -v globals.css` → 0 kết quả
- `npm run build` pass
- Render: modal mật khẩu (hoặc bất kỳ trang error nào, vd /contracts khi lỗi) — box rộng bình thường ~384px, không còn cột 48px

---

# TASK 2 — T-20260715-gallery-password-gating

## Thiết kế: token 2 tầng, capability EXACT match (không đụng lib/gallery-access.ts)
- Album KHÔNG pass: như hiện tại — `getPublicGallery` cấp token capability mặc định (`getGalleryCapability` = thường "select"). Không đổi gì.
- Album CÓ pass: `getPublicGallery` cấp **view-token** (`buildGalleryAccessToken(data, "view")`) thay vì `undefined`. Ai cũng tim được. Nhập đúng pass (verifyGalleryPassword — có sẵn) → nhận **select-token** → chọn/ghi chú được.

## Thay đổi từng file

### A. `app/actions/gallery-public-actions.ts` — getPublicGallery (dòng 52-58)
```ts
accessToken: galleryHasPassword(data) ? buildGalleryAccessToken(data, "view") : buildGalleryAccessToken(data),
tokenCapability: galleryHasPassword(data) ? ("view" as const) : getGalleryCapability(data),
```
(giữ `needsPassword` như cũ; import buildGalleryAccessToken/getGalleryCapability nếu chưa có — kiểm imports đầu file.)

### B. `app/actions/gallery-core.ts` — requirePublicGalleryImageAccess (dòng 315-354)
Thêm param cuối `requiredCapability: GalleryShareCapability = "select"` và dòng 331 đổi thành:
```ts
if (!assertGalleryProof(gallery, accessToken, requiredCapability)) {
```
⚠️ Default "select" → MỌI caller hiện tại giữ nguyên hành vi. Codex phải liệt kê caller (grep `requirePublicGalleryImageAccess(`) trong báo cáo để chứng minh không caller nào bị đổi ngoài ý muốn.

### C. `app/actions/gallery-reaction-actions.ts` — toggleReaction (dòng 52-57)
Tim chấp nhận view-token: truyền capability "view" **và** fallback token đầy đủ (2 lần verify — hàm pure, rẻ). Cách gọn: đổi call thành thử "view" trước, nếu fail thử mặc định:
```ts
// Tim = hành động xã giao — chấp nhận view-token (album có pass) LẪN token đầy đủ (album không pass)
let access;
try {
  access = await requirePublicGalleryImageAccess(supabase, accessUrl.trim(), accessToken.trim(), imageId, "view");
} catch {
  access = await requirePublicGalleryImageAccess(supabase, accessUrl.trim(), accessToken.trim(), imageId);
}
const { gallery } = access;
```

### D. `components/gallery/public-gallery-client.tsx`
1. State: đổi `pendingHeartImageId` → `pendingSelectImageId`; thêm `tokenCapability` đọc từ `gallery.tokenCapability` (prop mới qua Gallery type — xem F). Giữ `heartAccessToken`/unlock flow nhưng đổi ngữ nghĩa: unlock = nhận select-token.
2. `handleToggleReaction` (dòng 292-298): **BỎ** gate mật khẩu — tim luôn chạy với token hiện có (view hoặc select). Xoá nhánh `if (!accessToken) { setShowHeartPasswordModal... }` — thay bằng dùng token hiện tại.
3. `handleToggleStar` (dòng 193-244): THÊM gate ở đầu:
```ts
if (gallery.needsPassword && currentTokenCapability !== "select") {
  setPendingSelectImageId(imageId);
  setShowPasswordModal(true);
  return;
}
```
(`currentTokenCapability`: state khởi tạo từ `gallery.tokenCapability`, đổi thành "select" trong `onUnlocked`.)
4. `onUnlocked` (dòng 433+): lưu select-token vào state + sessionStorage (pattern có sẵn), set capability "select", rồi **retry pendingSelectImageId** (gọi handleToggleStar lại cho ảnh chờ).
5. Ghi chú (handleSaveNote): thêm cùng gate như handleToggleStar (needsPassword && !select → mở modal).
6. Khởi tạo: đọc sessionStorage `gallery_access_<id>` (pattern có sẵn trong HeartPasswordModal) lúc mount → nếu có token đã lưu thì dùng + coi là select.

### E. `components/gallery/heart-password-modal.tsx` — đổi copy cho đúng nghiệp vụ
- Title: `Mật khẩu thả tim` → `Mật khẩu chọn ảnh`
- Mô tả: `{galleryTitle} yêu cầu mật khẩu khi khách bấm thả tim.` → `Nhập mật khẩu do Mood cung cấp để chọn ảnh gửi hậu kỳ.`
- Lỗi dòng 37: `Vui lòng nhập mật khẩu để thả tim.` → `Vui lòng nhập mật khẩu để chọn ảnh.`
- (Cân nhắc đổi tên file/component = KHÔNG — giữ tên file tránh diff lan; chỉ đổi copy. Ghi chú lại tên không còn khớp nội dung.)

### F. `types/gallery.ts` — Gallery thêm `tokenCapability?: "select" | "view" | "download";` (additive)

## CẤM
- KHÔNG đụng `lib/gallery-access.ts` (verify EXACT giữ nguyên — download routes đang dựa vào).
- KHÔNG đụng PasswordGate (dead code — ghi nhận, không xoá, không nối).
- KHÔNG đổi addComment/comment flow.
- KHÔNG đổi admin flows (toggleImageStar, gallery-settings-modal). Label toggle admin "Bảo vệ album bằng mật khẩu" → đổi thành **"Yêu cầu mật khẩu khi chọn ảnh"** (1 dòng copy, tìm trong gallery-settings-modal.tsx) — cho khớp nghiệp vụ thật.

## Verify Task 2 (render + data)
1. Album có pass ("Văn Tiêm" bật lại toggle):
   - Khách (ẩn danh): XEM ok · **TIM ok không hỏi pass** (kiểm `gallery_reactions` +1) · **CHỌN → modal "Mật khẩu chọn ảnh"** (layout chuẩn sau Task 1) · nhập sai → báo lỗi · nhập đúng → ảnh được chọn (`is_selected` = true) + các lần chọn sau không hỏi lại.
   - Ghi chú: bị gate như chọn.
2. Album không pass: mọi thứ như trước (tim + chọn tự do).
3. `npx eslint` các file sửa 0 lỗi mới + `npm run build` pass.
4. Session hết hạn/token cũ (access_version đổi): chọn → mở lại modal (không im lặng).
