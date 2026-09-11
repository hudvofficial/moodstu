# T-20260911-audit-co-danh-tinh — T3 #19: nhật ký có danh tính (app + trigger DB) và nối LOGIN

**Owner:** claude (spec → chủ duyệt → claude code + áp DB → verify → chủ xem diff) · **Trạng thái:** ✅ ĐÃ ÁP PROD 11/09 (chủ "duyệt" 11/09) · app + verify xong, chờ chủ xem diff / "đẩy" · **Chương trình:** GĐ2 tuần 4, bước #19 (`agent/GOALS.yaml`), gate G1 ✅ · **Hình thức thực tế:** `spec` **+ `db`** (1 hàm trigger `CREATE OR REPLACE`, kèm `revert.sql` và dòng DB-CHANGELOG) · **ADR:** không mở — không đổi data-flow, chỉ gắn metadata danh tính vào đường ghi đã có · **Revert:** `agent/HANDOFFS/T-20260911-audit-co-danh-tinh.revert.sql` + `git revert` 1 commit.

## 0. Vì sao

Sổ đối chiếu dòng 62 (R11): *"Nhật ký kiểm toán — truy được 'ai làm gì' — 169 điểm gọi, chỉ 10 truyền `performedBy` (~94% thiếu người thực hiện); đăng nhập, gallery, lịch không ghi"*. Dòng 48: *"`AuditAction \"LOGIN\"` — 0 call-site, đăng nhập không để lại vết"*. Điều kiện cổng **G2**: *"audit ≥95% dòng mới có danh tính"*.

Thực trạng còn nặng hơn sổ: **30 ngày gần nhất có 883 dòng nhật ký, đúng 2 dòng biết ai làm** (0,2%). Khi có tranh chấp "ai sửa hợp đồng này", hệ không trả lời được.

Đây cũng là **hồi quy**, không phải thiếu sót từ đầu: tháng 5/2026 có 312/574 dòng mang `performed_by` (54%); từ tháng 6 gần như bằng 0. Mốc rơi trùng lần gỡ `getUser()` khỏi `lib/audit.ts` (comment tại `lib/audit.ts:52-58` giải thích: gọi `cookies()` trong promise trôi làm Next.js ném "Dynamic server usage"). Cách sửa khi đó đúng về mặt kỹ thuật nhưng chuyển gánh nặng sang 162 call-site, và 153 chỗ không ai truyền.

## 1. Sự thật đã đo (11/09, chỉ đọc)

**Nhật ký có hai nguồn, và nguồn lớn hơn nằm trong DB:**

| Nguồn | Dòng / 30 ngày | Có danh tính | Cơ chế |
|---|---:|---:|---|
| Trigger DB (`log_audit_action` trên `contracts`, `expenses`, `payments`, `dresses`, `employee_salaries`) | 566 (64%) | 0 | Hàm gọi `get_current_employee_id()` → dựa `auth.uid()`; app ghi bằng **service role** nên luôn NULL |
| Mã app (`writeAuditLog`/`fireAuditLog`) | 223 (25%) | 0 | 162 call-site, chỉ 9 truyền `performedBy`, 6 truyền `employeeId` |
| Còn lại (`system` có mô tả, ai_*) | 94 | 2 | — |

**Hệ quả quan trọng:** chỉ "inject actor tại `withAuth`" như tên bước ghi thì **trần lý thuyết là 25%**, không thể chạm 95%. Muốn qua G2 phải vá **cả hai** nguồn.

**Mã nguồn đã trace:**
- 163/171 điểm ghi nằm trong closure của `withAuth`/`withAuthRead`/`withAdmin` hoặc 13 wrapper module dẫn xuất (tất cả đều delegate về `withAuth`), nơi `user.id` **đã có sẵn**. Chỉ 8 điểm thật sự nằm ngoài.
- Repo chưa dùng `AsyncLocalStorage` ở đâu; không route nào đặt `runtime = "edge"`; không component `"use client"` nào import `lib/audit` hay `lib/auth_utils`.
- `lib/audit.ts` có `"use server"` → **không thể** chứa instance ALS hay hàm đồng bộ (bản build ném E352). Phải tách file riêng.
- `createAdminClient()` (`lib/supabase/server.ts`) bọc `cache()` React, không tham số, 110 nơi gọi.
- `audit_logs.performed_by` là uuid **không có khoá ngoại**; `employee_id` **có** khoá ngoại tới `employees(id)` — bơm nhầm sẽ làm hỏng cả dòng log, nên chỉ tự động điền `performed_by`.
- 2 cột `ip_address`, `user_agent` tồn tại nhưng 3.466/3.466 dòng đều rỗng.
- `login()` (`app/actions/auth.ts:112`) không ghi nhật ký; `logout()` gọi `redirect()` nên mọi lệnh đặt sau không chạy.
- Màn hình nhật ký (`app/actions/audit-log-actions.ts:19`, `audit-logs/page.tsx`, `components/settings/audit-log-list.tsx`) join theo **`employee_id`**, nên 322 dòng đang có `performed_by` vẫn hiện "không tên".
- Thử nghiệm cục bộ (scratchpad, node thuần): ALS sống qua promise trôi; hai ngữ cảnh song song không lẫn nhau; giá trị truyền tay thắng giá trị trong context.

