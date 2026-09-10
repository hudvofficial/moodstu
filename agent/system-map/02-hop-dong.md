# BẢN ĐỒ MIỀN — HỢP ĐỒNG (vòng đời đầy đủ)

> Nguồn: đọc code + migration trong repo `mood-studio` ngày 2026-08-31. **Không chạm DB.**
> Quy ước: `đường/dẫn:dòng`. Chỗ nào chỉ suy được mà chưa mở file xác minh → xuống mục 8.
> `supabase/migrations/` là LỊCH SỬ — với mỗi hàm đã tìm migration **mới nhất** định nghĩa nó (`CREATE OR REPLACE FUNCTION`), không tin lần *nhắc tên*.

---

## 1. Bảng dữ liệu

| Bảng | Vai trò | Cột quan trọng (D = DẪN XUẤT, N = nhập tay) | Ai ghi vào | file:dòng |
|---|---|---|---|---|
| `contracts` | Gốc của miền | `total_amount` **N** (client tính, gửi thẳng vào RPC) · `discount_amount` **N** · `paid_amount` **D** · `remaining_amount` **D** · `payment_status` **D** (cả 3 do trigger `trg_contract_payment_status_v2` ghi đè trong mọi UPDATE chạm `total/paid/remaining`) · `status` **N** · `contract_code` **N** (preview client, chốt + chống trùng trong RPC) · `cancel_reason/cancelled_at/cancelled_by` **D** (chỉ `cancel_contract_cascade`) · `work_date` **D một phần** (ghi đè bằng `scheduleSummary.primaryWorkDate` nếu form gửi lịch trình) | `save_contract_atomic`, `process_contract_payment_v2`, `void_contract_payment_v2`, `cancel_contract_cascade`, `delete_contract_cascade`, `updateContractStatus`, `reactivateContract`, `recalc_contract_totals` (chỉ từ đường váy) | trigger `supabase/migrations/20260505093000_contract_payment_flexible_stages.sql:264-282` · total client `components/contracts/form/hooks/useContractFinancials.ts:34-37` → `app/actions/contract-mutations.ts:114` → `supabase/migrations/20260714213000_fix_contract_schedule_customer_mirror.sql:102,148` · `work_date` `app/actions/contract-mutations.ts:110` · cột: `types/database.types.ts:740-767` |
| `contract_items` | Hạng mục HĐ (dịch vụ / sản phẩm / trang phục / phát sinh) | `type` (`item_type_enum`) **N** · `total_amount`, `unit_price`, `discount_amount` **N** (form tính) · `is_addon`, `addon_category` **N** · `deleted_at` **D** | `save_contract_atomic` (**xoá mềm TOÀN BỘ rồi INSERT lại** ở mỗi lần sửa → id item đổi mỗi lần lưu) · `process_contract_payment_v2` chèn 1 dòng `phat_sinh` khi `p_update_total=true` · `void_contract_payment_v2` xoá mềm dòng phát sinh đó | `supabase/migrations/20260714213000…:108-112` (xoá mềm) + `:181-228` (insert lại) · `supabase/migrations/20260505093000…:465-491` · `supabase/migrations/20260505093000…:659-666` |
| `contract_events` | Mốc lịch trình (5 `event_type`) | `status` **D** (tính lại từ tập `work_tasks` của event) · `event_date` **N/D** (on-set: từ lịch trình form hoặc template) · `deadline` **D** (non-on-set: `ngày gốc + default_days_offset`) · `is_manual_date` **N** (true khi user tự thêm event → khoá không cho recalculate đè) · `sort_order` **D** · `google_*` **D** | `_generateContractEventsInternal`, `_reconcileContractScheduleInternal`, `addContractEvent`, `updateContractEvent`, `updateEventStatus`, `deleteContractEvent`, `checkAndCompleteEvent`, `delete_contract_cascade` | `app/actions/contract-event-actions.ts:231-297` · `:300-465` · `:655-717` · `:507-541` · `:488-505` · `:720-771` · `app/actions/work-task-actions.ts:398-439` · `supabase/migrations/20260421153000_contracts_production_hardening.sql:532-536` |
| `work_tasks` | Phân công nhân sự / thợ ngoài cho từng event | `status` **N** (`text`, **không phải enum DB**) · `work_type` (`work_type_enum`) **N** · `cost` **N** (cam kết trả thợ) · `completion_date` **D** (set khi status → `hoan_thanh`) · `assigned_to` / `vendor_id` **N** | `addTask`, `deleteTask`, `toggleTaskStatus`, `copyTasksFromPreviousEvent`, `_generateWorkTasksInternal` (**hiện luôn tạo 0 dòng**), `cancel_contract_cascade`, `delete_contract_cascade`, `reactivateContract`, ngoài miền: `task-assign-actions.ts`, `calendar-task-actions.ts` | `app/actions/work-task-actions.ts:195-262`, `:265-289`, `:292-316`, `:318-395`, `:107-183` · `getDefaultWorkTypes` trả `[]` `app/actions/work-task-actions.ts:22-28` · `types/database.types.ts:5429` (`status: string \| null`) |
| `payment_plans` | **Kế hoạch** thu (Cọc + Tất toán), KHÔNG phải tiền | `amount` **N/D** (generator tính) · `status` **D** (SSOT = `sync_payment_plan_statuses_v2` từ tổng phân bổ) · `stage_key` **D** (chuẩn hoá qua `payment_stage_key_v2`) · `stage_name` **D** · `due_date` **D** · `receipt_id` **D** · **KHÔNG có `updated_at`, KHÔNG có `paid_amount`** | `create_default_payment_schedule_v2`, `process_contract_payment_v2` (tạo đợt `outside`), `sync_payment_plan_statuses_v2`, `cancel_contract_cascade`, `delete_contract_cascade`, `reactivateContract` | `supabase/migrations/20260827100000_payment_plans_m4_bo_dot_1_2.sql:73-107` · `supabase/migrations/20260505093000…:129-176` · cột `types/database.types.ts:4300-4312` · cảnh báo thiếu `updated_at` `app/actions/contract-lifecycle.ts:249-254` |
| `payment_plan_allocations` | Nối phiếu thu ↔ đợt thu (SSOT trạng thái đợt) | `amount` **N** (= số tiền phiếu) · `payment_id`, `payment_plan_id`, `contract_id` | `process_contract_payment_v2` (INSERT), `void_contract_payment_v2` (DELETE) | `supabase/migrations/20260505093000…:539-553` · `:668-674` · cột `types/database.types.ts:4241-4268` |
| `contract_checklists` | Checklist theo `service_type` | `is_completed` **N** · `event_stage`, `category`, `item_name` **D** (copy từ `checklist_templates`) | `_generateChecklistsInternal`, `toggleChecklist` | `app/actions/checklist-actions.ts:57-99` · `:34-54` |
| `addon_history` | Gợi ý giá phát sinh dùng lại | `last_price` **D** · `usage_count` **D** (+1 mỗi lần dùng) · `last_used_at` **D** | `upsertAddonHistoryItems` (gọi trong `after()` sau khi lưu HĐ), `upsertAddonHistory` | `lib/services/addon-sync-service.ts:6-…` ← `app/actions/contract-mutations.ts:275-286` · `app/actions/addon-actions.ts:43` |
| `contract_notes` | Ghi chú timeline | `content` **N** | ngoài file miền (drawer/quick-note) | schema `vault/30-du-lieu/luoc-do-hop-dong.md:228-251` |
| `event_templates` / `checklist_templates` | Mẫu sinh event/checklist theo `service_type` | `default_days_offset`, `sort_order`, `is_active` **N** | seed/migration (không có action ghi trong miền) | đọc: `app/actions/contract-event-actions.ts:250-256`, `app/actions/checklist-actions.ts:72-77` |
| `documents`, `approval_requests` | 0 dòng, không có đường ghi trong miền HĐ | | | `vault/30-du-lieu/luoc-do-hop-dong.md:322-377` |

