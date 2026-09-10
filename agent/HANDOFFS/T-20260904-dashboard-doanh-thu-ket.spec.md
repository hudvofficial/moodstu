# T-20260904-dashboard-doanh-thu-ket — Thẻ "Doanh thu tháng" /dashboard đọc sổ kỳ + thẻ "Đã thu (két)"

**Owner:** claude (spec → chủ duyệt → claude code → chủ xem diff) · **Trạng thái:** ✅ IMPLEMENTED + VERIFIED — duyệt 05/09 · code+verify 05/09 · chủ "#8" → commit `d8d9de0` 05/09 23:40 · push 07/09 `b4073b4` · **Chương trình:** GĐ1 Nền móng, bước #8 (`agent/GOALS.yaml`) · **DB:** KHÔNG đổi (chỉ đọc RPC đã có) · **ADR:** không cần — thi hành ADR-016 phụ lục M2 ("một sổ kỳ") cho màn mở đầu; không thêm lib, không đổi state pattern.

## 0. Vì sao

Sổ đối chiếu R7 (`agent/inventory/00-lech-thiet-ke.md` §C 🔴): thẻ đầu tiên chủ nhìn mỗi sáng ghi **"Doanh thu tháng"** nhưng đọc `dashboard_critical_kpis().current_revenue` = `SUM(payments.amount) + SUM(receipts lẻ)` theo **ngày phiếu** — tức là **tiền đã thu vào két**, không phải doanh thu. ADR-016 §2 chốt: doanh thu tính theo **ngày chụp** từ `finance_period_ledger`; két và lãi/lỗ là số khác nhau, không trộn. Quyết định C8 (chủ "ok" 02/09): màn hình chính chỉ 6 số — doanh thu · đã thu · lãi/lỗ · tiền kẹt · phải trả · HĐ quá ngưỡng.

