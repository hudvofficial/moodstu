# Client-Direct Plan — Batch C (Cấp 2) — 2026-06-05

> **Mục tiêu:** Bỏ server-action round-trip cho **READ** của contracts drawer (và sau đó nhân rộng), query Supabase **thẳng từ browser** như mcoffe → drawer/nav mở **instant thật sự**, không 2-hop.
>
> **Trạng thái:** PLAN — CHƯA CODE. Cần anh duyệt trước khi triển khai (giống cách làm RLS).
>
> **Nguyên tắc giữ nguyên:** WRITE vẫn qua server action (service_role, atomic RPC). Chỉ READ chuyển sang browser. Finance giữ revalidate. KHÔNG patch optimistic giá trị server tính lại.

---

## 1. Vì sao (đo được)

Hiện mở 1 contract drawer = **5 POST server-action** serialized (`getContractDrawerExtra` chạy 4 query + `getContractNotes`), mỗi POST là 2-hop: browser → Next server action → Supabase → về. Đã giảm đau bằng `placeholderData` (hiện list data ngay) + hover-prefetch (commit `1057da4`, `48259f7`) + notes JOIN (`2e984dc`). Nhưng **gốc** vẫn là server-action 2-hop.

**mcoffe** (tham khảo): `createBrowserClient` → Supabase REST thẳng (1-hop), RLS gate. Đó là Cấp 2 này.

**Lợi ích kỳ vọng:** drawer fetch 2-hop → 1-hop (~giảm 1 chặng latency mỗi query); không tốn server action invocation; song song hoá tốt hơn. Drawer mở mượt hơn trên mobile/no-hover (nơi prefetch không kích hoạt).

---

## 2. Kiến trúc hiện tại (đã verify trong code)

| Lớp | Hiện tại |
|---|---|
| Hook | `useContractDrawerExtra` (`lib/hooks/use-contract-queries.ts:286`) — React Query, key `contractKeys.drawerExtra(id)`, có `placeholderData` |
| Read action | `getContractDrawerExtra` (`app/actions/contract-queries.ts:702`) — `withAuth` → `createAdminClient` (service_role, **bypass RLS**) → 4 query Promise.all |
| Notes | `getContractNotes` (`app/actions/note-actions.ts:12`) — `withAuth` → 1 query |
| Browser client | `lib/supabase/client.ts` — `createClient()` = `createBrowserClient(URL, ANON_KEY)`, **đã sẵn**, mang session JWT của user → role `authenticated` → **chịu RLS** |
| Auth gate hiện tại | `requireContractAccess(supabase, userId)` (app-level) |

**Khi chuyển client-direct:** gate app-level (`requireContractAccess`) được thay bằng **RLS db-level** (policy `<table>_authenticated_read` em đã apply: employee active mới đọc được). Đây là lý do RLS phải xong trước (đã xong cho 6 bảng contract ✅).

---

## 3. ⚠️ Phát hiện chặn (RLS-dependency của các JOIN)

`getContractDrawerExtra` không chỉ đọc 6 bảng đã hardening — nó **JOIN sang bảng khác**. Browser (role `authenticated`) chỉ đọc được embed nếu bảng JOIN có **RLS cho phép authenticated SELECT** (hoặc RLS tắt). Nếu bảng JOIN có RLS bật mà **thiếu policy** → embed trả **null/rỗng** (drawer mất tên nhân sự/vendor).

| Bảng JOIN | Dùng ở | RLS status (theo grep migrations) | Hành động cần |
|---|---|---|---|
| `vendors` | workTasks `vendors:vendor_id(...)` | ✅ enabled + `authenticated SELECT USING(true)` (`20260526000000`) | OK, không cần làm |
| `employees` | workTasks `employees:assigned_to(...)` | ⚠️ RLS enabled (`20260429130000`) nhưng **CHƯA thấy policy authenticated-read** | **PHẢI verify + thêm policy** nếu thiếu (else JOIN ra null) |
| `payment_plan_allocations` | paymentPlans embed | ⚠️ **Không thấy ENABLE RLS** → có thể đang đọc tự do (ungated) | **Verify**: nếu RLS off → quyết bật + policy (nhất quán) hay chấp nhận |
| `contract_events/checklists/work_tasks/payment_plans/contract_notes` | bảng chính drawer | ✅ RLS + authenticated_read (migration `20260605000000`, đã apply prod) | OK |