**Bảng ngoài miền bị vòng đời HĐ chạm:** `customers` (mirror tên/số đo/`wedding_date` trong `save_contract_atomic`), `payments`, `dress_reservations` + `dresses`, `printing_orders`, `expenses`, `inventory_transactions`, `receipts`, `galleries`, `google_sync_queue`.

---

## 2. RPC & hàm DB

| Tên | Ghi/đọc bảng | Atomic? | Gọi từ đâu | Còn sống / đã drop | file:dòng (bản MỚI NHẤT trong repo) |
|---|---|---|---|---|---|
| `save_contract_atomic(p_contract, p_customer, p_items, p_actor_id, p_existing_contract_id, p_expected_updated_at, p_initial_payment)` | GHI `customers`, `contracts`, `contract_items`; gọi `create_default_payment_schedule_v2` + `process_contract_payment_v2` | **Có** (1 transaction, `FOR UPDATE` + optimistic lock `p_expected_updated_at`) | `createContract` | Còn sống | `supabase/migrations/20260714213000_fix_contract_schedule_customer_mirror.sql:7-300`; gọi `app/actions/contract-mutations.ts:179-187` |
| `create_default_payment_schedule_v2(contract_id, total, initial_amount, initial_stage, contract_date, work_date)` | GHI `payment_plans` (2 đợt: `deposit` hạn=ngày ký, `final` hạn=ngày chụp); chuẩn hoá `stage_key`/`stage_name`/`sort_order` các đợt cũ | Trong transaction cha | `save_contract_atomic:237-244`; `process_contract_payment_v2` khi HĐ không còn đợt mở | Còn sống — **M4 (27/08) bỏ hẳn Đợt 1/Đợt 2** | `supabase/migrations/20260827100000_payment_plans_m4_bo_dot_1_2.sql:32-125` |
| `process_contract_payment_v2(contract_id, amount, method, date, stage, category_id, notes, plan_id, update_total, created_by)` | GHI `payments`, `payment_plan_allocations`, `payment_plans` (đợt `outside`), `contract_items` (dòng `phat_sinh` khi `update_total`), `contracts`; đọc `finance_monthly_closes` | **Có** (`FOR UPDATE` trên `contracts` TRƯỚC mọi validate) | `createPaymentReceipt`; `save_contract_atomic:273-284` cho cọc lúc tạo HĐ | Còn sống. ⚠️ File mới nhất trong repo (`20260527120000_fix_payment_race_condition.sql:5-201`) là **bản NGHÈO hơn** (không ghi allocations, không tạo đợt `outside`); `agent/DECISIONS.md:144` ghi rõ **bản đang chạy trên DB có allocations + `sync_payment_plan_statuses_v2`** → tin DB, không tin file | Bản giàu (khớp DB theo DECISIONS): `supabase/migrations/20260505093000_contract_payment_flexible_stages.sql:284-580`; gọi `app/actions/payment-actions.ts:70-81` |
| `void_contract_payment_v2(payment_id, reason, actor_id)` | GHI `payments` (soft + `voided_*`), `contract_items` (xoá mềm dòng phát sinh), XOÁ `payment_plan_allocations`, gọi `sync_payment_plan_statuses_v2`, GHI `contracts` | **Có** (`FOR UPDATE` payments + contracts) | `voidContractPayment` | Còn sống | `supabase/migrations/20260505093000…:585-712`; gọi `app/actions/payment-actions.ts:135-139` |
| `sync_payment_plan_statuses_v2(contract_id)` | GHI `payment_plans.status` + `receipt_id` từ Σ `payment_plan_allocations` (loại phiếu đã xoá mềm) | Trong transaction cha | `process_contract_payment_v2`, `void_contract_payment_v2` | Còn sống | `supabase/migrations/20260505093000…:129-176` |
| `payment_stage_key_v2(text)` | Thuần (IMMUTABLE) → `deposit \| installment_1 \| installment_2 \| final \| outside \| adjustment \| NULL` | — | 2 RPC thanh toán + `create_default_payment_schedule_v2` + `finance_receipt_documents` | Còn sống — bản mới nhất sửa unicode | `supabase/migrations/20260711160000_repair_payment_stage_key_unicode.sql:4-78` |
| `payment_stage_display_label_v2(stage, fallback)` | Thuần → nhãn tiếng Việt có dấu ghi vào `payments.payment_stage` | — | `process_contract_payment_v2`, `create_default_payment_schedule_v2`, RPC fulfillment | Còn sống | `supabase/migrations/20260505093000…:71-…` |
| `contract_payment_status_v2(paid, remaining)` | Thuần → **CHỈ 3 giá trị**: `chua_thanh_toan \| da_thanh_toan \| thanh_toan_mot_phan` | — | trigger + 2 RPC thanh toán + RPC fulfillment | Còn sống | `supabase/migrations/20260505093000…:248-262` |
| trigger `trg_contract_payment_status_v2` trên `contracts` | BEFORE INSERT/UPDATE OF `total_amount, paid_amount, remaining_amount` → ép `paid≥0`, `remaining = total − paid`, `payment_status = contract_payment_status_v2(...)` | — | tự động | Còn sống | `supabase/migrations/20260505093000…:264-282` |
| `recalc_contract_totals(contract_id)` | (thân hàm KHÔNG có trong repo) | — | **CHỈ** `app/actions/dress-mutations.ts:437,553` + `supabase/migrations/20260429110000_dresses_audit_fix.sql:714,778,832` | Còn sống (có trong `types/database.types.ts:6574`) nhưng **không nằm trên đường tạo/sửa HĐ** | chỉ thấy `ALTER/GRANT`: `supabase/migrations/20260421153000_contracts_production_hardening.sql:580-581,588,595` |
| `cancel_contract_cascade(contract_id, reason, user_id)` | GHI `contracts`, `work_tasks`, `printing_orders`, `dress_reservations` (+ `refresh_dress_status`), `payment_plans` | **Có** (`FOR UPDATE`; idempotent — `status='da_huy'` thì `RETURN`) | `cancelContract` | Còn sống | `supabase/migrations/20260422160000_contracts_business_logic_backfill.sql:300-373`; gọi `app/actions/contract-lifecycle.ts:113-117` |
| `delete_contract_cascade(contract_id, user_id)` | Soft-delete `contract_items`, `contract_events`, `printing_orders`, `contracts`; `work_tasks.status='da_huy'`, `dress_reservations.status='cancelled'`, `payment_plans.status='cancelled'`. **Chặn cứng nếu HĐ đã có phiếu thu** | **Có** | `deleteContract` | Còn sống | `supabase/migrations/20260421153000_contracts_production_hardening.sql:507-577`; gọi `app/actions/contract-lifecycle.ts:152-155` |
| `get_contract_list_v2(status, search, service_type, sort, time_filter, start, end, page, page_size)` | ĐỌC `contracts` + `customers` + `contract_events` + số liệu tài chính (qua `contract_financials`) | Chỉ đọc | `getContractListFromRpc` | Còn sống | `supabase/migrations/20260825200000_cashflow_m1_expense_allocations.sql:427-…`; gọi `app/actions/contract-queries.ts:216` |
| `contract_financials(uuid[])` | ĐỌC `contracts`, `work_tasks`, `printing_orders`, `inventory_transactions`, `expenses` → `revenue/task_cost/print_cost/cogs/direct_cost/profit` | Chỉ đọc | `get_contract_list_v2`, `finance_contract_profit_report` | Còn sống | `supabase/migrations/20260825200000…:367-385` |
| `get_contract_detail_v2` / `get_contract_detail_v3` | ĐỌC 1 phát: contract + events + work_tasks + checklists + payments + reservations + print_orders + payment_plans | Chỉ đọc | `getContractDetail` (cờ `NEXT_PUBLIC_RPC_V3`) | Còn sống (v3 mới nhất `supabase/migrations/20260808130000_fix_contract_detail_v3_print_orders_fields.sql`) | `app/actions/contract-queries.ts:550-557` |
| `contract_stats()` / `contract_stats_simple()` | ĐỌC `contracts` | Chỉ đọc | `getContractStatsFromRpc:123`, `getContractStats:472` | Còn sống | `supabase/migrations/20260422070000_hot_action_indexes_and_stats_rpcs.sql:355` · `supabase/migrations/20260523100100_contract_stats_simple_rpc.sql:7` |
| `contract_payment_health_checks()` | ĐỌC — 8 check toàn vẹn (overpaid, HĐ active thiếu đợt thu, phiếu chưa phân bổ…) | Chỉ đọc | migration M4 pre/post-check, `scripts/verify-contracts.mjs` | Còn sống | `supabase/migrations/20260505093000…:714-829`; dùng ở `supabase/migrations/20260827100000…:137` |
| `contract_payment_receipt_code(payment_id, date)` | Sinh mã phiếu thu | — | `process_contract_payment_v2:…` | Còn sống | gọi tại `supabase/migrations/20260505093000…:462`, `20260527120000…:120` |
| `get_contract_balance(p_contract_id)` | ? | ? | **không có caller nào trong code** | Còn sống trên DB (`types/database.types.ts:6242`), **không có migration nào trong repo** | — |
| `upsert_vendor_expense(work_task_id, actor_id)` | (cũ: sinh `expenses` trích trước khi task hoàn thành) | — | — | **ĐÃ DROP** | `supabase/migrations/20260825200000_cashflow_m1_expense_allocations.sql:177` |
| `nextval_contract_code` | — | — | — | **KHÔNG TỒN TẠI.** Chỉ có `nextval_customer_code` (`20260427030000_crm_rpc_hardening.sql:28`), `nextval_printing_order_code` (`20260428130000_printing_audit_fix.sql:92`), `nextval_inventory_code` (`20260428200000_inventory_security_hardening.sql:34`) | mã HĐ: `app/actions/contract-queries.ts:251-275` (preview) + retry chống trùng `supabase/migrations/20260714213000…:114-178` |
| trigger `emit_realtime_signal` (STATEMENT) trên `contracts`, `contract_events`, `contract_checklists`, `contract_notes`, `work_tasks`, `payment_plans`, `payments`… | GHI `realtime_signals` | — | tự động | Còn sống — **thay thế hoàn toàn `postgres_changes` trực tiếp** | `supabase/migrations/20260714040000_realtime_signal_only_hardening.sql:8-42` |

