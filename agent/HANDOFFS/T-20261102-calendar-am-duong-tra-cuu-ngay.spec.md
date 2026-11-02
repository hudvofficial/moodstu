# T-20261102-calendar-am-duong-tra-cuu-ngay — Sửa “Xem lịch ngày này” đúng nghiệp vụ Mood Studio

**Ngày lập:** 2026-11-02
**Trạng thái:** PO ĐÃ DUYỆT 2026-11-02 — CODE + VERIFY LOCAL XONG — CHỜ PO XEM DIFF; CHƯA COMMIT/PUSH/DEPLOY
**Phạm vi:** Calendar Solo Studio (không phải SaaS, không phải tính năng đặt chỗ).
**Điểm mục tiêu:** >=9,5/10 sau nghiệm thu thực tế; mức thiết kế dự kiến ~9,6/10, KHÔNG phải điểm đã đạt.
**Cổng kiểm soát:** PO duyệt spec → triển khai đúng phạm vi → verify → PO xem diff → PO quyết định push main.
**Nguồn đối chiếu:** `agent/AGENT_RULES.md`, `agent/ARCHITECTURE.md`, `vault/60-bay/bay-ui-react.md`, `plans/260501-calendar-lunar-day-drawer-max/plan.md`, Git `f307de85`, `e1c1c3b0`, `3b3039eb`.

## 0. Bối cảnh và root cause đã trace (bằng chứng code thật)

1. `components/calendar/solar-lunar-converter.tsx` có `handleNavigate` ưu tiên `onOpenDayDetail(date)`. Khi không nhận prop đó, nhánh `onNavigateDate(date)` chạy. Trong `components/calendar/calendar-toolbar.tsx`, converter hiện chỉ được cấp `onNavigateDate={onDateChange}` (khoảng dòng 359–363).
2. `components/calendar/calendar-wrapper.tsx` hiện giữ state `selectedMobileDate` và render `DayDrawer`, nhưng không giữ `selectedLunarDate`, không render `LunarDayDrawer`.
3. Git `f307de85` (2026-05-01) từng nối converter → LunarDayDrawer; Git `e1c1c3b0` (2026-05-13) gỡ các callback khi khôi phục Calendar V1. `components/calendar/lunar-day-drawer.tsx` vẫn tồn tại. Git `3b3039eb` thêm âm lịch vào `DayDrawer` nhưng KHÔNG khôi phục nút converter.
4. `solar-lunar-converter.tsx` trì hoãn cập nhật `result` 300ms; đổi input rồi bấm CTA ngay có thể chọn kết quả cũ. Các input `type=number` dùng `Number("") === 0`, đúng bẫy UI trong `vault/60-bay/bay-ui-react.md`.
5. `UnifiedModal` có z-index theo `--z-modal` = 9999; `Drawer` z-50. CTA converter gọi `onClose()` trực tiếp (không qua hàm `handleClose` animation 250ms), nên React có thể đóng modal + mở drawer trong cùng event batch. KHÔNG thêm setTimeout để “chữa” z-index.
6. `use-calendar-data.ts` dùng `keepPreviousData: true` từ `lib/swr.ts`: khi chuyển tháng, event nội bộ/Google có thể là kết quả của tháng vừa xem. `DayDrawer` đang không phân biệt loading với “không có sự kiện”.
7. `use-calendar-data.ts` có 2 setter `setCurrentDate` và `setViewMode`, mỗi setter gọi `router.replace`. Gọi liên tục để vừa đổi ngày vừa đổi view có thể ghi URL không nhất quán.
8. `filteredEvents` trong hook chỉ giữ `source === "schedule"` hoặc `source === "google"`; `contract_event` và `work_tasks` hiện không được hiển thị trong các calendar views. Không được kết luận ngày còn trống / đã kín từ dữ liệu này.
9. `SolarLunarConverter` chỉ có một callsite trong repo hiện tại: `CalendarToolbar`. Fallback `/calendar?date=...&drawer=lunar` của component không có consumer để tự mở drawer trong `CalendarWrapper`.
10. `CalendarWrapper` + `useCalendarData` có directive `"use no memo"` để tránh lỗi React Compiler production. TUYỆT ĐỐI không xóa.

