# T-20261020-fix-void-payment — Huỷ phiếu thu hợp đồng chạy được (sửa trigger đọc cột không tồn tại)

**Owner:** claude (spec → chủ duyệt → claude áp DB → commit ngay) · **Trạng thái:** ✅ chủ duyệt spec 20/10 · migration + revert + 2 script **đã soạn và thử cục bộ** · **CHƯA áp prod** (chờ chủ nói "áp") · **Mức:** 🔴 cao nhất trong 3 lỗi phát hiện 20/10 (chức năng hỏng thật, chặn thao tác hằng ngày) · **DB:** `CREATE OR REPLACE` 1 hàm trigger, 0 bảng, 0 dữ liệu · **ADR:** không cần — sửa hàm cho khớp lược đồ đã có (cùng loại R1 `T-20260907-r1-cancel-cascade`) · **Revert:** `agent/HANDOFFS/T-20261020-fix-void-payment.revert.sql` (soạn khi làm) · **Nguồn:** báo cáo `docs/reports/audit_2026-10-20_luong-hop-dong.md` mục "Hai LỖI RIÊNG".

> ⚠️ Việc này **chưa có bước trong `agent/GOALS.yaml`** (sổ 32 bước; `/buoc` từ chối việc ngoài sổ). Cần chủ cho thêm bước (hoặc chấp thuận chạy ngoài sổ như R1/R2 từng làm) — xem §7.

## 0. Vì sao

Màn **Tài chính → Phiếu thu** (`components/finance/receipts/receipts-client.tsx:197`) có nút huỷ phiếu thu hợp đồng → `voidContractPayment` (`app/actions/payment-actions.ts:120`) → RPC `void_contract_payment_v2`. RPC `UPDATE payments SET deleted_at = now(), voided_at = …` làm nổ trigger `trg_restore_inventory_on_contract_payment_void`, hàm của nó đọc `NEW.updated_by` mà bảng `payments` **không có cột này** ⇒ PL/pgSQL báo `record "new" has no field "updated_by"` **ở mọi lần huỷ** (lỗi phát sinh ở lúc phân giải trường, nên dù `voided_by` có giá trị vẫn nổ). Người dùng thấy toast `Không thể hủy phiếu thu: record "new" has no field "updated_by"`; phiếu nhập nhầm không có đường huỷ nào khác trong app (xoá tay trong DB là cách duy nhất). **Đã kiểm không có đường vòng:** `voidContractPayment` chỉ được gọi từ `receipts-client.tsx`; `updateReceipt` (`app/actions/receipt-actions.ts:188`) **từ chối thẳng** mọi id dạng `payment:…` ("Phieu thu hop dong duoc tao tu thanh toan hop dong. Vui long xu ly tu chi tiet hop dong") nên không sửa/đổi số tiền phiếu thu hợp đồng được.

## 1. Sự thật đã đo (20/10, chỉ đọc prod + bản sao cục bộ `mood_restore`)

- Thân hàm sống: `COALESCE(NEW.voided_by, NEW.updated_by, NEW.created_by)`; trigger `AFTER UPDATE OF deleted_at ON payments … WHEN (old.deleted_at IS NULL AND new.deleted_at IS NOT NULL)`. Cột `payments`: có `voided_by`, `created_by`; **không** có `updated_by` (trong `contracts/payments/payment_plans/payment_plan_allocations/contract_items` chỉ `contracts` có).
- **Tái hiện cục bộ** (bản sao prod 20/10, transaction + ROLLBACK): gọi `void_contract_payment_v2` trên phiếu 500k của HĐ-2026-0075 → `record "new" has no field "updated_by"`.
- **Thử bản sửa** (đổi đúng biểu thức thành `COALESCE(NEW.voided_by, NEW.created_by)`, cùng transaction): huỷ thành công — kết quả RPC `voided_amount 500000, restored_payment_plans 1, new_paid 0, new_remaining 2000000, payment_status chua_thanh_toan`; phiếu `deleted_at`/`voided_at` có giá trị + lý do; phân bổ của phiếu = 0; lịch thu HĐ-0075 về `deposit 500k pending` + `final 1,5tr pending`.
- Dữ liệu khớp: **0/72 phiếu thu từng bị huỷ** (`voided_at`/`deleted_at` đều 0); `audit_logs` không có `UPDATE` nào trên `payments` trong 60 ngày.
- Quét **toàn bộ 77 trigger** public: đối chiếu mọi `NEW.x`/`OLD.x` với cột bảng ⇒ **chỉ 1 chỗ sai** (chính cái này). `restore_inventory_on_receipt_void` (trên `receipts`) không dính vì `receipts` có `updated_by`.
- `restore_inventory_from_transaction('contract_addon_sale', NEW.id, …)` khi phiếu không có xuất kho gắn kèm: vòng lặp rỗng ⇒ **không làm gì** (đã đọc thân hàm). Dữ liệu: 0 giao dịch kho gắn HĐ ⇒ nhánh hoàn kho chưa từng chạy thật.

