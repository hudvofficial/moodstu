# SYSTEM_MAP — Bản đồ kiến trúc mood-studio

**Lập ngày 2026-08-31** bằng 6 agent chạy song song, mỗi agent một miền, đọc `vault/` rồi đối chiếu với code thật.
Chi tiết từng miền: `agent/system-map/01..06-*.md` (3.034 dòng). File này là **bản hợp nhất + những gì chỉ thấy khi ghép các miền lại**.

> 🏛️ **BẢNG KIẾN TRÚC ĐẦY ĐỦ — MỘT chỗ duy nhất:** https://claude.ai/code/artifact/0b92e28d-aa2c-4c71-8c1d-f74873e19605
> 17 section: §00 toàn cảnh một mặt phẳng (61/61 trang · 25/25 API · 85/85 action · 149/149 hàm · 93/93 bảng, kiểm bằng máy) · bối cảnh · hạ tầng · 3 đường dữ liệu · 16 module · 6 miền · vòng 8 trạm · mô hình 93 bảng · 5 luồng nghiệp vụ · quyền · vận hành đo được · sổ đối chiếu thiết kế ↔ thực tế · nguyên tắc. **Đây là bản chính; các link dưới là vệ tinh.**
>
> 📋 Tổng trình (bản duyệt): https://claude.ai/code/artifact/a37be589-3da2-41c6-b115-59fcdc8d14d7
> 🧭 Sơ đồ mặt phẳng (bản rời của §00): https://claude.ai/code/artifact/6122efcb-2123-4100-888a-4f20a73b0eca
> Kết luận · cỗ máy 6 số · sổ đối chiếu 36 mục · thứ tự xử lý · 10 quyết định chờ chủ studio. Đọc bản này trước.
>
> 📐 **Bản thiết kế kiến trúc:** https://claude.ai/code/artifact/0b92e28d-aa2c-4c71-8c1d-f74873e19605
> Bối cảnh · hạ tầng · ba con đường tới dữ liệu · mô hình dữ liệu 93 bảng/12 vùng · mô hình quyền · 7 nguyên tắc. **Đọc file này trước khi giao việc.**
>
> 🗺️ **Bản đồ phát hiện:** https://claude.ai/code/artifact/27a9fcc2-7687-48b9-985d-c99d67113acf
> Sơ đồ 16 module · vòng hệ thống 8 trạm · tầng · sáu miền · vòng đời hợp đồng · dòng tiền · sổ kỳ · máy trạng thái · gallery · sổ rủi ro 11 mục.

## 0. Cách đọc — ba mức tin cậy

Mọi dòng trong bộ tài liệu này mang một trong ba nhãn. Đừng trộn chúng.

| Mức | Nghĩa | Dùng được để |
|---|---|---|
| **[DB]** | Đã truy vấn database production (chỉ đọc) và có kết quả | Ra quyết định |
| **[CODE]** | Có `file:dòng` trong repo | Ra quyết định, trừ khi đụng lược đồ DB (xem §8) |
| **[?]** | Không tìm được bằng chứng | **Không** dùng để quyết định — phải xác minh trước |

Luật khi mâu thuẫn: **DB thắng CODE, CODE thắng vault.** Vault (`vault/`) là tài liệu do người viết, có vùng đã cũ — §7 liệt kê 50+ chỗ.

---

## 1. Sơ đồ tổng

```
                                 ┌──────────────────────────────────────────┐
   Trình duyệt                   │  MỌI TIỀN ĐI ĐƯỜNG NÀY                   │
       │                         │  server-only, service-role               │
       ├── server component ─────┤                                          │
       │   (61 trang)            │   server action (85 file)                │
       │                         │        │                                 │
       ├── server action ────────┤        ▼                                 │
       │                         │   RPC atomic (107 hàm được gọi)          │
       ├── client-direct ────┐   │        │                                 │
       │   anon key + RLS    │   │        ▼                                 │
       │   6 bảng, chỉ ĐỌC   │   │   Postgres (93 bảng · 2 view · 16 enum)  │
       │                     │   └──────────────────────────────────────────┘
       │                     └──────────► RLS policy làm cổng  [DB: đã xác minh §6]
       │
       ├── realtime ─────────► CHỈ bảng `realtime_signals` trong publication
       │                       (15 bảng nghiệp vụ đã bị gỡ — 20260714040000)
       │                       35 bảng gắn trigger `emit_realtime_signal`
       │
       └── service worker ───► PWA cache (next.config.ts) — KHÔNG cache bảng tiền
```

