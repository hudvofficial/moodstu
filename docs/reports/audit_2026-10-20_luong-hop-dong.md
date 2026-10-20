# Kiểm luồng nghiệp vụ "Hợp đồng" — 2026-10-20

> 🔴 **Việc gấp hơn ADR-020 (xem mục "Hai LỖI RIÊNG"):** huỷ phiếu thu hợp đồng đang **luôn lỗi** (trigger đọc `payments.updated_by` — cột không tồn tại; 0/72 phiếu từng huỷ). Phiếu nhập nhầm hiện không có đường huỷ qua `void_contract_payment_v2`. Đo trên bản sao DB; chưa bấm thử trên prod.

Phạm vi: **chỉ đọc**. Đối chiếu `vault/40-module/hop-dong.md`, `vault/50-luong/vong-doi-hop-dong.md` với DB production thật (`scripts/db-q.mjs`, 4 đợt truy vấn SELECT, không ghi gì). Không sửa code, không sửa DB.

Mẫu: 75 dòng `contracts` (73 còn sống, 2 xoá mềm, 0 `da_huy`).

## Sạch (đã đo, không lệch)

- `paid_amount` = tổng phiếu thu sống, `remaining = total − paid`, `payment_status` khớp số tiền: **73/73**.
- `total_amount` = tổng hạng mục − `discount_amount`: **mọi HĐ** có hạng mục.
- Mã HĐ: 75/75 duy nhất, đúng dạng `HĐ-YYYY-NNNN`. Không HĐ nào thiếu hạng mục hay thiếu sự kiện.
- Không phiếu thu sống nào trỏ vào HĐ đã xoá. Vi phạm CHECK ngày chụp/giao: 0.
- R1 (huỷ HĐ có đơn in) đã vá trên DB: thân `cancel_contract_cascade` ghi `huy_don`. **Nhưng 0 HĐ từng được huỷ** nên bản vá chưa chạy thật lần nào.

## Bất thường (xếp theo tác động)

### 1. Tiền phải thu: 39,1 triệu, trong đó nhiều HĐ đã chụp mà thu 0đ — **cần chủ xác nhận**
11 HĐ còn nợ. Bảy HĐ đã qua ngày chụp 19–77 ngày, `paid = 0`:

| HĐ | Trạng thái | Còn nợ | Ngày từ buổi chụp |
|---|---|---:|---:|
| 0052 | dang_thuc_hien | 3,3tr | 77 (đã hoàn thành cả 2 sự kiện, gồm giao sản phẩm) |
| 0064 | dang_thuc_hien | 4,0tr | 55 |
| 0068 | dang_thuc_hien | 8,4tr | 33 |
| 0066 | dang_thuc_hien | 1,5tr | 33 |
| 0069 | dang_thuc_hien | 1,7tr | 24 |
| 0070 | dang_thuc_hien | 0,3tr | 24 (đã hoàn thành cả 2 sự kiện) |
| 0073 | dang_thuc_hien | 1,7tr | 19 |

Đã đối chiếu các sổ khác: bảng `receipts` có **0 dòng** cho cả 7 HĐ, bảng `debts` rỗng hoàn toàn (0 dòng) — không có khoản thu/nợ nào ghi ở chỗ khác, nên "thu 0đ" là đúng theo DB. 57 HĐ `hoan_thanh` có tiền đều đã thu đủ. Hệ thống **không tự** chuyển `hoan_thanh` khi giao xong và **không cảnh báo** HĐ quá hạn thu (đợt "Tất toán" hạn = ngày chụp). Không phân biệt được "khách chưa trả" với "chủ chưa nhập phiếu thu" từ DB — đây là câu hỏi nghiệp vụ.

Phụ: HĐ-0075 đã thu 500k nhưng vẫn `cho_xu_ly` (đúng thiết kế "không tự chuyển", nhưng dễ bị bỏ sót). HĐ-0074 (10tr) `cho_xu_ly`, chưa có ngày chụp.