## 1. Contract sản phẩm (đóng băng phạm vi)

**UX trong converter**
- Nhấn biểu tượng Âm/Dương, nhập ngày dương hoặc ngày âm: hiển thị kết quả đúng ngay khi dữ liệu hợp lệ.
- Đổi đề xuất nhãn CTA từ “Xem Lịch Ngày Này” sang **“Xem chi tiết ngày”** để không bị hiểu là xem lịch làm việc.
- Nhấn CTA: modal biến mất, mở `LunarDayDrawer` với đúng `solarDate` tương ứng. Không đổi `currentDate`, `viewMode` hay URL của Calendar tại bước tra cứu.
- Bấm ra ngoài / Escape / nút Đóng: thoát modal/drawer, không tạo sự kiện.
- Dữ liệu không hợp lệ, ô ngày/tháng/năm bị xóa, tháng nhuận không tồn tại: không mở drawer, không dùng kết quả trước đó.

**UX tại LunarDayDrawer**
- Giữ ngày dương, ngày âm (đánh dấu tháng nhuận), thứ, Can Chi ngày/tháng/năm và giờ hoàng đạo dựa trên helper hiện có.
- Không hiển thị khối “Thông tin mở rộng” có 4 trường “Chưa có dữ liệu xác thực”. `solarTerm` nếu null vẫn ẩn; không bịa nội dung tử vi/cát hung.
- CTA chính: **“Xem lịch studio ngày này”**. CTA thứ cấp: **“Tạo lịch trình”**. Bố trí cả hai gần phần thông tin chính để dễ tiếp cận trên bottom sheet 85vh, không cần sửa shared `Drawer`.
- “Xem lịch studio”: ngày chọn được đưa vào Calendar. Với viewport <640px: giữ view `month` và mở `DayDrawer`; từ 640px trở lên: view `day`. Lưu URL `?date=YYYY-MM-DD&view=month|day` bằng 1 lần `router.replace`. Calendar chỉ hiển thị những sự kiện nó hiện hỗ trợ; không badge “còn trống”.
- “Tạo lịch trình”: mở `EventFormDrawer` với `defaultDate` đúng ngày chọn, KHÔNG tự submit, KHÔNG tạo hợp đồng.

**Ngôn ngữ và an toàn dữ liệu**
- Không dùng nhãn “Trống lịch”, “Đã kín”, “Nhận được khách”, “Ngày tốt để cưới” như một kết luận có xác minh.
- `DayDrawer` khi không có sự kiện dùng nhãn “Không có lịch trình đang hiển thị”, không suy ra tình trạng booking. Khi chưa tải xong: ghi rõ “Đang tải lịch trình”.
- Chỉ tra cứu ngày không được phát sinh thêm Server Action/Google/Supabase request do tính năng này.
- Những sự kiện hợp đồng chưa thuộc dữ liệu hiển thị hiện tại không được “bổ sung nhanh” vào task này: cần spec nghiệp vụ lịch bận riêng.

## 2. Danh sách file cho phép sửa (locks mềm, chỉ Calendar)

1. `components/calendar/solar-lunar-converter.tsx` — sửa input/validation, bỏ stale result, CTA, callback.
2. `components/calendar/calendar-toolbar.tsx` — thêm prop/callback chuyển ngày âm lịch lên wrapper.
3. `components/calendar/calendar-wrapper.tsx` — state tra cứu + 2 hành động, loading guard cho DayDrawer.
4. `components/calendar/lunar-day-drawer.tsx` — tinh gọn chi tiết và CTA, a11y cục bộ.
5. `components/calendar/drawers/day-drawer.tsx` — loading/empty state rõ nghĩa khi nhảy tháng.
6. `hooks/use-calendar-data.ts` — atomically navigate date/view và chặn Google/internal laggy data của tháng khác.
7. `tests/unit/lunar-calendar.test.ts` (mới) — test pure deterministic, không chạm DB.
8. `agent/HANDOFFS/T-20261102-calendar-am-duong-tra-cuu-ngay.spec.md` — ghi kết quả verify sau khi PO duyệt và code.