> **Kết luận:** 4.2 cần 1 **sub-phase RLS pre-req** (audit + vá `employees`, `payment_plan_allocations`) TRƯỚC khi swap fetcher. Verify trên **staging trước, prod sau** — đúng quy trình RLS cũ. KHÔNG bỏ qua: thiếu policy = drawer hiển thị thiếu dữ liệu (bug âm thầm).

---

## 4. Phase 4.2 — Client-direct cho Contracts drawer

### 4.2a — RLS pre-req audit (DB, làm trước)
1. Query `pg_policies` + `pg_tables` trên staging/prod cho `employees`, `payment_plan_allocations`: liệt kê RLS on/off + policy hiện có.
2. Nếu `employees` thiếu authenticated-read → migration thêm policy `employees_authenticated_read` (mẫu: active employee đọc được; cân nhắc employee chỉ đọc thông tin cơ bản — full_name/phone, KHÔNG lương).
   - ⚠️ Cân nhắc bảo mật: employees chứa data nhạy cảm (lương?). Policy nên giới hạn cột? RLS không giới hạn cột — nếu cần, dùng **view** `employees_public(id, full_name)` cho JOIN browser. **Quyết định mở.**
3. Nếu `payment_plan_allocations` RLS off → bật + policy authenticated_read (nhất quán), HOẶC ghi nhận chấp nhận đọc tự do (rủi ro thấp vì cần anon key + chỉ allocation amount).
4. Verify multi-role trên staging (mẫu `RLS-TEST-PLAN.sql` §2/§3/§4) → anon=0, active=full.
5. Apply prod (off-peak, có rollback) — auto qua `supabase db query --linked` (bài học A10).

### 4.2b — Browser fetcher (code)
1. Tạo `lib/client-direct/contract-drawer.ts` (file MỚI, không đụng server action — additive):
   - `fetchContractDrawerExtraClient(id)` — dùng `createClient()` browser, replicate **đúng 4 query** + select strings của `getContractDrawerExtra` (events/checklists/workTasks/paymentPlans), Promise.all.
   - Port `mapPaymentPlans` (server transform tại `contract-queries.ts`) → 1 util **dùng chung** (chuyển vào `lib/` để cả server + client gọi, tránh lệch logic). **Grep trước** (A2): nếu mapPaymentPlans thuần (không đụng `cookies()`/server-only) → move thẳng.
   - `fetchContractNotesClient(id)` — 1 query contract_notes (asc theo created_at, khớp `note-actions.ts:12`).
2. Swap `queryFn` trong `useContractDrawerExtra` + hook notes: gọi fetcher browser thay vì server action. Giữ nguyên key, `placeholderData`, `staleTime` (KHÔNG đổi cache contract).
3. Giữ `getContractDrawerExtra`/`getContractNotes` server action lại (fallback + dùng nơi khác như SSR/prefetch). KHÔNG xoá (A3/surgical).
4. Prefetch (`prefetchContract`) cũng đổi sang fetcher browser cho nhất quán cache.

### 4.2c — Verify (success criteria, đo bằng chrome-devtools)
- **Network tab**: mở drawer → thấy request **GET tới `*.supabase.co/rest/v1/...`** (browser-direct), KHÔNG còn `POST /contracts` (server action) cho drawer read.
- **Data đúng**: tabs Sự kiện/Checklist/Nhân sự (tên nhân sự + vendor hiện đủ — chứng minh JOIN employees/vendors qua RLS OK)/Ghi chú hiển thị đầy đủ như cũ.
- **RLS đúng**: login bằng account active → đọc full; (test phụ) account inactive → drawer rỗng (RLS chặn).
- **Đo cải thiện**: so thời gian drawer-open trước/sau (Network waterfall). Render screenshot.
- tsc 0 + eslint baseline.

### 4.2d — Rủi ro & rollback
- Thay đổi **khu trú ở queryFn** → rollback = revert 1 commit (queryFn về server action).
- Rủi ro chính: RLS thiếu policy → drawer thiếu data. Chặn bằng 4.2a verify trước.
- KHÔNG đụng write path, KHÔNG đụng contract list (riêng phase).

---