## 2. Phạm vi — 1 hàm, 1 migration, 1 script kiểm tĩnh, 1 script thử cục bộ

1. `supabase/migrations/<ts>_fix_void_payment_trigger.sql` — sinh từ **thân hàm sống** `restore_inventory_on_contract_payment_void()`, diff đúng 1 chỗ: `COALESCE(NEW.voided_by, NEW.updated_by, NEW.created_by)` → `COALESCE(NEW.voided_by, NEW.created_by)`. Giữ chữ ký, `LANGUAGE plpgsql`, điều kiện `IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL`. (migrate-direct tự bọc BEGIN/COMMIT — không tự thêm.)
2. `agent/HANDOFFS/T-20261020-fix-void-payment.revert.sql` — thân sống trước khi sửa. Quay lui = quay về "huỷ phiếu luôn lỗi"; chỉ để đối chiếu.
3. **`scripts/verify-db-function-refs.mjs` + `npm run verify:db-refs`** (chặn tái phát **đúng 2 lớp lỗi này**, chỉ SELECT nên chạy được trên prod; KHÔNG bắt tên cột sai trong `INSERT`/`UPDATE` của hàm thường — vd khối `INSERT INTO inventory_transactions` của `restore_inventory_from_transaction`, chưa từng chạy, được phủ bằng kịch bản thử local ở §4): (a) với mọi trigger public, mọi `NEW.<c>`/`OLD.<c>` trong thân hàm phải là cột có thật của bảng gắn trigger; (b) mọi `<tên>_enum` trong thân hàm public phải tồn tại trong `pg_type`. Hiện trả 2 vi phạm đã biết (trigger này + `recalc_contract_totals`, spec `T-20261020-fix-recalc-totals`) → sau khi cả hai fix lên phải trả 0. Lọc comment `--` trước khi quét. Cho phép allowlist có lý do nếu sau này có false positive.
4. `scripts/verify-void-payment.mjs` — chỉ chạy trên Postgres cục bộ (từ chối host khác, theo mẫu `scripts/verify-payment-plans-sync.mjs`), mỗi kịch bản trong transaction rồi ROLLBACK.

Không đổi: `void_contract_payment_v2`, `payment-actions.ts`, `receipts-client.tsx`, bảng, RLS, ACL (`CREATE OR REPLACE` giữ ACL; đo lại sau khi áp).

## 3. Ngoài phạm vi
- Thông báo lỗi thô trong toast (`Không thể hủy phiếu thu: …`) — giữ nguyên; sau fix sẽ không còn thấy.
- `recalc_contract_totals` luôn lỗi → spec riêng `T-20261020-fix-recalc-totals`.
- Huỷ phiếu bán lẻ/`receipts` (nhánh khác, không dính lỗi này).
- Kỳ đã chốt sổ vẫn chặn huỷ (`Ky nay da chot so…`) — đúng thiết kế; hiện `finance_monthly_closes` 0 kỳ.

## 4. Verify — số chờ điền

| Kiểm | Cách | Chờ |
|---|---|---|
| Tái hiện (trước fix) | `verify-void-payment.mjs` trên `mood_restore` | kịch bản huỷ thường FAIL với đúng `record "new" has no field "updated_by"` |
| Huỷ phiếu thường | HĐ có 1 phiếu 500k đã phân bổ vào Cọc | phiếu `deleted_at`+`voided_at`+lý do; phân bổ = 0; `paid=0`, `remaining=total`, `payment_status='chua_thanh_toan'`; đợt Cọc về `pending` |
| Huỷ phiếu một phần | HĐ có 2 phiếu (cọc + tất toán), huỷ phiếu tất toán | phiếu cọc còn nguyên phân bổ; `partial`/`pending` đúng; `paid` = số phiếu còn lại |
| Huỷ phiếu phát sinh | `process_contract_payment_v2(p_update_total=true)` rồi huỷ | hạng mục `phat_sinh` bị xoá mềm; `total` trở lại số cũ; Σ đợt + Σ phát sinh = total (kèm trigger ADR-020 nếu đã áp) |
| Huỷ phiếu đã huỷ | gọi lại | lỗi `Khong tim thay phieu thu … hoac phieu da bi huy` (không lỗi cột) |
| Kỳ đã chốt | chèn dòng `finance_monthly_closes` (trong txn) rồi huỷ | lỗi `Ky nay da chot so` |
| Sổ kỳ | so `finance_cash_entries(kỳ)` trước/sau huỷ | `cash_in_contract` giảm đúng số phiếu huỷ |
| Hoàn kho (nhánh `contract_addon_sale`) | dựng 1 `inventory_transactions` stock_out `source_type='contract_addon_sale'`, `source_id=<phiếu>` rồi huỷ phiếu | sinh dòng `stock_in`/`return`, tồn kho tăng đúng số lượng (nhánh này chưa từng chạy thật — thử ở local) |
| Kiểm tĩnh | `npm run verify:db-refs` | trước fix: ≥ 1 vi phạm (trigger này); sau fix: chỉ còn vi phạm của `recalc_contract_totals` cho tới khi spec kia lên |
| Áp prod | `ALLOW_PROD_WRITE=1 node scripts/migrate-direct.mjs <file>` | `pg_get_functiondef` không còn chữ `updated_by`; `verify:db-refs` trên prod hết vi phạm trigger; đo `proacl` giữ nguyên; `vault:db-truth`; **commit ngay** |
| Thử thật trên prod | **không làm** — không tạo/huỷ phiếu thật để thử (DB dùng chung, rác lọt dropdown) | chấp nhận bằng thử local + đọc thân hàm sống + kiểm tĩnh; phiếu nhập nhầm thật đầu tiên là lần chạy thật đầu tiên → báo chủ biết |

