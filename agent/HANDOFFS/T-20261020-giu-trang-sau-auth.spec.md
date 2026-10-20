# T-20261020-giu-trang-sau-auth — Hết "tự nhảy về /dashboard" trên iPhone (app cài màn hình chính)

**Owner:** claude (spec → chủ duyệt → claude code → verify → chủ xem diff → push) · **Trạng thái:** ✅ chủ duyệt 20/10 (cùng ADR-021) · code + test + verify XONG (§7) · chủ duyệt cả phần sửa cookie, cho commit + push 20/10 · **Mức:** 🟠 trung bình–cao (chủ gặp "khá nhiều", mất ngữ cảnh đang làm) · **DB:** không · **Chạm:** middleware xác thực (`lib/supabase/middleware.ts`) + đăng nhập + AppShell → luồng chuyển hướng xác thực, có rủi ro open-redirect ⇒ cần chủ duyệt (xem §6 về ADR) · **Nguồn:** `docs/reports/investigate_2026-10-20_tu-nhay-dashboard.md`.

## 0. Chủ báo (20/10)
iPhone · mở bằng **app cài ở màn hình chính (PWA)** · "lỗi tự nhảy sang /dashboard trước đây mình đã gặp khá nhiều chứ không phải chỉ riêng nút xuất".

## 1. Sự thật đã đo (dev cục bộ, dữ liệu prod chỉ đọc)
| # | Đo | Kết quả |
|---|---|---|
| 1 | `public/manifest.json` | `start_url: "/login?source=pwa"` |
| 2 | Mở `/login?source=pwa` khi **đang đăng nhập** (pane) | 1 lần chuyển hướng → **`/dashboard`** (`redirectCount=1`) — middleware: đã đăng nhập mà vào `/login` thì luôn về `/dashboard` |
| 3 | Gọi trang cần đăng nhập **không có phiên** (curl, cả request tài liệu lẫn RSC) | `307 → /login` — **không mang theo trang đang mở** (`redirectWithCookies` xoá `search`, không có `next`) |
| 4 | Token phiên | `ES256` (ký bất đối xứng), sống **3600s** → middleware `getClaims()` kiểm cục bộ, **chỉ gọi mạng khi token đã hết hạn** (refresh) |
| 5 | `getClaims()` (auth-js) khi refresh lỗi mạng | trả `{ data: null, error }` (đọc mã `GoTrueClient.getClaims` → `getSession()`); middleware coi **mọi** lỗi = chưa đăng nhập (`catch` + `!error && …`) → `/login` |

