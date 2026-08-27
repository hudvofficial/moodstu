# T-20260827-tien-vao-payment-plans — M4 Tiền vào: dashboard "Cần thu tiền" theo mốc giao (một luật với `/finance`), bỏ Đợt 1/Đợt 2 tự sinh 0đ, nhãn Moodie

**Owner:** claude (spec + code trực tiếp — đường lùi khi coder subagent hết quota) · **Trạng thái:** approved (user "tiến hành triển khai" 26/08 cho M3b/M4/M5) → implement ngay · **Branch:** `claude/tien-vao-m4` · **Module:** tai-chinh (dashboard) + hop-dong (lịch thu) · **DB:** 1 migration (đổi generator + xoá dòng 0đ, có backup + pre-check).

## 0. Đo (prod 26–27/08, chỉ đọc)
- `payment_plans` 240 dòng = 60 HĐ × 4 đợt do `create_default_payment_schedule_v2` **luôn** sinh: Cọc (số cọc lúc tạo, hạn = ngày ký) · **Đợt 1 · Đợt 2 (0đ, không hạn — cố định trong generator)** · Tất toán (còn lại, hạn = ngày chụp). Mood thu Cọc + Tất toán; Đợt 1/2 **chưa bao giờ** được dùng: 115 dòng pending 0đ + 4 cancelled, **1 dòng `installment_2` partial** có 1 phân bổ (phiếu thu gắn nhầm đợt 0đ → giữ, không xoá).
- RPC thu tiền **đang chạy** (`process_contract_payment_v2`, 8,3 KB) vẫn ghi `payment_plan_allocations` + gọi `sync_payment_plan_statuses_v2` + tự tạo đợt `outside`: 51/51 phiếu thu có phân bổ → phân bổ là SSOT, **không** có lỗ hổng toàn vẹn (file `20260527120000` trong repo cũ hơn bản DB).
- "Quá hạn" trên dashboard (`lib/api/dashboard.ts` `queryPaymentReminders`) = `payment_plans.due_date < hôm nay` với HĐ còn nợ → 36 mốc trên 20 HĐ còn nợ: 16 Cọc 0đ (nhiễu) + 20 Tất toán = hạn **ngày chụp** đã qua. Theo luật M3 (ADR-016 phụ lục M3) phải thu **đến hạn khi đã giao sản phẩm**: chỉ **1/20** HĐ còn nợ đã giao (HĐ-2026-0052, 3.300.000). Dashboard đang cảnh báo 20, `/finance` nói 1 → hai luật.
- `contract_payment_health_checks` chỉ đòi mỗi HĐ active ≥ 1 đợt chưa huỷ → xoá Đợt 1/2 không làm check đỏ. Bản in HĐ lọc `amount > 0` → không đổi. `PaymentPlanCard` chỉ hiện "đợt tiếp theo" + "Còn N đợt sau mốc này" → bớt 2 đợt rỗng. Moodie không đọc `payment_plans`; `lib/moodie/catalog.ts:22-23` còn chữ "nợ quá hạn". Dashboard dùng `createAdminClient` (service role) → gọi được `finance_pending_collections` (EXECUTE chỉ service_role).

## 1. Thay đổi

### 1.1 Dashboard "Cần thu tiền" đọc `finance_pending_collections` (M3) — `lib/api/dashboard.ts` `queryPaymentReminders`
Thay toàn bộ thân hàm (giữ chữ ký + `if (!visibility.canViewFinancials) return []`):
```ts
  const { data, error } = await supabase.rpc("finance_pending_collections", { p_limit: LIST_LIMIT });
  assertQueryOk("Lỗi tải danh sách cần thu", error);
  return ((data || []) as QueryRow[]).map((row) => {
    const contractId = asString(row.id);
    const deliveredAt = asString(row.delivered_at, "") || null;
    const workDate = asString(row.work_date, "") ? toDateOnly(new Date(asString(row.work_date))) : null;
    const isOverdue = Boolean(deliveredAt); // ADR-016 M3: đã giao sản phẩm mà còn nợ = đến hạn
    const milestone = {
      id: `contract:${contractId}`,
      stageName: isOverdue ? "Đã giao chưa thu" : "Chờ giao",
      amount: asNumber(row.remaining_amount),
      dueDate: deliveredAt ?? workDate,
      source: "contracts" as const,
      isOverdue,
    };
    return {
      id: milestone.id, contractId,
      contractCode: asString(row.contract_code),
      customerName: asString(row.customer_name, "Khách hàng"),
      stageName: milestone.stageName,
      remainingAmount: asNumber(row.remaining_amount),
      dueDate: milestone.dueDate,
      source: "contracts" as const,
      isOverdue,
      href: `/contracts/${contractId}`,
      milestones: [milestone],
      installmentCount: 1,
      overdueCount: isOverdue ? 1 : 0,
    };
  });
```
RPC đã xếp: đã giao trước (theo ngày giao), rồi chờ giao theo ngày chụp — **không sort lại**. Bỏ `COLLECTION_DAYS` nếu không còn ai dùng (grep), giữ `LIST_LIMIT`. `toDateOnly`/`asString`/`asNumber`/`assertQueryOk`/`QueryRow` có sẵn trong file. `PaymentReminderSource` (types/dashboard.ts) giữ nguyên union (`"contracts"` đã có).
- `app/actions/dashboard-cache.ts`: `contract_events` thêm `DASHBOARD_PAYMENTS_CACHE_TAG` (mốc giao đổi → card cần thu tươi); giữ `payment_plans` như cũ.

