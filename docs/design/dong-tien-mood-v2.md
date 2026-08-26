# Thiết kế dòng tiền Mood v2 — "Ba sổ, một hợp đồng"

**Trạng thái:** đề xuất kiến trúc **bản 2** (sửa sau khi user đính chính mảng thiệp), chờ user duyệt → ghi ADR-016 và tách milestone spec. **Ngày:** 2026-08-25.
**Đầu vào:** báo cáo rà soát `docs/reports/audit_2026-08-25_luong-du-lieu-nghiep-vu.md` + trả lời của user cùng ngày:
1. Mood **kinh doanh thêm thiệp cưới: tự nhập phôi lô lớn, tồn kho, tự in tại Mood theo đơn khách** (khách lẻ hoặc khách hợp đồng mua kèm). Chỉ **hình cưới** mới đẩy cho lab. *(Bản 1 của thiết kế này hiểu sai là đặt xưởng ngoài — đã sửa toàn bộ §5.)*
2. Ngoài phôi thiệp, studio **không tồn kho** phôi album/vật tư ảnh.
3. Ekip nội bộ **tính chi phí theo hợp đồng** (chưa có lương tháng; sau này sẽ có → thiết kế sẵn).
4. **Dòng tiền đang rối nhất** — cần thiết kế lại thu / chi / báo cáo vận hành theo hướng đúng.

---

## 0. Quyết định trong 6 dòng

1. **`expenses` trở lại đúng nghĩa "phiếu chi" = tiền rời két.** Bỏ việc tạo phiếu chi *trích trước* cho lab và thợ ngoài (43 dòng hiện tại). Chi phí cam kết đọc thẳng từ **bản ghi gốc** (`work_tasks.cost`, `printing_orders.total_amount`, `inventory_transactions` nhập/xuất).
2. **Một sổ tiền ra cho mọi đối tác:** phiếu chi có `payee_type` (lab ảnh · thợ ngoài · nhà cung cấp phôi · nhân sự · khác) + **`expense_allocations`** phân bổ vào đơn in / task / lô nhập phôi / kỳ lương — thay `lab_payments` + `vendor_payments` + 2 bảng phân bổ. Lương **đã** đi đúng đường này (`payEmployeeSalaryAction` tạo phiếu chi khi trả) → kéo các nhánh còn lại về cùng cách.
3. **Hai loại phiếu thu, một két:** `payments` (khách hợp đồng, luôn có `contract_id`) và `receipts` (bán lẻ thiệp/dịch vụ lẻ, không hợp đồng). Khách hợp đồng mua thiệp → đi **"Bán thêm HĐ"** (RPC có sẵn) để mang `contract_id`, không đi bán lẻ.
4. **Thiệp = kinh doanh vật tư tự in.** Module kho là module sống: phôi = SKU, nhập lô → **phải trả nhà cung cấp phôi** (cam kết) → trả bằng phiếu chi; xuất theo đơn khách → **giá vốn (COGS)** vào lãi/lỗ. Hai chỗ đang thiếu chính là hai mũi tên này.
5. **Nhân sự:** chi phí hợp đồng = `work_tasks.cost` (khi hoàn thành); tiền ra = phiếu chi lương. Lương cứng sau này = **overhead theo tháng**, không chạm lợi nhuận từng hợp đồng. Công in thiệp tại Mood (nếu trả theo đơn) = task; mực/máy = overhead.
6. **Ba con số trên dashboard, mỗi số một nghĩa:** *Két* (thu − chi thật), *Lãi/lỗ* (cam kết: doanh thu − chi phí − giá vốn − overhead), *Công nợ* (phải thu / phải trả). Không còn "lợi nhuận = tiền vào két − cam kết".

---

## 1. Nghiệp vụ Mood theo lời user