**Giữ nguyên:** `lib/lunar-calendar.ts`, `lib/swr.ts`, `components/ui/drawer.tsx`, `components/ui/unified-modal.tsx`, DB schema/migrations, API/server actions, Google sync, finance/contracts và các file ngoài scope. Nếu bắt buộc sửa shared primitive hoặc thay state architecture/data-flow → DỪNG, lập ADR và xin PO duyệt.

## 3. Thực hiện từng bước nhỏ (chỉ bắt đầu sau PO duyệt)

### P0 — Baseline + xác nhận luồng trước sửa
- [ ] P0.1: `git status --short --branch` tại `mood-studio`; ghi lại 4 mục untracked đang có, không stash/xóa/ghi đè.
- [ ] P0.2: `git grep -n SolarLunarConverter -- components` xác nhận chỉ có toolbar sử dụng; `git grep -n LunarDayDrawer -- components` xác nhận component tồn tại nhưng chưa được mount.
- [ ] P0.3: Đối chiếu `AGENT_RULES`, `vault/60-bay/bay-ui-react.md`, `plans/260501-calendar-lunar-day-drawer-max/plan.md` để khóa hành vi ở `1` và rủi ro.
- [ ] P0.4: Chốt baseline kỹ thuật: không chạy E2E/global setup hoặc `smoke:calendar`; khung mã hiện tại được kiểm tra read-only; nếu dùng browser cần cô lập side effects trước.

**Gate P0:** PO đã duyệt contract ở `1` và việc bổ sung task vào hàng đợi `agent/GOALS.yaml` theo quy trình dự án.

### P1 — Converter: kết quả luôn đi theo input mới nhất
- [ ] P1.1: `components/calendar/solar-lunar-converter.tsx`: đổi state 3 input thành chuỗi (`dayInput`, `monthInput`, `yearInput`) để cho phép xóa trắng mà không bật thành 0; khi mở modal/đổi mode reset đúng ngày hiện hành như cũ.
- [ ] P1.2: Trong cùng file, chuyển `result` từ state cập nhật qua `setTimeout(300)` thành giá trị tính thuần với `useMemo` dựa trên `mode`, 3 chuỗi input, `isLeap` và `isOpen`. Không dùng `setResult` hoặc timer 300ms nữa.
- [ ] P1.3: Trước tính, guard ô rỗng, `Number.isInteger`, tháng 1–12, ngày dương tồn tại thật trong tháng, ngày âm trong 1–30, năm >=100 để tránh JavaScript `new Date(0..99)` tự remap sang 1900–1999; không áp đặt cận năm mới khác chưa có yêu cầu.
- [ ] P1.4: Âm → dương dùng `lunarToSolar` hiện có; nếu tháng nhuận không hợp lệ trả null. Dương → âm dùng `getLunarDetails` hiện có. Mọi nhánh trả `originalDate` là date local, không dùng `toISOString().slice(0,10)` để tạo date-only key.
- [ ] P1.5: `handleNavigate` chỉ chạy khi `result` hợp lệ; đặt nhãn “Xem chi tiết ngày”. Vì chỉ có một callsite, bắt buộc prop `onOpenDayDetail: (date: Date) => void` và loại bỏ fallback `router.push(...drawer=lunar)` / `onNavigateDate` không còn dùng (đã kiểm callsite), tránh sinh deep-link không có consumer. Không triển khai deep-link mới trong task này.
- [ ] P1.6: Bổ sung `title="Đổi Âm/Dương lịch"` và nút Đóng có aria cho `UnifiedModal` tại callsite converter; verify kích thước 375px để không tràn.

**Gate P1:** sửa ngày rồi bấm ngay không thể mở kết quả cũ; day 31/02 hoặc tháng nhuận giả không tạo CTA; 02/11/2026 → 24/09/2026 và ngược lại; 01/06 nhuận/2025 → 25/07/2025.