### 2. Lịch thu (`payment_plans`) lệch với phiếu thu — số tiền toàn cục không sai, nhưng chi tiết HĐ hiển thị sai
- **11 HĐ `da_thanh_toan` vẫn còn đợt > 0đ ở trạng thái `pending`/`partial`**: 0044, 0055, 0067, 0013, 0020, 0043, 0050 (đợt "Cọc" X đồng `pending`, alloc 0; đợt "Tất toán" 0đ nhận phân bổ đúng X) và 0008, 0006, 0046, 0065.
- **9 đợt bị phân bổ vượt số tiền kế hoạch** (đợt 0đ nhận 0,5–3,5tr): 0044, 0055, 0067, 0008, 0013, 0006, 0020, 0043, 0050. Phiếu thu ghi `payment_stage = 'Tất toán'` trong khi tiền cọc nằm ở đợt "Cọc".
- **0046 và 0065**: đợt "Tất toán" = 6,9tr / 1,2tr trong khi `total` = 6,0tr / 0,6tr — kế hoạch tính trên giá **trước giảm giá**, nên đợt kẹt `partial` dù HĐ đã trả đủ.
- **Nguyên nhân — 3 nhóm. Đo = có số liệu/thân hàm sống; suy ra = chưa có bằng chứng trực tiếp.**
  - **A. 7 HĐ — bug còn sống ở `create_default_payment_schedule_v2` (ĐO).** HĐ: 0013, 0020, 0043, 0044, 0050, 0055, 0067. Cả 7 có đúng 1 phiếu thu tạo cùng giây với HĐ, số tiền = `total`, nhãn "Cọc" (khách trả đủ ngay lúc ký). Chuỗi đã xác minh trong thân hàm sống: `save_contract_atomic` (nhánh tạo mới) gọi `create_default_payment_schedule_v2(total, initial=total, stage='Cọc')` → hàm đặt đợt **Cọc = initial = total**, đợt **Tất toán = total − initial = 0**, nhưng chọn đích trả về là **final** vì `initial >= total` → `save_contract_atomic` truyền plan id đó cho `process_contract_payment_v2` → tiền phân bổ vào Tất toán 0đ, còn Cọc `pending`/alloc 0. Kiểm ngược: trong toàn bộ HĐ còn sống, **7/7** HĐ có phiếu thu ≥ total tại lúc tạo đều lệch và đều nhãn "Cọc"; **không có mẫu đối chứng** với nhãn "Tất toán" nên "nhãn Tất toán thì sạch" mới là suy ra từ code. 0067 tạo 17/09, sau M4 ⇒ còn sống. (Mã tham chiếu: dòng ~76-78 và ~108-111 của thân hàm trong `supabase/migrations/20260827100000_payment_plans_m4_bo_dot_1_2.sql`.)
  - **B. 2 HĐ — sửa HĐ không đồng bộ lại lịch thu (ĐO).** `audit_logs`: 0046 sửa 22/07 22:12 `total 6,9tr→6,0tr`, `discount 0→0,9tr`; 0065 sửa 16/09 `total 1,2tr→0,6tr`, `discount 0→0,6tr`. Lịch thu giữ 6,9tr / 1,2tr. Thân `save_contract_atomic` không chứa `payment_plans` và `create_default_payment_schedule_v2` chỉ INSERT-nếu-chưa-có ⇒ không đường nào sửa số tiền đợt đã có.
  - **C. 2 HĐ cũ — 0006, 0008 (tạo 05/2026).** ĐO: M4 chỉ xoá đợt installment không có phân bổ và giữ lại 1 dòng có phân bổ — đúng là "Đợt 2" 1,0tr của 0006, không phải lỗi M4. SUY RA: đợt "Cọc" 0đ của 0008 nhận 0,5tr do generator cũ trước M4 (không còn bản cũ để đối chiếu). Ghi nhận thêm: ngày 05/09 có một loạt `UPDATE` không đổi giá trị lên 0006, 0008, 0043 (cách nhau ~30 phút) — chưa rõ tiến trình nào chạy, không làm thay đổi số liệu.
  - Số tiền trên HĐ (`paid/remaining/payment_status`) không bị ảnh hưởng vì tính từ phiếu thu, không từ lịch thu.
- ~50 đợt "Cọc 0đ `pending`" tồn đọng trên HĐ đã thu đủ (nhiễu).
- Hệ quả đã biết: lịch thu không phải nguồn "đến hạn" (vault `hop-dong.md`), nên không làm sai số dư; chỉ làm sai màn hình lịch thu từng HĐ.

