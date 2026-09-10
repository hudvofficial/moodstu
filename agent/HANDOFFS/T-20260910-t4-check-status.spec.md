# T-20260910-t4-check-status — T4: CHECK danh mục đóng cho `work_tasks.status` + `contract_events.status`

**Owner:** claude (spec → chủ duyệt → claude áp DB → commit ngay) · **Trạng thái:** ✅ ĐÃ ÁP PROD 10/09 (chủ "duyệt" 10/09) · commit `0a35475` · chủ "push" 10/09 → `origin/main` · `/buoc done` 10/09 · **Chương trình:** GĐ2 tuần 7, bước #26 (`agent/GOALS.yaml`), gate #10 ✅ · **DB:** 2 `ADD CONSTRAINT … CHECK … NOT VALID` + 2 `VALIDATE CONSTRAINT`; 0 hàm, 0 dữ liệu, 0 đổi kiểu cột · **ADR:** không cần — thêm ràng buộc khớp đúng kiểu TS `TaskStatus` đã dùng từ 05/2026, không đổi data-flow · **Revert:** `agent/HANDOFFS/T-20260910-t4-check-status.revert.sql` (2 `DROP CONSTRAINT`).

## 0. Vì sao

Sổ đối chiếu `agent/inventory/00-lech-thiet-ke.md` dòng 88: *"`work_tasks.status` · `contract_events.status`: `text` tự do, không enum, không CHECK — nền của lỗi lương ở mục B; mọi lần so sánh chuỗi sai chính tả"*. PHUONG-AN T4: *"sai chính tả trạng thái fail lúc ghi thay vì im lặng nhiều tuần"*; điều kiện cổng G2: *"CHECK status validated"*.

Tiền lệ đã trả giá: `printing_orders` **có** CHECK nên khi `cancel_contract_cascade` ghi sai giá trị, lỗi nổ ngay `23514` và được bắt ở #13. Hai bảng này **không có** CHECK: một giá trị lạ (`"hoan_thnah"`, `"xong"`, `NULL`) sẽ nằm im, lương/tiến độ đếm thiếu mà không ai biết. Bước này chỉ dựng hàng rào — dữ liệu hiện tại đã sạch nên VALIDATE ngay.

## 1. Sự thật đã đo (10/09, chỉ đọc trên prod)

