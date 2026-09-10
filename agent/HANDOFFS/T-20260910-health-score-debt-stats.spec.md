# T-20260910-health-score-debt-stats — T1: `get_finance_intelligence` thôi đọc bảng `debts` rỗng → `finance_debt_stats()`; gỡ Health-score + Hòa vốn khỏi màn (C8)

**Owner:** claude (spec → chủ duyệt → claude áp DB + sửa 2 component → commit ngay) · **Trạng thái:** ✅ ĐÃ ÁP PROD 11/09 (chủ "duyệt" 11/09) · app + verify xong, chờ chủ xem diff / "đẩy" · **Chương trình:** GĐ2 tuần 4, bước #18 (`agent/GOALS.yaml`), gate G1 ✅ · **DB:** `CREATE OR REPLACE` 1 hàm (đổi đúng 1 khối) + siết ACL về `service_role`; 0 bảng, 0 dữ liệu · **ADR:** không cần — sửa hàm cho khớp nguồn canonical đã có (ADR-016), C8 đã chốt 02/09 · **Revert:** `agent/HANDOFFS/T-20260910-health-score-debt-stats.revert.sql` (thân hàm + ACL sống).

## 0. Vì sao

Sổ đối chiếu dòng 35: *"Bảng `debts` — sổ công nợ riêng — ⬛ 0 dòng, nhưng `get_finance_intelligence` **vẫn đọc** → điểm công nợ trong health_score luôn 'Lành mạnh'"*. Quyết định **C8** (02/09): *"Bộ số chính thức (6) … Gỡ health-score và break-even khỏi màn cho tới khi đọc đúng nguồn — health-score đọc bảng rỗng (xanh giả), break-even tự cộng"*. PHUONG-AN T1 #18: *"Health-score thôi đọc `debts` rỗng → `finance_debt_stats()`"*.

Hôm nay Mood có **8,5tr phải thu** (HĐ còn nợ) và **14,14tr phải trả** (lab/thợ) theo sổ canonical, nhưng thẻ "Điểm Sức Khỏe" chấm công nợ 15/15 "Lành mạnh" vì đọc một bảng chưa bao giờ có dòng nào — và thẻ đó cùng thẻ "Tiến độ Hòa vốn" vẫn đang hiện ở **2 màn** (`/finance` và `/finance/dashboard`) dù C8 đã bảo gỡ.

## 1. Sự thật đã đo (10/09, chỉ đọc + diễn tập local)

- `debts`: **0 dòng** (23 cột, chưa từng dùng). `finance_debt_stats()` (SECURITY DEFINER, chỉ `service_role`): `receivable` **8.500.000** · `payable` **14.140.350** · `overdue` 3.300.000 · `net_debt` −5.640.350 — cùng nguồn V0 dùng (`finance_debt_stats` + `finance_payable_summary`).
- `get_finance_intelligence()` (SECURITY DEFINER, 230 dòng, ACL **`{postgres, anon, authenticated, service_role}`** — vai `anon` cũng gọi được và nhận toàn bộ số tài chính): dòng 79–91 đọc `debts` cho `v_receivables`/`v_payables` → điểm `receivables` 15 "Lanh manh" khi cả hai = 0; `projectedBalance = cash + receivables − payables` cũng sai. Phần còn lại tự cộng `payments`/`receipts`/`expenses`/`fixed_costs`/`monthly_salaries` (không qua sổ kỳ) → thuộc #29.
- Người gọi: **1** server action `getFinanceIntelligence` (`finance-intelligence-queries.ts:54`, `withAuth` = service role). Render: `components/finance/dashboard/finance-intelligence-section.tsx:70–72` (màn `/finance`) và `app/(protected)/finance/dashboard/page.tsx:86–88` (màn `/finance/dashboard`) — mỗi nơi 3 thẻ: `HealthScoreCard` · `CashflowRunwayCard` · `BreakEvenCard`. Không script `verify:*` hay e2e nào assert 2 thẻ này.
- **Diễn tập cục bộ** (`mood_restore`): trước → `stats.receivables/payables` = **0/0**, ACL mặc định; áp migration → `stats.receivables` **92.575.000** = `finance_debt_stats().receivable` (dump 10/09 02:09) · `payables` **13.905.350** · `projectedBalance` đổi theo · ACL `{postgres, service_role}` · thân hàm không còn `FROM debts`; `revert.sql` → 0/0, ACL có lại `anon, authenticated` ✓ → áp lại ✓. Backup 10/09 02:09 OK.