**Ranh giới cứng:** tiền không bao giờ đi qua realtime payload, không optimistic, luôn tính lại ở server.
→ §5.2 ghi hai chỗ code đang phá luật này.

---

## 2. Sáu miền

| # | Miền | Bảng | RPC/hàm | File chi tiết |
|---|---|---|---|---|
| 1 | **Dòng tiền & tài chính** | 20 | 40 (8 đã drop) | `system-map/01-tien.md` |
| 2 | **Vòng đời hợp đồng** | 12 | 20 | `system-map/02-hop-dong.md` |
| 3 | **In ấn · Kho · Váy cưới** | 12 | ~45 + 6 trigger | `system-map/03-in-kho-vay.md` |
| 4 | **CRM · Nhân sự · Lương** | 14 | 22 | `system-map/04-crm-nhan-su.md` |
| 5 | **Gallery · Moodie AI** | 23 | 20 | `system-map/05-gallery-moodie.md` |
| 6 | **Nền tảng** (route, auth, cache, realtime) | — | 107 RPC (mục lục) | `system-map/06-nen-tang.md` |

---

## 3. Trục chính: dòng tiền

Ba khái niệm **không được lẫn**:

- `payment_plans` = **kế hoạch thu**, không phải tiền. M4 chỉ còn 2 đợt: Cọc + Tất toán.
- `payments` = tiền vào theo hợp đồng · `receipts` = tiền vào bán lẻ.
- `expenses` = **tiền ra, chỉ ghi khi tiền thật rời két**; phân bổ về bản ghi gốc qua `expense_allocations`.

```
CAM KẾT (nợ phát sinh)                     TRẢ TIỀN (một cửa duy nhất)
──────────────────────                     ──────────────────────────
printing_orders.total_amount  ─┐
work_tasks.cost (thợ ngoài)    │           /finance/payables — 1 modal, 4 loại payee
work_tasks.cost (ekip)         ├────►  record_payee_payment_atomic
inventory_transactions.stock_in│           ├─ kiểm kỳ khoá → EXCEPTION
employee_salaries.net_salary   ┘           ├─ INSERT expenses(payee_type, payee_id)
                                           ├─ INSERT expense_allocations(target_type, target_id)
                                           ├─ Σ phân bổ ≠ amount → EXCEPTION
                                           ├─ recompute_printing_payment_status
                                           └─ sync_employee_salary_paid
```

**Luật vàng:** phiếu chi **có** phân bổ = trả nợ (chỉ ra két, không phải chi phí mới).
Phiếu `payee_type='other'` = chi phí thật phát sinh.

**Luật ngày ghi sổ:** doanh thu theo `contracts.work_date` · chi phí task theo `contract_events.event_date` · đơn in theo `order_date` · thu/chi theo `payment_date`/`expense_date`. **Không bao giờ theo `updated_at`.**

---

## 4. Nguồn chân lý — câu hỏi nào hỏi hàm nào

| Câu hỏi | Hàm DUY NHẤT được phép trả lời | Ghi chú |
|---|---|---|
| Doanh thu tháng | `finance_month_summary(m,y).revenue` | theo **ngày chụp**, không phải ngày thu |
| Tiền đã thu / đã chi | `.cash_in` / `.cash_out` | két ≠ lãi/lỗ |
| Hợp đồng này lãi bao nhiêu | `contract_financials(uuid[])` | tự cộng tay sẽ sót nhánh |
| Còn phải thu | `finance_debt_stats()` | đọc **hợp đồng**, không đọc bảng `debts` |
| Còn phải trả | `finance_payable_summary()` | lab · thợ · NCC · ekip |
| HĐ đến hạn thu | `finance_pending_collections()` | **đến hạn = đã giao sản phẩm** |
| Sổ kỳ gốc | `finance_period_ledger(start,end)` | 4 hàm đọc nó, **không hàm nào tự cộng lại** |

