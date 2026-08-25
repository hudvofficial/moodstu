# Rà soát kiến trúc dữ liệu nghiệp vụ — "Sổ nào là chân lý?" (2026-08-25)

Yêu cầu user: *"kiến trúc hệ thống sai tè le rồi, bạn trace rộng ra, kĩ lại nghiệp vụ data relationship, đường đi đúng của luồng data rồi cho ý kết quả"* — sau khi phát hiện thiệp cưới đi qua kho thay vì đơn in.

Đo trên DB production (chỉ đọc, `scripts/db-q.mjs`), đối chiếu `vault/` + code. Bản trình bày: artifact "Sổ Nào Là Chân Lý" (cùng ngày).

## 0. Kết luận

Tầng kỹ thuật **không** sai: hợp đồng làm trung tâm, ghi qua RPC atomic, chi phí lab/thợ ngoài trích trước (accrual) rồi trả sau qua sổ công nợ riêng — nhất quán. Sai ở **mô hình nghiệp vụ**, 4 chỗ:

1. **3 loại "nhà cung cấp", 3 cách ghi sổ** — lab ảnh (`labs`/`lab_payments`), thợ ngoài (`vendors`/`vendor_payments`), và "supplier" là chuỗi chữ trong `inventory_items`. Xưởng thiệp rơi vào loại 3 → vô hình.
2. **Thiệp cưới**: 2.880.000đ vốn nhập kho không sinh phiếu chi; 5.295.000đ bán ra là phiếu thu bán lẻ không gắn hợp đồng (SĐT không khớp `customers`).
3. **`expenses` "điểm hội tụ" chỉ có 2/6 dòng chảy** (In ấn 33 · 9.841.400đ; Thợ ngoài 10 · 11.850.000đ). Lương, vật tư, cố định: 0. Các RPC báo cáo đọc bộ sổ khác nhau.
4. **Catalog không có ruột**: 18 gói đều `fulfillment_type=single`, `cost_price=0`, `service_bundles`/`price_rules`/`promotions` rỗng → không biết gói gồm gì → không tự sinh đơn in/task/giá vốn.

## 1. Nghiệp vụ thật (số đo)

| Nguồn lực | Bản ghi gốc | Quy mô | Chi phí vào sổ | Trả tiền qua | Vào lợi nhuận HĐ |
|---|---|---|---|---|---|
| Ekip nội bộ | `work_tasks` (vendor_id NULL) | 155 task · 10.750.350 (chụp ảnh 64 · 9.8M, hậu kỳ 81 · 600k, makeup 6 · 350k) | không vào `expenses`; `monthly_salaries` 2 dòng cũng không | lương tháng | có, qua `work_tasks.cost` |
| Thợ ngoài | `work_tasks` (vendor_id) | 11 task · 13.200.000 | `expenses` "Chi phí thợ ngoài" 10 · 11.850.000 (accrual) | `vendor_payments` 5 · 11.850.000 | có, qua `expenses` |
| Lab ảnh (Hồng Bảo) | `printing_orders` | 33 đơn · 9.841.400 | `expenses` "[Auto-Print]" 33/33 khớp từng đồng, `expense_date = order_date` | `lab_payments` 26 · 7.936.400 (nợ ~1.905.000) | có, qua `printing_orders.total_amount` |
| **Xưởng thiệp** ("Xưởng thiệp cưới HD"/"In ấn HD"/"HD") | `inventory_items` 3 mã, mỗi mã = thiệp 1 HĐ (HD513/HD527/HD394) | nhập 4 · vốn 2.880.000; bán 4 · thu 5.295.000 | **không sổ nào** | không ghi | **không** (`contract_id` NULL 9/9) |

Tiền vào: `payments` 51 · 173.175.000 (100% có `contract_id`), theo `payment_plans` 240 đợt / 60 HĐ. `receipts` 4 = đúng 4 lần giao thiệp ("DV Út Linh" 3.245.000, "DV Long Kiều" 720.000, "DV Hiền Lưu" 350.000, "Nam Râu" 980.000), SĐT không khớp khách nào.

Contract items: 70 `dich_vu` (gói), 2 `phat_sinh` (Hình Bàn 15x21 300k, 1 Máy 700k), 1 `san_pham` (Retouch 525k). `contract_checklists` 333 dòng — studio đang dùng checklist làm "ruột" gói.

## 2. Hệ thống đang mô hình

