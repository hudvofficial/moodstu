# Navigation Prefetch Optimization — PLAN (đã verify + sửa)

> **Nguồn:** plan gốc do Hermes sinh (`2026-06-16_104500-navigation-prefetch-optimization`).
> **Đã verify premise với code thật + sửa lỗi bởi main agent (2026-06-16).** Đây là bản AUTHORITATIVE cho `coder` thực thi — KHÔNG dùng bản gốc Hermes (file gốc lưu lỗi path, sẽ dọn).
> **Deploy:** KHÔNG `npx vercel --prod`. Deploy = `git push origin main` (Vercel auto-deploy). Chỉ push sau khi verify pass.
> **Trước mỗi task:** đọc `plans/260603-native-feel-performance/LESSONS.md` (CLAUDE.md bắt buộc) — NavigationWarmup là sản phẩm của sáng kiến này, xem mục ⚠️ xung đột bên dưới.

## Mục tiêu
Thay speculative warmup nền diện rộng bằng prefetch **theo intent** (`hover`/`focus`/`touchstart`) có dedupe, để `/printing` (và mọi màn data-heavy) không bị 1 loạt RSC fetch nền tới route không liên quan cạnh tranh với request của màn đang dùng — mà vẫn giữ cảm giác chuyển trang nhanh.

## ⚠️ Xung đột cần biết trước khi làm (main agent lưu ý)
- `NavigationWarmup` gần như chắc chắn được thêm bởi sáng kiến `plans/260603-native-feel-performance/`. Task 1 **đảo ngược một phần** công đó (đưa về sau feature-flag, mặc định tắt). **Đọc LESSONS.md của initiative đó trước** — nếu warmup được thêm có chủ đích cho 1 lý do đo được, cân nhắc trước khi tắt. Cách tiếp cận "flag, default off, giữ file" là reversible nên rủi ro thấp, nhưng phải biết mình đang tắt cái gì.
- `bottom-nav.tsx` là **file SHARED** (CLAUDE.md ghi rõ). Task 2 đụng nó → **verify ĐA MODULE**, không chỉ `/printing`.

## ✅ Premise đã verify (coder TIN, không cần verify lại)
1. `components/layout/app-shell.tsx:89` render `<NavigationWarmup role={role} />` **vô điều kiện** (qua `dynamic(..., { ssr:false })` ở `:18`). → Task 1 đúng điểm.
2. `components/layout/navigation-warmup.tsx`: sau `3000ms` + idle → `router.prefetch()` cho `hrefs.slice(0,4)` (stagger 200ms). Có network-guard `saveData/slow-2g/2g` (`shouldSkipWarmup`). **Đính chính premise Hermes:** `prewarmRouteData()` **KHÔNG tắt hẳn** — `:94` vẫn gọi cho `index===0`. (Tắt cả component qua flag sẽ tắt luôn call này, nên kết quả Task 1 vẫn đúng.)
3. `lib/hooks/use-prefetch-on-hover.ts:230-231`: gọi `router.prefetch(route)` **TRƯỚC** check dedupe `prefetchedRef.has(route)` → mỗi lần hover đều bắn `router.prefetch`. Route KHÔNG có SWR config (`getPrefetchConfig` trả `null`) thì **không bao giờ** được add vào `prefetchedRef` → bắn `router.prefetch` mọi hover. Task 3 fix đúng.
4. `components/layout/bottom-nav.tsx`: `<Link prefetch>` (nav item `:197`, more-menu `:154`) + `onPointerEnter/onFocus={() => warmRoute(...)}` → **double prefetch** (Next Link auto + `warmRoute` = `router.prefetch` + `prewarmRouteData`). Task 2 đúng.
   - **Bổ sung Hermes bỏ sót:** còn 2 nguồn prefetch khác trong bottom-nav: `useEffect` `:112-120` prefetch `moreItems.slice(0,8)` khi mở popup "Thêm"; nút "Thêm" `:231` `onPointerEnter` prefetch `moreItems.slice(0,4)`. Cả hai là **theo intent** (mở popup / hover nút) nên GIỮ — chỉ cần biết để Task 2 nhất quán, KHÔNG đụng tới (surgical).
5. Task 6: list sort theo **`created_at desc`** (`printing-queries.ts:158`); index có sẵn (`20260423090000_*`) trên **`order_date`** → lệch cột sort. Index `created_at` của Hermes khớp query hơn, **không duplicate**. Nhưng để optional (xem Task 6).

## ❌ Lỗi trong plan gốc đã sửa
- Hermes bảo chạy `npm run typecheck` → **không có script này**. Dùng **`npx tsc --noEmit`**. (Scripts có: `lint`, `build`, `verify:printing`.)
- Verify của Task 2 chỉ nhắc `/printing` → bổ sung **verify đa module** (bottom-nav shared).