## 5. Rủi ro & đường lùi
- Rủi ro chức năng: sau fix nút huỷ **hoạt động thật** → huỷ nhầm có thật; RPC đã có khoá (lý do ≥ 5 ký tự, `requireContractDestructiveAccess` admin/manager, chặn kỳ đã chốt, ghi `audit_logs`). Không thêm gì.
- Phiếu huỷ vẫn nằm trong bảng (`deleted_at`) — không mất dấu vết; sổ kỳ và `contract_financials` đã lọc `deleted_at IS NULL`.
- Đường lùi: `revert.sql` (đã thử local trước khi xin duyệt).
- **Hai migration độc lập, cái nào lên trước cũng được:** thử riêng trên bản sao prod **sạch** (chỉ áp fix này, không có ADR-020): `verify-void-payment` **18/18 PASS** (kịch bản V3 tự bỏ qua một kiểm Σ đợt vì trigger ADR-020 chưa có); khi có cả hai: 19/19.
- **Hệ quả nghiệp vụ cần chủ biết:** `finance_monthly_closes` hiện **0 kỳ chốt** (và `finance_reports_snapshot`/sổ kỳ **tính trực tiếp** từ `payments`, không lưu sẵn). Sau fix, huỷ một phiếu của tháng cũ sẽ **đổi doanh thu thu-tiền của tháng đó ngay** (đúng — phiếu sai bị gỡ). Chỉ khi tháng đã chốt (`snapshot_metrics` đóng băng) thì RPC mới chặn huỷ. Muốn bảo vệ số tháng đã báo cáo → chốt kỳ.
- **Chưa từng có phiếu nào bị huỷ trên prod** nên các nơi *đọc* phiếu chưa bao giờ gặp dòng đã huỷ; đã thử đủ (mục 6, "Nơi đọc phiếu thu").

## 6. Kết quả

### Đã làm (20/10, cục bộ — prod chưa bị ghi gì)
- `supabase/migrations/20261020110000_fix_void_payment_trigger.sql` — sinh từ thân hàm sống; diff đúng 1 chỗ (`COALESCE(NEW.voided_by, NEW.updated_by, NEW.created_by)` → `COALESCE(NEW.voided_by, NEW.created_by)`); giữ `SET search_path TO 'public'` và điều kiện `IF`. Không có `BEGIN/COMMIT` (migrate-direct tự bọc).
- `agent/HANDOFFS/T-20261020-fix-void-payment.revert.sql` — thân sống; sau revert local `md5(prosrc)` = `763b5c91…` **khớp md5 hàm trên prod** ✓.
- `scripts/verify-db-function-refs.mjs` (`npm run verify:db-refs`) — chỉ SELECT. Trên **prod hiện trả đúng 2 vi phạm**: `payments.trg_restore_inventory_on_contract_payment_void → NEW.updated_by` và `recalc_contract_totals: payment_status_enum` (77 trigger, 154 hàm plpgsql/sql). Trên local sau migration còn 1 (recalc) — đúng kỳ vọng §4.
- `scripts/verify-void-payment.mjs` (`npm run verify:void-payment`, chỉ localhost, mỗi kịch bản ROLLBACK) + khung dùng chung `scripts/lib/local-contract-harness.mjs`; `verify-payment-plans-sync.mjs` đã chuyển sang dùng khung này (vẫn 26/26, không chép lại code).

