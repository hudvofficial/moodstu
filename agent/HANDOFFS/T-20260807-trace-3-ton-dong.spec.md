# T-20260807 — Trace 3 vấn đề còn tồn sau khi sinh lại types

**Owner:** Claude (phân tích) · **Trạng thái:** trace xong, chờ user chốt hướng xử lý
**Không sửa gì trong lượt này.** Working tree sạch sau khi đo.

---

## Vấn đề 1 — `get_gallery_data_v2` có 2 overload

### Truy nguyên

| Migration | Tạo gì |
|---|---|
| `20260523100000_gallery_data_v2_rpc.sql:6` | `CREATE OR REPLACE FUNCTION get_gallery_data_v2(p_gallery_id uuid)` |
| `20260528000005_fix_gallery_data_v2_rpc.sql:6` | `CREATE OR REPLACE` **cùng chữ ký 1 tham số** → thay bản cũ |
| `20260529000001_gallery_data_v2_dynamic_pagination.sql:7` | `CREATE OR REPLACE FUNCTION get_gallery_data_v2(p_gallery_id uuid, p_limit int DEFAULT 200, p_offset int DEFAULT 0)` |

Migration thứ ba **đổi chữ ký** nhưng vẫn dùng `CREATE OR REPLACE`. Postgres coi chữ ký khác = **hàm mới**, không thay bản cũ. Không có `DROP FUNCTION` nào → bản 1 tham số **còn sống tới hôm nay**.

Trạng thái DB hiện tại:
```
get_gallery_data_v2(p_gallery_id uuid)                                            → jsonb
get_gallery_data_v2(p_gallery_id uuid, p_limit int DEFAULT 200, p_offset int DEFAULT 0) → jsonb
```

### Hậu quả — đã đo bằng request thật, không suy đoán

```
POST /rest/v1/rpc/get_gallery_data_v2  {p_gallery_id}
  → HTTP 300  PGRST203 "Could not choose the best candidate function"

POST /rest/v1/rpc/get_gallery_data_v2  {p_gallery_id, p_limit, p_offset}
  → HTTP 200  OK
```

Vì bản 3 tham số **có DEFAULT**, lời gọi 1 tham số khớp **cả hai** → PostgREST không chọn được. **Gọi 1 tham số là hỏng chắc chắn.**

Đây **không phải** chuyện thẩm mỹ của file types như mình nói lúc đầu — nó là lỗi runtime thật, chỉ chưa ai chạm vào.

### Ai đang gọi

- `app/actions/gallery-composite-actions.ts:53` — **luôn truyền đủ 3 tham số** → dùng bản 3 tham số → 200 OK.
- `scripts/full-diagnostic.mjs:74` ("Test 2: RPC with OLD parameters") — gọi 1 tham số → **script này sẽ luôn báo lỗi 300**. Script chẩn đoán tay, không thuộc đường chạy production.
- Không có SQL function nào gọi nó.

### Đính chính điều mình nói sai

Mình bảo bản v2 là "fallback khi tắt `NEXT_PUBLIC_RPC_V3`". **Sai.** `NEXT_PUBLIC_RPC_V3` chỉ dùng đúng một chỗ: `app/actions/contract-queries.ts:527`, cho **contract detail**, không dính gì gallery.

Nhánh fallback v2 ở `gallery-composite-actions.ts:50` kích hoạt bằng cách **bắt chuỗi lỗi** `/does not exist/` từ lời gọi v3:

```ts
let { data, error } = await supabase.rpc("get_gallery_data_v3", {...});
if (error && /does not exist|function .* does not exist/i.test(error.message)) {
  rpcName = "get_gallery_data_v2";   // ← chỉ chạy khi v3 KHÔNG tồn tại
```

`get_gallery_data_v3(p_gallery_id, p_limit, p_offset)` **tồn tại trong DB** → nhánh fallback **không bao giờ chạy**.

### Kết luận

Bản 1 tham số: **không ai gọi, và gọi thì hỏng**. Nhánh fallback v2 trong app: **dead code** vì v3 có thật.

### Đề xuất

**Chọn A (khuyến nghị) — bỏ overload thừa:**
```sql
DROP FUNCTION IF EXISTS public.get_gallery_data_v2(uuid);
```
Được gì: hết bẫy PGRST203; `npm run db:types` sau đó sẽ **đưa `get_gallery_data_v2` vào types** (CLI chỉ bỏ qua hàm overload).
Rủi ro: thấp — không call-site nào dùng bản 1 tham số. `scripts/full-diagnostic.mjs` "Test 2" sẽ đổi từ lỗi-300 sang lỗi-404; script tay, không ảnh hưởng app.

