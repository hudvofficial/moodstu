# T-20260902-s1-backup-runbook — Chuẩn S1: hệ phục hồi được (backup đêm + diễn tập + runbook)

**Owner:** claude (spec → chủ duyệt → claude code → chủ xem diff) · **Trạng thái:** ✅ IMPLEMENTED + VERIFIED 02/09 22:15 (chủ từ chối Pro → tự làm bản tối giản: A + B + D; C diễn tập = bước #7 sau) · **Chương trình:** GĐ1 Nền móng, bước #4 (+ #7 diễn tập) · **DB:** CHỈ ĐỌC (pg_dump) · **ADR:** không cần — không đổi data-flow/schema/lib; thêm script + tài liệu vận hành.

## 0. Vì sao đây là bước đầu tiên có code

Đo 02/09: Supabase gói Free — **không có backup tự động**. Dev = prod chung DB (đã từng rò seed 28/08). Sổ migration dừng 21/06, ~90 thay đổi áp tay. 40 script có lệnh ghi vào prod. Mọi bước 🗄️ phía sau (R2, R1, health-score, policy, CHECK) đều là `CREATE OR REPLACE`/`DROP` trên bản sống — **không có bản sao thì không có đường lùi**. RPO hiện tại: vô định.

## 1. Sự thật đã đo (chỉ đọc)

| | |
|---|---|
| DB | PostgreSQL **17.6** (aarch64) — pg_dump phải là bản 17 |
| Máy | **không có `pg_dump`** trong PATH; winget có `PostgreSQL.PostgreSQL.17` (17.11-3) |
| Kết nối hiện có | `SUPABASE_POOLER_URL` cổng **6543 = transaction mode** → pg_dump sẽ lỗi (cần session). Cùng host cổng **5432** = session mode |
| Ổ đĩa | C: 48G (98% đầy) · H: **230G trống** → backup vào `H:\backups\mood-studio\` |
| Kích thước | 93 bảng, bảng lớn nhất `gallery_images` ~20k dòng → dump ước < 100MB nén |
| Ngoài phạm vi pg_dump | ảnh gốc ở Google Drive · 3 bucket Storage (`dresses` 3 file 269kB, 2 bucket rỗng) · Supabase Vault secrets |

## 2. Phạm vi — 4 sản phẩm

### A. `scripts/backup-db.ps1` — dump hàng đêm
- Cài client: `winget install --id PostgreSQL.PostgreSQL.17 --exact` (chỉ cần thư mục `bin`; ghi đường dẫn `C:\Program Files\PostgreSQL\17\bin\pg_dump.exe`).
- Chuỗi kết nối: lấy từ `.env.local` `SUPABASE_POOLER_URL`, **thay `:6543/` → `:5432/`** trong script (không sửa `.env.local`, không tạo biến mới).
- Lệnh: `pg_dump --format=custom --no-owner --no-privileges --schema=public --file=H:\backups\mood-studio\mood_YYYYMMDD_HHmm.dump` + kèm `--schema-only` bản thứ hai `mood_YYYYMMDD_schema.sql` (đọc được bằng mắt, dùng cho diff catalog).
- Sau dump: kiểm file > 1MB, `pg_restore --list` đọc được; ghi 1 dòng vào `H:\backups\mood-studio\backup.log` (ngày · size · OK/FAIL).
- Giữ **14 bản** gần nhất, xoá bản cũ hơn.
- Thất bại → exit code ≠ 0 + dòng FAIL trong log. Không gửi thông báo tự động (đội 1 người; kiểm bằng mắt ở nhịp thứ Hai — thêm dòng "backup 7/7?" vào V0-LOG).

### B. Task Scheduler — chạy 02:00 mỗi đêm
- Task `MoodStudio-Backup-DB`, chạy `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\backup-db.ps1`, user hiện tại, "Run whether user is logged on or not", wake to run.
- Đăng ký bằng `schtasks` trong script `scripts/backup-install-task.ps1` (chạy 1 lần, có Admin).

### C. Diễn tập restore — bước #7, chủ làm, Claude hướng dẫn
- Đích: **PostgreSQL 17 cục bộ** (đã cài ở A, chỉ cần bật service) — không cần project Supabase thứ hai.
- `scripts/restore-drill.ps1`: tạo DB `mood_drill` → tạo stub `auth` schema với `auth.uid()`/`auth.role()` trả NULL (vì hàm SQL như `is_active_employee` tham chiếu `auth.uid()` lúc tạo) + extension `pgcrypto`, `pg_trgm`, `uuid-ossp` → `pg_restore --no-owner --no-privileges` → đếm bảng và tổng dòng, so với số ghi trong `backup.log` của bản dump đó → in PASS/FAIL.
- Tiêu chí PASS: 93 bảng · tổng dòng lệch ≤ 1% (do dòng ghi trong lúc dump).

### D. `agent/RUNBOOK-SU-CO.md` — 1 trang
Ba kịch bản, mỗi cái ≤ 10 dòng, lệnh gõ được:
1. **Deploy hỏng** (push main làm prod lỗi): Vercel → Deployments → bản trước → Promote to Production; hoặc `git revert` + push. Ghi rõ: push main = deploy thẳng, không có cổng.
2. **Dữ liệu hỏng do lệnh sai** (script/RPC): dừng ghi → xác định bản dump gần nhất TRƯỚC sự cố → restore vào `mood_drill` cục bộ → trích bảng/dòng cần → đưa lại prod qua RPC/UI (không `pg_restore` đè prod khi còn nghiệp vụ đang chạy). Ghi rõ ngưỡng: mất > 1 ngày dữ liệu → cân nhắc restore toàn phần.
3. **Mất truy cập DB** (pooler/quota): kiểm Supabase status → kiểm 15 connection Free plan → kill session treo.
Kèm: **phạm vi backup** (Postgres `public` only — ảnh Drive/Storage/Vault KHÔNG có trong dump), vị trí file, lịch chạy, cách kiểm "đêm qua có backup không".

## 3. Ngoài phạm vi (nêu để không mở rộng)
- Backup Storage bucket (3 file, 269kB — làm tay khi cần) · Supabase Vault · mã hoá bản dump (ổ H nội bộ; nếu muốn đưa lên cloud thì mở task riêng) · môi trường staging đồng bộ · thông báo tự động.

## 4. Verify (chạy gì, chờ số nào)
1. `pg_dump --version` → 17.x.
2. Chạy `backup-db.ps1` tay 1 lần → file `.dump` > 1MB, `pg_restore --list` liệt kê ≥ 93 TABLE DATA, dòng OK trong `backup.log`.
3. `schtasks /query /tn MoodStudio-Backup-DB` → Ready; sáng hôm sau có file mới.
4. Bước #7: `restore-drill.ps1` → PASS (93 bảng, dòng khớp ≤1%).
5. Đọc `RUNBOOK-SU-CO.md` từ đầu tới cuối trong ≤ 5 phút, mỗi lệnh copy-paste chạy được.
6. **Không** chạm gì ngoài đọc DB — verify bằng `V0-LOG` không đổi.

## 5. Rủi ro & đường lùi
- pg_dump qua pooler session mode chiếm 1/15 connection Free plan trong vài phút lúc 02:00 → chấp nhận được; nếu lỗi quota, đổi giờ.
- Cài PostgreSQL 17 kéo theo service cục bộ → tắt service khi không diễn tập.
- Đường lùi: xoá task + script; không có gì trên prod thay đổi.

## 6. Kết quả — 02/09/2026 22:15

| Sản phẩm | Kết quả thật |
|---|---|
| pg_dump | **17.6** — gói binary rời tại `H:ackups\mood-studio	ools\pgsqlin\` (315 MB tải, không cài, không Admin) — KHÔNG phải winget như spec dự kiến |
| A `scripts/backup-db.ps1` | chạy tay lần 1: **OK · 6 MB · 93 bảng** · `pg_restore --list`: 93 TABLE DATA · 158 FUNCTION · 217 POLICY · 75 TRIGGER · `schema.sql` 0,6 MB đọc được (`CREATE TABLE public.contracts` có mặt) · `backup.log` dòng OK |
| B Task Scheduler | `MoodStudio-Backup-DB` = Ready · lần chạy kế **03/09 02:00** · wake-to-run · giữ 14 bản |
| D `agent/RUNBOOK-SU-CO.md` | 3 kịch bản + phạm vi backup + luật sống còn |
| C restore-drill | hoãn → bước #7 (chủ làm, Claude hướng dẫn; chỉ cần `pg_restore` từ cùng thư mục tools vào một Postgres cục bộ — chưa cài) |

Sai lệch so với spec: dùng zip binary EDB thay winget (không cần UAC, không service) — tốt hơn dự kiến. Không chạm gì trên prod (chỉ đọc); V0-LOG không đổi.
RPO từ vô định → **≤ 24h**. Điều kiện: máy này không tắt nguồn lúc 02:00.