## 2. Phạm vi — 3 lớp, làm theo thứ tự, lớp sau chỉ chạy khi lớp trước xanh

### Lớp A — app tự biết ai đang thao tác (không sửa call-site nào)
| File | Việc |
|---|---|
| `lib/audit-context.ts` (**mới**, ~20 dòng) | `import "server-only"` + `AsyncLocalStorage`; `runWithAuditActor(actor, fn)` và `getAuditActor()`. Tách riêng vì `lib/audit.ts` có `"use server"` |
| `lib/auth_utils.ts` | 3 chỗ (`withAuth`, `withAuthRead`, `withAdmin`): bọc đúng lời gọi `action(...)` bằng `runWithAuditActor({ performedBy: user.id }, …)`. 13 wrapper module ăn theo, không sửa |
| `lib/audit.ts` | `writeAuditLog` đọc context ở dòng đầu: `params.performedBy ?? actor?.performedBy ?? null`; thêm 2 tham số `ipAddress`/`userAgent` và ghi vào 2 cột đang rỗng; đổi mặc định `source` từ `"system"` thành `"server_action"`; **không** lấy `employeeId` từ context (tránh rủi ro khoá ngoại); viết lại comment cảnh báo cho rõ vì sao ALS được phép còn `cookies()` thì không |

### Lớp B — trigger DB biết ai đang thao tác
| File | Việc |
|---|---|
| `lib/supabase/server.ts` | `createAdminClient(actorId?)` — thêm tham số tuỳ chọn, khi có thì gắn `global.headers['x-actor-id']`. Giữ nguyên chữ ký cũ cho 110 nơi gọi |
| `lib/auth_utils.ts` | 3 wrapper truyền `user.id` vào `createAdminClient` |
| `supabase/migrations/2026091115xxxx_t3_audit_actor_tu_header.sql` | `CREATE OR REPLACE FUNCTION log_audit_action()`: đọc `current_setting('request.headers', true)::json->>'x-actor-id'` làm `performed_by`, giữ nguyên `employee_id` như cũ, giữ `SECURITY DEFINER` và `search_path`; thêm `source = 'trigger'` (giá trị đã có trong enum, chưa ai dùng) để tách nguồn khi đo |

**Chốt an toàn trước khi áp lớp B:** áp một hàm thăm dò chỉ-đọc, gọi qua PostgREST bằng header thử, đọc kết quả, rồi bỏ hàm đó. Nếu header không tới được DB thì **dừng lớp B**, giữ lớp A, báo chủ, không áp migration.

### Lớp C — nối LOGIN và làm nhật ký đọc được
- `app/actions/auth.ts`: ghi `LOGIN` khi đăng nhập thành công (lấy `ip`/`user_agent` từ `headers()` **trong thân action**, chụp ra biến rồi mới gọi nhật ký); ghi `LOGOUT` **trước** `redirect()`. Không ghi dòng cho lần sai mật khẩu: không có danh tính để gắn, và `login_attempts` đã gánh việc chống dò.
- 3 file màn hình nhật ký: join theo `performed_by` (giữ `employee_id` làm dự phòng) để tên người hiện ra thật.
- `scripts/verify-audit-actor.mjs` + `npm run verify:audit`: đo tỉ lệ dòng mới có danh tính theo cửa sổ 7 ngày, tách theo nguồn, đỏ khi dưới ngưỡng.
- `tests/unit/audit-context.test.ts`: khoá hành vi ALS (sống qua promise trôi, không lẫn ngữ cảnh song song, giá trị truyền tay thắng).
- `scripts/sweep-e2e-residue.sql`: bắt dòng `LOGIN` do e2e sinh (23 spec đăng nhập qua form thật), nếu không mỗi lần chạy sẽ để lại rác.

## 3. Ngoài phạm vi
- Ghi nhật ký lúc đổi mật khẩu: hiện đổi bằng client trình duyệt, server không móc được → ghi sổ, bước riêng.
- Việc ghi trùng (một thao tác sinh 2 dòng: 1 trigger + 1 app) → thuộc #31 "luật audit thành văn".
- Bộ lọc nhật ký trên giao diện dùng enum không tồn tại → #31.
- `/api/push/send` là máy gọi máy, giữ `source = 'system'`, loại tường minh khỏi mẫu số.

## 4. Verify — số chờ điền