---

## 3. Server action & route

| Action / hàm | Route dùng | RPC / bảng gọi xuống | Quyền | file:dòng |
|---|---|---|---|---|
| `createContract(rawData)` | `/contracts/create`, `/contracts/[id]/edit` | `save_contract_atomic` → sau đó (ngoài transaction) `_reconcileContractScheduleInternal` / `_generateContractEventsInternal` + `_generateChecklistsInternal` + `syncDressReservationsForContract` + `upsertAddonHistoryItems` + Google sync | `requireContractWriteAccess` (admin/manager/sale) | `app/actions/contract-mutations.ts:83-319` |
| `updateContractStatus(id, newStatus, adminOverride, confirmedWarnings)` | mọi UI đổi trạng thái | UPDATE thẳng `contracts` (không RPC); đọc `work_tasks` để đếm việc dở | `requireContractDestructiveAccess` (admin/manager) | `app/actions/contract-mutations.ts:328-416` |
| `cancelContract(id, reason)` | drawer / menu chi tiết | `cancel_contract_cascade` + `cancelDressReservationsForContract` + xoá event Google | admin/manager | `app/actions/contract-lifecycle.ts:101-143` |
| `deleteContract(id)` | menu chi tiết | `delete_contract_cascade` + `cancelDressReservationsForContract` + xoá event Google | admin/manager | `app/actions/contract-lifecycle.ts:147-181` |
| `reactivateContract(id)` | banner HĐ đã huỷ | UPDATE thẳng `contracts`/`work_tasks`/`payment_plans`/`printing_orders`/`dress_reservations` (**không RPC, không atomic**) | admin/manager | `app/actions/contract-lifecycle.ts:186-294` |
| `createPaymentReceipt(input)` | `/contracts/[id]` (form thu tiền) | `checkPeriodLock` → `process_contract_payment_v2` | `requirePaymentRecordAccess` (admin/manager/sale) | `app/actions/payment-actions.ts:54-117` |
| `voidContractPayment(input)` | thẻ phiếu thu | `void_contract_payment_v2` | admin/manager | `app/actions/payment-actions.ts:120-177` |
| `getContractRefundSummary` / `createContractRefundExpense` | modal hoàn tiền | INSERT `expenses` (`category_code='contract_refund'`); **chặn nếu `status <> 'da_huy'`** | admin/manager **và** `requireFinanceAccess` | `app/actions/contract-refund-actions.ts:136-142` · `:144-225` |
| `getContractList` / `getContractPageBootstrap` / `getContractStats` | `/contracts` | `get_contract_list_v2`, `contract_stats`, `contract_stats_simple` (+ fallback query tay) | `requireContractAccess` | `app/actions/contract-queries.ts:280`, `:443`, `:458` |
| `getContractDetail(id)` | `/contracts/[id]`, `GET /api/contracts/[id]/prefetch` | `get_contract_detail_v2` \| `v3` | `requireContractAccess` | `app/actions/contract-queries.ts:542-591` · route `app/api/contracts/[id]/prefetch/route.ts:12-37` |
| `getContractDrawerExtra(id)` | drawer danh sách | đọc `contract_events`, `contract_checklists`, `work_tasks`, `payment_plans` | `requireContractAccess` | `app/actions/contract-queries.ts:593-651` |
| `fetchContractDrawerExtraClient(id)` | drawer (**browser → Supabase trực tiếp**, bỏ 2-hop) | đọc 4 bảng trên + `employees_public`, dựa RLS | RLS (`20260605000000`, `20260605020000`) | `lib/client-direct/contract-drawer.ts:29-72` |
| `getContractForEdit(contractId)` | `/contracts/[id]/edit` | đọc `contracts`, `payments`, `contract_events` | `requireContractAccess` | `app/actions/contract-queries.ts:653-…` |
| `getNextContractCode()` | form tạo | đọc `contracts` (max code) — **chỉ là preview** | `requireContractAccess` | `app/actions/contract-queries.ts:251-275` |
| `addContractEvent` / `updateContractEvent` / `updateEventStatus` / `deleteContractEvent` / `generateContractEvents` | tab sự kiện | `contract_events` (+ `recalculateDownstreamDates`, Google sync) | write / destructive (delete) | `app/actions/contract-event-actions.ts:655`, `:507`, `:488`, `:720`, `:470` |
| `addTask` / `deleteTask` / `toggleTaskStatus` / `copyTasksFromPreviousEvent` / `generateWorkTasksForContract` | tab nhân sự | `work_tasks` + `checkAndCompleteEvent` → `contract_events.status` | `requireContractWriteAccess` | `app/actions/work-task-actions.ts:195`, `:265`, `:292`, `:318`, `:186` |
| `getContractChecklists` / `toggleChecklist` / `generateChecklists` | tab checklist | `contract_checklists`, `checklist_templates` | access / write | `app/actions/checklist-actions.ts:18`, `:34`, `:102` |
| `searchAddonHistory` / `upsertAddonHistory` | modal phát sinh | `addon_history` | `withAuth` (không gate role riêng) | `app/actions/addon-actions.ts:22`, `:43` |
| `handleContractStatusUpdate({...})` (client) | mọi pill trạng thái | gọi `updateContractStatus`, xử lý `needsConfirmation` rồi gọi lại với `confirmedWarnings=true` | — | `lib/contracts/update-contract-status-ui.ts:32-71` |

**Route trong miền:** `/contracts` · `/contracts/create` · `/contracts/[id]` · `/contracts/[id]/edit` · `/contracts/[id]/print` · `/contracts/[id]/gallery` · `GET /api/contracts/[id]/prefetch` (`app/(protected)/contracts/**`).

