---
title: "Bẫy — build, migration, môi trường"
tags: [bay, van-hanh]
cap-nhat: 2026-08-07
---

# Bẫy build / migration / môi trường

## Hai lockfile — CI và Vercel cài cây phụ thuộc khác nhau

Repo có **cả `package-lock.json` lẫn `pnpm-lock.yaml`**.
CI chạy `npm ci`; Vercel deploy tự bắt `pnpm-lock.yaml`.

→ **Thêm hoặc đổi dependency phải cập nhật CẢ HAI.** Đã cháy một lần: CI xanh, prod vỡ (`1fa1a38 fix(deploy): sync pnpm lockfile for Google GenAI`).

Verify local dùng `npm` để khớp CI.

## `NEXT_PUBLIC_*` là build-time

Đặt trong `.env.local` **chỉ ảnh hưởng dev**. Prod cần `vercel env add` + redeploy. Đang có: `NEXT_PUBLIC_RPC_V3`.

## Cache `.next` gây 404 "ma"

Start dev đè lên `.next` của phiên trước (code khác) → Turbopack serve route-manifest cũ → **mọi route protected trả 404** dù code đúng.

**Trước khi verify runtime: xoá `.next`.**

Kill process không dễ: dừng task không giết node con → port 3000 vẫn bị giữ và `.next` bị khoá. Lấy PID bằng `netstat -ano | grep :3000` rồi `taskkill //F //PID <pid>`.

**Phép thử 2 biến** khi nghi code làm sập app: (HEAD + `.next` sạch) và (code mình + `.next` sạch). Cả hai OK → thủ phạm là cache, không phải logic.

Dev server còn khoá theo thư mục project → phải dừng dev trước khi chạy e2e preview.

## `npm run migrate:latest` KHÔNG chạy file mới nhất

Không truyền tham số thì nó chạy **file phase1 hardcode cũ**. Phải truyền tên file.
Thông báo `Created: order_payments...` là **text thừa in cứng**, không phải kết quả thật → verify bằng `pg_indexes` / query thật.

## Migration ship kèm code nhưng KHÔNG được apply

Commit `f1b96d6` ship 2 migration cùng lúc: `20260529000001` đã apply, `20260529000002` **chưa từng chạy** (kiểm cả function lẫn index đều vắng). Consumer của migration thứ hai vẫn được merge → code gọi RPC không tồn tại, nằm im 70 ngày vì tình cờ không ai import.

**Kiểm nhanh một migration đã apply chưa** — đừng tin thư mục `migrations/`, hỏi DB:
```bash
node scripts/db-q.mjs "SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace AND n.nspname='public' WHERE proname='<ten_ham>'"
node scripts/db-q.mjs "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname='<ten_index>'"
```

## `CREATE OR REPLACE` không thay được hàm khác chữ ký

Đổi tham số của một hàm rồi `CREATE OR REPLACE` → Postgres tạo **hàm mới**, bản cũ vẫn sống thành overload ngoài ý muốn. Nếu bản mới có tham số `DEFAULT`, lời gọi thiếu tham số khớp cả hai → PostgREST trả **HTTP 300 `PGRST203`**. Và `supabase gen types` **bỏ qua luôn** hàm bị overload.

Đổi chữ ký thì phải `DROP FUNCTION` bản cũ. Rà hàm trùng tên: xem [[canh-bao-schema]].

## Migration RPC thay thế phải deep-compare

`get_contract_detail_v3` từng **tái sinh đúng bug `labs.name`** mà v2 đã fix — vì viết sau nhưng không kế thừa fix.

**Luật:** RPC v2→v3 phải deep-compare output với bản đang chạy, trên **data thật phủ đủ nhánh** (mỗi LEFT JOIN có ít nhất 1 dòng), **trước** khi bật cờ. Grep các migration `fix_*` của bản cũ.
Script: `scripts/test-rpc-v3.mjs`.

## Verify RLS phải bằng request vai thật

Kiểm `pg_policies` tồn tại là chưa đủ — đã lọt một lần. Phân biệt khi debug: `403` = grant/permission trong policy · `200 + rỗng` = RLS lọc đúng. → [[bao-mat-du-lieu-rls]]

## `types/database.types.ts` trôi khỏi DB nếu quên sinh lại

Từng lệch 16 bảng / 15 RPC vì không ai sinh lại sau migration. Đã đồng bộ 2026-08-07.

**Sau mỗi migration chạy cả hai:** `npm run db:types` + `node scripts/vault-gen-schema.mjs`.

⚠️ Script `db:types` ghi ra `.tmp` rồi mới đổi tên — **đừng rút gọn thành `> types/database.types.ts`**. Shell cắt rỗng file *trước khi* lệnh chạy, nên lệnh lỗi (ví dụ `supabase` không có trên PATH) là mất trắng file. Đã dẫm.

→ [[canh-bao-schema]]

## Không còn cổng tự động nào chặn push

Branch protection đã gỡ ([[adr-index|ADR-007]]). `git push origin main` = **deploy thẳng**.
Lưới còn lại: Vercel chặn build hỏng (lỗi *build*), review chặn lỗi *hành vi*. CI chỉ báo sau.

Kỷ luật verify giờ **tự giác**.

## `eslint` exit ≠ 0 → không push

CI chỉ lint **file thay đổi** (repo còn nợ ~195 lỗi cũ) → đụng file nào là nhận cổng lint của file đó.
Đã vi phạm một lần với lý do "lỗi có sẵn" → CI đỏ.

Gặp lint fail: kiểm baseline HEAD trước (`git stash` file mình đổi → lint lại). Pre-existing thì nêu ra, đừng tự sửa.

## Deploy đúng cách

**`git push origin main`**. Vercel tự deploy nhánh `main`.
**Đừng** dùng `npx vercel --prod` — CLI chưa auth, không có `VERCEL_TOKEN`.

## Region phải là `sin1`

DB ở Singapore. Từng deploy nhầm `iad1` → mọi query chậm đều tay ~200ms+.
**Query chậm đồng loạt trên mọi endpoint → kiểm region trước khi tối ưu SQL.** Số đo local luôn xấu hơn prod.

## Node & mã hoá

- Node ở `C:\Program Files\nodejs` (v24). `C:\Users\Admin\.nodejs\` **rỗng** — vài tài liệu cũ còn ghi đường dẫn đó, sai.
- Đừng hardcode đường dẫn node theo version — chết khi nâng cấp. Dùng `npx`.
- PowerShell 5.1 đọc UTF-8-không-BOM theo ANSI 1258 → tiếng Việt hiển thị bể qua console **không có nghĩa file bể**. Verify bằng byte (`npm run verify:utf8`).
- Bash tool trên Windows: **đừng dùng cú pháp here-string của PowerShell** (`@'…'@`) — sinh commit message rác. Dùng heredoc `<<'EOF'`.

## Liên quan

[[trien-khai-va-verify]] · [[bay-du-lieu]] · [[adr-index]]
