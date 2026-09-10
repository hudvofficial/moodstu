---
title: "Triển khai & verify"
tags: [van-hanh]
cap-nhat: 2026-08-31
trang-thai: da-kiem-2026-08-31
doi-chieu: agent/DECISIONS.md ADR-007/017/018 · package.json · agent/SYSTEM_MAP.md §5.1
---

# Triển khai & verify

## Deploy

```bash
git push origin main      # Vercel tự deploy nhánh main
```

**Đừng** dùng `npx vercel --prod` — CLI chưa auth, không có `VERCEL_TOKEN`.

**Không còn cổng tự động nào chặn** ([[adr-index|ADR-007]]). `push main` = deploy thẳng. Vercel chỉ chặn *build hỏng*; lỗi *hành vi* thì không ai chặn.

**Và không còn agent thứ hai review** ([[adr-index|ADR-018]], 29/08/2026). Hai cổng người thay thế:
1. user duyệt spec **trước khi** code;
2. **user xem diff trước khi push** — không tự push khi user chưa xem, trừ khi user nói rõ.

⚠️ **dev và prod dùng chung một Supabase project.** Giữa agent và production gần như không còn lưới nào.

## Trước khi push — bắt buộc

| Loại thay đổi | Verify |
|---|---|
| Bất kỳ | `npm run lint` (**exit ≠ 0 → không push**) + `npm run build` |
| CSS / layout / nav | **render + screenshot chrome-devtools TRƯỚC deploy** |
| Responsive | kiểm **@768px và @1023px** |
| Module cụ thể | `npm run verify:<module>` |
| Dữ liệu / SQL | query DB thật kiểm kết quả |
| Migration | `npm run vault:db-truth` để chụp lại thân hàm thật |

Từng deploy hỏng **4 lần liên tiếp** vì bỏ qua bước render.

## Trước mọi hành động có tác dụng phụ (ADR-018 §2b)

Trả lời **hai câu bằng tài liệu**, không bằng suy đoán:
1. Việc này **chạm vào gì**? (DB thật? prod? file chung?)
2. **Dự án đã quy định gì** về nó? (grep `agent/`, `.github/`, `vault/`, config liên quan)

*Ca thật 28/08: chạy full e2e trên prod build trong khi `playwright.config.ts:84` chỉ định `npm run dev` → 41 fail vô nghĩa, và **rò 11 dòng seed vào DB production** — trong khi `.github/workflows/ci.yml` dòng 10 đã ghi sẵn cảnh báo đúng điều đó.*

**Đối chứng hợp lệ (§2c):** cùng cỡ mẫu, cùng môi trường, đổi **một** biến, **so danh sách không so tổng**.

## Script verify sẵn có

```
verify:contracts  verify:printing   verify:reports    verify:productivity
verify:calendar   verify:dashboard  verify:services   verify:inventory
verify:dresses    verify:settings   verify:employees
verify:utf8       verify:pwa-cache  verify:pwa-artifact
verify:realtime-client              verify:privileged-entrypoints
verify:moodie-runtime               verify:moodie-ui
verify:payment-stage-key            verify:performance-release
```

Smoke: `smoke:contracts` · `smoke:dashboard` · `smoke:employees` · `smoke:settings` · `smoke:calendar` · `smoke:production`
Perf (chỉ khi ADR-005 cho phép): `perf:chunks` · `perf:audit` · `perf:operational` · `perf:contract-detail`
E2E: `test:e2e` (+ `:setup`, `:contracts`, `:contracts-perf`, `:mobile`, `:headed`, `:ui`)

⚠️ **E2E chạm DB PRODUCTION.** Dừng dev server trước (Next khoá theo thư mục project), chạy đúng môi trường `playwright.config.ts` chỉ định, và **dọn rác sau** bằng `sweepStaleE2EOrphans` (`tests/e2e/e2e-sweep.ts`) — đừng tự viết SQL xoá.

## Query DB nhanh

```bash
node scripts/db-q.mjs "SELECT count(*) FROM contracts WHERE deleted_at IS NULL"
```
Chỉ đọc, qua pooler + CA ghim. Dùng cái này thay vì đoán schema.

**Và đừng đoán từ repo.** Thứ tự áp migration ≠ thứ tự tên file, có object trên DB không có `CREATE` nào trong `supabase/migrations/` → repo **không** phản ánh DB. Câu hỏi "hàm X có tồn tại / làm gì" phải hỏi DB hoặc đọc `vault/30-du-lieu/than-ham/`. → [[bay-trien-khai]]

## Migration

```bash
node scripts/migrate-direct.mjs <ten-file.sql>
```

⚠️ `npm run migrate:latest` **không** chạy file mới nhất. Tên file truyền vào là **tương đối `supabase/migrations/`** (không kèm thư mục). Từ [[adr-index|ADR-017]] (26/08/2026): không truyền tham số → script **dừng báo lỗi**; trước đây nó chạy ngầm file phase-1 cũ (sẽ tạo lại object đã drop). Banner "Created: order_payments…" in cứng cũng đã bỏ.

**Vẫn verify bằng query thật, đừng tin log:**
```bash
node scripts/db-q.mjs "SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace AND n.nspname='public' WHERE proname='<ten_ham>'"
node scripts/db-q.mjs "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname='<ten_index>'"
```

## Package manager

Verify local dùng **`npm`** (khớp CI `npm ci`).
⚠️ Repo có **cả hai lockfile**; Vercel dùng `pnpm-lock.yaml`. Đổi dependency → cập nhật **cả hai**, nếu không CI xanh mà prod vỡ.

## CI

`.github/workflows/ci.yml` chạy `lint` + `build` trên PR và push `main`. Báo đỏ nhưng **không chặn**.
CI chỉ lint **file thay đổi** → đụng file nào là nhận cổng lint của file đó.

## Cập nhật vault sau khi đổi hệ thống

```bash
npm run db:types                      # types cho TypeScript
node scripts/vault-gen-schema.mjs     # 30-du-lieu/luoc-do-*.md — sau mỗi migration
npm run vault:db-truth                # 30-du-lieu/than-ham/, rls-va-quyen, ham-mo-coi
node scripts/vault-gen-codemap.mjs    # sau mỗi đợt thêm route/action
```

**Chạy xong thì sửa `cap-nhat:` của trang vault viết tay liên quan.** Ba file sinh tự động (`than-ham/`, `rls-va-quyen`, `ham-mo-coi`) **đừng sửa tay** — chạy lại script.

## Liên quan

[[bay-trien-khai]] · [[adr-index]] · [[so-lieu-van-hanh]] · [[bay-du-lieu]]