---

## 4. Luồng nghiệp vụ

```
[1] LEAD ─── convert_lead_to_customer ──► KHÁCH HÀNG
    crm_leads.status: moi → da_lien_he → hen_gap → da_bao_gia → da_chot
    customers.customer_code ← nextval_customer_code()      (20260427030000:28,144)
      │  ⚠️ ngoài miền này — chưa mở file xác minh (xem §8)
      ▼
[2] TẠO HỢP ĐỒNG  ── RPC save_contract_atomic (1 transaction) ──────────────────
    contract-mutations.ts:179  →  20260714213000:7-300
      ├─ UPDATE customers (tên/SĐT/số đo cô dâu-chú rể/wedding_date)   :54-71
      ├─ INSERT contracts   status = 'cho_xu_ly' (mặc định)            :116-156
      │     mã trùng → retry tối đa 4 lần, tự +1 hậu tố               :161-177
      │     (sửa HĐ: SELECT … FOR UPDATE + so p_expected_updated_at)   :73-88
      ├─ contract_items: xoá mềm hết → INSERT lại toàn bộ              :108-112,181-228
      ├─ create_default_payment_schedule_v2 → payment_plans 2 đợt      :237-244
      │     'deposit'  amount = tiền cọc,  due = contract_date  (sort 10)
      │     'final'    amount = total−cọc, due = work_date      (sort 40)
      └─ nếu có cọc > 0 → process_contract_payment_v2(...)             :269-285
            → payments + payment_plan_allocations + payment_plans.status
            → contracts.paid/remaining/payment_status  (trigger ép lại)
    ── NGOÀI transaction (contract-mutations.ts:236-286, một phần trong `after()`) ──
      ├─ _reconcileContractScheduleInternal  → contract_events         :236-242
      │     (hoặc _generateContractEventsInternal khi form không gửi lịch)
      ├─ _generateChecklistsInternal → contract_checklists (từ checklist_templates)
      ├─ syncDressReservationsForContract → dress_reservations, dresses
      ├─ upsertAddonHistoryItems → addon_history
      └─ syncContractEventsToGoogle → google_sync_queue
      ⚠️ Các bước này KHÔNG atomic với RPC: RPC OK mà bước sau lỗi → HĐ vẫn tồn tại,
         chỉ đẩy message vào `warnings` (runPostSaveTask) hoặc log (`schedulePostSaveTask`).

[3] SỰ KIỆN & PHÂN CÔNG
    contract_events.event_type ∈ {chuan_bi, ngay_chup, ngay_to_chuc, hau_ky, giao_san_pham}
      on-set  (ngay_chup, ngay_to_chuc) → dùng event_date      (types/contract.ts:49)
      non-on-set (hau_ky, giao_san_pham) → dùng deadline = ngày gốc + default_days_offset
    work_tasks (13 work_type) gán người/vendor:
      addTask → status 'dang_lam' nếu có assigned_to|vendor_id, ngược lại 'chua_lam'
                                                       (work-task-actions.ts:230,239)
      ↳ ngay sau đó contract_events.status ← checkAndCompleteEvent (:398-439)
          mọi task hoan_thanh   → event 'hoan_thanh'
          có ít nhất 1 dang_lam → event 'dang_lam'
          còn lại / 0 task      → event 'chua_lam'
      ↳ addTask có assignee còn ép thẳng event → 'dang_lam' (:250-256)
    ❌ KHÔNG còn upsert_vendor_expense: chi phí thợ là CAM KẾT trên work_tasks.cost,
       phiếu chi chỉ sinh khi trả tiền thật (ADR-016) — work-task-actions.ts:308-310,
       hàm đã DROP ở 20260825200000:177.

[4] VÁY & VẬT TƯ
    validateDressAvailability (chặn trùng lịch) → save_contract_atomic
      → syncDressReservationsForContract (dress_reservations, dresses.status)
        lib/services/dress-sync-service.ts:105,157 ← contract-mutations.ts:163-168,229-234
    Phát sinh giá: addon_history (makeup · trang_phuc · phu_kien · them_gio · khac)

[5] THANH TOÁN  ── process_contract_payment_v2 ──────────────────────────────────
    payment-actions.ts:70 → (bản chạy trên DB, xem §2 & §8)
      chặn: kỳ đã khoá (finance_monthly_closes) · HĐ 'da_huy' · amount > remaining
      p_update_total=true (phát sinh tăng) → BẮT BUỘC remaining = 0 + lý do ≥ 5 ký tự
        → INSERT contract_items type='phat_sinh' + payments.is_contract_adjustment
      p_update_total=false → tìm đợt đích theo thứ tự:
        plan_id chỉ định  →  stage_key='outside' (tự tạo đợt nếu chưa có, sort 90)
        →  stage_key khớp  →  đợt mở chưa thu, sort_order nhỏ nhất
        → INSERT payment_plan_allocations → sync_payment_plan_statuses_v2
      payment_plans.status: pending → partial → paid  (hoặc cancelled)
      contracts: paid/remaining/payment_status  ← trigger ép
      Huỷ phiếu: void_contract_payment_v2 (soft-delete payment, XOÁ allocation, sync lại)
    ⚠️ HĐ KHÔNG tự chuyển 'dang_thuc_hien' khi thu tiền — phải người bấm.

[6] GALLERY   → galleries / gallery_images (ngoài miền, xem bản đồ gallery)
[7] IN ẤN     → create_printing_order_atomic → printing_orders (ngoài miền)
[8] GIAO & ĐÓNG
    event 'giao_san_pham' → hoan_thanh (thủ công)
    → người dùng bấm pill trạng thái → updateContractStatus(id, 'hoan_thanh')
      VALID_TRANSITIONS chặn cứng nếu nguồn không hợp lệ (contract-mutations.ts:321-326)
      còn nợ (remaining_amount > 0) hoặc còn task chưa xong → server trả
        { needsConfirmation, debt, unfinishedTasks }  (:364-383)
        → UI confirm → gọi lại confirmedWarnings=true (update-contract-status-ui.ts:51-64)
```

### Nhánh HUỶ — `cancel_contract_cascade` (20260422160000:300-373)

```
cancelContract(id, reason)      [admin/manager]            contract-lifecycle.ts:101
  0. getContractGoogleSyncTargets(...)          ← đọc TRƯỚC khi huỷ
  1. SELECT contracts FOR UPDATE; nếu đã 'da_huy' → RETURN (idempotent)
  2. contracts        : status → 'da_huy', cancel_reason/cancelled_at/cancelled_by
  3. work_tasks       : status → 'da_huy'      WHERE status <> 'hoan_thanh'
  4. printing_orders  : status → 'da_huy'      WHERE status NOT IN (hoan_thanh, da_huy)
  5. dress_reservations: → 'cancelled'         WHERE status IN (reserved,in_use,rented)
  6. FOR EACH dress_id → refresh_dress_status(dress_id)
  7. payment_plans    : status → 'cancelled'   WHERE status NOT IN (paid, cancelled)
  ── sau RPC, NGOÀI transaction ──
  8. cancelDressReservationsForContract (lặp lại bước 5-6 từ TS)  :78-91,121
  9. after() → deleteContractGoogleEvents                          :20-33,122
 10. invalidateContractPaths(list, detail, finance, dresses, printing, dashboard)
 ⇒ contracts, contract_items, contract_events, payments KHÔNG bị xoá mềm.
 ⇒ Hoàn tiền chỉ mở sau bước này: contract-refund-actions.ts:164-166.
```

### Nhánh XOÁ — `delete_contract_cascade` (20260421153000:507-577)