### P2 — Nối converter → drawer đúng ngữ cảnh và không gây side effect
- [ ] P2.1: `components/calendar/calendar-toolbar.tsx`: thêm prop bắt buộc `onOpenLunarDay: (date: Date) => void` vào interface và destructuring; cấp cho `SolarLunarConverter` qua `onOpenDayDetail={onOpenLunarDay}`.
- [ ] P2.2: `components/calendar/calendar-wrapper.tsx`: thêm `selectedLunarDate: Date | null`, callback `handleOpenLunarDay(date)`, callback `handleCloseLunarDay()`; giữ `selectedMobileDate` làm state riêng, không reuse sai ngữ nghĩa.
- [ ] P2.3: Render `<LunarDayDrawer date={selectedLunarDate} ... />` ở wrapper, nối callback qua toolbar. CTA converter gọi `onOpenDayDetail(date)` + `onClose()` trong cùng click event, không dùng `setTimeout`/`requestAnimationFrame` để luân chuyển overlay.
- [ ] P2.4: Từ drawer, nút “Tạo lịch trình” đóng lunar drawer rồi gọi `openCreateForm(date)` với đúng `defaultDate`; giữ luồng submit sẵn có, không thêm mutation mới.

**Gate P2:** CTA mở đúng duy nhất một drawer, không có hai dialog aria-modal đồng thời, không che dưới modal z-index 9999; Escape/backdrop/close hoạt động, focus và scroll được phục hồi; mở tra cứu không thay view, date URL, không gọi thêm network.

### P3 — Điều hướng đến Calendar đúng 1 lần và dữ liệu không giả
- [ ] P3.1: `hooks/use-calendar-data.ts`: thêm một callback `navigateToCalendarDate(date: Date, mode: CalendarViewMode)` dùng `setCurrentDateState(date)`, `setViewModeState(mode)` và `router.replace(buildCalendarUrl(date,mode), {scroll:false})` ĐÚNG MỘT LẦN. Giữ nguyên 2 setter hiện hữu cho các chức năng khác.
- [ ] P3.2: `calendar-wrapper.tsx`: nút “Xem lịch studio ngày này”: với `isSmallMobile` (<640px) chọn `month` và `setSelectedMobileDate(date)`; còn lại chọn `day`. Gọi `navigateToCalendarDate` trước khi kết thúc lunar drawer để tránh quy tắc race “đóng drawer rồi mới router” trong `vault/60-bay`. Không dùng 2 setter cũ liên tiếp.
- [ ] P3.3: `use-calendar-data.ts`: ở SWR Google lấy thêm `isLoading: isGoogleLoading`, giữ default global `keepPreviousData` nhưng KHÔNG merge dữ liệu “laggy” cũ vào `rawEvents` khi `isLoading` (internal) hoặc `isGoogleLoading` (Google) của key mới đang true. Không xóa/mutate SWR global cache.
- [ ] P3.4: Trả thêm `isDayEventsLoading = isLoading || (Boolean(isGoogleConnected) && isGoogleLoading)` từ hook; khi chưa rõ kết quả truy vấn, drawer không được hiển thị “không có lịch”.
- [ ] P3.5: `components/calendar/drawers/day-drawer.tsx`: thêm optional prop `isLoading?: boolean`; lúc loading hiện “Đang tải lịch trình” (và các event nguồn đã xác thực nếu có), không hiển thị sai trạng thái rỗng. Sau khi hết loading, nhãn rỗng “Không có lịch trình đang hiển thị”.
- [ ] P3.6: `calendar-wrapper.tsx` truyền loading từ hook cho `DayDrawer`. Kiểm chuyển sang tháng xa, quay lại tháng đã cache, Google kết nối/chưa kết nối và chuyển rất nhanh nhiều ngày.
- [ ] P3.7: Giữ `"use no memo"` ở wrapper và hook; không thay event sources/filter, không tuyên bố ngày “còn trống”.

**Gate P3:** URL chứa đúng ngày + view; một thao tác không tạo 2 lần `router.replace`; mobile mở ngày phù hợp mà không lộ sự kiện tháng cũ; desktop DayView không lộ Google events thuộc key trước; không thay schema/SQL.