- Doanh thu: `services` → `contract_items` → `payment_plans` → `payments` (đúng) ‖ `receipts` bán lẻ (thiệp, không `contract_id`).
- Chi phí trích trước: `upsert_vendor_expense`, `upsert_printing_expense` → `expenses` (đúng) ‖ `inventory_stock_in_atomic` **không** ghi `expenses` (kiểm thân hàm) ‖ lương **không** ghi.
- Tiền ra thật: `lab_payments`, `vendor_payments` — **0/10 RPC tài chính đọc** (`finance_dashboard_metrics`, `finance_ledger[_range]`, `finance_revenue_by_month`, `finance_reports_snapshot`, `get_cashflow_forecast`, `get_finance_intelligence`, `get_expense_breakdown`, `finance_contract_profit_report`, `contract_stats`). Màn hình "dòng tiền" = thu theo cash, chi theo cam kết.
- Lợi nhuận HĐ: RPC `finance_contract_profit_report` = `total_amount − (work_tasks.cost WHERE vendor_id IS NULL + printing_orders.total_amount + expenses(contract_id, NOT '[Auto-Print]%'))` — đúng, tránh trùng. Bản app `app/actions/contract-profit.ts` cộng cả task vendor lẫn expenses vendor → đếm trùng; **0 caller** (dead) nhưng là bẫy. `getContractProfitReportFallback` là bản sao thứ 3.

## 3. Phát hiện

- **[Nghiêm trọng]** Thiệp vô hình: `inventory_transactions.contract_id` NULL 9/9; mode "Xuất HĐ"/"Bán thêm HĐ" 0 dòng; lợi nhuận HĐ bỏ cả doanh thu lẫn vốn thiệp; lợi nhuận công ty cộng thu 5,3M nhưng không trừ vốn 2,88M.
- **[Nghiêm trọng]** 3 mô hình đối tác song song; `finance_lab_debt_summary` ≈ `finance_vendor_debt_summary`; supplier viết tay 3 kiểu cho 1 xưởng.
- **[Lệch sổ]** vault `luong-tien.md` mô tả 6 dòng chảy vào `expenses`, thực tế 2. `salar%` chỉ có ở `finance_reports_snapshot`/`get_cashflow_forecast`/`get_finance_intelligence` → dashboard và snapshot ra số khác nhau.
- **[Lệch sổ]** Nhân sự tính 2 kiểu không đối chiếu: `work_tasks.cost` nội bộ vào lợi nhuận HĐ; lương thật ở `monthly_salaries`; đưa lương vào `expenses` mà giữ task cost = trùng.
- **[Cần xác nhận]** 11 task vendor 13,2M vs 10 phiếu chi 11,85M — thiếu `AC · tro_ly · dang_lam · 1.350.000 · HĐ-2026-0064` (tạo 25/08). Luật accrual khi hoàn thành hay khi giao? Đọc `upsert_vendor_expense`/trigger rồi ghi vault.
- **[Gốc rễ]** Catalog không diễn tả "trọn gói gồm gì" → mọi chi phí chỉ xuất hiện khi nhân viên nhớ tạo tay → thiệp rơi ra ngoài.
- **[Tồn dư]** Lớp "printing phase 1" (05/2026: `order_payments`, `inventory_reservations`, 2 view, 14 cột) còn trong DB dù code đã gỡ (ADR-014/015); 12 bảng dựng chưa dùng (`fixed_costs`, `budgets`, `financial_goals`, `investments`, `equipment`, `documents`, `approval_requests`, `debts`, `service_bundles`, `price_rules`, `promotions`, `dress_*` ~0). 98 bảng / 144 RPC cho 60 HĐ.

## 4. Đường đi đúng

**Luật 1 (chi phí):** mỗi việc thuê ngoài cho HĐ = 1 bản ghi gốc (task/đơn đặt/phiếu nhập) → 1 phiếu chi trích trước có `contract_id` → 1 sổ công nợ theo đối tác → 1 hàm lợi nhuận.
**Luật 2 (doanh thu):** mọi đồng khách HĐ trả mang `contract_id`; phiếu thu bán lẻ chỉ cho khách vãng lai thật.

