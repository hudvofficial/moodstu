# T-20261102-google-oauth-calendar-reliability — Hoàn thiện Google OAuth / Calendar lỗi bị ẩn

**Ngày:** 2026-11-02. **PO:** yêu cầu "tiến hành triển khai cho hoàn thiện"; sau đó ủy quyền toàn bộ xử lý kỹ thuật ("PO giao full quyền cho bạn để fix tối ưu"). **Trạng thái:** FIX + VERIFY, ủy quyền phát hành khi kiểm thử đạt; phải ghi rõ bằng chứng, commit và post-deploy.
**Giới hạn:** Không thay chủ tài khoản Google chọn email hoặc chấp thuận scope Calendar/Drive. Không sửa/xóa sự kiện thật để thử nghiệm.
**Nguồn:** `agent/AGENT_RULES.md`, `plans/260429-1252-settings-fix-all/phase-01-oauth-secret-security.md`, code OAuth / Calendar, bằng chứng Google Cloud read-only 4/4 redirect URI.

## 1. Tình trạng đã xác minh

- Google Cloud OAuth Client `Mood Studio Web` trùng `GOOGLE_CLIENT_ID`, đã lưu 4 redirects gồm localhost:3000, localhost:3001, Supabase và production `https://stu.moodwedding.com/api/auth/google/callback`. Tải lại trang: đủ 4.
- `.env.local` (ignored) đã đặt `GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback`. Không chép giá trị secrets vào file doc.
- Supabase production read-only: `studio_info.google_oauth` null, `google_sync_queue` trống. Chưa thể kiểm đọc Google hoặc tiến trình đẩy queue thực tế.
- Browser production đã tới màn hình Chọn tài khoản Google nhưng PO chưa xác nhận account/scope; không nhấn Google consent thay user.
- OAuth callback redirect `?google_error=...` / `?google_connected=success`, nhưng UI Settings chưa đọc/query params -> không thông báo lỗi cụ thể.
- `lib/googleCalendarService.ts` bắt lỗi fetch rồi trả `[]`; `hooks/use-calendar-data.ts` fetcher cũng chuyển `ActionResult.failure` thành `[]`, nên ngụy trang Google lỗi = ngày không có lịch.
- `components/calendar/calendar-wrapper.tsx` trả lỗi internal calendar làm mất toàn bộ view, nên lỗi Google nên ở banner riêng, **không được che lịch nội bộ**.
- `callback/route.ts` có thể lưu token response không có refresh_token mà hiển thị "đã kết nối", dù lần refresh tiếp theo sẽ fail.

## 2. Phạm vi code cố định (surgical, giữ kiến trúc, không schema)

1. `lib/google-oauth-feedback.ts` (mới): map whitelist lỗi OAuth thành thông báo an toàn tiếng Việt; không hiển thị raw tokens, raw query hoặc lỗi từ Google.
2. `components/settings/google-calendar-card.tsx`: đọc `google_error` và `google_connected` bằng `useSearchParams` trong Suspense hiện có từ `app/(protected)/settings/studio/page.tsx`. Hiển thị alert dễ hiểu và lối ra kết nối lại; status success chỉ khi server trả `isConnected=true`. Giữ hành vi disconnect và card cũ.
3. `app/api/auth/google/callback/route.ts`: fail closed khi token response thiếu access_token/refresh_token sau merge token cũ, trả code `missing_refresh_token` hoặc `missing_access_token`; không ghi DB token thiếu dữ liệu, không log raw token response.
4. `lib/googleCalendarService.ts`: giữ return `[]` khi **chưa kết nối**; khi Google API/token lỗi, log rồi **throw** thay vì giả dữ liệu rỗng. Không sửa Google write/create/delete, token refresh, quota, auth hoặc thư viện.
5. `hooks/use-calendar-data.ts`: khi `fetchCalendarGoogleEvents` trả `success:false`, **throw** sang SWR thay vì `[]`; thêm `googleError` và `retryGoogleEvents` riêng. Giữ nội bộ events dù Google lỗi, không phá `keepPreviousData` fix cũ.
6. `components/calendar/calendar-wrapper.tsx`: hiện banner Google Calendar lỗi riêng có liên kết Settings/Thử lại; giữ calendar nội bộ, không đổi filter hay URL. Trên mobile drawer nếu có Google failure hiển thị thông báo giới hạn.
7. `components/calendar/drawers/day-drawer.tsx`: optional `googleError?: boolean` để cảnh báo khi Google không tải được và không kết luận ngày trống.
8. `tests/unit/google-oauth-feedback.test.ts` (mới): test mapping các mã lỗi OAuth và whitelist/safe fallback; không DB.
9. `agent/GOALS.yaml` + spec: audit trạng thái/verify.