### P4 — UX tối giản, rõ chức năng, không tạo giao diện mới
- [ ] P4.1: `components/calendar/lunar-day-drawer.tsx`: giữ hero ngày dương + thông tin âm lịch/Can Chi/giờ hoàng đạo; gỡ `UnknownItem` và cả khối 4 mục “Chưa có dữ liệu xác thực”. Giữ `DetailItem` tự ẩn `solarTerm=null`.
- [ ] P4.2: Đổi CTA chính thành “Xem lịch studio ngày này”, CTA thứ cấp “Tạo lịch trình”; đặt hai CTA ngay sau hero ngày (trước các chi tiết có thể dài) để PO thấy được trên bottom sheet, không cần scroll xuống hết 6 giờ hoàng đạo.
- [ ] P4.3: Dùng design tokens và `Button`/`Drawer` hiện tại; target chạm >=44px cho các CTA; không thêm thư viện, không chỉnh `components/ui/drawer.tsx`.
- [ ] P4.4: Kiểm focus Tab/Shift+Tab/Escape; không để focus rơi về nút bên trong modal đã unmount. Nếu có lỗi focus, fix cục bộ tại toolbar/wrapper, không thay primitive dùng chung.
- [ ] P4.5: Kiểm viewport 375x812, 390x844, 640x800, 768x1024, 1023x768 và 1366x768; ảnh mobile không tràn, hai CTA nhìn thấy, safe-area không che nút.

**Gate P4:** hiển thị native với Mood Studio, không có “fake data”, không chồng overlay, không khoá scroll sau đóng, không lỗi focus hoặc viewport.

### P5 — Regression tests và số đo
- [ ] P5.1: Tạo `tests/unit/lunar-calendar.test.ts` kiểm `getLunarDate`/`lunarToSolar`/`getLunarDaySummary`: 02/11/2026↔24/09/2026; 25/07/2025↔01/06 nhuận; Tết 29/01/2025; tháng 2 nhuận dương; 31/02 dương bị input validator chặn; 31 âm và tháng nhuận giả bị chặn.
- [ ] P5.2: Kiểm vòng round-trip dương↔âm ở các ngày 1/10/20/28 mỗi tháng giai đoạn 2024–2027 (192 mẫu); các ngày không hợp lệ test tại UI/validator; không gọi DB.
- [ ] P5.3: Test hoặc manual smoke “sửa input rồi click ngay <300ms”, đổi mode liên tục, bấm CTA nhiều lần, mở–đóng bằng Escape/backdrop, click 2 CTA. Test trạng thái URL và history/back.
- [ ] P5.4: `npx jest tests/unit/lunar-calendar.test.ts --runInBand`, `npx tsc --noEmit --pretty false`, `npx eslint` chỉ trên các file đổi (gồm test), `npm run build`; ghi exit code và pass/fail theo số thật.
- [ ] P5.5: `verify:calendar` có probe service-role Supabase PRODUCTION; để chạy chỉ kiểm tĩnh, dùng `node -e "process.env.NEXT_PUBLIC_SUPABASE_URL='';process.env.SUPABASE_SERVICE_ROLE_KEY='';import('./scripts/verify-calendar.mjs')"`. CHỈ chạy remote probe nếu PO cho phép và đã xác minh tính read-only.
- [ ] P5.6: Visual smoke trên app thật hoặc môi trường mock an toàn; KHÔNG chạy Playwright global setup/full E2E hoặc `npm run smoke:calendar` vì có thể seed vào DB thật. `CalendarWrapper` còn có `POST /api/calendar/sync-worker` khi mở /calendar (Google connected): khi browser smoke phải chặn/mock side effect hoặc cô lập hoàn toàn; không chỉ dựa vào “mình không bấm Lưu”.
- [ ] P5.7: Đo network trong click converter→lunar drawer: 0 request mới do thao tác tra cứu; click→drawer phản hồi không cần roundtrip server; đo trạng thái loading tháng khác, không dùng số đo Node làm bằng chứng trực tiếp cho iPhone.
- [ ] P5.8: Đối chiếu cùng baseline HEAD và cùng môi trường cho mọi claim cải thiện; ghi kết quả thật vào `KẾT QUẢ` ở cuối spec; xem xét Sentry/hooks error nếu có.

**Gate P5:** code-level + UX + Network + responsive pass; mọi lần click đưa đúng ngày; số điểm >=9,5 CHỈ được công bố sau browser smoke thực và PO duyệt diff.

## 4. Bảng kiểm nghiệm thu bắt buộc