| Mảng | Doanh thu ghi ở | Ai thực hiện | Chi phí gốc | Trả tiền cho ai |
|---|---|---|---|---|
| **Gói chụp** (phóng sự cưới, combo, baby, media) | `contracts` `hop_dong` | Ekip nội bộ (theo HĐ; sau này thêm lương cứng) + thợ ngoài + **lab ảnh** | `work_tasks.cost`, `printing_orders.total_amount` | Ekip (kỳ lương), thợ ngoài (theo task), lab (theo đơn) |
| **Thiệp cưới** — tự in | Khách lẻ: `receipts` · Khách HĐ: "Bán thêm HĐ" (`inventory_transactions.contract_id` + `receipts.contract_id`) | Mood tự in từ **phôi tồn kho** | `inventory_transactions` nhập (phải trả NCC phôi) và xuất (COGS) | Nhà cung cấp phôi (theo lô nhập) |

Ba loại đối tác ngoài (lab ảnh, thợ ngoài, nhà cung cấp phôi) nhưng **cùng một vòng đời tiền**: cam kết → phải trả → trả (một phần / nhiều lần) → hết nợ.

## 2. Gốc rối hiện tại (đã đo)

| Nhánh | Cam kết ghi ở | Tiền thật ghi ở | Báo cáo đọc |
|---|---|---|---|
| Lab ảnh | `expenses` "[Auto-Print]" 33 dòng, `payment_method='chuyen_khoan'` **dù còn nợ 1.905.000** | `lab_payments` 26 · 7.936.400 | chỉ `expenses` |
| Thợ ngoài | `expenses` 10 dòng (trích khi task hoàn thành) | `vendor_payments` 5 · 11.850.000 | chỉ `expenses` |
| Lương ekip | không (đúng) | `expenses` khi trả (`payEmployeeSalaryAction`) | `expenses` (đúng) |
| Phôi thiệp (NCC "Xưởng thiệp cưới HD" — 3 cách viết) | **không** — 4 lô nhập 2.880.000 chỉ nằm ở `inventory_transactions.total_cost` | **không** | `finance_reports_snapshot` đọc COGS; dashboard/ledger không |

→ `finance_dashboard_metrics`: `profit = (payments + receipts) − expenses` = **tiền vào két − cam kết lab/thợ − tiền lương thật − 0đ phôi**. `finance_revenue_by_month` = tiền thu (cash) nhưng UI gọi "doanh thu". 0/10 RPC tài chính đọc `lab_payments`/`vendor_payments`. `finance_contract_profit_report` không cộng COGS kho khi xuất cho hợp đồng (bản app `finance-dashboard-queries.ts:284` có cộng → hai bản lệch nhau).

Nguyên nhân gốc: **một bảng "phiếu chi" gánh hai nghĩa** (cam kết + tiền thật), mỗi nhánh chọn một nghĩa; và **kho có đầu vào/đầu ra tiền nhưng không nối vào sổ nào**.

## 3. Mô hình đích — Ba sổ

```
              ┌──────────────── SỔ CAM KẾT (không phải bảng — là bản ghi gốc) ─────────────────────────┐
              │  Doanh thu:  contracts.total_amount · receipts (bán lẻ)                                 │
              │  Chi phí HĐ: work_tasks.cost (khi hoan_thanh) · printing_orders.total_amount           │
              │              · inventory_transactions stock_out.total_cost (COGS, khi xuất cho HĐ)      │
              │  Phải trả:   + inventory_transactions stock_in.total_cost (nợ NCC phôi)                 │
              │  Overhead:   fixed_costs.monthly_amount · employee_salaries.base_salary · mực/máy in     │
              └───────────────┬───────────────────────────────────────┬─────────────────────────────────┘
                              │ phải thu                              │ phải trả
                              ▼                                       ▼
   SỔ TIỀN VÀO  payments (PT-…, contract_id)        SỔ TIỀN RA  expenses (PC-…, payee_type/payee_id)
                receipts (bán lẻ, có thể contract_id)              expense_allocations → đơn in / task / lô nhập / kỳ lương
                payment_plans = lịch thu                          (expense không allocation + contract_id = chi trực tiếp)
```

### 3.1 Quy tắc ghi nhận (áp cho mọi RPC/báo cáo)

