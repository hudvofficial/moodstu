# T-20260807-regen-database-types — Sinh lại `types/database.types.ts` cho khớp DB

**Owner:** chờ user chốt (Claude tự làm / giao Codex)
**Locks:** `types/database.types.ts`, `lib/moodie/memory-store.ts`, `lib/moodie/runs/worker.ts`, `package.json`, `vault/30-du-lieu/canh-bao-schema.md`
**Trạng thái:** chờ duyệt

---

## 1. Vấn đề

`types/database.types.ts` được sinh ra ở một thời điểm rồi ngừng cập nhật; DB đã đi tiếp. TypeScript **không bảo vệ** cho phần lệch.

| | Trong file | Trong DB |
|---|---:|---:|
| Bảng | 82 | **98** |
| View | 1 | **4** |
| RPC (PostgREST phơi ra) | 115 | **130** |
| Enum | 15 | **16** |

Thiếu cả **8 bảng bị thiếu cột** đã tồn tại trong file.

## 2. Đo trước khi sửa (đã chạy, không phải suy đoán)

### 2.1 Độ lệch — thuần cộng thêm, không mất gì

Diff file hiện tại với DB production:

- **0 bảng** có trong types mà DB không có
- **0 cột** có trong types mà DB không có
- **0 cột** lệch `nullable` (kiểm 82 bảng × mọi cột chung)
- **0 hàm** lệch tên tham số (kiểm 80 hàm parse được)
- **16 bảng** DB có, types thiếu:
  `approval_requests` `gallery_password_attempts` `google_sync_queue` `inventory_reservations` `moodie_action_approvals` `moodie_brave_audit_events` `moodie_brave_usage_daily` `moodie_memory_relations` `moodie_observations` `order_payments` `printing_order_status_history` `push_subscriptions` `realtime_signals` `vendors` `vendor_payments` `vendor_payment_allocations`
- **8 bảng thiếu cột:**
  | Bảng | Cột DB có, types thiếu |
  |---|---|
  | `printing_orders` | `cancellation_reason` `cancelled_at` `delivered_at` `deposit_amount` `final_amount` `inventory_status` `issue_reason` `issue_reported_at` `issue_reported_by` `paid_amount` `remaining_amount` |
  | `inventory_transactions` | `is_rollback` `parent_transaction_id` `reservation_id` `rolled_back_txn_id` |
  | `gallery_images` | `blur_data_url` `blur_hash` `height` `width` |
  | `dresses` | `blur_data_url` `blur_hash` |
  | `expenses` | `debt_id` `work_task_id` |
  | `receipts` | `debt_id` |
  | `work_tasks` | `vendor_id` |
  | `gallery_comments` | `updated_at` |

**Kết luận:** thay file = **thuần bổ sung**. Không thuộc tính nào biến mất → không đường truy cập nào gãy vì thiếu type.

### 2.2 Chỉnh lại con số đã báo trước đó

Trước mình nói "thiếu 30 hàm". **Sai một nửa:** 30 hàm plpgsql/sql có trong DB mà không có trong types, nhưng **14 trong số đó trả `trigger`/`event_trigger`** → PostgREST không phơi ra → **đúng ra không được nằm trong file types**. `get_gallery_data_v2` bị bỏ vì **có 2 overload** (xem §6).

Khoảng trống thật = **15 RPC gọi được**:
`add_fulfillment_transaction_atomic` `contract_stats_simple` `delete_fulfillment_transaction_atomic` `expire_old_reservations` `finance_vendor_debt_summary` `get_contract_detail_v3` `get_customer_ltv` `get_gallery_data_v3` `get_gallery_summaries_by_contract` `is_active_employee` `record_vendor_payment_atomic` `reserve_moodie_brave_call` `resolve_vendor_expense_category_id` `update_fulfillment_transaction_atomic` `upsert_vendor_expense`

### 2.3 Bán kính ảnh hưởng — đã type-check thật

Đã thay file, chạy `npx tsc --noEmit -p tsconfig.json`, rồi trả file cũ về.

- **Baseline (file hiện tại): 0 lỗi**
- **Sau khi thay: 3 lỗi**, tất cả cùng một dạng, tất cả trong Moodie

```
lib/moodie/memory-store.ts(46,7): TS2322: Type 'string | null' is not assignable to type 'string | undefined'.
lib/moodie/runs/worker.ts(59,5):  TS2322: Type 'number | null' is not assignable to type 'number | undefined'.
lib/moodie/runs/worker.ts(113,5): TS2322: Type 'string | null' is not assignable to type 'string | undefined'.
```