```
deleteContract(id)             [admin/manager]             contract-lifecycle.ts:147
  0. CHẶN CỨNG: tồn tại payments (deleted_at IS NULL, amount > 0) → RAISE
     'Hop dong da co phieu thu, chi duoc huy thay vi xoa'                 :521-529
  Thứ tự soft-delete (con → cha, theo chiều FK):
  1. contract_items    : deleted_at = now()
  2. contract_events   : deleted_at = now()
  3. work_tasks        : status → 'da_huy'  (KHÔNG có cột deleted_at)
  4. dress_reservations: status → 'cancelled'
  5. printing_orders   : deleted_at = now()
  6. payment_plans     : status → 'cancelled'
  7. contracts         : deleted_at = now()   ← CUỐI CÙNG; NOT FOUND → RAISE
  ⚠️ contracts.status GIỮ NGUYÊN (không đổi thành 'da_huy') — chỉ `deleted_at`.
  ── sau RPC ── cancelDressReservationsForContract + xoá Google + invalidate (detail:false)

reactivateContract(id)  — đảo huỷ, KHÔNG atomic (5 UPDATE rời)  :186-294
  chặn nếu váy đã bị đặt cho lịch khác (:212-224)
  contracts 'da_huy' → 'cho_xu_ly' (xoá cancel_*) · work_tasks 'da_huy' → 'chua_lam'
  payment_plans 'cancelled' → 'pending' (KHÔNG gửi updated_at — bảng không có cột đó)
  printing_orders 'da_huy' → 'cho_xu_ly' · dress_reservations 'cancelled' → 'reserved'
```

---

## 5. Enum & máy trạng thái

### 5.1 `contracts.status` — cột **`text`**, không phải enum DB (`types/database.types.ts:761`)

Giá trị hợp lệ (SSOT phía TS): `cho_xu_ly` · `dang_thuc_hien` · `hoan_thanh` · `da_huy`
— `types/contract.ts:15-19`, thứ tự `CONTRACT_STATUS_ORDER` `types/contract-constants.ts:23-28`, nhãn `:30-38`.

**Chuyển tiếp — CHẶN CỨNG** (`VALID_TRANSITIONS`, `app/actions/contract-mutations.ts:321-326`):

```
cho_xu_ly      → dang_thuc_hien | hoan_thanh | da_huy
dang_thuc_hien → hoan_thanh | da_huy
hoan_thanh     → dang_thuc_hien              (KHÔNG được về cho_xu_ly, KHÔNG được da_huy)
da_huy         → cho_xu_ly                   (chỉ 1 cửa)
```

- **Ép cứng:** `contract-mutations.ts:354-362` — sai luật thì `throw`, action trả `{ success:false }`. Bỏ qua được **chỉ khi** `adminOverride=true`, mà cờ đó lại đòi role admin/manager (`:337-339`). **Không có UI nào truyền `adminOverride=true`** — mọi pill gọi qua `handleContractStatusUpdate` chỉ truyền `(id, status)` rồi `(id, status, false, true)` (`lib/contracts/update-contract-status-ui.ts:44,66`).
- **Cảnh báo mềm (duy nhất):** khi `newStatus === 'hoan_thanh'` và `confirmedWarnings=false` → nếu `remaining_amount > 0` **hoặc** còn `work_tasks` ngoài `(hoan_thanh, da_huy)` → trả `{ needsConfirmation, debt, unfinishedTasks }` thay vì ghi (`contract-mutations.ts:364-383`). Đây là chỗ *duy nhất* "cảnh báo, không cấm".
- `da_huy` **không** đi qua `updateContractStatus` khi huỷ có lý do — đường chuẩn là `cancelContract` → `cancel_contract_cascade`; `updateContractStatus(…, 'da_huy')` đổi mỗi cột `status`, **không cascade**.
- `lib/contracts/contract-workflow.ts:39 isContractStatusForwardTransition` là **dead code** — grep toàn repo: 0 caller. Không có hàm nào tên `canMoveTo`.

### 5.2 `contracts.payment_status` — cột `text`, **hoàn toàn dẫn xuất**

TS khai 5 giá trị: `chua_thanh_toan · da_coc · thanh_toan_mot_phan · da_thanh_toan · hoan_tien` (`types/contract.ts:38-43`, nhãn `types/contract-constants.ts:42-48`).
DB chỉ sinh **3**: `contract_payment_status_v2` trả `chua_thanh_toan | da_thanh_toan | thanh_toan_mot_phan` (`20260505093000:248-262`), và trigger BEFORE ghi đè `NEW.payment_status` trong **mọi** UPDATE chạm `total/paid/remaining` (`:264-282`).
→ `da_coc` mà `save_contract_atomic:254-259` và `process_contract_payment_v2` (bản `20260527120000:129-134`) tính ra **bị trigger ghi đè ngay trong cùng câu UPDATE**. `hoan_tien` không có bất kỳ đường ghi nào (grep repo: chỉ xuất hiện trong map nhãn và trong danh sách `category_code` của `contract-refund-actions.ts:58,68`). Không có máy trạng thái — chỉ là hàm thuần của `(paid, remaining)`.

### 5.3 `contract_events.event_type` — enum DB `event_type_enum` (5 giá trị)

`chuan_bi · ngay_chup · ngay_to_chuc · hau_ky · giao_san_pham` — `types/database.types.ts:6793-6798`, nhãn/thứ tự `types/contract-constants.ts:74-83`.
On-set = `["ngay_chup","ngay_to_chuc"]` (`types/contract.ts:49`) → dùng `event_date`; còn lại dùng `deadline`.

### 5.4 `contract_events.status` — cột **`text` nullable**, default `'chua_lam'` (`types/database.types.ts:546`)

Giá trị dùng thực tế: `chua_lam · dang_lam · hoan_thanh · da_huy`.
- **Không có bảng chuyển tiếp nào.** `updateEventStatus` nhận đúng 3 giá trị `"chua_lam" | "dang_lam" | "hoan_thanh"` (chặn ở **kiểu TS**, không kiểm lại runtime) và chỉ loại trừ dòng đang `da_huy` (`app/actions/contract-event-actions.ts:488-505`).
- Giá trị **bị tính lại** bởi `checkAndCompleteEvent` sau mọi thao tác task (`app/actions/work-task-actions.ts:398-439`) → tick tay có thể bị ghi đè ở lần đụng task kế tiếp.
- `da_huy` chỉ do xoá event (`:750` và `_reconcileContractScheduleInternal:401-407`) hoặc `delete_contract_cascade`.
- **Chặn cứng:** không xoá được event `hoan_thanh` hoặc đã có `work_tasks` — `deleteContractEvent:740-744` và `_reconcileContractScheduleInternal:357-363` (`plan.conflicts` → throw).

### 5.5 `work_tasks.status` — cột **`text` nullable** (`types/database.types.ts:5429`) — **DB KHÔNG có `task_status_enum`**

TS: `chua_lam · dang_lam · hoan_thanh · da_huy` (`types/contract.ts:55`, nhãn `types/contract-constants.ts:107-115`).
- **Không có `VALID_TRANSITIONS`.** `toggleTaskStatus` ghi thẳng giá trị nhận được, chỉ set/xoá `completion_date` (`app/actions/work-task-actions.ts:292-316`).
- Sinh tự động: `addTask` đặt `dang_lam` nếu có người/vendor, `chua_lam` nếu không (`:230,239`). `copyTasksFromPreviousEvent` luôn đặt `chua_lam` + `cost = 0` (`:375-376`).
- `da_huy` do `cancel_contract_cascade` / `delete_contract_cascade`; `reactivateContract` đảo `da_huy → chua_lam` (`contract-lifecycle.ts:242-246`).

### 5.6 `work_tasks.work_type` — enum DB `work_type_enum`, **đúng 13 giá trị**

`concept · kich_ban · chup_anh · quay_phim · makeup · tro_ly · cameraman · hau_ky_anh · dung_phim · retouch · premiere · bien_tap · khac`
— `types/database.types.ts:6834-6848`; nhãn `types/contract-constants.ts:88-102`; TS `types/contract.ts:65-69`.
**Không còn tự sinh task theo work_type:** `getDefaultWorkTypes` trả `[]` một cách có chủ đích → `_generateWorkTasksInternal` luôn trả `{ generated: 0, message: "Automatic staff task generation disabled" }` (`app/actions/work-task-actions.ts:22-28`, `:164-166`).