### 1.2 `components/dashboard/payment-reminders.tsx`
- Badge: `overdueCount > 1 ? \`${overdueCount} quá hạn\` : "Quá hạn"` → `"Đã giao chưa thu"` (một nhãn với `/finance`, `/finance/debts`, Moodie).
- Bỏ chip `{installmentCount > 1 && (...)} đợt` (luôn 1 sau 1.1; chip cũng dùng `text-tiny` ngoài thang) và các biến chỉ phục vụ nó (`installmentCount`, `hiddenCount` nếu hết dùng). Dòng phụ: `${item.contractCode} · ${formatMilestone(...)}` giữ (ra "HĐ-2026-0052 · Đã giao chưa thu · 20/08" / "Chờ giao · 05/09"). Empty state giữ.
- Chấm màu: `bg-warning` → `isOverdue ? "bg-error" : "bg-warning"`.

### 1.3 Migration `supabase/migrations/20260827100000_payment_plans_m4_bo_dot_1_2.sql`
1. Pre-check DO: `count(*) FROM payment_plans WHERE stage_key IN ('installment_1','installment_2') AND NOT EXISTS (allocation)` = **119** và có allocation = **1**; `(SELECT count(*) FROM payment_plan_allocations a JOIN payments p ON p.id=a.payment_id WHERE p.deleted_at IS NULL)` = số phiếu thu active (51) — lệch → `RAISE EXCEPTION`.
2. `CREATE OR REPLACE FUNCTION public.create_default_payment_schedule_v2(...)` **cùng chữ ký**: bỏ 2 khối INSERT Đợt 1/Đợt 2; các CASE `sort_order`/`stage_name` bỏ 2 nhánh installment; `v_target_stage_key NOT IN ('deposit','final')` → `'deposit'`. Phần Cọc/Tất toán/`outside` giữ nguyên chữ.
3. `DELETE FROM public.payment_plans pp WHERE pp.stage_key IN ('installment_1','installment_2') AND NOT EXISTS (SELECT 1 FROM public.payment_plan_allocations a WHERE a.payment_plan_id = pp.id);` (119 dòng; dòng partial có phân bổ giữ).
4. NOTICE số dòng xoá + `contract_payment_health_checks()` sau xoá phải 0 ở `active_contracts_missing_payment_stage`.
Backup trước khi áp: `node scripts/db-q.mjs "select * from payment_plans where stage_key in ('installment_1','installment_2') order by contract_id, sort_order" > docs/reports/backup_2026-08-27_payment_plans_installments.json` (120 dòng, commit kèm).
`invalid_payment_stage_key` vẫn chấp nhận key installment (dữ liệu cũ trong backup/phiếu thu cũ) — không đổi. `payment_stage_key_v2`, `PAYMENT_STAGE_LABELS` (`types/contract-constants.ts`) giữ để đọc dữ liệu cũ.

### 1.4 Moodie
`lib/moodie/catalog.ts:22-23`: "nợ quá hạn" → "đã giao chưa thu" (đúng từ vựng `tools.ts:690/700`).