Nguyên nhân: bản sinh mới khai tham số RPC **có DEFAULT** thành **optional** (`p_x?: T`) thay vì nullable (`p_x: T | null`). Code đang truyền `?? null` tường minh.

Chỉ 3 chỗ vì phần lớn app dùng client **không gắn generic** (`createAdminClient()` trả `SupabaseClient` trần). Chỉ nhánh Moodie + vài file `lib/` dùng `SupabaseClient<Database>`.

### 2.4 Công cụ sinh — đã chạy được

```bash
npx supabase gen types typescript --project-id mnoqeluywookswpcykha
```
✅ Chạy được, exit 0, ra 7233 dòng. Dùng Management API với token `supabase login` sẵn có.

❌ **Đừng dùng `--db-url`** — biến thể đó cần Docker (`failed to connect to the docker API`), máy này không chạy Docker Desktop.

### 2.5 Thứ không đổi

- File mới **vẫn export đủ**: `Json`, `Database`, `Tables<>`, `TablesInsert<>`, `TablesUpdate<>`, `Enums<>`, `CompositeTypes<>`, `Constants`.
- File mới **bỏ khối `graphql_public`**. Đã grep: không code nào dùng → an toàn.
- `Constants` được export nhưng **không nơi nào import** → thứ tự phần tử `service_type_enum` trong `Constants` đổi (`… media, outsource, khac` → `… media, khac, outsource`) **không ảnh hưởng gì**. Đây là thứ tự thật trong DB.
- `eslint types/database.types.ts` hiện exit 0 — bản mới cùng định dạng máy sinh, vẫn phải kiểm lại (Task 5).

---

## 3. Việc phải làm

### Task 1 — Sinh file mới
```bash
cd "c:/Users/Admin/Desktop/Ai/mood saas/mood-studio"
npx supabase gen types typescript --project-id mnoqeluywookswpcykha > types/database.types.ts.new
```
**Verify:** `wc -l types/database.types.ts.new` ≈ 7233 dòng; `head -9` thấy `export type Json` + `export type Database`.
Nếu file rỗng hoặc <1000 dòng → CLI chưa đăng nhập → dừng, báo user chạy `npx supabase login`.

### Task 2 — Thay file
```bash
mv types/database.types.ts.new types/database.types.ts
```
**Verify:** `git diff --stat types/database.types.ts` — chỉ 1 file đổi.

### Task 3 — Sửa `lib/moodie/memory-store.ts` dòng 46
```diff
-      p_conversation_id: params.conversationId || null,
+      p_conversation_id: params.conversationId || undefined,
```
Giữ `||` (không đổi sang bỏ hẳn) để chuỗi rỗng vẫn không lọt xuống DB dưới dạng uuid rỗng.

### Task 4 — Sửa `lib/moodie/runs/worker.ts` dòng 59 và 113
```diff
-    p_progress: input.progress ?? null,
+    p_progress: input.progress,
```
```diff
-    p_error: input.error ?? null,
+    p_error: input.error,
```
`progress?: number` và `error?: string` vốn đã là `T | undefined` → bỏ `?? null` là đủ.

**Vì sao đổi `null` → `undefined` KHÔNG đổi hành vi** (đã tra `pg_get_function_arguments`):
```
match_moodie_memories(…, p_conversation_id uuid DEFAULT NULL::uuid, …)
heartbeat_moodie_agent_run(…, p_progress integer DEFAULT NULL::integer, …)
finish_moodie_agent_run(…, p_error text DEFAULT NULL::text, …)
```
Cả ba đều `DEFAULT NULL`. supabase-js `JSON.stringify` body → khoá `undefined` bị loại → Postgres áp default = `NULL`. Kết quả y hệt truyền `null` tường minh.

### Task 5 — Verify
```bash
npx tsc --noEmit -p tsconfig.json          # kỳ vọng: 0 lỗi
npx eslint types/database.types.ts lib/moodie/memory-store.ts lib/moodie/runs/worker.ts   # kỳ vọng: exit 0
npm run verify:moodie-runtime              # đường Moodie thật sự chạy
npm run build                              # kỳ vọng: build pass
```
Bất kỳ bước nào đỏ → **dừng, không push** (luật lint exit≠0).

### Task 6 — Thêm script để lần sau chỉ 1 lệnh
`package.json`, thêm vào `"scripts"` ngay dưới dòng `"migrate:verify"`:
```json
"db:types": "supabase gen types typescript --project-id mnoqeluywookswpcykha > types/database.types.ts",
```
**Verify:** `npm run db:types` chạy được, `git diff types/database.types.ts` rỗng (vì vừa sinh xong ở Task 1 — bằng chứng lệnh tái lập được).

