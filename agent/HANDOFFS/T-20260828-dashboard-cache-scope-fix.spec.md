# T-20260828-dashboard-cache-scope-fix — 4 hàm `unstable_cache` gọi `headers()` bên trong cache scope → `/crm/customers` 500 im lặng, `/dashboard` mất 4 section

**Owner:** claude (spec + code trực tiếp — đường lùi ADR-003, user "bạn tự triển khai luôn") · **Trạng thái:** ✅ implemented + verified 28/08, chưa commit · **Module:** he-thong (dashboard) + khach-hang-crm · **DB:** không đụng · **ADR:** không cần (không đổi data-flow, không thêm lib, không đổi schema, không đổi cache key/tag/TTL).

## 0. Trace (đo local prod build 28/08, chỉ đọc)

### 0.1 Lỗi runtime nguyên văn

Chạy `npm run start` rồi mở `/crm/customers`, Next.js in:

```
⨯ Error: Route /crm/customers used `headers()` inside a function cached with
`unstable_cache(...)`. Accessing Dynamic data sources inside a cache scope is
not supported. …  digest: '1609030147@E838'
```

Tái hiện **100%**. Đo: **4.555ms** local / **4.055ms** prod (`/crm/customers` là route chậm nhất trong 15 route protected; các route còn lại 366–1.471ms).

### 0.2 Chuỗi gọi

`components/crm/widgets/widget-upcoming.tsx:36` (`useEffect` → `getUpcomingEventsAction()`)
→ `app/actions/dashboard-events.ts:5`
→ `lib/api/dashboard.ts:1185` `getUpcomingEvents()`
→ `:1070` `getDashboardUpcomingEventsSection()` — **gọi `getDashboardAccess()` ĐÚNG cách, ngoài cache scope**, rồi truyền `access.userId` vào
→ `:1050` `getCachedUpcomingEvents = unstable_cache(...)`
→ **`:1052` `void userId;` — vứt tham số vừa nhận**
→ **`:1053` `const access = await getDashboardAccess();` — gọi lại BÊN TRONG cache scope**
→ `:881` `getDashboardAccess` → `:219` `requireDashboardAccess()` → `getAuthenticatedUserContext()` → đọc `cookies()/headers()` ⇒ **ném lỗi**.

Nghịch lý cốt lõi: wrapper ngoài **đã** lấy access đúng cách và truyền vào, nhưng bên trong bỏ đi rồi lấy lại.

### 0.3 Không phải 1 hàm — là 4

Cùng file, cùng lỗi, 4 hàm liền nhau:

| Dòng | Hàm cache | Wrapper ngoài | Consumer |
|---|---|---|---|
| `:996` | `getCachedRevenueChart` | `:1016` `getDashboardRevenueChartSection` | `dashboard/page.tsx:220` `RevenueSection` |
| `:1023` | `getCachedServiceBreakdown` | `:1043` `getDashboardServiceBreakdownSection` | `dashboard/page.tsx:238` `ServiceBreakdownSection` |
| `:1050` | `getCachedUpcomingEvents` | `:1070` `getDashboardUpcomingEventsSection` | `dashboard/page.tsx:252` `EventsSection` **+** `widget-upcoming.tsx` (qua `getUpcomingEvents:1184`) |
| `:1077` | `getCachedPaymentReminders` | `:1097` `getDashboardPaymentRemindersSection` | `dashboard/page.tsx:265` `PaymentsSection` **+** `getPaymentReminders:1188` |

Cả 4 có cùng chữ ký cụt `async (userId: string)` + `void userId` + `await getDashboardAccess()`.

### 0.4 Mẫu ĐÚNG nằm sẵn trong chính file này

Hai hàm khác trong cùng file **không** dính lỗi, vì nhận đủ tham số:

- `:907` `getCachedDashboardCritical(userId, employeeId, role)` → `:917` `dashboardAccessFromArgs(employeeId, role)`
- `:1104` `getCachedDashboardBootstrap(userId, employeeId, role)` → dựng `access` từ tham số

Wrapper mẫu `:942 getDashboardCritical`:
```ts
export const getDashboardCritical = cache(async () => {
  const access = await getDashboardAccess();          // NGOÀI cache scope — đúng
  return getCachedDashboardCritical(access.userId, access.employeeId ?? "", access.role);
});
```

⇒ Đây là **lỗi sót khi refactor**: ai đó đã chuyển 2 hàm sang mẫu truyền-tham-số nhưng bỏ quên 4 hàm còn lại. `git log -L 1050,1056` cho thấy vùng này lần cuối đụng ở `627bd45` (Sprint 2 Data Optimization), trước commit `1bc9ce5` (dashboard cache TTL) — khớp giả thuyết refactor dở dang.

