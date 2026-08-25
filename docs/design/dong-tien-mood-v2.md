# Thiết kế dòng tiền Mood v2 — "Ba sổ, một hợp đồng"

**Trạng thái:** đề xuất kiến trúc, chờ user duyệt → sau đó ghi ADR-016 và tách milestone spec. **Ngày:** 2026-08-25.
**Đầu vào:** báo cáo rà soát `docs/reports/audit_2026-08-25_luong-du-lieu-nghiep-vu.md` + 4 câu trả lời của user cùng ngày:
1. Mood **kinh doanh lẻ in thiệp cưới** như một mảng riêng; khách hợp đồng có nhu cầu thì thiệp đi kèm hợp đồng.
2. Studio **không tồn kho** phôi album/vật tư; mọi thứ liên quan xuất ảnh đẩy qua lab.
3. Ekip nội bộ **tính chi phí theo hợp đồng** (chưa có lương tháng; sau này sẽ có → thiết kế sẵn).
4. **Dòng tiền đang rối nhất** — cần thiết kế lại thu / chi / báo cáo vận hành theo hướng đúng.

---

## 0. Quyết định trong 6 dòng

1. **`expenses` trở lại đúng nghĩa "phiếu chi" = tiền rời két.** Bỏ hẳn việc tạo phiếu chi *trích trước* cho lab và thợ ngoài (43 dòng hiện tại). Chi phí cam kết đọc thẳng từ **bản ghi gốc** (`work_tasks.cost`, `printing_orders.total_amount`), như hàm lợi nhuận hợp đồng vốn đã làm.
2. **Một sổ tiền ra** cho mọi đối tác: phiếu chi có `payee_type` (nhà in · thợ ngoài · nhân sự · khác) + **`expense_allocations`** phân bổ vào đơn in / task / kỳ lương — thay `lab_payments` + `vendor_payments` + 2 bảng phân bổ. Lương **đã** đi đúng đường này (`payEmployeeSalaryAction` tạo phiếu chi khi trả) → kéo lab/thợ ngoài về cùng cách.
3. **Một sổ tiền vào:** `payments` (phiếu thu `PT-…`) luôn có `contract_id`. Bán lẻ thiệp = hợp đồng `transaction_type = 'hoa_don'` (enum có sẵn, chưa dùng). `receipts` nghỉ hưu.
4. **Thiệp = đơn đặt in** tới "nhà in" (`labs` thêm `lab_type`: ảnh · thiệp). Module kho **đóng băng** — Mood không có tồn kho.
5. **Nhân sự:** chi phí hợp đồng = `work_tasks.cost` (khi hoàn thành); tiền ra = phiếu chi lương. Lương cứng sau này = **overhead theo tháng**, không chạm lợi nhuận từng hợp đồng.
6. **Ba con số trên dashboard, mỗi số một nghĩa:** *Két* (thu − chi thật), *Lãi/lỗ* (doanh thu cam kết − chi phí cam kết), *Công nợ* (phải thu / phải trả). Không còn "lợi nhuận = tiền vào két − cam kết".

---

## 1. Nghiệp vụ Mood theo lời user

| | Nguồn doanh thu | Ai thực hiện | Trả tiền cho ai |
|---|---|---|---|
| **Gói chụp** (phóng sự cưới, combo, baby, media) | Hợp đồng `hop_dong` | Ekip nội bộ (piece-rate, sau này có lương cứng) + thợ ngoài + lab ảnh | Ekip (kỳ lương), thợ ngoài (theo task), lab (theo đơn) |
| **Thiệp cưới** — mảng riêng | Khách HĐ: dòng thiệp trong hợp đồng · Khách lẻ: đơn bán lẻ | Xưởng thiệp (nhà in) | Xưởng (theo đơn) |
| Không có | — | Kho vật tư | — |

Ba loại đối tác, nhưng **cùng một vòng đời tiền**: cam kết → phải trả → trả (một phần / nhiều lần) → hết nợ.

## 2. Gốc rối hiện tại (đã đo)