| Kiểm | Cách | Chờ |
|---|---|---|
| Đơn vị | `jest tests/unit/audit-context.test.ts` | 3/3 |
| Thăm dò header | hàm chỉ-đọc tạm + gọi qua PostgREST | đọc được `x-actor-id`; nếu không → dừng lớp B |
| Áp DB | `migrate-direct` | `log_audit_action` chứa `request.headers`, `source='trigger'`; `revert.sql` thử local trước |
| Dòng mới của app | thao tác thật qua e2e (sửa 1 hợp đồng seed) | 100% dòng `server_action` mới có `performed_by` |
| Dòng mới của trigger | cùng thao tác trên | 100% dòng `trigger` mới có `performed_by` |
| LOGIN | đăng nhập bằng tài khoản tạm | 1 dòng `LOGIN`, có `performed_by`, `ip_address`, `user_agent` |
| Màn hình | `/audit-logs` với tài khoản tạm | hiện **tên người thật**, không phải "Hệ thống" |
| Ngưỡng G2 | `npm run verify:audit` sau khi neo mốc deploy | ≥95% dòng mới có danh tính (đo tối thiểu 7 ngày mới chốt; ngày đầu chỉ ghi số) |
| Tĩnh | `tsc` · `eslint` · `verify:*` hiện có | 0 lỗi |
| Rác | `sweep-e2e-residue.sql` (đã thêm luật LOGIN) | 0 |

## 5. Rủi ro & đường lùi
- **Ghi nhầm danh tính người khác** (rủi ro nặng nhất): đã loại trừ bằng thử nghiệm hai ngữ cảnh song song; ALS tách theo ngữ cảnh bất đồng bộ, không phải biến toàn cục. Test đơn vị khoá lại hành vi này.
- **Header không tới DB**: phát hiện ở bước thăm dò trước khi áp; hỏng thì dừng lớp B, không để lại nửa vời.
- **Mất dòng log do khoá ngoại**: tránh bằng cách không tự động điền `employee_id`.
- **Chạy trên Edge**: không route nào dùng; `server-only` làm lỗi nổ sớm nếu ai đó đổi.
- **e2e đẻ rác `LOGIN` vào prod**: xử lý ngay trong bước bằng luật quét mới.
- Đường lùi: `revert.sql` cho hàm trigger (thân sống), `git revert` cho phần app; hai lớp độc lập nên lùi được riêng.

## 6. Kết quả — 11/09/2026

| Kiểm | Kết quả |
|---|---|
| Đơn vị | `jest tests/unit/audit-context.test.ts` **5/5**: danh tính sống qua promise trôi · ba ngữ cảnh song song không lẫn · ngoài wrapper trả null · ngữ cảnh lồng nhau lớp trong thắng · chở được IP/trình duyệt |
| Thăm dò header (trước khi áp) | tạo hàm chỉ-đọc tạm trên prod rồi xoá: không header → `x_actor_id` null · có header → đọc đúng uuid · `jwt_role = service_role`. **Kết luận: header xuống tới DB**, lớp B khả thi |
| Diễn tập local | trước: mọi dòng vô danh, `source=system`. Sau: có header → `performed_by` đúng · không header → NULL (không hỏng) · **header rác không phải uuid → NULL, không nổ** · INSERT/UPDATE/DELETE đều mang danh tính · `source='trigger'`. `revert.sql` → thân cũ ✓ → áp lại ✓ |
| Áp prod | `migrate-direct` "completed". Thân hàm sống có `x-actor-id` và `source='trigger'`; 5 trigger dùng chung hàm |
| Đường thật của trigger (prod) | **5/5**: dòng `CREATE` mang đúng `performed_by` của người thao tác · `source='trigger'` · đường ghi không header vẫn chạy · dòng không header để trống danh tính thay vì bịa. Đã dọn váy thử + dòng nhật ký của nó |
| Đường thật của app (e2e) | `tests/e2e/audit-actor.spec.ts` **3/3** trên `next start` (build `tEdIxOf8i-BoSMFHgn0ps`): (1) đăng nhập sinh dòng `LOGIN` có `performed_by`, `user_agent`, `source='server_action'`, mô tả kèm email · (2) **`createGoal` không truyền actor** mà dòng nhật ký vẫn có đúng người → ngữ cảnh ở `withAdmin` chạy thật · (3) màn `/audit-logs` hiện **tên người thật** |
| Tĩnh | `tsc` 0 · `eslint` 9 file 0 · mojibake 0 |
| Rác | sweep (đã thêm luật bắt `LOGIN`/`LOGOUT` của e2e) = **0**; `realtime_signals` 104 là tín hiệu thật |
| Vault | `vault:db-truth` 152 hàm · `40-module/he-thong.md` thêm mục "Ai làm gì — luật từ 11/09" (hai nguồn nhật ký, ba luật cho code mới) |
| Ngưỡng G2 | **chưa chốt được hôm nay, đúng như spec §4 đã định**: 11 dòng trong 24h qua đều sinh **trước** lúc áp (thao tác thật của chủ tối 10/09) nên tỉ lệ cũ 0% không phản ánh bản vá. Mốc neo: **2026-09-11 18:08 giờ VN**. Đo bằng `npm run verify:audit -- --since "2026-09-11T11:08:41Z"` sau ít nhất 7 ngày vận hành |

**Việc còn lại của bước, đã biết trước:** `lib/moodie/engine.ts` và `app/api/**` chạy ngoài ba wrapper nên chưa có ngữ cảnh; `logError()` chưa nhận actor. Ghi sổ đối chiếu cho #31 ("luật audit thành văn") thay vì nong phạm vi #19.