## 2. Verify
- `npx eslint` 4 file · `npx tsc --noEmit` · `npm run build`.
- `scripts/verify-reports.mjs` thêm: `finance_pending_collections(6)` mọi dòng `delivered_at` không null đứng trước dòng null; `scripts/verify-contracts.mjs` thêm: `payment_plans` không còn dòng `installment_*` không phân bổ; `contract_payment_health_checks()` mọi `issue_count` = 0 (nếu script đã có check này thì giữ).
- Playwright `tests/e2e/cashflow-m3.spec.ts` UI test mở rộng: sau (B) (mốc giao HĐ seed = `hoan_thanh`, còn nợ) → `/dashboard` card "Cần thu tiền" có dòng HĐ seed với "Đã giao chưa thu"; không còn chữ "quá hạn". Chạy local `--workers=1` rồi prod sau merge.
- Snapshot trước/sau migration: `finance_debt_stats`, `finance_month_summary(8,2026)` receivable_due/receivable_waiting — **không đổi** (phải thu không đọc plan); `contract_payment_health_checks()` = 0; số đợt/HĐ = 2 (trừ HĐ có `outside`/dòng partial).

## 3. Docs
`vault/40-module/hop-dong.md` (lịch thu = Cọc + Tất toán, `outside` khi thu vượt; dashboard cần thu theo mốc giao), `vault/40-module/tai-chinh.md` (dashboard "Cần thu" = `finance_pending_collections`), `vault/50-luong/luong-tien.md` (nếu có mục nhắc thu), `docs/design/dong-tien-mood-v2.md` §9 M4 ✅, `agent/DECISIONS.md` ADR-016 phụ lục M4 (3 quyết định: một luật đến hạn = mốc giao ở mọi màn; lịch thu mặc định 2 đợt; không xoá dòng có phân bổ), `TASKS.yaml`, `CURRENT_STATE.md`.

## 4. Không làm (ghi nhận)
- `payment_status` `da_coc` không bao giờ được ghi (trigger `trg_contract_payment_status_v2` ghi đè 3 giá trị) → badge "Thanh toán một phần" cho HĐ mới cọc là hành vi hiện tại; đổi là quyết định UI riêng.
- 40 đợt Cọc 0đ pending (HĐ tạo không cọc) hiện "Nhập khi thu" ở `PaymentPlanCard` — đúng thiết kế, không đụng.
- "Category thu chuẩn hoá" (design §9 M4): `payments.payment_stage` là nhãn tự do (`payment_stage_display_label_v2`) — chưa thấy nơi báo cáo theo category thu; bỏ khỏi M4, mở lại khi có nhu cầu.

## 5. Kết quả (27/08/2026, nhánh `claude/tien-vao-m4`, Claude code trực tiếp)
- **DB:** backup 120 dòng installment → `docs/reports/backup_2026-08-27_payment_plans_installments.json`; migration `20260827100000_payment_plans_m4_bo_dot_1_2.sql` **đã áp prod** (pre-check 119/1/51 = 51 OK): `payment_plans` 240 → **121** (60 HĐ vẫn có đợt; 1 dòng `installment_2` có phân bổ giữ), generator không còn Đợt 1/2. Đối soát trước = sau: `receivable_due` 3.300.000 · `receivable_waiting` 89.275.000 · `contract_payment_health_checks` 8/8 = 0.
- **Code:** `queryPaymentReminders` → `finance_pending_collections(LIST_LIMIT)` (mỗi HĐ 1 dòng, `isOverdue` = đã giao, `dueDate` = ngày giao / ngày chụp); bỏ `COLLECTION_DAYS`, `isPaidPlanStatus` hết dùng; `dashboard-cache` `contract_events` → thêm tag PAYMENTS; `payment-reminders.tsx` badge "Đã giao chưa thu", chấm đỏ khi đã giao, bỏ chip "N đợt" (`text-tiny`); Moodie catalog "đã giao chưa thu". `verify-reports` (đã giao đứng trước) + `verify-contracts` (không còn installment rỗng; health 8/8 = 0) mở rộng; `cashflow-m3` UI test thêm `/dashboard`.
- **Gate:** eslint 0 · tsc 0 · `verify:reports` ✓ · `verify:contracts` ✓ · build ✓ · Playwright local `cashflow-m3` **3/3** (dashboard "Cần thu tiền" hiện HĐ seed đã giao với "Đã giao chưa thu", không còn chữ "quá hạn"; ảnh `test-results/m4/dashboard-can-thu-1366.png` gửi user).