- **Kiểu cột:** cả hai `status` là `character varying`, `NULL` được phép, default `'chua_lam'`. Không enum cho status (`event_type_enum`, `work_type_enum` là cột khác). CHECK hiện có trên 2 bảng: `contract_events_google_sync_status_check`, `work_tasks.check_assignment_mutually_exclusive` — không đụng `status`.
- **Phân bố (kể cả xoá mềm):** `work_tasks` 171 dòng = `hoan_thanh` 167 · `dang_lam` 2 · `da_huy` 2. `contract_events` 220 dòng = sống 175 (`hoan_thanh` 162 · `chua_lam` 11 · `dang_lam` 2) + xoá mềm 45 (`da_huy` 38 · `chua_lam` 3 · `dang_lam` 2 · `hoan_thanh` 2). **0 NULL, 0 giá trị ngoài 4 trạng thái.**
- **Ai ghi status:** app chỉ ghi literal `chua_lam` / `dang_lam` / `da_huy` (`work-task-actions.ts:156,254,376,421`, `contract-event-actions.ts:490,695,752`, `task-assign-actions.ts:81`) hoặc `input.status` kiểu `TaskStatus` (`task-assign-actions.ts:129`); `updateEventStatus` nhận union 3 giá trị. Hàm DB: `cancel_contract_cascade` + `delete_contract_cascade` ghi `work_tasks.status = 'da_huy'`; `delete_contract_cascade` chỉ xoá mềm `contract_events` (không đổi status). Trigger trên 2 bảng: `update_updated_at_column`, `emit_realtime_signal` — không ghi status. TS: `TaskStatus = "chua_lam" | "dang_lam" | "hoan_thanh" | "da_huy"` (`types/contract.ts:55`) dùng cho **cả** `ContractEvent.status` và `WorkTask.status`; `TASK_STATUS_MAP` 4 nhãn.
- **Phát hiện ngoài phạm vi (ghi lại, không làm ở đây):** 94 mốc `hoan_thanh` **không có `event_date`** = `hau_ky` 56/56 · `giao_san_pham` 31/32 (30 HĐ sống) · `ngay_to_chuc` 6/33 · `ngay_chup` 1/41 → mốc hậu kỳ/giao sản phẩm **theo lệ** được đánh xong không cần ngày; ràng buộc "xong phải có ngày" là quyết định nghiệp vụ + màn hình (→ #30), không thể VALIDATE hôm nay.
- Backup đêm 10/09 02:09 OK (6,1 MB · 93 bảng).
- **Diễn tập cục bộ** (`mood_restore`, dump 10/09 + dòng thử cục bộ; 168 việc · 217 mốc): trước → `UPDATE work_tasks SET status='hoan_thnah'` và `UPDATE contract_events SET status=NULL` **ghi thành công** (rollback). Áp migration → 2 CHECK `convalidated = true` → `hoan_thnah` / `NULL` (work_tasks) / `xong` / `NULL` (contract_events) đều **`23514 violates check constraint`**; `SET status = status` OK; INSERT không `status` (default `chua_lam`) OK; phân bố status trước/sau khớp. `revert.sql` → 0 CHECK → áp lại → 2 CHECK validated ✓.

## 2. Phạm vi — 1 migration, 2 ràng buộc, 0 file app

`supabase/migrations/20260910120000_t4_check_status_work_tasks_contract_events.sql` (không BEGIN/COMMIT — `migrate-direct` tự bọc):

| Bảng | Ràng buộc | Biểu thức |
|---|---|---|
| `work_tasks` | `work_tasks_status_check` | `status IS NOT NULL AND status IN ('chua_lam','dang_lam','hoan_thanh','da_huy')` — thêm `NOT VALID` rồi `VALIDATE` ngay |
| `contract_events` | `contract_events_status_check` | như trên |

- `status IS NOT NULL` nằm trong CHECK vì CHECK thường **cho qua NULL**; app và TS không bao giờ coi NULL là trạng thái hợp lệ, cột đã có default. Không đổi cột sang `NOT NULL` (giữ đúng "chỉ thêm CHECK" của sổ).
- `NOT VALID → VALIDATE` trong cùng lần áp: bảng 171/220 dòng, quét tức thời; giữ đúng công thức của PHUONG-AN để lần sau (bảng lớn) làm y hệt.
- App **không đổi**: mọi đường ghi đã đúng 4 giá trị; nếu sau này có chỗ ghi sai, `withAuth` trả `success:false` với thông điệp Postgres `23514` — đúng ý "fail lúc ghi".

Áp: `ALLOW_PROD_WRITE=1 node scripts/migrate-direct.mjs 20260910120000_t4_check_status_work_tasks_contract_events.sql` → kiểm `pg_constraint` → `npm run vault:db-truth` + `node scripts/vault-gen-schema.mjs` (lược đồ có CHECK mới) → **commit ngay**. Push chờ chủ "đẩy".

## 3. Ngoài phạm vi
- CHECK `status='hoan_thanh' ⇒ event_date IS NOT NULL` (sổ đối chiếu dòng 77 gợi ý cho #26): dữ liệu 94/220 vi phạm theo lệ vận hành (§1) → thuộc **#30** cùng màn hình bắt ngày khi đánh xong; không đưa vào đây.
- Chuyển `status` sang enum Postgres: đổi kiểu cột + sinh lại `database.types.ts` → không cần, CHECK đủ "danh mục đóng".
- `contracts.status`, `payment_plans.status`, `printing_orders.status`: đã có CHECK hoặc thuộc bước khác. `crm_leads`, `schedules.status` (`'moi'` default, giá trị tự do) → không trong sổ.
- `normalizePhone` (#27) — bước riêng.

## 4. Verify — số chờ điền

| Kiểm | Cách | Chờ |
|---|---|---|
| Local (`mood_restore`) | trước: `UPDATE … status='hoan_thnah'` và `status=NULL` **ghi được** (rollback) → áp migration → 4 phép ghi sai (`hoan_thnah`, `NULL` ×2, `xong`) → `23514`; ghi giá trị hợp lệ + INSERT không `status` (default) → OK → `revert.sql` → 0 CHECK → áp lại → 2 CHECK `convalidated = true` | ✓ |
| Áp prod | `migrate-direct` | "completed"; `pg_constraint`: 2 dòng `convalidated = true` |
| Không đổi dữ liệu | phân bố status 2 bảng trước/sau | khớp 100% (171 · 220) |
| Hàng rào thật | qua service role (cờ S3): `UPDATE work_tasks SET status='hoan_thnah'` trên 1 dòng thật → bị từ chối, dòng giữ nguyên | lỗi `23514 … work_tasks_status_check`, giá trị cũ còn nguyên |
| App | `npm run verify:contracts` · `tsc` | pass · 0 |
| Vault | `vault:db-truth` (hàm không đổi) + `vault-gen-schema` (lược đồ 2 bảng có CHECK) | 2 CHECK xuất hiện trong `luoc-do-hop-dong.md` |
| Rác | `sweep-e2e-residue.sql` | 0 (không test e2e — không seed) |

## 5. Rủi ro & đường lùi
- Có chỗ ghi lạ chưa trace ra → từ nay ghi thất bại `23514` nổi lên ngay (Sentry/console) — đúng chủ đích; sửa chỗ ghi, không gỡ CHECK.
- Dữ liệu trôi giữa lúc đo và lúc áp (một dòng lạ mới) → `VALIDATE` fail → cả migration abort (một giao dịch), không để lại CHECK nửa vời; đo lại DISTINCT rồi áp lại.
- Đường lùi: `revert.sql` = 2 `DROP CONSTRAINT IF EXISTS`, đã thử local.

## 6. Kết quả — 10/09/2026

| Kiểm | Kết quả |
|---|---|
| Local | ✓ (§1: ghi sai ×4 → `23514`, hợp lệ OK, revert → 0 → áp lại → 2 validated) |
| Áp prod | `migrate-direct` "completed successfully". `pg_constraint`: `work_tasks_status_check` + `contract_events_status_check`, **`convalidated = true`** cả hai, biểu thức `status IS NOT NULL AND status = ANY(chua_lam, dang_lam, hoan_thanh, da_huy)` |
| Không đổi dữ liệu | trước = sau: `work_tasks` 171 (hoan_thanh 167 · dang_lam 2 · da_huy 2) · `contract_events` 220 (hoan_thanh 164 · chua_lam 14 · dang_lam 4 · da_huy 38) — **khớp 100%** |
| Hàng rào thật | service role ghi vào 1 dòng thật mỗi bảng: `work_tasks` `'hoan_thnah'` / `NULL`, `contract_events` `'xong'` / `NULL` → **4/4 `23514 violates check constraint`**, dòng giữ nguyên `status` + `updated_at` |
| App | `verify:contracts` pass · `tsc` 0 (không đổi file app) |
| Vault | `vault:db-truth` (149 hàm · 187 policy, không đổi) · `vault-gen-schema`: `luoc-do-hop-dong.md` có 2 CHECK mới; 9 file lược đồ cập nhật số dòng/policy trôi từ baseline 02/09 (payments 51→69, payment_plans policy 6→2 sau #24…) |
| Rác | sweep 22 bảng/nhóm = **0**; `realtime_signals` 6 (tín hiệu thật) |
| Sổ | DB-CHANGELOG 2 dòng (chuẩn bị + ĐÃ ÁP) · GOALS #26 `cho-xem-diff` · sổ đối chiếu dòng 88 gạch khi `/buoc done` |
