# RUNBOOK SỰ CỐ — mood-studio (1 trang)

**Đọc khi:** prod hỏng, số sai bất thường, hoặc lỡ tay chạy lệnh ghi. Mỗi kịch bản ≤ 10 dòng. Cập nhật 02.09.2026.

## Backup nằm ở đâu, chạy lúc nào
- **Vị trí:** `H:\backups\mood-studio\` — file `mood_YYYYMMDD_HHmm.dump` (dữ liệu + cấu trúc, nén) và `.schema.sql` (cấu trúc, đọc bằng mắt). Giữ 14 bản.
- **Lịch:** Task Scheduler `MoodStudio-Backup-DB`, 02:00 mỗi đêm, máy tự thức để chạy. Cần **máy này bật/ngủ, không tắt nguồn**.
- **Kiểm đêm qua có chạy không:** mở `H:\backups\mood-studio\backup.log`, dòng cuối phải là `OK` với ngày hôm nay. Dòng `FAIL` → đọc lý do, chạy tay: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\backup-db.ps1`.
- **Diễn tập restore:** mỗi quý 1 lần (`scripts\restore-drill.ps1`, xem §2) — kết quả ghi `H:\backups\mood-studio\restore.log`. Lần gần nhất: 04.09.2026 OK.
- **Phạm vi:** chỉ Postgres schema `public` (93 bảng). **KHÔNG gồm:** ảnh gốc trên Google Drive · 3 bucket Storage (`dresses`, `studio-assets`, `moodie-attachments`) · Supabase Vault · tài khoản đăng nhập (schema `auth`).

## 1 · Deploy hỏng — push main làm prod lỗi
`push main` = lên production ngay, không có cổng chặn.
1. Vercel → project → **Deployments** → chọn bản deploy gần nhất còn tốt → **⋯ → Promote to Production**. Prod quay lại trong ~1 phút, không cần code.
2. Sau đó mới sửa: `git revert <commit>` → push → deploy lại.
3. Nếu chỉ lỗi 1 trang: kiểm Sentry (`stu.moodwedding.com`) trước — có thể là lỗi dữ liệu, không phải deploy.

## 2 · Dữ liệu hỏng do lệnh sai (script / RPC / xoá nhầm)
1. **Dừng mọi lệnh ghi.** Không "sửa thêm" cho tới khi biết mất gì.
2. Tìm bản dump gần nhất **trước** sự cố trong `H:\backups\mood-studio\`.
3. Khôi phục bản đó vào Postgres **cục bộ** (không đè lên prod) — **đã diễn tập 04.09.2026: 11 giây, 0 lỗi, 93 bảng, 45.041 dòng khớp 100% dump**:
   ```
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\restore-drill.ps1 -Dump H:\backups\mood-studio\mood_XXXX.dump
   node scripts/restore-drill-compare.mjs        # so số dòng từng bảng với prod, chỉ đọc
   ```
   Script tự dựng cluster ở `H:\backups\mood-studio\restore-test\pgdata` (cổng 5433, không cài gì), dựng giả `auth.users`/`auth.uid()`/extensions rồi restore 3 đoạn; xong **tự tắt server**. Muốn soi dữ liệu: `pg_ctl start -D ...\pgdata -o "-p 5433"` → `psql -p 5433 -U postgres -d mood_restore`.
   Chỉ cần 1 bảng: `pg_restore.exe --data-only --table=<bảng> --file=<bảng>.sql mood_XXXX.dump` → đối chiếu, đưa lại prod **qua RPC/UI** (không `pg_restore` thẳng vào prod khi hệ đang chạy).
4. Mất > 1 ngày dữ liệu hoặc nhiều bảng → cân nhắc khôi phục toàn phần: dừng app (Vercel → pause) → `pg_restore --clean --if-exists` vào prod → mở lại. Đây là quyết định của chủ, không tự làm.
5. Ghi sự cố vào `agent/DB-CHANGELOG.md` (ngày · chuyện gì · khôi phục từ bản nào).

## 3 · Không kết nối được DB
1. Kiểm https://status.supabase.com.
2. Gói Free giới hạn **15 connection** qua pooler — dev server + script + backup cùng chạy có thể hết. Đóng bớt: tắt `npm run dev`, tắt script đang chạy.
3. Kill session treo (chạy qua `node scripts/db-q.mjs`):
   `SELECT pid, state, left(query,60) FROM pg_stat_activity WHERE datname='postgres' AND state<>'idle'` → `SELECT pg_terminate_backend(<pid>)`.
4. Project Free bị **tạm dừng sau 7 ngày không hoạt động** → vào dashboard bấm Restore.

## Luật sống còn
- Trước mọi thay đổi trên DB prod: có dòng trong `agent/DB-CHANGELOG.md` **và** biết bản dump gần nhất là ngày nào.
- **Script ghi prod phải có cờ** (S3, #10): 22 script ghi + Playwright + jest live dừng ngay nếu thiếu `ALLOW_PROD_WRITE=1`. Bật cố ý: `$env:ALLOW_PROD_WRITE="1"; node scripts\<tên>.mjs` — trước đó kiểm backup đêm gần nhất + có dòng `DB-CHANGELOG`. Danh sách 🔒 trong `agent/inventory/16-scripts.md`.
- Trước `git push`: hook `.githooks/pre-push` (tsc · eslint file đổi · mojibake · `.only` · `.env`) chạy ~20 s; máy mới gõ `npm run hooks:install` một lần. Bỏ qua chỉ khi thật cần: `git push --no-verify` + ghi lý do vào commit.
- E2E chạm DB thật — chạy xong kiểm rác: `node scripts/db-q.mjs "SELECT (SELECT count(*) FROM contracts WHERE contract_code LIKE 'E2E%') hd, (SELECT count(*) FROM employees WHERE department='E2E') ns"`.