| Nhánh | Cam kết ghi ở | Tiền thật ghi ở | Báo cáo đọc |
|---|---|---|---|
| Lab ảnh | `expenses` "[Auto-Print]" 33 dòng, `payment_method='chuyen_khoan'` **dù còn nợ 1.905.000** | `lab_payments` 26 · 7.936.400 | chỉ đọc `expenses` |
| Thợ ngoài | `expenses` 10 dòng (trích khi task hoàn thành) | `vendor_payments` 5 · 11.850.000 | chỉ đọc `expenses` |
| Lương ekip | không (đúng) | `expenses` khi trả (`payEmployeeSalaryAction`) | đọc `expenses` (đúng) |
| Thiệp | không | không (bán lẻ vào `receipts`) | — |

→ `finance_dashboard_metrics`: `profit = (payments + receipts) − expenses` = **tiền vào két − cam kết lab/thợ − tiền lương thật**: ba đơn vị đo trong một phép trừ. `finance_revenue_by_month` = tiền thu (cash), nhưng UI gọi "doanh thu". 0/10 RPC tài chính đọc `lab_payments`/`vendor_payments`.

Nguyên nhân gốc: **một bảng "phiếu chi" gánh hai nghĩa** (cam kết + tiền thật), rồi mỗi nhánh chọn một nghĩa khác nhau.

## 3. Mô hình đích — Ba sổ

```
              ┌──────────────── SỔ CAM KẾT (không phải bảng — là bản ghi gốc) ────────────────┐
              │  Doanh thu:  contracts.total_amount  (hop_dong | hoa_don)                     │
              │  Chi phí HĐ: work_tasks.cost (khi hoan_thanh) · printing_orders.total_amount  │
              │  Overhead:   fixed_costs.monthly_amount · employee_salaries.base_salary        │
              └───────────────┬───────────────────────────────────────┬───────────────────────┘
                              │ phải thu                              │ phải trả
                              ▼                                       ▼
   SỔ TIỀN VÀO  payments (PT-…, contract_id)        SỔ TIỀN RA  expenses (PC-…, payee_type/payee_id)
                payment_plans = lịch thu                          expense_allocations → đơn in / task / kỳ lương
                payment_plan_allocations                          (expense không allocation + contract_id = chi trực tiếp)
```

### 3.1 Quy tắc ghi nhận (áp cho mọi RPC/báo cáo)

| Sự kiện | Sổ | Bản ghi | Thời điểm |
|---|---|---|---|
| Ký hợp đồng / tạo đơn bán lẻ | Cam kết (doanh số ký) | `contracts` | `contract_date` |
| Hoàn thành hợp đồng | Cam kết (doanh thu ghi nhận) | `contracts.status = hoan_thanh` | tháng hoàn thành → lãi/lỗ tháng |
| Khách trả tiền | Tiền vào | `payments` | `payment_date` |
| Giao task ekip/thợ ngoài hoàn thành | Cam kết (chi phí HĐ) | `work_tasks.cost`, `status = hoan_thanh` | `completion_date` |
| Tạo đơn đặt in (ảnh, thiệp) | Cam kết (chi phí HĐ) | `printing_orders.total_amount` | `order_date` |
| Trả lab / xưởng / thợ ngoài / lương | Tiền ra | `expenses` + `expense_allocations` | `expense_date` |
| Chi trực tiếp cho HĐ không qua nguồn (thuê xe, hoa…) | Cam kết **và** tiền ra cùng lúc | `expenses` có `contract_id`, **không** allocation | `expense_date` |
| Chi vận hành (mặt bằng, marketing…) | Overhead + tiền ra | `expenses` không `contract_id` | `expense_date` |

Hệ quả: phiếu chi **có** allocation = thanh toán nợ, không phải chi phí mới; phiếu chi **không** allocation = chi phí thật phát sinh. Không có phiếu chi "ảo".

### 3.2 Công nợ

- **Phải thu** (đã có): `contracts.total_amount − Σ payments` — `remaining_amount`, `get_receivable_aging`.
- **Phải trả** (hợp nhất, 1 màn hình thay `/finance/lab-debts` + `/finance/vendor-debts`): theo `payee`:
  `Σ printing_orders.total_amount (lab) + Σ work_tasks.cost hoàn thành (vendor) + Σ employee_salaries.net_salary (nhân sự) − Σ expense_allocations`.

## 4. Sáu báo cáo chuẩn — công thức từ bảng nào

