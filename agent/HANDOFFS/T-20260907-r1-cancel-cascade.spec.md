# T-20260907-r1-cancel-cascade — R1: huỷ hợp đồng chạy được (`cancel_contract_cascade` ghi `huy_don` cho đơn in)

**Owner:** claude (spec → chủ duyệt → claude áp DB → commit ngay) · **Trạng thái:** ✅ ĐÃ ÁP PROD 07/09 (chủ "duyêt") · commit `d13746d` · push 10/09 `808fc68` · **Chương trình:** GĐ1 Nền móng, bước #13 (`agent/GOALS.yaml`), gate #12 ✅ (R2 trước R1) · **DB:** `CREATE OR REPLACE` 1 hàm, không đổi bảng/CHECK/RLS · **ADR:** không cần — sửa hàm cho khớp CHECK đã có · **Revert:** `agent/HANDOFFS/T-20260907-r1-cancel-cascade.revert.sql`.

## 0. Vì sao

Sổ đối chiếu 🔴 dòng 1: nút **Huỷ hợp đồng** gọi `cancel_contract_cascade`, hàm ghi `printing_orders.status = 'da_huy'`, nhưng CHECK `printing_orders_status_check` (24/08) chỉ cho `cho_xu_ly · dang_in · da_in · hoan_thanh · huy_don · gap_su_co` → **`23514 check violation` → cả giao dịch abort**: HĐ không huỷ, task/đơn/lịch không đổi, admin thấy lỗi. Hậu quả đo được: **5 HĐ kẹt không huỷ được** (điều kiện cổng G1 "0 HĐ kẹt huỷ"), 0 HĐ `da_huy` trên toàn hệ dù vận hành 5 tháng. App đã coi `da_huy` của đơn in là **LEGACY** (`types/printing-constants.ts:14`), chỉ còn hàm này viết sai.