### 5.7 `payment_plans.status` — cột `text` nullable

Giá trị: `pending · partial · paid · cancelled`.
- **Dẫn xuất từ phân bổ** (`sync_payment_plan_statuses_v2`, `20260505093000:155-176`):
  `cancelled` → giữ nguyên `cancelled` (một chiều, chỉ `reactivateContract` đảo lại) ·
  `Σ allocations ≤ 0` → `pending` · `amount > 0 && Σ + 0.01 ≥ amount` → `paid` · còn lại → `partial`.
- Mirror phía client: `normalizePlanStatus` (`lib/contracts/payment-plans.ts:22-30`) — cùng luật, cộng thêm nhận diện alias `da_huy/huy/closed/da_thanh_toan`.
- **Chặn cứng ở action:** `validatePaymentPlanAmount` từ chối đợt `paid`/`cancelled` (`app/actions/payment-actions.ts:41-51`), RPC chặn lần nữa (`20260505093000:397`).
- `stage_key` hợp lệ (chuẩn hoá bởi `payment_stage_key_v2`): `deposit · installment_1 · installment_2 · final · outside · adjustment · NULL`. **Từ M4 (27/08/2026) generator chỉ còn sinh `deposit` + `final`**; `installment_1/2` chỉ còn tồn tại ở dòng lịch sử đã có phân bổ (`20260827100000:88-89,127-129`).

### 5.8 Enum DB khác của miền

`item_type_enum` = `dich_vu · san_pham · trang_phuc · phat_sinh` (`types/database.types.ts:6801`) ·
`addon_category_enum` = `makeup · trang_phuc · phu_kien · them_gio · khac` (`:6785-6790`) ·
`export_type_enum` = `xuat_ban · xuat_thue` (`:6799`) ·
`transaction_type_enum` = `hop_dong · hoa_don` (`:6833`) ·
`service_type_enum` = 13 giá trị (`:6818-6832`) ·
`payment_method_enum` = `tien_mat · chuyen_khoan` (`:6817`) ·
`approval_status_enum` = `pending · approved · rejected` (`:6791`).
`contract_events.google_sync_status` bị CHECK ràng 6 giá trị (`vault/30-du-lieu/luoc-do-hop-dong.md:182`).

### 5.9 Tổng kết "ép" vs "cảnh báo mềm"

| Ràng buộc | Ép cứng ở đâu | Mềm ở đâu |
|---|---|---|
| Chuyển trạng thái HĐ | `VALID_TRANSITIONS` throw — `contract-mutations.ts:354-362` | — |
| Hoàn thành khi còn nợ / còn việc | — | `needsConfirmation` + `window.confirm` — `contract-mutations.ts:364-383`, `update-contract-status-ui.ts:51-64` |
| Thứ tự nghiệp vụ (chụp trước → in sau) | **KHÔNG có ràng buộc nào** (đúng như vault) | — |
| Thu quá số còn lại | RPC RAISE — `20260505093000:371` | — |
| Phát sinh tăng khi còn nợ | RPC RAISE — `:363` | — |
| Kỳ kế toán đã khoá | RPC RAISE + `checkPeriodLock` — `payment-actions.ts:66` | — |
| Thu tiền HĐ đã huỷ | RPC RAISE — `20260505093000:353` | — |
| Xoá HĐ đã có phiếu thu | RPC RAISE — `20260421153000:521-529` | — |
| Xoá event đã xong / có task | action + reconcile throw — `contract-event-actions.ts:740-744`, `:357-363` | — |
| Hoàn tiền khi HĐ chưa huỷ | action throw — `contract-refund-actions.ts:164-166` | — |
| Trùng lịch trang phục | `validateDressAvailability` throw — `contract-mutations.ts:163-168` | — |
| Sửa HĐ khi người khác vừa sửa | `p_expected_updated_at` RAISE — `20260714213000:85-88` | — |
| Ngày HĐ ≤ ngày chụp ≤ ngày giao | CHECK constraint **`NOT VALID`** (dòng cũ không bị soi) — `vault/30-du-lieu/luoc-do-hop-dong.md:65` | — |

---

## 6. Bất biến

