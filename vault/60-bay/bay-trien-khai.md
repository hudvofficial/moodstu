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

## Migration RPC thay thế phải deep-compare

`get_contract_detail_v3` từng **tái sinh đúng bug `labs.name`** mà v2 đã fix — vì viết sau nhưng không kế thừa fix.

**Luật:** RPC v2→v3 phải deep-compare output với bản đang chạy, trên **data thật phủ đủ nhánh** (mỗi LEFT JOIN có ít nhất 1 dòng), **trước** khi bật cờ. Grep các migration `fix_*` của bản cũ.
Script: `scripts/test-rpc-v3.mjs`.

## Verify RLS phải bằng request vai thật

Kiểm `pg_policies` tồn tại là chưa đủ — đã lọt một lần. Phân biệt khi debug: `403` = grant/permission trong policy · `200 + rỗng` = RLS lọc đúng. → [[bao-mat-du-lieu-rls]]

## `types/database.types.ts` đang lệch DB

Thiếu **16 bảng** so với DB thật. Đừng lấy file này làm nguồn chân lý về schema. → [[canh-bao-schema]]

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
