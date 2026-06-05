# LESSONS — Gallery perf phase log

> Bám sát [PLAN.md](PLAN.md). Mỗi phase ship → ghi: SHA, đo trước/sau (Network screenshot path), regression nào gặp, rollback nếu có.

## A. Phase log

### P1 — Proxy fallback cho lh3 error
- Status: chưa ship.
- Pre-deploy baseline: TODO sau khi đo trên gallery có file broken.
- SHA: —
- Verify screenshot: —

### P2 — SSR `/contracts/[id]/gallery`
- Status: chưa ship.
- SHA: —

### P3 — SW cache lh3
- Status: chưa ship.
- SHA: —

### P4 — RPC v3 blur_data_url
- Status: chưa ship. Pre-condition: verify `gallery_images.blur_data_url` column tồn tại trên prod.
- SHA: —

### P5-P8 — Drive filter
- Status: chưa ship.
- SHA: —

---

## B. Cạm bẫy đã biết (tổng hợp từ session 2026-06-06 + LESSONS chung)

### B1. `unoptimized={true}` cho lh3 → mất Next.js Image fallback
- Triệu chứng: tile hiện "Lỗi nguồn Drive" cho file mà trước đó load OK.
- Nguyên nhân: commit `b2b91de` (2026-06-05) bỏ Next.js Image proxy → lỗi từ Google trồi thẳng vào `onError`.
- Quy tắc: khi đổi Image optimization strategy → phải có **retry chain** đa-tầng (lh3 sized → lh3 raw → proxy server) trước khi mark error.

### B2. Retry bằng `element.dataset.retryLevel` mong manh với Next.js Image
- Nguyên nhân: Next.js Image có thể reset DOM attributes khi reconcile.
- Quy tắc: track retry state trong React state (useRef Map), không DOM dataset.

### B3. Service Worker thay đổi → bump version
- Quy tắc: thêm/sửa rule SW → bump `package.json` version trước deploy để user pick up SW mới nhanh hơn.

### B4. RPC migration trên prod — KHÔNG drop, dùng v3 song song v2
- Quy tắc: PostgreSQL RPC mới = CREATE FUNCTION new name, KHÔNG ALTER/DROP existing. Code try v3 → fallback v2 nếu lỗi "does not exist". Rollback chỉ cần `git revert`, không revert DB.

### B5. Auth tax / chunk khi loop server action
- Triệu chứng: lọc Drive 100 file ~6s, nhưng wall-clock thuần Drive API ~3s.
- Nguyên nhân: mỗi chunk = 1 server action call = 1 lần `withAuth` (~100-300ms auth check) + Vercel Edge round-trip overhead.
- Quy tắc: loop chunks ở client → pipeline 3 chunks concurrent. Hoặc loop server-side trong 1 action (nhưng Vercel timeout 10s → không an toàn cho >100 file).

### B6. Transient lỗi OAuth không có refresh callback
- Triệu chứng: "hồi trưa lọc lỗi, giờ ok".
- Nguyên nhân: `createDriveShortcut` ([google-drive-oauth.ts:135](../../lib/google-drive-oauth.ts)) chỉ retry 401 NẾU có `onTokenExpired` callback. `processDriveCopyChunk` ([gallery-drive-actions.ts:340](../../app/actions/gallery-drive-actions.ts)) gọi mà KHÔNG truyền callback → token expired = fail không retry.
- Quy tắc: mọi external API call có long-running chunks → phải có refresh callback path.

---

## C. Cơ chế
1. Trước mỗi phase: đọc PLAN section tương ứng + section này.
2. Sau ship: cập nhật phase log (SHA, screenshot path, regression).
3. Gặp lỗi mới: ghi mục B ngay (triệu chứng → gốc → fix → quy tắc).
