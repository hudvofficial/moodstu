---
title: "Kiểm kê — Thiết kế ban đầu ↔ Vận hành thực tế"
lat-cat: 00-tong-hop
cap-nhat: 2026-09-01
trang-thai: da-kiem-2026-09-01
nguon: agent/system-map/01–09 · vault/30-du-lieu (sinh từ DB) · số đo production 31/08–01/09
---

# Thiết kế ban đầu ↔ Vận hành thực tế

Đây là phần **diễn giải** đi kèm bảng kiểm kê máy sinh (`01–15.md` cùng thư mục). Máy trả lời *cái gì tồn tại, ai ghi, ai đọc*; file này trả lời *nó được tạo ra để làm gì và hôm nay có còn chạy đúng ý đồ không*.

Thang mức độ: **✅ khớp** · **⬛ chết** (tồn tại nhưng không chạy) · **🟡 lệch** (chạy khác ý đồ, chưa gây hại đo được) · **🔴 nguy hiểm** (đã đo được hại hoặc chắc chắn nổ).

---

## A. Khớp thiết kế — nền đúng, đụng vào là hỏng thứ đang tốt

| Phần tử | Thiết kế ban đầu | Vận hành thực tế |
|---|---|---|
| `record_payee_payment_atomic` | một cửa trả tiền cho 4 loại đối tác (ADR-016) | ✅ khớp — mọi luật (khoá kỳ, chặn vượt nợ, dẫn xuất lại trạng thái) đúng ở một chỗ |
| Cam kết ↔ phiếu chi | nợ nằm trên bản ghi gốc, phiếu chi chỉ khi tiền rời két, nối bằng `expense_allocations` đa hình | ✅ khớp — không còn "chi phí trích trước" |
| `is_period_locked` | biến quá khứ thành bất biến theo tháng | ✅ khớp — kiểm trong mọi RPC thu · chi · lương |
| Realtime signal-only | publication chỉ chứa `realtime_signals`, bảng tiền không phát dữ liệu | ✅ khớp — 15 bảng đã gỡ, 35 bảng bắn trigger, 100% client dùng signal |
| Máy trạng thái đơn in | ADR-014: trục 4 bước + huy_don/gap_su_co, canh 2 lớp | ✅ khớp — `VALID_TRANSITIONS` (code) + CHECK (DB), bắt buộc lý do khi lùi |
| Gallery 3 mức token | khách không tài khoản: xem tự do · chọn cần mật khẩu · tải cần thanh toán | ✅ khớp — token 12h, khoá 10 lần sai/15', 402 khi chưa trả |
| Lớp trigger dẫn xuất | 81 trigger tính lại tiền/trạng thái tại DB bất kể ai ghi | ✅ khớp — đang là lưới cứu cho cả chỗ code vi phạm (xem C) |
| RLS client-direct | 6 bảng đọc từ browser, RLS làm cổng | ✅ policy có thật, đã đọc nội dung (nhưng xem C — 1 policy mở quá rộng) |
| Kỷ luật thu tiền (vận hành người) | tiền về khi giao hàng | ✅ đo được: 33 HĐ hoàn thành, **nợ = 0đ** |

## B. Chết — tồn tại trong hệ thống nhưng không chạy

