# T-20260910-goals-doc-ledger — T1: `/finance/goals` đọc sổ kỳ (diệt R10), gỡ khối lương + chi phí cố định (C7)

**Owner:** claude (spec → chủ duyệt → claude code → verify → chủ xem diff) · **Trạng thái:** ✅ CODE + VERIFY XONG 10/09 (chủ "duyệt" 10/09) · chờ chủ xem diff / "đẩy" · **Chương trình:** GĐ2 tuần 4, bước #17 (`agent/GOALS.yaml`), gate G1 ✅ (qua 10/09) · **Đổi:** 1 server action + 1 type + 2 component (overview gỡ 2 dòng lương/cố định, form modal burn rate) + 1 script verify + 1 e2e · **DB:** không đổi (đọc RPC `finance_month_summary` đã có) · **ADR:** không cần — đúng ADR-016 M2 "`finance_month_summary` / `finance_pnl_by_month` là nguồn duy nhất" · **Revert:** `git revert` 1 commit.

## 0. Vì sao

Sổ đối chiếu dòng 85 (R10): *"`/finance/goals` cashflow — đọc sổ kỳ — **tự cộng 5 bảng, trừ lương + chi phí cố định 2 lần** (expenses đã chứa) — nổ ở dòng `monthly_salaries`/`fixed_costs` đầu tiên"*. PHUONG-AN T1: *"`finance_period_ledger` là nguồn duy nhất cho mọi số theo kỳ"*; quyết định **C7**: *"Không dùng lương cứng. Gỡ khối lương + chi phí cố định khỏi Mục tiêu; R10 vẫn sửa (rẻ) nhưng hạ ưu tiên"*.

Màn Mục tiêu tính "tiền dư mỗi tháng có thể dành cho mục tiêu" — con số quyết định gợi ý số tiền góp, "khả thi/không khả thi", ngày về đích dự kiến. Hiện nó là công thức riêng ngoài sổ kỳ, đúng **tình cờ** vì hai bảng lương/cố định rỗng; ngày nào có sheet lương, số dư sẽ âm sai.

## 1. Sự thật đã đo (10/09, chỉ đọc)

- **Code:** `fetchGoalsCashflow` (`app/actions/finance-operations-queries.ts:836–920`) chạy 5 truy vấn: `payments` + `receipts(contract_id null)` = thu · `expenses` = chi · `monthly_salaries.total_salary` (tháng) · `fixed_costs.monthly_amount` (còn hiệu lực) → `net = thu − chi − lương − cố định`; `availableForGoals = max(0, net)`. Không đọc RPC nào. Kiểu `GoalsCashflowData` có `salaryComponent`, `fixedCostComponent`; UI dùng: `availableForGoals` ×9 (overview, drawer, modal góp), `salaryComponent`/`fixedCostComponent` ở **2 chỗ**: khối "Dòng tiền tháng" trong `goals-overview.tsx:141,149` (hai dòng "− Lương", "− Chi phí cố định" — chính là khối C7 bảo gỡ) và `goal-form-modal.tsx:112–114` ("burn rate" gợi ý số tiền mục tiêu = chi + lương + cố định); `monthlyExpense` ×2, `monthlyIncome`/`netCashflow`/`currentPeriod` ×1.
- **Sổ kỳ đã có sẵn cột đúng:** `finance_month_summary(p_month, p_year)` → `cash_in` (= `cash_in_contract` + `cash_in_retail`), `cash_out`, `cash_net`; `cash_out` đã gồm mọi phiếu chi kể cả lương/cố định (`finance_period_ledger` tách `cash_out_salary`, `cash_out_fixed` **bên trong** `cash_out`). Dashboard tài chính đã đọc RPC này (`finance-dashboard-queries.ts:154`).
- **Số đối chiếu (hôm nay hai cách bằng nhau vì bảng lương/cố định rỗng):**

| Tháng | Tay: thu (payments + lẻ) | Tay: chi (expenses) | Lương/cố định | RPC `cash_in` | RPC `cash_out` | RPC `cash_net` |
|---|---|---|---|---|---|---|
| T8/2026 | 18.300.000 + 50.000 = 18.350.000 | 18.096.400 | 0 / 0 | 18.350.000 | 18.096.400 | **253.600** |
| T9/2026 | 85.275.000 + 720.000 = 85.995.000 | 0 | 0 (không có sheet T9) / 0 | 85.995.000 | 0 | **85.995.000** |

- `monthly_salaries`: 2 dòng (T5, T6/2026, `total_salary = 0`); `fixed_costs`: 0 dòng; 0/13 nhân sự có `base_salary` (C7). Phiếu chi T8–T9 theo danh mục: Chi phí thợ ngoài 10,55tr · In ấn 7,546tr — lương/cố định nếu có sau này cũng đi qua `expenses` → RPC đã tính, công thức tay sẽ trừ lần 2.

## 2. Phạm vi — 5 file sửa, 2 file mới

