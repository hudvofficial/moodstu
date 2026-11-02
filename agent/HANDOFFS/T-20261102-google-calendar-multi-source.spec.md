# T-20261102-google-calendar-multi-source — Hiển thị sự kiện nhiều lịch Google

**Ngày:** 2026-11-02
**PO:** Ủy quyền xử lý kỹ thuật cho Google Calendar ("full quyền để fix tối ưu").
**Trạng thái:** CODE + VERIFY LOCAL HOÀN TẤT; chờ push main theo ủy quyền PO.

## 1. Trace dữ liệu THẬT (read-only, không token lộ ra log)

- Sau OAuth trên production, `studio_info.google_oauth` đã có access+refresh token mã hóa, decrypt được bằng khóa môi trường hiện tại; scope Calendar có hiệu lực, Google Calendar API trả HTTP 200.
- `calendarList` trả 3 nguồn: 1 primary đang bật, 1 calendar phụ đang bật, 1 calendar có quyền reader nhưng **selected=false**.
- Tháng 11/2026: primary 0 sự kiện, lịch phụ đang bật 0, lịch **selected=false** có **1** sự kiện.
- `lib/googleCalendarService.ts` đang gọi duy nhất `calendar/v3/calendars/primary/events`; chưa bao giờ đọc nguồn calendar khác. `google_sync_queue` trống là bình thường, không chứng minh chiều đọc.
- UI Calendar có thể lọc nguồn Google theo nhân sự/trạng thái; dữ liệu đang đăng nhập là thật, không phải OAuth lỗi.

## 2. Quy tắc tối ưu cho solo-studio

1. Đọc danh sách lịch có quyền `reader/writer/owner` qua Google `calendarList`; nguồn mặc định: `primary` + những lịch Google có `selected=true` và không hidden.
2. **Không** tự động đưa calendar `selected=false` (chứa 1 sự kiện) vào giao diện studio cho toàn nhân viên. Admin quyết định qua danh sách checkbox tên lịch trên trang `/settings/studio`; gợi ý lịch chưa được bật trong Google.
3. Lưu nguồn đã chọn riêng cho Mood Studio bằng `google_oauth.selected_calendar_ids` (JSONB hiện có, token fields vẫn encrypted) — không migration/schema, không ảnh hưởng lựa chọn trong Google Calendar; giữ lựa chọn qua token refresh và OAuth reconnect.
4. Server action quản trị có guard `withAdmin`, xác minh từng ID thực sự có trong Google calendarList của account và có quyền đọc; không cho client chèn calendar ID tùy ý. Duy trì audit redacted, không log OAuth token.
5. Google event fetch cho mọi lịch được chọn, support paging `nextPageToken`, giới hạn ngăn spam, bỏ bản ghi cancelled, map màu theo nguồn; event key unique giữa các calendar; không nhân đôi các event studio đẩy lên **primary**.
6. **Giữ nguyên** Google write/`sync-worker` chỉ đẩy sự kiện studio tới `primary` như hiện tại, tránh ghi nhầm lên lịch shared/readonly. Đây là import-only đa nguồn.
7. Cache SWR Google cập nhật khi admin lưu lựa chọn, có thông báo lỗi rõ ràng; calendar nội bộ không bị ảnh hưởng.

## 3. Thay đổi code

- `lib/google-calendar-sources.ts`: source list, paging Google CalendarList, allowlist & selection resolver (unit-testable).
- `lib/googleCalendarService.ts`: multi-source read-only, paging events, color and ID unique, giữ CRUD primary.
- `app/actions/settings-queries.ts` + `app/actions/settings-mutations.ts`: admin load/save source selection, ID validation, audit & revalidate.
- `components/settings/google-calendar-card.tsx`: UI admin chọn nguồn lịch Google đã liên kết.
- `app/actions/calendar-queries.ts`: bảo vệ dedup primary-only; giữ không nhân đôi sự kiện studio.
- `types/settings.ts`: optional field JSON (nếu cần).
- `tests/unit/google-calendar-sources.test.ts` và cập nhật `tests/unit/google-calendar-read.test.ts`.

## 4. Kiểm tra an toàn và acceptance