### 3. Sự kiện
- **HĐ-0011 có 6 sự kiện thay vì 4**: hai cặp `hau_ky` + `giao_san_pham` (hạn 24/05 và 31/05) cùng `ngay_chup` + `ngay_to_chuc` đều 24/05. Nghi `_reconcileContractScheduleInternal` sinh thêm khi đổi ngày thay vì dời (chưa truy được code gây ra — chỉ mới đo kết quả).
- **9 HĐ `hoan_thanh` còn sự kiện chưa xong** (0014, 0023, 0027, 0054, 0015, 0003, 0017, 0055, 0030) — đúng thiết kế (chỉ cảnh báo mềm), ghi lại để biết đây là thực tế dữ liệu.
- **9 HĐ không có `work_date`** → không lên lịch. Gồm HĐ-0074 (10tr).
- 3 HĐ `dang_thuc_hien` đã xong mọi sự kiện nhưng chưa ai bấm `hoan_thanh` (0052, 0070, 0064).

### 4. HĐ đã xoá mềm
- 0005 và 0042 còn nguyên `status` cũ (`cho_xu_ly`/`dang_thuc_hien`) — đúng thiết kế (vault: xoá giữ nguyên status).
- 4 `work_tasks` `hoan_thanh` của hai HĐ này **không** bị `da_huy` (hàm cố ý bỏ qua `hoan_thanh`), tổng `cost` = 400.000đ (HĐ-0005). `contract_financials` có lọc `deleted_at` nên **lợi nhuận không bị ảnh hưởng**; chưa kiểm lương/công nợ ekip có gom 400k này không.

### 5. Giảm giá lớn và chi phí ekip thiếu — làm lãi/lỗ HĐ kém tin cậy
- **4 HĐ `hoan_thanh` tổng 0đ, giảm giá 100%** (0022, 0023, 0027, 0054; mỗi HĐ gốc 3–3,5tr) và **HĐ-0070 giảm 90%** (3tr → 0,3tr, đang thực hiện). Tổng cộng 29 HĐ có giảm giá, 9 HĐ giảm ≥ 50%. Hệ thống không có cổng duyệt giảm giá; cần chủ xác nhận đây là tặng/khuyến mãi chủ ý hay nhập nhầm (đặc biệt 0070 vì còn đang chạy).
- **Chi phí ekip bị bỏ trống**: 158/182 `work_tasks` còn sống có `cost = 0`. Lợi nhuận HĐ (`contract_financials`) vì vậy thường phản ánh doanh thu chứ không phải lãi thật. HĐ-0027 có một task `hau_ky_anh` `cost = 350` (350 đồng) — nghi nhập 350.000 thiếu ba số 0; đây là task duy nhất có cost dưới 10.000.

### Còn đúng như vault đã ghi, chưa đổi
`reactivateContract` không atomic (5 UPDATE rời); thứ tự nghiệp vụ không có ràng buộc; `work_tasks.status`/`contract_events.status` là text — nhưng **đã đo**: `contract_events` có CHECK `contract_events_status_check` (VALIDATED, 4 giá trị `chua_lam·dang_lam·hoan_thanh·da_huy`) — vault ghi "DB không chặn" là cũ cho bảng này. `work_tasks.status` chưa đo lại.

## Chưa kiểm
Lịch Google (`google_sync_queue`), checklist, đặt váy, quyền (RLS) của luồng HĐ, và hành vi UI thật (chỉ đo DB + đọc code, chưa mở trình duyệt).

## Đề xuất ban đầu
Đã thay bằng mục "Sửa nhóm A + B" bên dưới (nguyên nhân đã chốt, hướng đã chọn). Hai việc còn lại từ bản đầu: chủ rà 7 HĐ chưa thu tiền (mục 1) và chủ xác nhận 5 HĐ giảm giá lớn + task 350đ của HĐ-0027 (mục 5).

## Sửa nhóm A + B — hướng đã chốt, migration đã soạn, CHƯA áp prod