### 0.5 Vì sao fix an toàn tuyệt đối về phân quyền

`lib/api/dashboard.ts:203`:
```ts
function visibilityForRole(role: Role): DashboardVisibility {
  return {
    canViewFinancials: role === "admin" || role === "manager",
    canViewContracts:  role === "admin" || role === "manager" || role === "sale",
    canViewCalendar:   role === "admin" || role === "manager" || role === "sale" || role === "media",
  };
}
```
**Hàm thuần, chỉ phụ thuộc `role`.** `dashboardAccessFromArgs(employeeId, role)` (`:885`) cho ra `{employeeId, role, visibility}` — **giống hệt** phần `DashboardAccess` mà `getDashboardAccess()` trả về. Khác biệt duy nhất là `userId`, vốn đã bị `void` bỏ đi ở cả 4 hàm. ⇒ hành vi phân quyền **không đổi**, chứng minh được bằng đọc code, không phải phỏng đoán.

Cache key cũng **không đổi ý nghĩa**: `employeeId`/`role` là hàm của `userId` (1 user ↔ 1 employee ↔ 1 role), nên thêm chúng vào tham số không làm phân mảnh cache thêm.

### 0.6 Vì sao không ai phát hiện suốt thời gian dài

Lỗi bị nuốt ở **hai tầng**:

1. `lib/api/dashboard.ts:238 safeSection()` — `catch` → `errors.push(...)` → trả `fallback` (mảng rỗng). `/dashboard` render 4 section **trống rỗng nhưng không báo lỗi đỏ**; `SectionErrorNotice` có nhận `errors` nhưng người dùng chỉ thấy "chưa có dữ liệu".
2. `components/crm/widgets/widget-upcoming.tsx:41` — `catch (error) { console.error(...) }`, không rethrow, không báo Sentry.

Cùng kiểu bệnh vault đã ghi ở `60-bay/bay-du-lieu.md #10`: *"lỗi bị nuốt — đã làm chi phí vendor thiếu suốt 18 ngày mà không có gì báo đỏ."* Đây là ca thứ hai.

`grep -rn "captureException"` toàn repo → **đúng 1 kết quả**: `app/global-error.tsx:16`. Không có `error.tsx` cho `/dashboard` (chỉ có `loading.tsx`), nên lỗi tầng section không nổi lên đâu cả.

### 0.7 Không phải lỗi (đã kiểm, đừng đụng)

- `app/actions/gallery-image-helpers.ts:56` — `unstable_cache` **không** gọi auth bên trong. Sạch.
- `lib/productivity-auth.ts:35 getCachedTimezone` — cache theo tham số, không đọc cookies. Sạch.
- `:907 getCachedDashboardCritical` / `:1104 getCachedDashboardBootstrap` — đã đúng mẫu. **Không sửa.**
- `revalidateDashboardAfterMutation:955` + toàn bộ cache tag/TTL — **ngoài scope**, giữ nguyên.
- Payload `/contracts` 61KB (`contract_checklists` ~50%) — **cố ý** theo migration `20260605010000` + LESSONS A8 (drawer instant). **Không đụng.**

## 1. Sửa

### 1.1 `lib/api/dashboard.ts` — 4 hàm cache + 4 wrapper

Áp **nguyên mẫu `getCachedDashboardCritical` / `getDashboardCritical`** cho từng cặp. Với mỗi cặp trong bảng §0.3:

**a) Hàm `unstable_cache`** — đổi chữ ký và bỏ lời gọi auth:
```ts
// TRƯỚC
async (userId: string): Promise<...> => {
  void userId;
  const access = await getDashboardAccess();   // ← lỗi
  const supabase = await createAdminClient();
  ...
}

// SAU
async (userId: string, employeeId: string, role: Role): Promise<...> => {
  // userId is part of the unstable_cache key; keep it in the signature.
  void userId;
  const access = dashboardAccessFromArgs(employeeId, role);
  const supabase = await createAdminClient();
  ...
}
```
Giữ nguyên: mảng key (`["dashboard-revenue-v1"]` v.v.), `revalidate`, `tags`, thân hàm `loadDashboardSection(...)`, mọi lời gọi `query*(supabase, access.visibility)` / `queryUpcomingEvents(supabase, access)`.

**b) Wrapper `cache(...)`** — truyền đủ 3 tham số:
```ts
// TRƯỚC
return getCachedRevenueChart(access.userId);
// SAU
return getCachedRevenueChart(access.userId, access.employeeId ?? "", access.role);
```