| ID | Tình huống | Kết quả đạt |
| --- | --- | --- |
| AC-01 | Dương 02/11/2026 → âm | 24/09/2026; click mở tra cứu đúng 02/11 |
| AC-02 | Âm 24/09/2026 → dương | 02/11/2026; click mở tra cứu đúng ngày |
| AC-03 | Âm 01/06 nhuận/2025 → dương | 25/07/2025 |
| AC-04 | Ngày 31/02, 0, ô rỗng, tháng 13, leap không có | Không có CTA sử dụng kết quả cũ, thông báo ngày không hợp lệ |
| AC-05 | Sửa input rồi click ngay | Tuyệt đối không mở ngày cũ |
| AC-06 | Mở tra cứu từ tháng Calendar bất kỳ | Không thay `currentDate`, `viewMode`, URL, không thêm fetch |
| AC-07 | Đóng/bấm lại/ESC/backdrop | Chỉ một overlay active, focus và body scroll ổn |
| AC-08 | “Tạo lịch trình” | Date field đúng, không submit tự động |
| AC-09 | “Xem lịch studio” trên 375px | Month + DayDrawer, URL 1 replace, không có sự kiện tháng cũ |
| AC-10 | “Xem lịch studio” trên 640/768/1023/1366px | DayView đúng ngày, không đổi sai URL hoặc cuộn mất vị trí |
| AC-11 | Chuyển tháng xa khi SWR giữ data cũ | Loading đúng, không đưa sự kiện cũ / lời kết luận ngày rỗng |
| AC-12 | Có filter nhân sự/trạng thái, Google chưa load | Không kết luận booking còn trống; chỉ lịch đang hiển thị |
| AC-13 | Mobile 375, 390 và tablet 768,1023 | Không tràn, CTA dễ bấm, focus/scroll bình thường |
| AC-14 | Build/test/lint/static calendar verify | Pass (hoặc nêu chính xác lỗi baseline tách riêng) |
| AC-15 | Git diff | Chỉ file được duyệt, 0 migration, 0 thay đổi network/auth/finance |

## 5. Quy tắc dừng, đo và rollback

- **Không đụng DB production**, schema, server action hoặc quyền. Không tự chạy smoke ghi dữ liệu; không tạo seed giả.
- **Không đụng tài liệu plan lịch sử tháng 05/2026**: giữ làm bằng chứng, viết spec mới để trace lần sửa này.
- Nếu cần sửa `lib/swr.ts`, shared modal/drawer primitives, chuyển dữ liệu Calendar sang client-direct, thay auth/RLS/schema: **DỪNG** và báo PO; cần ADR + phê duyệt.
- Trước code phải có **cổng duyệt spec + cập nhật GOALS theo chỉ đạo của chủ**. Sau verify phải có **cổng PO xem diff** trước push main.
- Rollback là revert riêng các commit sửa Calendar, không cần SQL rollback, không sửa dữ liệu thật.
- Không gộp task “thực sự còn trống lịch/chống booking trùng” vào task này. Muốn làm phải mở spec khác với nguồn contract_events/schedules/work_tasks, nhân sự và tài nguyên.

## 6. Rubric chấm điểm sau khi code

| Nhóm | Trọng số | Ngưỡng |
| --- | ---: | --- |
| Chính xác ngày và tháng nhuận | 20% | 100% ca AC-01–05 |
| UX luồng hai bước / thao tác | 25% | AC-06–10 pass |
| Dữ liệu đúng và không stale | 20% | AC-11–12 pass |
| Mobile/tablet/a11y | 15% | AC-07, AC-13 pass + browser smoke |
| Hiệu năng, không thêm network | 10% | 0 request do mở LunarDayDrawer; không thêm dependency |
| Bảo trì, regression, an toàn triển khai | 10% | AC-14–15 pass; hai human gates |

**Điểm mục tiêu:** 9,6/10 sau nghiệm thu. **Không được tự chấm >=9,5** nếu chưa chạy thử giao diện code thật (mobile + desktop) và kiểm dữ liệu khi chuyển tháng.

## 7. KẾT QUẢ TRIỂN KHAI — 2026-11-02 (bằng chứng thực tế)

**Trạng thái:** ĐÃ CODE + VERIFY LOCAL; **CHỜ PO XEM DIFF**. PO duyệt spec trong hội thoại 2026-11-02. Chưa commit, chưa push, chưa deploy. Mục tiêu ≥9,5/10 là **điểm thiết kế có điều kiện**, chưa khẳng định đạt vì chưa chạy kiểm thử end-to-end trên app có đăng nhập và DB thật.

