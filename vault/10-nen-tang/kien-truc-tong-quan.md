---
title: "Kiến trúc tổng quan"
tags: [nen-tang, kien-truc]
cap-nhat: 2026-08-31
trang-thai: da-kiem-2026-08-31
doi-chieu: agent/system-map/06-nen-tang.md · vault/30-du-lieu/rls-va-quyen.md · vault/30-du-lieu/than-ham/
---

# Kiến trúc tổng quan

## Một câu

Next.js 16 App Router chạy trên Vercel (`sin1`), **gần như mọi truy cập dữ liệu đi qua server action dùng service-role key**, Supabase Postgres ở Singapore. Trình duyệt query DB trực tiếp **chỉ ở một nhánh hẹp có chủ đích** (drawer hợp đồng — xem "Nguyên tắc cứng 1" bên dưới).

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
                             93 bảng · 2 view · 149 hàm DB · 203 migration
```

Có **hai nhánh đi vòng** sơ đồ trên:
- **Gallery công khai** (`/gallery/[accessUrl]`) — khách không đăng nhập, quyền dựa trên token trong URL + `verify_gallery_password`; bản thân action vẫn dùng `createAdminClient()` nên vai `anon` **không** query DB. Xem [[luong-gallery]].
- **Client-direct** (`lib/client-direct/contract-drawer.ts`) — browser cầm anon key query thẳng Postgres, RLS làm cổng. Xem "Nguyên tắc cứng 1".

## Nguyên tắc cứng

### 1. Client-direct: mặc định KHÔNG, đã mở đúng một nhánh
Mặc định trình duyệt không cầm anon key để query DB. **Nhưng có một ngoại lệ đang chạy thật** — đừng đọc mục này như lệnh cấm tuyệt đối:

**Nhánh đã mở (drawer hợp đồng):** `lib/client-direct/contract-drawer.ts` query thẳng `contract_events`, `contract_checklists`, `work_tasks`, `payment_plans`, `employees_public`, `contract_notes` bằng anon key (`:38,48,57,64,71,114`). Nối vào app tại `lib/hooks/use-contract-queries.ts:301` (cấp 2 sau server action), `lib/hooks/use-contract-notes.ts:25`, `components/contracts/contracts-list-client.tsx:43`. Hạ tầng RLS đi kèm là chủ đích: `20260605000000_contracts_rls_hardening.sql`, `20260605020000_client_direct_rls_prereq.sql`.

Lý do **không mở rộng** thêm, đo được chứ không phải sở thích:

- Bảng lõi vẫn **không scope theo studio/hợp đồng**. `contracts` có 2 policy SELECT cộng OR, trong đó `contracts_authenticated_read` là `USING is_active_employee()` → **mọi nhân viên active đọc được mọi hợp đồng** ([[rls-va-quyen]] §`contracts`). Xem LESSONS A9.
- Mở rộng client-direct = dự án RLS hardening riêng: thêm `studio_id`, viết policy theo vai trò, test đa-user. Đừng làm kèm.
- Hướng tối ưu đã chốt cho phần còn lại: **PPR / `cacheComponents`**, không phải client-direct — [[adr-index|ADR-005]].
- ⚠️ Query client-direct chỉ chạy nếu `authenticated` **còn grant**. `lib/hooks/use-prefetch-on-hover.ts:90-99` query bảng `dresses` từ browser trong khi `dresses` đã bị REVOKE khỏi `authenticated` → nhận `42501`, im lặng. → [[bao-mat-du-lieu-rls]]

### 2. Service role + kiểm quyền ở tầng app
`withAuth` tạo client **service role** → RLS bị bỏ qua hoàn toàn. Nghĩa là RLS **không phải** lớp bảo vệ cho luồng đăng nhập; `requireXAccess()` mới là. Quên gọi nó trong một action = lỗ hổng thật.
→ [[xac-thuc-phan-quyen]], [[bao-mat-du-lieu-rls]]

### 3. Logic nặng đẩy xuống Postgres
149 hàm trên DB (**107 RPC được code gọi**, 92 hàm `SECURITY DEFINER`), phần lớn là hàm `*_atomic` gói nhiều bước ghi vào một transaction (`save_contract_atomic`, `process_contract_payment_v2`, `inventory_stock_in_atomic`, `create_printing_order_atomic`…). Lý do: giữ toàn vẹn khi một thao tác chạm nhiều bảng.
**Hệ quả phải nhớ:** ghi qua RPC **không hiện** trong [[bang-doc-ghi]] (note đó chỉ bắt `.from().insert/update/delete`). Tra thêm [[rpc-va-enum]] và thân hàm đầy đủ ở `30-du-lieu/than-ham/`. Ví dụ cụ thể: `payment_plan_allocations`, `realtime_signals`, `moodie_brave_usage_daily` **không có dòng nào** trong [[bang-doc-ghi]] vì chỉ được ghi từ trong hàm DB.

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