---

## Task 1 — Tắt speculative warmup toàn cục (an toàn, reversible)
**File:** `components/layout/app-shell.tsx`
**Đọc trước:** `plans/260603-native-feel-performance/LESSONS.md` (xung đột ở trên).

**Bước:**
1. Đọc `app-shell.tsx`, xác định component chứa `:89`.
2. Ngay trước `return (` của component đó, thêm:
   ```tsx
   // Speculative cross-route warmup off by default; bật qua env để A/B (intent-based prefetch lo phần còn lại).
   const enableNavigationWarmup = process.env.NEXT_PUBLIC_ENABLE_NAVIGATION_WARMUP === "true";
   ```
3. Đổi dòng `:89` từ:
   ```tsx
   <NavigationWarmup role={role} />
   ```
   thành:
   ```tsx
   {enableNavigationWarmup && <NavigationWarmup role={role} />}
   ```
**Lưu ý:** `app-shell` là client component → chỉ đọc được `NEXT_PUBLIC_*`. Vắng env = tắt (đúng mong muốn). KHÔNG xóa `navigation-warmup.tsx` (giữ để A/B sau).

**Verify:** `npx tsc --noEmit` + `npm run lint`. Trên `/printing`, chờ >5s không chạm nav → Network KHÔNG còn RSC fetch tự động tới `/dashboard`, `/contracts`, `/calendar`, `/crm/leads`.

---

## Task 2 — BottomNav theo intent + bỏ double prefetch
**File:** `components/layout/bottom-nav.tsx` (⚠️ SHARED — verify đa module)

**Bước (áp cho CẢ 2 chỗ: nav-item `:197` và more-menu `:154`):**
1. `prefetch` → `prefetch={false}`.
2. Thêm `onTouchStart={() => warmRoute(item.href)}` (mobile không có hover tin cậy).
3. **GIỮ** `onPointerEnter`, `onFocus`, `onClick` y nguyên (desktop/tablet a11y + điều hướng).

Nav-item (`:197-203`) thành:
```tsx
<Link
  key={item.id}
  href={item.href}
  prefetch={false}
  onTouchStart={() => warmRoute(item.href)}
  onPointerEnter={() => warmRoute(item.href)}
  onFocus={() => warmRoute(item.href)}
  onClick={(e) => handleNavClick(e, item.href, isActive)}
  className={cn(...)}  // GIỮ nguyên className hiện có
>
```
More-menu (`:151-160`) thành:
```tsx
<Link
  key={item.id}
  href={item.href}
  prefetch={false}
  onTouchStart={() => warmRoute(item.href)}
  onPointerEnter={() => warmRoute(item.href)}
  onFocus={() => warmRoute(item.href)}
  onClick={() => {
    markPending(item.href);
    setShowMore(false);
  }}
  className={cn(...)}  // GIỮ nguyên
>
```
**KHÔNG đụng:** `useEffect :112-120`, nút "Thêm" `:231` (đã theo intent).

**Verify (đa module):**
- `npx tsc --noEmit` + `npm run lint`.
- Mobile viewport: mở `/printing` KHÔNG prefetch ngay các route bottom-nav; **chạm** 1 item mới prefetch; điều hướng OK; không console error.
- **Vì shared:** thử thêm ≥2 module khác có bottom nav (vd `/contracts`, `/calendar`) — điều hướng + highlight pending vẫn đúng, không vỡ.

---

## Task 3 — Sidebar hover: dedupe TRƯỚC prefetch
**File:** `lib/hooks/use-prefetch-on-hover.ts`

**Thay khối `:230-243`** (đang `router.prefetch` trước dedupe) bằng:
```ts
if (prefetchedRef.current.has(route)) return;
prefetchedRef.current.add(route);

router.prefetch(route);

const configOrConfigs = getPrefetchConfig(route);
if (!configOrConfigs) return;

const configs = Array.isArray(configOrConfigs) ? configOrConfigs : [configOrConfigs];
configs.forEach((config) => {
  void mutate(config.key, config.fetcher(), { revalidate: false }).catch(() => {
    prefetchedRef.current.delete(route);
  });
});
```
**Giữ nguyên** guard `:225` (pathname/route) và `:228` (`isSlowNetwork`) phía trên. Đây là sửa thứ tự + mark mọi route (kể cả route không có config) → hover lặp không bắn lại `router.prefetch`.
**Tradeoff (chấp nhận):** nếu `router.prefetch` fail thì route vẫn bị mark (không retry) — OK cho hover opt; điều hướng thật vẫn chạy.

