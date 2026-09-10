---
title: "Cache & realtime"
tags: [nen-tang, cache, realtime]
cap-nhat: 2026-08-31
trang-thai: da-kiem-2026-08-31
doi-chieu: agent/system-map/06-nen-tang.md §3 · vault/30-du-lieu/rls-va-quyen.md · supabase/migrations/20260714040000_realtime_signal_only_hardening.sql
---

# Cache & realtime

## Không có một công thức chung

Đây là điều dễ sai nhất khi sửa nhiều module. **Mỗi module dùng thư viện data khác nhau** — suy từ module này sang module kia là bug (LESSONS A3).

Đo lại 2026-08-31 (đếm file trong `components/<module>/`). Cột **Realtime** = số file mở kênh; từ 2026-07-14 **tất cả đều nghe `realtime_signals`**, không còn kênh nào nghe bảng nghiệp vụ:

| Module | Thư viện data | Realtime |
|---|---|---|
| contracts | **React Query** (9 file) | 3 |
| finance | SWR (22 file) | 1 (chỉ chuông báo) |
| crm | SWR (6) | 2 |
| printing | SWR (5) | 0 |
| dresses | SWR (4) | 3 |
| employees | SWR (3) | 2 |
| services | SWR (3) | 3 |
| gallery | SWR (2) | 0 |
| reports | SWR (1) | 0 |
| settings | React Query (1) | 4 |
| inventory | RSC + action | 2 |
| calendar · dashboard | **RSC thuần** | 0 · 1 (dashboard: kênh tự dựng, `dashboard-realtime-refresh.tsx:104-119`) |
| productivity · moodie | RSC + action | 1 |

**Trước khi áp pattern cho module nào: xác nhận nó dùng gì.**

## Ba tầng làm tươi dữ liệu

### 1. `revalidatePath` (Next.js) — xương sống
Dùng ở hầu hết mutation. Nặng nhất ở `inventory-mutations.ts` (**40** lần), `lab-mutations.ts` (17), `moodie-provider-actions.ts` (13), `debt-actions.ts` (12), `receipt-actions.ts` / `customer-actions.ts` (11). (`printing-workflow-mutations.ts` đã xoá ở ADR-017 — xác nhận file không còn tồn tại.)

**Finance: GIỮ `revalidatePath` bằng mọi giá.** Bỏ đi là số tiền hiển thị cũ. Không thay bằng realtime patch.

Chỉ được bỏ `revalidatePath` khi **trang đích có realtime cho đúng bảng đó** — và phải verify bằng event thật.

### 2. Optimistic — chỉ cho cái client tự biết kết quả
Helper đã có: `runOptimisticMutation` (`lib/optimistic-mutation.ts`). **Đừng viết helper mới**, đã từng suýt trùng.

Luật:
- `onSuccess → revalidate`, `onError → rollback`. Server luôn là chân lý.
- **KHÔNG** optimistic cho giá trị server tính lại: mã tự sinh (`*_code`), `recalc_contract_totals`, tồn kho bình quân, trạng thái `*_atomic`. Mẫu đúng: **đóng modal + revalidate**.
- **KHÔNG** optimistic-remove khi server có thể *retire* thay vì xoá. Ví dụ `delete_dress_atomic`: váy có lịch sử thuê → `status='retired'`, `deleted_at` vẫn NULL → vẫn nằm trong list → item "quay lại" sau revalidate.
- SWR array-key `[ns, filters]`: match bằng `cacheKeyMatchesPrefix`, đừng so key tuyệt đối.
- Đừng `revalidate(key, undefined)` → nháy skeleton. Dùng `revalidateByPrefixes`.

### 3. Realtime — hai cơ chế, đừng lẫn