| Sự kiện | Sổ | Bản ghi | Thời điểm |
|---|---|---|---|
| Ký hợp đồng | Cam kết (doanh số ký) | `contracts` | `contract_date` |
| Hoàn thành hợp đồng | Cam kết (doanh thu ghi nhận) | `contracts.status = hoan_thanh` | tháng hoàn thành |
| Khách hợp đồng trả tiền | Tiền vào | `payments` | `payment_date` |
| **Nhập lô phôi thiệp** | Cam kết (**phải trả NCC**) + tồn kho tăng | `inventory_transactions` `stock_in` (`total_cost`) | `created_at` |
| **Bán thiệp lẻ** | Doanh thu + **COGS** + tiền vào | `create_sale_receipt_atomic` → `stock_out` (`total_cost` = giá vốn) + `receipts` | ngày phiếu |
| **Khách HĐ mua thiệp** | Doanh thu HĐ + COGS gắn HĐ | `create_contract_inventory_addon_sale_atomic` → `stock_out` có `contract_id` + `receipts.contract_id` | ngày phiếu |
| Task ekip / thợ ngoài hoàn thành | Cam kết (chi phí HĐ) | `work_tasks.cost`, `status = hoan_thanh` | `completion_date` |
| Tạo đơn in ảnh (lab) | Cam kết (chi phí HĐ) | `printing_orders.total_amount` | `order_date` |
| Trả lab / thợ ngoài / NCC phôi / lương | Tiền ra | `expenses` + `expense_allocations` | `expense_date` |
| Chi trực tiếp cho HĐ không qua nguồn (thuê xe, hoa…) | Cam kết **và** tiền ra cùng lúc | `expenses` có `contract_id`, **không** allocation | `expense_date` |
| Chi vận hành (mặt bằng, mực in, marketing…) | Overhead + tiền ra | `expenses` không `contract_id` | `expense_date` |

Hệ quả: phiếu chi **có** allocation = thanh toán nợ, không phải chi phí mới; phiếu chi **không** allocation = chi phí thật phát sinh. Không có phiếu chi "ảo". Giá vốn phôi vào lãi/lỗ **lúc xuất** (bán), không phải lúc nhập — lúc nhập chỉ là tồn kho + nợ NCC.

### 3.1b Luật ngày ghi sổ — chốt bởi Claude theo uỷ quyền của user (25/08)

User: *"đợt rồi mình bỏ bê hệ thống không update kịp thời, có job đã done mà hôm nay mới update"* → đo: 33 HĐ hoàn thành chỉ 15 bấm cùng tháng với ngày chụp, 8 bấm muộn >30 ngày; 22/26 lần trả lab nhập cùng ngày 25/08 (modal có ô ngày nhưng `labPaymentSchema` bỏ rơi `payment_date`, bảng `lab_payments` không có cột ngày); `work_tasks.completion_date = now()` lúc bấm. **Kết luận: ngày trạng thái không được dùng làm ngày ghi sổ.**

| Con số | Ngày ghi sổ | KHÔNG dùng |
|---|---|---|
| Doanh thu HĐ (lãi/lỗ tháng) | `contracts.work_date` (ngày chụp), fallback `contract_date`; loại `status='da_huy'` | `status='hoan_thanh'`, `updated_at` |
| Doanh số ký | `contracts.contract_date` | — |
| Chi phí task | `contract_events.event_date` (qua `work_tasks.event_id`), khi `status='hoan_thanh'` | `completion_date` (= giờ bấm) |
| Đơn in | `printing_orders.order_date` (nhập lúc tạo) | `created_at`/`updated_at` |
| Nhập/xuất kho | ngày giao dịch (`inventory_transactions.created_at`, sẽ cho sửa) | — |
| Phiếu thu / phiếu chi | `payment_date` / `expense_date` nhập trên phiếu | `created_at` |

Hệ quả thiết kế: mọi form ghi tiền phải có ô ngày (mặc định hôm nay, sửa được), mọi RPC phải nhận ngày, mọi báo cáo theo tháng chỉ đọc cột ngày nghiệp vụ. Câu hỏi "tháng ký hay tháng hoàn thành" biến mất: là **tháng chụp**.

### 3.2 Công nợ

- **Phải thu** (đã có): `contracts.total_amount − Σ payments` — `remaining_amount`, `get_receivable_aging`.
- **Phải trả** (hợp nhất, 1 màn hình thay `/finance/lab-debts` + `/finance/vendor-debts` + thêm NCC phôi): theo `payee`:
  `Σ printing_orders.total_amount (lab) + Σ work_tasks.cost hoàn thành (thợ ngoài) + Σ stock_in.total_cost (NCC phôi) + Σ employee_salaries.net_salary (nhân sự) − Σ expense_allocations`.