| # | Phát biểu | Căn cứ | Câu SQL kiểm (**KHÔNG chạy**) |
|---|---|---|---|
| B1 | `remaining_amount = max(0, total_amount − paid_amount)` và `paid_amount ≥ 0` với mọi HĐ | trigger `20260505093000:266-268` | `SELECT id, contract_code FROM contracts WHERE deleted_at IS NULL AND (remaining_amount <> GREATEST(0, total_amount - paid_amount) OR paid_amount < 0);` |
| B2 | `payment_status` luôn khớp `contract_payment_status_v2(paid, remaining)` — chỉ 3 giá trị, không bao giờ là `da_coc`/`hoan_tien` | `20260505093000:248-282` | `SELECT id, payment_status FROM contracts WHERE deleted_at IS NULL AND payment_status <> contract_payment_status_v2(paid_amount, remaining_amount);` |
| B3 | `paid_amount` = Σ `payments.amount` chưa xoá mềm của HĐ | `save_contract_atomic:247-251`, `void_contract_payment_v2:683-687` | `SELECT c.id, c.paid_amount, COALESCE(p.s,0) FROM contracts c LEFT JOIN (SELECT contract_id, SUM(amount) s FROM payments WHERE deleted_at IS NULL GROUP BY 1) p ON p.contract_id = c.id WHERE c.deleted_at IS NULL AND ABS(c.paid_amount - COALESCE(p.s,0)) > 0.01;` |
| B4 | Mỗi phiếu thu **không phải phát sinh** có đúng 1 phân bổ, tổng phân bổ = số tiền phiếu | `20260505093000:539-553`, `agent/DECISIONS.md:144` | `SELECT p.id FROM payments p LEFT JOIN (SELECT payment_id, SUM(amount) s FROM payment_plan_allocations GROUP BY 1) a ON a.payment_id = p.id WHERE p.deleted_at IS NULL AND p.contract_id IS NOT NULL AND COALESCE(p.is_contract_adjustment,false) = false AND ABS(COALESCE(a.s,0) - p.amount) > 0.01;` |
| B5 | `payment_plans.status` khớp Σ phân bổ (trừ dòng `cancelled`) | `20260505093000:155-176` | `SELECT pp.id, pp.status FROM payment_plans pp LEFT JOIN (SELECT ppa.payment_plan_id, SUM(ppa.amount) s FROM payment_plan_allocations ppa JOIN payments p ON p.id = ppa.payment_id AND p.deleted_at IS NULL GROUP BY 1) x ON x.payment_plan_id = pp.id WHERE COALESCE(pp.status,'pending') <> 'cancelled' AND pp.status <> CASE WHEN COALESCE(x.s,0) <= 0 THEN 'pending' WHEN pp.amount > 0 AND COALESCE(x.s,0) + 0.01 >= pp.amount THEN 'paid' ELSE 'partial' END;` |
| B6 | Mọi HĐ active (`status <> 'da_huy'`, `total > 0`) có ≥ 1 đợt thu chưa huỷ | `contract_payment_health_checks` `20260505093000:749`; điều kiện dừng M4 `20260827100000:137-140` | `SELECT * FROM contract_payment_health_checks();` |
| B7 | Không có HĐ thu quá (`paid > total + 0.01`) | RPC chặn `20260505093000:371`; check `20260505093000:737` | `SELECT id, contract_code, total_amount, paid_amount FROM contracts WHERE deleted_at IS NULL AND (paid_amount > total_amount + 0.01 OR remaining_amount < -0.01);` |
| B8 | HĐ đã xoá mềm ⇒ mọi `contract_items`/`contract_events` của nó cũng đã xoá mềm, `payment_plans` đều `cancelled` (trừ đợt đã `paid`) | `delete_contract_cascade` `20260421153000:531-568` | `SELECT c.id FROM contracts c WHERE c.deleted_at IS NOT NULL AND (EXISTS (SELECT 1 FROM contract_items i WHERE i.contract_id = c.id AND i.deleted_at IS NULL) OR EXISTS (SELECT 1 FROM contract_events e WHERE e.contract_id = c.id AND e.deleted_at IS NULL) OR EXISTS (SELECT 1 FROM payment_plans pp WHERE pp.contract_id = c.id AND COALESCE(pp.status,'pending') NOT IN ('paid','cancelled')));` |
| B9 | HĐ đã xoá mềm ⇒ không có phiếu thu còn sống (RPC chặn xoá khi đã thu) | `20260421153000:521-529` | `SELECT c.id FROM contracts c JOIN payments p ON p.contract_id = c.id AND p.deleted_at IS NULL AND p.amount > 0 WHERE c.deleted_at IS NOT NULL;` |
| B10 | HĐ `da_huy` ⇒ mọi `work_tasks` chưa `hoan_thanh` là `da_huy`, `dress_reservations` không còn `reserved/in_use/rented`, `printing_orders` không còn dở dang | `cancel_contract_cascade` `20260422160000:333-372` | `SELECT c.id FROM contracts c WHERE c.status = 'da_huy' AND c.deleted_at IS NULL AND (EXISTS (SELECT 1 FROM work_tasks w WHERE w.contract_id = c.id AND w.status NOT IN ('hoan_thanh','da_huy')) OR EXISTS (SELECT 1 FROM dress_reservations d WHERE d.contract_id = c.id AND d.status IN ('reserved','in_use','rented')) OR EXISTS (SELECT 1 FROM printing_orders o WHERE o.contract_id = c.id AND o.deleted_at IS NULL AND o.status NOT IN ('hoan_thanh','da_huy','huy_don')));` |
| B11 | `contract_events.status` khớp luật tổng hợp từ `work_tasks` cùng event (bỏ event `da_huy`) | `checkAndCompleteEvent` `work-task-actions.ts:398-439` | `SELECT e.id, e.status FROM contract_events e LEFT JOIN LATERAL (SELECT count(*) n, count(*) FILTER (WHERE w.status = 'hoan_thanh') d, count(*) FILTER (WHERE w.status = 'dang_lam') p FROM work_tasks w WHERE w.event_id = e.id AND w.status <> 'da_huy') t ON TRUE WHERE e.deleted_at IS NULL AND e.status <> 'da_huy' AND e.status <> CASE WHEN t.n = 0 THEN 'chua_lam' WHEN t.d = t.n THEN 'hoan_thanh' WHEN t.p > 0 THEN 'dang_lam' ELSE 'chua_lam' END;` |
| B12 | `contract_code` duy nhất trong các HĐ còn sống | UNIQUE index `vault/30-du-lieu/luoc-do-hop-dong.md:78`; retry `20260714213000:161-177` | `SELECT contract_code, count(*) FROM contracts WHERE deleted_at IS NULL GROUP BY 1 HAVING count(*) > 1;` |
| B13 | Mỗi phiếu thu `is_contract_adjustment = true` trỏ về đúng 1 `contract_items` type `phat_sinh` cùng HĐ | `20260505093000:465-491,505-528` | `SELECT p.id FROM payments p LEFT JOIN contract_items i ON i.id = p.contract_adjustment_item_id WHERE p.is_contract_adjustment AND p.deleted_at IS NULL AND (i.id IS NULL OR i.contract_id <> p.contract_id OR i.type <> 'phat_sinh');` |
| B14 | Mọi `work_tasks.event_id` (nếu có) trỏ về event cùng `contract_id` | `assertTaskBelongsToEvent` + `assertEventBelongsToContract` `work-task-actions.ts:41-82` | `SELECT w.id FROM work_tasks w JOIN contract_events e ON e.id = w.event_id WHERE e.contract_id <> w.contract_id;` |
| B15 | `discount_amount` là **số tiền**, không phải phần trăm (bug 27/08 đã data-fix) | `20260827160000_contract_discount_percent_datafix.sql:16-28` | `SELECT id, contract_code, discount_amount FROM contracts WHERE deleted_at IS NULL AND discount_amount BETWEEN 1 AND 100;` |

---

## 7. Mâu thuẫn tài liệu (vault ↔ code — **code thắng**)