**a) `postgres_changes` trực tiếp** (`use-realtime.ts`, `use-realtime-multi.ts`) — **KHÔNG CÒN DÙNG CHO BẢNG NGHIỆP VỤ**
Publication `supabase_realtime` hiện **chỉ chứa `realtime_signals`**. Đúng 15 bảng (nhóm contracts + `crm_leads`, `customers`, `schedules`, `approval_requests`, `receipts`, `printing_orders`, `google_sync_queue`…) đã bị `ALTER PUBLICATION … DROP TABLE` ở `20260714040000_realtime_signal_only_hardening.sql:8-42`, và không migration nào sau đó thêm lại. Hai hook vẫn tồn tại nhưng **100% call-site trong `components/` và `hooks/` đều trỏ `realtime_signals`**; cổng `npm run verify:realtime-client` (`scripts/verify-realtime-client-surface.mjs:12-19`) fail nếu ai đó gọi `useRealtime("<bảng khác>")`.
Ba điều kiện cũ — (i) có trong publication, (ii) bật RLS + có SELECT policy, (iii) `authenticated` còn GRANT SELECT — chỉ còn giá trị lịch sử: đọc để hiểu **vì sao** phải chuyển sang (b).
⚠️ Cổng canh **không bắt** kênh tự dựng bằng `supabase.channel(...)`. `components/dashboard/dashboard-realtime-refresh.tsx:104-119` là một kênh như vậy — hiện vẫn đúng luật (subscribe `realtime_signals`), nhưng không có gì canh nếu ai đó sửa.

**b) Signal ≠ Data** (`use-realtime-signal.ts`) — cho bảng server-only
Bảng bị REVOKE SELECT không thể subscribe trực tiếp (GRANT lại = lộ nguyên row qua payload; RLS lọc *dòng*, không lọc *cột* — `dresses.purchase_price`, lương nhân sự sẽ lộ). Giải pháp: bảng tín hiệu mỏng `realtime_signals {table_name, op}` + trigger statement-level trên bảng nguồn. Client nghe tín hiệu → **refetch qua server action** (lớp kiểm quyền duy nhất).

Ba bẫy khi chuyển call-site sang signal:
1. Tín hiệu là **INSERT** vào `realtime_signals` → call-site cũ đặt `eventTypes: ["UPDATE"]` sẽ câm.
2. Tín hiệu **không mang `row_id`** → filter `id=eq.X` phải bỏ; chấp nhận refetch khi bất kỳ dòng nào của bảng đổi.
3. `postgres_changes` chỉ nhận **1 filter expression** — không lọc `table_name` + `op` cùng lúc.

Thêm bảng finance có trang hiển thị → phải khớp **3 chỗ**: trigger trong migration signals + `FINANCE_SIGNAL_TABLES` (`finance-realtime-refresh.tsx`) + `SOURCE_TABLES`/`APP_FILTERS` trong script verify.

## ⚠️ Realtime "thành công" mà không có event

Từng phát hiện publication `supabase_realtime` **rỗng hoàn toàn** — mọi `useRealtime` trong app subscribe SUBSCRIBED nhưng chưa từng nhận event nào. App vẫn chạy nhờ revalidate nên không ai nhận ra suốt nhiều tháng.

**Quy tắc:** "trang này có realtime" phải verify bằng **event thật end-to-end** (đổi DB → thấy refetch trong log). `SUBSCRIBED` ≠ có event.
> ⚠️ CHƯA KIỂM (2026-08-31): đợt đối chiếu này chỉ xác minh được `realtime_signals` **có trong** publication (migration `20260714040000…sql:48-59`) và trigger `emit_realtime_signal` gắn trên 35 bảng. **Chưa chạy test event end-to-end** — chưa biết signal có thật sự tới client hay không.

Script: `scripts/verify-realtime-signals.mjs`, `npm run verify:realtime-client`.

## Tab ẩn giết SWR

`document.hidden = true` → SWR ngừng fetch, `loadingMore` kẹt `true`, nhìn y hệt bug app. Xảy ra khi verify trong browser pane. Muốn test phải giả `visibilityState='visible'` + dispatch `visibilitychange`. `IntersectionObserver` vẫn chết trong tab ẩn.

## Cache khác trong app

- **PWA/workbox** — `@ducanh2912/next-pwa`, verify bằng `npm run verify:pwa-cache` / `verify:pwa-artifact`.
- **IndexedDB** — `lib/dashboard-idb-cache.ts`, `swr-persist.ts` (`idb-keyval`).
- **React Query persist** — `@tanstack/react-query-persist-client` + `@tanstack/query-sync-storage-persister` có trong `package.json:78,80` nhưng **KHÔNG được dùng**: 0 import `persistQueryClient` / `PersistQueryClientProvider` / `createSyncStoragePersister` trong `app/`, `lib/`, `components/`, `hooks/`; `components/providers/query-provider.tsx` không bọc persist. Đừng dựa vào nó.
- **`getAuthenticatedUserContext`** cache theo request (React `cache`).

## Liên quan

[[bay-du-lieu]] · [[bao-mat-du-lieu-rls]] · [[tai-chinh]]