| File | Đổi |
|---|---|
| `app/actions/finance-operations-queries.ts` | `fetchGoalsCashflow`: thay 5 truy vấn bằng `supabase.rpc("finance_month_summary", { p_month, p_year })` → `monthlyIncome = cash_in`, `monthlyExpense = cash_out`, `netCashflow = cash_net`, `availableForGoals = max(0, cash_net)`. `GoalsCashflowData` **bỏ** `salaryComponent`, `fixedCostComponent` (C7). Giữ `withFinanceRead`, `month/year/currentPeriod`, thông điệp lỗi |
| `components/finance/goals/goals-overview.tsx:136–152` | **gỡ 2 dòng "− Lương" / "− Chi phí cố định"** khỏi khối "Dòng tiền tháng" (C7); còn Thu · Chi · Dư = 3 cột của sổ kỳ |
| `components/finance/goals/goal-form-modal.tsx:112–114` | burn rate gợi ý = `monthlyExpense` (đã gồm mọi chi thật) |
| `components/finance/goals/goal-detail-drawer.tsx`, `goal-contribution-modal.tsx` | không đổi logic (chỉ dùng `availableForGoals`) |
| `scripts/verify-goals.mjs` (**mới**) + `package.json` `verify:goals` | tĩnh: `fetchGoalsCashflow` chứa `rpc("finance_month_summary"`, **không** chứa `from("monthly_salaries")`/`from("fixed_costs")`/`from("payments")`; `GoalsCashflowData` không có `salaryComponent` |
| `tests/e2e/goals-ledger.spec.ts` (**mới**) | admin tạm → `/finance/goals` → số "dư/tháng" trên màn = `finance_month_summary(tháng hiện tại)`.`cash_net` đọc bằng service role, chênh **0đ**; không lỗi console |

Không đổi DB, không đổi hàm sổ kỳ, không đổi bảng `financial_goals`/`goal_contributions`/`budgets`.

## 3. Ngoài phạm vi
- Trang `/finance/fixed-costs`, `/finance/salaries`, `monthly_salaries`: C7 nói "gỡ khỏi Mục tiêu", không xoá tính năng M5; bật lại khi chủ nhập `base_salary`.
- `getBudgetsWithActuals` (`goal-budget-actions.ts:329`) tự cộng `expenses` theo danh mục — ngân sách theo danh mục không có trong sổ kỳ, không đụng (ghi 🟡 cho #29 Đọc số).
- `finance_month_summary` tính `cash_in` theo `payment_date`/`receipt_date`, khớp công thức tay hiện tại — không đổi định nghĩa.

## 4. Verify — số chờ điền

| Kiểm | Cách | Chờ |
|---|---|---|
| Tĩnh | `npm run verify:goals` · `tsc` · `eslint` 3 file | pass · 0 · 0 |
| Số | `finance_month_summary(9, 2026)` trước/sau (không đổi DB) | `cash_in` 85.995.000 · `cash_out` 0 · `cash_net` 85.995.000 |
| Màn hình | Playwright `goals-ledger.spec.ts` (admin tạm, `next start`) | "dư/tháng" trên `/finance/goals` = 85.995.000 (chênh 0đ) · 0 console error · rác 0 |
| Hồi quy | `tests/e2e/finance-module.spec.ts` case "no critical console errors across finance pages" (có `/finance/goals`) | pass |
| Sổ | sổ đối chiếu dòng 85 gạch · vault `40-module/tai-chinh.md` ghi "goals đọc `finance_month_summary`" | cập nhật |

## 5. Rủi ro & đường lùi
- Số dư hiển thị **không đổi hôm nay** (hai cách bằng nhau) — thay đổi chỉ lộ ra khi có phiếu chi lương/cố định: khi đó màn Mục tiêu mới đúng, cũ mới sai.
- `goal-form-modal` gợi ý số tiền mục tiêu = 6 × chi/tháng: bỏ 2 thành phần rỗng → số gợi ý không đổi.
- Đường lùi: `git revert` 1 commit; không có migration.

## 6. Kết quả — 10/09/2026

| Kiểm | Kết quả |
|---|---|
| Tĩnh | `npm run verify:goals` pass (RPC có · 5 bảng không · 0 tham chiếu salary/fixed ở 5 component) · `tsc` 0 · `eslint` 5 file 0 (1 cảnh báo "file ignored" cho `.mjs`) |
| Số | `finance_month_summary(9, 2026)`: `cash_in` 85.995.000 · `cash_out` 0 · `cash_net` 85.995.000 (DB không đổi) |
| Màn hình | Playwright `tests/e2e/goals-ledger.spec.ts` **1/1** trên `next start` (build `A1pSvQgtViYINqZIns3qq`): Thu **+85.995.000** · Chi **−0** · Dư khả dụng **85.995.000** = RPC, chênh **0đ**; badge `T9/2026`; không còn dòng "Lương"/"Chi cố định"; 0 lỗi app trong console (ảnh `test-results/goals-ledger.png`) |
| Nhiễu console trên `next start` cục bộ (không phải lỗi app) | `POST /monitoring` 403 (Sentry tunnel) · `/_vercel/speed-insights/script.js` 404 rồi "Refused to execute script … MIME text/html" (middleware trả `/login`) — spec mới lọc đúng nhóm này, giữ bắt PGRST/TypeError/42501 |
| Hồi quy `finance-module.spec.ts` "no critical console errors" | **đỏ 15 > 2**, toàn bộ 15 là "Refused to execute script …/_vercel/speed-insights" (spec đó viết cho `npm run dev`, chưa lọc MIME) → **0 lỗi app**; không sửa spec đó trong bước này (ghi cho lần dọn e2e) |
| Rác | sau 5 lần chạy Playwright: `audit_logs(E2E)` = **200** (nhật ký 20 HĐ seed × 5 lần global-setup, teardown xoá HĐ nhưng không xoá audit) → dọn qua service role → **0**; 22 bảng còn lại 0. **Vá gốc:** `playwright/global-teardown.ts` xoá audit của HĐ seed ngay sau khi xoá HĐ |
| Sổ | vault `40-module/tai-chinh.md` mục (4) #17 · GOALS #17 `cho-xem-diff` · sổ đối chiếu dòng 85 gạch khi `/buoc done` |
