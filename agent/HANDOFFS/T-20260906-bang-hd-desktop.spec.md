# T-20260906-bang-hd-desktop — Bảng hợp đồng desktop (≥1280): 7 cột vừa khung, mã HĐ lùi xuống dòng phụ, không bao giờ mất cột

**Owner:** claude (spec → chủ duyệt → claude code → chủ xem diff) · **Trạng thái:** 🔍 CHỜ XEM DIFF — chủ "triển khai" 06/09 · code + verify 06/09 · **Chương trình:** bước #30a (kéo lên từ #30 theo lệnh chủ 06/09, `agent/GOALS.yaml`) · **DB:** KHÔNG đổi · **ADR:** không cần — chỉ trình bày; không đổi data-flow, RPC, state, lib.

## 0. Vì sao

Chủ 06/09 (ảnh PC): *"UI bị mất một khoảng đằng sau mà không hề có sự tối ưu các cột, admin nhìn vào không check được trạng thái"* · *"text mã hợp đồng quá bự mà không thật sự tối ưu"*.

Đo 06/09 bằng Playwright trên bản prod build (`/contracts?status=all`, sidebar mở):

| Màn hình | Bảng dùng | Bề rộng bảng | Khung | **Bị cắt, không thấy** |
|---|---|---:|---:|---:|
| 1024 | tablet (5 cột) | 832 | 832 | 0 ✓ |
| 1280 | desktop 11 cột | 1.727 | 912 | **815px = 47 % bảng** |
| 1366 (laptop phổ biến) | desktop | 1.727 | 998 | 729px |
| 1440 | desktop | 1.727 | 1.072 | 655px |
| 1536 | desktop | 1.815 | 1.168 | 647px |
| 1920 (màn 24–27") | desktop | 1.815 | 1.552 | **263px** → vẫn mất "Trạng thái" + "Thao tác" |

→ **Bảng desktop không vừa ở bất kỳ màn hình phổ biến nào**, và `TableWrapper` dùng `overflow-x-auto scrollbar-hide` (`components/ui/table.tsx:30`) nên phần thừa **biến mất không dấu vết** — admin không biết còn 5 cột nữa. Ảnh đo: `screenshots/contracts-measure/{1280,1366,1440,1536,1920}.png`.

Bề rộng từng cột đo được: Mã HĐ **204** · Khách hàng 282 · Ngày ký 112 · Sự kiện 152 · Tổng cộng 144 · Lợi nhuận 154 · Còn nợ 144 · Thông tin 109 · Tiến độ 152 · Trạng thái 176 · Thao tác 98. Mã HĐ đứng đầu, đậm, chiếm 12 % bề rộng cho một chuỗi lặp `HĐ-2026-` ở 100 % dòng.

## 1. Sự thật đã có sẵn (không làm lại)

- **Tab trạng thái có số đếm đã có** ở tablet/desktop (`contracts-list-client.tsx:247 tabsWithCounts`, `TabsFilter`) — 4 trạng thái: Chờ xử lý · Đang thực hiện · Hoàn thành · Đã hủy. Phone dùng pills. → Đề xuất "pipeline tab" của thị trường **Mood đã có**; không đụng.
- **Tablet (768–1279, vì `desktopAt="xl"`) đã đúng hướng**: 5 cột gộp ("Khách hàng / Ngày ký", "Tổng / Còn nợ", "Tình trạng" = checklist + tiến độ + chip), mã HĐ ghim trái 124px làm mốc khi cuộn ngang, nút "Đi" ghim phải, virtualizer. Vừa khung 832/832. **Không đụng.**
- **Phone (<768) card** 8 hàng: mã `text-xs` mờ, chip trạng thái góc phải, tên, dịch vụ + ngày, mốc, tiến độ, tiền, thanh thanh toán. Không hỏng; rút gọn card là việc của #30 (GĐ3). **Không đụng.**
- **Drawer chi tiết** mở khi bấm hàng (`onView`) và drawer lợi nhuận (`onViewProfit`) — nơi chứa Tổng cộng, chi phí, checklist đầy đủ.
- Dữ liệu thật (62 HĐ, 06/09): tên khách trung bình 11 ký tự, p90 18, dài nhất 23 → cột 250px đủ không cắt; số tiền lớn nhất 13.000.000 (14 ký tự); trung bình 2,7 task · 3,4 mốc mỗi HĐ; **0/62 HĐ thiếu checklist** → cột "Thông tin" hôm nay không mang thông tin nào (toàn "Đầy đủ"/"Chưa có"); trạng thái 57 hoàn thành · 5 đang thực hiện · 0 chờ · 0 huỷ.
- Luật vault/C0: mốc thời gian vận hành là **ngày chụp** (`work_date`); bảng desktop đang hiện "Ngày ký" (`contract_date`), card phone đã dùng `work_date || contract_date`.

## 2. Phạm vi — 2 file, 0 DB

### 2.1 `components/ui/table.tsx` — **additive**: 2 prop cho `TableWrapper`
- `showScrollbar?: boolean` — mặc định `false` (giữ `scrollbar-hide` cho tablet có cột ghim). `true` → bỏ `scrollbar-hide`: nếu bảng lỡ tràn **phải thấy thanh cuộn**, không bao giờ mất cột âm thầm.
- `containerQuery?: boolean` — mặc định `false`. `true` → thêm class `@container` lên div cuộn để bảng con dùng `@min-[…]:`/`@max-[…]:` theo bề rộng khung. Không đổi TH/TD/THead/TBody/TR; các bảng khác không ảnh hưởng.

### 2.2 `components/contracts/contracts-table.tsx` — chỉ `DesktopTable` + `DesktopTableRow` (dòng 108–300)
Bảng `table-fixed` + `<colgroup>`; `TableWrapper showScrollbar`; TH/TD dùng `px-3` (thay `px-4 2xl:px-5` qua `className`) để 7 cột nằm trong 912px ở 1280.

| # | Cột | Rộng | Nội dung | Từ đâu |
|---|---|---:|---|---|
| 1 | **Khách hàng** | 250 | dòng 1: avatar 28 + **tên đậm** (truncate, `title`) + badge dịch vụ · dòng 2: `HĐ-2026-0044` (`text-tiny text-text-muted tabular-nums`, `title`=mã) + `MissingInfoBadge` **chỉ khi `missing > 0`** | mã & checklist từ cột 1 và cột 8 cũ |
| 2 | **Ngày chụp** | 96 | `work_date`; thiếu → `contract_date` kèm tiền tố nhỏ "ký" (như card phone) | thay "Ngày ký" |
| 3 | **Trạng thái** | 136 | `Badge dot`, cỡ `text-tiny` như bảng tablet (chip "ĐANG THỰC HIỆN" in hoa 135px tràn cột 120 — phát hiện khi chụp 1366) | từ cột 10 → lên cột 3, luôn trong khung |
| 4 | **Sự kiện** | 140 | `ContractMilestones compact` (giữ) | như cũ |
| 5 | **Tiến độ** | 140 | `ProgressBadge` (giữ) | như cũ |
| 6 | **Còn nợ** | 130 | dòng 1: số đỏ hoặc chip "Đủ" · dòng 2: `Tổng 8.900.000` (`text-tiny text-text-muted`) | gộp cột Tổng cộng vào (mẫu tablet) |
| 7 | **Lợi nhuận** | 140 | 2 dòng như cũ, bấm mở drawer | chỉ khi `showFinancials` **và khung bảng ≥ 1080px** (container query, xem dưới) |
| 8 | › | 44 | nút như cũ | như cũ |

**Responsive theo bề rộng KHUNG BẢNG, không theo viewport** — vì sidebar co/giãn `w-64`↔`w-20` (`sidebar.tsx:57`) làm khung lệch 176px cùng một viewport, và zoom 110–125% cũng vậy; breakpoint viewport (`2xl:`) mù với cả hai. Tailwind v4 của repo có container query sẵn (`@container`, `@min-[…]:`), chưa dùng ở đâu — dùng lần đầu ở đây: `@container` đặt lên div cuộn của `TableWrapper` (prop mới, xem §2.1).

| Khung bảng | Cột | Cách | Bề rộng | Khi nào gặp |
|---|---:|---|---:|---|
| < 880px | 6 | ẩn "Sự kiện" (`hidden @min-[880px]:table-cell` trên TH/TD) — chi tiết mốc vẫn trong drawer, Tiến độ vẫn hiện | 740 | 1280 zoom 125% (khung ≈730) · 1280 + panel lọc nâng cao |
| 880–1079px | **7** | bản chuẩn | 880 | 1280–1440 sidebar mở (912–1.072) |
| ≥ 1080px | 8 | thêm Lợi nhuận (`hidden @min-[1080px]:table-cell`) | 1.020 | 1366 sidebar thu (~1.170) · 1536 (1.168) · 1920 (1.552) |

Tính: 250+96+136+140+140+130+44 = 936 − 56 (`px-3` thay `px-4`, 7 cột × 8) = **880** < 912 ✓; 6 cột = 740; 8 cột = 1.020. Bề rộng đặt trên `TH` (`table-fixed` lấy từ hàng đầu), không dùng `<colgroup>` — cột tuỳ khung ẩn/hiện bằng class trên TH/TD. Cột 1 `width:auto` trong `colgroup` để nuốt phần dư ở màn rộng (tên khách không cắt). Vẫn tràn (khung < 724) → **thanh cuộn hiện** (§2.1), không bao giờ mất cột âm thầm.
- Bỏ khỏi bảng desktop: cột **Mã HĐ riêng**, **Ngày ký**, **Tổng cộng** (vào dòng 2 Còn nợ), **Thông tin** (chỉ hiện khi thiếu, trong cột 1). Không mất dữ liệu: Tổng và checklist đầy đủ có trong drawer.
- Không đổi: `TierSwitch desktopAt="xl"`, `MobileCardList`, `ContractsTabletTable`, memo comparator, `onView/onHover/onViewProfit`, phân trang, tab lọc, sắp xếp, RPC.

### 2.7 Đợt 2 — chủ "tối ưu 10/10 đi" (06/09, sau khi xem dev)
Bốn điểm tôi tự chấm còn thiếu, chủ yêu cầu làm luôn thay vì để #30. Đây là đổi *hành vi hiển thị*, không đổi data/RPC:

| # | Điểm | Sửa | File |
|---|---|---|---|
| a | Tab "Tất cả" mặc định = bức tường xanh (57/62 xong) | **Mặc định `status=dang_thuc_hien`** khi vào `/contracts` không tham số; "Tất cả" vẫn là tab. Phải đổi ở **cả 2 nơi** mặc định (server `page.tsx` + `CONTRACT_FILTER_DEFAULTS` của hook — nuqs `clearOnDefault` bỏ param khỏi URL khi bằng mặc định; lệch nhau là `initialData` bị bỏ qua) | `app/(protected)/contracts/page.tsx:24`, `hooks/useContractFilters.ts:35` |
| b | Pill 2 dòng cho HĐ đã xong → hàng 56px, 3 tín hiệu xanh trùng | HĐ `hoan_thanh`/`da_huy`: Sự kiện và Tiến độ hiện **1 dòng gọn** `✓ n/n` (đếm từ `contract_events` không `da_huy` / `work_tasks` qua `getProgressInfo`); HĐ đang chạy giữ pill đầy đủ. Pill co theo **trạng thái**, không theo màn | `contracts-table.tsx` DesktopTableRow |
| c | "Lợi nhuận +5.500.000" khi chi phí = 0 → số giả | `total_cost === 0` → hiện `—` mờ + `title="Chưa ghi chi phí — lợi nhuận chưa xác định"`, vẫn bấm mở drawer. Áp cả 3 tầng cho một nghĩa | `contracts-table.tsx` (desktop + card phone), `contracts-tablet-table.tsx:146` |
| d | Thanh tab bị cắt "Hoà…" ở 1280 (`overflow-hidden`) | vùng lọc desktop `flex-wrap`; tab `overflow-x-auto` thay `overflow-hidden` — hẹp thì nhóm dropdown xuống dòng, không bao giờ cắt chữ | `contracts-list-client.tsx:434–436` |

Verify thêm (đưa vào `contracts-table-desktop.spec.ts`): `/contracts` không param → tab "Đang thực hiện" active, mọi hàng chip "Đang thực hiện"; `?status=hoan_thanh` → hàng HĐ xong không có pill 2 dòng (chiều cao hàng ≤ 52px) và ô Lợi nhuận là `—` khi chi phí 0; @1280 tab "Đã hủy" nằm trong khung.

## 3. Ngoài phạm vi (ghi để không lạc — thuộc #30 GĐ3)
- Card phone rút 8 → 3 hàng; gộp "Sự kiện + Tiến độ" thành 1 chỉ báo; cột tuỳ chọn (column chooser); pipeline kanban; luật đóng HĐ/mốc giao; C6.
- Mã HĐ ở tablet giữ đậm 124px vì là cột ghim dẫn đường khi cuộn ngang (khác vai trò với desktop).
- `whitespace-nowrap` mặc định của TD giữ nguyên cho bảng khác.

## 4. Verify — số chờ điền

| Kiểm | Lệnh / cách | Chờ |
|---|---|---|
| Không tràn | Playwright (seed 1 admin, dọn) `/contracts?status=all` @1280 · 1366 · 1440 · 1536 · 1920: `table.scrollWidth − scroller.clientWidth` | **≤ 0 ở cả 5** (hiện tại: 815 · 729 · 655 · 647 · 263) |
| Cột Trạng thái | cùng chạy: `th:has-text("Trạng thái")` `isVisible()` và `getBoundingClientRect().right ≤ scroller.right` | đúng ở cả 5 màn |
| Số cột theo KHUNG | `thead th:visible` | **7** ở 1280/1366/1440 sidebar mở · **8** ở 1536/1920 · **8** ở 1366 **sidebar thu** (bấm nút thu, khung ≈1.170) · **6** ở 1280 **zoom 125%** (Chromium: `document.documentElement.style.zoom = "1.25"` → khung ≈730 CSS px, đo `scroller.clientWidth`) — không tràn ở cả 4 |
| Tablet/phone không đổi | @1024: 5 `th`, bảng 832/832 · @390: `.card-base` ≥1, không `table` | y như trước |
| Chữ | tên 23 ký tự (HĐ dài nhất hiện có) không cắt ở 1280; mã HĐ `title` đúng; "Tổng …" dòng 2 = `total_amount` | mắt + assert text |
| Hồi quy e2e có sẵn | `contract-operational.spec.ts` (đi qua /contracts, bấm hàng) · `contracts-tablet-ipad.spec.ts` (tablet) | pass như HEAD |
| Kiểu/lint/build | `npx tsc --noEmit` · eslint 2 file · `npm run build` | 0 · 0 · OK |
| Ảnh | 6 viewport → `screenshots/contracts-desktop/` | đính §6 |

## 5. Rủi ro & đường lùi
- Người quen tìm "Mã HĐ" ở cột đầu: mã vẫn ở dòng 2 cột 1, cùng vị trí mắt; tìm kiếm theo mã (ô tìm) không đổi.
- Zoom trình duyệt 125 % ở 1280 → khung ~730px → tràn ~130px: giờ **thấy thanh cuộn** (trước: mất). Chấp nhận.
- Container query lần đầu dùng trong repo: `<col>` không nhận class ẩn theo container trong mọi trình duyệt như `<td>` → `colgroup` chỉ đặt width cho cột luôn hiện; 2 cột tuỳ khung (Sự kiện, Lợi nhuận) đặt width trực tiếp trên TH (`table-fixed` lấy width từ hàng đầu). Kiểm Safari (iPad Pro landscape 1366 dùng bảng desktop) bằng preset Playwright `iPad Pro 11 landscape`.
- Safari/WebKit hỗ trợ container query từ 16 (2022) — iPad của chủ chạy iOS 17+ → ổn; ghi vào §6 khi kiểm.
- Đường lùi: `git revert` 1 commit, không DB.

## 6. Kết quả — 06/09/2026

| Kiểm | Kết quả |
|---|---|
| tsc · eslint (2 file) · build | 0 · 0 · OK; CSS sinh `@container (min-width:880px)` và `(min-width:1080px)` (Tailwind 4.2.1) |
| Không tràn (Playwright `tests/e2e/contracts-table-desktop.spec.ts`, chromium, `next start`) | @1280: **912/912** · @1366: **998/998** · @1440: **1072/1072** · @1536: **1168/1168** · @1920: **1552/1552** → tràn **0** ở cả 5 (trước: 815 · 729 · 655 · 647 · 263) |
| Cột Trạng thái | visible và nằm trong khung ở cả 5 màn (cột 3) |
| Số cột theo khung | 1280/1366/1440 → **7** · 1536/1920 → **8** (Lợi nhuận) · **1366 sidebar thu**: khung 998 → **1174** → **8 cột**, tràn 0 · **khung ép 800px**: **6 cột**, ẩn "Sự kiện", Trạng thái vẫn trong khung, tràn 0 |
| Tablet / phone không đổi | @1024: 5 cột `Mã HĐ · Khách hàng / Ngày ký · Tổng cộng / Còn nợ · Tình trạng · Đi`, 832/832 · @390: không `table`, card `button.card-base` ≥ 1 |
| **Chủ bắt lỗi khi xem dev (06/09)** | Cột Khách hàng để `width:auto` → ở khung rộng nó **nuốt toàn bộ phần dư** (~700px trống giữa bảng ở ~1.550px). Test chỉ đo "không tràn" nên lọt. Sửa: mọi cột có bề rộng cơ sở border-box (228+100+132+136+136+132+44 = **908 ≤ 912**; 8 cột 1.044 < 1.080; 6 cột 772 < 880), pill cột `px-2` để `min-w-30` nằm gọn, chip trạng thái căn giữa → `table-fixed` chia phần dư **theo tỷ lệ**. Đo lại: @1920 Khách hàng **339 (22% khung)** · các cột 149–202; @1366 251/110/145/149/149/145/48. Thêm assert: không cột nào > 40% khung. Bài học: đo phân bổ, không chỉ đo tràn. |
| Mắt (ảnh `screenshots/contracts-desktop/*.png`) | 1366: tên đậm + mã nhỏ dòng 2, chip trạng thái gọn trong 136px (lần chụp đầu chip 120px đè lên Sự kiện → sửa `w-[136px]` + badge `text-tiny`), Còn nợ đỏ + "Tổng …" dòng 2, › cuối. 1280: tên 20 ký tự bắt đầu cắt "…" (có `title`) — tên thật p90 18 ký tự đủ chỗ |
| Hồi quy e2e | `contract-operational.spec.ts` (đi qua /contracts, bấm hàng) **pass** cùng lượt · `contracts-tablet-ipad.spec.ts` chạy nhầm project chromium (viewport desktop) → 7 timeout **không phải hồi quy** (spec cho iPad); chạy lại project `iPad Pro 11 landscape`: test 2 **"bảng tablet virtualization ≤ 40 hàng" PASS** (bảng tablet render đúng); test 1/3/4/5 đỏ vì lỗi **đã biết từ T-20260830** — `mouse.wheel` không có trên mobile WebKit, `goto` bị điều hướng `/dashboard` ngắt ngay sau login, `locator.click` timeout do virtualizer tái dụng hàng — không liên quan #30a (`contracts-tablet-table.tsx` không đổi; class TableWrapper cho tablet giữ nguyên) |
| Zoom 125% @1280 | không đo được bằng CSS `zoom` (Chromium không đổi `clientWidth`); zoom thật đưa viewport CSS < 1280 → `TierSwitch` sang bảng tablet — đúng thiết kế. Tầng 6 cột chứng minh bằng ép khung 800px (đúng tín hiệu `@container` đọc) |
| Rác e2e | spec iPad **treo ~30 phút** sau test 4 (livelock đã biết) → phải dừng tay → teardown không chạy → còn 21 HĐ E2E, 3 khách, 2 nhân sự, 1 auth. Dọn bằng `ALLOW_PROD_WRITE=1 node scripts/cleanup-e2e-data.mjs` (đúng cửa S3) + xoá auth `@test.local`. Quét 6 bảng sau dọn: **0**. Bài học ghi sổ: không chạy `contracts-tablet-ipad.spec.ts` cho tới khi sửa 3 lỗi WebKit của nó (T-20260830). |

**Đợt 2 (§2.7) — đo trên dev server, Playwright test 4/5 mới, 5/5 PASS:**

| Kiểm | Kết quả |
|---|---|
| (a) mặc định | `/contracts` không tham số → 20/20 chip trong bảng = "Đang thực hiện"; `?status=all`/`hoan_thanh` vẫn hoạt động; 2 nơi mặc định khớp (`page.tsx` + `CONTRACT_FILTER_DEFAULTS`) |
| (b) hàng gọn | tab Hoàn thành: chiều cao hàng **48px ×10** (trước 56–58), 37 dấu hoàn tất / 20 hàng. **Chủ bắt lỗi lần 2 (06/09 tối):** bản đầu `✓ 1/1` là chữ nhỏ trôi trong ô 150–200px → "trống, lồi lõm" cạnh hàng pill đầy. Sửa: HĐ xong = **pill mảnh 1 dòng cùng bề rộng** (`bg-success/10`, "✓ Hoàn tất · n/n"), ô rỗng = pill mờ "Không có việc/mốc" — cùng ngôn ngữ hình khối với pill đang chạy, hàng vẫn 48px (ảnh `1280-hoan-thanh-gon.png`). "Chưa ghi chi phí" gọn 2 dòng nhỏ. |
| (c) lợi nhuận | 8 hàng "— Chưa ghi chi phí" (chi phí 0) · 12 hàng có chi phí hiện số — cả 3 tầng cùng luật |
| (d) tab @1280 | "Đã hủy" trong khung (x+w ≤ 1280); nhóm dropdown xuống dòng 2 thay vì cắt chữ (ảnh `1280-hoan-thanh-gon.png`) |
| Không hồi quy đợt 1 | 5 màn tràn 0, sidebar thu → 8 cột, khung 800 → 6 cột, tablet 5 cột, phone card — tất cả PASS lại |

Tự chấm sau đợt 2 (+ sửa pill mảnh): 9/10 — còn lại: tên khách ≥ 20 ký tự cắt "…" ở đúng 1280 sidebar mở (có `title`); HĐ đang chạy vẫn pill 2 dòng (cố ý — phải thấy việc kế tiếp); mặc định tab đổi là thay đổi hành vi, đã ghi CHANGELOG hành vi ở §6 này để ai quen "Tất cả" biết bấm tab.