- Không đưa token, secret, địa chỉ email/ID nguồn ra console audit.
- API thật read-only chứng minh có 3 lịch, 1 sự kiện ở nguồn selected=false.
- Unit: primary+selected default, custom selected whitelist, ngăn freeBusyReader, paging, duplicate IDs, none, API failures.
- Static: Jest targeted, tsc, eslint changed, verify:calendar không DB remote, verify:settings, diff --check; production build Next/PWA.
- UI: admin thấy tên lịch, trạng thái bật, có thể bật lịch shared và Lưu; calendar nhận nguồn đang chọn. Chỉ thực hiện thao tác ghi selected_calendar_ids khi admin chủ động chọn, không auto-select nguồn đang tắt.
- Không chạy full E2E có seed production hoặc thao tác tạo/xóa sự kiện Google.
- Chỉ deploy khi build PASS; sau deploy smoke bằng database Google API read-only, rồi admin chọn lịch cần thêm nếu vẫn selected=false.

## 5. Giới hạn

- Multi-source chỉ đổi chiều đọc; **không** chuyển hướng đồng bộ ngược từ Mood sang các lịch phụ.
- Mặc định giữ tôn trọng lựa chọn của Google; không đọc những lịch đang ẩn/tắt cho người khác khi admin chưa bật.
- Chưa có separate staging DB, nên test bằng mock, không seed event thật.


## 6. Bằng chứng triển khai thực tế — 2026-11-02

- 3 nguồn Google thật: OAuth decrypt OK, Calendar API HTTP 200, nguồn primary 0 / nguồn bật thứ hai 0 / nguồn reader `selected=false` 1 sự kiện tháng 11/2026. Chỉ GET, không refresh token, không write.
- `lib/google-calendar-sources.ts`: đọc `calendarList` có phân trang 250, kiểm role/hidden, default primary+selected, custom explicit IDs đã chọn. Server action admin xác nhận ID bằng API Google trước khi ghi.
- `lib/googleCalendarService.ts`: phân trang events 250 x ≤10/trình tự mỗi nguồn, tối đa 5 nguồn đồng thời, ID event non-primary dạng `calendarId::eventId`, màu từ calendarList, báo lỗi nếu nguồn thất bại/thiếu trang. Google write CRUD primary không đổi.
- `app/actions/calendar-queries.ts`: chỉ dedup với sự kiện studio trên primary, không lọc nhầm event của lịch khác có cùng Google ID.
- `components/settings/google-calendar-card.tsx`: tên và checkbox 3 nguồn, thông báo nguồn Google bật/tắt + quyền đọc, nhấn Lưu (server action admin). Không tự chọn nguồn thứ ba trong production.
- `app/actions/settings-queries.ts` + `app/actions/settings-mutations.ts`: admin-only, validate IDs, không gửi token cho browser; lưu nguyên ciphertext và mảng selected IDs vào `studio_info.google_oauth`; audit chỉ count, revalidate Calendar.
- Unit `npx jest tests/unit/google-calendar-source-selection-action.test.ts tests/unit/google-calendar-sources.test.ts tests/unit/google-calendar-read.test.ts tests/unit/google-oauth-feedback.test.ts tests/unit/google-oauth-redirect.test.ts tests/unit/lunar-calendar.test.ts --runInBand` → **6 suites, 44/44 PASS** (0 Google/DB live write). Test bổ sung verify lưu ID nguồn, token refresh re-encrypt cùng refresh token, đổi tài khoản khác và lịch không được phép.
- `npx tsc --noEmit --pretty false` → PASS.
- `npx eslint` đúng source/test thay đổi → PASS.
- `verify:settings` + `verify:calendar` static (không Supabase remote probes) → PASS.
- `git diff --check` → PASS (ADR file giữ đúng LF, chỉ append ADR-023).
- `npm run build` → **PASS, BUILD_LAST_EXIT:0** (Next 16.2.6, 40/40 pages, PWA artifact verified; cảnh báo Sentry/Browserslist là nợ cũ).
- Browser harness nằm trong `.next/google-sources-harness/` (ignored, backend mocked): **6/6 PASS** Chromium 375/390/768/1023/1366 và WebKit 375px; 2 nguồn bật mặc định, 1 lịch chia sẻ chưa bật; tick + Lưu gửi đúng 3 IDs (mock), 0 JS error, 0 HTTP request, 0 horizontal overflow. Đã kiểm ảnh chụp mobile/desktop.
- Guard lưu cấu hình kiểm refresh token **plaintext chỉ trong memory**, không so ciphertext AES-GCM có IV mới; đọc lại latest OAuth JSON để không khôi phục ciphertext lỗi thời, vẫn chặn nếu refresh token thuộc account khác.\n- **Điểm nghiệm thu live còn lại:** sau deploy admin chọn nguồn chứa sự kiện và bấm Lưu thật; chỉ sau đó mới xác nhận calendar UI hiển thị event. Không nên auto-bật lịch selected=false và vô tình hiện dữ liệu ngoài ý muốn cho nhân viên.