### 7.1 File và chức năng đã sửa

- `components/calendar/solar-lunar-converter.tsx`: khôi phục callback bắt buộc `onOpenDayDetail`, kết quả `useMemo` từ chuỗi input hợp lệ thay vì state debounce 300ms, bảo vệ tháng nhuận/ngày không tồn tại/ô trống, thay CTA “Xem chi tiết ngày”, title và nút đóng; focus nhập ngày khi mở, trả focus sau đóng.
- `components/calendar/calendar-toolbar.tsx`: nối `onOpenLunarDay` vào converter và lưu nút khởi phát để phục hồi focus.
- `components/calendar/calendar-wrapper.tsx`: `selectedLunarDate`, `LunarDayDrawer`, hai luồng “Xem lịch studio ngày này”/“Tạo lịch trình”, điền ngày sự kiện; truyền `isDayEventsLoading` tới DayDrawer.
- `components/calendar/lunar-day-drawer.tsx`: đặt hai CTA gần thông tin ngày, giữ hero/Can Chi/giờ hoàng đạo, bỏ bốn mục thiếu dữ liệu xác thực.
- `components/calendar/drawers/day-drawer.tsx`: loading state rõ nghĩa; khi không có event hiển thị “Không có lịch trình đang hiển thị”, không suy đoán studio còn slot.
- `hooks/use-calendar-data.ts`: thêm `navigateToCalendarDate(date, mode)` cho **một** `router.replace`; chặn kết quả cũ do SWR `keepPreviousData` ở cả nguồn internal và Google (kể cả lỗi tải Google); giữ `use no memo`.
- `tests/unit/lunar-calendar.test.ts` (mới): 6 ca kiểm thử thuần trên helper âm lịch, có 192 round-trip, không truy cập DB.
- `agent/GOALS.yaml`: đăng ký riêng mục `fix-calendar-lunar-20261102` theo quy trình dự án.

Giữ nguyên `lib/lunar-calendar.ts`, shared `lib/swr.ts`, `UnifiedModal`, `Drawer`, schema/RLS, server actions, SQL, API và các module ngoài Calendar.

### 7.2 Các lệnh verify đã chạy (không kết nối prod DB)

| Kiểm | Kết quả |
| --- | --- |
| `npx jest tests/unit/lunar-calendar.test.ts --runInBand` | PASS **6/6 test**, trong đó **192/192** phép chuyển đổi hai chiều năm 2024–2027 |
| `npx eslint` đúng 6 source + 1 file test của task | PASS, exit 0 |
| `npx tsc --noEmit --pretty false` | PASS, exit 0 |
| `node -e "process.env.NEXT_PUBLIC_SUPABASE_URL='';process.env.SUPABASE_SERVICE_ROLE_KEY='';import('./scripts/verify-calendar.mjs')"` | PASS, exit 0; log **“Skipping remote Supabase probes”** |
| `npm run build` (chạy **lần cuối sau các chỉnh sửa** qua CHC shell) | PASS, **BUILD_LAST_EXIT:0**; Next.js compiled, TypeScript, 40/40 static pages, PWA artifact `public/sw.js` verified |
| `git diff --check` | PASS, exit 0 |

Cảnh báo Sentry `onRouterTransitionStart` và dữ liệu Browserslist cũ xuất hiện trong build là cảnh báo không chặn; không sửa hạng mục ngoài scope.

### 7.3 Browser smoke với source component thật, backend cô lập

Đã dựng harness cục bộ trong `.next/calendar-harness/` (thư mục **bị git ignore**, chỉ để QA, không phải file ứng dụng). Bundle sử dụng chính mã `CalendarToolbar`, `SolarLunarConverter`, `LunarDayDrawer`, `CalendarWrapper` và `DayDrawer` đang sửa. Dùng Playwright Chromium + WebKit đọc harness qua `file://`, **không khởi chạy app `/calendar` hay Supabase/Google**.

