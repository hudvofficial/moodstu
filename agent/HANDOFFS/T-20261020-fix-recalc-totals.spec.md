# T-20261020-fix-recalc-totals — `recalc_contract_totals` chạy được và tính ĐÚNG (net giảm giá, bỏ hạng mục xoá mềm)

**Owner:** claude (spec → chủ duyệt → claude áp DB + sửa 1 file TS → commit ngay) · **Trạng thái:** ✅ chủ duyệt + ĐÃ ÁP DB prod 20/10/2026 (md5 `0e6b014d…`, ACL giữ nguyên, `verify:db-refs` prod 0 vi phạm) · phần code `dress-mutations.ts` (throw khi recalc lỗi) **đã sửa, commit local, CHƯA push** → có hiệu lực ở app sau khi push · **Mức:** 🟡 trung bình, chưa phát tác (đường dùng: thêm/bỏ phụ kiện váy kiểu phát sinh; dữ liệu hiện 0 đặt váy) · **DB:** `CREATE OR REPLACE` 1 hàm, 0 bảng, 0 dữ liệu · **Code:** `app/actions/dress-mutations.ts` (kiểm lỗi RPC, 2 chỗ) · **ADR:** không cần — đưa hàm về đúng bất biến đã có `total_amount = Σ hạng mục sống − discount_amount` (đo 73/73 HĐ) · **Revert:** `agent/HANDOFFS/T-20261020-fix-recalc-totals.revert.sql` (soạn khi làm) · **Nguồn:** `docs/reports/audit_2026-10-20_luong-hop-dong.md` mục "Hai LỖI RIÊNG".

> ⚠️ Chưa có bước trong `agent/GOALS.yaml` — xem §7. Bộ spec đi cùng: `T-20261020-fix-void-payment` (🔴, làm trước), `T-20261020-plan-card-next-hide` (🟢).

## 0. Vì sao

`recalc_contract_totals(p_contract_id)` khai `v_payment_status payment_status_enum` — kiểu **không tồn tại** trên prod ⇒ hàm báo `type "payment_status_enum" does not exist` mỗi lần gọi. Hai chỗ gọi (`app/actions/dress-mutations.ts:437` thêm váy phát sinh, `:553` bỏ váy phát sinh) `await supabase.rpc(...)` **không kiểm lỗi** ⇒ hạng mục váy được thêm/xoá nhưng tổng HĐ **không bao giờ được tính lại**, im lặng.

**Cạm bẫy — chỉ sửa kiểu enum sẽ làm hàm chạy thật nhưng tính SAI nặng hơn lỗi hiện tại** (đã đo, §1): (1) cộng cả hạng mục đã xoá mềm; (2) ghi `total_amount = Σ hạng mục` mà **không trừ `discount_amount`** (trong khi mọi nơi khác: `total = Σ hạng mục − discount`); (3) chạy cả trên HĐ đã xoá mềm (xoá cascade đã xoá mềm hết hạng mục ⇒ tổng về 0).

## 1. Sự thật đã đo (20/10, chỉ đọc prod + bản sao cục bộ, transaction + ROLLBACK)