| Phần tử | Thiết kế ban đầu | Thực tế | Bằng chứng |
|---|---|---|---|
| Bảng `debts` | sổ công nợ riêng | ⬛ 0 dòng — nhưng `get_finance_intelligence` **vẫn đọc** → điểm công nợ trong health_score luôn "Lành mạnh" | `luong_cung_m5.sql:354-362,439-441` |
| `get_contract_balance` | công nợ 1 HĐ (vault từng khuyên dùng) | ⬛ 0 caller, không có CREATE trong repo | `ham-mo-coi.md` |
| `get_customer_ltv` | LTV cho CRM — vòng khách quay lại | ⬛ 0 caller; `getCustomers` vẫn cộng ở JS | `customer-actions.ts:92-98` |
| `finance_receipt_stats` · `decrement_goal_amount` · `backfill_payment_plan_ssot_v2` | — | ⬛ 0 caller | `ham-mo-coi.md` |
| `checkEmployeeAvailability` | chống trùng lịch nhân sự | ⬛ định nghĩa 2 nơi, **0 nơi gọi** — xếp trùng giờ không ai báo | `calendar-task-actions.ts:174` · `task-assign-actions.ts:146` |
| `validatePayrollWarningsAction` | cảnh báo "task chưa gán / cost 0đ" khi lập lương | ⬛ chết lặng — lọc `"Hoàn thành"` trong khi giá trị thật `hoan_thanh` | `salary-actions.ts:259,355` |
| Cột `employee_salaries.monthly_salary` · 5 cột `monthly_salaries.*_total` | tổng hợp lương | ⬛ không ai ghi, UI đọc luôn ra 0/NULL | `finance-operations-queries.ts:711,749-753` |
| `deleteInventoryTransaction` | nút xoá giao dịch kho | ⬛ không bao giờ chạy được — chỉ nhận `source_type` NULL/'manual', cả hai không tồn tại | `inventory-mutations.ts:619` |
| `dress_rentals.status='overdue'` · `dresses.status='maintenance'` | trạng thái quá hạn/bảo trì váy | ⬛ không đường ghi nào | `03-in-kho-vay.md §8` |
| Bảng `evaluations` · `attendance` | đánh giá, chấm công | ⬛ có bảng, **0 dòng code** dùng | `08-dichvu-muctieu §5` |
| Nhánh `da_nhan` trong `updatePrintingOrderStatus` | — legacy | ⬛ không transition nào tới | `printing-mutations.ts:211-213` |
| `withContractAccess/Write/Destructive` | guard chuẩn cho contract action | ⬛ định nghĩa, 0 call-site | `lib/auth_utils.ts:852-877` |
| 3 cache tag (`contract-list` · `contract-stats` · `studio-info`) | invalidate cache | ⬛ no-op — không producer nào gắn tag | `lib/server-cache-invalidation.ts:4-5` |
| `AuditAction "LOGIN"` | ghi nhật ký đăng nhập | ⬛ 0 call-site — đăng nhập không để lại vết | `09-baocao-caidat §4` |
| `isContractStatusForwardTransition` · hàm `canMoveTo` (vault nhắc) | — | ⬛ dead code / không tồn tại | `contract-workflow.ts:39` |

## C. Lệch — chạy khác ý đồ

### 🔴 Đã đo được hại hoặc chắc chắn nổ