Dòng cuối là bất biến kiến trúc quan trọng nhất của hệ thống — và §5.2 cho thấy nó đang bị vi phạm 2 chỗ.

---

## 5. Chỉ thấy được khi ghép các miền

Đây là phần không agent đơn lẻ nào tìm ra, và cũng là lý do phải lập bản đồ toàn hệ thống thay vì đọc từng chỗ.

### 5.1 — Repo **không** phản ánh database  ⚠️ vấn đề nền tảng

Bốn bằng chứng độc lập:

| Bằng chứng | Nguồn |
|---|---|
| `process_contract_payment_v2`: file migration mới nhất theo tên **nghèo hơn** bản đang chạy (thiếu allocations, thiếu đợt `outside`) | 01-tien §8, 02-hop-dong §5 · `agent/DECISIONS.md:144` đã chốt *"tin DB, không tin file"* |
| `recalc_contract_totals`, `get_contract_balance`: **không có `CREATE` trong repo**, chỉ có trong `types/database.types.ts` | 01-tien §8 |
| `crm_leads`/`customers`: **[DB] có 4 policy mỗi bảng**, nhưng không migration nào tạo chúng | truy vấn `pg_policies` 31/08 |
| `types/database.types.ts` thiếu `sync_employee_salary_paid` (M5) | 06-nen-tang §7 M6 |

**Nguyên nhân gốc:** `scripts/migrate-direct.mjs:57-64` bắt truyền **từng tên file** → migration áp thủ công → **thứ tự áp ≠ thứ tự tên file**, và có thứ được áp mà không qua file.

**Hệ quả cho việc giao task:** không ai — người hay agent — có thể kết luận đúng/sai về lược đồ **chỉ bằng cách đọc repo**. Mọi câu hỏi dạng "hàm X có tồn tại / làm gì" phải hỏi DB.

### 5.2 — Vẫn còn công thức tiền chạy song song

ADR-016 M2 dựng `finance_period_ledger` làm sổ duy nhất và DROP `finance_dashboard_metrics` để diệt lớp lỗi này. Còn sót 2 chỗ:

- **`buildCloseSnapshot`** (`app/actions/finance-close-actions.ts:30-137`) tự cộng tiền trong TypeScript, lấy chi phí cố định từ `fixed_costs.monthly_amount:91-97` (ledger thì đếm phiếu chi `[Auto-Fixed]`), rồi đặt `netProfit = két − khấu hao:121`. **Đây đúng là lớp lỗi M2 đã xoá.**
- **`finance_cashflow_timeline`** không đọc ledger mà tự query lại `payments`+`receipts`+`expenses` (`20260826120000:324-336`) — trái hẳn câu `luong-tien.md:54`. Số hiện khớp, nhưng là công thức thứ hai.

