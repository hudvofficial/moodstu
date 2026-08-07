---
title: "Triển khai & verify"
tags: [van-hanh]
cap-nhat: 2026-08-07
---

# Triển khai & verify

## Deploy

```bash
git push origin main      # Vercel tự deploy nhánh main
```

**Đừng** dùng `npx vercel --prod` — CLI chưa auth, không có `VERCEL_TOKEN`.

**Không còn cổng tự động nào chặn** ([[adr-index|ADR-007]]). `push main` = deploy thẳng. Vercel chỉ chặn *build hỏng*; lỗi *hành vi* thì không ai chặn.

## Trước khi push — bắt buộc

| Loại thay đổi | Verify |
|---|---|
| Bất kỳ | `npm run lint` (**exit ≠ 0 → không push**) + `npm run build` |
| CSS / layout / nav | **render + screenshot chrome-devtools TRƯỚC deploy** |
| Responsive | kiểm **@768px và @1023px** |
| Module cụ thể | `npm run verify:<module>` |
| Dữ liệu / SQL | query DB thật kiểm kết quả |

Từng deploy hỏng **4 lần liên tiếp** vì bỏ qua bước render.

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
E2E: `test:e2e` (+ `:contracts`, `:mobile`, `:headed`, `:ui`) — ⚠️ **dừng dev server trước**, Next khoá theo thư mục project.

## Query DB nhanh

```bash
node scripts/db-q.mjs "SELECT count(*) FROM contracts WHERE deleted_at IS NULL"
```
Chỉ đọc, qua pooler + CA ghim. Dùng cái này thay vì đoán schema.

## Migration

```bash
node scripts/migrate-direct.mjs <ten-file.sql>
```
⚠️ `npm run migrate:latest` **không** chạy file mới nhất nếu không truyền tham số — nó chạy file phase1 hardcode cũ. Thông báo thành công có text thừa in cứng → **verify bằng query thật**.

## Package manager

Verify local dùng **`npm`** (khớp CI `npm ci`).
⚠️ Repo có **cả hai lockfile**; Vercel dùng `pnpm-lock.yaml`. Đổi dependency → cập nhật **cả hai**, nếu không CI xanh mà prod vỡ.

## CI

`.github/workflows/ci.yml` chạy `lint` + `build` trên PR và push `main`. Báo đỏ nhưng **không chặn**.
CI chỉ lint **file thay đổi** → đụng file nào là nhận cổng lint của file đó.

## Cập nhật vault sau khi đổi hệ thống

```bash
node scripts/vault-gen-schema.mjs     # sau mỗi migration
node scripts/vault-gen-codemap.mjs    # sau mỗi đợt thêm route/action
```

## Liên quan

[[bay-trien-khai]] · [[adr-index]] · [[so-lieu-van-hanh]]
