---
title: "Kiến trúc tổng quan"
tags: [nen-tang, kien-truc]
cap-nhat: 2026-08-07
---

# Kiến trúc tổng quan

## Một câu

Next.js 16 App Router chạy trên Vercel (`sin1`), **mọi truy cập dữ liệu đi qua server action dùng service-role key**, Supabase Postgres ở Singapore. Trình duyệt **không bao giờ** query DB trực tiếp.

## Sơ đồ tầng

```
Trình duyệt (PC · mobile · iPad — PWA cài được)
   │  fetch / server action call
   ▼
proxy.ts ──► lib/supabase/middleware.ts:updateSession()
   │           refresh cookie phiên + bơm role claim vào header mỗi request
   ▼
app/(protected)/layout.tsx
   │           getAuthenticatedUserContext() → chưa login: /login · bị khoá: /account-disabled
   ▼
Server Component (RSC)  ─┬─► app/actions/*.ts  ("use server")
Client Component        ─┘        │
                                  │ withAuth / withAuthRead
                                  │   ├─ xác thực người dùng
                                  │   ├─ requireXAccess() ← LỚP PHÂN QUYỀN DUY NHẤT
                                  │   └─ createAdminClient()  ← service role, BỎ QUA RLS
                                  ▼
                          Supabase Postgres (Singapore)
                             98 bảng · 144 RPC · 186 migration
```

Ngoại lệ duy nhất: **gallery công khai** (`/gallery/[accessUrl]`) — khách không đăng nhập, quyền dựa trên token ký trong URL, xem [[luong-gallery]].

## Nguyên tắc cứng

### 1. Không client-direct
Trình duyệt không cầm anon key để query DB. Lý do đo được, không phải sở thích:

- Nhiều bảng lõi (`contracts`, `contract_events`, `payment_plans`, `contract_notes`…) **không có RLS scope theo studio/hợp đồng**. Cho client query thẳng = mọi tài khoản đăng nhập đọc được mọi hợp đồng (ghi chú nhạy cảm, tiền, phân công). Xem LESSONS A9.
- Muốn mở client-direct = dự án RLS hardening riêng: thêm `studio_id`, viết policy theo vai trò, test đa-user. Đừng làm kèm.
- Hướng tối ưu đã chốt thay thế: **PPR / `cacheComponents`**, không phải client-direct — [[adr-index|ADR-005]].

### 2. Service role + kiểm quyền ở tầng app
`withAuth` tạo client **service role** → RLS bị bỏ qua hoàn toàn. Nghĩa là RLS **không phải** lớp bảo vệ cho luồng đăng nhập; `requireXAccess()` mới là. Quên gọi nó trong một action = lỗ hổng thật.
→ [[xac-thuc-phan-quyen]], [[bao-mat-du-lieu-rls]]

### 3. Logic nặng đẩy xuống Postgres
144 RPC, phần lớn là hàm `*_atomic` gói nhiều bước ghi vào một transaction (`save_contract_atomic`, `process_contract_payment_v2`, `inventory_stock_in_atomic`, `create_printing_order_atomic`…). Lý do: giữ toàn vẹn khi một thao tác chạm nhiều bảng.
**Hệ quả phải nhớ:** ghi qua RPC **không hiện** trong [[bang-doc-ghi]] (note đó chỉ bắt `.from().insert/update/delete`). Tra thêm [[rpc-va-enum]].

### 4. Số tiền luôn tính lại ở server
Không optimistic-patch giá trị server tính (`recalc_contract_totals`, mã tự sinh, tồn kho bình quân, trạng thái atomic). Mẫu đúng: **đóng modal + revalidate**. → [[bay-du-lieu]]

## Ngăn xếp

| Lớp | Dùng gì |
|---|---|
| Framework | Next.js 16 App Router, **React Compiler bật** (`reactCompiler: true`) |
| Ngôn ngữ | TypeScript |
| CSS | Tailwind v4 (`@theme`), token dự án tiền tố `--space-*` |
| State/data client | SWR (phần lớn), React Query (contracts), RSC thuần (dashboard, employees) — **không có một recipe chung**, xem [[cache-va-realtime]] |
| DB | Supabase Postgres + Realtime + Storage |
| Kéo thả | `@dnd-kit` |
| Biểu đồ | `recharts` |
| PWA | `@ducanh2912/next-pwa` (workbox) |
| Lỗi | Sentry (`@sentry/nextjs`) |
| AI | `@google/genai` (Gemini) cho [[moodie-ai]] |
| Deploy | Vercel, region `sin1` (bắt buộc — DB ở Singapore) |

## Đường vào code

| Muốn tìm | Ở đâu |
|---|---|
| Trang | `app/(protected)/<module>/page.tsx` |
| Server action | `app/actions/<module>-*.ts` (query / mutation tách file) |
| Component | `components/<module>/` |
| Helper dùng chung | `lib/` |
| Kiểu dữ liệu | `types/` |
| Migration | `supabase/migrations/` |
| Script vận hành | `scripts/` |

Bản đồ chi tiết: [[ban-do-route]] · [[ban-do-server-action]]