| # | Báo cáo | Công thức | Thay cho |
|---|---|---|---|
| 1 | **Két tháng** (cash) | `Σ payments(payment_date∈tháng) − Σ expenses(expense_date∈tháng)` | `finance_dashboard_metrics` (hiện trộn) |
| 2 | **Lãi/lỗ tháng** (accrual) | `Σ contracts.total_amount (hoàn thành trong tháng) − Σ work_tasks.cost (hoàn thành trong tháng) − Σ printing_orders.total_amount (tạo trong tháng) − Σ expenses trực tiếp không allocation − overhead tháng` | chưa có |
| 3 | **Lãi/lỗ theo hợp đồng** | `total_amount − Σ work_tasks.cost (tất cả, kể cả vendor) − Σ printing_orders.total_amount − Σ expenses(contract_id, không allocation)` | `finance_contract_profit_report` (bỏ hack `[Auto-Print]`, bỏ lọc `vendor_id IS NULL`) |
| 4 | **Doanh số ký** | `Σ contracts.total_amount` theo `contract_date` | `finance_revenue_by_month` đổi tên thành "Tiền thu theo tháng"; thêm hàm này |
| 5 | **Phải thu** | như hiện tại | giữ |
| 6 | **Phải trả theo đối tác** | §3.2 | `finance_lab_debt_summary` + `finance_vendor_debt_summary` → 1 hàm |

Dashboard hiển thị đúng 3 khối: *Két* (1) · *Lãi/lỗ* (2) · *Công nợ* (5+6). Chữ "lợi nhuận" chỉ xuất hiện ở (2) và (3).

## 5. Thiệp cưới — mảng riêng, chạy trên cùng đường ray

| | Khách hợp đồng | Khách lẻ |
|---|---|---|
| Doanh thu | dòng `contract_items` type `san_pham` "Thiệp cưới ×N @giá" trong hợp đồng chụp | hợp đồng `transaction_type = 'hoa_don'` (khách tạo ở CRM), 1 dòng thiệp, `payment_plans` 1 đợt |
| Chi phí | `printing_orders` → lab = "Xưởng thiệp cưới HD" (`lab_type = 'thiep'`), item "Thiệp ×N @giá vốn", bảng giá ở `lab_services` | như bên trái |
| Tiến độ / giao | trạng thái đơn in (đã có) | như bên trái |
| Lãi/lỗ | tự vào báo cáo 3 (giá bán − giá vốn) | tự vào báo cáo 3; lọc `hoa_don` = P&L mảng thiệp |
| Công nợ xưởng | báo cáo 6, payee = xưởng | như bên trái |

Mood có **hợp lý và tối ưu** không khi chạy thiệp cách này? Có — vì thiệp là hàng *đặt làm theo từng cặp*, giống hệt ảnh in: có đơn, có nhà in, có ngày hẹn, có công nợ. Mô hình kho chỉ đúng khi Mood mua sẵn phôi thiệp trắng rồi in dần — user xác nhận không. **Không cần bảng mới**; 3 mã thiệp trong kho hiện tại là lịch sử, đóng băng.

## 6. Nhân sự — nay và sau, không đếm trùng

| | Cam kết (vào lãi/lỗ) | Tiền ra |
|---|---|---|
| **Nay** — ekip piece-rate | `work_tasks.cost` khi task hoàn thành → chi phí **của hợp đồng đó** | kỳ lương tháng: `product_salary = Σ cost` → phiếu chi lương (đã có) + allocation vào `employee_salaries` |
| **Sau** — thêm lương cứng | `employee_salaries.base_salary` → **overhead tháng** (báo cáo 2), không gán hợp đồng | cùng phiếu chi lương (base + product) |
| Thợ ngoài | `work_tasks.cost` (vendor) khi hoàn thành | phiếu chi payee = vendor + allocation vào task |

Luật: một đồng chi phí nhân sự chỉ ở **một** trong hai chỗ — `work_tasks.cost` (theo hợp đồng) *hoặc* `base_salary` (overhead). Cả hai đều được **trả** bằng phiếu chi lương → tiền ra không bao giờ trùng.

## 7. Ảnh hưởng: giữ / đổi / bỏ