## 4. Sáu báo cáo chuẩn — công thức từ bảng nào

| # | Báo cáo | Công thức | Thay cho |
|---|---|---|---|
| 1 | **Két tháng** (cash) | `Σ payments + Σ receipts (theo ngày) − Σ expenses (expense_date)` | `finance_dashboard_metrics` (hiện trộn) |
| 2 | **Lãi/lỗ tháng** (accrual) | `Σ contracts.total_amount hoàn thành trong tháng + Σ receipts bán lẻ − Σ work_tasks.cost hoàn thành − Σ printing_orders.total_amount tạo − Σ stock_out.total_cost (COGS) − Σ expenses trực tiếp không allocation − overhead` | chưa có |
| 3 | **Lãi/lỗ theo hợp đồng** | `total_amount + Σ receipts.contract_id (bán thêm) − Σ work_tasks.cost (tất cả) − Σ printing_orders.total_amount − Σ stock_out.total_cost (contract_id) − Σ expenses(contract_id, không allocation)` | **một hàm SQL `contract_financials(uuid[])`** cho 5 nơi đang tự tính (`finance_contract_profit_report`, `get_contract_list_v2` cột thêm 25/08, `getContractFinanceDetails`, `contract-profit.ts` dead, fallback) — bỏ hack `[Auto-Print]`, bỏ lọc `vendor_id IS NULL`, **thêm COGS kho** |
| 4 | **Doanh số ký** | `Σ contracts.total_amount` theo `contract_date` | `finance_revenue_by_month` đổi tên "Tiền thu theo tháng"; thêm hàm này |
| 5 | **Phải thu** | như hiện tại | giữ |
| 6 | **Phải trả theo đối tác** | §3.2 | `finance_lab_debt_summary` + `finance_vendor_debt_summary` → `finance_payable_summary()` |
| 6b | **Lãi/lỗ mảng thiệp** | `Σ receipts "Bán vật tư" + Σ bán thêm HĐ − Σ stock_out.total_cost − công in − mực` | chưa có; lọc từ 2 |

Dashboard hiển thị đúng 3 khối: *Két* (1) · *Lãi/lỗ* (2) · *Công nợ* (5+6). Chữ "lợi nhuận" chỉ xuất hiện ở (2), (3), (6b).

## 5. Thiệp cưới — kinh doanh vật tư tự in, chạy trên module kho

```
NCC phôi ──nhập lô──► stock_in (tồn ↑, PHẢI TRẢ NCC) ──phiếu chi──► hết nợ
                          │
   khách đặt ──► Mood in tại chỗ (công: task | overhead; mực: overhead)
                          │
                          ▼
              stock_out theo đơn (tồn ↓, COGS = qty × giá vốn bình quân)
                 ├─ khách lẻ  ──► receipts "Bán vật tư"                (create_sale_receipt_atomic — đã có)
                 └─ khách HĐ  ──► receipts.contract_id + stock_out.contract_id  (create_contract_inventory_addon_sale_atomic — đã có, 0 lần dùng)
```

| Đang có | Thiếu / sai | Sửa |
|---|---|---|
| SKU phôi theo mẫu (`VT-016 Thiệp Cưới - HD527`…), giá vốn bình quân, nhập/xuất atomic, phiếu thu bán lẻ atomic | Nhập lô không tạo **phải trả NCC**, không có phiếu chi → 2.880.000đ vốn phôi vô hình với két và công nợ | `stock_in` = cam kết phải trả (payee = NCC phôi); phiếu chi `payee_type='supplier'` + allocation `inventory_transaction`. Form nhập kho hỏi "đã trả ngay?" → tạo phiếu chi luôn |
| `supplier` là text (3 cách viết cho 1 NCC) | Không có đối tác để treo công nợ | `inventory_items.supplier_id → vendors` (mở rộng `vendors` = "đối tác ngoài", thêm loại `nha_cung_cap`); chuẩn hoá 3 tên → 1 |
| RPC "Bán thêm HĐ" có `contract_id` | Chưa dùng lần nào (0/9) — 4 lần bán vừa qua đều bán lẻ (SĐT không khớp khách HĐ → có thể là khách lẻ thật) | Quy tắc: SĐT khớp khách HĐ → UI gợi ý "Bán thêm HĐ"; COGS gắn HĐ vào báo cáo 3 |
| COGS có sẵn ở `stock_out.total_cost` | Không vào lãi/lỗ HĐ (RPC) và dashboard | báo cáo 2, 3, 6b cộng COGS |
| Công in tại Mood | Không ghi nhận | Trả theo đơn → `work_tasks` (`work_type` thêm `in_thiep` hoặc dùng `khac`) gắn HĐ/đơn; mực/máy → `fixed_costs`/phiếu chi vận hành |