| Phần tử | Thiết kế | Thực tế | Số đo |
|---|---|---|---|
| ~~`cancel_contract_cascade`~~ **→ ✅ #13 R1 áp 07/09** | huỷ HĐ kéo theo đơn in | ~~ghi `'da_huy'` mà CHECK (24/08) chỉ cho `huy_don` ⇒ abort cả transaction~~ → ghi `huy_don`; tái hiện + fix trên local; chờ #14 huỷ thật | **5 HĐ không huỷ được** · constraint validated=true · 0 đơn mang da_huy ⇒ chưa từng chạy thành công từ 24/08 |
| ~~Thẻ "Doanh thu tháng" `/dashboard`~~ **→ ✅ #8 commit d8d9de0 05/09 (chưa push):** 3 thẻ đọc `finance_pnl_by_month` | KPI doanh thu | không đọc sổ kỳ — hiển thị **tiền đã thu** dưới nhãn doanh thu | hiện 18,35tr · doanh thu thật 46,33tr — **lệch 27,98tr** trên màn mở đầu mỗi ngày |
| `asNumber` kẹp sàn 0 (`lib/finance-utils.ts:67`, "P0-3 FIX") | ép số an toàn | dùng cho **`profit`, `cash_net`** ở `/finance/dashboard` (`finance-dashboard-queries.ts:119,133,167,472,636,794`) → **tháng lỗ hiện 0đ, két âm hiện 0đ** | phát hiện 05/09 qua review #8; `finance_pnl_by_month` có `cost_fixed`+`cost_salary_base` nên tháng vắng chụp lỗ là bình thường → số sai chắc chắn xảy ra. `/dashboard` đã né bằng `asSignedNumber` (#8); `/finance` sửa ở #29 |
| Đồng bộ Google cho sự kiện HĐ | mốc HĐ lên Google Calendar | 🔴 **phát hiện 02/09:** `contract_events.google_sync_status` = 141 not_required · **76 failed · 0 thành công**; `google_sync_queue` 0 dòng; token Google có. Cơ chế gọi thẳng API (không qua queue) thất bại 100% số lần thử | 76/76 thất bại |
| ~~`calendar_month_events` phân quyền~~ **→ ✅ #24 áp 10/09 (ADR-019):** thêm `p_employee_id uuid DEFAULT NULL`, app truyền `null` cho admin/manager, id người cho vai khác; ACL giữ `{postgres, service_role}` | lịch theo người | ~~RPC **không có** `WHERE employee_id` — chỉ fallback TS lọc~~ → RPC lọc lịch tay; mốc HĐ + việc vẫn toàn studio (C9) | ~~`sale`/`media` thấy lịch **mọi** nhân sự~~ → prod `(9,2026,NULL)`=83, id khác=82; e2e sale `/calendar` OK |
| Nhật ký kiểm toán | truy được "ai làm gì" | policy chống sửa/xoá tốt (đã đọc trên DB), nhưng đếm lại 01/09: **169 điểm gọi, chỉ 10 truyền `performedBy`** (~94% thiếu người thực hiện); đăng nhập, gallery, lịch không ghi; bộ lọc UI dùng enum không tồn tại | 16.074 dòng, phần lớn hiện "Hệ thống" |
| ~~`contracts` 2 policy SELECT~~ **→ ✅ #24 áp 10/09 (ADR-019):** 9 bảng HĐ còn 1 policy `<bảng>_read` gương `ROLE_PERMISSIONS` (46→16 policy); **phát hiện thêm khi trace:** nhánh "HĐ của tôi" chết từ thiết kế (`created_by` = auth uid ≠ `employees.id`, 0/63) và `authenticated` có full DML 9 bảng (63 grant) dù app ghi 100% qua service role → REVOKE (63→9 SELECT), gỡ 24 policy ghi | `contracts_select` scope theo người tạo/được gán | ~~`contracts_authenticated_read USING is_active_employee()` **cộng OR** ⇒ scope vô hiệu~~ → đọc theo vai admin/manager/sale; ghi chỉ qua server action | ~~mọi nhân viên active đọc mọi HĐ qua client-direct~~ → probe REST 15/15: ctv đọc 0, sale ghi 403 `42501`; lúc vá chỉ 1 admin có login, 3 sale + 6 ctv chưa có (vá trước khi cấp) |
| ~~Nợ lab~~ | ghi nhận trả qua `record_lab_payment_atomic` | ✅ **ĐÍNH CHÍNH 02/09 — không phải lỗi.** Số "8,15tr chưa ghi" lấy từ CURRENT_STATE 24/08, TRƯỚC M2b (26/08) di trú `lab_payments` cũ vào `expenses`. Thực tế: Hồng Bảo 33 đơn cam kết 9.841.400 · **26 phiếu chi 7.936.400 đã ghi & phân bổ đủ** · còn nợ **1.905.000đ** (khớp màn /printing) · 22/26 phiếu ghi cùng ngày 24/08 ⇒ trả theo đợt gộp. Còn lại: 3 phiếu `payee_type=lab` 500k không gắn `payee_id` (rác nhỏ) | mục 🔴 giảm 6→5 |

### 🟡 Cơ chế sai, chưa phát tác (nổ khi dữ liệu chạm vào)