**Chọn B — không làm gì.** App vẫn chạy đúng. Chấp nhận `get_gallery_data_v2` vắng mặt trong types (không hại vì file gọi nó dùng client không generic).

Mình nghiêng về A: một câu `DROP`, xoá hẳn một cái bẫy im lặng.

---

## Vấn đề 2 — `get_gallery_data_cursor` không tồn tại trong DB

### Truy nguyên

Commit `f1b96d6` (2026-05-29, "feat: gallery pagination optimization (3-phase)") ship **2 migration cùng lúc**:

| Migration | Tạo gì | Có trong DB? |
|---|---|---|
| `20260529000001_gallery_data_v2_dynamic_pagination.sql` | overload 3 tham số của `get_gallery_data_v2` | ✅ **có** |
| `20260529000002_gallery_cursor_based_pagination.sql` | `CREATE INDEX idx_gallery_images_cursor` + `CREATE OR REPLACE FUNCTION get_gallery_data_cursor(...)` | ❌ **KHÔNG** |

Kiểm chứng: `pg_indexes` trên `gallery_images` có 10 index, **không có `idx_gallery_images_cursor`**. `pg_proc` không có `get_gallery_data_cursor`.

→ **Migration `...000002` chưa từng được apply.** Không phải bị drop sau — cả index lẫn function đều vắng, tức chưa bao giờ chạy.

Cùng commit đó ship luôn consumer `app/actions/gallery-cursor-actions.ts` (90 dòng) gọi RPC này.

### Vì sao chưa nổ

`getGalleryDataCursor` **không được import ở đâu** (grep toàn repo, trừ chính nó). Dead code từ ngày sinh ra — Phase 3 của plan phân trang được viết trước, chưa nối vào UI.

Nếu có ai nối vào, nó sẽ ném ngay: RPC không tồn tại → `error` → `throw new Error(...)` ở dòng 60.

### Điều đáng chú ý về nghiệp vụ

Mục đích của cursor pagination ghi ngay trong file: *"Prevents data shift when images are uploaded during browsing"*.

Nhưng **chỉ admin mới upload được ảnh** ([[bang-doc-ghi]] — đúng 3 nơi ghi `gallery_images`, không cron, không webhook). Không có tác nhân thứ hai chèn ảnh trong lúc khách cuộn → **vấn đề mà cursor pagination giải quyết không tồn tại trong hệ này**.

Đây đúng là cái bẫy đã ghi ở `vault/60-bay/bay-du-lieu.md` mục 13.

### Đề xuất

**Chọn A (khuyến nghị) — xoá cả hai, ghi lý do:**
- xoá `app/actions/gallery-cursor-actions.ts`
- xoá `supabase/migrations/20260529000002_gallery_cursor_based_pagination.sql`
- ghi vào vault: cursor pagination **không cần** vì chỉ admin ghi `gallery_images`

Lý do: giữ lại một action gọi RPC không tồn tại là mìn — người sau đọc thấy "có sẵn API cursor" rồi nối vào là vỡ. Migration nằm trong thư mục migrations mà chưa apply cũng là mìn: ai chạy `migrate` cả thư mục sẽ tạo hàm + index cho tính năng không dùng.

⚠️ Việc này **vượt luật "dead code thì nêu, đừng xoá"** của CLAUDE.md §3 → cần user duyệt tường minh.

**Chọn B — apply migration cho khớp code:** tạo hàm + index thật. Không khuyến nghị: xây hạ tầng cho vấn đề không tồn tại, ngược ADR-005 và Simplicity First.

**Chọn C — để nguyên, chỉ ghi cảnh báo vào vault.** Tuân luật §3 chặt nhất, nhưng mìn vẫn nằm đó.

---

## Vấn đề 3 — Types chỉ phủ nhánh Moodie

### Đo thật

Thí nghiệm (đã hoàn tác, working tree sạch): gắn generic `Database` cho `createServerClient` trong `lib/supabase/server.ts` và đổi `SupabaseClient` → `SupabaseClient<Database>` trong `lib/auth_utils.ts`, rồi `npx tsc --noEmit`.