**Verify:** `npx tsc --noEmit` + `npm run lint`. Hover lặp 1 item sidebar → KHÔNG bắn lại RSC/SWR; hover item khác → prefetch 1 lần.

---

## Task 4 — Instrumentation chỉ-dev (optional, low-risk)
**File:** `lib/hooks/use-prefetch-on-hover.ts`, `components/layout/bottom-nav.tsx`, `components/layout/navigation-warmup.tsx` (nếu còn dùng sau flag).

Thêm helper nhỏ (đặt 1 chỗ dùng chung, vd cuối `lib/navigation-data-prefetch.ts` hoặc inline mỗi file — coder chọn theo style, KHÔNG tạo file mới nếu thừa):
```ts
function debugPrefetch(source: string, href: string) {
  if (process.env.NODE_ENV !== "development") return;
  // eslint-disable-next-line no-console
  console.debug(`[prefetch:${source}]`, href);
}
```
Gọi trước `router.prefetch()`: `usePrefetchOnHover` → `"sidebar-hover"`; `BottomNav.warmRoute` → `"bottom-nav-intent"`; `NavigationWarmup` → `"navigation-warmup"`.
**Verify:** dev console hiện log đúng source; `npm run build` (prod) không log.

---

## Task 5 — Đo `/printing` trước/sau (bằng chứng)
Main agent/coder chạy qua preview tools hoặc chrome-devtools (CLAUDE.md: verify perf = render + đo Network, không phải unit test).
1. Login admin → `/printing`.
2. Console: `performance.clearResourceTimings()`.
3. Chờ 6s KHÔNG chạm sidebar/nav.
4. Chạy:
   ```js
   performance.getEntriesByType('resource')
     .filter(r => r.name.includes('_rsc') || r.initiatorType === 'fetch')
     .map(r => ({ name: r.name.replace(location.origin,''), type: r.initiatorType, duration: Math.round(r.duration), transferSize: r.transferSize }));
   ```
   **Kỳ vọng sau fix:** KHÔNG còn RSC tự động tới `/dashboard`,`/contracts`,`/calendar`,`/crm/leads` sau idle.
5. Click tab `Đang in` → đo lại → data cập nhật, URL `/printing?status=dang_in`, không console error.

---

## Task 6 — (CÓ ĐIỀU KIỆN) index DB cho filter printing
**CHỈ làm nếu:** sau Task 1–3, đo lại `/printing?status=dang_in` mà **vẫn chậm** (vượt target), VÀ `EXPLAIN ANALYZE` xác nhận bottleneck là scan/sort (không phải prefetch/region). Nếu prefetch cleanup đã đủ nhanh → **SKIP** (CLAUDE.md: không thêm speculative; index có write-cost).
**Bối cảnh đã verify:** list sort `created_at desc`; index sẵn có trên `order_date` (lệch cột) → index dưới đây KHÔNG duplicate, khớp query hơn:
```sql
create index if not exists idx_printing_orders_status_active_created
  on printing_orders (status, created_at desc) where deleted_at is null;
create index if not exists idx_printing_orders_lab_active_created
  on printing_orders (lab_id, created_at desc) where deleted_at is null;
create index if not exists idx_printing_orders_payment_active_created
  on printing_orders (payment_status, created_at desc) where deleted_at is null;
```
**Trước khi thêm:** kiểm `pg_indexes` đảm bảo chưa tồn tại; migration đặt `supabase/migrations/<timestamp>_printing_orders_created_at_indexes.sql`. Apply: `npm run migrate:latest <tên file>` (nhớ truyền tên file — xem memory `migrate-direct-script-behavior`), verify bằng `pg_indexes` chứ không tin message script.

---

## Gate verify tổng (trước khi push main)
```bash
npx tsc --noEmit
npm run lint
npm run verify:printing
```
- Đa module (do bottom-nav shared): smoke điều hướng ≥2 module khác.
- Đo Network `/printing` đạt kỳ vọng Task 5.
- Pass hết → `git push origin main`. KHÔNG `npx vercel --prod`.

## Acceptance criteria
- [ ] `/printing` load vẫn render đúng.
- [ ] Chờ 6s trên `/printing` không có prefetch RSC nền tới route không liên quan.
- [ ] Sidebar hover prefetch đúng 1 lần/route; hover lặp không bắn lại.
- [ ] BottomNav touch/focus/hover prefetch theo intent; mở `/printing` không prefetch hàng loạt ngay.
- [ ] Filter `/printing` chạy, URL cập nhật.
- [ ] Không console error. `tsc`/`lint`/`verify:printing` pass. Điều hướng đa module OK.
- [ ] Không dùng lệnh deploy thủ công.