## 2. Hai cơ chế dẫn tới "về /dashboard" (ghép từ §1)
- **C1 — App bị iOS đóng rồi mở lại:** mở lại app cài màn hình chính = mở `start_url` `/login?source=pwa` → (#2) → `/dashboard`. Trang đang làm dở mất. *Việc iOS đóng app chạy nền là hành vi hệ điều hành, chưa kiểm được trên máy thật; cơ chế phía app (#1, #2) đã đo.*
- **C2 — Lỗi xác thực thoáng qua:** quay lại app sau > 1 giờ → token hết hạn → request đầu tiên phải refresh qua mạng; nếu refresh lỗi/timeout (mạng di động, app vừa thức dậy) → (#5) bị coi là chưa đăng nhập → (#3) `/login` → request kế tiếp refresh được → (#2) `/dashboard`. Người dùng không thấy trang đăng nhập, chỉ thấy "nhảy về dashboard" — ở **bất kỳ trang nào**.

Cả hai cùng một điểm hỏng: **mỗi lần đi qua `/login`, đích đến bị cứng là `/dashboard`, trang gốc bị bỏ.**

## 3. Phạm vi sửa (một nguồn sự thật cho "trang quay về")
1. **`lib/navigation/safe-return-path.ts` (mới, hàm thuần)** — `toSafeReturnPath(raw, appOrigin): string | null`. **Kiểm theo origin, không theo tiền tố chuỗi** (trình duyệt bỏ ký tự tab/xuống dòng trong URL nên `/\t/evil.com` thành `//evil.com`; dạng %-mã hoá được giải mã khi phân tích): (a) từ chối nếu có ký tự điều khiển/khoảng trắng; (b) phải bắt đầu bằng `/` và không bắt đầu `//` hay `/\`; (c) `new URL(raw, appOrigin)` chỉ nhận khi `.origin === appOrigin`; (d) loại trừ `/login` `/auth` `/api` `/_next` `/offline` `/account-disabled` và mọi đường chứa `/print`; (e) dài ≤ 512; trả về **chỉ** `pathname + search` của URL đã phân tích. Dùng chung cho middleware, trang đăng nhập, cookie.
1b. **`lib/navigation/auth-redirect.ts` (mới, hàm thuần)** — `decideAuthRedirect(...)` → `{ redirectTo } | null` và `isRetryableAuthError(error)`. Middleware chỉ gọi các hàm này; mọi nhánh có unit test (C2 không tái hiện trực tiếp được nên kiểm bằng test nhánh).
2. **Middleware — chưa đăng nhập vào trang cần đăng nhập (request GET):** chuyển `/login?next=<đường dẫn + query hiện tại>` thay vì `/login` trần.
3. **Middleware — đã đăng nhập mà vào `/login`:** đích = `toSafeReturnPath(next)` ?? (nếu `source=pwa`: `toSafeReturnPath(cookie mood_last_path)`) ?? `/dashboard`.
4. **Middleware — lỗi thoáng qua:** nếu `getClaims()` trả lỗi kiểu thử lại được (`AuthRetryableFetchError` / status 0 hoặc ≥ 500 / lỗi mạng) thì gọi lại **1 lần ngay, không chờ** trước khi kết luận chưa đăng nhập. (Nếu vẫn lỗi thì bước 2–3 vẫn đưa người dùng về đúng trang.)
5. **Ghi trang đang mở — `components/layout/last-path-cookie.tsx` (mới), gắn trong `AppShell`:** mỗi khi đổi trang, ghi cookie `mood_last_path` = đường dẫn + query qua `toSafeReturnPath` (nên **không bao giờ lưu trang `/print`** — tránh mở lại app là tự dựng PDF), `Path=/`, `SameSite=Lax`, **`Max-Age` mặc định 12 giờ** (mở lại app hôm sau thì về dashboard như cũ; chủ đổi được), `Secure` ở https.
5b. **Cập nhật test đang dựa vào `/login` trần:** `tests/e2e/visual-temp.spec.ts:166` dùng `page.url().endsWith("/login")` → đổi thành `includes("/login")`. Đã grep: các spec e2e khác chỉ `goto("/login")` rồi chờ `/dashboard` (không đổi vì không có `next`); `scripts/qa-contracts-tablet.mjs` dùng `includes`; `scripts/smoke-settings.mjs` chỉ kiểm callback Google.
6. **Trang đăng nhập:** đăng nhập thành công → `router.replace(toSafeReturnPath(next) ?? "/dashboard")`.
7. Không đổi `start_url` (giữ `/login?source=pwa` để máy chưa đăng nhập vẫn vào đúng trang đăng nhập).

## 4. Verify (số chờ điền)
| Kiểm | Cách | Chờ |
|---|---|---|
| Hàm an toàn | jest `tests/unit/safe-return-path.test.ts`: `/contracts/x?a=1` ✓; `//evil.com`, `/\evil.com`, `/\t/evil.com`, `/%2F%2Fevil.com`, `/%5Cevil.com`, `https://evil.com`, `javascript:alert(1)`, `javascript%3Aalert(1)`, `/login`, `/api/x`, `/contracts/x/print?isExportMode=true`, rỗng, ký tự điều khiển, > 512 ký tự → không cho ra ngoài origin / `null` | pass |
| Quyết định chuyển hướng | jest `tests/unit/auth-redirect.test.ts`: mọi nhánh `decideAuthRedirect` + `isRetryableAuthError` | pass |
| Chưa đăng nhập | curl không cookie `GET /contracts/<id>` và RSC | `307 → /login?next=%2Fcontracts%2F<id>` |
| Đã đăng nhập + `next` | pane: `/login?next=/contracts/<id>` | về `/contracts/<id>` |
| Mở lại app (C1) | pane: vào HĐ-0075 → mở `/login?source=pwa` | về HĐ-0075, không phải dashboard |
| Open-redirect | pane: `/login?next=//evil.com`, `next=https://evil.com`, `next=/\evil.com` | `/dashboard`, không rời domain |
| Không vòng lặp | `next=/login` | `/dashboard` |
| Cookie | DevTools sau khi đi 3 trang | `mood_last_path` = trang cuối |
| Lint/type/build | eslint các file đổi (exit 0), `tsc --noEmit`, `npm run build` | sạch |
| E2E | **không chạy** e2e đăng nhập (chạm DB prod); dùng curl + pane | — |
| Máy thật | sau push: chủ dùng app cài trên iPhone, chuyển sang app khác vài phút rồi quay lại; để máy > 1 giờ rồi mở | ở lại đúng trang |

## 5. Ngoài phạm vi
- `next-view-transitions` gây `unhandledrejection` khi back/forward lúc tài liệu ẩn — nhiễu Sentry, không gây nhảy trang.
- `app/(protected)/calendar/page.tsx` `redirect("/")` khi không có quyền lịch — chỉ ảnh hưởng vai không có module lịch.
- Trạng thái trong trang (cuộn, form đang nhập) khi iOS đóng app — không giữ được bằng thay đổi này.
- Đăng nhập bằng Google (callback OAuth không mang `next`) — không liên quan C1/C2 vì chủ đã đăng nhập sẵn.
- Đã loại trừ (đo DB): tranh chấp refresh token song song — 30 ngày qua **0** refresh token cha có > 1 con.

## 6. Rủi ro & câu hỏi cho chủ
- **Open-redirect:** mọi đích đều qua `toSafeReturnPath` + test §4. Không nhận URL tuyệt đối.
- **ADR-021** trong `agent/DECISIONS.md` (Accepted cùng spec). Ghi chú: lệnh ghi spec v2 + ADR-021 ở lượt trước bị lỗi (heredoc) nên lúc chủ duyệt file trên đĩa vẫn là bản v1; nội dung v2 (kiểm theo origin, không lưu `/print`, cookie 12 giờ, hàm quyết định thuần + test, thử lại ngay) được ghi ngay sau khi duyệt.
- Cookie `mood_last_path` chỉ chứa đường dẫn trong app (có id hợp đồng), không có dữ liệu cá nhân.
- Đường lùi: `git revert` (không đụng DB).

## 7. Kết quả (20/10/2026) — code + test + verify xong, CHƯA commit/push

### Phát hiện thêm khi làm (ngoài 6 mục §3, đã sửa kèm vì cùng file và cùng triệu chứng) — chủ xác nhận 20/10
**Middleware làm rơi cookie phiên vừa refresh.** Khi đã đăng nhập, `lib/supabase/middleware.ts` tạo lại `NextResponse.next(...)` để gắn header vai trò — response mới **không mang Set-Cookie** mà `setAll` vừa ghi khi `getClaims()` refresh token. Hệ quả: trình duyệt giữ refresh token đã bị xoay vòng → lần refresh sau bị Supabase từ chối ("Already Used") → đăng xuất / bị đẩy về `/login` (đúng loại lỗi `@supabase/ssr` cảnh báo: "random logouts, early session termination"). Xảy ra đúng lúc middleware phải tự refresh — tức là **mở lại app sau > 1 giờ** (trên iPhone, JS của trang bị treo khi chạy nền nên client không kịp tự refresh). Sửa: **chỉ khi có refresh** (`setAll` đã chạy) mới chép cookie từ response cũ sang response mới + cho request đi xuống mang cookie mới (`request.cookies.toString()`); không refresh thì không đụng cookie (có test riêng).
- **Đo:** test `tests/unit/auth-middleware.test.ts` chạy trên **mã cũ (HEAD)**: test cookie FAIL (Set-Cookie không có cookie mới) cùng 6 test chuyển hướng → 4/11 pass; trên mã mới 11/11.

### File đổi
`lib/navigation/safe-return-path.ts` (mới) · `lib/navigation/auth-redirect.ts` (mới) · `lib/supabase/middleware.ts` · `components/layout/last-path-cookie.tsx` (mới) · `components/layout/app-shell.tsx` (+3 dòng) · `components/auth/login-page-client.tsx` (+3/−1) · `tests/unit/safe-return-path.test.ts`, `tests/unit/auth-redirect.test.ts`, `tests/unit/auth-middleware.test.ts` (mới). `tests/e2e/visual-temp.spec.ts` đã đổi `endsWith` → `includes` nhưng file này nằm trong `.gitignore` (file tạm) nên không vào commit.

### Số đo
| Kiểm | Kết quả |
|---|---|
| jest `safe-return-path` + `auth-redirect` | **43/43** (gồm `/\t/evil.com`, `/%2F%2Fevil.com`, `/%5Cevil.com`, `javascript%3Aalert(1)`, trang `/print`, vòng lặp `/login`) |
| jest `auth-middleware` (middleware thật, Supabase giả lập) | **12/12** mới (thêm test "không refresh thì không đụng cookie"); **4/11** trên mã cũ (đo trước khi thêm test thứ 12) |
| jest toàn bộ `tests/unit` | 618 pass · 13 fail ở 4 suite **có sẵn từ trước** (gallery-note-download, moodie-*) — đã đo cùng 4 suite đó fail trên HEAD sạch |
| eslint 9 file đổi/mới | exit 0, 0 lỗi, 0 cảnh báo |
| `tsc --noEmit` / `npm run build` | exit 0 / exit 0 |
| curl không phiên (dev) | `/contracts/<id>` → `307 /login?next=%2Fcontracts%2F<id>` · `/contracts?tab=all` → `next=%2Fcontracts%3Ftab%3Dall` · trang in → `/login` trần · `POST` → `/login` trần · `/login?next=…` → 200 (form đăng nhập) |
| Pane (phiên đăng nhập của chủ, không đăng xuất) | vào HĐ-0075 → cookie `mood_last_path` = trang chi tiết; vào trang in → cookie **giữ** trang chi tiết; `/login?source=pwa` → **về HĐ-0075** (trước: `/dashboard`); `/login?next=/finance/receipts` → về Phiếu thu; `next=//evil…`, `https://evil…`, `/\evil…`, `/login` → `/dashboard` cùng origin |

### Khi nào có hiệu lực sau khi push
- Middleware (`next`, thử lại, sửa cookie): phía máy chủ — có hiệu lực ngay khi Vercel deploy xong.
- Cookie trang cuối (`LastPathCookie`): phía máy — chỉ ghi khi app cài trên iPhone đã chạy bản mới (bản cập nhật áp ở lần chuyển trang kế tiếp) và chủ đã vào ít nhất một trang. Trước đó mở lại app vẫn về `/dashboard` vì chưa có cookie.
- Kiểm sau deploy, không cần đăng nhập: `curl -sI https://<domain>/contracts/<id>` → `307` tới `/login?next=%2Fcontracts%2F<id>`; `curl -sI https://<domain>/login` → `200` (không vòng lặp). Lùi: `git revert <sha>` rồi push.
- Chủ thử trên iPhone (trong 12 giờ): mở app, đi vài trang → mở 1 hợp đồng, chuyển sang app khác vài phút rồi quay lại → để máy > 1 giờ rồi mở lại; mỗi lần phải ở lại đúng trang và ít bị đăng xuất bất ngờ hơn.

### Chưa kiểm được
- Luồng **đăng nhập bằng form rồi quay về `next`** trên trình duyệt thật: cần đăng xuất phiên của chủ trong pane — không làm; phủ bằng unit test (`toSafeReturnPath` + mã 3 dòng ở `login-page-client.tsx`).
- iPhone thật (app cài màn hình chính): chỉ kiểm được sau khi push.