**Không thuộc phạm vi:** migration/SQL/Google sync-worker changes, sửa auth scopes, auto-booking, tạo/sửa/xóa event thật, đổi service-role, deploy trước diff. Không chạy `smoke-settings` (có seed token và disconnect production), `smoke:calendar`, E2E live.

## 3. Acceptance criteria / gates

- A1: callback OAuth ở Google Cloud và local được xác minh từ cấu hình **không chạm DB**; production URI giữ.
- A2: URL `/settings/studio?google_error=invalid_state`, `access_denied`, `missing_refresh_token`, `internal_error`: hiển thị chỉ dẫn rõ ràng; raw/unrecognized code không phản chiếu lên UI. `google_connected=success` chỉ báo xanh nếu thật sự `isConnected`.
- A3: callback mock Google không có refresh token: trả lỗi, **0 DB write**, không lưu kết nối giả. Mọi token response errors redact.
- A4: Google fetch thất bại: SWR báo lỗi; Calendar studio vẫn xem được, không giả rỗng; manual retry có tác dụng.
- A5: Không sửa cache global/server actions Google sync worker/DB schema; lịch nội bộ không bị ảnh hưởng.
- A6: TypeScript, changed-file ESLint, Jest targeted, verify:settings và verify:calendar **chạy static không remote DB**, production build PASS, git diff --check sạch.
- A7: Test UI offline/mocked Google (không mở /calendar thật vì page có POST sync-worker).
- A8: PO xem diff trước commit/push main. Để chứng minh Google thực sự kết nối & đồng bộ cần tài khoản studio chấp thuận Calendar+Drive trên production, sau đó kiểm tra read-only; không tự cấp quyền.

## 4. Cổng dừng

- Nếu phải đổi OAuth scope, mã hóa secrets/storage, Supabase schema, sync-worker hoặc phân quyền: DỪNG; viết ADR + hỏi PO theo AGENT_RULES.
- Nếu production khác dev về mật mã, dừng và đối chiếu server env trước khi lưu OAuth từ local; ưu tiên connect OAuth trên production để dùng key production.
- Nếu cần kiểm tra write sync thực: dùng staging riêng hoặc PO duyệt thời điểm và dữ liệu cụ thể, không seed ở production.
- Thay đổi source ở local; ghi full diff + kết quả thực sau code, không tự tuyên bố hoàn tất tích hợp nếu chưa có token và chưa kiểm live Google.

## 5. Kết quả triển khai — local, 02/11/2026

**Đã sửa source local, CHỜ PO XEM DIFF, KHÔNG COMMIT/PUSH/DEPLOY.**

### 5.1 Source changes
- `lib/google-oauth-feedback.ts` mới: chỉ map các mã lỗi OAuth đã biết, không echo mã query tùy ý, cảnh báo `google_connected=success` khi DB chưa xác nhận.
- `components/settings/google-calendar-card.tsx`: hiển thị nguyên nhân lỗi và hướng thử lại, thông báo success chỉ khi `isConnected`.
- `app/api/auth/google/callback/route.ts`: reject token exchange thiếu access token/refresh token trước khi ghi vào `studio_info`; không log toàn bộ Google token error body.
- `lib/googleCalendarService.ts`: phân biệt chưa kết nối (return []) với DB/Google fetch error (throw); không nuốt lỗi 403 thành danh sách rỗng.
- `hooks/use-calendar-data.ts`: Google status/fetch failures qua SWR error, exposed `googleError` / `retryGoogleEvents`; giữ lịch nội bộ.
- `components/calendar/calendar-wrapper.tsx` + `components/calendar/drawers/day-drawer.tsx`: banner lỗi Google + link settings/retry; trong DayDrawer nói rõ Google chưa tải được.
- `tests/unit/google-oauth-feedback.test.ts`, `tests/unit/google-calendar-read.test.ts` mới: test error mapping/prototype-name, success gating, mock API 403, DB failure, case chưa kết nối, Google data success.

### 5.2 Bằng chứng verify
- `npx jest tests/unit/google-oauth-feedback.test.ts tests/unit/google-calendar-read.test.ts tests/unit/lunar-calendar.test.ts --runInBand` → **3 suites, 21/21 test PASS** (0 network/DB thật).
- `npx tsc --noEmit --pretty false` → PASS, exit 0.
- `npx eslint` chỉ trên 9 file Google/Calendar mới/đổi → PASS, exit 0.
- `node scripts/verify-settings.mjs` → PASS, exit 0.
- `verify-calendar.mjs` với Supabase env set rỗng → PASS, thông báo **Skipping remote Supabase probes**.
- `git diff --check` → PASS.
- `npm run build` → **PASS, BUILD_LAST_EXIT:0**, Webpack 100s, TypeScript, 40/40 static pages, PWA `public/sw.js` verified. Warnings Sentry/Browserslist là nợ cũ.
- Dev server đã khởi động lại trên `localhost:3001` (Next 16.2.6, Ready).
- Browser thật, đăng nhập sẵn, read-only: `http://localhost:3001/settings/studio?google_error=invalid_state` → nhìn thấy **“Phiên kết nối Google không còn hợp lệ.”** và hướng khôi phục; `Google Workspace` vẫn **“Chưa kết nối”**. Không ấn connect/disconnect hay save ở lượt verify.