> ✅ **B1 đã được chủ xác nhận lại (20/10)** sau khi có bản báo cáo đầy đủ. Lưu ý lịch sử: lần chọn đầu diễn ra khi file này còn là bản đề xuất đầu (ghi *"Không dùng trigger"*) vì lệnh ghi bản sửa bị lỗi; lý do chọn trigger (8 đường ghi `total_amount`) nằm ở mục này và ADR-020.

**Chủ chọn (20/10):** A1 (trả đủ lúc ký nhãn "Cọc" ghi vào đợt Cọc) + B1 (trigger trên `total_amount`). ADR-020 mở tại `agent/DECISIONS.md`; migration `supabase/migrations/20261020100000_adr020_payment_plans_dong_bo.sql`; revert `agent/HANDOFFS/T-20261020-adr020-payment-plans-sync.revert.sql`; kiểm `npm run verify:payment-plans-sync` (chỉ chạy trên Postgres cục bộ).

### Mức khẩn: THẤP–TRUNG BÌNH, không phải cấp cứu
- **Đo:** 0 HĐ đang chạy bị lệch lịch thu (cả 11 HĐ lệch đều `hoan_thanh`, `remaining = 0`). Số tiền HĐ, dashboard "Cần thu" (`finance_pending_collections`) và `contract_financials` **không đọc lịch thu** nên không sai.
- **Bug sinh dữ liệu còn sống:** A dính 7/75 HĐ và sẽ lặp ở HĐ tiếp theo trả đủ lúc ký; B dính khi sửa giá/giảm giá sau lúc tạo (2/75).
- **Triệu chứng nhìn thấy rộng hơn 11 HĐ (đọc code, chưa chạy UI):** `PaymentPlanCard` (`payment-plan-card.tsx`, `getNextPlan`) chọn "đợt mở đầu tiên chưa thu" **không lọc `amount > 0` và không xét `remaining`**, và luôn render trong trang chi tiết. **48 HĐ đã thu đủ (47 `hoan_thanh`) còn ít nhất một đợt chưa `paid`** — phần lớn là "Cọc 0đ pending" — nên thẻ hiện "Tiếp theo · Cọc · Nhập khi thu · Chưa thu · Thu". Migration này **không** sửa triệu chứng đó (xem "Sửa C" bên dưới).
- **Số sai trên giấy khách:** bản in (`contract-template.tsx`) lọc đợt `amount>0`; HĐ nhóm B in "Tất toán 6,9tr" trong khi tổng HĐ 6,0tr (chỉ hết sau script dọn dữ liệu).

### Nơi đọc `payment_plans` (đã dò)
| Nơi | Đọc | Ảnh hưởng khi lịch lệch |
|---|---|---|
| `payment-plan-card.tsx` | status, due_date, amount, allocations | Thẻ "Tiếp theo … Thu" sai trên 48 HĐ đã thu đủ; tiến độ % tính trên Σ đợt nên lệch ở nhóm A/B |
| `contract-template.tsx` (bản in) | đợt `amount>0`, `status==='paid'` | Nhóm B in sai tổng; nhóm A dòng Cọc không đánh dấu đã thu |
| `payment-receipt-form.tsx`, `contract-drawer.tsx`, `contract-detail-client.tsx`, `drawer-tab-content.tsx` | status, remaining | Chọn đợt khi thu tiền; hiển thị |
| `mapPaymentPlans` / `normalizePlanStatus` (`lib/contracts/payment-plans.ts`) | status, allocations | Đợt 0đ có phân bổ luôn ra "partial" |
| `sync_payment_plan_statuses_v2` | amount vs phân bổ | Đợt `amount=0` không bao giờ `paid` |
| `contract_payment_health_checks` / `run_integrity_scan` | số đợt, stage_key, phân bổ ↔ phiếu thu | Trước ADR-020 **không có check** "phân bổ vượt số đợt" / "Σ đợt ≠ total" ⇒ drift im lặng |
| `get_contract_detail_v2/v3`, view `payment_plan_states` | trả nguyên | Nguồn dữ liệu cho UI |
| Dashboard / finance | **không đọc** (đã chuyển sang `finance_pending_collections` ở M4) | Không ảnh hưởng |