### Task 7 — Cập nhật `vault/30-du-lieu/canh-bao-schema.md`
Viết lại mục "⚠️ `types/database.types.ts` ĐANG LỆCH DB" thành:
- ghi ngày đồng bộ 2026-08-07 (98 bảng / 4 view / 130 RPC / 16 enum)
- **cách giữ đồng bộ:** chạy `npm run db:types` sau mỗi migration, cùng lúc với `node scripts/vault-gen-schema.mjs`
- giữ nguyên mục "Cột dễ đoán nhầm", "RLS 9 bảng 0 policy", "service_type 4 SSOT"
- thêm 2 giới hạn đã biết ở §6 dưới đây

### Task 8 — Ghi `agent/TASKS.yaml`
Thêm entry `T-20260807-regen-database-types` status `done`, kèm kết quả đo (0→3 lỗi tsc, đã sửa 3 dòng).

### Task 9 — Commit
```
fix(types): sinh lại database.types.ts khớp DB (+16 bảng, +3 view, +15 RPC)
```
Không push kèm việc khác.

---

## 4. Tiêu chí thành công

- [ ] `npx tsc --noEmit` **0 lỗi** (bằng baseline)
- [ ] `npm run build` pass
- [ ] `npx eslint` trên 3 file đổi → exit 0
- [ ] `npm run verify:moodie-runtime` pass
- [ ] `types/database.types.ts` có đủ 98 bảng — kiểm nhanh: `grep -c "        Row: {" types/database.types.ts` ≥ 102 (98 bảng + 4 view)
- [ ] `npm run db:types` chạy lại cho ra file **giống hệt** (`git diff` rỗng)

## 5. KHÔNG làm trong task này

- **Không** gắn `SupabaseClient<Database>` cho các client đang trần. Đó là dự án riêng, sẽ đẻ ra hàng trăm lỗi type ở contracts/finance/gallery — cần ADR và làm từng module.
- **Không** đụng `gallery-composite-actions.ts` (xem §6).
- **Không** xoá `app/actions/gallery-cursor-actions.ts` dù là dead code (luật Surgical: nêu ra, đừng xoá).
- **Không** viết CI job kiểm lệch schema — chưa có bằng chứng cần; `npm run db:types` cạnh `vault-gen-schema.mjs` là đủ rẻ.

## 6. Hai phát hiện phụ (ghi nhận, không sửa ở đây)

### 6.1 `get_gallery_data_v2` sẽ KHÔNG có trong file types
Hàm này có **2 overload** trong DB:
```
get_gallery_data_v2(p_gallery_id uuid)
get_gallery_data_v2(p_gallery_id uuid, p_limit integer, p_offset integer)
```
Supabase CLI bỏ qua hàm overload → sau khi sinh lại, types có `get_gallery_data_v3` nhưng **không có** `v2`.
`app/actions/gallery-composite-actions.ts:42` union cả hai tên và dùng `v2` làm fallback khi `NEXT_PUBLIC_RPC_V3` tắt. File đó dùng client **không generic** nên **không lỗi compile** (đã chứng minh: chỉ 3 lỗi, không có chỗ này). Muốn types phủ được `v2` thì phải **drop overload 1 tham số** — việc riêng, cần kiểm ai còn gọi bản 1 tham số.

### 6.2 `gallery-cursor-actions.ts` gọi RPC không tồn tại
`app/actions/gallery-cursor-actions.ts:52` gọi `supabase.rpc("get_gallery_data_cursor", …)`.
**Hàm này không có trong DB** (chỉ có `get_gallery_data_v2`/`v3`/`get_gallery_summaries_by_contract`).
File **không được import ở đâu** — dead code, nên chưa nổ. Nêu ra để user quyết định xoá hay hiện thực RPC. Không đụng trong task này.

---

## 7. Rủi ro

| Rủi ro | Mức | Xử lý |
|---|---|---|
| Type mới làm gãy code | **Thấp** — đã đo, đúng 3 lỗi, đã có fix chính xác | Task 3–4 |
| Đổi `null`→`undefined` đổi hành vi runtime | **Thấp** — cả 3 tham số `DEFAULT NULL`, undefined bị loại khỏi JSON body → cùng ra NULL | `verify:moodie-runtime` + build |
| CLI chưa đăng nhập ở máy khác | Trung bình | Task 1 có bước dừng + hướng dẫn `supabase login` |
| Sinh nhầm từ project dev thay vì prod | **Thấp** — project-id ghi cứng `mnoqeluywookswpcykha`, khớp `NEXT_PUBLIC_SUPABASE_URL` trong `.env.local` | Kiểm số bảng = 98 |

Hoàn tác: `git checkout types/database.types.ts lib/moodie/` — không có migration, không đụng DB.