✅ Đã kiểm sẵn: `queryUpcomingEvents(supabase, access)` (`:782`) nhận nguyên `access` nhưng chỉ đọc `access.visibility.*`, và truyền tiếp xuống `queryPersonalSchedules` (`:672`) / `queryWorkTasks` (`:727`) — cả hai chỉ đọc `access.role` và `access.employeeId`. **Không nơi nào chạm `userId`.** Cả 3 trường đều có trong `dashboardAccessFromArgs` ⇒ an toàn.

### 1.2 Bịt chỗ nuốt lỗi — `safeSection`

`lib/api/dashboard.ts:238` thêm báo Sentry trước khi nuốt (giữ nguyên hành vi fallback, chỉ thêm quan sát):
```ts
import * as Sentry from "@sentry/nextjs";   // thêm ở đầu file nếu chưa có

} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown dashboard error";
  Sentry.captureException(error, { tags: { area: "dashboard-section" }, extra: { label } });
  errors.push(`${label}: ${message}`);
  return fallback;
}
```

### 1.3 Bịt chỗ nuốt lỗi — `widget-upcoming.tsx`

`components/crm/widgets/widget-upcoming.tsx:41`, giữ nguyên UX (vẫn không làm vỡ widget), chỉ thêm báo:
```ts
} catch (error) {
  Sentry.captureException(error, { tags: { area: "crm-widget-upcoming" } });
  console.error("Failed to fetch upcoming events:", error);
}
```

**Giới hạn:** chỉ thêm `captureException` ở **đúng 2 chỗ** này. Không quét toàn repo thêm Sentry chỗ khác (ngoài scope).

## 2. Không được làm

- Không đổi cache key / `revalidate` / `tags` / `DASHBOARD_*_CACHE_SECONDS`.
- Không đụng `getCachedDashboardCritical`, `getCachedDashboardBootstrap`, `revalidateDashboardAfterMutation`.
- Không đổi `visibilityForRole`, `requireDashboardAccess`, `getAuthenticatedUserContext`.
- Không đụng `/contracts` (payload, TierSwitch, RPC, realtime) — ngoài scope, xem §0.7.
- Không thêm helper/util mới (LESSONS A2 — `dashboardAccessFromArgs` đã có).
- Không rethrow trong `safeSection`/`widget-upcoming` — giữ nguyên fallback, chỉ thêm quan sát.

## 3. Verify

**Tĩnh**
- `npx eslint lib/api/dashboard.ts components/crm/widgets/widget-upcoming.tsx` → 0 lỗi **mới**. Nếu đỏ: `git stash` 2 file rồi lint lại HEAD để tách pre-existing (LESSONS A4 / `bay-trien-khai.md` "eslint exit ≠ 0 → không push").
- `npx tsc --noEmit` · `rm -rf .next && npm run build`.

**Runtime (bắt buộc — đây là lỗi chỉ hiện ở prod build)**
1. `npm run start -- --hostname 127.0.0.1 --port 3000`, đăng nhập.
2. Mở `/crm/customers` → **log server KHÔNG còn** `used \`headers()\` inside a function cached with \`unstable_cache()\`` / `digest: '1609030147@E838'`.
3. Mở `/dashboard` → **4 section ra data thật**, không phải rỗng:
   - Biểu đồ doanh thu (6 tháng) có cột — đối chiếu `node scripts/db-q.mjs "SELECT to_char(created_at,'YYYY-MM') m, count(*), sum(total_amount)::bigint FROM contracts WHERE deleted_at IS NULL GROUP BY 1 ORDER BY 1 DESC LIMIT 6"`
   - Phân bổ dịch vụ có lát
   - Lịch sắp tới có mục (`contract_events` 185 dòng)
   - Nhắc thu tiền có mục
4. Đo lại `/crm/customers`: trước **4.055ms prod / 4.555ms local** → kỳ vọng về nhóm còn lại (366–600ms). **Ghi số đo thật vào §4, không ghi kỳ vọng.**

**Phân quyền (không được bỏ)**
- Đăng nhập vai `admin` → 4 section đầy đủ.
- Nếu có tài khoản vai khác: xác nhận `canViewFinancials` vẫn ẩn đúng chỗ. Nếu **không** có tài khoản vai khác (`so-lieu-van-hanh.md`: chỉ 1 admin + 1 kinh doanh), ghi rõ "không kiểm được vai media/photographer — dựa trên chứng minh §0.5 rằng `visibilityForRole` là hàm thuần".

**Sentry**
- Tạm ném lỗi giả trong 1 section → thấy event lên Sentry với tag `area: dashboard-section` → gỡ lỗi giả. (Nếu không có quyền Sentry, ghi "chưa verify được" thay vì bỏ qua im lặng.)