- Thân sống: `v_total = SUM(contract_items.total_amount)` **không lọc `deleted_at`**; `UPDATE contracts SET total_amount = v_total …` (không trừ giảm giá); `v_remaining = v_total − v_discount − v_paid`; ngưỡng cọc 0,3 (khác `save_contract_atomic` 0,5 — nhưng trigger `trg_contract_payment_status_v2` BEFORE UPDATE ghi đè `payment_status` bằng `contract_payment_status_v2` nên ngưỡng này vô nghĩa). Không tham số `p_actor`, không set `updated_by`.
- Bất biến thật: **73/73 HĐ sống có `total_amount = Σ hạng mục sống − discount_amount`** (đo, 0 ngoại lệ); `paid_amount = Σ phiếu thu sống` 73/73.
- **Thử HĐ-2026-0046** (total thật 6,0tr = 6,9tr − 0,9tr giảm giá; có 2 dòng hạng mục 6,9tr, 1 dòng đã xoá mềm): bản sống → `type "payment_status_enum" does not exist`; **chỉ sửa kiểu enum → `total_amount = 13.800.000`** (gấp 2,3 lần thật; còn nợ ảo 7,8tr); **bản đề xuất → 6.000.000** (đúng).
- **Bản đề xuất gọi trên cả 75 HĐ** (trong transaction): chỉ đổi **2 HĐ — cả hai đã xoá mềm** (0005, 0042: hạng mục đã bị xoá mềm hết ⇒ tổng về 0) ⇒ cần chặn `deleted_at IS NOT NULL`; 73 HĐ sống **không đổi gì** (total/paid/remaining/status).
- Người gọi: chỉ `dress-mutations.ts:437,553` (+ `types/database.types.ts`); dữ liệu: 0 `dress_reservations`, 0 hạng mục váy phát sinh ⇒ đường này chưa từng chạy.
- Phối hợp ADR-020 (`20261020100000`, chưa áp): khi `total_amount` đổi, trigger `trg_contract_total_resync_plans_v2` kéo đợt `final` theo — recalc sau fix tự được phủ.

## 2. Phạm vi

1. **Migration** `supabase/migrations/<ts>_fix_recalc_contract_totals.sql` — `CREATE OR REPLACE` giữ chữ ký `(p_contract_id uuid) RETURNS void`, `SECURITY DEFINER`, `search_path = public`, ACL `{postgres, service_role}` (đo lại sau áp):
   - `v_total := GREATEST(0, Σ contract_items.total_amount WHERE deleted_at IS NULL − discount_amount)`;
   - `v_paid := Σ payments WHERE deleted_at IS NULL` (như cũ);
   - `v_remaining := GREATEST(0, v_total − v_paid)`; `payment_status := contract_payment_status_v2(v_paid, v_remaining)` (nguồn canonical; bỏ biến enum, bỏ ngưỡng 0,3);
   - `UPDATE contracts … WHERE id = p_contract_id AND deleted_at IS NULL` (HĐ đã xoá mềm: không đụng);
   - `updated_at = now()` như cũ.
2. **`app/actions/dress-mutations.ts:437,553`** — nhận `{ error }` của `supabase.rpc("recalc_contract_totals", …)` và `throw new Error(...)` khi lỗi (đúng kiểu các lỗi lân cận trong file: `Loi tinh lai tong hop dong: ${error.message}`). Không đổi thứ tự thao tác. **Cân nhắc rủi ro:** thêm throw nghĩa là nếu recalc lỗi thì thêm-váy báo lỗi (hạng mục đã chèn rồi) — hiện im lặng làm tổng sai; chọn "lỗi to" vì sai tiền im lặng tệ hơn (xem §7 câu 2).
3. Sổ: dòng `agent/DB-CHANGELOG.md` (CHUẨN BỊ) trước khi áp; `AGENT_WORKLOG.md`.
4. Dùng lại **`verify:db-refs`** của spec `fix-void-payment` (sau khi cả hai fix lên → 0 vi phạm).

## 3. Ngoài phạm vi
- Luồng váy phát sinh khác (đặt váy, `fallbackRefreshDressStatus`).
- Ba hàm ghi `total_amount` khác chưa từng chạy (`create_contract_inventory_addon_sale_atomic`, `*_fulfillment_transaction_atomic`) — ghi sổ, không đụng.
- Gộp `recalc_contract_totals` vào `save_contract_atomic` (đổi kiến trúc → cần ADR riêng nếu muốn).

## 4. Verify — số chờ điền