### Đã làm trong migration (đo trên Postgres cục bộ `mood_restore`, dump prod 20/10 02:00)
- **A1** — `create_default_payment_schedule_v2`: đúng **1 khối** đổi (diff với thân sống chỉ có khối `v_target_stage_key`): đích phân bổ = `COALESCE(v_initial_stage_key,'deposit')`, bỏ nhánh ép `final` khi `initial >= total`. Trả đủ lúc ký nhãn Cọc ⇒ Cọc = total đã thu; Tất toán 0đ pending.
- **B1** — hàm mới `resync_payment_plan_amounts_v2(contract_id)` + trigger `AFTER UPDATE OF total_amount ON contracts` (chỉ khi `total_amount` thật sự đổi). Bất biến: `Σ amount đợt (không huỷ, không outside) + Σ phiếu phát sinh sống = total_amount`; hàm chỉ chỉnh đợt `final` rồi gọi `sync_payment_plan_statuses_v2`; không đụng đợt Cọc, phiếu thu, phân bổ. Phủ mọi đường ghi `total_amount` (liệt kê: `save_contract_atomic`, `recalc_contract_totals`, `process_contract_payment_v2`, `void_contract_payment_v2`, `create_contract_inventory_addon_sale_atomic`, `add/update/delete_fulfillment_transaction_atomic`). Chỉ sửa HĐ đã chạy thật; phiếu phát sinh 0, giao dịch kho gắn HĐ 0.
- **2 health check mới** trong `contract_payment_health_checks`: `plan_allocation_exceeds_amount` (loại `outside`) và `plan_amount_sum_mismatch`. Hiệu chuẩn trên dữ liệu thật: trả đúng 9 HĐ (0006, 0008, 0013, 0020, 0043, 0044, 0050, 0055, 0067) và đúng 2 HĐ (0046, 0065); hợp lại = đúng 11 HĐ đã biết; check cũ không báo thêm.
- **Kết quả thử** (`scripts/verify-payment-plans-sync.mjs`, mỗi kịch bản trong transaction rồi ROLLBACK, 0 dòng rác): **trước migration: FAIL ở A1, B1, B2, B3 (phần đầu) và C (10/23 PASS)** — A1, B1, B2 tái hiện đúng lỗi prod (Cọc pending + Tất toán 0đ nhận phân bổ; Tất toán 6,9tr sau khi giảm còn 6,0tr); **sau migration 25/25 PASS**; `revert.sql` → thân 2 hàm khớp md5 với prod ✓, trigger/hàm mới biến mất ✓; áp lại + áp lần hai (idempotent) ✓; đã chạy lại toàn bộ sau khi bỏ `BEGIN/COMMIT` thừa khỏi file migration (migrate-direct.mjs tự bọc giao dịch, đúng mẫu R1 `20260907100000`). `dat_coc` (giá trị form thật gửi) và `Cọc` đều map `deposit` (đo prod: `payment_stage_key_v2`), nên kịch bản A1 phủ đúng đầu vào thật; `NULL` → hàm dùng `deposit`.
- ACL: bản sao cục bộ dựng bằng `--no-privileges` nên **không phải số đo prod**. Migration tự `REVOKE … FROM PUBLIC, anon, authenticated` + `GRANT service_role` cho hàm mới; cục bộ ra `{postgres, service_role}` (hàm resync) và `{postgres}` (hàm trigger). **Phải đo lại `proacl` trên prod sau khi áp** (Supabase tự cấp EXECUTE cho anon trên hàm mới).