**Cache không hồi quy**
- Load `/dashboard` 2 lần liên tiếp → lần 2 nhanh hơn rõ rệt (cache còn ăn).
- Chạy 1 mutation hợp đồng → `revalidateDashboardAfterMutation("contracts")` → dashboard cập nhật.

## 4. Kết quả (28/08/2026 — số đo thật)

### Code
- `lib/api/dashboard.ts`: 4 hàm cache (`:1002`, `:1035`, `:1071`, `:1107` sau sửa) đổi chữ ký → `(userId, employeeId, role)` + `dashboardAccessFromArgs`; 4 wrapper truyền `access.employeeId ?? ""`, `access.role`. Thêm `import * as Sentry` + `captureException` trong `safeSection`.
- `components/crm/widgets/widget-upcoming.tsx`: thêm `captureException` trước `console.error` (giữ nguyên fallback).
- Grep xác nhận: **0** lời gọi `await getDashboardAccess()` còn nằm trong `unstable_cache` scope; **5** chỗ dùng `dashboardAccessFromArgs` (2 cũ + 3 mới — hàm thứ 4 dùng biến thể inline sẵn có).

### Verify tĩnh
`npx tsc --noEmit` → **exit 0**. `npx eslint` 2 file → **exit 0** (không cần đối chiếu baseline vì sạch hoàn toàn). `rm -rf .next && npm run build` → **✓**, PWA artifact verification passed.

### Verify runtime (local prod build, Playwright + seed E2E)
| Mục | Trước | Sau |
|---|---|---|
| Lỗi `used \`headers()\` inside a function cached with \`unstable_cache()\`` | mỗi lần mở `/crm/customers` | **0 lần** |
| `digest: '1609030147@E838'` | có | **0 lần** |
| Mọi lỗi `⨯` trong log server | có | **0** |
| `/crm/customers` | 4.555ms local / 4.055ms prod | **~1.048ms** (8.048 trừ 7.000ms chờ cố định) |
| `/dashboard` | — | **~564ms** |

### 4 section ra data thật (đối chiếu DB)
- **KPI**: Doanh thu tháng 18.300.000 · Hợp đồng mới **13** — khớp `db-q`: `2026-08 → 13 HĐ`.
- **Biểu đồ doanh thu**: trục T3→T8, thang 0–80tr — khớp dữ liệu thật (06/2026 = 98,8tr là đỉnh).
- **Phân bổ dịch vụ**: "Media · 2 HĐ · 15,4% · 7.300.000" — có lát thật.
- **Cần thu tiền**: 6 mục có mã HĐ thật (HĐ-2026-0052 "Đã giao chưa thu" 3.300.000; 0036; 0034…).
- `svg.recharts-surface` = **2** (đủ 2 biểu đồ) · `animate-pulse` = **0** (không kẹt skeleton).

### Suite E2E dự án (28 spec) + đối chứng baseline HEAD

Chạy full suite `--project=chromium` trên prod build: **1 passed, 41 failed, 45 did not run** (7,6 phút). **Không kết luận vội** — theo LESSONS A4, đã `git stash` 2 file → build lại HEAD sạch → chạy lại 3 spec đại diện:

| | HEAD (chưa sửa) | Có fix |
|---|---|---|
| `crm-customer-sync` + `settings-performance` + `finance-module` | **3 failed / 11 passed** | cùng nhóm fail |
| Lỗi cache scope trong log server | **4 lần** | **0 lần** |

⇒ **41 fail là pre-existing ở HEAD, không phải hồi quy của thay đổi này.** Nguyên nhân chung: `net::ERR_ABORTED` / timeout do chạy prod build trên máy dev (log server cho thấy `auth.employeeContext=1.5–4,1s`, `dashboard.paymentReminders=7.107ms` — chậm hơn prod nhiều lần). Suịte này vốn được thiết kế cho dev server ở :3000 (xem comment `playwright.config.ts:82`).

**Điểm mạnh của đối chứng này:** cùng máy, cùng build, cùng spec, chỉ đổi **một biến** là 2 file code — và biến duy nhất thay đổi là lỗi cache scope 4→0.