Bước này sửa **đúng cái sai đã đo** trên thẻ và đặt 3 số đầu của C8 lên đúng nguồn. Không làm lại dashboard (đó là #29, GĐ3).

## 1. Sự thật đã đo (04/09, chỉ đọc)

| | T8/2026 | T9/2026 (tới 04/09) |
|---|---|---|
| Thẻ hiện tại (`dashboard_critical_kpis.current_revenue`) | **18.350.000** | 720.000 |
| Doanh thu theo ngày chụp (`finance_month_summary.revenue` = `finance_pnl_by_month.revenue`) | **46.325.000** | 720.000 |
| Đã thu (két) (`finance_month_summary.cash_in` = `finance_pnl_by_month.cash_in`) | 18.350.000 | 720.000 |
| Lãi/lỗ (`profit`) | 37.130.000 | 390.000 |
| **Lệch trên thẻ** | **27.975.000** | 0 (trùng ngẫu nhiên: tháng mới) |

Thời gian chạy (EXPLAIN ANALYZE trên prod): `finance_month_summary(9,2026)` **243 ms** (gọi thêm `finance_payable_summary` + phải thu) · `finance_pnl_by_month(2026)` **16 ms** (12 tháng, có `revenue`/`cash_in`/`profit`) · `dashboard_critical_kpis(9,2026)` 3 ms.
→ Nguồn cho thẻ = **`finance_pnl_by_month(p_year)`**: cùng đọc `finance_period_ledger` như `finance_month_summary` (ADR-016 §1; `verify:reports` đã assert hai hàm cho cùng số), rẻ hơn 15 lần, và có sẵn tháng trước để tính xu hướng.

Biểu đồ "Doanh thu theo tháng" ngay dưới thẻ đọc `dashboard_revenue_chart` = cũng tiền theo ngày phiếu → sau khi sửa thẻ, biểu đồ sẽ mâu thuẫn với thẻ (T8: thẻ 46,3tr, cột 18,4tr). Sửa **nhãn** biểu đồ cho đúng nghĩa (không đổi nguồn — nguồn đổi ở #29).

## 2. Phạm vi — 5 file, 0 DB *(bản duyệt ghi 4 file; sau review độc lập thêm `loading.tsx` + 3 sửa nhỏ, ghi ở §2.5)*

### 2.1 `types/dashboard.ts` — `DashboardKPIs`
Thêm sau `revenueChange`:
```ts
  /** Két: tiền vào theo ngày phiếu (payments + receipts lẻ) — finance_pnl_by_month.cash_in */
  cashIn: number;
  cashInChange: number | null;
  /** Lãi/lỗ tháng theo luật ngày ADR-016 — finance_pnl_by_month.profit */
  profit: number;
  profitChange: number | null;
```
`totalRevenue` giữ tên, đổi nghĩa: doanh thu theo ngày chụp (`finance_pnl_by_month.revenue`). Ghi JSDoc 1 dòng trên `totalRevenue`.

### 2.2 `lib/api/dashboard.ts`
- `emptyKpis()`: thêm `cashIn: 0, cashInChange: null, profit: 0, profitChange: null`.
- Thêm `queryLedgerKpis(supabase, month, year)` → gọi `supabase.rpc("finance_pnl_by_month", { p_year: year })`; nếu `month === 1` gọi thêm `{ p_year: year - 1 }` để lấy tháng 12 năm trước (Promise.all). Tìm dòng `raw_month === month` (hiện tại) và tháng trước; trả `{ totalRevenue, revenueChange, cashIn, cashInChange, profit, profitChange }` qua `asNumber` + `percentChange` (hàm sẵn có). Lỗi RPC → **throw** (không fallback két-gọi-là-doanh-thu — ADR-016 M2).
- `queryKpis()`: `Promise.all([queryCriticalKpis(...), queryLedgerKpis(...)])`; phần critical giữ nguyên logic cũ (RPC → fallback) nhưng **không còn map `current_revenue`/`previous_revenue`**; gộp: `{ ...critical, ...ledger }` khi `canViewFinancials`, còn không thì 3 cặp số = 0/null như `emptyKpis`.
- `queryKpisFallback()`: bỏ nhánh tính doanh thu từ `payments`/`receipts` (2 dòng `sumPaymentsAndReceipts` + gán `totalRevenue`/`revenueChange`); giữ `totalDebt` + phần hợp đồng. Hàm `sumPaymentsAndReceipts` chỉ còn dùng ở đây → **xoá** (thay đổi của mình làm nó thừa).
- `mapDashboardKpisFromAggregate()`: bỏ 2 dòng gán `totalRevenue`/`revenueChange` từ `row.current_revenue`/`previous_revenue`. Cột trong RPC vẫn tồn tại — không đụng DB (ghi §3).
- Khoá cache `unstable_cache(..., ["dashboard-critical-v1"], …)` → `"dashboard-critical-v2"` (hình dạng `kpis` đổi; bản cache cũ sống 120 s sẽ thiếu `cashIn` → `formatVnd(undefined)`).
- Không đổi `DASHBOARD_CRITICAL_CACHE_SECONDS`, không đổi `revalidateDashboardAfterMutation`.

### 2.3 `app/(protected)/dashboard/page.tsx`
- Import thêm `Wallet`, `TrendingUp` từ `lucide-react`.
- `DashboardKpiGrid` và `KpiSkeleton`: lưới `grid grid-cols-2 gap-4 lg:grid-cols-4` → **`grid grid-cols-2 gap-4 md:grid-cols-3`** (6 thẻ: phone 2×3 · tablet/desktop 3×2 — 5 thẻ ở 4 cột sẽ lẻ hàng; 6 cột ở 1024 px không đủ chỗ cho "46.325.000 ₫" ở `text-h2`). Skeleton 6 ô.
- Thứ tự thẻ (theo C8): 
  1. `label="Doanh thu tháng"` — `kpis.totalRevenue`, trend `revenueChange`, icon `DollarSign`, href `/finance/dashboard`, `entrance-1`.
  2. `label="Đã thu (két)"` — `kpis.cashIn`, trend `cashInChange`, icon `Wallet` `bg-success/10 text-success`, href `/finance/receipts`, `entrance-2`.
  3. `label="Lãi/lỗ tháng"` — `kpis.profit`, trend `profitChange`, icon `TrendingUp`, `trendUp = (profitChange ?? 0) >= 0`, href `/finance/dashboard`, `entrance-3`.
  4–6. "Hợp đồng mới" · "Tổng công nợ" · "Hoàn thành" giữ nguyên props, chỉ đổi `entrance-4/5/6`.
- Ba thẻ tiền đều theo `visibility.canViewFinancials` ("Ẩn" khi không có quyền) như thẻ hiện có.

### 2.4 `components/dashboard/revenue-chart.tsx` — chỉ nhãn
`"Doanh thu theo tháng"` → `"Tiền thu theo tháng (két)"` · `aria-label="Biểu đồ doanh thu theo tháng"` → `"Biểu đồ tiền thu theo tháng"` · tooltip formatter `"Doanh thu"` → `"Tiền thu"` · 2 EmptyState `"…doanh thu…"` → `"…tiền thu…"` (cùng component, cho nhất quán). Không đổi nguồn/props/data.

### 2.5 Bổ sung sau review độc lập (05/09, 3 lăng kính + phản biện)
- **`app/(protected)/dashboard/loading.tsx`** (file thứ 5): skeleton route-level còn 4 ô `lg:grid-cols-4` → đổi `md:grid-cols-3` + 6 ô, khỏi nhảy layout khi soft-navigate.
- **Lãi/lỗ âm bị kẹp về 0:** `asNumber` (`lib/finance-utils.ts:67`) là `Math.max(0, …)` → thẻ không bao giờ hiện lỗ. Thêm `asSignedNumber` cục bộ trong `dashboard.ts` (trần ±10 tỷ) cho `profit`. *(Cùng lỗi đang tồn tại ở `/finance/dashboard` — `finance-dashboard-queries.ts` dùng `asNumber` cho `profit`/`cash_net` — ghi sổ đối chiếu 🔴, sửa ở #29.)*
- **Xu hướng lãi/lỗ đảo dấu** khi kỳ trước âm (`(2 − (−5))/(−5) = −140%`): thêm `signedPercentChange` (mẫu số `|kỳ trước|`) dùng riêng cho `profitChange`; `percentChange` cũ giữ nguyên cho 5 cặp số khác.
- **Cô lập lỗi sổ kỳ:** `finance_pnl_by_month` lỗi trước đây kéo cả 3 thẻ HĐ/công nợ về 0 (Promise.all reject → `safeSection` trả `emptyKpis`, cache 120 s). Nay `.catch` riêng: Sentry + đẩy thông báo vào `errors` (hiện "Đang dùng dữ liệu dự phòng"), 3 số tiền = 0, HĐ/công nợ vẫn đúng. `loadDashboardSection` truyền `errors` vào loader (additive, caller cũ không đổi).
- Gỡ 2 field chết `current_revenue`/`previous_revenue` khỏi type `DashboardCriticalKpiRpcRow` (chính diff này làm thừa); dời `queryCriticalKpis` lên trước `queryKpis` theo thứ tự helper→caller của file.

## 3. Ngoài phạm vi (ghi để không lạc)
- **DB:** không `CREATE OR REPLACE` gì. `dashboard_critical_kpis.current_revenue/previous_revenue` thành cột không ai đọc → gỡ ở #29 (module Đọc số) cùng lúc đổi nguồn biểu đồ sang `finance_pnl_by_month`.
- Thẻ "Hoàn thành" đếm `hoan_thanh` theo `updated_at` (vi phạm luật vault "không đo bằng updated_at") → thêm 1 dòng vào sổ đối chiếu 🟡, sửa ở #29.
- Thẻ "Tổng công nợ" (`debtChange` luôn `null`), tiền kẹt/phải trả/HĐ quá ngưỡng (3 số còn lại của C8), health-score/break-even (#18) — không đụng.
- E2E `tests/e2e/cashflow-m2.spec.ts:414` tìm `/Doanh thu/` trên `/finance/dashboard` — không liên quan trang này.

## 4. Verify — số chờ điền

| Kiểm | Lệnh | Chờ |
|---|---|---|
| Kiểu + lint + build | `npx tsc --noEmit` · `npm run lint` · `npm run build` | 0 lỗi · 0 lỗi · build OK |
| Gate module | `npm run verify:dashboard` | xanh (không mojibake, RPC probe ok) |
| Nguồn khớp (SQL đọc) | `finance_pnl_by_month(2026)` tháng hiện tại `.revenue`/`.cash_in`/`.profit` so `finance_month_summary(m,2026)` cùng cột; `.cash_in` so `dashboard_critical_kpis(m,2026).current_revenue` | chênh **0 đ** cả 4 cặp |
| Màn = RPC | đăng nhập owner, mở `/dashboard`, đọc 3 thẻ | `formatVnd(RPC)` = chữ trên thẻ, chênh 0 đ; T9 hiện `720.000 ₫ · 720.000 ₫ · 390.000 ₫` (số sẽ đổi theo ngày chạy — ghi số lúc verify) |
| Responsive | screenshot @390 · @768 · @1023 · @1280 | 2 cột · 3 cột · 3 cột · 3 cột; không tràn chữ ở `text-h2` |
| Quyền | role không `canViewFinancials` (vd `sale`) | 3 thẻ tiền hiện "Ẩn", 3 thẻ HĐ vẫn số |
| Biểu đồ | cùng màn | tiêu đề "Tiền thu theo tháng (két)", cột T8 = 18.350.000 (không đổi) |

## 5. Rủi ro & đường lùi
- **+1 RPC (16 ms) trong critical path**, có cache 120 s — không mở đợt perf (ADR-005); đo lại `dashboard.critical` profile sau khi lên: chờ ≤ +30 ms.
- Lãi/lỗ có thể cũ ≤ 120 s sau khi sửa task/đơn in/chi (tag map không nghe các bảng đó) — chấp nhận, cùng mức với các thẻ hiện có.
- Tháng 1: cần 2 lần gọi `finance_pnl_by_month` (năm nay + năm trước) — đã xử lý ở §2.2.
- Đường lùi: `git revert` 1 commit; không có DB change; khoá cache `-v2` tự hết hạn.

## 6. Kết quả — 05/09/2026

| Kiểm | Kết quả |
|---|---|
| `npx tsc --noEmit` | 0 lỗi |
| `npx eslint` 5 file | 0 lỗi · 0 cảnh báo (lint toàn repo 13 lỗi/24 cảnh báo **có sẵn trước**, đo bằng stash: 37 = 37) |
| `npm run build` | OK (Turbopack) — *lần 1 và 2 bundle `page.tsx` bị compile từ bản cũ vì tôi chạy `git stash` đo baseline đúng lúc build nền đang đọc file; xoá `.next` build lại → `md:grid-cols-3` ×3, lưới cũ ×0. Bài học: không stash khi build/dev đang chạy.* |
| `npm run verify:dashboard` | **đỏ có sẵn trước** (baseline stash cũng đỏ): assert `from("payment_plans")`/`isPaidPlanStatus` lỗi thời từ ADR-016 M3 (nhắc thu đã chuyển sang RPC `finance_pending_collections`). Ghi sổ đối chiếu 🟡, sửa script ở #29. Các assert khác xanh. |
| Nguồn khớp (SQL đọc, T9/2026) | `finance_pnl_by_month.revenue` 720.000 = `finance_month_summary.revenue` · `cash_in` 720.000 = `dashboard_critical_kpis.current_revenue` · `profit` 390.000 = 390.000 → **chênh 0 đ cả 4 cặp** |
| Màn = RPC (`next start`, đăng nhập owner, ≥1024 px) | 6 thẻ · 3 cột: Doanh thu 720.000 ↓98,4% · Đã thu (két) 720.000 ↓96,1% · Lãi/lỗ 390.000 ↓98,9% · HĐ mới 0 · Công nợ 92.575.000 · Hoàn thành 0 — số và **xu hướng** đúng như tính từ SQL (T8: 46,325tr / 18,35tr / 37,13tr) → chứng minh 3 thẻ đọc 3 cột khác nhau của sổ kỳ. Biểu đồ "Tiền thu theo tháng (két)", cột T8 = 18,35tr không đổi. Ảnh: `screenshot-1788617495690-1.jpg` |
| Responsive @390/@768/@1023/@1280 | **PASS bằng Playwright** (`tests/e2e/dashboard-kpi-ledger.spec.ts`, chromium, `next start`): 390 → **2 cột** · 768/1023/1280 → **3 cột**, 6 thẻ; 3 số trên thẻ = `finance_pnl_by_month` lúc chạy **chênh 0đ** ở cả 4 viewport; tiêu đề biểu đồ đúng. Ảnh `screenshots/dashboard-kpi/{390-phone,768-tablet,1023-tablet-max,1280-desktop}.png`. Seed 1 admin E2E → dọn ở afterAll + sweep. *(Lần đầu tôi định nhờ chủ xem iPhone — chủ từ chối, đúng: Claude tự verify.)* |
| Quyền (`sale`) | không kiểm bằng UI (không có tài khoản `sale`; seed thêm role là ngoài phạm vi). Logic `visibility.canViewFinancials` giữ nguyên đường cũ ("Ẩn"); `queryKpis` không gọi sổ kỳ khi không có quyền. |
| Hồi quy — jest | `npx jest`: 65/71 suite xanh; **6 suite đỏ giống hệt trên HEAD** (đo bằng `git worktree` riêng, không stash): gallery-note-download, moodie ×3, 2 integration `moodie-*-live` (cần API key; và **tạo user prod rồi không dọn khi fail** — thêm nguồn rò cho #10). Không suite nào mới đỏ. |
| Hồi quy — e2e có sẵn qua `/dashboard` | `cashflow-m3.spec.ts` (3 test: phải trả ekip · cần thu theo mốc giao · UI `/dashboard` "Cần thu tiền" + `/finance/*`) **3/3 PASS** cùng lượt với spec KPI mới 1/1 — 4 passed 32 s trên `next start`. Seed global 20 HĐ + teardown dọn; quét sau: 0 dòng E2E (2 user `e2ememorygraph…` rò từ jest live đã dọn tay). |
| Review độc lập (workflow 3 lăng kính) | 16 phát hiện · 1 xác nhận (loading.tsx) · 2 bác bỏ · 13 chưa phản biện (hết hạn mức subagent) → tôi tự xét, nhận 5 (§2.5), còn lại ghi sổ đối chiếu hoặc bỏ. |

**Dọn rác test khi chạy e2e (lệnh chủ "data test nhớ dọn"):** phát hiện rác **sự cố 28/08 chưa dọn hết** — 6 auth user `@test.local` (1 **admin active** `PERF Probe`), **4 phiếu chi E2E sống = 1.700.000đ trong sổ T8** (`cash_out` T8 19.796.400 → **18.096.400** sau dọn, khớp đối soát 26/08), 2 phân bổ mồ côi, 1 lab, 2 vendor, 1 vật tư. Đã xoá qua API service-role, ghi `agent/DB-CHANGELOG.md`. Quét 10 bảng sau dọn: 0 dòng E2E.

Chưa commit. Diff 5 file app `+158 −75` + 1 spec e2e mới. Push sau khi chủ xem diff (ADR-018 Cổng 2).