### Ai đọc `contract_payment_health_checks` — ảnh hưởng tới cách áp
- `scripts/verify-contracts.mjs:176-179` **fail nếu bất kỳ check nào ≠ 0**; `run_integrity_scan` (nút ở `components/finance/integrity/ghost-scan-widget.tsx`, trang `/finance/debts`) ghi `integrity_reports` và hiển thị trạng thái cho chủ.
- Ngay sau migration và **trước** khi dọn 11 HĐ, 2 check mới trả 9 + 2 ⇒ `verify:contracts` ĐỎ và quét tính toàn vẹn chuyển `passed → warning`. **Vì vậy: áp migration và chạy script dọn 11 HĐ trong cùng một cửa sổ.** Script dọn: `scripts/cleanup-payment-plans-adr020.mjs` (đã viết và thử cục bộ, xem bên dưới).
- Checklist áp prod: (1) backup + dòng `agent/DB-CHANGELOG.md` → (2) `ALLOW_PROD_WRITE=1 node scripts/migrate-direct.mjs 20261020100000_adr020_payment_plans_dong_bo.sql` → (3) đo `proacl` 2 hàm mới (mong `{postgres, service_role}` / `{postgres}`, không có `anon`/`authenticated`/`=X`) → (4) `ALLOW_PROD_WRITE=1 node scripts/cleanup-payment-plans-adr020.mjs --apply` (trước đó chạy không cờ để xem dry-run: phải thấy 11 HĐ đã biết — 0006, 0008, 0013, 0020, 0043, 0044, 0046, 0050, 0055, 0065, 0067 — cộng thêm CHỈ những HĐ tạo sau 20/10 trả đủ lúc ký, vì bug nhóm A còn sống tới khi migration lên; cột "tạo <ngày>" giúp nhận ra; thấy HĐ lạ khác thì dừng) → (5) `contract_payment_health_checks()` toàn 0 + `verify:contracts` → (6) `vault:db-truth` → commit ngay.

### Không nằm trong migration (còn lại)
- **Sửa C (UI):** truyền `contract.remaining_amount` vào `PaymentPlanCard`, ẩn khối "Tiếp theo … Thu" khi `≤ 0` — giải quyết triệu chứng trên 48 HĐ mà không cần sửa dữ liệu. Chưa làm (chủ chưa yêu cầu).
- **Dọn dữ liệu 11 HĐ — ĐÃ VIẾT, CHƯA áp prod:** `scripts/cleanup-payment-plans-adr020.mjs`. Quy tắc: HĐ còn sống, `remaining = 0`, đang bị 2 check ADR-020 báo ⇒ `payment_plans.amount := Σ phân bổ của chính đợt đó` (đợt không huỷ, không `outside`), rồi `sync_payment_plan_statuses_v2`. Không đụng `payments`, `payment_plan_allocations`, `contracts`; HĐ còn nợ không bao giờ bị chọn; HĐ có Σ phân bổ + phát sinh ≠ total bị **bỏ qua** (xử lý tay) thay vì ép.
  - **Mặc định dry-run** (chỉ SELECT). `--apply` cần `ALLOW_PROD_WRITE=1` (prod-guard S3); ghi backup JSON **trước** khi ghi (`docs/reports/backup_<ngày>_payment_plans_adr020.json`, hoặc `--backup <file>`); một giao dịch, khoá `FOR UPDATE` các HĐ; sau dọn tự so băm md5 của payments / phân bổ / contracts trước-sau và chạy lại điều kiện chọn — sai là ROLLBACK. Rào: chọn > 30 HĐ thì dừng. `--restore <file>` trả đúng dữ liệu cũ.
  - **Dry-run trên prod (chỉ đọc, 20/10):** chọn đúng 11 HĐ (0006, 0008, 0013, 0020, 0043, 0044, 0046, 0050, 0055, 0065, 0067), cả 11 khớp bất biến, 20 đợt đổi số tiền.
  - **Thử cục bộ (`mood_restore`, đã có migration):** áp → 2 check 9/2 → **0/0**, toàn bộ 10 check của `contract_payment_health_checks()` = 0; `verify:payment-plans-sync` 26/26; chạy lại → "0 HĐ cần dọn", snapshot bảng `payment_plans` y nguyên (idempotent); `--restore` → snapshot khớp 100% với trước dọn (md5 bảng `payment_plans`); không có cờ → `--apply`/`--restore` trên prod thoát mã 2, DB không bị đụng (143 đợt).
  - **Kiểm thêm `ghost_payments`** (check CRITICAL của `run_integrity_scan`, không nằm trong `contract_payment_health_checks`): prod hiện 0; sau dọn trên bản sao cục bộ **72/72 đợt `paid` đều có `receipt_id`** nên không sinh ghost mới. Không chạy `run_integrity_scan` trên prod vì nó ghi `integrity_reports`.
  - **Màn hình KHÔNG được sửa bởi bước dọn:** sau dọn, trang chi tiết của cả 11 HĐ vẫn hiện thẻ "Tiếp theo · Cọc · Nhập khi thu · Thu" (Cọc nhóm A thành 0đ pending, không phân bổ; 0046 và 0065 vốn đã có dòng này) — 11 HĐ này nhập hội 48 HĐ đã thu đủ khác. Chỉ Sửa C (thẻ `PaymentPlanCard` ẩn "Tiếp theo" khi `remaining ≤ 0`) mới bỏ triệu chứng; nên làm cùng cửa sổ hoặc ngay sau. Bước dọn sửa: dữ liệu, 2 health check, và bản in hợp đồng của nhóm B (đúng tổng).
  - `--restore` chỉ dùng NGAY SAU `--apply`; khôi phục sau khi đã có phiếu thu mới sẽ đưa lệch quay lại.
  - Hệ quả cosmetic chấp nhận được: 7 HĐ nhóm A hiện "Tất toán X đã thu" dù phiếu ghi "Cọc" (phân bổ đang ở đợt Tất toán); khớp nhãn phải di chuyển phân bổ (đụng bảng tiền) — không làm.