> **ĐÃ ĐÓNG 11/09/2026 (#23).** Cả hai chuyển sang một nguồn: `finance_cash_entries(start, end)` định nghĩa tiền vào/ra theo ngày; sổ kỳ cộng lại, biểu đồ vẽ từng ngày, `buildCloseSnapshot` đọc sổ kỳ. Còn `depreciationCost` ngoài sổ kỳ → #29.

### 5.3 — DB không chặn enum ⇒ lỗi chính tả im lặng

- **[CODE]** DB **không có** `task_status_enum`; `work_tasks.status` và `contract_events.status` là `text` nullable (02-hop-dong §7 M8).
- **[CODE]** `salary-actions.ts:259,355` lọc `status = "Hoàn thành"` trong khi giá trị thật là `hoan_thanh` → `validatePayrollWarningsAction` **chưa từng cảnh báo lần nào** (04-crm-nhan-su §7).

Cái thứ hai sống được **chính vì** cái thứ nhất. Cùng họ với ca `CASE` enum thiếu `::text` làm hụt chi phí vendor 18 ngày (`vault/60-bay/bay-du-lieu.md:10`).

### 5.4 — Ranh giới quyền nằm ở TypeScript, không ở DB

- `withAuth` cấp **admin client cho mọi server action** (`lib/auth_utils.ts:411`) → RLS không phải cổng cho đường server action.
- Edge middleware **CÓ**: `proxy.ts` (Next 16 đổi tên từ middleware.ts — đính chính 01/09; các bản đồ trước quét tên cũ nên kết luận sai). Nó chặn chưa-đăng-nhập + bơm danh tính header. Nhưng `/crm/*`, `/settings`, `/admin/*` **không có role-gate tầng route** — vai trò chỉ enforce bằng `require*Access` trong action.
- `withContractAccess/WriteAccess/DestructiveAccess` (`lib/auth_utils.ts:852-877`) định nghĩa nhưng **0 call-site**.
- `sale` thao tác được lead người khác: `assertLeadVisibleToRole` chỉ gọi ở `updateLead`/`getLeadById`; toàn bộ `lead-lifecycle.ts` chỉ kiểm `requireCrmAccess`.
- **Ngược lại**, nhánh **client-direct** (browser đọc 6 bảng bằng anon key) **thì** dựa RLS — và **[DB]** RLS ở đó **đúng và đủ** (§6).

Kết luận: hai mô hình bảo mật song song. Sửa một guard TS = sửa bảo mật thật.

### 5.5 — `customers.created_by` chứa hai loại id

`createCustomer` ghi auth user id (`customer-actions.ts:168`); `convert_lead_to_customer` ghi `employees.id` (`20260427030000:152`). Cột **không có FK** nên DB không chặn. Mọi truy vấn join cột này sai một phần số dòng.

---

## 6. Sổ rủi ro — đã đo, cần bạn quyết

### R1 — Huỷ hợp đồng có đơn in sẽ **fail toàn bộ transaction**  🔴 [DB]

`cancel_contract_cascade` ghi `printing_orders.status='da_huy'` trên dòng `deleted_at IS NULL`; CHECK constraint chỉ cho `cho_xu_ly · dang_in · da_in · hoan_thanh · huy_don · gap_su_co` ⇒ lỗi 23514.

| Đo trên DB 31/08 | |
|---|---|
| Hợp đồng **không huỷ được** | **5** |
| Đơn in đang sống | 33 |
| Đơn in mang `da_huy` | **0** ⇒ hàm chưa từng ghi thành công kể từ 24/08 |
| Hợp đồng `da_huy` hiện có | **0** ⇒ chưa ai chạm tới |
| `printing_orders_status_check` validated | `true` |

**Sửa:** đổi `'da_huy'` → `'huy_don'` trong nhánh `printing_orders` của hàm. Là **sửa hàm trên DB production** ⇒ cần cổng người + ADR.

### R2 — Hoàn tiền HĐ đã huỷ làm lệch lãi/lỗ  🟡 [DB: chưa phát tác]

`createContractRefundExpense` ghi `expenses(contract_id, payee_type='other')` cho HĐ `da_huy`; ledger gom mọi phiếu `other` có `contract_id` vào `cost_direct` **không lọc trạng thái HĐ** (`20260827130000:32`), trong khi `revenue_contract` **loại** `da_huy` (`:45`).
→ Chi phí vào sổ, doanh thu không. **[DB]** hiện 0 phiếu / 0đ vì chưa có HĐ nào bị huỷ. Nổ cùng lúc với R1.

### R3 — Nút "Xoá giao dịch" ở `/inventory` không bao giờ chạy được  🟡 [CODE]

`deleteInventoryTransaction` (`app/actions/inventory-mutations.ts:619`) chỉ nhận `source_type` NULL/`'manual'`; không RPC nào ghi `'manual'` và migration `20260507103000:48-55` đã backfill hết NULL.

### R4 — Bốn server action gallery không kiểm token  🟡 [CODE — cần đánh giá]

`getPublicGalleryStats`, `getReactionCounts`, `getClientReactions`, `getCommentCountsPerImage`; thêm `/api/drive-download/[fileId]` không kiểm gì. Chưa đánh giá mức độ lộ.

### R5 — Ba cache tag là no-op  🟢 [CODE]

`contract-list`, `contract-stats` (`lib/server-cache-invalidation.ts:4-5`), `studio-info` (`settings-mutations.ts:262`) được `revalidateTag` nhưng **không producer nào gắn tag**. Ai tin "invalidate xong là tươi" sẽ sai.

### R6 — Prefetch `/dresses` chắc chắn lỗi 42501  🟢 [CODE]

`lib/hooks/use-prefetch-on-hover.ts:95` query `dresses` (cả `purchase_price`) từ browser, trong khi bảng đã `REVOKE` khỏi `authenticated` (`20260429110000:10`).

---

## 7. Sổ mâu thuẫn tài liệu

**~50 mục**, chi tiết ở §7 của 6 file. Dạng lặp lại nhiều nhất:

1. **Vault mô tả thứ đã bị DROP** — `upsert_vendor_expense`, `upsert_printing_expense`, `lab_payments`/`vendor_payments`, trạng thái `dat_coc`.
2. **Vault nói realtime dùng `postgres_changes`** — thực tế 100% đã chuyển sang `realtime_signals` từ `20260714040000`. Sai ở 3 file vault + 1 comment trong chính code (`finance-realtime-refresh.tsx:12-13`).
3. **Vault cấm client-direct** — thực tế có nhánh client-direct chủ đích, kèm hạ tầng RLS riêng.
4. **Vault mô tả cổng trạng thái HĐ là "cảnh báo mềm"** — thực tế `VALID_TRANSITIONS` **throw**; hàm `canMoveTo` vault nhắc **không tồn tại**.
5. **Mọi số đếm trong vault đã cũ** (số bảng, số dòng, số RPC, số migration). Dùng số trong file này hoặc hỏi DB.
6. **Vault mâu thuẫn chính nó** — `in-an-lab.md:25` vs `:29`; `tai-chinh.md:36` vs `luoc-do-tai-chinh.md:27`.

**Đề xuất:** vault nên có nhãn "đã đối chiếu code ngày ___" cho từng file. Hiện `cap-nhat: 2026-08-07` nhưng nội dung được sửa lẻ tẻ tới 27/08 → không biết phần nào còn tin được.

---

## 8. Sổ chưa xác minh

**~70 mục [?]** trải trên 6 file. Phần lớn rơi vào đúng một nguyên nhân: **cần hỏi DB, mà agent bị cấm chạm DB.**

Nhóm lớn nhất:
- Thân thật của `process_contract_payment_v2`, `recalc_contract_totals`, `finance_reports_snapshot`, `finance_debt_stats` trên prod
- Mọi số dòng bảng
- Nội dung policy RLS (đã có **số lượng** policy — xem §6 — nhưng chưa đọc **nội dung**)
- Danh sách RPC còn sống trên DB ngoài 107 cái được code gọi
- `NEXT_PUBLIC_RPC_V3` và `ALLOW_SETTINGS_JWT_ADMIN_FALLBACK` trên production
- Realtime có bắn event thật không (SUBSCRIBED ≠ có event — `bay-du-lieu.md:7`)

**Việc gỡ được cả nhóm này bằng một hành động:** dump lược đồ thật từ DB (`pg_proc`, `pg_policies`, `pg_constraint`, `information_schema`) rồi diff với repo. Chỉ đọc, an toàn. Đây nên là việc kế tiếp.

---

## 9. Đề xuất thứ tự việc

1. **Dump schema thật + diff repo** → đóng ~70 mục [?], và cho biết repo lệch DB tới đâu.
2. **Sửa R1** (5 hợp đồng đang không huỷ được) — nhỏ, đã rõ nguyên nhân, cần cổng người.
3. **Sửa quy trình migration** (`migrate-direct.mjs`) để repo ngừng trôi khỏi DB — nếu không, mọi bản đồ đều sẽ cũ lại.
4. ~~**Đóng 2 công thức tiền song song** (§5.2) — trả `buildCloseSnapshot` và `finance_cashflow_timeline` về đọc ledger.~~ → **xong 11/09/2026, bước #23**.
5. **Danh mục bất biến chạy trên dữ liệu thật** — giờ mới đủ căn cứ để viết, vì đã biết nguồn chân lý là hàm nào (§4).

---

## Phụ lục — số đo

| | |
|---|---|
| Trang | 61 (54 protected · 7 công khai) |
| API route | 27 |
| File server action | 85 |
| RPC được code gọi | 107 |
| Migration | 203 |
| Bảng · view · function · enum (theo types) | 93 · 2 · 124 · 16 |
| Bảng gắn trigger `emit_realtime_signal` | 35 |
| Bảng trong publication realtime | **1** (`realtime_signals`) |