### Số đo (Postgres cục bộ `mood_restore`, dump prod 20/10 02:00, đã có migration ADR-020)
| Kiểm | Trước migration | Sau migration |
|---|---|---|
| `verify-void-payment` | **3/9 PASS** — V1–V4, V6, V7 FAIL đúng `record "new" has no field "updated_by"` (V5 chốt sổ qua vì kiểm kỳ chạy trước UPDATE) | **19/19 PASS** |
| V1 huỷ phiếu cọc 500k | lỗi cột | phiếu `deleted_at`+`voided_at`+lý do; phân bổ 0; HĐ `paid 0 / remaining 2tr / chua_thanh_toan`; đợt Cọc `pending` giữ 500k |
| V2 huỷ phiếu tất toán | lỗi cột | Cọc vẫn `paid` (alloc 500k); Tất toán `pending`; `thanh_toan_mot_phan` |
| V3 huỷ phát sinh | lỗi cột | total 1,2tr → 1,0tr; hạng mục `phat_sinh` xoá mềm; Σ đợt + Σ phát sinh = total (trigger ADR-020) |
| V4 huỷ lần 2 | lỗi cột | báo `da bi huy`, không còn lỗi cột |
| V5 kỳ đã chốt | `chot so` | `chot so`, phiếu nguyên |
| V6 sổ kỳ | lỗi cột | `cash_in_contract` giảm đúng 500k |
| V7 hoàn kho `contract_addon_sale` (nhánh chưa từng chạy trên prod) | lỗi cột | sinh 1 `stock_in`/`return` số lượng 2; tồn 8 → 10 (khối `INSERT INTO inventory_transactions` trong `restore_inventory_from_transaction` chạy được) |
| `verify-payment-plans-sync` | 26/26 (qua đường tắt trigger) | 26/26 (B3 huỷ phát sinh chạy thẳng, không cần tắt trigger) |
| Revert → áp lại → áp lần 2 | 3/9 sau revert | 19/19; áp lần 2 idempotent |
| `eslint` 3 file script mới | — | 0 lỗi (scripts nằm trong ignore → chỉ cảnh báo "file ignored") |

### Nơi đọc phiếu thu — thử sau khi huỷ (bản sao prod sạch, chỉ có fix này, transaction + ROLLBACK, phiếu 500k của HĐ-2026-0075)
| Nơi đọc | Trước huỷ → sau huỷ |
|---|---|
| `get_contract_detail_v3` → `payments` (thẻ biên lai HĐ) | 1 → **0**, không còn id phiếu |
| `get_contract_detail_v2` → `payments` | 1 → **0** |
| `finance_receipt_documents` (danh sách Tài chính → Phiếu thu, tháng 10) | 1 dòng → **0** |
| `finance_receipt_document_stats` | tổng 500.000 / 1 phiếu → **0 / 0** |
| `finance_cash_entries` → `cash_in_contract` | 500.000 → **0** |
| `finance_period_ledger` (kỳ 10/2026) | `cash_in_contract` 500.000 → **0**, các số khác (doanh thu ký, chi phí) không đổi |
| `finance_reports_snapshot` | đổi theo (bỏ phiếu) |
Quét tĩnh: không hàm/view public nào đọc `payments` mà thiếu `deleted_at` (trừ 2 hàm giao dịch kho chưa từng chạy: `update/delete_fulfillment_transaction_atomic`); các lệnh `.from("payments")` trong `app/` + `lib/` đều có `.is("deleted_at", null)` (trừ 2 chỗ ghi theo id ở `contract-mutations.ts`).

### Còn lại (cần chủ)
- **Áp prod** theo §4: dòng `agent/DB-CHANGELOG.md` đã ghi CHUẨN BỊ → backup → `ALLOW_PROD_WRITE=1 node scripts/migrate-direct.mjs 20261020110000_fix_void_payment_trigger.sql` → đo `proacl` (CREATE OR REPLACE giữ ACL; prod hiện `{=X, postgres, anon, authenticated, service_role}` — hàm trigger, không đổi) → `npm run verify:db-refs` trên prod (**kỳ vọng đúng 1 vi phạm — `recalc_contract_totals`; thoát mã 1 là bình thường cho tới khi spec recalc lên; không đưa vào CI trước đó**) → `vault:db-truth` → commit ngay.
- Không thử huỷ phiếu thật trên prod (xem §4); lần huỷ thật đầu tiên là lần chạy thật đầu tiên.
- Câu hỏi §7: chạy ngoài `agent/GOALS.yaml`? (đang làm ngoài sổ theo duyệt của chủ); `verify:db-refs` vào CI?

## 7. Câu hỏi mở cho chủ
1. Thêm bước vào `agent/GOALS.yaml` (loại `db`, giai đoạn 2) hay chạy ngoài sổ như R1/R2? Tôi **không tự sửa sổ**.
2. Có muốn `verify:db-refs` chạy trong CI không (đọc DB prod bằng `SUPABASE_POOLER_URL`)? Mặc định: chỉ chạy tay + sau mỗi lần áp migration; **chưa đưa vào CI** vì còn 1 vi phạm (recalc) làm CI đỏ.