```
Baseline (hiện tại):      0 lỗi
Sau khi gắn generic:    232 lỗi, trải 68 file
```

Phân bố mã lỗi:

| Mã | Số | Nghĩa |
|---|---:|---|
| TS2322 | 93 | gán sai kiểu — phần lớn `null` vs `undefined` |
| TS2339 | 57 | **truy cập thuộc tính không tồn tại** |
| TS2345 | 51 | tham số sai kiểu |
| TS18047 | 11 | có thể `null` |
| còn lại | 20 | |

File nặng nhất: `export-actions.ts` (43) · `inventory-mutations.ts` (17) · `salary-actions.ts` (10) · `finance-operations-queries.ts` (8) · `work-task-actions.ts` (7) · `printing-workflow-mutations.ts` (7) · `gallery-admin-actions.ts` (7).

### 🔴 Thí nghiệm này đào ra một BUG THẬT

57 lỗi TS2339 không phải nhiễu. Đọc chúng ra:

```
export-actions.ts(37): Property 'customer_name' does not exist on type
  SelectQueryError<"column 'customer_name' does not exist on 'contracts'.">
```

Kiểm bằng request PostgREST thật (service role):

| Export target | Câu select ở | Kết quả |
|---|---|---|
| `contracts` | `export-actions.ts:30` | ❌ **HTTP 400** `column contracts.customer_name does not exist` |
| `expenses` | `export-actions.ts:42` | ❌ **HTTP 400** `column expenses.category_name does not exist` |
| `employees` | `export-actions.ts:104` | ❌ **HTTP 400** `column employees.base_salary does not exist` |
| `customers` | `export-actions.ts:112` | ❌ **HTTP 400** `column customer_name does not exist` (gợi ý `customer_code`) |
| `receipts` | `export-actions.ts:93` | ✅ HTTP 200 |

**4/5 chức năng xuất CSV hỏng hoàn toàn.** Không phải suy giảm âm thầm — `if (error) throw error` nên nó ném thẳng.

Chưa ai kêu vì **`exportToCSV` không được gọi từ đâu cả** (grep toàn repo: chỉ định nghĩa, 0 nơi dùng). Lại là dead code.

Nhưng nó chứng minh luận điểm: **những vùng không được type phủ đã trôi khỏi schema mà không ai biết.** Đây chính xác là loại lỗi việc gắn generic sẽ chặn.

### Ước lượng công sức

232 lỗi / 68 file. Chia theo bản chất:

- **~150 lỗi `null` ↔ `undefined`** — cơ học, sửa nhanh, mỗi chỗ 1 dòng (giống hệt 3 chỗ Moodie vừa sửa).
- **~57 lỗi TS2339** — **phải điều tra từng cái**, vì mỗi cái có thể là một `export-actions` khác: code đọc cột không tồn tại.
- **~25 lỗi còn lại** — kiểu tham số, ép kiểu.

Không làm một lần được. Đường đi hợp lý: **từng module một**, mỗi module một task, vì `withAuth` là điểm chung nên phải gắn generic một lần rồi sửa lan ra — hoặc gắn generic ở từng action file thay vì ở `auth_utils`.

### Đề xuất

**Bước 0 — làm ngay, tách khỏi mọi thứ khác:** xử lý `export-actions.ts`. 4/5 export hỏng là bug thật đã xác minh. Quyết định: sửa cột cho đúng schema, hay xoá luôn vì không ai gọi.

**Bước 1 — mở ADR** cho việc gắn generic: phạm vi, thứ tự module, ai làm. Đây là đổi kiến trúc (CLAUDE.md §0 khoá kiến trúc) → phải có DECISION + user duyệt.

**Chưa nên làm:** gắn generic ồ ạt. 57 lỗi TS2339 cần điều tra từng cái, gộp vào một task lớn là công thức để bỏ sót.

---

## Tóm tắt cần user quyết

| # | Việc | Đề xuất |
|---|---|---|
| 1 | `DROP FUNCTION get_gallery_data_v2(uuid)` | **Nên làm** — 1 câu SQL, xoá bẫy PGRST203 |
| 2 | `gallery-cursor-actions.ts` + migration `...000002` | **Nên xoá cả hai** (cần duyệt vì vượt luật §3) |
| 3a | `export-actions.ts` — 4/5 export hỏng | **Phải quyết**: sửa cột hay xoá file |
| 3b | Gắn generic `Database` cho client | **Mở ADR riêng**, làm từng module |