- **Component harness 5/5 PASS**: Chromium 375×812, 390×844, 768×1024, 1366×768 và WebKit 375×812.
  - Dương → Âm đúng 02/11/2026 ↔ 24/09/2026; Âm → Dương đúng; callback tạo lịch có ngày đúng.
  - Ngày 31/02, ô ngày rỗng không render CTA; Escape/backdrop đóng, focus phục hồi đúng nút launcher; mở modal focus vào ô ngày, mở drawer focus nằm trong drawer.
  - Không tràn ngang, screenshot sau animation cho thấy hai CTA đầy đủ ở mobile; **0 HTTP request phát sinh** và **0 browser JS error**.
- **CalendarWrapper harness 3/3 PASS** (mock `useCalendarData`, EventFormDrawer và các views; sử dụng Wrapper + Toolbar + LunarDrawer + DayDrawer thật):
  - Phone 375px: duy nhất một thao tác `?date=2026-12-15&view=month`, mở DayDrawer, hiển thị “Đang tải lịch trình…” rồi mới hiện trạng thái rỗng sau khi mock trả xong.
  - Tablet 768px và desktop 1366px: duy nhất một thao tác `?date=2026-12-15&view=day`, hiển thị DayView đã chọn.
  - “Tạo lịch trình” truyền `defaultDate=2026-11-02`, không đổi URL hoặc tạo sự kiện; **0 HTTP request**, **0 JS error**.
- Mẫu đo click→drawer trong harness (bao gồm click/automation): Chromium khoảng **278–284ms**, WebKit khoảng **398ms** trong lượt cuối. Đây **không phải** số đo INP trên app thật hay iPhone thật.

### 7.4 Giới hạn / chưa xác nhận

- **CHƯA** chạy `/calendar` thật với auth + Supabase/Google do dev/prod dùng chung production DB; trang còn có `POST /api/calendar/sync-worker`, nên chỉ mở trang có thể có side effect.
- **CHƯA** kiểm toàn bộ SWR thật khi Google lỗi/chuyển tháng nhiều lần hay bộ lọc nhân sự trong môi trường authenticated; logic đã được đối chiếu bằng source và mô phỏng Wrapper, không gọi là tích hợp hoàn chỉnh.
- **CHƯA** chạy Playwright global setup/full E2E, `npm run smoke:calendar` vì có thể ghi dữ liệu production.
- **CHƯA** kiểm tra trên iPhone thật, PWA thực tế hoặc số liệu Sentry production.
- **CHƯA** xác nhận score 9,5; cần PO xem diff, kiểm thử có kiểm soát trên môi trường có dữ liệu an toàn và có quyết định triển khai riêng.

### 7.5 Diff/rollback

- Chỉ thay 6 file ứng dụng Calendar/hook; tạo 1 file unit test; cập nhật spec này và `agent/GOALS.yaml`.
- Bốn file/thư mục **untracked trước task** (`docs/reports/data/`, `docs/reports/perf_2026-10-20_do-toan-he-thong.md`, `scripts/perf-route-js.mjs`, `scripts/perf-rpc-role-compare.mjs`) **được giữ nguyên**.
- Không migration/SQL, DB/Google write, refactor app-wide, dependency, auth hoặc finance.
- PO xem diff trước. Nếu sau này cần rollback: revert riêng thay đổi Calendar bằng Git; không cần SQL rollback.

## 8. Không thuộc phạm vi

- Thêm chức năng chọn ngày cưới theo tuổi, chấm điểm phong thủy, tiết khí chưa có dữ liệu xác thực.
- Tự tìm ngày còn trống; đặt lịch/đặt nhân sự; tạo hợp đồng từ drawer.
- Sửa bản chất lọc `contract_event`/`work_tasks` trong Calendar, mở rộng Google sync.
- Thiết kế SaaS/multi-tenant, thay theme/design system, refactor toàn Calendar, viết lại thuật toán âm lịch.
- Triển khai deep-link `?drawer=lunar` mới — vì hiện converter chỉ dùng nội bộ Calendar. Nếu PO muốn chia sẻ URL mở đúng drawer, thực hiện bằng một spec riêng.

**Quyết định cần PO duyệt:** Phạm vi sửa nhỏ như trên, đổi nhãn CTA “Xem chi tiết ngày”, và khi bấm “Xem lịch studio ngày này” dùng month+DayDrawer dưới 640px / DayView từ 640px trở lên.