## 2. Phạm vi

### DB — `supabase/migrations/20260910140000_t1_finance_intelligence_debt_stats.sql` (sinh từ thân hàm sống)

| Chỗ | Cũ | Mới |
|---|---|---|
| dòng 79–91 | 2 × `SELECT COALESCE(SUM(remaining),0) INTO v_receivables / v_payables FROM debts WHERE type = … AND status NOT IN (…)` | `SELECT COALESCE(d.receivable,0), COALESCE(d.payable,0) INTO v_receivables, v_payables FROM public.finance_debt_stats() d;` |
| ACL | `{postgres, anon, authenticated, service_role}` | `REVOKE … FROM PUBLIC, anon, authenticated; GRANT EXECUTE … TO service_role` (app gọi qua `withAuth`) |

Không đổi: chữ ký, kiểu trả về JSON (`health_score`, `breakdown`, `cashflow`, `breakeven`, `stats`), 5 thang điểm, phần tự cộng còn lại (→ #29).

### App — 2 file (C8)
- `components/finance/dashboard/finance-intelligence-section.tsx`: Zone 1 chỉ còn `CashflowRunwayCard` (full width); bỏ import + render `HealthScoreCard`, `BreakEvenCard`.
- `app/(protected)/finance/dashboard/page.tsx` `CriticalIntelligenceZone`: như trên.
- Giữ nguyên 2 file component `health-score-card.tsx`, `break-even-card.tsx` (không xoá — mở lại ở #29 khi hàm đọc đúng nguồn); ghi chú C8 tại chỗ gỡ.

Áp: `ALLOW_PROD_WRITE=1 node scripts/migrate-direct.mjs 20260910140000_t1_finance_intelligence_debt_stats.sql` → §4 → sửa app → verify → `vault:db-truth` → **commit ngay**. Push chờ chủ "đẩy".

## 3. Ngoài phạm vi
- 4 thành phần điểm còn lại (`profitability`, `breakeven`, `runway`, `cashflow`) và `currentCash`/`burnRate` tự cộng ngoài sổ kỳ → **#29** (Đọc số D) — thẻ Health/Hòa vốn mở lại khi đó.
- `CashflowRunwayCard` giữ vì C8 không nêu; ghi 🟡 cùng #29 (burn rate đọc `fixed_costs` + `monthly_salaries` = trái C7).
- Trang `/finance/debts` (sổ công nợ tay, bảng `debts`) không đụng.

## 4. Verify — số chờ điền

| Kiểm | Cách | Chờ |
|---|---|---|
| Local | §1 | ✓ |
| Áp prod | `migrate-direct` | "completed"; thân hàm sống không còn `FROM debts`, có `finance_debt_stats()`; `has_function_privilege('authenticated', …)` = **false**, `service_role` = true |
| Số | `get_finance_intelligence()->'stats'` trước/sau | `receivables` 0 → **8.500.000** · `payables` 0 → **14.140.350** (= `finance_debt_stats()`) · `breakdown.receivables` "Lanh manh" 15 → "No phai tra cao" 5 · `cashflow.projectedBalance` giảm đúng `net_debt` (−5.640.350) · `monthlyRevenue`/`monthlyExpense`/`prevRevenue`/`prevExpense` **giữ nguyên** |
| Màn hình | Playwright admin tạm: `/finance` + `/finance/dashboard` | 0 chữ "Điểm Sức Khỏe", 0 "Tiến độ Hòa vốn", có "Cashflow Runway"; 0 lỗi app console (lọc nhiễu next start) |
| Tĩnh | `tsc` · `eslint` 2 file · `npm run verify:dashboard` | 0 · 0 · pass |
| Vault | `vault:db-truth` (1 hàm) · `40-module/tai-chinh.md` mục (5) | cập nhật |
| Rác | `sweep-e2e-residue.sql` | 0 |

## 5. Rủi ro & đường lùi
- Điểm sức khỏe tổng **giảm** (công nợ 15 → 5) — đúng thực tế (phải trả > phải thu); thẻ đã gỡ khỏi màn nên không ai đọc số cũ nữa.
- Siết ACL: nếu có client nào gọi RPC bằng anon key → 403 hiện ngay; quét 10/09 chỉ có 1 server action.
- Đường lùi: `revert.sql` (thân + ACL sống, đã thử local) + `git revert` 1 commit cho 2 component.

## 6. Kết quả — 11/09/2026

| Kiểm | Kết quả |
|---|---|
| Local | ✓ 2 vòng (§1) |
| Áp prod | `migrate-direct` "completed successfully". Thân hàm sống: `FROM debts` = **false**, `finance_debt_stats() d` = **true**. ACL `{postgres, service_role}`; `has_function_privilege` — `authenticated` **false** · `anon` **false** · `service_role` true |
| Số (trước → sau) | `stats.receivables` **0 → 8.500.000** · `stats.payables` **0 → 14.140.350** (bằng đúng `finance_debt_stats()`) · `breakdown.receivables` **{15, "Lanh manh"} → {5, "No phai tra cao"}** · `health_score` **100 EXCELLENT → 90 EXCELLENT** · `projectedBalance` 241.848.600 → 236.208.250. `monthlyRevenue`/`monthlyExpense`/`prevRevenue`/`prevExpense` **không đổi**. Bảng `debts` vẫn **0 dòng** (không đụng) |
| Đối chiếu nguồn | `finance_month_summary(9,2026).receivable` = **8.500.000** = `finance_debt_stats().receivable` = tổng HĐ sống còn nợ (3 HĐ) → health-score nay cùng một định nghĩa "phải thu" với V0 và màn `/finance`. *(Ảnh chụp e2e hiện 117tr là do 20 HĐ seed của global-setup đang sống lúc chụp — màn ghi 83 HĐ; không phải lệch)* |
| Màn hình | Playwright `tests/e2e/finance-intel-c8.spec.ts` **2/2** trên `next start` (build `z15TihKbxqqQzBflFn9aK`): `/finance` và `/finance/dashboard` — "Cashflow Runway" hiện, "Điểm Sức Khỏe" 0, "Tiến độ Hòa vốn" 0, 0 lỗi app; bundle server không còn chuỗi "Điểm Sức Khỏe" |
| Tĩnh | `tsc` **0** · `eslint` 3 file **0** |
| `verify:dashboard` | **đỏ có sẵn, không do #18**: script đòi `from("payment_plans")` + `isPaidPlanStatus` trong `lib/api/dashboard.ts`, nhưng commit `6405ec6` (27/08, ADR-016 M4) đã chuyển nhắc-thu sang RPC `finance_pending_collections`; script sửa lần cuối 14/07. Hai file #18 sửa **không nằm** trong danh sách file script này đọc. Đã có trong sổ đối chiếu dòng 72 ("gate đỏ vĩnh viễn… sửa script ở #29") |
| `verify:reports` | **xanh trở lại** (07/09 đỏ vì mốc `giao_san_pham` `hoan_thanh` `event_date` NULL) — dữ liệu vận hành đã đổi sau khi chủ đóng 24 HĐ ngày 06/09 |
| Vault | `vault:db-truth`: 152 hàm, `than-ham/tai-chinh.md` mang `finance_debt_stats() d` · `40-module/tai-chinh.md` mục (5) |
| Rác | sweep 22 bảng/nhóm = **0** (`audit_logs` E2E = 0 — vá gốc teardown ở #17 có hiệu lực); `realtime_signals` 48 = tín hiệu thật |

### 6b. Vòng review chéo (11/09) — 5 lens × verify đối kháng, 69 agent

32 phát hiện thô → 50 phiếu phản bác → **14 sống sót**. Đã sửa trong chính bước này (áp lại migration idempotent + 1 commit code):

| # | Phát hiện | Đã làm |
|---|---|---|
| 1 | `page.tsx:182` — câu mô tả **luôn hiển thị** đầu `/finance/dashboard` vẫn hứa *"Sức khỏe tài chính, hòa vốn…"* dù 2 thẻ đã gỡ (diff chỉ sửa câu empty-state hiếm khi hiện). 4 lens độc lập cùng bắt | Đổi thành *"Runway, dự báo dòng tiền và phân tích chi phí…"*; e2e assert phủ định theo **ngữ** `/Điểm Sức Khỏe\|Tiến độ Hòa vốn\|hòa vốn\|Sức khỏe tài chính/i` |
| 2 | Lưới đổi 3 cột → 1 cột khiến thẻ Runway **trải hết bề ngang** (≈1830px ở màn 1920) và **lệch skeleton** 3 ô → nhảy bố cục | Giữ `lg:grid-cols-3` / `md:grid-cols-3`, thẻ vẫn 1/3 như cũ, khớp `ZoneSkeleton`/`IntelligenceSkeleton`; #29 mở lại 2 thẻ chỉ còn thêm 2 dòng |
| 3 | **Nửa DB không có bài kiểm nào**: sau C8, `stats.receivables/payables` không lộ ra UI → hồi quy sẽ im lặng | Thêm test RPC-vs-RPC trong cùng spec: `stats.receivables === finance_debt_stats().receivable`, `payables` tương tự, và `debts` vẫn 0 dòng |
| 4 | `SELECT … INTO` gán **NULL** nếu nguồn trả 0 dòng (COALESCE trong SELECT-list không cứu) | Thêm 2 dòng chốt `v_receivables := COALESCE(v_receivables, 0)` (+ `v_payables`); áp lại prod (idempotent), diễn tập local trước |
| 5 | `revert.sql` **cấp lại EXECUTE cho `anon`** — quay lui thân hàm kéo theo mở lại lỗ ACL | Tách khối ACL: mặc định chỉ `GRANT … TO service_role`, dòng `anon, authenticated` để **comment** kèm cảnh báo; diễn tập local xác nhận revert không mở lại (`anon_exec=false`) |
| 6 | Bộ lọc console nuốt cả `Failed to load resource` → "0 lỗi app" hứa nhiều hơn thực chứng | Bắt riêng theo **URL** qua `page.on("response")`, chỉ bỏ qua `/monitoring`, `_vercel/speed-insights`, `favicon`; mọi 4xx/5xx khác làm đỏ test |
| 7 | Ảnh chụp `fullPage:false` ở 1366×768 không chứa Zone 1 của `/finance` | `scrollIntoViewIfNeeded()` + `fullPage: true` |
| 8 | Header spec e2e ghi "không tạo dữ liệu tài chính" — sai ở mức run: global-setup bơm ~20 HĐ E2E vào prod | Viết lại header cho đúng; phép so đổi sang RPC-vs-RPC **cùng thời điểm** nên seed không làm sai kết luận |

**Kiểm lại sau khi sửa (11/09, build `pa8dsPO2Bb6ZFOhwugTC4`):** migration vá áp lại prod (idempotent) — `has_coalesce_guard` = true, `has_from_debts` = false, ACL vẫn `{postgres, service_role}`; local diễn tập revert → thân hàm cũ **mà `anon_exec` vẫn false** → áp lại ✓. Playwright `finance-intel-c8` **3/3** (RPC parity + 2 màn), 0 lỗi console, **0 phản hồi 4xx/5xx ngoài nhiễu đã biết**. `tsc` 0 · `eslint` 0 · mojibake 0 · sweep 22 bảng = 0. Ảnh `test-results/finance-intel-c8-finance-dashboard.png`: câu mô tả mới, thẻ Runway rộng đúng 1/3 khung.

Ghi sổ, **không** sửa trong bước này (đã vào `agent/inventory/00-lech-thiet-ke.md`): **4 RPC tài chính cùng lớp còn mở EXECUTE cho `anon`** (`get_cashflow_forecast`, `get_expense_breakdown`, `get_budget_vs_actual`, `get_finance_advanced_intelligence`) — chờ chủ quyết mở bước mới hay gộp #25 · ngưỡng `rec_ratio` chấm trên phải thu lũy kế thay vì `overdue` → #29 · phụ thuộc hàm-gọi-hàm `get_finance_intelligence` → `finance_debt_stats()` không được Postgres theo dõi · `repo-map.json` còn khai 2 import đã gỡ (sinh lại ở bước dọn) · nhánh "Chưa có dữ liệu tài chính" vẫn nuốt lỗi RPC lẫn trạng thái trống → #29.
