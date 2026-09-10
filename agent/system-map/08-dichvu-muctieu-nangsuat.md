# Bản đồ kiến trúc — DỊCH VỤ · MỤC TIÊU · NĂNG SUẤT EKIP (mood-studio)

> Gốc đường dẫn: `mood-studio/`. Migration ghi tên file + số dòng trong file đó.
> **Không chạm DB.** Mọi khẳng định suy từ file trong repo + `types/database.types.ts` (sinh từ DB thật, mtime 2026-08-26 22:51) + `vault/30-du-lieu/luoc-do-dich-vu.md` (sinh từ introspect DB, `cap-nhat: 2026-08-07`).
> Nối với 6 miền cũ ở §5. Thứ không có bằng chứng nằm ở §8.
> Ba mức tin cậy theo `agent/SYSTEM_MAP.md` §0: **[CODE]** có `file:dòng` · **[SCHEMA]** có trong `types/database.types.ts` hoặc vault-introspect · **[?]** chưa xác minh.

---

## 1. Bảng dữ liệu

### 1.1 — Miền **Dịch vụ** (6 bảng)

| Bảng | Vai trò | Cột (nguồn) | AI GHI VÀO | Bằng chứng |
|---|---|---|---|---|
| `services` | **Catalog gói dịch vụ** — nguyên liệu cho hợp đồng, KHÔNG phải tiền | `id`, `service_code` (NOT NULL), `name` (NOT NULL), `service_type` (**text**, NOT NULL), `category_id`, `selling_price` (numeric NOT NULL, default 0), `cost_price` (default 0), `description`, `image_url`, `status` (default `'active'`), `unit` (default `'dich_vu'`), `fulfillment_type` (default `'single'`), `created_by`, `updated_by`, `deleted_at` | **CHỈ 2 đường:** ① RPC `save_service_atomic` (`20260428183000_services_security_atomic_writes.sql:197-260`) gọi từ `createService`/`updateService` (`app/actions/service-mutations.ts:91,137`) và `quickCreateService` (`app/actions/category-actions.ts:266`) · ② RPC `delete_service_atomic` xoá mềm (`20260428183000:397-402`). **Ngoài app:** `scripts/normalize-services.mjs:70-74` UPDATE thẳng bằng service-role key | `types/database.types.ts:5169-5226`; `vault/30-du-lieu/luoc-do-dich-vu.md:23-71` (18 dòng, 15 index) |
| `service_categories` | Danh mục dịch vụ (tự tham chiếu `parent_id`) | `id`, `name`, `parent_id`, `slug`, `icon`, `sort_order` | `upsertCategory` INSERT/UPDATE **thẳng bảng** (`app/actions/category-actions.ts:75-91`) · `deleteCategory` DELETE **cứng** (`:116`), chặn trước nếu còn dịch vụ dùng (`:106-114`) | `types/database.types.ts:5095-5135`; vault `luoc-do-dich-vu.md:73-99` (7 dòng) |
| `service_bundles` | Thành phần gói combo (parent → child) | `parent_service_id`, `child_service_id`, `quantity`, `adjustment_price`, `sort_order`; UNIQUE `(parent, child)` | **DUY NHẤT** `save_service_atomic` (DELETE-then-INSERT toàn bộ, `20260428183000:319-335`); `delete_service_atomic` xoá con của parent (`:394-395`) | `types/database.types.ts:5050-5093`; vault `luoc-do-dich-vu.md:101-125` (**0 dòng**, FK CASCADE cả 2 chiều) |
| `service_relations` | Quan hệ gợi ý (REQUIRED/OPTIONAL/SUGGESTED) giữa dịch vụ ↔ dịch vụ hoặc dịch vụ ↔ danh mục | `parent_service_id`, `child_service_id`, `child_category_id`, `relation_type` (default `'addon'`), `is_required`, `sort_order` | `upsertRelation` (`app/actions/builder-actions.ts:70-72`) — **0 call-site trong `components/`** (§7 #4) | `types/database.types.ts:5136-5168` (**`Relationships: []` → không FK**); vault `luoc-do-dich-vu.md:127-147` (0 dòng) |
| `price_rules` | Quy tắc giảm giá gói (jsonb `conditions`/`actions`) | `name`, `description`, `conditions` jsonb, `actions` jsonb, `priority`, `is_active` | `upsertPriceRule` (`app/actions/builder-actions.ts:105-107`), UI `components/services/builder/RuleManager.tsx:43,57` | `types/database.types.ts:4455-4487`; vault `luoc-do-dich-vu.md:149-169` (0 dòng) |
| `promotions` | Mã khuyến mãi | `promo_code`, `discount_type` (CHECK `percentage`/`fixed`), `discount_value`, `usage_limit`… | **Không có code nào đọc/ghi** — 0 kết quả grep trong `app/`, `lib/`, `components/` | vault `luoc-do-dich-vu.md:171-197` (0 dòng); không xuất hiện trong `types/database.types.ts`? → có, `:4643` |

**Không migration nào `CREATE TABLE` 6 bảng này** — grep `CREATE TABLE.*service` trên toàn `supabase/migrations/` chỉ ra `finance_service_distribution`, `delete_service_atomic`, `save_service_atomic`, `dashboard_service_breakdown`. Lược đồ bảng nằm **ngoài** lịch sử migration của repo (cùng dạng với `recalc_contract_totals`, `SYSTEM_MAP §5.1`).

**Bảng liên quan nhưng KHÔNG thuộc miền này:** `lab_services` (miền In ấn — `components/printing/labs/lab-services-editor.tsx`, cột `cost_price` riêng, đừng lẫn với `services.cost_price`).

### 1.2 — Miền **Mục tiêu** (3 bảng)

| Bảng | Vai trò | Cột | AI GHI VÀO | Bằng chứng |
|---|---|---|---|---|
| `financial_goals` | **Mục tiêu tiết kiệm/đầu tư — KHÔNG nằm trên đường tiền vào–ra** | `name`, `target_amount`, `current_amount` (**dẫn xuất**), `deadline`, `status` (text: `active`/`completed`/`cancelled`), `icon`, `color`, `notes`, `deleted_at` | INSERT `createGoal` (`app/actions/goal-budget-actions.ts:26`) · UPDATE `updateGoal` (`:83`), `deleteGoal` xoá mềm (`:107`) · `current_amount` do RPC `contribute_to_goal` / `undo_contribution_atomic` ghi, **fallback TS** ghi thẳng khi RPC thiếu (`:176`, `:236`) | `types/database.types.ts:2116-2159` (**`Relationships: []`**); cột `deleted_at`+`updated_at` thêm ở `20260428090000_finance_audit_fix_completion.sql:11-13`; index `:31-33` |
| `goal_contributions` | Sổ góp vốn vào mục tiêu | `goal_id` (FK → `financial_goals.id`), `amount`, `contribution_date`, `notes`, `created_at`. **KHÔNG có `deleted_at`** | INSERT: RPC `contribute_to_goal`, fallback `:160-165` · DELETE **cứng**: RPC `undo_contribution_atomic`, fallback `:225` | `types/database.types.ts:2770-2804` |
| `budgets` | Ngân sách theo danh mục/tháng | `category_name` (**text tự do**, không FK sang `transaction_categories`), `budget_amount`, `period_month`, `period_year`, `notes`, `deleted_at` | UPSERT `upsertBudget` onConflict `category_name,period_month,period_year` (`app/actions/goal-budget-actions.ts:280-291`) · xoá mềm `deleteBudget` (`:316-320`) | `types/database.types.ts:415-450` (**`Relationships: []`**); `deleted_at` thêm ở `20260428090000:15-17`; index `:35-37` |

Ba bảng này đã được `01-tien.md §1` xếp vào nhóm "kế hoạch / tài sản — **không nằm trên đường tiền vào–ra**". Bản đồ này xác nhận: **không hàm sổ kỳ nào (`finance_period_ledger`, `finance_month_summary`, `finance_pnl_by_month`, `finance_reports_snapshot`) đọc 3 bảng này** — grep `financial_goals|goal_contributions|budgets` trong `supabase/migrations/` chỉ ra 2 file: `20260428090000` (ALTER + index) và `20260610140000` (trigger realtime).

### 1.3 — Miền **Năng suất ekip** (0 bảng riêng)

Module **không sở hữu bảng nào**. Nó chỉ đọc, qua RPC:

| Bảng đọc | Dùng để làm gì | Bằng chứng |
|---|---|---|
| `work_tasks` | **Toàn bộ số liệu năng suất**: `assigned_to`, `status`, `deadline`, `start_date`, `start_time`, `end_time`, `work_type`, `cost`, `contract_id`, `event_id` | `20260428170000_productivity_rpc_hardening.sql:41-49` |
| `contracts` | **INNER JOIN** — task không gắn hợp đồng thì vô hình | `:50-52` (`JOIN public.contracts c ON c.id = wt.contract_id AND c.deleted_at IS NULL`) |
| `contract_events` | LEFT JOIN lấy `event_date` làm ngày rơi kỳ (ưu tiên thứ 3) | `:53`, `:58-59` |
| `employees` | Khung nhân sự (LEFT JOIN → người 0 task vẫn hiện), lọc `status NOT IN ('inactive','nghi_viec')` | `:78-81` |
| `customers` | Chỉ ở drawer chi tiết, lấy `full_name` | `:123` |
| `studio_info` | Timezone (cache `unstable_cache` 3600s, tag `studio_info`) | `lib/productivity-auth.ts:34-55` |

**KHÔNG đọc `evaluations`, KHÔNG đọc `attendance`, KHÔNG đọc `employee_salaries`, KHÔNG đọc `monthly_salaries`.**
`attendance` (`types/database.types.ts:258`) và `evaluations` (`:1768`) **tồn tại trên DB nhưng có 0 lần đọc/ghi trong toàn bộ `app/`, `lib/`, `components/`** (grep rỗng). `vault/40-module/nhan-su.md:61` xác nhận: "`attendance`, `work_shifts`, `evaluations`, `requests` hiện **rỗng** — đã dựng, chưa dùng".

---

## 2. RPC & hàm DB

| Hàm | Đọc/ghi | Atomic | Gọi từ đâu | Trạng thái + định nghĩa mới nhất trong repo |
|---|---|---|---|---|
| `save_service_atomic(p_actor_id, p_service jsonb, p_bundle_items jsonb, p_expected_updated_at timestamptz)` → jsonb | GHI `services` + DELETE/INSERT `service_bundles` | ✅ plpgsql, SECURITY DEFINER, `SET search_path = public`, `SELECT … FOR UPDATE` trên dòng cần sửa (`:119-124`) | `createService` (`service-mutations.ts:91`), `updateService` (`:137`), `quickCreateService` (`category-actions.ts:266`) | **Sống** · `20260428183000_services_security_atomic_writes.sql:55-345` |
| `delete_service_atomic(p_actor_id, p_service_id)` → jsonb | Xoá mềm `services`, xoá cứng `service_bundles` của parent | ✅ `FOR UPDATE` (`:364-369`) | `deleteService` (`service-mutations.ts:167`) | **Sống** · `20260428183000:347-410` |
| `get_employee_productivity(p_start_date date, p_end_date date)` → TABLE(9 cột) | Đọc `work_tasks`+`contracts`+`contract_events`+`employees` | đọc (`LANGUAGE sql STABLE SECURITY DEFINER`) | `fetchTeamOverview` qua **admin client** (`app/actions/productivity-actions.ts:46,52`) | **Sống** · `20260428170000_productivity_rpc_hardening.sql:10-84` |
| `get_employee_job_details(p_employee_id uuid, p_start_date, p_end_date)` → TABLE(9 cột) | như trên + `customers` | đọc | `fetchJobDetailsInternal` nhánh team, **admin client** (`productivity-actions.ts:137-142`) | **Sống** · `20260428170000:86-144` |
| `get_my_employee_productivity(p_start_date, p_end_date)` | Wrapper: giải `auth.uid()` → `employees.id`, gọi hàm team, **ép `total_cost = NULL`** | đọc, plpgsql SECURITY DEFINER | `fetchSelfOverview` qua **user client** (`productivity-actions.ts:93-97`) | **Sống** · `20260428170000:146-193` (auth.uid `:171`, NULL `:189`) |
| `get_my_employee_job_details(p_start_date, p_end_date)` | Wrapper tương tự, **ép `cost = NULL`** | đọc | `fetchJobDetailsInternal` nhánh self, **user client** (`productivity-actions.ts:124-128`) | **Sống** · `20260428170000:195-241` (NULL `:238`) |
| `contribute_to_goal(p_goal_id, p_amount, p_notes)` → void | GHI `goal_contributions` + `financial_goals.current_amount` (suy từ fallback TS) | ? | `addContribution` (`goal-budget-actions.ts:147`) | **Có trên DB** (`types/database.types.ts:5726-5729`) nhưng **KHÔNG có `CREATE` nào trong `supabase/migrations/`** → §8 #1 |
| `undo_contribution_atomic(p_contribution_id)` → jsonb | Xoá `goal_contributions`, giảm `current_amount`, revert `status`; ràng buộc 24h | ? | `undoContribution` (`goal-budget-actions.ts:202`) | **Có trên DB** (`types/database.types.ts:6732-6735`) nhưng **KHÔNG có `CREATE`** → §8 #1 |
| `get_finance_intelligence()` → json | Đọc `payments`, `receipts`, `expenses`, `debts`, `fixed_costs`, `monthly_salaries` — trả `breakeven` cho `BreakEvenCard` | đọc, plpgsql SECURITY DEFINER | `getFinanceIntelligence` (`app/actions/finance-intelligence-queries.ts:54`) | **Sống** · `20260827130000_luong_cung_m5.sql:275-500` (đã có ở `01-tien §2`, đây là bản đọc chi tiết công thức hoà vốn) |
| `finance_service_distribution(p_month, p_year)` → TABLE(name, value, revenue) | Đọc `contracts` + `contract_items` + **`services` sống** | đọc | `getServiceDistribution` (`finance-dashboard-queries.ts:558`), nhánh trong `getReportsSnapshot` (`:377`) | **Sống** · `20260412100000_finance_dashboard_ledger_rpcs.sql:105-131` (01-tien §8.11 ghi "chưa đọc" — nay đã đọc) |
| `emit_realtime_signal()` trigger | INSERT `realtime_signals` | — | Trigger `AFTER INSERT/UPDATE/DELETE … FOR EACH STATEMENT` trên `services`, `service_categories` (`20260610130000_realtime_signals.sql:62-79`, tên bảng `:67-68`) và trên `financial_goals`, `budgets` (`20260610140000_realtime_signals_finance_tables.sql:21-38`, `:25-26`) | **Sống**. **`goal_contributions` và `service_bundles` KHÔNG có trigger** |

### 2.1 — Quyền của các RPC (bằng chứng migration, không phải comment)

```
20260428183000:412-416   save_service_atomic     REVOKE PUBLIC/anon/authenticated · GRANT service_role
                         delete_service_atomic   REVOKE PUBLIC/anon/authenticated · GRANT service_role

20260428170000:243-251   get_employee_productivity      REVOKE all · GRANT service_role
                         get_employee_job_details       REVOKE all · GRANT service_role
                         get_my_employee_productivity   REVOKE all · GRANT authenticated + service_role
                         get_my_employee_job_details    REVOKE all · GRANT authenticated + service_role
```

Cặp `get_X` (team, chỉ service_role) / `get_my_X` (self, `authenticated` gọi trực tiếp được) khớp đúng với 2 loại client ở tầng action — xem §4(c).

### 2.2 — Grant/REVOKE bảng `services` — **câu hỏi của đề bài, trả lời dứt điểm**

Đây **KHÔNG phải chỉ comment**. Đó là một khối `DO $$ … $$` chạy thật:

```sql
-- supabase/migrations/20260428183000_services_security_atomic_writes.sql:3-21
FOREACH v_table IN ARRAY ARRAY[
  'services', 'service_categories', 'service_bundles',
  'service_relations', 'price_rules', 'studio_info'
] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);      -- :16
  EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', v_table);       -- :17
  EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', v_table);  -- :18
  EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', v_table);         -- :19
END LOOP;
```

Hệ quả:
- **[CODE]** Trình duyệt **không đọc trực tiếp** được `services` — mọi truy cập phải qua server action (admin client). Đúng như `20260610150000_revoke_anon_table_privileges.sql:12` ghi: *"dresses/services/studio_info đã REVOKE grant trước đó → anon nhận …"*.
- **[SCHEMA]** vault ghi `services` "RLS ✅ · **4 policy**" (`luoc-do-dich-vu.md:16`). Bốn policy đó tồn tại nhưng **không role nào chạm được bảng để policy có tác dụng** (đã REVOKE hết grant); `service_role` thì bypass RLS. ⇒ Policy là di sản chết, giống ca `crm_leads`/`customers` ở `SYSTEM_MAP §5.1`.
- Không migration nào sau `20260428183000` cấp lại grant cho `authenticated` — grep `service` trên `20260610120000`, `20260610130000`, `20260610150000`, `20260502105000` chỉ ra comment và index.
- ⚠️ **Không có `use-prefetch-on-hover` nào query `services` từ browser** (khác với ca `dresses` = R6 trong `SYSTEM_MAP §6`). Đã grep `from("services")`: 8 call-site, **tất cả** đều trong `app/actions/` hoặc `lib/moodie/` (server).

---

## 3. Server action & route

### 3.1 — Dịch vụ

| Route | File | Guard |
|---|---|---|
| `/services` | `app/(protected)/services/page.tsx` (`force-dynamic`) | `layout.tsx:14` — `canAccess(shellRole, "services")` → `AccessDenied` |
| `/services/create` | `app/(protected)/services/create/page.tsx` | như trên (layout bọc cả cây) |
| `/services/[id]` | `app/(protected)/services/[id]/page.tsx` | như trên |
| `/services/[id]/quote` | `app/(protected)/services/[id]/quote/page.tsx` | như trên |

**Đây là 1 trong số ít module có guard TẦNG ROUTE thật** (`services/layout.tsx`), khác với `/crm/*`, `/settings`, `/admin/*` (SYSTEM_MAP §5.4).

| Server action (file:dòng) | Wrapper | Màn dùng | RPC / bảng |
|---|---|---|---|
| `getServices(filters)` `app/actions/service-queries.ts:20` | `withServicesAccess` | `/services` SSR + SWR | SELECT `services` + join `service_categories` (`:39-44`), phân trang `range`, mặc định `limit 50` (`:18`) |
| `getServiceById(id)` `:70` | `withServicesAccess` | `/services/[id]`, `/services/[id]/quote` | SELECT `services` |
| `getServiceCategories()` `:87` | `withServicesAccess` | 3 trang | SELECT `service_categories` |
| `getBundleItems(parentId)` `:102` | `withServicesAccess` | `/services/[id]` | SELECT `service_bundles` + join child |
| `searchServicesForBundle(q, excludeId)` `:118` | `withServicesAccess` | ô tìm trong form combo | SELECT `services` (`status='active'`, `fulfillment_type='single'`, `:128-129`) |
| `createService(raw, bundleItems)` `app/actions/service-mutations.ts:71` | `withServicesAccess` | `/services/create` | `save_service_atomic` (`:91`); audit `:101-108`; `revalidatePath('/services')` + `/services/[id]` (`:110-111`) |
| `updateService(raw, bundleItems)` `:117` | `withServicesAccess` | `/services/[id]` | `save_service_atomic` với `p_expected_updated_at` (`:140`) ⇒ **optimistic concurrency** |
| `deleteService(id)` `:164` | `withServicesAccess` | `/services/[id]` | `delete_service_atomic` (`:167`); audit `severity: WARNING` (`:180`) |
| `upsertCategory({id,name,icon})` `app/actions/category-actions.ts:59` | `withServicesAccess` | `category-manager-modal.tsx` | INSERT/UPDATE **thẳng** `service_categories` (`:75-91`), sinh `slug` bằng `toSlug` (`:30-38`) |
| `deleteCategory(id)` `:103` | `withServicesAccess` | như trên | **DELETE cứng** (`:116`) sau khi đếm dịch vụ đang dùng (`:106-114`) |
| `getAvailableServices(search)` `:131` | `withAuth` + **`requireContractAccess`** (`:133`) | picker hợp đồng | SELECT `services` |
| `getAvailableCatalogItems(itemType, search)` `:163` | `withAuth` + **`requireContractAccess`** (`:165`) | `ServiceItemForm` (modal thêm hạng mục HĐ) | nhánh `trang_phuc` → `dresses` (`:170-198`); còn lại → `services` lọc theo `unit` (`:209-212`) |
| `quickCreateService({...})` `:238` | `withAuth` + **`requireContractAccess`** (`:246`) | nút "Tạo dịch vụ mới" trong modal HĐ | `save_service_atomic` (`:266`) |
| `getServiceRelations(serviceId)` `app/actions/builder-actions.ts:15` | `withServicesAccess`, bọc `react.cache` | **0 call-site** | SELECT `service_relations` |
| `getPriceRules(includeInactive)` `:36` | `withServicesAccess`, `react.cache` | `BuilderMode.tsx:45`, `BundleCanvas.tsx:29`, `RuleManager.tsx:26,47,59` | SELECT `price_rules` |
| `upsertRelation(relation)` `:54` | `withServicesAccess` | **0 call-site** | INSERT/UPDATE `service_relations` (`:70-72`) |
| `upsertPriceRule(rule)` `:87` | `withServicesAccess` | `RuleManager.tsx:43,57` | INSERT/UPDATE `price_rules` (`:105-107`) |
| Moodie `service_catalog` `lib/moodie/tools.ts:1327` | `canAccess(role,"services")` (`:1328`) | chat Moodie | SELECT `services` `:1334-1339` |
| Moodie core-engine `lib/moodie/core-engine.ts:694` | `canAccess(role,"services")` | fallback engine | SELECT `services` `:699-705` |

**⚠️ 3 action nằm dưới quyền `contracts`, không phải `services`:** `getAvailableServices`, `getAvailableCatalogItems`, `quickCreateService`. Vai `sale` (có `contracts`, **không** có `services` — `types/roles.ts:44`) do đó **đọc được toàn bộ bảng giá và tạo được dịch vụ mới**, dù `/services` chặn họ ở `layout.tsx:14`. Đây là chủ ý nghiệp vụ (sale phải chọn dịch vụ khi lập HĐ) nhưng phần **tạo mới** thì đáng soát lại — xem §6 bất biến #S5.

### 3.2 — Mục tiêu

| Route | File | Guard |
|---|---|---|
| `/finance/goals` | `app/(protected)/finance/goals/page.tsx` (`force-dynamic`) | **chỉ** `app/(protected)/finance/layout.tsx:19` — `canAccess(shellRole, "finance")`. **Không guard nào dùng `"goals"`** (§7 #7) |
| `/finance/budget` | `app/(protected)/finance/budget/page.tsx` | như trên |
| `/finance` · `/finance/dashboard` | card Hoà vốn | như trên |

| Server action (file:dòng) | Wrapper | Màn dùng | RPC / bảng |
|---|---|---|---|
| `fetchGoals({page,pageSize,includeContributions})` `app/actions/finance-operations-queries.ts:759` | `withFinanceRead` | `/finance/goals` SSR (`page.tsx:15`) + SWR (`goals-client.tsx`) | SELECT `financial_goals` (+ `goal_contributions` nếu bật `:768`); tính `progress_percent`, `remaining`, `months_left`, `monthly_needed` **trong TS** (`:783-819`) |
| **`fetchGoalsCashflow({month,year})`** `:836` | `withFinanceRead` | `/finance/goals` (`page.tsx:15`), Moodie (`tools.ts:1412`) | **5 query song song, tự cộng tiền trong TS** — xem §4(e) và §5.1 |
| `fetchGoalContributions(goalId,…)` `:924` | `withFinanceRead` | drawer lịch sử góp | SELECT `goal_contributions` |
| `createGoal(input)` `app/actions/goal-budget-actions.ts:19` | **`withAdmin`** | modal tạo mục tiêu | INSERT `financial_goals` (`:26`) |
| `updateGoal(id, input, expectedUpdatedAt)` `:43` | `withAdmin` | modal sửa | UPDATE `financial_goals` (`:83`); optimistic concurrency `:62-64`; **tự đổi `status`** khi `current >= target` (`:71-80`) |
| `deleteGoal(id)` `:95` | `withAdmin` | menu | xoá mềm (`:107-110`) |
| `addContribution(goalId, amount, notes)` `:120` | `withAdmin` | `goal-contribution-modal.tsx` | **`checkPeriodLock(today)`** (`:126`) → chặn `completed`/`cancelled` (`:139-145`) → RPC `contribute_to_goal` (`:147`), fallback TS `:148-186` |
| `undoContribution(contributionId)` `:197` | `withAdmin` | drawer chi tiết | RPC `undo_contribution_atomic` (`:202`), fallback TS 24h `:206-251`. **KHÔNG có `checkPeriodLock`** — bất đối xứng với `addContribution` (§6 #G4) |
| `upsertBudget(input)` `:271` | `withAdmin` | `/finance/budget` | `checkPeriodLock(firstDayOfMonth)` (`:278`) → UPSERT `budgets` (`:280-291`) |
| `deleteBudget(id)` `:301` | `withAdmin` | `/finance/budget` | `checkPeriodLock` (`:313`) → xoá mềm (`:316-320`) |
| **`getBudgetsWithActuals(month, year)`** `:329` | `withFinanceRead` | `/finance/budget` SSR (`page.tsx:16`) | **tự cộng `expenses` theo danh mục trong TS** (`:343-353`, `:360-364`) — xem §5.1 |
| `getFinanceIntelligence()` `app/actions/finance-intelligence-queries.ts:45` | `withAuth` + `requireFinanceAccess` (`:48`) | `BreakEvenCard` (`finance-intelligence-section.tsx:72`, `app/(protected)/finance/dashboard/page.tsx:88`) | probe 9 bảng (`:18-43`) rồi RPC `get_finance_intelligence` (`:54`) |
| Moodie `get_financial_goals` `lib/moodie/tools.ts:1375` | `canAccess(role,"finance")` (`:1398`) | chat Moodie | gọi `fetchGoals` (`:1406`) + `fetchGoalsCashflow` (`:1412`), trả `available_for_goals` (`:1426`) |

`withAdmin` (`lib/auth_utils.ts:460-489`) = xác thực → `canCurrentUserManageSettings` (`:471`) → **admin client**. Đọc mục tiêu chỉ cần `finance`; ghi cần quyền quản trị.

### 3.3 — Năng suất

| Route | File | Guard |
|---|---|---|
| `/productivity` | `app/(protected)/productivity/page.tsx` (`force-dynamic`) | **guard riêng ở page** `:27-33` — `PRODUCTIVITY_ALLOWED_ROLES.includes(shellRole)` → `redirect("/dashboard")`. **Không dùng `canAccess(role,"productivity")`** (§7 #6) |

Trang **không fetch gì ở server** — chỉ tính `period` rồi render shell; SWR fetch phía client (`page.tsx:40-46`).

| Server action (file:dòng) | Client dùng | RPC |
|---|---|---|
| `fetchProductivityData(period)` `app/actions/productivity-actions.ts:157` | `useProductivityOverview` (`lib/hooks/use-productivity.ts:30-54`) | rẽ nhánh theo `viewer.viewMode` (`:168-171`): team → `fetchTeamOverview` (`:42`), self → `fetchSelfOverview` (`:75`) |
| `fetchEmployeeJobDetails(employeeId, start, end)` `:199` | `useProductivityDetail` (`use-productivity.ts:56-92`) | `fetchJobDetailsInternal` (`:115`); nhánh self **ép lại `employeeId` = của chính mình** (`:218-226`) |

---

## 4. Luồng nghiệp vụ

### (a) Giá dịch vụ chảy vào hợp đồng — **COPY, không phải tham chiếu sống**

```
  /services  ── save_service_atomic ──►  services.selling_price = 10.000.000
                                              │
                                              │ (1) chọn hạng mục khi lập HĐ
                                              ▼
        getAvailableCatalogItems()  ── SELECT id,name,selling_price,cost_price,unit ──┐
        category-actions.ts:201-234                                                    │
                                              │                                        │
                                              ▼                                        │
        catalog-cache.ts  (Map trong RAM trình duyệt, TTL 5 phút — :26)  ◄─────────────┘
                                              │
                                              ▼
        ServiceItemForm.handleBatchAdd()   ServiceItemForm.tsx:184-203
            service_id     = svc.id            ← chỉ để TRUY VẾT   (:187)
            unit_price     = svc.selling_price ← ẢNH CHỤP          (:191)
            original_price = svc.selling_price ← ẢNH CHỤP          (:192)
            total_amount   = svc.selling_price                     (:194)
                                              │
                                              ▼ save_contract_atomic(p_items jsonb)
        INSERT INTO contract_items (…, unit_price, original_price, …)
        SELECT …, COALESCE(item_row.unit_price, 0), item_row.original_price, …
        20260714213000_fix_contract_schedule_customer_mirror.sql:181-211
                                              │
                                              ▼
                        contract_items.unit_price = 10.000.000   ← ĐÓNG BĂNG
```

**Sửa `services.selling_price` KHÔNG ảnh hưởng hợp đồng cũ.** Bằng chứng ba tầng:
1. `contract_items` có cột `unit_price`/`original_price`/`total_amount` riêng; RPC ghi từ payload client, **không** join `services` (`20260714213000:181-211`).
2. `contract_financials` — nguồn chân lý lãi/lỗ HĐ — lấy doanh thu từ `contracts.total_amount`, không đụng `services` (`01-tien §5`, `20260825200000:367-384`).
3. `getContractById` chỉ select cột của `contract_items`, không join `services` (`app/actions/contract-queries.ts:666`).

**MỘT NGOẠI LỆ — báo cáo phân bổ dịch vụ đọc `services` SỐNG:**

```sql
-- 20260412100000_finance_dashboard_ledger_rpcs.sql:105-131  finance_service_distribution
SELECT COALESCE(s.service_type, c.service_type::TEXT, 'Khác') AS name,   -- :119
       COUNT(DISTINCT c.id), SUM(COALESCE(ci.total_amount, c.total_amount, 0))
FROM contracts c
LEFT JOIN contract_items ci ON ci.contract_id = c.id AND ci.deleted_at IS NULL
LEFT JOIN services       s  ON s.id = ci.service_id AND s.deleted_at IS NULL   -- :123-124
WHERE c.contract_date >= v_start AND c.contract_date < v_end
GROUP BY 1
```

⇒ **Đổi `services.service_type` (hoặc xoá mềm một dịch vụ) làm biểu đồ "Phân bổ dịch vụ" của các tháng ĐÃ QUA đổi số ngay lập tức.** Hiển thị ở `/finance` (`finance-dashboard-client.tsx:186`), `/reports` (`reports-overview-view.tsx:14`), xuất Excel (`reports-export.ts:114`) và Moodie (`tools.ts:557-558`).
Số **tiền** không đổi (vẫn `ci.total_amount`), chỉ **nhãn nhóm** đổi — nhưng biểu đồ so sánh tháng sẽ lệch. Đây là hệ quả trực tiếp của `normalize-services.mjs` (§4b).

### (b) `normalize-services.mjs` — script backfill một lần, **còn một lỗ**

```
node scripts/normalize-services.mjs
   │
   ├─ createClient(URL, SUPABASE_SERVICE_ROLE_KEY)          :15   ← service role, bypass RLS
   ├─ SELECT id,name,service_type FROM services              :37   (KHÔNG lọc deleted_at)
   ├─ với mỗi dòng: service_type ∉ validTypes ?              :46
   │     validTypes = [studio, ngay_cuoi, combo, baby, gia_dinh,
   │                   sinh_nhat, bau, concept, couple, ky_yeu, media, khac]
   │                   ⚠️ THIẾU 'outsource'
   │     → determineNewType(name): đoán bằng từ khoá tiếng Việt trong TÊN  :17-33
   │       (không có nhánh nào trả 'outsource')
   └─ UPDATE services SET service_type = <đoán> WHERE id = …  :70-74
        ⛔ KHÔNG qua save_service_atomic
        ⛔ KHÔNG ghi audit_logs
        ⛔ KHÔNG cập nhật updated_by / updated_at
```

**Dùng để làm gì:** đưa `services.service_type` (kiểu **text tự do**, không enum, không CHECK) về đúng tập 13 giá trị mà `types/service-constants.ts:1-15` định nghĩa, sau một đợt nhập liệu tự do. Script `scripts/inspect-service-types.mjs` là bản **chỉ đọc** dùng để đếm trước khi chạy.

**Lỗ:** `types/service-constants.ts:13` có `"outsource"`, `SERVICE_TYPE_LABELS` có `outsource: "Outsource (Gia công)"` (`:31`), `service_type_enum` trên DB cũng có (`types/database.types.ts:7024`) — nhưng `normalize-services.mjs:46` **không** liệt kê nó. ⇒ Chạy lại script hôm nay, **mọi dịch vụ `outsource` sẽ bị đoán lại theo tên và gần như chắc chắn thành `khac`** (`determineNewType` không có nhánh nào trả `outsource`, `:17-33`). Kèm theo là số liệu `finance_service_distribution` của các tháng cũ đổi theo (§4a).

### (c) Báo giá (`quote`) — **sinh ra 0 dòng dữ liệu**

```
  3 tầng, cùng một hàm parse, KHÔNG tầng nào ghi DB

  ① QuoteModal        components/services/quote/quote-modal.tsx:43
     mở từ /services (nút "Báo giá" ở service-table.tsx:128, service-grid.tsx:55,
     service-mobile-list.tsx:119) → services-list-client.tsx:315-317
        │
  ② QuoteView         components/services/quote/quote-view.tsx:33
     trang riêng /services/[id]/quote (SSR: getServiceById + getStudioInfo)
        │
  ③ QuotePreview      components/services/quote/quote-preview.tsx:26
     xem trước ngay trong form (SaveActionPanels.tsx:33, :107)
        │
        └── cả ba đều:
              parseContentStructure(service.description)   lib/utils/service-utils.ts:37-82
                 ├─ thử JSON.parse → [{title, items[]}]   (định dạng Builder)
                 └─ fallback: đoán heading từ text thô     (:56-81)
              + studio_info (SWR, tín hiệu realtime studio_info)
              + formatCurrency(service.selling_price)

  Xuất ra:  window.print()   quote-view.tsx:99, :206, :387 · quote-modal.tsx
            → PDF do TRÌNH DUYỆT tạo, có CSS @media print (quote-view.tsx:72-81)

  ⛔ KHÔNG bảng `quotes`     ⛔ KHÔNG mã báo giá     ⛔ KHÔNG hạn hiệu lực
  ⛔ KHÔNG lịch sử giá       ⛔ KHÔNG audit log      ⛔ KHÔNG liên kết CRM lead
```

**Kết luận:** "báo giá" ở đây = **render + in**, không phải chứng từ. Không có cách nào biết đã báo giá bao nhiêu cho ai, hay giá tại thời điểm báo giá là bao nhiêu. Nếu sau này cần đối chiếu "giá đã báo ≠ giá ký", **hiện không có dữ liệu để đối chiếu**.

### (d) Visual Builder — tính giá combo **chỉ để nhìn**

```
  ServiceBundleSection.tsx:118-124
     <BuilderMode initialItems={bundleItems} onChange={setBundleItems} />
        ⚠️ KHÔNG truyền parentService, preFetchedRelations, preFetchedCategories
           → BuilderMode.tsx:31-32 nhận [] và undefined
        ⚠️ getServiceRelations() có 0 call-site ⇒ SmartSuggestions luôn rỗng
                │
                ├── getPriceRules()                    BuilderMode.tsx:45
                │      SELECT price_rules WHERE is_active
                │
                └── calculateBundlePrice(items, rules) lib/logic/bundle-calculator.ts:31-100
                       originalTotal = Σ (selling_price × quantity)      :36-45
                       rule 'min_quantity' → 'discount_percent'          :69-89
                       → { originalTotal, discountAmount, finalTotal }
                                    │
                                    ▼  CHỈ hiển thị
                       QuoteModernView (BuilderMode.tsx:252-256)
                       BundleCanvas    (BundleCanvas.tsx:34)

  ⛔ finalTotal KHÔNG BAO GIỜ được ghi vào formData.selling_price
  ⛔ save_service_atomic không tính giá — chỉ lưu danh sách con (:322-335)
  ⛔ toBundleInputs ép adjustment_price = 0  (useServiceForm.ts:94)
     ⇒ cột service_bundles.adjustment_price không có đường nào ghi ≠ 0 từ UI
```

⇒ `services.selling_price` của một gói combo là **con số người dùng gõ tay**, không liên quan gì tới tổng các dịch vụ con. `price_rules` là công cụ tính nhẩm, không phải quy tắc định giá.

### (e) Mục tiêu — số "khả dụng để góp" và **phép trừ ba lần**

```
  /finance/goals  ─ page.tsx:15 ─► fetchGoals()  +  fetchGoalsCashflow()
                                                          │
  fetchGoalsCashflow  app/actions/finance-operations-queries.ts:836-920
  ┌───────────────────────────────────────────────────────────────────────┐
  │ 5 query SONG SONG (:848-878), KHÔNG gọi finance_period_ledger         │
  │                                                                       │
  │  payments.amount        (payment_date trong tháng)          :849-854   │
  │  receipts.receipt_amount (contract_id IS NULL)              :855-861   │──► monthlyIncome  :899-901
  │                                                                       │
  │  expenses.amount        (expense_date trong tháng)          :862-867   │──► monthlyExpense :903
  │      ⚠️ TOÀN BỘ phiếu chi, KHÔNG loại trừ gì                          │
  │                                                                       │
  │  monthly_salaries.total_salary (tháng/năm)                  :868-873   │──► salaryComponent    :890
  │  fixed_costs.monthly_amount   (lọc start/end trong TS)      :874-877   │──► fixedCostComponent :891-897
  └───────────────────────────────────────────────────────────────────────┘
                                    │
   netCashflow = monthlyIncome − monthlyExpense − salaryComponent − fixedCostComponent   :905
   availableForGoals = max(0, netCashflow)                                               :906
```

**Đây là chỗ TỰ CỘNG TIỀN thứ ba trong repo — và là chỗ trừ hai lần.**

| Khoản | Đã nằm trong `monthlyExpense` chưa? | Bằng chứng |
|---|---|---|
| Lương | **RỒI.** `record_payee_payment_atomic('employee')` INSERT `expenses` (`20260827130000:200-202`), gọi từ `payEmployeeSalaryAction` (`app/actions/salary-actions.ts:182`) | ⇒ `− salaryComponent` (`:905`) **trừ lần thứ hai** |
| Chi phí cố định | **RỒI.** `generateMonthlyFixedCosts` INSERT `expenses` mô tả `[Auto-Fixed]` (`app/actions/expense-actions.ts:259`) | ⇒ `− fixedCostComponent` (`:905`) **trừ lần thứ hai** |

So sánh với hai chỗ tự cộng đã biết (`SYSTEM_MAP §5.2`):
- `buildCloseSnapshot` (`finance-close-actions.ts:83-86`) **có loại trừ** `[Auto-Fixed]` khỏi `expenses` trước khi cộng `fixed_costs` ⇒ sai luật nhưng **không** trùng.
- `finance_cashflow_timeline` khớp số vì dùng đúng bộ lọc.
- **`fetchGoalsCashflow` không loại trừ gì** ⇒ đây là chỗ **duy nhất trong repo trừ trùng một khoản tiền hai lần**.

Số sai này lan đi 6 nơi (tất cả đọc `availableForGoals`):

```
availableForGoals
   ├─ GoalsOverview        "Dư mỗi tháng"    goals-overview.tsx:46,158,236
   │     (còn hiển thị TÁCH RIÊNG 3 khoản trừ: :128 thu, :134 chi, :141 lương, :149 cố định
   │      → người xem NHÌN THẤY lương và chi phí cố định bị trừ, không thấy chúng đã nằm trong "chi")
   ├─ gap = available − Σ monthly_needed     goals-overview.tsx:47
   ├─ recommendedGoalCount                   goals-overview.tsx:51-62
   ├─ GoalsComparison  cột "Gap"             goals-comparison.tsx:42, :86
   ├─ GoalDetailDrawer "Dư: …/th"            goal-detail-drawer.tsx:139, :211-214, :273
   ├─ GoalContributionModal gợi ý số tiền    goal-contribution-modal.tsx:39, :130
   └─ Moodie  get_financial_goals            lib/moodie/tools.ts:1412, :1426
        → AI trả lời khách/nhân viên bằng con số này
```

Thêm: `GoalFormModal` gợi ý `target_amount = burnRate × 6` với `burnRate = monthlyExpense + salaryComponent + fixedCostComponent` (`goal-form-modal.tsx:111-116`) — cùng lỗi trùng, khuếch đại ×6.

**`current_amount` thì đúng:**
```
  addContribution  goal-budget-actions.ts:120
     checkPeriodLock(hôm nay)          :126   ← kỳ đã chốt sổ thì chặn
     chặn status completed/cancelled   :139-145
     RPC contribute_to_goal            :147   ← đường chính (atomic)
        └── nếu RPC thiếu (PGRST202) → fallback TS 3 bước KHÔNG atomic  :148-186
              INSERT goal_contributions  → UPDATE current_amount → set status
              ⚠️ đứt giữa chừng = sổ góp có dòng, current_amount chưa cộng

  undoContribution  :197
     RPC undo_contribution_atomic      :202   ← kiểm 24h ở DB
        └── fallback TS: kiểm 24h (:214-215) → DELETE CỨNG (:225) → trừ current_amount (:235-239)
     ⚠️ KHÔNG có checkPeriodLock  ⇒ hoàn tác được cả trong kỳ đã khoá
```

Góp vốn **không sinh phiếu chi**, không đụng `expenses`/`payments`. `financial_goals` là **sổ ghi chú kế hoạch**, tiền thật không đi qua đây — nhất quán với `01-tien §1` xếp nó ngoài đường tiền.

### (f) Điểm hoà vốn (`BreakEvenCard`) — công thức thật

`components/finance/dashboard/break-even-card.tsx` là **thuần trình bày** (`:12` đọc `data.breakeven`, `:28` `{percent}%`, `:42` `target`, `:47` `remainingAmount`). Toàn bộ công thức nằm trong RPC:

```sql
-- supabase/migrations/20260827130000_luong_cung_m5.sql — get_finance_intelligence()  (:275)

-- ① DOANH THU dùng để so = TIỀN MẶT THU ĐƯỢC, không phải doanh thu sổ kỳ
v_current_rev := Σ payments.amount   (payment_date trong tháng)
               + Σ receipts.receipt_amount (contract_id IS NULL, receipt_date trong tháng)   -- :318-322

-- ② CHI PHÍ CỐ ĐỊNH = bảng danh mục fixed_costs, KHÔNG phải phiếu chi [Auto-Fixed]
SELECT COALESCE(SUM(monthly_amount),0) INTO v_fixed_cost                                     -- :368
FROM fixed_costs                                                                             -- :369
WHERE deleted_at IS NULL
  AND (start_date IS NULL OR start_date <= v_last_day)
  AND (end_date   IS NULL OR end_date   >= v_first_day);

-- ③ LƯƠNG = sheet lương tháng
SELECT COALESCE(SUM(total_salary),0) INTO v_salary_component                                 -- :375
FROM monthly_salaries WHERE month = … AND year = …;                                          -- :376

v_burn_rate := v_fixed_cost + v_salary_component;                                            -- :380
  -- nếu = 0 → fallback: trung bình 3 tháng expenses (:382-387)

v_target     := GREATEST(v_burn_rate, v_current_exp);                                        -- :408
v_be_percent := ROUND((v_current_rev / v_target) * 100);                                     -- :410

RETURN … 'breakeven', json_build_object(
   'target', v_target, 'current', v_current_rev,
   'percent', v_be_percent,
   'remainingAmount', GREATEST(0, v_target - v_current_rev))                                 -- :487-492
```

Bốn điểm cần biết khi đọc card này:

| # | Sự thật | Hệ quả |
|---|---|---|
| **BE1** | "Mục tiêu (tháng)" = `max(chi phí cố định + sheet lương, tổng phiếu chi tháng)` — **không** phải điểm hoà vốn kế toán (không có biến phí, không có biên đóng góp) | Nhãn "Tiến độ Hòa vốn" đang mô tả **"đã thu đủ bù chi chưa"**, một khái niệm khác |
| **BE2** | Chi phí cố định lấy từ **`fixed_costs.monthly_amount`** (`:368-369`) — chính "đường đi vòng" mà ADR-016 M2 §3 đã cấm ("`fixed_costs` không phải tiền", `agent/DECISIONS.md:133`). `finance_period_ledger` thì đếm phiếu chi `[Auto-Fixed]` (`20260827130000:35-36`) | ⇒ **Đây là chỗ tự cộng thứ TƯ** dùng `fixed_costs`, sau `buildCloseSnapshot:91-97`, `calculateFallbackSnapshot`, `fetchGoalsCashflow:891-897` |
| **BE3** | `v_current_rev` là **KÉT** (`payments` + `receipts` theo ngày phiếu), còn `finance_month_summary.revenue` là **doanh thu theo `contracts.work_date`** (`01-tien §5`) | Card hoà vốn và card doanh thu trên **cùng một trang `/finance`** hiển thị hai con số khác nhau cho "tháng này" — đúng thiết kế, nhưng không có nhãn phân biệt |
| **BE4** | `v_receivables`/`v_payables` đọc bảng **`debts`** (`:354-355`, `:361-362`) — bảng mà `01-tien §1` ghi là **0 dòng**, còn nguồn thật là `finance_debt_stats()` / `finance_payable_summary()` | ⇒ Điểm `receivables` trong `health_score` gần như luôn rơi vào nhánh `v_payables = 0 AND v_receivables = 0` → *"Lanh manh"* 15 điểm (`:439-441`), **bất kể công nợ thật**. Không ảnh hưởng `breakeven` nhưng ảnh hưởng `health_score` cùng card |

### (g) Năng suất ekip — đo bằng gì và ai thấy gì

```
                       /productivity  (page.tsx — KHÔNG fetch server, :40-46)
                              │
                              ▼  useProductivityOverview → fetchProductivityData(period)
                    resolveProductivityViewerContext()   lib/productivity-auth.ts:57
                        role ∉ [admin, manager, media] → "Bạn không có quyền"  :65-67
                        viewMode   = canViewTeam(role) ? "team" : "self"        :72
                                     PRODUCTIVITY_TEAM_ROLES = [admin, manager]
                        canViewCost = role ∈ [admin]                            :80
                        timezone   = studio_info.timezone (cache 3600s)         :70
                              │
            ┌─────────────────┴─────────────────────┐
            │ viewMode = "team"                     │ viewMode = "self"  (media)
            ▼                                       ▼
  createAdminClient()  :46                  createClient()  :93   ← client NGƯỜI DÙNG
  rpc get_employee_productivity  :52        rpc get_my_employee_productivity  :94
     (GRANT service_role only)                 (GRANT authenticated)
     trả total_cost thật                       hàm TỰ giải auth.uid() → employees.id
                                               (20260428170000:168-173)
                                               ép total_cost = NULL  (:189)
            └─────────────────┬─────────────────────┘
                              ▼
              transformEmployeeRow(row, dayCount, viewer.canViewCost)
                 total_cost = canViewCost ? toNumber(row.total_cost) : null
                 lib/productivity-transforms.ts:152          ← LỚP CHE THỨ HAI
                 workload_ratio = max(active/(8×tuần), hours/(40×tuần))  :46-66
                              ▼
              buildSummary(employees, viewMode==="team")
                 self luôn truyền false → summary.total_cost = null
                 productivity-actions.ts:69 (true) vs :109 (false)
```

**Đo bằng dữ liệu nào — chính xác 6 chỉ số, tất cả từ `work_tasks`:**

| Chỉ số | Công thức | Dòng |
|---|---|---|
| `onsite_hours` | `(end_time::time − start_time::time)` giờ, **0 nếu thiếu một trong hai hoặc end < start** | `20260428170000:42-48`, `:65` |
| `active_tasks` | `COUNT(*) FILTER (status IN ('chua_lam','dang_lam'))` | `:66` |
| `completed_tasks` | `COUNT(*) FILTER (status = 'hoan_thanh')` | `:67` |
| `post_production_active` | active **và** `work_type IN ('hau_ky_anh','dung_phim','retouch','premiere','bien_tap')` | `:68-71` |
| `overdue_tasks` | active **và** `deadline < current_date` | `:72-76` |
| `total_cost` | `Σ COALESCE(wt.cost, 0)` | `:77` |

Phạm vi task (`:55-59`): `assigned_to IS NOT NULL` · `status <> 'da_huy'` · contract chưa xoá mềm · event chưa xoá mềm · `COALESCE(wt.start_date, wt.deadline, ce.event_date)` nằm trong `[start, end]`.

**Kỳ = từ mốc đầu kỳ tới HÔM NAY, không phải hết kỳ** — `getProductivityDateRange` đặt `endDate = hôm nay` theo timezone studio rồi lùi `startDate` (`lib/studio-date.ts:63-101`, đặc biệt `:67-72`). "Tháng này" = ngày 1 → hôm nay.

---

## 5. Nối với 6 miền cũ

### 5.1 — `fetchGoalsCashflow` là **chỗ tự cộng tiền thứ 3** (bổ sung `SYSTEM_MAP §5.2` / `01-tien §5`)

`01-tien §5` liệt kê 6 chỗ tự cộng lại. **Thiếu hai chỗ**, cả hai nằm trong miền của bản đồ này:

| # mới | Chỗ | Vì sao nghiêm trọng hơn các chỗ đã ghi |
|---|---|---|
| **7** | `fetchGoalsCashflow` (`finance-operations-queries.ts:836-920`) | Là chỗ **duy nhất trừ trùng**: `monthlyExpense` đã chứa phiếu chi lương + `[Auto-Fixed]`, rồi trừ tiếp `salaryComponent` (`:890`) và `fixedCostComponent` (`:891-897`) ở `:905`. `buildCloseSnapshot` ít nhất có `.not("description","ilike","[Auto-Fixed]%")` (`finance-close-actions.ts:83-86`); ở đây **không có bộ lọc nào** |
| **8** | `getBudgetsWithActuals` (`goal-budget-actions.ts:329-379`) | Gom `expenses.amount` theo `category_id → transaction_categories.name` rồi khớp với `budgets.category_name` (**text tự do**, `:367`). Không lọc `payee_type` ⇒ **phiếu chi trả nợ** (lab/thợ/NCC/ekip — theo "luật vàng" `SYSTEM_MAP §3` là *ra két, không phải chi phí mới*) vẫn bị tính là "đã tiêu ngân sách". Chưa kể `budgets.category_name` không có FK nên gõ lệch một ký tự là `actual_spent = 0` im lặng |

Chỗ **4** trong danh sách của `01-tien` (`get_finance_intelligence` "công thức riêng") nay có bằng chứng chi tiết — xem §4(f) BE1–BE4.

### 5.2 — Nối miền **Hợp đồng** (02) và **Tài chính** (01)

| Mối nối | Chiều | Bằng chứng |
|---|---|---|
| `services` → `contract_items.service_id` | FK thật, nhưng **giá là ảnh chụp** | `types/database.types.ts:697-702`; `20260714213000:181-211` |
| `services` → `finance_service_distribution` | **tham chiếu SỐNG** — đổi `service_type` làm đổi báo cáo tháng cũ | `20260412100000:123-124` |
| `delete_service_atomic` ← `contract_items` | Chặn xoá nếu còn HĐ dùng (`:375-383`) và nếu còn nằm trong combo (`:385-392`) | `20260428183000` |
| `services.cost_price` | **KHÔNG chảy đi đâu.** Nhập ở form (`ServicePriceSection.tsx:63`), hiện ở list (`service-mobile-list.tsx:84`), trả về trong catalog (`category-actions.ts:157,230`) — nhưng `ServiceItemForm.handleBatchAdd` **không dùng** (`ServiceItemForm.tsx:184-203`) và `contract_items` không có cột tương ứng | grep `cost_price` toàn repo |
| `financial_goals` / `budgets` / `goal_contributions` → sổ kỳ | **KHÔNG nối.** 0 lần xuất hiện trong `finance_period_ledger`, `finance_month_summary`, `finance_pnl_by_month`, `finance_reports_snapshot` | grep `supabase/migrations/` |
| `budgets` ← `expenses` | Chỉ một chiều, cộng trong TS, khớp theo **tên danh mục** | `goal-budget-actions.ts:358-364` |
| `fixed_costs.monthly_amount` | **4 chỗ đọc** (không phải 2 như §5.2 cũ): `buildCloseSnapshot:91-97` · `calculateFallbackSnapshot` · `fetchGoalsCashflow:891-897` · `get_finance_intelligence` (`20260827130000:368-369`) | — |

### 5.3 — Nối miền **CRM · Nhân sự · Lương** (04)

| Mối nối | Chi tiết |
|---|---|
| `work_tasks.cost` | **Một cột, ba người đọc với ba luật ngày khác nhau** — xem §5.4 |
| `productivity` ↔ `payable_items('employee')` | Cùng đọc `work_tasks.assigned_to`; `payable_items` lọc `status='hoan_thanh'` (`20260827130000:137,142`), productivity lấy **mọi task ≠ `da_huy`** (`20260428170000:56`) ⇒ `total_cost` trên `/productivity` ≥ nợ ekip trên `/finance/payables` |
| `employees.status` | Productivity lọc `NOT IN ('inactive','nghi_viec')` (`20260428170000:81`); `finance_payable_summary` lọc `active` (`01-tien §2`) ⇒ hai danh sách nhân sự có thể lệch |
| `evaluations`, `attendance` | Có bảng, **0 code** — module năng suất **không** dùng đánh giá hay chấm công |
| `employee_salaries.attendance_days` | Có cột (`types/database.types.ts:1513`) nhưng không nguồn nào feed (bảng `attendance` rỗng) → **[?]** |

### 5.4 — ⚠️ `work_tasks.cost` có **ba luật ngày** khác nhau

| Người đọc | Ngày rơi kỳ | Bằng chứng |
|---|---|---|
| `finance_period_ledger.cost_task` (sổ kỳ — **nguồn chân lý lãi/lỗ**) | `contract_events.event_date` → fallback `deadline` → `created_at` | `01-tien §5`; `20260827130000:53-90` |
| `get_employee_productivity.total_cost` | **`work_tasks.start_date`** → `deadline` → `ce.event_date` | `20260428170000:58-59` |
| `contract_financials.task_cost` | **không theo ngày** — cam kết trọn đời HĐ | `20260825200000:367-384` |

⇒ **"Chi phí ekip tháng 8" trên `/productivity` không bằng `cost_task` tháng 8 trên `/finance`**, dù cùng đọc một cột, cùng một tập task (trừ khác biệt `hoan_thanh` ở §5.3). Nguyên nhân: productivity ưu tiên `start_date`, ledger ưu tiên `event_date`. Không có chỗ nào trong code hay vault ghi nhận sự khác biệt này.

### 5.5 — Nối miền **Nền tảng** (06)

| Mối nối | Chi tiết |
|---|---|
| Realtime | `services`, `service_categories` có trigger `emit_realtime_signal` (`20260610130000:67-68`) → `services-list-client.tsx:148-157` nghe qua `useRealtimeSignal`. `financial_goals`, `budgets` có trigger (`20260610140000:25-26`) → `FinanceRealtimeRefresh` nghe qua filter `table_name=in.(…)` (`finance-realtime-refresh.tsx:17-18`). `work_tasks` + `employees` → `ProductivityRealtimeBindings` (`productivity-realtime.tsx:14-23`) |
| **Thiếu trigger** | `goal_contributions` và `service_bundles` **không** có trigger ⇒ góp vốn / sửa thành phần combo không tự đẩy tín hiệu; UI dựa `revalidatePath` + `mutate` thủ công (`goals-client.tsx:117`) |
| Guard tầng route | `/services` **có** (`services/layout.tsx:14`) — hiếm, ngược với `SYSTEM_MAP §5.4`. `/productivity` **có guard riêng ở page** (`page.tsx:27-33`). `/finance/goals` **chỉ** có guard `finance` của layout cha |
| `withAuth` = admin client | `lib/auth_utils.ts:411` — nên `requireContractAccess` trong `getAvailableCatalogItems` là **cổng duy nhất**, RLS không tham gia |
| Moodie (miền 05) | `service_catalog` (`tools.ts:1327`), `get_financial_goals` (`tools.ts:1375`) ⇒ số sai của `fetchGoalsCashflow` đi thẳng vào câu trả lời AI |

---

## 6. Bất biến (kèm SQL kiểm — **KHÔNG chạy ở đây**)

### Dịch vụ

| # | Phát biểu | Căn cứ | SQL kiểm |
|---|---|---|---|
| **S1** | Một `service_code` chỉ thuộc **một** dịch vụ chưa xoá | UNIQUE index `20260428183000:33`; RPC kiểm lại trước khi ghi `:186-194` | `SELECT service_code, count(*) FROM services WHERE deleted_at IS NULL AND service_code IS NOT NULL GROUP BY 1 HAVING count(*)>1;` |
| **S2** | Dịch vụ con của combo luôn là dịch vụ **`active` + `single`** chưa xoá | RPC kiểm từng phần tử `20260428183000:307-316` | `SELECT sb.* FROM service_bundles sb JOIN services c ON c.id=sb.child_service_id WHERE c.deleted_at IS NOT NULL OR COALESCE(c.status,'active')<>'active' OR COALESCE(c.fulfillment_type,'single')<>'single';` |
| **S3** | Combo không chứa chính nó; không trùng con | `:295-297`, `:273-283`; UNIQUE `(parent, child)` `:45` | `SELECT * FROM service_bundles WHERE parent_service_id = child_service_id;` |
| **S4** | Dịch vụ đang dùng trong HĐ hoặc trong combo **không xoá được** | `delete_service_atomic:375-392` | `SELECT s.id FROM services s WHERE s.deleted_at IS NOT NULL AND (EXISTS(SELECT 1 FROM contract_items ci WHERE ci.service_id=s.id AND ci.deleted_at IS NULL) OR EXISTS(SELECT 1 FROM service_bundles sb WHERE sb.child_service_id=s.id));` (mong đợi rỗng) |
| **S5** | Chỉ `service_role` chạm được `services` | `20260428183000:16-19` | `SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name IN ('services','service_categories','service_bundles','service_relations','price_rules');` (mong đợi chỉ `service_role`) |
| **S6** | `services.service_type` chỉ nhận 13 giá trị của `service_type_enum` | ⚠️ **KHÔNG có ràng buộc DB nào** — cột là `text` (vault `luoc-do-dich-vu.md:32`), enum chỉ dùng cho `contracts`/`event_templates`. Chặn duy nhất ở `serviceCreateSchema` (`lib/validations/service.schema.ts:28`) | `SELECT DISTINCT service_type FROM services;` — bất kỳ giá trị nào ngoài 13 giá trị ở `types/database.types.ts:7012-7025` là dữ liệu bẩn |
| **S7** | `service_bundles.adjustment_price` luôn = 0 | `useServiceForm.ts:94` ép 0; không đường nào khác ghi bảng này | `SELECT count(*) FROM service_bundles WHERE COALESCE(adjustment_price,0) <> 0;` (mong đợi 0) |
| **S8** | Sửa `services.selling_price` **không** làm đổi số tiền hợp đồng đã ký | `contract_items` giữ giá riêng; `contract_financials` không đọc `services` | `SELECT ci.id, ci.unit_price, s.selling_price FROM contract_items ci JOIN services s ON s.id=ci.service_id WHERE ci.deleted_at IS NULL AND ci.unit_price <> s.selling_price LIMIT 20;` (**có dòng lệch là ĐÚNG** — chứng minh giá đã đóng băng) |

### Mục tiêu

| # | Phát biểu | Căn cứ | SQL kiểm |
|---|---|---|---|
| **G1** | `financial_goals.current_amount` = Σ `goal_contributions.amount` của mục tiêu đó | `contribute_to_goal` / `undo_contribution_atomic` (không đọc được thân hàm — §8 #1); fallback TS `goal-budget-actions.ts:168`, `:228` | `SELECT g.id, g.current_amount, COALESCE(SUM(c.amount),0) FROM financial_goals g LEFT JOIN goal_contributions c ON c.goal_id=g.id WHERE g.deleted_at IS NULL GROUP BY g.id,g.current_amount HAVING abs(COALESCE(g.current_amount,0)-COALESCE(SUM(c.amount),0))>0.01;` |
| **G2** | `status='completed'` ⇔ `current_amount >= target_amount` | `updateGoal:71-80`; `addContribution` fallback `:173`; `undoContribution` fallback `:233` | `SELECT id,status,current_amount,target_amount FROM financial_goals WHERE deleted_at IS NULL AND ((lower(COALESCE(status,''))='completed' AND current_amount < target_amount) OR (lower(COALESCE(status,''))='active' AND target_amount>0 AND current_amount>=target_amount));` |
| **G3** | Mọi `goal_contributions` trỏ tới mục tiêu **chưa xoá mềm** | ⚠️ FK có (`types:2797-2801`) nhưng **không ràng buộc `deleted_at`**; `deleteGoal` chỉ xoá mềm mục tiêu, **không** dọn `goal_contributions` (`:107-110`) | `SELECT c.* FROM goal_contributions c JOIN financial_goals g ON g.id=c.goal_id WHERE g.deleted_at IS NOT NULL;` (có dòng = khoản góp mồ côi) |
| **G4** | Không thao tác mục tiêu nào vào được kỳ `locked` | ⚠️ **Chỉ đúng một nửa:** `addContribution:126` có `checkPeriodLock`; `undoContribution` **KHÔNG** (`:197-267`); `createGoal`/`updateGoal`/`deleteGoal` cũng không | — |
| **G5** | `budgets` duy nhất theo `(category_name, period_month, period_year)` | Suy từ `onConflict` (`goal-budget-actions.ts:290`); **không tìm thấy UNIQUE constraint nào trong migration** → §8 #4 | `SELECT category_name, period_month, period_year, count(*) FROM budgets WHERE deleted_at IS NULL GROUP BY 1,2,3 HAVING count(*)>1;` |
| **G6** | `budgets.category_name` khớp `transaction_categories.name` type `'chi'` | Không FK; khớp bằng chuỗi ở `goal-budget-actions.ts:358,367` | `SELECT DISTINCT b.category_name FROM budgets b WHERE b.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM transaction_categories t WHERE t.type='chi' AND t.name=b.category_name);` (mỗi dòng = một ngân sách luôn báo `actual_spent = 0`) |

### Năng suất

| # | Phát biểu | Căn cứ | SQL kiểm |
|---|---|---|---|
| **P1** | Người không phải admin **không bao giờ** nhận `work_tasks.cost` | 2 lớp: DB ép NULL (`20260428170000:189`, `:238`) + TS mask (`productivity-transforms.ts:152,187,200-202`), `PRODUCTIVITY_COST_ROLES=['admin']` (`types/productivity-constants.ts:34`) | `SELECT proname, pg_get_functiondef(p.oid) LIKE '%NULL::numeric AS total_cost%' FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND proname IN ('get_my_employee_productivity','get_my_employee_job_details');` (mong đợi `true`) |
| **P2** | `authenticated` **không** gọi được RPC team | `20260428170000:243-244, 248-249` | `SELECT p.proname, a.grantee, a.privilege_type FROM information_schema.role_routine_grants a JOIN pg_proc p ON p.proname=a.routine_name WHERE a.routine_name LIKE 'get_%employee_%';` (mong đợi `get_employee_*` chỉ `service_role`) |
| **P3** | Người dùng self chỉ thấy dữ liệu của chính mình, **kể cả khi truyền `employeeId` của người khác** | 2 lớp: RPC tự giải `auth.uid()` (`:168-173`, `:217-222`), và action ép lại id (`productivity-actions.ts:218-226`) | — (kiểm bằng test tích hợp) |
| **P4** | Task `da_huy` không bao giờ vào số liệu năng suất | `20260428170000:56`, `:127` | `SELECT count(*) FROM work_tasks WHERE status='da_huy';` — số này phải **không** xuất hiện trong bất kỳ chỉ số nào |
| **P5** | Task không gắn hợp đồng **vô hình** với module năng suất | INNER JOIN `contracts` (`:50-52`, `:122`) | `SELECT count(*) FROM work_tasks WHERE contract_id IS NULL AND COALESCE(status,'')<>'da_huy' AND assigned_to IS NOT NULL;` (>0 = công việc bị bỏ khỏi thống kê) |
| **P6** | `onsite_hours` chỉ đúng cho ca **trong ngày** | `(end_time::time − start_time::time)`, trả 0 nếu `end < start` (`:42-48`) ⇒ ca qua đêm = 0 giờ | `SELECT count(*) FROM work_tasks WHERE start_time IS NOT NULL AND end_time IS NOT NULL AND end_time::time < start_time::time;` (>0 = giờ công bị mất) |

---

## 7. Mâu thuẫn tài liệu

> Luật: **CODE THẮNG VAULT.**

| # | Vault / comment nói | Code nói | Kết luận |
|---|---|---|---|
| 1 | `vault/40-module/dich-vu.md:27`: "**`service_type_enum` 13 giá trị**" đặt ngay trên bảng `services` | `services.service_type` là **`text`** — `vault/30-du-lieu/luoc-do-dich-vu.md:32` (cùng vault, sinh từ introspect DB) và `types/database.types.ts:5183` (`service_type: string`). Enum `service_type_enum` chỉ gắn với `contracts.service_type` (`types:760`) và `event_templates.service_type` (`types:1853`) | **Hai trang vault mâu thuẫn nhau.** Trang module gợi ý sai rằng DB có chặn giá trị; thực tế bảng catalog **không có hàng rào nào**. Cùng họ với `SYSTEM_MAP §5.3` |
| 2 | `vault/40-module/dich-vu.md:29-33`: "Thêm một giá trị phải sửa **4 chỗ**" (`types/contract.ts`, `service-constants.ts`, `contract.schema.ts`, `database.types.ts`) | Còn **chỗ thứ 5 không được nhắc**: `scripts/normalize-services.mjs:46` giữ danh sách hợp lệ riêng — và **đã sót `outsource`** | **Vault thiếu 1 chỗ**, và chỗ thiếu ấy đang sai sẵn (§4b) |
| 3 | `vault/40-module/dich-vu.md:11`: "`service_bundles`, `service_relations`, `price_rules`, `promotions` hiện **rỗng** — đã dựng, chưa dùng" | Đúng về dữ liệu (`luoc-do-dich-vu.md:18-21` = 0 dòng), nhưng **mức "chưa dùng" khác nhau nhiều**: `service_bundles` có đường ghi đầy đủ + UI (`ServiceBundleSection`); `price_rules` có UI CRUD (`RuleManager.tsx`); `service_relations` có action nhưng **0 call-site** (`upsertRelation`, `getServiceRelations`); `promotions` **0 dòng code** | **Vault gộp 4 thứ khác hẳn nhau vào một câu.** `service_relations` = mã chết, `promotions` = bảng chết |
| 4 | `vault/40-module/dich-vu.md:41`: "`builder-actions.ts` (`service_relations`, `price_rules`)" — hàm ý cả hai đang chạy | `getServiceRelations` (`:15`) và `upsertRelation` (`:54`) có **0 call-site** trong `components/`; `BuilderMode` nhận `preFetchedRelations = []` mặc định (`:31`) vì `ServiceBundleSection.tsx:118-124` **không truyền prop** | **Vault đúng chữ, sai thực tế.** Nửa `service_relations` của builder chưa từng chạy |
| 5 | `vault/40-module/dich-vu.md:43`: "Ghi qua RPC atomic — **đừng insert tay**" | `upsertCategory`/`deleteCategory` INSERT/UPDATE/**DELETE cứng** thẳng `service_categories` (`category-actions.ts:75-91`, `:116`); `upsertRelation`/`upsertPriceRule` cũng ghi thẳng (`builder-actions.ts:70-72`, `:105-107`); `scripts/normalize-services.mjs:70-74` UPDATE thẳng `services` | **Luật chỉ áp cho `services` + `service_bundles`.** 4 bảng còn lại ghi tay. Vault nên nói rõ phạm vi |
| 6 | `vault/10-nen-tang/xac-thuc-phan-quyen.md:46`: bảng ma trận có dòng `productivity` (admin ✅ manager ✅ media ✅) | Ma trận `ROLE_PERMISSIONS` (`types/roles.ts:15,33,45`) **chỉ điều khiển hiển thị nav** (`sidebar.tsx:39`, `bottom-nav.tsx:56`). Route thật dùng `PRODUCTIVITY_ALLOWED_ROLES` (`types/productivity-constants.ts:27-31`) ở `page.tsx:27-33`. `canAccess(role,"productivity")` có **0 call-site** | **Hai nguồn quyền song song.** Hôm nay trùng nhau (admin/manager/media), nhưng sửa `roles.ts` sẽ **không** đổi được quyền vào `/productivity` |
| 7 | `xac-thuc-phan-quyen.md:47`: gộp `goals` vào nhóm module admin/manager | `"goals"` trong `ROLE_PERMISSIONS` (`types/roles.ts:24,42`) **chỉ** làm hiện mục nav mobile (`lib/navigation.ts:162-171`, `mobileOnly: true`). `canAccess(role,"goals")` có **0 call-site**. Route `/finance/goals` chỉ được `finance/layout.tsx:19` gác bằng quyền **`finance`** | **Cùng dạng #6.** Vai có `finance` mà không có `goals` sẽ vào `/finance/goals` được bằng URL. Hiện không có vai nào như vậy ⇒ **chưa phát tác** |
| 8 | `vault/40-module/nhan-su.md:54`: "`productivity-actions.ts` **chỉ gọi RPC, không chạm bảng**" | Đúng cho `productivity-actions.ts`, nhưng nó gọi `resolveProductivityViewerContext` → `getStudioTimezone` **đọc thẳng `studio_info`** bằng admin client (`lib/productivity-auth.ts:37-42`). `vault/20-ban-do-code/bang-doc-ghi.md:320` **có** liệt kê `lib/productivity-auth.ts` là nơi đọc `studio_info` | **Vault module thiếu 1 bảng**; vault bảng-đọc-ghi thì đúng |
| 9 | `vault/40-module/nhan-su.md:55`: "Cặp `get_X` / `get_my_X` = xem người khác vs xem chính mình — **giữ đúng cặp khi sửa quyền**" | Chính xác, và mạnh hơn vault mô tả: hai hàm dùng **hai loại Supabase client khác nhau** (`createAdminClient` `:46` vs `createClient` `:93`), hai mức GRANT khác nhau (`20260428170000:248-251`), và bản self **ép `total_cost = NULL` ở tầng DB** (`:189`) | **Vault đúng nhưng chưa nói hết.** Đây là bảo vệ 2 lớp (DB + TS), hiếm trong repo |
| 10 | `vault/20-ban-do-code/bang-doc-ghi.md:126-128`: `financial_goals` **Ghi (2)** — insert + update từ `goal-budget-actions.ts` | Còn đường thứ ba: RPC `contribute_to_goal` / `undo_contribution_atomic` cũng ghi `current_amount`/`status` (suy từ fallback TS `:168-180`, `:228-239`) | **Vault chỉ đếm được đường ghi từ TS**, không thấy đường qua RPC (script sinh vault quét `.from(...)`) |
| 11 | `components/finance/finance-realtime-refresh.tsx:12-13` (comment): "receipts/payments/payment_plans: postgres_changes trực tiếp (**đã trong publication**)" | Ba bảng này đã bị DROP khỏi publication (`20260714040000:8-41`, `01-tien §7` #5) | **Comment cũ hơn code** — đã được `01-tien §7` #5 ghi nhận, xác nhận lại vì file này chính là nơi `financial_goals`/`budgets` được lắng nghe (`:17-18`) |
| 12 | `types/service.ts:8` (comment): "Lesson #72: FK `*_by` → `auth.users(id)`" | `types/database.types.ts:5227-5235` chỉ liệt kê **một** FK cho `services`: `category_id → service_categories.id` | **Chưa kết luận được** — Supabase type-gen thường không sinh FK trỏ sang schema `auth`. Xếp vào §8 #6 |
| 13 | `types/service.ts:101-102`: `ServiceRelation` có `min_quantity`, `max_quantity` | DB **không có** hai cột này (`types/database.types.ts:5137-5146`; vault `luoc-do-dich-vu.md:131-140`). Cột thật là `is_required` + `relation_type` | **Type TS mô tả một lược đồ không tồn tại.** Không nổ vì `service_relations` chưa từng được đọc (§7 #4) |

---

## 8. Chưa xác minh

1. **Thân hàm `contribute_to_goal` và `undo_contribution_atomic`.** Cả hai **có mặt trên DB** (`types/database.types.ts:5726`, `:6732`) nhưng **không có `CREATE` nào trong `supabase/migrations/`** (grep toàn thư mục chỉ ra 2 file, đều là `ALTER`/trigger). ⇒ Không đọc được: `contribute_to_goal` có kiểm khoá kỳ không, có atomic không, có chặn `completed` không (tầng TS đã chặn ở `:139-145`); `undo_contribution_atomic` kiểm 24h theo `created_at` hay `contribution_date`. Cùng họ với `recalc_contract_totals` / `get_contract_balance` (`01-tien §8` #2) và là **bằng chứng thứ năm** cho `SYSTEM_MAP §5.1`.

2. **Lược đồ 6 bảng `services*` nằm ngoài lịch sử migration.** Không `CREATE TABLE` nào. Toàn bộ mô tả cột ở §1.1 dựa trên `types/database.types.ts` (26/08) + `vault/30-du-lieu/luoc-do-dich-vu.md` (introspect, `cap-nhat: 2026-08-07`). Ràng buộc CHECK, DEFAULT, trigger `update_services_updated_at` chỉ có trong vault, **không kiểm chéo được**.

3. **Số dòng thực tế.** Không chạy `db-q.mjs`. Vault ghi `services` 18 · `service_categories` 7 · 4 bảng còn lại 0 (`luoc-do-dich-vu.md:16-21`) — ảnh chụp 07/08, đã ~3 tuần. `financial_goals`/`goal_contributions`/`budgets`: `01-tien §1` ghi "0 dòng trừ `credit_cards`=3" nhưng đó là ảnh chụp `vault/30-du-lieu/luoc-do-tai-chinh.md:14-32` — **nếu 3 bảng này thật sự rỗng thì toàn bộ lỗi trừ trùng ở §4(e) chưa phát tác**. Không kiểm được.

4. **`budgets` có UNIQUE `(category_name, period_month, period_year)` không.** `upsertBudget` dùng `onConflict: "category_name,period_month,period_year"` (`goal-budget-actions.ts:290`) — nếu constraint không tồn tại, Supabase sẽ trả lỗi 42P10 ngay lần lưu đầu. Không tìm thấy constraint trong migration; `20260428090000:35-37` chỉ tạo **index thường** `idx_budgets_active_period_category` (không `UNIQUE`). ⇒ **Hoặc constraint có mà nằm ngoài repo, hoặc `/finance/budget` chưa từng lưu thành công.**

5. **4 policy của `services` và `service_categories` nội dung là gì.** Vault ghi số lượng (`luoc-do-dich-vu.md:16-17`) nhưng không nội dung. Vì grant đã bị REVOKE hết (`20260428183000:18`), chúng gần như chắc chắn vô hiệu — nhưng nếu ai đó cấp lại grant, các policy này **quyết định** ai đọc được bảng giá. Cần `SELECT * FROM pg_policies WHERE tablename IN ('services','service_categories');`.

6. **`services.created_by`/`updated_by` có FK sang `auth.users` không.** `types/database.types.ts:5227-5235` chỉ có FK `category_id`; comment `types/service.ts:8` khẳng định có. Type-gen của Supabase thường bỏ FK cross-schema ⇒ **không kết luận được từ file**. Liên quan trực tiếp tới `SYSTEM_MAP §5.5` (`customers.created_by` chứa 2 loại id): nếu `services.created_by` **không** có FK, nó có thể đang chứa hỗn hợp `auth.users.id` (từ `save_service_atomic` với `p_actor_id = userId`, `service-mutations.ts:75,92`) — hiện **chỉ có một nguồn ghi** nên chưa lệch, nhưng không có hàng rào.

7. **`normalize-services.mjs` đã chạy chưa và chạy lúc nào.** Không có log, không có audit (script không ghi `audit_logs`), không có migration đánh dấu. Nếu **chưa** chạy → dữ liệu `service_type` có thể còn giá trị lạ (bất biến S6). Nếu **đã** chạy → cần kiểm còn dịch vụ `outsource` nào không (§4b).

8. **`promotions` có thật sự không ai dùng.** grep `promotions` trong `app/`, `lib/`, `components/` = rỗng; nhưng chưa kiểm `supabase/functions/`, edge function, hay app V1 (`admin.moodwedding.com` — dùng Supabase **khác**, theo memory dự án, nên nhiều khả năng không liên quan).

9. **`get_finance_intelligence` — chỉ đọc nhánh `breakeven` + `cashflow` + đầu vào.** Chưa đọc `get_finance_advanced_intelligence` (`20260827130000:508`) và `get_cashflow_forecast` (`:853`), cũng chưa đọc `get_budget_vs_actual` (`20260421113000:824` chỉ thấy dòng REVOKE) — hàm này liên quan trực tiếp tới `budgets` nhưng **không call-site nào** trong `app/` (grep `get_budget_vs_actual` chỉ ra migration + `types/finance-intelligence.ts`). Có thể `getBudgetsWithActuals` (tự cộng TS) đã **thay thế** một RPC vẫn còn sống trên DB — chưa xác minh.

10. **Ảnh hưởng thật của lỗi trừ trùng ở `fetchGoalsCashflow`.** Có bằng chứng code đầy đủ (§4e), nhưng độ lớn phụ thuộc: có phiếu chi lương nào trong tháng không (`expenses.payee_type='employee'`), có phiếu `[Auto-Fixed]` nào không, `monthly_salaries` tháng hiện tại có dòng không. `01-tien §8` #6 cho biết sheet lương từng có dòng test 100tr đã xoá. **Chưa xác minh trên DB.** SQL đo: `SELECT (SELECT COALESCE(SUM(amount),0) FROM expenses WHERE deleted_at IS NULL AND payee_type='employee' AND expense_date >= date_trunc('month',current_date)) AS chi_luong_thang, (SELECT COALESCE(SUM(amount),0) FROM expenses WHERE deleted_at IS NULL AND description LIKE '[Auto-Fixed]%' AND expense_date >= date_trunc('month',current_date)) AS chi_co_dinh_thang, (SELECT COALESCE(SUM(total_salary),0) FROM monthly_salaries WHERE month=EXTRACT(month FROM current_date) AND year=EXTRACT(year FROM current_date)) AS sheet_luong, (SELECT COALESCE(SUM(monthly_amount),0) FROM fixed_costs WHERE deleted_at IS NULL) AS danh_muc_co_dinh;` — hai cặp trùng nhau chính là số bị trừ hai lần.

11. **`work_tasks.start_date` có phổ biến không.** Luật ngày của productivity ưu tiên `start_date` (`20260428170000:58`), ledger ưu tiên `contract_events.event_date`. Mức lệch giữa `/productivity` và `/finance` (§5.4) phụ thuộc tỉ lệ task có `start_date`. SQL đo: `SELECT count(*) FILTER (WHERE start_date IS NOT NULL) AS co_start_date, count(*) AS tong FROM work_tasks WHERE COALESCE(status,'')<>'da_huy' AND assigned_to IS NOT NULL;`

12. **Chưa đọc chi tiết tầng UI** của `category-manager-modal.tsx` (317 dòng), `goals-client.tsx` (459 dòng), `goal-analytics.tsx`, `productivity-page-client.tsx` (378 dòng) ngoài các đường dữ liệu đã trích. Riêng `productivity-page-client.tsx:90` truyền `viewMode: initialPayload?.viewer?.viewMode || "team"` làm **cache key SWR**, trong khi `page.tsx` **không bao giờ** truyền `initialPayload` (`:43-47`) ⇒ key luôn mang chữ `"team"` kể cả với vai `media`. Không lộ dữ liệu (server mới là nơi quyết định `viewMode`, `productivity-auth.ts:72`) nhưng key gây hiểu nhầm; **chưa xác minh** có tình huống nào hai vai dùng chung cache trong cùng phiên trình duyệt.