Không cần bảng mới cho thiệp. `printing_orders`/`labs` giữ nguyên nghĩa **lab ảnh** — không dùng cho thiệp.

## 6. Nhân sự — nay và sau, không đếm trùng

| | Cam kết (vào lãi/lỗ) | Tiền ra |
|---|---|---|
| **Nay** — ekip theo hợp đồng | `work_tasks.cost` khi task hoàn thành → chi phí **của hợp đồng đó** | kỳ lương tháng: `product_salary = Σ cost` → phiếu chi lương (đã có) + allocation vào `employee_salaries` |
| **Sau** — thêm lương cứng | `employee_salaries.base_salary` → **overhead tháng** (báo cáo 2), không gán hợp đồng | cùng phiếu chi lương (base + product) |
| Thợ ngoài | `work_tasks.cost` (vendor) khi hoàn thành | phiếu chi payee = vendor + allocation vào task |
| Công in thiệp | task `in_thiep` nếu trả theo đơn; nếu người in là nhân sự lương cứng → đã nằm trong overhead | như trên |

Luật: một đồng chi phí nhân sự chỉ ở **một** trong hai chỗ — `work_tasks.cost` (theo hợp đồng/đơn) *hoặc* `base_salary` (overhead). Cả hai đều **trả** bằng phiếu chi lương → tiền ra không bao giờ trùng.

## 7. Ảnh hưởng: giữ / đổi / bỏ

| Đối tượng | Quyết định |
|---|---|
| `expenses` | **Giữ**, thêm `payee_type` (`lab`·`vendor`·`supplier`·`employee`·`other`), `payee_id`; mã `PC-…` |
| `expense_allocations` | **Mới** — `expense_id`, `target_type` (`printing_order`·`work_task`·`inventory_transaction`·`employee_salary`), `target_id`, `amount` |
| `lab_payments`, `lab_payment_allocations`, `vendor_payments`, `vendor_payment_allocations` | **Di trú** vào `expenses` + `expense_allocations` rồi **bỏ**; `record_lab_payment_atomic` / `record_vendor_payment_atomic` → 1 hàm `record_payee_payment_atomic(payee_type, payee_id, amount, allocations)` |
| `upsert_printing_expense`, `upsert_vendor_expense`, trigger `work_task_vendor_expense_sync` | **Bỏ** (không còn phiếu chi trích trước) |
| `finance_contract_profit_report`, `get_contract_list_v2` (financials), `getContractFinanceDetails`, `contract-profit.ts`, `getContractProfitReportFallback` | **Gom về `contract_financials(uuid[])`** (báo cáo 3, có COGS kho) |
| `finance_dashboard_metrics`, `finance_ledger*`, `get_cashflow_forecast`, `finance_reports_snapshot`, `get_finance_intelligence` | **Tách + đổi nhãn**: két (1) vs lãi/lỗ (2); một bộ sổ cho tất cả |
| `finance_revenue_by_month` | đổi tên "tiền thu"; thêm "doanh số ký" |
| `finance_lab_debt_summary`, `finance_vendor_debt_summary` | → `finance_payable_summary()` theo payee (thêm NCC phôi) |
| `payments` / `payment_plans` / `receipts` / `create_sale_receipt_atomic` / `create_contract_inventory_addon_sale_atomic` | **Giữ** nguyên |
| `inventory_items` | thêm `supplier_id → vendors`; chuẩn hoá 3 tên NCC |
| `inventory_stock_in_atomic` | **Đổi**: ghi nhận phải trả NCC (payee); tuỳ chọn tạo phiếu chi ngay |
| `vendors` | mở rộng thành "đối tác ngoài": thêm `vendor_type` (`tho_ngoai`·`nha_cung_cap`) |
| `work_type_enum` | thêm `in_thiep` (tuỳ chọn, M5) |
| Module kho | **Giữ, là module sống**; Phase B spec dead-code vẫn dọn phần *printing-phase-1* (`inventory_reservations`, `reservation_id`, 2 view, `order_payments`) — không liên quan luồng phôi |
| `printing_orders.payment_status` | **Dẫn xuất** từ allocation (không ghi tay) |
| vault `luong-tien.md`, `tai-chinh.md`, `in-an-lab.md`, `vat-tu.md`, `nha-cung-cap.md` | viết lại theo §3–§5 |