| Kiểm | Cách | Chờ |
|---|---|---|
| Tái hiện | local `mood_restore`, gọi bản sống trên HĐ-0046 | `type "payment_status_enum" does not exist` |
| Không phình số | bản đề xuất trên HĐ-0046 | `total=6.000.000`, `remaining=0` |
| No-op trên HĐ sống | gọi bản đề xuất trên **toàn bộ 73 HĐ sống** (txn+ROLLBACK), so `total/paid/remaining/payment_status` trước-sau | **0 HĐ đổi** |
| Không đụng HĐ xoá mềm | gọi trên 0005, 0042 | không đổi (đang `total` 3,5tr / 7,4tr) |
| Thêm phụ kiện | chèn 1 `contract_items` 300k sống vào HĐ test → recalc | `total +300k`; (nếu ADR-020 đã áp) đợt `final` +300k và Σ đợt = total |
| Bỏ phụ kiện | xoá mềm hạng mục đó → recalc | `total` về số cũ |
| Có giảm giá | HĐ có `discount_amount>0` | `total = Σ − discount`, không bao giờ âm |
| Tiền đã thu > total mới | giảm tổng xuống dưới số đã thu | `remaining=0`, `payment_status='da_thanh_toan'`; health check `overpaid_contracts` báo (không chặn) |
| Code | `npx eslint app/actions/dress-mutations.ts` (**hiện exit 0, 0 lỗi — phải giữ**), `npx tsc`/`npm run build` | exit 0 |
| Kiểm tĩnh | `npm run verify:db-refs` | không còn `payment_status_enum` |
| Áp prod | `ALLOW_PROD_WRITE=1 node scripts/migrate-direct.mjs <file>` | `pg_get_functiondef` không chứa `payment_status_enum`; `proacl` giữ nguyên; `vault:db-truth`; commit ngay |
| Thử thật | **không thử trên prod** (cần thêm/bỏ váy thật); thử local | — |

## 5. Rủi ro & đường lùi
- Rủi ro: hàm bắt đầu **chạy thật** lần đầu trên prod → mọi sai sót nằm ở đây; giảm bằng test no-op 73 HĐ sống + test có giảm giá.
- Đường lùi: `revert.sql` = bản sống (luôn lỗi) — quay về không tính lại, chỉ khi cần đối chiếu.

## 6. Kết quả
_(điền sau khi làm)_

## 7. Câu hỏi mở cho chủ
1. Thêm vào `agent/GOALS.yaml` hay chạy ngoài sổ? Không tự sửa sổ.
2. Có muốn throw khi recalc lỗi (đề xuất) hay chỉ ghi log và tiếp tục như hiện nay?
3. Thứ tự: nên áp **sau** ADR-020 để recalc được trigger kéo lịch thu theo; nếu áp trước vẫn đúng, chỉ là đợt `final` lệch tới khi ADR-020 lên.

## 8. Kết quả (20/10/2026)
- `supabase/migrations/20261020120000_fix_recalc_contract_totals.sql` + revert (`SET LOCAL check_function_bodies = false` — thân sống tham chiếu kiểu không tồn tại nên PostgreSQL chỉ cho tạo khi tắt kiểm thân hàm, giống `pg_dump`; sau revert local `md5` = `d437dae8…` khớp prod) + `scripts/verify-recalc-totals.mjs` (`npm run verify:recalc-totals`).
- Cục bộ (bản sao prod 20/10): trước migration **1/9 PASS** (lỗi `payment_status_enum`); sau **13/13** (15/15 khi có ADR-020: thêm phụ kiện 300k → đợt Tất toán +300k, Σ đợt = total); gọi trên **toàn bộ 75 HĐ → HĐ sống đổi 0 (73), HĐ xoá mềm đổi 0 (2)**; có giảm giá + hạng mục xoá mềm (kiểu HĐ-0046) → 6,0tr; giảm giá ≥ tổng hạng mục → 0; tổng mới < số đã thu → `remaining 0`, `da_thanh_toan`; gọi 2 lần y nguyên.
- Prod: áp xong, `verify:db-refs` 0 vi phạm, 10/10 health check = 0, tổng 73 HĐ không đổi. Không gọi recalc trên HĐ thật.
- Code: `app/actions/dress-mutations.ts:437,553` nhận `{ error }` của RPC và `throw new Error("Loi tinh lai tong hop dong: …")` (diff 4 dòng thêm / 2 dòng bớt); `eslint` exit 0, `tsc --noEmit` exit 0.