| Phần tử | Thiết kế | Thực tế | Điều kiện nổ |
|---|---|---|---|
| `currentPeriod()` `/dashboard` (`lib/api/dashboard.ts:129`) | tháng hiện tại theo giờ VN | `new Date().getMonth()` theo giờ **server (Vercel = UTC)** | 7 giờ đầu mỗi ngày 1 (00:00–07:00 VN) 6 thẻ + nhãn kỳ vẫn là tháng trước (+cache 120 s). Có sẵn trước #8; sửa ở #29 cùng luật `vn_date()` |
| Thẻ "Hoàn thành" `/dashboard` | đếm HĐ hoàn thành trong tháng | đếm `status='hoan_thanh'` theo **`updated_at`** (RPC `dashboard_critical_kpis` + fallback) — vi phạm luật vault "không đo bằng updated_at" | mọi lần sửa HĐ đã xong (ghi chú, đổi ảnh) → nhảy sang tháng hiện tại. Sửa ở #29 (mốc `giao_san_pham` hoặc `completed_at`) |
| `scripts/verify-dashboard.mjs` (gate `verify:dashboard`) | gate module Dashboard | assert `from("payment_plans")` + `isPaidPlanStatus` **lỗi thời** từ ADR-016 M3 (nhắc thu đã chuyển sang RPC `finance_pending_collections`) → gate **đỏ vĩnh viễn**, không ai còn tin | mọi thay đổi dashboard mất gate tự động. Đo 05/09: đỏ cả trước và sau #8. Sửa script ở #29 |
| `scripts/run-migration.mjs` · `auto-migrate.mjs` · `run-vendor-migrations.mjs` | chạy migration qua RPC | gọi RPC **`exec_sql` không tồn tại** trên DB (đo `pg_proc` 05/09) → luôn lỗi, script chết | ai gọi sẽ nghĩ "migration áp xong" khi đọc log nửa chừng. #10 gắn cờ cho có; dọn ở GĐ4 |
| `get_contract_detail_v2` · `get_contract_list_v2` | hàm đọc | khai `VOLATILE` dù chỉ SELECT → Postgres không tối ưu (không inline, không cache trong 1 statement), và mọi bộ quét "hàm có thể ghi" đều báo nhầm | sửa `STABLE` ở #29 (đổi định nghĩa hàm = 🗄️) |
| `tests/unit/ledger-fallback-sort.test.ts` | unit test xác định | **chập chờn**: đỏ 2/3 lần khi chạy song song toàn bộ, xanh khi chạy riêng (đo 06/09) | gate jest mất tin. Xem ở #29 (module Đọc số) |
| `tests/integration/moodie-*-live.test.ts` (4 file) | test tích hợp | ~~tạo user trên DB **production** mỗi lần `npm test`, fail giữa chừng không dọn (rò 2 user 05/09)~~ **→ ✅ #10: chỉ chạy khi `ALLOW_PROD_WRITE=1`** | — |
| Mốc `giao_san_pham` `hoan_thanh` với `event_date = NULL` | mốc xong phải có ngày | UI cho đánh "xong" không bắt ngày → `finance_month_summary.receivable_due` (chỉ cần *có* mốc xong) ≠ `finance_debt_stats.overdue` (cần *ngày* để tính tuổi) | đo 07/09: HĐ-2026-0058 → 9,8tr vs 3,3tr, `verify:reports` đỏ. #26: CHECK `status='hoan_thanh' ⇒ event_date IS NOT NULL` (NOT VALID → sửa 1 dòng → VALIDATE); #30: đóng HĐ ⇒ mốc giao có ngày |
| 17 server action CRM (`lead-actions.ts`, `lead-lifecycle.ts`) | T3 tầng 3: action kiểm vai | chỉ `withAuth` (đăng nhập) — không đọc ma trận; sau #22 sale bị chặn ở cửa trang nhưng gọi action trực tiếp vẫn qua | đo 07/09 khi trace #22 → #19 (inject actor + luật vai tại `withAuth`) |
| Đóng HĐ không ràng buộc đơn in | HĐ xong ⇒ đơn in xong/huỷ | UI cho đóng HĐ khi đơn in còn `cho_xu_ly`/`dang_in`/`da_in` | đo 07/09 (#15): 3 đơn của HĐ đã đóng 06/09 (0051 chờ xử lý 370k · 0062 đang in · 0060 đã in) vẫn mở, vẫn nợ lab → #30 cùng luật với mốc giao |
| ~~Hoàn tiền HĐ huỷ~~ **→ ✅ #12 R2 áp 07/09** | chi phí đối ứng doanh thu | ~~phiếu `other` có `contract_id` vào `cost_direct` không lọc~~ → `finance_period_ledger` + `contract_financials` loại danh mục `contract_refund/refund/hoan_tien` khỏi chi phí; `cash_out` giữ | còn: cọc giữ lại khi huỷ chưa là thu nhập (#29/#30) |
| ~~Bảng HĐ desktop `/contracts` (≥1280)~~ **→ ✅ #30a commit 2a53dd6 07/09** | bảng vận hành đọc được trạng thái | ~~11 cột nowrap 1.727px trong khung 912–1.552px, thanh cuộn ẩn → mất 5 cột kể cả Trạng thái ở mọi màn~~ → 7/8/6 cột theo khung (container query), mặc định tab đang chạy, HĐ xong hàng gọn, lợi nhuận "—" khi chưa chi phí | còn cho #30: pill đang chạy 2 dòng, tên ≥ 20 ký tự cắt ở 1280, column chooser |
| Đóng HĐ (`hoan_thanh`) không ràng buộc mốc giao | HĐ xong ⇒ đã giao sản phẩm | UI cho đóng HĐ khi mốc `giao_san_pham` còn `chua_lam`/`da_huy` — không trigger/CHECK nào giữ bất biến; cũng không có gợi ý "thu đủ + giao xong → đóng" nên 9 HĐ nằm mở tới khi admin rà tay 06/09 | đo 06/09: 4/7 HĐ vừa đóng có mốc giao chưa làm (0014, 0030) hoặc đã huỷ (0006, 0010) → "Cần thu tiền theo mốc giao" và báo cáo giao lệch. #30: đóng HĐ ⇒ tự đánh mốc giao xong hoặc chặn; thêm luật đề nghị đóng |
| ~~Hoàn tiền HĐ huỷ~~ (✅ #12, xem dòng ở bảng 🔴/🟡 trên) | chi phí đối ứng doanh thu | phiếu `other` có `contract_id` vào `cost_direct` **không lọc trạng thái HĐ**, doanh thu thì loại `da_huy` | HĐ đầu tiên bị huỷ có hoàn tiền (hiện 0 HĐ `da_huy`) |
| `/calendar` chỉ hiện lịch tay + Google | RPC UNION 3 nguồn (lịch tay + mốc HĐ + task) | client lọc bỏ 2 nguồn — **comment ghi rõ chủ đích** ("Chỉ hiển thị lịch chính", `use-calendar-data.ts:148-149`) ⇒ nhiều khả năng quyết định sản phẩm, nhưng RPC vẫn tính thừa 2 nguồn và UI giữ badge chết | cần CHỐT: có muốn mốc HĐ/task lên lịch không |
| `/finance/goals` cashflow | đọc sổ kỳ | tự cộng 5 bảng, **trừ lương + chi phí cố định 2 lần** (expenses đã chứa) | dòng `monthly_salaries`/`fixed_costs` đầu tiên (hiện cả hai 0 dòng) |
| `buildCloseSnapshot` + `finance_cashflow_timeline` | "một sổ kỳ duy nhất" (ADR-016 M2) | 2 công thức tiền song song còn sống — đúng lớp lỗi M2 đã diệt | số lệch khi nghiệp vụ phức tạp lên |
| `contracts.total_amount` | "tiền luôn tính ở server" | **client tính** rồi gửi vào RPC — trigger đang cứu phần paid/remaining | nếu trigger đổi hoặc client sai công thức |
| `work_tasks.status` · `contract_events.status` | máy trạng thái | `text` tự do, không enum, không CHECK — nền của lỗi lương ở mục B | mọi lần so sánh chuỗi sai chính tả |
| Convert lead → khách | khớp khách cũ theo SĐT | RPC so `BTRIM`, `createCustomer` lưu bản `normalizePhone` ⇒ `+84…` ≠ `0…` | lead ghi +84 → **tạo khách trùng** |
| `customers.created_by` | một loại id | 2 loại (auth id ↔ employees.id) tuỳ đường tạo, **không FK** | mọi join/audit theo cột này |
| `markLeadAsLost` + vòng đời lead | ma trận `VALID_LEAD_TRANSITIONS`; sale chỉ sửa lead mình | set thẳng `huy` bỏ ma trận (huỷ được cả `da_chot`); cả `lead-lifecycle.ts` không kiểm chủ sở hữu | CRM đang dùng thật (user xác nhận) |
| `services.service_type` | phân loại ổn định | `text` không enum; `finance_service_distribution` join **sống** ⇒ đổi type đổi biểu đồ **các tháng đã qua**; `normalize-services.mjs` chạy lại sẽ phá `outsource` | lần đổi loại dịch vụ / lần chạy script kế |
| 4 action gallery + `/api/drive-download` | mọi cửa công khai qua token | không kiểm token / không kiểm gì | tuỳ mức lộ — cần đánh giá |
| `ALLOW_SETTINGS_JWT_ADMIN_FALLBACK` | lối thoát khẩn | nếu bật: JWT role=admin **không cần hồ sơ employees** mở 83 action `withAdmin` | hiện tắt — là mìn cấu hình |
| Lương `total_salary` vs `net_salary` | một công thức | lập sheet dùng Σtotal, điều chỉnh/xoá dùng Σnet — trùng nhau chỉ vì tạm ứng đang = 0 | lần tạm ứng đầu tiên |

### Nền móng (không thuộc miền nào)

| | Thiết kế | Thực tế |
|---|---|---|
| Quy trình migration | repo = nguồn chân lý lược đồ | 🔴 **repo ≠ DB**: hàm trên DB mới hơn file; policy không migration nào tạo; `migrate-direct.mjs` áp tay từng file → thứ tự áp ≠ thứ tự tên. Mọi kết luận lược đồ phải hỏi DB (`vault/30-du-lieu/` sinh tự động là chuẩn) |
| Cổng xác thực | một cửa danh tính tập trung | ✅ ĐÍNH CHÍNH 01/09: **CÓ** — `proxy.ts` (Next 16 đổi tên middleware.ts, các lượt quét trước tìm tên cũ). Chặn chưa-login tại edge + bơm sub/email/role vào header + né SW (vết B3 đã vá). Còn thiếu: **role-gate theo route** — vai trò vẫn enforce trong action |

## D. Vận hành đo được (không phải lỗi — là hình dạng cỗ máy)

- 62 HĐ / 265,75tr. Hoàn thành 33 — **nợ 0đ**. Đang chạy 29 — giữ **92,6tr** (≈2 tháng doanh thu).
- **17/29 HĐ đang chạy đã quá 30 ngày** từ ngày chụp; **3 HĐ >90 ngày đã thu đủ mà chưa đóng hồ sơ** (cũ nhất 117 ngày).
- ⇒ bài toán của studio là **thông suốt sản xuất**, không phải đòi nợ. Hệ thống hiện nhìn theo *tháng*, không màn nào nhìn theo *tuổi đơn* — thiếu đúng vòng phản hồi điều phối.
- Sheet lương: `monthly_salaries` chỉ có 2 dòng header cũ (T5, T6/2026 — đều `total_salary = 0`), **chưa có sheet T8**; `fixed_costs` = 0 dòng ⇒ luồng lương M5 (27/08) **chưa chạy thật** — phải sửa lỗi trừ trùng ở C trước khi lập sheet có số đầu tiên. *(Đo lại 01/09 — bản trước ghi "0 dòng" là do query lọc tháng 8.)*

## E. Còn mù — nói thẳng

1. **8 ô CHỐT** trong `agent/QUY-TRINH-VAN-HANH.md` — ranh giới ép/không-ép của từng trạm. Chỉ chủ studio quyết được.
2. Runtime chưa xác minh: realtime có bắn event thật không (SUBSCRIBED ≠ có event); `NEXT_PUBLIC_RPC_V3` và `ALLOW_SETTINGS_JWT_ADMIN_FALLBACK` trên môi trường Vercel prod.
3. UI thật: mới xem 6/61 màn trong emulator.
4. Ghi chú phương pháp: quét "chạm từ mã nguồn" trong `01–12.md` gồm cả **đọc** — `equipment`, `dress_rental_accessories` được tham chiếu nhưng đường **ghi** thật của chúng chưa kiểm riêng.