| # | Vault nói | Code thực tế |
|---|---|---|
| M1 | `vault/50-luong/vong-doi-hop-dong.md:34-35` + `vault/40-module/hop-dong.md:65`: "`save_contract_atomic` — một transaction ghi `contracts` + `contract_items` + **`contract_events`** + **`work_tasks`**" | RPC **chỉ** ghi `customers`, `contracts`, `contract_items` (+ `payment_plans`/`payments` qua 2 RPC con): `supabase/migrations/20260714213000_fix_contract_schedule_customer_mirror.sql:7-300` — **không có một câu nào chạm `contract_events`/`work_tasks`**. Events sinh **ngoài** transaction ở `app/actions/contract-mutations.ts:236-273` → `contract-event-actions.ts:231,300`. `work_tasks` **không được sinh tự động nữa** (`work-task-actions.ts:22-28`). Hệ quả: lời khuyên "chèn tay từng bảng sẽ phá toàn vẹn" vẫn đúng, nhưng ranh giới atomic hẹp hơn vault mô tả. |
| M2 | `vong-doi-hop-dong.md:37` + `hop-dong.md:66`: "Tổng tiền do `recalc_contract_totals` tính → không patch phía client" | Trên đường tạo/sửa HĐ, `total_amount` do **client** tính (`components/contracts/form/hooks/useContractFinancials.ts:34-37`) và gửi thẳng vào RPC (`contract-mutations.ts:114` → `20260714213000:102,148`). `recalc_contract_totals` **chỉ** được gọi từ đường trang phục: `app/actions/dress-mutations.ts:437,553` + `supabase/migrations/20260429110000_dresses_audit_fix.sql:714,778,832`. (Kết luận "không optimistic-patch" vẫn đúng — nhưng lý do là **trigger** `trg_contract_payment_status_v2` tính lại `paid/remaining/payment_status`, không phải `recalc_contract_totals`.) |
| M3 | `vong-doi-hop-dong.md:45`: "Giao ngoài thì `upsert_vendor_expense` sinh chi phí trích trước ở `expenses`" | Hàm **ĐÃ DROP**: `supabase/migrations/20260825200000_cashflow_m1_expense_allocations.sql:177`. Luật hiện tại: chi phí thợ = cam kết `work_tasks.cost`, phiếu chi chỉ khi trả tiền thật — `app/actions/work-task-actions.ts:308-310`. `vault/50-luong/luong-tien.md:45` và `vault/40-module/nha-cung-cap.md:17` mới là bản đúng. |
| M4 | `vong-doi-hop-dong.md:91-93` + `hop-dong.md:37`: "Cổng trạng thái là **cảnh báo mềm**, không cấm cứng… `canMoveTo` (`lib/contracts/contract-workflow.ts`) chỉ so vị trí trong `CONTRACT_STATUS_ORDER`" | Sai hai chỗ: (a) `VALID_TRANSITIONS` **chặn cứng bằng `throw`** ở `app/actions/contract-mutations.ts:321-326,354-362` — ví dụ `hoan_thanh → cho_xu_ly` và `hoan_thanh → da_huy` bị từ chối; phần mềm duy nhất là cảnh báo nợ/việc dở khi → `hoan_thanh` (`:364-383`). (b) **Không tồn tại hàm `canMoveTo`** trong repo; hàm gần nhất là `isContractStatusForwardTransition` (`lib/contracts/contract-workflow.ts:39`) và nó **không có caller nào**. Câu "hệ thống không ép **thứ tự nghiệp vụ** (chụp → in → giao)" thì **đúng** — không tìm thấy ràng buộc nào. |
| M5 | `hop-dong.md:70`: "Đây là nhóm bảng **duy nhất** dùng `postgres_changes` trực tiếp (9 bảng trong publication)" | `supabase/migrations/20260714040000_realtime_signal_only_hardening.sql:8-42` **gỡ 15 bảng** (gồm `contracts`, `contract_events`, `contract_checklists`, `contract_notes`, `work_tasks`, `payment_plans`, `payments`…) khỏi publication `supabase_realtime` và gắn trigger STATEMENT `emit_realtime_signal`; `:48-59` để lại **duy nhất `realtime_signals`** trong publication. → hiện **không bảng nghiệp vụ nào** dùng `postgres_changes` trực tiếp. |
| M6 | `hop-dong.md:69`: "Bảng hợp đồng không có RLS scope → **cấm client-direct**" | `lib/client-direct/contract-drawer.ts:29-72` đọc **thẳng từ browser** `contract_events`, `contract_checklists`, `work_tasks`, `payment_plans` (+ `payment_plan_allocations`, `employees_public`), dựa RLS của `supabase/migrations/20260605000000_contracts_rls_hardening.sql` + `20260605020000_client_direct_rls_prereq.sql`. Bảng `contracts` thì đúng là không đọc client-direct — vault nên thu hẹp phát biểu. |
| M7 | `vong-doi-hop-dong.md:28` gợi ý mọi mã sinh bằng `nextval_*_code`; đề bài cũng liệt kê `nextval_*_code` cho HĐ | **Không có `nextval_contract_code`.** Mã HĐ: preview `HĐ-<năm>-<4 số>` ở `app/actions/contract-queries.ts:251-275`, chốt + chống trùng bằng vòng retry `unique_violation` trong `save_contract_atomic` (`20260714213000:114-178`). Chỉ tồn tại `nextval_customer_code` (`20260427030000:28`), `nextval_printing_order_code` (`20260428130000:92`), `nextval_inventory_code` (`20260428200000:34`). |
| M8 | `types/contract-constants.ts:104` chú thích `TASK_STATUS_MAP` "match DB `task_status_enum`" | **DB không có `task_status_enum`** — danh sách enum đầy đủ ở `types/database.types.ts:6784-6849` không chứa nó; `work_tasks.status` và `contract_events.status` đều là `text` nullable (`:5429`, `:546`). Nghĩa là DB **không** chặn giá trị lạ cho 2 cột này. |
| M9 | `hop-dong.md:39`: "Trang chi tiết (`detail/top-action-bar.tsx`) còn bản nội bộ riêng — chưa gộp" | **Vẫn đúng**: `components/contracts/detail/top-action-bar.tsx:172-217` định nghĩa một `ContractStatusBadge` **cục bộ** (che tên component dùng chung), không có `ConfirmDialog` → rơi về `window.confirm` (`lib/contracts/update-contract-status-ui.ts:62`). Bản dùng chung `components/contracts/contract-status-badge.tsx` chỉ được dùng ở `contract-drawer.tsx:20,140`. |
| M10 | `vault/30-du-lieu/luoc-do-hop-dong.md:16` "contracts 64 dòng" (cập nhật 2026-08-07) | Số đo mới hơn: `agent/CURRENT_STATE.md:39` (26/08/2026) ghi 60 HĐ, `payments` 51 dòng, `payment_plans` 240 dòng trước khi M4 xoá 119 dòng installment. Số liệu vault đã cũ. |
| M11 | `hop-dong.md:49` "`create_default_payment_schedule_v2` sinh **2 đợt** — Cọc (hạn = ngày ký) + Tất toán (hạn = ngày chụp)" | **Đúng, đã xác minh**: `supabase/migrations/20260827100000_payment_plans_m4_bo_dot_1_2.sql:73-107`. Ghi ở đây để ngăn hiểu nhầm với bản cũ 4 đợt (`20260505093000:212-220`) vẫn còn trong repo. |

---

## 8. Chưa xác minh

1. **Thân thật của `process_contract_payment_v2` trên DB production.** File mới nhất trong repo (`supabase/migrations/20260527120000_fix_payment_race_condition.sql:5-201`) **không** ghi `payment_plan_allocations`, **không** tạo đợt `outside`, **không** gọi `sync_payment_plan_statuses_v2`, **không** tạo dòng `contract_items` phát sinh — tức nghèo hơn bản `20260505093000:284-580`. `agent/DECISIONS.md:144` khẳng định bản chạy trên DB **có** đủ (51/51 phiếu thu có phân bổ) và dặn "tin DB, không tin file"; `supabase/migrations/20260827100000…:5` cũng viết "RPC tự tạo đợt `outside` — không đụng". Tôi đã lấy bản `20260505093000` làm mô tả trong §2/§4, nhưng **chưa xác minh trực tiếp** (không được chạm DB). Muốn chốt: `SELECT prosrc FROM pg_proc WHERE proname = 'process_contract_payment_v2';`.
2. **Thân của `recalc_contract_totals(uuid)`** — không có `CREATE FUNCTION` nào trong `supabase/migrations/`, chỉ có `ALTER`/`GRANT` (`20260421153000:580-595`). Hàm có thật (`types/database.types.ts:6574`) nhưng logic (tính từ `contract_items`? từ `payments`?) **chưa xác minh**.
3. **`get_contract_balance(p_contract_id)`** — tồn tại trong `types/database.types.ts:6242`, **không có migration** trong repo, **không có caller** nào trong `app/`, `lib/`, `components/`. Không rõ còn dùng hay là hàm chết.
4. **`get_contract_detail_v2` / `v3` đang chạy nhánh nào trong production** — phụ thuộc biến môi trường `NEXT_PUBLIC_RPC_V3` (`app/actions/contract-queries.ts:551-553`). Chưa mở `.env.local`/cấu hình Vercel nên chưa biết nhánh thật; cũng chưa đọc thân RPC nên **không** liệt kê cột trả về của chúng.
5. **Bước [1] LEAD → khách hàng** (`convert_lead_to_customer`, `crm_leads`) nằm ngoài miền được giao; tôi chỉ chép lại từ `vault/50-luong/vong-doi-hop-dong.md:25-30` và xác minh được duy nhất `nextval_customer_code` (`20260427030000:28,144`). Chuỗi trạng thái lead và cảnh báo `crm_leads.created_by → employees.id` **chưa mở file kiểm**.
6. **Bước [6] Gallery và [7] In ấn** — chỉ ghi ở mức "chạm bảng nào", không mở `create_printing_order_atomic` / `prepare_gallery_share`. Riêng `printing_orders.status` (`cho_xu_ly → dat_coc → dang_in → da_in → da_nhan → hoan_thanh | huy_don`) là **chép từ vault** (`vong-doi-hop-dong.md:73`), chưa xác minh trong code.
7. **RLS policy cụ thể** của 10 bảng trong miền (6/4/6/6/6/1/1/1/4/3 policy theo `vault/30-du-lieu/luoc-do-hop-dong.md:14-25`) — chưa đọc `20260605000000_contracts_rls_hardening.sql` nên chưa xác nhận client-direct đọc được đúng những gì `lib/client-direct/contract-drawer.ts` giả định.
8. **`contract_events.phase`** (default `'pre_wedding'`) và **`end_date`** — có trong schema (`luoc-do-hop-dong.md:163,157`) nhưng không thấy đường ghi nào trong các action đã đọc; chưa xác minh ai set.
9. **Thứ tự áp migration thực tế.** `scripts/migrate-direct.mjs:57-64` bắt buộc truyền **từng tên file** → migration được áp thủ công, **không** theo thứ tự tên file. Vì vậy "migration mới nhất theo tên" chỉ là *bằng chứng mạnh nhất có trong repo*, không phải bằng chứng chắc chắn về trạng thái DB (chính điểm 1 là hệ quả).
10. **`_generateWorkTasksInternal` có bao giờ được kích hoạt lại không** — hiện `getDefaultWorkTypes` trả `[]` (`work-task-actions.ts:22-28`) nên `generateWorkTasksForContract` là no-op; chưa tìm được ADR ghi ngày/lý do tắt.