Thứ tự trọng tài: **R2 (#12, đã áp) trước R1** — khi huỷ HĐ chạy được, phiếu hoàn cọc đầu tiên xuất hiện; sổ kỳ đã biết không tính nó là chi phí.

## 1. Sự thật đã đo (07/09, chỉ đọc)

- CHECK sống: `printing_orders_status_check` = `deleted_at IS NOT NULL OR status IN (cho_xu_ly, dang_in, da_in, hoan_thanh, huy_don, gap_su_co)`, `convalidated = true`.
- Đơn in thật: 28 `hoan_thanh` · 3 `cho_xu_ly` · 1 `da_in` · 1 `dang_in` · **0** đơn `huy_don`/`da_huy`.
- Cascade còn đụng: `work_tasks.status='da_huy'` (bảng không có CHECK; dữ liệu đã có 2 dòng `da_huy` — hợp lệ), `dress_reservations.status='cancelled'` (không CHECK), `payment_plans.status='cancelled'` (CHECK **có** `cancelled` ✓), `refresh_dress_status` chỉ khi có váy. Trigger trên các bảng này chỉ là `updated_at`, `emit_realtime_signal`, `audit`, `trg_contract_payment_status_v2` → không có cửa abort thứ hai.
- Sổ kỳ: `finance_period_ledger.prints` đã loại cả `huy_don` và `da_huy`; `contract_financials.print_cost` cũng vậy → đơn huỷ không vào chi phí.
- **Tái hiện trên Postgres cục bộ** (`mood_restore`): HĐ giả `dang_thuc_hien` + đơn in `cho_xu_ly` + task `chua_lam` → gọi cascade bản sống → `23514 new row for relation "printing_orders" violates check constraint "printing_orders_status_check"`, HĐ giữ `dang_thuc_hien`. Áp migration → gọi lại → **HĐ `da_huy` · đơn `huy_don` · task `da_huy`**, `cancelled_at` có. `revert.sql` → thân hàm về `da_huy` ✓ → áp lại.
- Backup 07/09 02:13 OK. Prod hiện: 0 HĐ `da_huy`, 0 đơn huỷ, 3 HĐ đang chạy `paid = 0`.

## 2. Phạm vi — 1 hàm, 1 migration, 0 bảng

`supabase/migrations/20260907100000_r1_cancel_cascade_huy_don.sql` — sinh từ thân hàm sống, diff đúng 2 chỗ:

| Chỗ | Cũ | Mới |
|---|---|---|
| `UPDATE public.printing_orders SET status =` | `'da_huy'` | `'huy_don'` |
| `WHERE … COALESCE(status,'') NOT IN` | `('hoan_thanh','da_huy')` | `('hoan_thanh','huy_don','da_huy')` |

Không đổi: chữ ký `(p_contract_id uuid, p_reason text, p_user_id uuid)`, thứ tự cập nhật, điều kiện task/váy/payment_plans, `SECURITY DEFINER`. App không cần sửa (`contract-actions` gọi RPC theo tên).

Áp: `ALLOW_PROD_WRITE=1 node scripts/migrate-direct.mjs 20260907100000_r1_cancel_cascade_huy_don.sql` → `vault:db-truth` → **commit ngay** (luật db mới).

## 3. Ngoài phạm vi
- Việc **huỷ 5 HĐ kẹt** là thao tác của chủ trên UI → **#14** (dọn tồn), sau khi hàm chạy được. Không huỷ thay chủ.
- Đơn in đã `hoan_thanh` của HĐ huỷ vẫn giữ (chi phí in thật) — đúng ADR-016; hoàn cọc đi qua `contract-refund-actions` → R2 đã lo.
- `inventory_status` của đơn in huỷ (phôi đã đặt) không đụng — ghi sổ 🟡 cho module In ấn (#32b): huỷ đơn có `inventory_status='reserved'` nên trả phôi.
- Không thêm CHECK cho `work_tasks.status`/`contract_events.status` — đó là #26.

## 4. Verify — số chờ điền

| Kiểm | Cách | Chờ |
|---|---|---|
| Local | đã làm ở §1 | ✓ (tái hiện lỗi → fix → revert → áp lại) |
| Áp prod | migrate-direct | "completed"; `pg_get_functiondef` chứa `'huy_don'`, không chứa `SET status = 'da_huy'` |
| Không đổi dữ liệu | `count contracts by status`, `count printing_orders by status` trước/sau | khớp 100% (chỉ đổi hàm) |
| Cửa thật | chủ huỷ 1 HĐ kẹt trên UI ở #14 | thành công, đơn in liên quan `huy_don`, không lỗi; V0 lần 3 "HĐ kẹt huỷ" 5 → 0 |
| Vault | `vault:db-truth` | 1 hàm đổi |

## 5. Rủi ro & đường lùi
- Rủi ro chức năng: sau fix nút Huỷ **hoạt động thật** → admin có thể huỷ nhầm. Cascade đã có khoá: cần `p_user_id`, HĐ đã huỷ thì bỏ qua; UI có xác nhận. Không thêm gì.
- Đường lùi: `revert.sql` (đã thử local) — nhưng quay lui = quay về trạng thái *không huỷ được*; chỉ dùng khi cascade gây hậu quả bất ngờ.

## 6. Kết quả — 07/09/2026

| Kiểm | Kết quả |
|---|---|
| Local (trước áp prod) | bản sống: `23514 violates check constraint "printing_orders_status_check"`, HĐ giữ `dang_thuc_hien` → sau migration: HĐ **`da_huy`** · đơn **`huy_don`** · task **`da_huy`** · `cancelled_at` có → `revert.sql` về `da_huy` ✓ → áp lại |
| Áp prod | `migrate-direct` "completed successfully"; khối `UPDATE public.printing_orders SET status = 'huy_don'` trên thân hàm sống; `SET status = 'da_huy'` chỉ còn ở `work_tasks` (đúng) |
| Dữ liệu | count `contracts` + `printing_orders` theo trạng thái trước/sau **khớp 100%** (chỉ đổi hàm) |
| Vault | `vault:db-truth`: 149 hàm; `than-ham/hop-dong.md` có `SET status = 'huy_don'` ×1 |
| Cửa thật | chờ #14: chủ bấm Huỷ trên UI cho HĐ kẹt → kỳ vọng thành công, đơn in liên quan `huy_don`; V0 lần 3 "HĐ kẹt huỷ" 5 → 0 |
