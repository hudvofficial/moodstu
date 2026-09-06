# T-20260905-s3-ky-luat-ghi-prod — Chuẩn S3: kỷ luật ghi production (cờ `ALLOW_PROD_WRITE` + pre-push tĩnh)

**Owner:** claude (spec → chủ duyệt → claude code → chủ xem diff) · **Trạng thái:** ✅ IMPLEMENTED + VERIFIED — duyệt 06/09 · code+verify 06/09 · `/buoc done` → commit `04665cd` (chưa push) · **Chương trình:** GĐ1 Nền móng, bước #10 (`agent/GOALS.yaml`) · **DB:** KHÔNG đổi · **ADR:** không cần — không đổi data-flow/schema/lib; thêm 1 module guard + 1 hook git + sửa 2 config test.

## 0. Vì sao — bằng chứng trong 24 giờ qua

- **05/09, khi chạy e2e cho #8:** lôi ra rác sự cố 28/08 chưa dọn hết — **4 phiếu chi E2E còn sống = 1.700.000đ nằm trong sổ T8 suốt 8 ngày** (`cash_out` T8 19.796.400 → 18.096.400 sau dọn), 1 tài khoản **admin active** tên `PERF Probe`, 2 phân bổ mồ côi, 1 lab, 2 vendor, 1 vật tư (`agent/DB-CHANGELOG.md` 05/09).
- **05/09, khi chạy `npx jest`:** 2 suite `tests/integration/moodie-*-live.test.ts` **tạo user prod** `e2ememorygraph…@test.local` rồi fail giữa chừng, không dọn — chạy `jest` thường ngày = rò.
- Dev = prod chung 1 Supabase; `push main` = deploy thẳng, không cổng tự động (ADR-007). Mọi bước 🗄️ phía sau (#12 R2, #13 R1, #16–#21) đều là `CREATE OR REPLACE` trên bản sống qua `scripts/migrate-direct.mjs` — hiện **gõ nhầm là chạy**.

S3 (`agent/PHUONG-AN.md` §S3): *"Cờ `ALLOW_PROD_WRITE` cho script có lệnh ghi · hook pre-push tĩnh <2 phút."* Đây là khoá cửa trước "sóng sửa DB" GĐ2.

## 1. Sự thật đã đo (05/09, chỉ đọc)

Con số "40 script ghi" trong `16-scripts.md` là regex — đếm cả `rpc(` đọc và chuỗi `INSERT` nằm trong file migration được đọc để kiểm. Đo lại bằng 3 phép: (a) lệnh mutate thật `.insert/.update/.upsert/.delete/auth.admin.*/query(`; (b) RPC gọi → `pg_proc.provolatile` trên prod; (c) runner nhận SQL từ ngoài.

| Nhóm | Script (`scripts/`) | Ghi gì |
|---|---|---|
| **Runner SQL** (nguy hiểm nhất: chạy bất kỳ SQL) | `migrate-direct.mjs` · `apply-migration.mjs` | DDL/DML tuỳ ý qua `pg` port 6543 |
| Runner SQL **đã chết** | `run-migration.mjs` · `auto-migrate.mjs` · `run-vendor-migrations.mjs` | gọi RPC `exec_sql` — **không tồn tại trên DB** (đo `pg_proc`), luôn lỗi. Vẫn gắn cờ (rẻ), ghi sổ đối chiếu |
| **Seed / smoke** | `smoke-contracts` · `smoke-dashboard` · `smoke-settings` · `smoke-calendar` · `smoke-employees` · `cleanup-e2e-data` · `probe-anon-access` (ghi `login_attempts` bằng anon) · `verify-realtime-signals` (tạo user + insert) · `verify-realtime-publication` | insert seed rồi dọn; hỏng giữa chừng = rác (đúng kịch bản 28/08) |
| **Backfill** | `backfill-all-galleries` · `backfill-blurhash` · `backfill-dimensions-sharp` · `backfill-image-dimensions` · `backfill-simple` · `backfill-single-gallery` · `backfill-this-gallery` · `normalize-services` | `update` hàng loạt trên bảng thật |
| Ngoài `scripts/` | `playwright/global-setup.ts` (seed 20 HĐ + user mỗi lần chạy e2e) · `tests/integration/moodie-*-live.test.ts` (2 file, tạo user) | e2e là đường verify chính thức nhưng phải **cố ý** bật |

→ **22 script + 1 global-setup + 2 jest live.** Các `verify-*` còn lại chỉ `rpc(` hàm STABLE → **không** gắn cờ (giữ gate chạy tự do). `get_contract_detail_v2/list_v2` bị khai `VOLATILE` dù chỉ đọc — ghi sổ đối chiếu 🟡, sửa ở #29.

Hook: repo **chưa có** hook nào (`.husky` không có, `core.hooksPath` trống, `.git/hooks` toàn sample). `npx tsc --noEmit` ≈ 25 s, eslint theo file đổi ≈ 10 s trên máy này.

## 2. Phạm vi

### 2.1 `scripts/lib/prod-guard.mjs` — 1 hàm, không phụ thuộc
```js
export function requireProdWrite(script, what) {
  if (process.env.ALLOW_PROD_WRITE === "1") { console.warn(`[prod-guard] ${script}: GHI PRODUCTION — ${what}`); return; }
  console.error(`\n⛔ ${script} sẽ GHI vào DB production (${what}).\n   Dev = prod chung 1 Supabase. Muốn chạy thật:\n   PowerShell:  $env:ALLOW_PROD_WRITE="1"; node scripts/${script}\n   Trước đó: backup đêm gần nhất OK? (H:\\backups\\mood-studio\\backup.log) · có dòng trong agent/DB-CHANGELOG.md chưa?\n`);
  process.exit(2);
}
```
Bản `.ts` tương đương cho `playwright/global-setup.ts` (import từ `../scripts/lib/prod-guard.mjs` không được với ts-node → viết inline 6 dòng trong global-setup).

### 2.2 Gắn cờ vào 22 script — mỗi file **+2 dòng** ở đầu, sau import
`import { requireProdWrite } from "./lib/prod-guard.mjs";` + `requireProdWrite("<tên file>", "<ghi gì — 1 cụm>");` — đặt **trước** khi tạo client/kết nối. Không đổi logic nào khác. Với `migrate-direct.mjs`/`apply-migration.mjs` (`what` = "chạy SQL tuỳ ý — DDL/DML").

### 2.3 Playwright — `playwright/global-setup.ts`
Đầu hàm setup: nếu `process.env.ALLOW_PROD_WRITE !== "1"` → `throw new Error("⛔ E2E seed vào DB production. Bật: $env:ALLOW_PROD_WRITE=\"1\" rồi chạy lại. Chạy xong kiểm rác: node scripts/db-q.mjs \"SELECT count(*) FROM contracts WHERE contract_code LIKE 'E2E%'\"")`. Playwright dừng toàn bộ run tại global-setup → 0 dòng ghi.

### 2.4 Jest — `jest.config.js`
`testPathIgnorePatterns`: thêm `'/tests/integration/.*-live\\.test\\.ts$'` **khi** `process.env.ALLOW_PROD_WRITE !== "1"` (config là JS, đọc env được). `npm test` hằng ngày không còn chạm prod; muốn chạy live → bật cờ.

### 2.5 Hook pre-push tĩnh — `.githooks/pre-push` (sh, Git for Windows chạy được) + `npm run hooks:install`
Thứ tự, dừng ở lỗi đầu tiên, **không chạm DB**, mục tiêu < 2 phút:
1. `npx tsc --noEmit -p tsconfig.json`
2. `npx eslint <file .ts/.tsx/.mjs đổi so với origin/main>` (chỉ file đổi — 13 lỗi lint có sẵn ở file khác không chặn)
3. `node scripts/verify-utf8-mojibake.mjs`
4. Không `test.only(` / `describe.only(` / `it.only(` trong `tests/` (git grep)
5. Không file `.env*` trong commit sắp đẩy
In thời gian chạy ở cuối. Bỏ qua khi thật cần: `git push --no-verify` (ghi lý do vào commit message).
`package.json`: `"hooks:install": "git config core.hooksPath .githooks"` — chạy 1 lần trên máy này (không gắn vào `prepare` để Vercel/CI `npm ci` không đụng git config).

### 2.6 Tài liệu — sửa đúng chỗ, không file mới
- `CLAUDE.md` dòng 24 (E2E chạm prod): thêm *"Script ghi + e2e + jest live chỉ chạy khi `ALLOW_PROD_WRITE=1` (S3, #10)."*
- `agent/RUNBOOK-SU-CO.md` "Luật sống còn": thay dòng "Script có lệnh ghi chỉ chạy khi thật sự cần" bằng luật cờ + lệnh bật.
- `scripts/vault-gen-kiem-ke-code.mjs`: nhãn thêm `🔒 cờ` khi file có `requireProdWrite(` → `16-scripts.md` tự thành sổ kiểm cờ khi sinh lại.

## 3. Ngoài phạm vi
- Không xoá 3 runner chết (`exec_sql`) — mention, ghi sổ; dọn ở GĐ4.
- Không sửa `sweepStaleE2EOrphans` để quét auth mồ côi/phiếu chi (đã dọn tay 05/09; mở rộng sweep là việc của #29 hoặc khi rò lại).
- Không thêm hook `pre-commit` (chậm mỗi commit; pre-push đủ cho 1 người).
- Không chạm CI (`.github/`), không đổi ADR-007.
- Không gắn cờ vào `db-q.mjs` (chỉ đọc theo thiết kế; luật "không SQL ghi qua db-q" vẫn là kỷ luật, không phải code).

## 4. Verify — số chờ điền

| Kiểm | Lệnh | Chờ |
|---|---|---|
| Cờ chặn thật | `node scripts/smoke-contracts.mjs` (không cờ) | exit **2**, in hướng dẫn, `contracts LIKE 'E2E%'` trước = sau = **0** |
| Cờ mở đúng | `$env:ALLOW_PROD_WRITE="1"; node scripts/migrate-direct.mjs "SELECT 1"` | chạy, in `[prod-guard] … GHI PRODUCTION` |
| 22/22 có cờ | `grep -L "requireProdWrite(" <22 file>` | rỗng; `grep -l` trên các `verify-*` đọc = rỗng |
| Playwright | `npx playwright test tests/e2e/dashboard-kpi-ledger.spec.ts` (không cờ) | fail ở global-setup với thông báo ⛔, **0** dòng E2E trên DB; có cờ → 1/1 PASS |
| Jest | `npx jest --listTests \| grep -c live` | **0** không cờ · **2** có cờ; `npx jest` không cờ: số suite đỏ = 4 (6 − 2 live) |
| Hook | `git config core.hooksPath` = `.githooks`; `sh .githooks/pre-push` trên HEAD hiện tại | exit 0, thời gian **< 120 s** (ghi số) |
| Hook bắt lỗi | tạo tạm `tests/unit/_tmp.only.test.ts` chứa `test.only(` → chạy hook → xoá | exit ≠ 0 ở bước 4 |
| Kiểm kê | `node scripts/vault-gen-kiem-ke-code.mjs` | `16-scripts.md` hiện `🔒 cờ` đúng 22 dòng |

## 5. Rủi ro & đường lùi
- Người quên cờ khi cần chạy thật → script dừng, in đúng lệnh bật: ma sát cố ý, 5 giây.
- Hook chậm hơn 2' trên máy yếu → `--no-verify` có lý do; đo lại.
- E2E trong CI (`ci.yml`) nếu có chạy Playwright sẽ fail vì thiếu cờ → kiểm `.github/workflows` trước khi code; nếu CI chạy e2e → đặt `ALLOW_PROD_WRITE` trong workflow **không** làm (CI không được ghi prod) → ghi rõ trong §6.
- Đường lùi: `git revert` 1 commit; `git config --unset core.hooksPath`.

## 6. Kết quả — 06/09/2026

| Kiểm | Kết quả |
|---|---|
| Cờ chặn thật | `node scripts/smoke-contracts.mjs` (không cờ) → **exit 2**, in ⛔ + cách bật; `contracts LIKE 'E2E%'` trước = sau = **0** |
| Cờ mở đúng | `ALLOW_PROD_WRITE=1 node scripts/migrate-direct.mjs` → `[prod-guard] … GHI PRODUCTION`, script chạy tiếp tới kiểm tham số của nó ("Thiếu tên file") — không SQL nào được chạy |
| 22/22 có cờ | `grep requireProdWrite(` = 22/22; `node --check` 22 file OK; `verify-*` chỉ đọc = 0 cờ; kiểm kê `16-scripts.md` sinh lại: **22 dòng 🔒 cờ** (generator loại chính nó khỏi đếm) |
| Playwright | không cờ: dừng tại `global-setup.ts:336` với ⛔, DB **0** dòng E2E, 0 auth `@test.local`; có cờ: `dashboard-kpi-ledger` **1/1 PASS**, teardown dọn, rác 0 |
| Jest | `--listTests` "live": **1** không cờ (`moodie-live-audio` = unit test, 0 lệnh ghi — đúng phải giữ) · **5** có cờ (4 integration live được mở); `npx jest` không cờ: 67 suite (71 − 4), **4 đỏ = 4 suite có sẵn** (gallery-note-download, moodie ×3), 0 user prod sinh ra (`@test.local` = 0) |
| Hook | `git config core.hooksPath` = `.githooks`; `sh .githooks/pre-push` trên HEAD: **OK — 17 s** (tsc · eslint 6 file đổi · mojibake 2.855 file · .only · .env) |
| Hook bắt lỗi | file tạm `tests/unit/_tmp-only.test.ts` chứa `test.only(` (đã `git add`) → **exit 1** ở bước 4/5, in dòng vi phạm; đã gỡ và xoá file. Ngoài ra hook bắt ngay lỗi thật của tôi khi code bước này: `global-setup.ts(338) TS1005` (escape nháy) → sửa |
| tsc / eslint | `npx tsc --noEmit` 0 lỗi · eslint 27 file đổi: 0 lỗi (26 cảnh báo "file ignored" vì `scripts/` nằm trong ignore của eslint config — có sẵn) |

**Phát hiện & xử lý ngoài dự kiến**
- `scripts/verify-utf8-mojibake.mjs` báo dương tính giả ở `AGENTS.md:28` (dòng liệt kê chính các chuỗi mojibake mẫu để nhận diện — không chép lại ở đây kẻo gate bắt) → thêm `AGENTS.md` vào `INTENTIONAL_SIGNATURE_FILES` (cơ chế sẵn có, 1 dòng) — nếu không, hook chặn mọi lần push.
- `tests/unit/ledger-fallback-sort.test.ts` **chập chờn**: đỏ 2/3 lần dưới tải song song, xanh khi chạy riêng và ở lần chạy thứ 3 — có sẵn, không do thay đổi này (chỉ đụng `testPathIgnorePatterns`). Ghi sổ đối chiếu 🟡.
- CI (`.github/workflows/ci.yml`) chỉ lint + build, không e2e/jest → rủi ro §5 không xảy ra.

Chưa commit. 27 file sửa (+63 −3) + 3 file mới (`scripts/lib/prod-guard.mjs`, `.githooks/pre-push`, spec này) + `agent/inventory/16-scripts.md` sinh lại + `scripts/vault-gen-kiem-ke-code.mjs` (file vẫn untracked từ đợt kiểm kê). `package.json` mang thêm 2 đổi chưa commit từ trước (`test:e2e:mobile`, `vault:db-truth`).