| Đối tượng | Quyết định |
|---|---|
| `expenses` | **Giữ**, thêm `payee_type` (`lab`·`vendor`·`employee`·`other`), `payee_id`; mã `PC-…` |
| `expense_allocations` | **Mới** — `expense_id`, `target_type` (`printing_order`·`work_task`·`employee_salary`), `target_id`, `amount` |
| `lab_payments`, `lab_payment_allocations`, `vendor_payments`, `vendor_payment_allocations` | **Di trú** vào `expenses` + `expense_allocations` rồi **bỏ**; `record_lab_payment_atomic` / `record_vendor_payment_atomic` → 1 hàm `record_supplier_payment_atomic(payee_type, payee_id, amount, allocations)` |
| `upsert_printing_expense`, `upsert_vendor_expense`, trigger `work_task_vendor_expense_sync` | **Bỏ** (không còn phiếu chi trích trước) |
| `finance_contract_profit_report`, `get_contract_list_v2` (cột Chi phí/Lợi nhuận thêm 25/08, `b42b74b`, sao chép công thức), `getContractFinanceDetails` (app, nuôi drawer lợi nhuận), `contract-profit.ts`, `getContractProfitReportFallback` | **Gom về một hàm SQL `contract_financials(p_contract_ids uuid[])`** trả `revenue / task_cost / print_cost / direct_cost / profit / margin` theo công thức báo cáo 3; 5 nơi trên đều gọi hàm này (hiện là **4 bản sao** của cùng công thức — đúng lớp lỗi "2 nơi định nghĩa 1 luật", bản `getContractFinanceDetails` vừa phải vá lệch 1.350.000đ hôm 25/08) |
| `finance_dashboard_metrics`, `finance_ledger*`, `get_cashflow_forecast`, `finance_reports_snapshot`, `get_finance_intelligence` | **Đổi nhãn + tách**: két (1) vs lãi/lỗ (2); thống nhất bộ sổ |
| `finance_revenue_by_month` | đổi tên "tiền thu"; thêm "doanh số ký" |
| `finance_lab_debt_summary`, `finance_vendor_debt_summary` | → `finance_payable_summary()` theo payee |
| `payments` / `payment_plans` | **Giữ** nguyên |
| `receipts`, `create_sale_receipt_atomic` | **Bỏ** sau khi di trú 4 phiếu → hợp đồng `hoa_don` |
| `labs` | thêm `lab_type` (`anh`·`thiep`); thêm "Xưởng thiệp cưới HD" |
| Module kho (`inventory_*`, `/inventory`) | **Đóng băng**: ẩn route, giữ bảng lịch sử; Phase B spec dead-code dọn phần printing-phase-1 |
| `printing_orders.payment_status` | **Dẫn xuất** từ allocation (không ghi tay) |
| `contract-profit.ts`, `getContractProfitReportFallback` | **Bỏ** |
| vault `luong-tien.md`, `tai-chinh.md`, `in-an-lab.md`, `vat-tu.md`, `nha-cung-cap.md` | viết lại theo §3–§4 |

## 8. Di trú dữ liệu (số đo 25/08, phải đối soát khi chạy)

| Bước | Dữ liệu | Kiểm |
|---|---|---|
| 1 | 26 `lab_payments` (7.936.400) → 26 `expenses` payee=lab + allocation từ `lab_payment_allocations` | `Σ expenses(lab) = 7.936.400`; nợ lab theo hàm mới = 1.905.000 (= `printing_stats.unpaid_cost` hiện tại) |
| 2 | 5 `vendor_payments` (11.850.000) → 5 `expenses` payee=vendor + allocation | `Σ = 11.850.000`; nợ vendor = 13.200.000 − 11.850.000 − (task chưa hoàn thành 1.350.000) = 0 |
| 3 | 43 phiếu chi trích trước ([Auto-Print] 33 + vendor 10) → `deleted_at` (giữ audit) | `Σ expenses` tháng 5–8 giảm 21.691.400, tăng 19.786.400 → két thật |
| 4 | 4 `receipts` thiệp (5.295.000) → 4 khách CRM + 4 hợp đồng `hoa_don` + 4 `payments`; 4 `printing_orders` xưởng thiệp giá vốn từ `inventory_transactions.stock_in` (2.880.000) | báo cáo 3 lọc `hoa_don` ra lãi thiệp ≈ 2.415.000 |
| 5 | `printing_orders.payment_status` tính lại từ allocation | 25 đơn `da_thanh_toan` hiện tại phải giữ nguyên kết quả |
| 6 | Lãi/lỗ 60 hợp đồng trước/sau | khác nhau **chỉ** ở hợp đồng có phiếu chi vendor (do bỏ lọc `vendor_id IS NULL` + bỏ expenses vendor — bù trừ đúng bằng nhau) → 0 chênh |