- **Thiệp = đơn đặt in** (`printing_orders`, lab = "Xưởng thiệp cưới HD", item "Thiệp 3000 tờ @500") → tự có `[Auto-Print]` accrual, công nợ `lab_payments`, tiến độ, lợi nhuận. Coi `labs` là "nhà in" nói chung. Không bảng mới. Thiệp tính riêng → dòng phát sinh trong HĐ, không phiếu bán lẻ.
- **Kho chỉ cho hàng tồn thật** (phôi album, khung, phụ kiện): `inventory_stock_in_atomic` sinh phiếu chi "Vật tư"; xuất cho HĐ đi "Xuất HĐ" để có `contract_id`. Đóng 3 mã thiệp sau khi giao hết.
- **Một khái niệm đối tác** (dài hạn): gộp `labs` + `vendors` + `supplier` → bảng đối tác có loại, 1 sổ thanh toán + phân bổ, 1 màn công nợ.
- **Nói rõ cash vs cam kết**: `expenses` = phát sinh; `lab_payments`/`vendor_payments`/lương = cash. Màn "dòng tiền" đổi tên thành lãi/lỗ hoặc thêm chế độ cash; 1 bộ sổ cho mọi RPC báo cáo.
- **Một hàm lợi nhuận**: giữ RPC, xoá `contract-profit.ts` + fallback. Chốt luật nhân sự: task cost **hoặc** lương tháng.
- **Ruột gói**: `service_bundles` khai gói gồm gì + giá vốn dự kiến → sinh checklist + đơn in/task chờ + biên dự kiến vs thực tế.

## 5. Lộ trình

| Đợt | Việc | Được gì |
|---|---|---|
| P0 | Thiệp → đơn in (thêm xưởng vào `labs`); `inventory_stock_in_atomic` sinh phiếu chi; sửa 4 phiếu thu thiệp gắn HĐ nếu xác định được khách; xoá `contract-profit.ts`; Phase A+B spec dead-code | Lợi nhuận HĐ + công ty đúng với dữ liệu hiện có |
| P1 | Chốt luật accrual vendor + nhân sự; thống nhất bộ sổ 10 RPC; cash/accrual cho "dòng tiền"; cập nhật vault `luong-tien.md` | Mọi màn hình cùng 1 số |
| P2 | Ruột gói; gộp đối tác; đóng băng/drop bảng chưa dùng | Hết "nhớ tạo tay"; hết đối tác rơi ngoài sổ |

## 6. Quyết định cần user

1. Thiệp **trong giá gói** hay **bán rời**? (định đoạt 4 phiếu thu 5.295.000 là hợp lệ hay đếm trùng)
2. Có **hàng tồn thật** dùng chung nhiều HĐ không? Không → đóng băng module kho; có → sửa 2 điểm ở §4.
3. Chi phí ekip nội bộ theo **đơn giá task** (như nay) hay **lương tháng phân bổ**? Chỉ một.
4. "Dòng tiền"/"dự báo" = **lãi/lỗ theo cam kết** (giữ, đổi tên) hay **tiền thật ra/vào két** (thêm chế độ cash)?

## Phụ lục — số đo thô (2026-08-25)

- `contracts` 60 (payment_plans 240 · 277.550.000); `payments` 51 · 173.175.000 · voided 0.
- `receipts` 4 · sale_receipt/"Bán vật tư" · 5.295.000 · contract_id 0/4.
- `expenses` 43 · 21.691.400 = In ấn 33 · 9.841.400 + Thợ ngoài 10 · 11.850.000; link: printing 33, work_task 10, contract 43, debt 0.
- `lab_payments` 26 · 7.936.400; `vendor_payments` 5 · 11.850.000; `monthly_salaries` 2; `employee_salaries` 3.
- `work_tasks` 166: nội bộ 155 · 10.750.350; vendor 11 · 13.200.000.
- `inventory_items` 3 (VT-016 Thiệp Cưới - HD527 tồn 20 supplier "Xưởng thiệp cưới HD"; VT-017 Thiệp Cưới - HD513 tồn 0 "In ấn HD"; VT-018 Tân Gia - HD394 tồn 650 "HD"); `inventory_transactions` 9 (stock_in 4 · 2.880.000; retail_sale 4; internal_use 1); contract_id NULL 9/9.
- `services` 18, tất cả `single`, `cost_price` 0; `service_bundles`/`price_rules`/`promotions`/`equipment`/`fixed_costs`/`budgets`/`financial_goals`/`investments`/`documents`/`approval_requests`/`debts` = 0; `dresses` 2 · reservations 0 · rentals 0; `contract_checklists` 333; `addon_history` 2; `credit_cards` 3.
- RPC tài chính đọc `lab_payments`/`vendor_payments`: 0/10. Đọc `salar%`: 3/10.