## ✅ 4.2 STATUS (2026-06-05): DONE + VERIFIED
Commits: `9faf34b` (employees_public view + allocations RLS), `d1947ce` (is_active_employee SECURITY DEFINER helper — fix 403), `deb12c3` (client-direct code). Verify chrome-devtools: drawer read = GET supabase REST 200 (không server-action), events/checklist/payment/notes render, Nhân sự resolve tên từ employees_public. DB applied prod. **CHƯA deploy Vercel code.**

## ⚠️ 4.3 — Phát hiện posture quan trọng (cập nhật sau 4.2)
4.2 lộ ra: **contracts tables CÓ sẵn grant authenticated** (default) → chỉ cần fix policy. NHƯNG các module 4.3 KHÁC posture:
- **dresses / dress_reservations / inventory_items / employees**: ĐÃ bị `REVOKE ALL FROM authenticated` (server-only chủ đích, `20260429110000`/`20260428200000`). Client-direct = phải **GRANT SELECT cho authenticated** = MỞ bảng cho browser (dù RLS gate). Đây là **đổi posture bảo mật**, không phải swap đơn thuần.
- **customers**: chưa có RLS.
→ "Làm hết" 4.3 nghĩa là cấp quyền browser đọc dresses/inventory/customers (data tài chính/khách). Cân nhắc: chỉ client-direct module **tần cao + ít nhạy cảm**; giữ server-only cho nhạy cảm (finance/employees). **Cần xác nhận lại với user trước khi grant browser cho từng bảng.**

## 5. Phase 4.3 — Nhân rộng client-direct (sau khi 4.2 xanh prod)

Mỗi module 1 task, **audit RLS-read TRƯỚC** rồi mới swap fetcher (đừng generalize — A3):

| Module | RLS status (grep) | Ghi chú |
|---|---|---|
| Dresses | ✅ `dresses`/`dress_reservations`/`dress_rentals`/`dress_rental_accessories` RLS enabled (`20260429110000`, có `TO authenticated`) | Khả thi sớm — verify policy đủ read |
| Inventory | ✅ `inventory_items`/`inventory_transactions` RLS enabled (`20260428200000`) | Verify authenticated-read |
| Customers | ⚠️ **Không thấy RLS** | CẦN hardening trước (giống contracts) — task riêng |
| Leads | (chưa audit) | dnd đã optimistic; read list client-direct = task riêng |

Thứ tự đề xuất: Dresses → Inventory (RLS sẵn) → Customers (cần RLS trước). Mỗi cái: audit → (vá RLS nếu thiếu) → browser fetcher → swap queryFn → verify render+network.

---

## 6. Quyết định đã CHỐT (2026-06-05)
1. **`employees` JOIN browser → VIEW `employees_public`** (id, full_name, avatar_url, department, position, status). KHÔNG mở RLS bảng employees (tránh lộ lương qua REST; RLS là row-level không che cột). View phơi cột an toàn, grant chỉ `authenticated`. Drawer bỏ FK-embed employees, resolve tên client-side từ view (qua hook `useEmployeesPublic`). View chứa MỌI employee (kể cả inactive/deleted) → không regress tên assignee cũ. **Tái dùng cho 4.3.**
2. **`payment_plan_allocations` → bật RLS + 2 policy** (service_role ALL + authenticated active-read), nhất quán với 6 bảng contract.
3. **Phạm vi 4.3 = LÀM HẾT:** dresses → inventory (RLS sẵn) → customers (hardening RLS trước) → leads (audit + hardening nếu thiếu).

---

## 7. Tổng effort ước lượng
- 4.2a RLS pre-req: ~1-2h (audit + 1 migration nhỏ + verify staging/prod).
- 4.2b code: ~2-3h (fetcher + port mapPaymentPlans + swap + giữ fallback).
- 4.2c verify: ~1h (chrome-devtools network + render + đo).
- 4.3 mỗi module: ~1-2h (tuỳ có cần RLS hardening không).
- **4.2 trọn gói: ~nửa ngày.** 4.3: cộng dồn theo module.

---

## 8. Không làm trong phase này (ranh giới)
- KHÔNG chuyển WRITE sang client-direct (giữ server action atomic).
- KHÔNG đụng contract LIST fetch (đã đủ nhanh với RPC v2 + notes JOIN).
- KHÔNG đụng finance (giữ revalidate, server-computed).
- KHÔNG refactor React Query → SWR hay ngược lại.