### 5.3 Chưa thể xác nhận hoặc làm tiếp khi không có bước PO
- `studio_info.google_oauth` production vẫn `null` tại baseline, sync queue 0 pending/failed. Callback Google Cloud đã lưu 4 URI và production callback giữ nguyên; **PO phải tự chọn đúng tài khoản và chấp thuận quyền Calendar/Drive trên production**.
- Chưa thể kiểm fetch Google thật (không có token); không chạy sync worker, không tạo/sửa/xóa events Google và không tự cấp quyền Google.
- Google hiện chưa được kết nối: **không gọi bản sửa là Google sync live đã hoạt động**, điểm nghiệm thu E2E chưa đạt.
- Trước push main phải PO xem diff. Dev/prod dùng chung Supabase, nên không chạy `scripts/smoke-settings.mjs` (có seed OAuth/disconnect) hoặc Playwright có seed/write.

### 5.4 Rollback & giữ scope
- Rollback bằng Git revert source nếu PO duyệt deploy sau; không có SQL migration hoặc token data migration.
- Các file chưa được Git theo dõi của PO có từ trước giữ nguyên; file test và spec mới chưa stage.


## 6. Phát hiện bổ sung: lỗi gốc OAuth trên production, xử lý theo ủy quyền mới

- **Bằng chứng trực tiếp, trước sửa:** GET `https://stu.moodwedding.com/api/auth/google` (không session, redirect manual) -> HTTP 307 với Location **`http://localhost:3000/login`**; callback production tự nó vẫn tồn tại (GET `/api/auth/google/callback` thiếu state -> 307 tới `/settings/studio?google_error=invalid_state` đúng domain). Điều này xác nhận production sử dụng callback origin local, giải thích Google code không thể trở lại production.
- **SSOT domain:** `docs/specs/auth-password-recovery.md` ghi production URI `https://stu.moodwedding.com/api/auth/google/callback` và Google Cloud đã đăng ký đúng callback.
- **Mã sửa:** `lib/google-oauth-redirect.ts` mới, dùng chung ở `app/api/auth/google/route.ts` và `app/api/auth/google/callback/route.ts`. Nếu request đến chính xác host production đã xác nhận, dùng HTTPS callback canonical bất kể stale `GOOGLE_REDIRECT_URI` hoặc `NEXT_PUBLIC_SITE_URL`. Nếu localhost thì dùng cổng đang lắng nghe để state-cookie không bị lệch origin. Với host public khác, cấu hình callback phải khớp origin request hoặc trả lỗi (fail-closed), không dùng localhost. Không sửa scope, token encryption, cookie policy hay bảng DB.
- **Lý do cần guard thay vì đổi env ngay:** máy dev có Vercel CLI nhưng `vercel whoami` báo token không hợp lệ; không có phiên quản trị Vercel để đọc/sửa env production. PO đã nhận gợi ý kết nối Vercel trong ChatGPT (chưa xác nhận kết nối); code guard giải quyết đường callback cho domain studio ngay cả khi env vẫn sai.
- **Verify helper:** `npx jest tests/unit/google-oauth-redirect.test.ts tests/unit/google-oauth-feedback.test.ts tests/unit/google-calendar-read.test.ts tests/unit/lunar-calendar.test.ts --runInBand` -> **4 suites, 32/32 PASS**; TypeScript, lint mới, `verify:settings`, `git diff --check` PASS.
- **Quyền PO:** Sau yêu cầu xem diff ban đầu, PO thông báo "PO giao full quyền cho bạn để fix tối ưu mà" (2026-11-02); đây là ủy quyền bổ sung cho xử lý kỹ thuật và phát hành sau khi verify an toàn, không thay thế consent Google của người dùng.
- **Sau phát hành phải xác nhận:** GET production OAuth unauth phải 307 -> `https://stu.moodwedding.com/login`, không còn `localhost:3000`. Chỉ khi PO chọn đúng tài khoản Google + cấp quyền thật, query DB đọc `connected=true`, kiểm Google event read-only mới chứng minh sync thực tế.
- **Phạm vi release:** 2 task Calendar âm/dương và Google reliability được thực hiện trong một diff có kiểm chứng; không stage bốn mục untracked tồn tại trước task.