## 8. Di trú dữ liệu (số đo 25/08, phải đối soát khi chạy)

| Bước | Dữ liệu | Kiểm |
|---|---|---|
| 1 | 26 `lab_payments` (7.936.400) → 26 `expenses` payee=lab + allocation từ `lab_payment_allocations` | `Σ expenses(lab) = 7.936.400`; nợ lab theo hàm mới = 1.905.000 (= `printing_stats.unpaid_cost` hiện tại) |
| 2 | 5 `vendor_payments` (11.850.000) → 5 `expenses` payee=vendor + allocation | `Σ = 11.850.000`; nợ vendor = 13.200.000 − 11.850.000 − (task chưa hoàn thành 1.350.000) = 0 |
| 3 | 43 phiếu chi trích trước ([Auto-Print] 33 + vendor 10) → `deleted_at` (giữ audit) | `Σ expenses` tháng 5–8 giảm 21.691.400, tăng 19.786.400 → két thật |
| 4 | 3 tên NCC phôi → 1 `vendors` loại `nha_cung_cap`; `inventory_items.supplier_id` cho 3 SKU; 4 lô `stock_in` (2.880.000) thành phải trả NCC — **user cho biết đã trả chưa** → nếu đã trả: 1–4 phiếu chi `payee=supplier` allocation vào 4 lô | phải trả NCC phôi = 2.880.000 − Σ phiếu chi |
| 5 | `printing_orders.payment_status` tính lại từ allocation | 25 đơn `da_thanh_toan` hiện tại phải giữ nguyên |
| 6 | Lãi/lỗ 60 hợp đồng trước/sau | chênh **0** (bỏ lọc vendor + bỏ expenses vendor bù trừ đúng nhau; COGS kho gắn HĐ hiện = 0 dòng nên chưa đổi) |
| 7 | 4 `receipts` bán thiệp | **giữ nguyên** — là bán lẻ thật (SĐT không khớp khách HĐ); chỉ bổ sung COGS đã có sẵn ở `stock_out` vào báo cáo |

## 9. Lộ trình — mỗi milestone có cổng đối soát