## 9. Lộ trình — mỗi milestone có cổng đối soát

| M | Nội dung | Cổng |
|---|---|---|
| **M1 Sổ tiền ra** | `expenses.payee_*`, `expense_allocations`, `record_supplier_payment_atomic`, di trú 1–3, bỏ 2 hàm trích trước + trigger, sửa báo cáo 3, `finance_payable_summary`, màn công nợ hợp nhất | §8 bước 1–3, 6; dashboard "chi" tháng 8 = tiền thật |
| **M2 Ba số dashboard** | tách két / lãi-lỗ / công nợ; RPC báo cáo 1, 2, 4; đổi nhãn; thống nhất bộ sổ 10 RPC | mỗi số tra ngược được ra bảng; vault cập nhật |
| **M3 Thiệp** | `labs.lab_type`, xưởng thiệp, `hoa_don` flow (tạo đơn bán lẻ từ CRM), dòng `san_pham` thiệp trong HĐ, đóng băng kho, di trú bước 4 | tạo 1 đơn thiệp lẻ end-to-end: đơn → đặt in → trả xưởng → lãi hiện đúng |
| **M4 Tiền vào** | bỏ `receipts`; bán lẻ chỉ qua `hoa_don`; "Thu tiền dịch vụ lẻ" thành category của `payments` | `Σ payments` = tiền vào duy nhất |
| **M5 Nhân sự** | allocation phiếu chi lương → `employee_salaries`; `base_salary` → overhead báo cáo 2; dọn dòng test 100.000.000 | kỳ lương thử: cam kết vs tiền ra khớp |

M1 là đợt duy nhất chạm dữ liệu tài chính lịch sử — làm trên branch, chạy di trú thử trên bản sao (`scripts/db-q.mjs` đọc, `migrate-direct` transaction), có bảng before/after cho 60 hợp đồng trước khi áp.

## 10. Đã cân nhắc và bác

- **Giữ trích trước trong `expenses`, thêm `paid_amount`/status** — rẻ hơn M1, nhưng "phiếu chi" mãi mang hai nghĩa, két phải suy từ allocation, và lương (đang đúng) phải đổi sang trích trước → đi ngược nhánh duy nhất đang đúng.
- **Giữ `receipts` cho bán lẻ** — hai sổ tiền vào, mảng thiệp mãi không có lãi/lỗ vì không có chi phí đối ứng.
- **Gộp `labs` + `vendors` thành một bảng ngay** — đúng hướng nhưng đụng 2 module + 4 RPC; hợp nhất ở **tầng phiếu chi** (`payee_type`) cho 90% giá trị với 20% công. Gộp master data để sau.
- **Thiệp qua kho** (như hiện tại) — chỉ đúng nếu có tồn kho phôi; user xác nhận không.

## 11. Cần user chốt (4 điểm, mỗi điểm 1 câu)

1. Đồng ý mô hình **ba sổ** (§3) và việc **xoá 43 phiếu chi trích trước** thay bằng 31 phiếu chi thật di trú từ 2 sổ thanh toán?
2. Doanh thu ghi nhận vào lãi/lỗ tháng theo **tháng hoàn thành** (đề xuất) hay **tháng ký**?
3. Di trú lịch sử thiệp (4 phiếu thu + 4 lô nhập) thành hợp đồng `hoa_don` (đề xuất, để P&L mảng thiệp đúng từ đầu) hay chỉ áp từ nay?
4. Thứ tự **M1 → M2 → M3 → M4 → M5** (đề xuất: sửa sổ tiền ra trước vì đang sai nặng nhất) hay muốn M3 (thiệp) trước?