- **Nhánh lệch tiềm ẩn của generator** (stage đầu `final` và `initial < total` ⇒ Σ đợt < total): 0 ca trong dữ liệu (20 phiếu tạo cùng lúc HĐ đều nhãn Cọc/`dat_coc`; form luôn gửi `dat_coc`); check `plan_amount_sum_mismatch` sẽ bắt nếu xảy ra; không sửa ở đây để giữ migration đúng phạm vi A1.
- Ba đường ghi `total_amount` chưa từng chạy (bán kèm kho, giao dịch kho, phát sinh) không tạo phân bổ — đã lệch mô hình lịch thu từ trước; ngoài phạm vi.

### Hai LỖI RIÊNG phát hiện khi thử (ngoài ADR-020, chưa sửa)
1. 🔴 **Huỷ phiếu thu hợp đồng luôn lỗi.** Trigger `trg_restore_inventory_on_contract_payment_void` (trên `payments`) đọc `NEW.updated_by` nhưng bảng `payments` **không có cột này** ⇒ `void_contract_payment_v2` văng `record "new" has no field "updated_by"` ở mọi lần huỷ (tái hiện cục bộ trên bản sao prod; chỉ `contracts` có `updated_by` trong 5 bảng liên quan). Dữ liệu khớp: **0/72 phiếu thu từng bị huỷ** (`voided_at`/`deleted_at` đều 0). (Đã kiểm: `restore_inventory_on_receipt_void` đọc `NEW.updated_by` nhưng bảng `receipts` **có** cột này nên không dính.) Chưa xác nhận bằng bấm UI trên prod (không ghi prod).
2. 🟡 **`recalc_contract_totals` luôn lỗi.** Khai biến `payment_status_enum` — kiểu này **không tồn tại** trên prod ⇒ văng mỗi lần gọi; `dress-mutations.ts:437,553` gọi `supabase.rpc("recalc_contract_totals")` không kiểm lỗi ⇒ thêm/bỏ phụ kiện váy kiểu phát sinh **không bao giờ tính lại tổng HĐ**. Thân hàm cũng không lọc `contract_items.deleted_at` và dùng ngưỡng cọc 0,3 khác `save_contract_atomic` (0,5). **Cạm bẫy khi sửa:** chỉ đổi kiểu enum thì hàm bắt đầu chạy thật và **cộng cả hạng mục đã xoá mềm** — mọi HĐ đã sửa đều có dòng xoá mềm (0046, 0065 có), tổng sẽ bị phồng. Phải sửa cùng lúc với bộ lọc `deleted_at IS NULL`.

### Thứ tự đề xuất tiếp
1. Chủ xem diff migration + dry-run script dọn → nói "áp".  2. Áp theo checklist: backup + dòng `agent/DB-CHANGELOG.md` → migration → đo `proacl` → script dọn `--apply` → `contract_payment_health_checks()` toàn 0 + `verify:contracts` → `vault:db-truth` → commit ngay.  3. Sửa C (UI thẻ kế hoạch) cùng cửa sổ hoặc ngay sau.  4. Hai lỗi riêng ở trên: huỷ phiếu thu (đã có card task `fix-void-payment`) và `recalc_contract_totals` (kèm lọc `deleted_at`), mỗi lỗi một bước riêng.