### Dọn dẹp sau test
- `test-results/`, `playwright-report/`, spec tạm `_verify-cache-scope.spec.ts` / `_sweep.spec.ts`, log `/tmp/*` — **đã xoá**. Server prod local **đã kill**, port 3000 trống.
- **Dữ liệu E2E rò vào DB thật**: sau suite còn 2 HĐ + 2 KH + 3 nhân sự prefix `E2E-` (teardown sót). Đã dùng **`sweepStaleE2EOrphans` có sẵn** (`tests/e2e/e2e-sweep.ts`) thay vì tự viết SQL xóa — hàm này xóa bảng con đúng thứ tự FK (`expenses` trước `printing_orders`, comment ghi rõ từng làm rò HĐ E2E ra prod 08/08).
- Lưu ý: sweep **time-bounded 30 phút** (`STALE_MS`, `e2e-sweep.ts:28`) — cố ý, tránh xóa nhầm run đang chạy song song. Phải chờ rác đủ 30 phút tuổi mới quét được.
- Xác nhận cuối: `contracts` **66 → 64** (đúng số thật), rác E2E = **0/0/0**. `git status` chỉ còn 2 file code + spec này.

### Chưa verify được — ghi rõ thay vì bỏ qua
- **Vai khác ngoài admin**: hệ thống chỉ có 1 admin + 1 kinh doanh (`so-lieu-van-hanh.md`), seed E2E là admin. Dựa trên chứng minh §0.5: `visibilityForRole` là hàm thuần chỉ phụ thuộc `role`, và chuỗi `queryUpcomingEvents → queryPersonalSchedules/queryWorkTasks` chỉ đọc `role`/`employeeId`/`visibility`.
- **Sentry event thật**: chưa ném lỗi giả để kiểm event lên dashboard Sentry (cần quyền truy cập Sentry). Code đúng mẫu `app/global-error.tsx:16` đang chạy.



## 5. Ghi chú cho reviewer

- Rủi ro dùng-thừa-trường đã khép ở §1.1 (`queryUpcomingEvents` → `queryPersonalSchedules`/`queryWorkTasks` chỉ đọc `role`, `employeeId`, `visibility`). Không còn ẩn số về dữ liệu đầu vào.
### ⚠️ `error.tsx` KHÔNG bắt được lỗi này — đừng hiểu nhầm

Đã cân nhắc và **cố ý loại** khỏi spec, vì hai lý do đo được:

1. `safeSection:238` đã `catch` mất lỗi → nó **không bao giờ** nổi lên tới error boundary. Thêm `dashboard/error.tsx` không thay đổi gì với bug này.
2. **15/15 file `error.tsx` đang có trong repo không file nào gọi Sentry** (kiểm 28/08) — chúng chỉ tránh màn hình trắng, không tăng khả năng quan sát.

⇒ Khả năng quan sát cho ca này đến từ `Sentry.captureException` ở §1.2/§1.3, **không** từ error boundary.

### Tồn đọng đã phát hiện — cố ý để NGOÀI spec này

User đã hỏi "có nên gộp luôn không" (28/08) → quyết định **không gộp**. Lý do: spec càng to review càng loãng, mà [[adr-index|ADR-007]] đã gỡ branch protection — review là lưới duy nhất. Thêm: `60-bay/bay-du-lieu.md #13` (commit `f1b96d6` xây 287 dòng cho rủi ro không tồn tại, chết 70 ngày).

| Tồn đọng | Quy mô đo được | Xử lý khi nào |
|---|---|---|
| `console.error` nuốt lỗi | **121 chỗ** (`app`+`components`+`lib`) | Sau 1–2 tuần có dữ liệu Sentry → spec riêng, ưu tiên theo số lần nổ thật |
| `error.tsx` thiếu | 6 route: `admin`, `audit-logs`, `calendar`, `dashboard`, `finance`, `reports` | Việc riêng; kèm quyết định có chuẩn hoá Sentry vào cả 15 file cũ không |
| Vault trôi 3 tuần | `adr-index.md` dừng ở ADR-013, `agent/DECISIONS.md` có **17** (thiếu 014→017, trong đó **ADR-016 "Ba sổ, một hợp đồng"** là quyết định lớn về dòng tiền) | Độc lập; `node scripts/vault-gen-schema.mjs` + `vault-gen-codemap.mjs` + cập nhật tay bảng ADR. Nên do người nắm ADR-016 viết |
| `/contracts` perf | TTFB ~50ms, RPC 130–314ms, 54 HĐ | **Đóng** — đo không ra nút thắt. Nếu user vẫn thấy chậm khi dùng thật → đo Speed Insights trên thiết bị thật (PC/mobile/iPad), không phải Playwright desktop |

**Spec này chính là công cụ đo cho dòng 1–2**: sau merge, `Sentry.captureException` ở `safeSection` bắt đầu chảy dữ liệu thật → danh sách 121 chỗ trở thành danh sách **có ưu tiên theo số lần lỗi thật**, thay vì rà mò (đúng ADR-005: đo trước, chỉ sửa cái số đo chỉ ra).