| M | Nội dung | Cổng |
|---|---|---|
| **M1 Sổ tiền ra** | `expenses.payee_*`, `expense_allocations`, `record_payee_payment_atomic`, di trú 1–3, bỏ 2 hàm trích trước + trigger, `contract_financials()` thay 5 bản sao, `finance_payable_summary`, màn công nợ hợp nhất | §8 bước 1–3, 6; dashboard "chi" tháng 8 = tiền thật |
| **M2 Ba số dashboard** ✅ 26/08 | tách két / lãi-lỗ / công nợ (`finance_month_summary`); RPC báo cáo 1, 2, 4 trên một sổ kỳ `finance_period_ledger`; `/reports` + timeline đổi nguồn; màn `/finance/payables` hợp nhất; app bỏ đọc view; DROP `finance_dashboard_metrics`/`finance_revenue_by_month` | `verify:reports` assert 4 hàm cùng số; e2e `cashflow-m2` đo delta T7/T8; vault cập nhật — spec `T-20260826-cashflow-m2-ba-so` |
| **M2b Dọn bảng cũ** (≥ 02/09) | DROP 4 view + 4 bảng `_legacy` + `record_vendor_payment_atomic` (`20260826130000_cashflow_m2b_drop_legacy.sql`, đã viết, chưa áp) | pre-check trong migration; `db:types` + vault regen |
| **M3 Thiệp & kho** | `vendors.vendor_type`, `inventory_items.supplier_id`, `stock_in` → phải trả + phiếu chi tuỳ chọn, COGS vào báo cáo 2/3/6b, gợi ý "Bán thêm HĐ" khi SĐT khớp, di trú bước 4 | nhập 1 lô → nợ NCC hiện; trả → hết nợ; bán 1 đơn → lãi = giá bán − giá vốn |
| **M4 Tiền vào** | quy tắc khách HĐ mua thiệp qua "Bán thêm HĐ"; `receipts` giữ cho bán lẻ; category thu chuẩn hoá | Σ `payments` + Σ `receipts` = két vào; không phiếu thu khách HĐ thiếu `contract_id` |
| **M5 Nhân sự** | allocation phiếu chi lương → `employee_salaries`; `base_salary` → overhead báo cáo 2; `in_thiep` task nếu trả công theo đơn; dọn dòng test 100.000.000 | kỳ lương thử: cam kết vs tiền ra khớp |

M1 là đợt duy nhất chạm dữ liệu tài chính lịch sử — làm trên branch, chạy di trú thử trong transaction, có bảng before/after cho 60 hợp đồng trước khi áp.

## 10. Đã cân nhắc và bác

- **Thiệp = đơn đặt in ngoài (`printing_orders` tới "xưởng thiệp")** — bản 1 của thiết kế này. **Bác** sau khi user đính chính: Mood tự in từ phôi nhập lô, có tồn kho thật → mô hình kho đúng, chỉ thiếu 2 mũi tên tiền.
- **Bán lẻ thiệp = hợp đồng `hoa_don`** (bỏ `receipts`) — bản 1. **Bác**: pipeline `create_sale_receipt_atomic` (xuất kho + phiếu thu trong 1 transaction) đã đúng và đang dùng; ép qua hợp đồng thêm ma sát (tạo khách, lịch thu) mà không thêm thông tin. Két đọc cả `payments` lẫn `receipts` — vẫn một két.
- **Giữ trích trước trong `expenses`, thêm `paid_amount`/status** — rẻ hơn M1, nhưng "phiếu chi" mãi mang hai nghĩa và lương (đang đúng) phải đổi sang trích trước.
- **Gộp `labs` + `vendors` + NCC phôi thành một bảng ngay** — đúng hướng nhưng đụng 3 module; hợp nhất ở **tầng phiếu chi** (`payee_type`) trước, `vendors` mở rộng thành "đối tác ngoài" cho NCC phôi vì đã có sẵn thanh toán/phân bổ. Gộp `labs` vào để sau.
- **Đóng băng module kho** — bản 1. **Bác**: kho là xương sống mảng thiệp.

## 11. Trạng thái 4 điểm (cập nhật sau trả lời lần 2 của user, 25/08)

1. Mô hình **ba sổ** + xoá 43 phiếu chi trích trước — user "chưa hiểu mô hình" → giải thích bằng 2 câu chuyện thật ở §12 + artifact "Một Hợp Đồng Đi Qua Ba Sổ". **Chờ gật.**
2. Tháng hoàn thành vs tháng ký — user chưa hiểu "tháng ký" → định nghĩa + ví dụ số ở §12. **Chờ chọn.** (Đề xuất: tháng hoàn thành.)
3. **CHỐT:** phôi nhập về **trả tiền ngay** (chưa ngâm công nợ được). → Form nhập kho mặc định "Đã trả" → `inventory_stock_in_atomic` tạo phiếu chi `payee_type='supplier'` + allocation vào lô ngay trong transaction. Giữ tuỳ chọn "chưa trả" (treo phải trả) cho tương lai, mặc định tắt. Di trú §8 bước 4: 4 lô cũ (2.880.000) → 4 phiếu chi đã trả, nợ NCC = 0.
4. **CHỐT:** công in thiệp **tính vào giá bán** (số lượng xuất còn ít) → không tạo task `in_thiep`; lãi mảng thiệp = giá bán − giá vốn phôi − hao hụt; mực/máy = phiếu chi vận hành khi mua. Bỏ đề xuất `work_type` `in_thiep` khỏi M5. Thứ tự M1→M5 giữ nguyên trừ khi user đổi.

## 12. Giải thích bằng hai câu chuyện thật (cho câu 1 và 2)

**HĐ-2026-0009 — Đinh Thị Nga, Chụp phóng sự cưới 3.500.000đ** (số lấy nguyên từ DB):
- 24/05 ký + cưới; cọc 500.000 (CK); thợ ngoài Bảo Nguyên chụp, công 1.100.000, task hoàn thành trong ngày; đơn in IN-260524-00006 "Tiệc 13x18 ép nhựa ×100" 280.000 (lab Hồng Bảo). **Hôm nay:** hệ thống tự tạo 2 phiếu chi 24/05 (1.100.000 + 280.000, "chuyển khoản") dù chưa trả ai. **Ba sổ:** Cam kết *sẽ thu 3.500.000, sẽ trả 1.380.000*; Tiền vào +500.000; Tiền ra 0.
- 05/06 ekip hậu kỳ (2 task, 0đ). 10/06 tất toán 3.000.000 (TM) → hoàn thành.
- 25/08 trả thợ 1.100.000 + trả lab 280.000 → **hôm nay** vào `vendor_payments`/`lab_payments` không báo cáo nào đọc; **ba sổ**: 2 phiếu chi thật 25/08, phân bổ → công nợ về 0.

| Tháng | Tiền vào thật | Hôm nay "phiếu chi" | Hôm nay dashboard "lợi nhuận" | Ba sổ: Két | Ba sổ: Lãi/lỗ (tháng hoàn thành) | Ba sổ: Lãi/lỗ (tháng ký) |
|---|---:|---:|---:|---:|---:|---:|
| 5 | 500.000 | 1.380.000 (ảo) | −880.000 | +500.000 | −1.380.000 | +2.120.000 |
| 6 | 3.000.000 | 0 | +3.000.000 | +3.000.000 | +3.500.000 | 0 |
| 8 | 0 | 0 (trả thật 1.380.000 không đọc) | 0 | −1.380.000 | 0 | 0 |
| Σ | 3.500.000 | 1.380.000 | +2.120.000 | +2.120.000 | +2.120.000 | +2.120.000 |

Tổng luôn khớp 2.120.000 → không ai thấy "sai"; sai ở từng tháng, lệch hai hướng, cộng dồn 60 HĐ = cảm giác rối. **"Tháng ký"** = tháng ghi trên hợp đồng (24/05); **"tháng hoàn thành"** = tháng chuyển Hoàn thành (10/06); câu hỏi chỉ là 3.500.000 vào tháng 5 hay tháng 6 của báo cáo lãi/lỗ tháng.

**Lô phôi HD527, 3.000 tờ:** 02/05 nhập 1.500.000 trả ngay → hôm nay không phiếu chi (két không biết), ba sổ: phiếu chi 1.500.000, lãi/lỗ 0 (tiền thành tồn kho). 07/05 xuất nội bộ 30 tờ (15.000, lý do ghi "Xuất bán" — cần hỏi lại). 12/05 bán 2.950 tờ "DV Út Linh" 3.245.000 (1.100/tờ) → hôm nay: thu ✓, xuất ✓, giá vốn 1.475.000 có ghi nhưng không vào lãi/lỗ; dashboard tháng 5 thấy +3.245.000. Ba sổ: Két +1.745.000; Lãi/lỗ +1.755.000; tồn 20 tờ = 10.000.

**Đổi gì cho người dùng:** tạo HĐ/thu tiền/bán thiệp lẻ không đổi; giao task & tạo đơn in chỉ ghi "sẽ phải trả" (không lén tạo phiếu chi); trả thợ/lab ở một màn Công nợ → bấm Trả → phiếu chi thật; nhập phôi tự tạo phiếu chi; khách HĐ mua thiệp chọn "Bán thêm HĐ"; dashboard 3 số.
