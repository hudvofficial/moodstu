# 07 — Lịch làm việc (`/calendar`) & Trung tâm điều hành (`/dashboard`)

> Bản đồ bổ sung cho 2 module bị bỏ sót. Quy ước như 6 miền trước: mọi khẳng định có `file:dòng`.
> Đường dẫn tương đối tính từ `C:\Users\Admin\Desktop\Ai\mood saas\mood-studio`.
> **Không chạy lệnh nào chạm DB** — mọi câu SQL trong mục 6 chỉ để đọc.

---

## 1. Bảng dữ liệu

### 1.1 Miền Lịch làm việc

| Bảng | Vai trò trong lịch | Ai GHI (từ miền lịch) | file:dòng |
|---|---|---|---|
| `schedules` | **Nguồn sự kiện DUY NHẤT thực sự hiển thị trên `/calendar`.** Lịch cá nhân của nhân sự (`employee_id` NOT NULL), có thể gắn `contract_id`. Không có cột `deleted_at` → **hard delete** | `createCalendarEvent` (insert), `updateCalendarEvent` (update), `deleteCalendarEvent` (delete), `updateDragDropDate` (update `event_date`/`end_date`), worker ghi `google_event_id` | `app/actions/calendar-mutations.ts:252-266`, `:305-316`, `:377-380`, `:166`, `app/api/calendar/sync-worker/route.ts:97-100` · cột: `types/database.types.ts:4974-5008` |
| `contract_events` | **CHỈ ĐỌC.** Mốc `ngay_chup` / `ngay_to_chuc` của hợp đồng được RPC gom vào feed lịch — nhưng bị **lọc bỏ ở client** (xem §4a) | Không file nào trong miền lịch ghi. Grep `contract_events` trong `app/actions/calendar-*.ts` + `components/calendar/**` + `hooks/use-calendar-data.ts` + `app/api/calendar/**` chỉ ra **1 kết quả duy nhất và là SELECT** | `app/actions/calendar-queries.ts:377` (query fallback) · RPC: `supabase/migrations/20260714210000_contract_multi_day_schedule.sql:119-126` |
| `work_tasks` | Phân công ekip. RPC gom vào feed (chỉ 5 `work_type`), cũng bị lọc bỏ ở client | `updateDragDropDate` (`deadline` **hoặc** `start_date`), `assignCalendarTask` (`assigned_to`), `updateCalendarTaskDetails` (`status`/`deadline`/`start_date`/`assigned_to`) | `app/actions/calendar-mutations.ts:192-195` · `app/actions/calendar-task-actions.ts:162-165`, `:281-284` |
| `google_sync_queue` | Hàng đợi 1 chiều nội bộ → Google. Cột: `schedule_id, google_event_id, action, payload, status, attempts, idempotency_key` | **2 nơi ghi vào**: `enqueueGoogleSync` (upsert, có `idempotency_key`), Moodie duyệt hành động (insert, **KHÔNG** có `idempotency_key`). Worker update/delete | `app/actions/calendar-mutations.ts:117-125` · `app/actions/moodie-action-actions.ts:113-119` · `app/api/calendar/sync-worker/route.ts:71`, `:110-117`, `:238-241` |
| `employees` | Danh sách bộ lọc + phân quyền (`auth_user_id` → `id`/`role`) | không ghi | `app/actions/calendar-queries.ts:526-531` · `lib/calendar-auth.ts:32-36` |
| `studio_info` | Giữ `google_oauth` (token OAuth cấp **studio**, không phải cấp nhân sự) | không ghi từ miền lịch | `app/actions/calendar-queries.ts:543-547` · `lib/googleCalendarService.ts:81-87` |
| `contracts`, `customers` | JOIN lấy `contract_code` + `full_name` cho nhãn nhóm | không ghi | `supabase/migrations/20260714210000_...sql:120-121, 153-154` |
| `realtime_signals` | Kênh tín hiệu (không có dữ liệu nghiệp vụ) — lịch nghe `schedules`, `work_tasks`, `google_sync_queue` | trigger DB | `hooks/use-calendar-data.ts:111-124` · `supabase/migrations/20260714040000_realtime_signal_only_hardening.sql:8-42` |

**Chưa tìm thấy `CREATE TABLE public.schedules` trong `supabase/migrations/`** — bảng có trước lịch sử migration. Toàn bộ dấu vết migration của nó chỉ là 2 index (`20260429190000_calendar_audit_fix.sql:3-7`) và việc gỡ khỏi publication + gắn trigger signal (`20260714040000_...sql:20`).

### 1.2 Miền Trung tâm điều hành

| Bảng | Vai trò trên dashboard | Ai GHI | file:dòng |
|---|---|---|---|
| `payments` | Tử số "Doanh thu tháng" + cột biểu đồ 6 tháng (theo `payment_date`) | không ghi từ dashboard (miền tiền) | RPC `supabase/migrations/20260512103000_dashboard_correctness_hotfix.sql:29-34` · chart `20260510201000_dashboard_deferred_sections.sql:24-31` |
| `receipts` | Cộng thêm phiếu thu **bán lẻ** (`contract_id IS NULL`) vào cùng con số "Doanh thu" | không ghi | `20260512103000:36-43` · `20260510201000:32-40` |
| `contracts` | "Hợp đồng mới" (theo `contract_date`), "Hoàn thành" (theo `updated_at`!), "Tổng công nợ" (Σ `remaining_amount`), phân bổ dịch vụ (Σ `total_amount`) | không ghi | `20260512103000:63-101`, `:132-137` |
| `contract_events` | Khối "Lịch sắp tới" (mốc HĐ 14 ngày tới) | không ghi | `lib/api/dashboard.ts:640-652` |
| `schedules` | Khối "Lịch sắp tới" (lịch cá nhân) | không ghi | `lib/api/dashboard.ts:687-697` |
| `work_tasks` | Khối "Lịch sắp tới" (nhiệm vụ) | không ghi | `lib/api/dashboard.ts:741-750` |
| `customers` | Tên khách trong 2 khối danh sách | không ghi | `lib/api/dashboard.ts:643`, `:689`, `:743` |
| `realtime_signals` | Kênh tín hiệu → gọi `invalidateDashboardCache` | trigger DB | `components/dashboard/dashboard-realtime-refresh.tsx:104-119` |

**Dashboard KHÔNG GHI bất kỳ bảng nào.** Toàn bộ `lib/api/dashboard.ts` chỉ có `.select()` / `.rpc()`; không có `insert/update/delete/upsert`.

---

## 2. RPC & hàm DB

| RPC | Bảng chạm | Trạng thái | Định nghĩa mới nhất | Ai gọi |
|---|---|---|---|---|
| `calendar_month_events(int,int)` | `schedules` ∪ `contract_events` (+`contracts`,`customers`) ∪ `work_tasks` | ✅ **CÒN SỐNG** | `supabase/migrations/20260714210000_contract_multi_day_schedule.sql:31-171` (6 phiên bản `CREATE OR REPLACE`; bản này là mới nhất) | `app/actions/calendar-queries.ts:415-418` |
| `dashboard_critical_kpis(int,int)` | `payments`, `receipts`, `contracts` | ✅ còn sống | `20260512103000_dashboard_correctness_hotfix.sql:5-102` | `lib/api/dashboard.ts:422` |
| `dashboard_revenue_chart(int,int,int)` | `payments`, `receipts` | ✅ còn sống | `20260510201000_dashboard_deferred_sections.sql:5-50` | `lib/api/dashboard.ts:514` |
| `dashboard_service_breakdown(int,int,boolean)` | `contracts` | ✅ còn sống (bản **3 tham số**) | `20260512103000:111-140` | `lib/api/dashboard.ts:618` |
| `dashboard_service_breakdown(int,int)` | — | ❌ **ĐÃ DROP** | `DROP FUNCTION IF EXISTS public.dashboard_service_breakdown(int, int);` — `20260512103000:109` | — |
| `finance_pending_collections(int)` | `contracts`, `customers`, `contract_events` | ✅ còn sống | `20260826180000_tien_ekip_va_can_thu.sql:372-393` | `lib/api/dashboard.ts:850` — **RPC tài chính DUY NHẤT mà dashboard dùng** |

### 2.1 `calendar_month_events` — chi tiết quan trọng

```
RETURNS TABLE(event_source, id, event_type, event_date, end_date, employee_id, contract_id,
              status, google_event_id, color_id, location, notes, work_type, assigned_to,
              start_date, start_time, end_time, deadline, event_id, contract_code, customer_name)
```
(`20260714210000:34-55`)

- Cửa sổ: `[tháng-2, tháng+3)` — cố định trong hàm, **không** nhận `viewMode` (`:63-64`).
- 3 nhánh UNION ALL: `schedules` (`:69-93`) · `contract_events` lọc `deleted_at IS NULL AND c.deleted_at IS NULL AND event_type IN ('ngay_chup','ngay_to_chuc')` (`:97-126`) · `work_tasks` lọc `work_type IN ('chup_anh','quay_phim','makeup','tro_ly','cameraman')` (`:130-159`).
- **KHÔNG có tham số nhân sự và KHÔNG lọc theo `employee_id`** → mọi vai trò gọi được đều nhận **toàn bộ** `schedules` trong cửa sổ. So sánh: đường fallback TS **có** lọc (`app/actions/calendar-queries.ts:370-372`). Xem §6-B3.
- `GRANT EXECUTE … TO service_role` duy nhất, REVOKE `anon`/`authenticated` (`:173-176`) → chỉ gọi được từ server action dùng admin client.
- Lịch sử: `20260522021500_calendar_rpc_filter_work_tasks.sql` (lọc work_task) → `20260522021600_calendar_rpc_remove_work_tasks.sql` (**bỏ hẳn nhánh work_tasks**) → `20260714210000` **đưa work_tasks trở lại + thêm nhánh `contract_event`**. Repo `types/database.types.ts` không dùng để tra hàm này (RPC gọi qua client không typed ở chỗ này).

### 2.2 Hàm/route liên quan không phải RPC

| Tên | Vai trò | file:dòng |
|---|---|---|
| `requireCalendarAccess` | employee `active` + `deleted_at IS NULL` + `ROLE_PERMISSIONS[role].includes("calendar")`; `isGlobalAdmin = admin\|manager` | `lib/calendar-auth.ts:27-58` |
| `requireCalendarScheduleEditable` | non-admin → `schedules.employee_id` phải = mình | `lib/calendar-auth.ts:107-129` |
| `requireCalendarTaskEditable` / `requireCalendarTaskAssignable` / `requireCalendarTargetEmployee` | quyền thao tác task / chọn nhân sự đích | `lib/calendar-auth.ts:140-162`, `:164-179`, `:88-98` |
| `requireDashboardAccess` | `getAuthenticatedUserContext()` + `canAccess(role,"dashboard")`; trả `{userId, employeeId, role, visibility}` | `lib/api/dashboard.ts:220-237` |
| `visibilityForRole` | `canViewFinancials = admin\|manager` · `canViewContracts = +sale` · `canViewCalendar = +media` | `lib/api/dashboard.ts:204-214` |
| `dashboardAccessFromArgs(employeeId, role)` | **tái dựng** access bên trong `unstable_cache` (không đọc cookie/JWT — bắt buộc, vì hàm cache không được chạm request store) | `lib/api/dashboard.ts:890-896`, dùng ở `:923`, `:1009`, `:1045`, `:1081`, `:1117` |
| `getDashboardAccess` | `React.cache(requireDashboardAccess)` — dedupe 1 lần/request | `lib/api/dashboard.ts:886-888` |

---

## 3. Server action & route

### 3.1 Lịch — `app/actions/calendar-queries.ts` (đọc, `withAuth`)

| Hàm | Nguồn | Ghi chú | dòng |
|---|---|---|---|
| `fetchCalendarEvents(month, year, viewMode)` | RPC `calendar_month_events`, **2 lớp fallback** | try/catch bọc RPC; lỗi bất kỳ → `fetchCalendarEventsFallback` | `:432-446` |
| `fetchCalendarEventsRpc` | RPC | `isMissingRpcError` → fallback | `:406-430` |
| `fetchCalendarEventsFallback` | `schedules` + `contract_events` (**KHÔNG có `work_tasks`**) | có lọc `employee_id` cho non-admin (`:370-372`) | `:350-404` |
| `fetchCalendarGoogleEvents` | `schedules.google_event_id` + Google API | bỏ event đã liên kết (`:488`) và event do hệ thống đẩy lên (`moodSource === "contract_event"`, `:489`) | `:448-520` |
| `fetchCalendarFilterEmployees` | `employees` active | | `:522-537` |
| `checkGoogleCalendarStatus` | `studio_info.google_oauth` | | `:539-552` |

### 3.2 Lịch — ghi

| Hàm | Bảng | Đẩy queue Google? | dòng |
|---|---|---|---|
| `createCalendarEvent` | insert `schedules` | có, **chỉ khi** `sync_to_google` (`:274`) | `app/actions/calendar-mutations.ts:244-292` |
| `updateCalendarEvent` | update `schedules` | có nếu đã có `google_event_id` (UPDATE), hoặc `sync_to_google` (CREATE) | `:294-354` |
| `deleteCalendarEvent` | delete `schedules` | enqueue DELETE **trước**, lỗi enqueue → **chặn xóa local** (`:372-374`) | `:356-387` |
| `updateDragDropDate` | update `schedules` **hoặc** `work_tasks` | chỉ schedule có `google_event_id` (`:169`); `source==="google"` bị chặn (`:152-154`) | `:136-203` |
| `assignCalendarTask` | update `work_tasks.assigned_to` | không | `app/actions/calendar-task-actions.ts:149-172` |
| `updateCalendarTaskDetails` | update `work_tasks` + dò "auto print" | không | `:247-313` |
| `checkEmployeeAvailability` | đọc `schedules` + `work_tasks`, tính chồng lịch trong TS | **0 nơi gọi** | `:174-245` |

### 3.3 Route

| Route | Bảo vệ | Việc | dòng |
|---|---|---|---|
| `app/(protected)/calendar/page.tsx` | `getAuthenticatedUserContext()` + `ROLE_PERMISSIONS[shellRole].includes("calendar")` → `redirect("/")` | render `CalendarWrapper` | `:13-18` |
| `app/api/calendar/sync-worker/route.ts` (POST) | **BẤT KỲ user đăng nhập nào** `\|\|` `Authorization: Bearer $CRON_SECRET` | rút tối đa 10 job `status='pending' AND attempts<3`, gộp theo `schedule_id` giữ bản mới nhất, gọi Google, xóa job | `:199-205`, `:214-220`, `:231-249` |
| `app/(protected)/dashboard/page.tsx` | `requireDashboardAccess()` **bên trong** `<Suspense>` (shell không await gì) | 5 khối stream độc lập | `:286`, `:343-348` |

### 3.4 Dashboard — loader (`lib/api/dashboard.ts`)

| Export | Cache | Tag | dòng |
|---|---|---|---|
| `getDashboardCritical` | `unstable_cache` 120s, key `["dashboard-critical-v1", userId, employeeId, role]` | `dashboard-critical` | `:912-954` |
| `getDashboardRevenueChartSection` | 300s, `["dashboard-revenue-v1", …]` | `dashboard-revenue` | `:1001-1035` |
| `getDashboardServiceBreakdownSection` | 300s | `dashboard-services` | `:1037-1071` |
| `getDashboardUpcomingEventsSection` | 300s | `dashboard-events` | `:1073-1107` |
| `getDashboardPaymentRemindersSection` | 300s | `dashboard-payments` | `:1109-1143` |
| `invalidateDashboardCache(tables[])` | server action, map bảng → tag; nếu chạm `dashboard-critical` thì thêm `revalidatePath("/dashboard")` | `app/actions/dashboard-cache.ts:13-77` |
| `invalidateDashboardCritical()` | chỉ `revalidateTag("dashboard-critical")` + `revalidatePath("/dashboard")` | `lib/server-cache-invalidation.ts:25-28`, gọi qua `invalidateContractPaths(..., {dashboard:true})` `:89` |

### 3.5 Mã chết trong 2 miền (0 nơi gọi — đã grep toàn repo)

| Thứ | Bằng chứng |
|---|---|
| `app/actions/schedule-actions.ts` (toàn file: `createSchedule`/`updateSchedule`/`deleteSchedule` + 3 helper Google gọi **trực tiếp**, revalidate `/schedules` — route không tồn tại) | comment tự thú `:25-26`; grep `schedule-actions` chỉ ra 1 comment ở `app/actions/task-assign-actions.ts:62` |
| `checkEmployeeAvailability` (2 bản khác nhau, cùng tên) | `app/actions/calendar-task-actions.ts:174` và `app/actions/task-assign-actions.ts:146` — grep toàn repo chỉ ra đúng 2 dòng `export`, **không có nơi gọi** |
| `revalidateDashboardAfterMutation` | `lib/api/dashboard.ts:964-999` — bản sao thứ 2 của bảng map tag, **thiếu** `work_tasks` và thiếu `contract_events→payments` so với bản sống ở `app/actions/dashboard-cache.ts:32-41` |
| `lib/dashboard-idb-cache.ts` | 0 import trong toàn repo |
| `lib/hooks/use-dashboard-prefetch.ts` (`useDashboardPrefetch`) | 0 nơi gọi; `hooks/use-prefetch-on-hover.ts:121` chỉ có comment "handled by useDashboardPrefetch hook" |
| `getDashboardBootstrap` / `getCachedDashboardBootstrap` / `prewarmDashboardBootstrap` / `getDashboardKPIs` / `getRevenueChart` / `getServiceBreakdown` / `getPaymentReminders` | `lib/api/dashboard.ts:1145-1231` — chỉ `getUpcomingEvents` còn sống (qua `app/actions/dashboard-events.ts:6` → `components/crm/widgets/widget-upcoming.tsx:9`) |

---

## 4. Luồng nghiệp vụ

### (a) Nguồn sự kiện → Lịch — **feed 3 nhánh, UI chỉ vẽ 1 nhánh**

```
  schedules ───────────┐
  contract_events ─────┤   calendar_month_events(p_month,p_year)      [migr 20260714210000:66-169]
  (ngay_chup/to_chuc)  ├──► UNION ALL, cửa sổ [M-2, M+3), KHÔNG lọc employee
  work_tasks (5 loại) ─┘
                            │
                            ▼
              fetchCalendarEventsRpc  [calendar-queries.ts:406-430]
                            │  (RPC lỗi / thiếu → fetchCalendarEventsFallback :350-404,
                            │   fallback CHỈ có schedules + contract_events, KHÔNG có work_tasks)
                            ▼
              mapRpcCalendarEvent → UnifiedCalendarEvent[]  [:279-348]
                 source ∈ {schedule, contract_event, task}
                            │
                            ▼
              SWR key "calendar:{M}:{Y}:{view}"  [use-calendar-data.ts:81-84]
                            │
              + Google events (SWR riêng "calendar-google:{M}:{Y}:{view}")  [:103-109]
                            │
                            ▼
   ┌──────────────────────────────────────────────────────────────────────┐
   │ filteredEvents  [use-calendar-data.ts:147-160]                        │
   │   if (event.source !== "schedule" && event.source !== "google")       │
   │       return false;          ◄── DÒNG 149: VỨT contract_event + task  │
   └──────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
        events / eventsByDate  → MonthGrid · WeekGrid · DayView · MobileMonthGrid · DayDrawer
                                 [calendar-wrapper.tsx:38-49, 163-195, 224-240]
```

**Hệ quả đã kiểm chứng:** nhánh `contract_events` và `work_tasks` của RPC được tính ở DB, truyền qua mạng, map sang `UnifiedCalendarEvent`, rồi **bị lọc bỏ trước khi vẽ**. UI vẫn còn đủ mã cho chúng (badge `HỢP ĐỒNG`/`TASK` ở `components/calendar/drawers/event-view-drawer.tsx:36-37`, guard kéo-thả `ev.source === "contract_event"` ở `components/calendar/views/month-grid.tsx:111` và `week-grid.tsx:86`, nhánh form `source === "task"` ở `event-form-drawer.tsx:210,538,543,582`) — tức là **mã chết theo sau một bộ lọc**, không phải thiết kế cố ý ghi ở đâu đó. Cũng vì vậy `useRealtimeSignal("work_tasks", …)` (`use-calendar-data.ts:116-119`) refetch một tập dữ liệu không bao giờ hiển thị.

**Chế độ xem:** `Tháng` / `Tuần` / `Ngày` (`components/calendar/calendar-toolbar.tsx:33-35`); `Hôm nay` là **nút nhảy ngày**, không phải chế độ xem (`:122`, `:312`). Cả 3 chế độ dùng **cùng một RPC** `calendar_month_events(p_month, p_year)` — `viewMode` chỉ vào SWR key và chỉ đổi độ rộng cửa sổ ở **đường fallback** (`calendar-queries.ts:145-147`), RPC không nhận tham số này.

**Ghi ngược `contract_events`: KHÔNG.** Miền lịch chỉ đọc (xem §1.1). Sửa mốc HĐ nằm ở `app/actions/contract-event-actions.ts` (miền hợp đồng).

### (b) Lịch → Google Cloud

```
 NGƯỜI DÙNG (drawer / kéo-thả)
        │  createCalendarEvent(sync_to_google) · updateCalendarEvent · deleteCalendarEvent · updateDragDropDate
        ▼
 enqueueGoogleSync()  [calendar-mutations.ts:110-130]
   upsert google_sync_queue { schedule_id, google_event_id, action, payload,
                              idempotency_key = "<schedule_id>:<ACTION>",
                              status:'pending', attempts:0 }
   onConflict: idempotency_key       (unique partial index: migr 20260714050000:4-6)
        │
        │   ── nhánh 2: Moodie duyệt "sync_google_calendar"
        │      insert google_sync_queue  KHÔNG có idempotency_key
        │      [app/actions/moodie-action-actions.ts:113-119]
        ▼
 ╔═══════════════ AI KÍCH WORKER? ═══════════════╗
 ║ CHỈ client /calendar:                          ║
 ║  triggerCalendarSync()                         ║
 ║   – return sớm nếu !isGoogleConnected           ║
 ║   – debounce 5s (lastSyncAt)                    ║
 ║   – fetch POST /api/calendar/sync-worker        ║
 ║  [calendar-wrapper.tsx:59-65]                   ║
 ║  gọi khi: mount (:148) · sau khi lưu form (:256)║
 ║                                                 ║
 ║ KHÔNG CÓ CRON. vercel.json chỉ có {"regions"}   ║
 ║ Route vẫn chấp nhận Bearer $CRON_SECRET nếu ai  ║
 ║ đó cấu hình cron bên ngoài repo  [route.ts:201] ║
 ╚═════════════════════════════════════════════════╝
        ▼
 POST /api/calendar/sync-worker   [route.ts:185-256]
   auth: user đăng nhập BẤT KỲ  ||  Bearer CRON_SECRET      (:199-205)
   SELECT * WHERE status='pending' AND attempts<3 ORDER BY created_at LIMIT 10   (:214-220)
   coalesceQueue: gom theo schedule_id, GIỮ bản mới nhất, XÓA các bản cũ  (:42-68, :237-246)
   for each record (tuần tự):                                  (:248-250)
     DELETE → deleteGoogleCalendarEvent → xóa job              (:131-137)
     CREATE/UPDATE:
        schedule biến mất  → xóa job, "skipped"                (:146-150)
        có googleEventId   → updateGoogleCalendarEvent + vá schedules.google_event_id  (:157-167)
        chưa có            → createGoogleCalendarEvent → ghi schedules.google_event_id (:169-178)
     lỗi → attempts+1, attempts>=2 ⇒ status='failed'           (:105-124)
        ▼
 lib/googleCalendarService.ts  — 1 token OAuth cấp studio (studio_info.google_oauth), 1 lịch primary
        [:81-87 đọc token, :137+ create, :186+ update, :228+ delete]

 CHIỀU NGƯỢC (Google → nội bộ): KHÔNG CÓ WEBHOOK.
   Chỉ đọc-hiển-thị: getGoogleCalendarEvents(timeMin,timeMax)  [googleCalendarService.ts:74-135]
   → fetchCalendarGoogleEvents lọc bỏ event đã có schedule liên kết và event mood_source=contract_event
     [calendar-queries.ts:487-489]; các event này editable:false, draggable:false  (:502-503)
```

**`contract_events` KHÔNG đi qua hàng đợi này.** Mốc hợp đồng đồng bộ Google bằng đường **trực tiếp, đồng bộ**: `syncContractEventsToGoogle` → gọi thẳng Google API rồi ghi `contract_events.google_sync_status / google_event_id / google_synced_at` (`lib/contract-event-google-sync.ts:295-302`, `:280-292`, `:100-120`), được gọi từ `app/actions/contract-mutations.ts:256, 270`. Tức là hệ thống có **2 cơ chế sync Google song song, độc lập**.

### (c) Kiểm tra trùng lịch (chồng lịch)

| Nơi | Hàm | Bảng | Đang được gọi? |
|---|---|---|---|
| `/calendar` | `checkEmployeeAvailability` — dựng khoảng thời gian rồi so giao nhau trong TS (`buildAvailabilityInterval` `:80-99`, `intervalsOverlap` `:137-142`) | `schedules` + `work_tasks` | ❌ **0 nơi gọi** — `components/calendar/drawers/event-form-drawer.tsx:11-12` chỉ import `createCalendarEvent/updateCalendarEvent/deleteCalendarEvent/updateCalendarTaskDetails` |
| task-assign (cũ) | `checkEmployeeAvailability` (bản khác: chỉ so `work_tasks.deadline = targetDate`) | `work_tasks` | ❌ 0 nơi gọi |
| **Chi tiết hợp đồng** (ngoài miền lịch) | `checkEmployeeTimeOverlap` / `checkEmployeeDeadlineOverlap` | `work_tasks` | ✅ `components/contracts/detail/event-task-modal.tsx:21` |

→ **Tạo/sửa lịch trên `/calendar` hiện KHÔNG kiểm tra chồng lịch.** Ràng buộc duy nhất khi tạo/sửa là `end_date >= event_date` (`calendar-mutations.ts:230-242`).

### (d) Từng khối dashboard → hàm nào → bảng nào

```
/dashboard  (force-dynamic, page.tsx:30)
 └─ <Suspense fallback=DashboardSkeleton>            ← TTFB ~0, shell KHÔNG await  (:343-348)
     └─ DashboardContent → await requireDashboardAccess()                          (:286)
         │
         ├─ DashboardRealtimeRefresh(visibility)   → subscribe realtime_signals     (:294)
         ├─ DashboardHeader(periodLabel)           → thuần text, "Tháng M/YYYY"     (:296, :289-290)
         ├─ QuickAccessGrid(role)                  → MODULES lọc canAccess (lg:hidden) (:298)
         │
         ├─ <Suspense> KpiSection                                                   (:300-302)
         │    getDashboardCritical → unstable_cache 120s tag dashboard-critical
         │      queryKpis → RPC dashboard_critical_kpis(m,y)      [dashboard.ts:412-437]
         │        ├ Doanh thu tháng   = Σ payments.amount (payment_date)
         │        │                    + Σ receipts.receipt_amount (contract_id IS NULL)
         │        ├ Hợp đồng mới      = COUNT contracts theo contract_date
         │        ├ Tổng công nợ      = Σ contracts.remaining_amount (>0, ≠da_huy)
         │        └ Hoàn thành        = COUNT contracts status='hoan_thanh' theo updated_at (AT TZ Asia/HCM)
         │      RPC lỗi → queryKpisFallback: LẶP LẠI đúng 4 công thức trên bằng TS  [:324-410]
         │
         ├─ <Suspense> RevenueSection  (canViewFinancials)                          (:306-308)
         │    RPC dashboard_revenue_chart(m,y,6) → Σ payments + Σ receipts theo tháng
         │    lỗi → queryRevenueChartFallback: cộng lại bằng TS                      [:439-494]
         │
         ├─ <Suspense> ServiceBreakdownSection  (canViewContracts)                  (:312-314)
         │    RPC dashboard_service_breakdown(m,y,canViewFinancials)
         │       COUNT(*) + Σ contracts.total_amount, GROUP BY service_type, theo contract_date
         │    lỗi → queryServiceBreakdownFallback bằng TS                            [:529-574]
         │
         ├─ <Suspense> EventsSection  (canViewCalendar || canViewContracts)         (:320-322)
         │    queryUpcomingEvents = 3 truy vấn thẳng bảng, 14 ngày tới, KHÔNG RPC   [:787-839]
         │      contract_events (canViewContracts)  [:634-675]
         │      schedules       (canViewCalendar; non-admin lọc employee_id) [:677-730]
         │      work_tasks      (canViewCalendar; non-admin lọc assigned_to) [:732-785]
         │    → dedupe theo "calendar:{contractId}:{ngày}", gom theo contract, cắt 6 [:801-838]
         │
         └─ <Suspense> PaymentsSection  (canViewFinancials)                         (:326-328)
              RPC finance_pending_collections(6)  ← ĐÂY LÀ KHỐI DUY NHẤT DÙNG NGUỒN TÀI CHÍNH CHUẨN
              "đến hạn" = có contract_events.giao_san_pham status hoan_thanh  [dashboard.ts:841-884]
```

### (e) Ai đọc `finance_period_ledger` — trả lời trực tiếp

**KHÔNG khối nào của dashboard đọc `finance_period_ledger`.** Grep `finance_period_ledger` trong `app/`, `lib/`, `components/` cho **0 kết quả** — nó chỉ được gọi từ trong SQL bởi `finance_month_summary` / `finance_pnl_by_month` / `finance_reports_snapshot` (xem `agent/system-map/01-tien.md` §5).

| Khối dashboard | Nguồn | Tự cộng lại? |
|---|---|---|
| KPI "Doanh thu tháng" | `dashboard_critical_kpis` | ✅ **TỰ CỘNG** `payments + receipts` (`20260512103000:27-44`) |
| KPI "Tổng công nợ" | `dashboard_critical_kpis` | ✅ tự cộng Σ `contracts.remaining_amount` (`:63-69`) — không dùng `finance_debt_stats` |
| KPI "Hợp đồng mới" / "Hoàn thành" | `dashboard_critical_kpis` | ✅ tự COUNT (`:70-101`) |
| Biểu đồ doanh thu 6 tháng | `dashboard_revenue_chart` | ✅ **TỰ CỘNG** (`20260510201000:24-40`) — không dùng `finance_pnl_by_month` |
| Phân bổ dịch vụ | `dashboard_service_breakdown` | ✅ tự cộng Σ `contracts.total_amount` — không dùng `finance_reports_snapshot.serviceDistribution` |
| Lịch sắp tới | 3 truy vấn thẳng bảng | ✅ tự gom trong TS |
| **Cần thu tiền** | `finance_pending_collections` | ❌ **đúng chuẩn**, dùng chung RPC với `/finance` |

**Lệch số cụ thể, có thể chứng minh:**

| Nhãn | `/dashboard` | `/finance` | Bằng chứng |
|---|---|---|---|
| "Doanh thu tháng" | **tiền đã thu**: Σ `payments.amount` theo `payment_date` + Σ `receipts` bán lẻ theo `receipt_date` | **giá trị HĐ ghi nhận**: `finance_month_summary.revenue` = `revenue_contract` (Σ `contracts.total_amount` theo `vn_date(work_date)`, fallback `contract_date`) + `revenue_retail` | dashboard `20260512103000:27-44` vs ledger `20260827130000_luong_cung_m5.sql:41-47`; `/finance` gọi `finance_month_summary` ở `app/actions/finance-dashboard-queries.ts:154` |
| số hợp đồng trong kỳ | theo `contract_date` (`20260512103000:70-85`) | ledger có **cả hai**: `contracts_shot` theo `work_date` (`20260827130000:41-47`) và `signed` theo `contract_date` (`:48-52`) | |
| biên ngày | nửa mở `>= start AND < end` | ledger dùng `BETWEEN p_start AND p_end` (bao gồm 2 đầu) | `20260827130000:23`, `:25`, `:39` |

Ngoài ra mỗi khối RPC còn có **một công thức thứ hai viết bằng TypeScript** làm fallback (`queryKpisFallback` `dashboard.ts:324-410`, `queryRevenueChartFallback` `:439-494`, `queryServiceBreakdownFallback` `:529-574`) — cùng ý định nhưng khác chi tiết: fallback dùng `vietnamTimestamptzWindow` (`+07:00` hard-code, `:65`, `:144-157`) trong khi RPC dùng `AT TIME ZONE 'Asia/Ho_Chi_Minh'` (`20260512103000:22-24`); các fallback này kích hoạt trên **mọi lỗi RPC**, kể cả lỗi tạm thời (`dashboard.ts:428-431`, `:520-523`, `:624-627`), không chỉ khi thiếu hàm.

### (f) Tầng cache dashboard & ai vô hiệu hóa

```
Request → getDashboardAccess (React.cache, 1 lần/request)          [dashboard.ts:886-888]
        → get*Section() → unstable_cache(fn, [key-vN], {revalidate, tags})
                            key gồm userId + employeeId + role → CACHE THEO TỪNG NGƯỜI DÙNG
                                                                    [:947-954, :1026-1035, …]

Vô hiệu hóa:
  ┌ SERVER (mutation) ──────────────────────────────────────────────────────┐
  │ invalidateContractPaths(id, {dashboard:true}) → invalidateDashboardCritical()
  │   revalidateTag("dashboard-critical") + revalidatePath("/dashboard")
  │   [lib/server-cache-invalidation.ts:25-28, :89]
  │   nơi gọi: contract-event-actions.ts:480,539,712,768 · contract-lifecycle.ts:129,167,281
  │            contract-mutations.ts:294,403 · payment-actions.ts:112,172
  │ ⇒ CHỈ tag "dashboard-critical". 4 tag còn lại KHÔNG BAO GIỜ được server xóa.
  └──────────────────────────────────────────────────────────────────────────┘
  ┌ CLIENT (realtime) ──────────────────────────────────────────────────────┐
  │ DashboardRealtimeRefresh: subscribe realtime_signals filter table_name in (...)
  │   chỉ đăng ký bảng mà user có quyền thấy   [dashboard-realtime-refresh.tsx:9-17, 33-37]
  │   debounce 800ms → invalidateDashboardCache(changedTables)  [:19, :45, :81-84]
  │ TABLE_TO_TAGS: contracts→critical+services+events · payments→critical+revenue+payments
  │   receipts→critical+revenue · payment_plans→critical+payments
  │   contract_events→events+payments · schedules→events · work_tasks→events
  │   [app/actions/dashboard-cache.ts:13-42]
  │ ⇒ ĐÂY là đường DUY NHẤT làm tươi revenue / services / events / payments.
  └──────────────────────────────────────────────────────────────────────────┘
  ┌ HẾT HẠN TỰ NHIÊN ───────────────────────────────────────────────────────┐
  │ critical 120s (:63) · 4 section còn lại 300s (:64)
  └──────────────────────────────────────────────────────────────────────────┘
```
`app/actions/receipt-actions.ts:348` và `app/actions/inventory-mutations.ts:465,535` gọi `revalidatePath("/dashboard")` **mà không** `revalidateTag` — xem §8.

### (g) Lưới 15 ô (Quick Access)

`MODULES` có đúng **15 phần tử** (`lib/navigation.ts:41-172`): contracts · calendar · crm · finance · printing · reports · productivity · services · inventory · dresses · employees · settings · moodie · salaries · goals.

`QuickAccessGrid` (`components/dashboard/quick-access-grid.tsx:32-35`): `MODULES.filter(mod => canAccess(role, mod.id))`, `canAccess = ROLE_PERMISSIONS[role].includes(id)` (`types/roles.ts:88-90`).

| Vai trò | Quyền (`types/roles.ts:7-47`) | Số ô hiện |
|---|---|---|
| admin / manager | 16 mục (gồm `dashboard`) | **15** (`dashboard` không có trong `MODULES`) |
| sale | dashboard, contracts, crm, calendar, dresses, moodie | 5 |
| media | dashboard, productivity, calendar, moodie | 3 |
| viewer | dashboard, moodie | 1 |

Hai chi tiết: (1) toàn bộ lưới nằm trong `<div className="lg:hidden">` (`:38`) → **chỉ hiện trên mobile/tablet**; (2) cờ `mobileOnly: true` của `salaries`/`goals` (`navigation.ts:160`, `:170`) **không được đọc ở đây** — không sao, vì cả lưới đã là mobile-only; sidebar desktop mới là nơi dùng cờ đó.

---

## 5. Nối với 6 miền cũ

| Miền | Lịch/Dashboard ĐỌC gì | Lịch/Dashboard GHI gì | Bằng chứng |
|---|---|---|---|
| **01 Tiền** | dashboard đọc `payments`, `receipts` (qua 2 RPC dashboard), `contracts.remaining_amount`, và `finance_pending_collections` | không ghi | `20260512103000:29-43`, `dashboard.ts:850` |
| **02 Hợp đồng** | lịch đọc `contract_events` (2 loại mốc) + `contracts.contract_code`; dashboard đọc `contract_events`, `contracts.total_amount/status/contract_date/updated_at` | **không ghi `contract_events`**; lịch **CÓ ghi `work_tasks`** (`deadline`/`start_date`/`status`/`assigned_to`) | `calendar-queries.ts:377` · `calendar-mutations.ts:192-195` · `calendar-task-actions.ts:162-165, 281-284` |
| **03 In–Kho–Váy** | `updateCalendarTaskDetails` phát hiện "toàn bộ task HĐ đã xong sau khi hoàn thành task hậu kỳ" và trả cờ `autoPrintTriggered` — nhưng **chỉ trả cờ, không tạo đơn in** | không | `calendar-task-actions.ts:288-309` |
| **04 CRM–Nhân sự** | `employees` (bộ lọc + RBAC); `work_tasks` chia sẻ với `/productivity` (2 action lịch đều `revalidatePath("/productivity")`) | `work_tasks` | `calendar-queries.ts:526-531` · `calendar-task-actions.ts:144-147` · `calendar-mutations.ts:200` |
| **05 Gallery–Moodie** | Moodie có tool đọc lịch (`get_calendar_agenda`, `get_upcoming_schedules`) | Moodie **ghi vào `google_sync_queue`** sau khi user duyệt — insert **không** kèm `idempotency_key` | `agent/system-map/05-gallery-moodie.md:218,237` · `app/actions/moodie-action-actions.ts:113-119` |
| **06 Nền tảng** | `withAuth` + admin client (RLS bị bỏ qua); realtime signal-only; AppShell `routeMode:"app"` cho `/calendar` | — | `calendar-queries.ts:437` · `hooks/use-realtime-signal.ts:33-42` · `agent/system-map/06-nen-tang.md:365` |

**Chỗ nối dễ vỡ nhất:** `work_tasks` bị 3 miền cùng ghi (hợp đồng · CRM/nhân sự · lịch) và không miền nào sở hữu bộ luật trạng thái. Miền lịch chấp nhận đúng 4 giá trị `["chua_lam","dang_lam","hoan_thanh","da_huy"]` (`calendar-task-actions.ts:43`), khớp `constants/work-statuses.ts` nhưng lệch với chuỗi `"Hoàn thành"` mà lương đang lọc (`agent/system-map/04-crm-nhan-su.md:577`).

---

## 6. Bất biến (kèm SQL kiểm — **KHÔNG chạy**)

| # | Phát biểu | Căn cứ | Câu SQL kiểm |
|---|---|---|---|
| **B1** | Mọi lối vào lịch đều qua `requireCalendarAccess` → employee `active`, chưa xóa, role có quyền `calendar`. Không action lịch nào tự viết lại logic role | `lib/calendar-auth.ts:27-58`; `scripts/verify-calendar.mjs:82-90` fail nếu file lịch chứa `ROLE_PERMISSIONS`/`normalizeRole` | — (kiểm tĩnh) |
| **B2** | Non-admin chỉ **SỬA** được `schedules`/`work_tasks` của chính mình | `lib/calendar-auth.ts:124-126`, `:157-159` | `SELECT s.id, s.employee_id FROM schedules s WHERE s.employee_id IS NULL;` (phải rỗng — cột NOT NULL) |
| **B3** | ⚠️ **BẤT BIẾN BỊ VI PHẠM:** "non-admin chỉ *thấy* lịch của mình" đúng ở đường fallback (`calendar-queries.ts:370-372`) nhưng **sai ở đường RPC** — `calendar_month_events` không lọc `employee_id` và client không lọc bù (`use-calendar-data.ts:152-155` chỉ lọc khi user tự chọn) | migr `20260714210000:91-93` (không có WHERE employee) | `SELECT count(*) AS schedules_khong_phai_cua_toi FROM schedules WHERE employee_id <> '<employee_id_cua_user_sale>' AND event_date >= date_trunc('month', now()) - interval '2 months';` — >0 nghĩa là user `sale`/`media` đang thấy đúng ngần đó dòng của người khác |
| **B4** | Xóa lịch có liên kết Google: **enqueue DELETE thành công rồi mới xóa local**; enqueue lỗi ⇒ ném lỗi, không xóa | `calendar-mutations.ts:365-380`; `scripts/verify-calendar.mjs:198-217` canh đúng thứ tự này | `SELECT q.id, q.schedule_id FROM google_sync_queue q LEFT JOIN schedules s ON s.id = q.schedule_id WHERE q.action <> 'DELETE' AND s.id IS NULL;` (job CREATE/UPDATE mồ côi — worker sẽ tự dọn ở `:146-150`) |
| **B5** | Ghi hàng đợi từ `/calendar` là idempotent theo `"<schedule_id>:<ACTION>"` | `calendar-mutations.ts:114-125`; unique index `20260714050000:4-6`; `verify-calendar.mjs:142-147` | `SELECT idempotency_key, count(*) FROM google_sync_queue WHERE idempotency_key IS NOT NULL GROUP BY 1 HAVING count(*) > 1;` (phải rỗng) · và `SELECT count(*) FROM google_sync_queue WHERE idempotency_key IS NULL;` — >0 là job do Moodie đẩy (`moodie-action-actions.ts:113-119`), **không** được unique index bảo vệ |
| **B6** | Không job nào kẹt vĩnh viễn: `attempts >= 3` bị worker bỏ qua (`.lt("attempts",3)`), `attempts >= 2` khi lỗi ⇒ `status='failed'` | `route.ts:218`, `:113` | `SELECT status, count(*), max(attempts) FROM google_sync_queue GROUP BY 1;` — nhiều dòng `pending` cũ ⇒ worker không được kích (không có cron, xem §8) |
| **B7** | Không bảng nghiệp vụ nào vào publication realtime; client chỉ nghe `realtime_signals` rồi refetch qua server action | `20260714040000_...sql:8-42`; dashboard `dashboard-realtime-refresh.tsx:105-119`; lịch `use-calendar-data.ts:111-124` | `SELECT tablename FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public';` — chỉ được có `realtime_signals` |
| **B8** | Cache dashboard **theo từng user**: `userId` nằm trong khóa `unstable_cache`, nên số của admin không rò sang `sale` | `dashboard.ts:913-917` + `:949-953` (và 4 section tương tự) | — (kiểm tĩnh) |
| **B9** | Con số tài chính bị **ẩn ở tầng dữ liệu**, không chỉ tầng UI: `queryRevenueChart` trả `[]` khi `!canViewFinancials` (`:511`), `queryPaymentReminders` trả `[]` (`:845`), `dashboard_service_breakdown` trả `revenue = 0` khi `p_can_view_financials=false` (`20260512103000:128-131`), `mapDashboardKpisFromAggregate` không gán tiền nếu không có quyền (`:300-307`) | như trên | — |
| **B10** | ⚠️ **BẤT BIẾN CHƯA ĐƯỢC PHÁT BIỂU Ở ĐÂU:** "Doanh thu tháng" trên `/dashboard` và trên `/finance` là **hai đại lượng khác nhau** (tiền thu vs giá trị ghi nhận). Không có script hay assert nào canh sự khác biệt này | §4e | `SELECT (SELECT COALESCE(SUM(amount),0) FROM payments WHERE deleted_at IS NULL AND payment_date >= date_trunc('month', CURRENT_DATE) AND payment_date < date_trunc('month', CURRENT_DATE) + interval '1 month') + (SELECT COALESCE(SUM(receipt_amount),0) FROM receipts WHERE deleted_at IS NULL AND contract_id IS NULL AND receipt_date >= date_trunc('month', CURRENT_DATE) AND receipt_date < date_trunc('month', CURRENT_DATE) + interval '1 month') AS dashboard_revenue, (SELECT revenue FROM finance_month_summary(EXTRACT(MONTH FROM CURRENT_DATE)::int, EXTRACT(YEAR FROM CURRENT_DATE)::int)) AS finance_revenue;` |
| **B11** | Route worker chạy bằng **service role** nhưng cổng vào chỉ cần "có đăng nhập" — không kiểm role | `route.ts:199-211` | — (kiểm tĩnh; so với `agent/system-map/06-nen-tang.md` §2.5 "API route đặc quyền") |

**Script canh sẵn có** (**không chạy** — cả hai đều mở kết nối tới Supabase production ở cuối file): `npm run verify:calendar` (`package.json:50` → `scripts/verify-calendar.mjs`, probe DB ở `:245-260`), `npm run verify:dashboard` (`package.json:51`). `verify-calendar.mjs:51-64` chỉ đọc 3 migration **cũ** (`20260512090000`, `20260513090000`, `20260513093000`) — **không** đọc bản mới nhất `20260714210000`, nên các assert về nội dung RPC của nó đang canh một phiên bản đã bị thay thế.

---

## 7. Mâu thuẫn tài liệu (vault ↔ code — **CODE THẮNG**)

| # | Vault nói | Code thực tế | Bằng chứng code |
|---|---|---|---|
| 1 | `vault/40-module/he-thong.md:13`: "`/dashboard` — **RSC thuần, không SWR, không realtime**" | Có realtime: `DashboardRealtimeRefresh` subscribe `postgres_changes` trên `realtime_signals` và gọi server action xóa cache | `app/(protected)/dashboard/page.tsx:294` · `components/dashboard/dashboard-realtime-refresh.tsx:104-125` |
| 2 | `he-thong.md:21`: "`/calendar` — RSC, `@dnd-kit`, **0 realtime**" | 3 subscription realtime + 4 SWR key | `hooks/use-calendar-data.ts:81-124` |
| 3 | `he-thong.md:22`: "`calendar_month_events` gom `contract_events` + `schedules` + **`employees`**" | Gom `schedules` + `contract_events` + **`work_tasks`**; **không** đụng `employees` (join là `contracts` + `customers`) | `20260714210000_contract_multi_day_schedule.sql:91`, `:119-121`, `:152-154` |
| 4 | `he-thong.md:14`: RPC dashboard gồm `…, contract_stats` | Dashboard không gọi `contract_stats` (đó là của `/contracts`, `app/actions/contract-queries.ts:123`); RPC thứ 4 mà dashboard thật sự gọi là `finance_pending_collections` | `lib/api/dashboard.ts:850` |
| 5 | `he-thong.md:15` + `vault/10-nen-tang/cache-va-realtime.md:82`: "Cache phía client ở IndexedDB (`lib/dashboard-idb-cache.ts`)" | File tồn tại nhưng **0 import** trong toàn repo → tầng cache này không chạy | grep `dashboard-idb-cache` → chỉ chính nó |
| 6 | `cache-va-realtime.md:28`: bảng "calendar · dashboard | **RSC thuần** | 0 realtime" | như #1, #2 | |
| 7 | `vault/50-luong/vong-doi-hop-dong.md:46`: "đồng bộ Google qua `google_sync_queue`" (nói về mốc HĐ) — và `agent/system-map/02-hop-dong.md:113` vẽ `syncContractEventsToGoogle → google_sync_queue` | `syncContractEventsToGoogle` gọi **thẳng** Google API rồi ghi `contract_events.google_sync_status`; **không** chạm `google_sync_queue`. Grep `google_sync_queue` trong `app/`+`lib/`+`components/` chỉ ra 3 dòng, cả 3 đều thuộc `calendar-mutations.ts` / `moodie-action-actions.ts` | `lib/contract-event-google-sync.ts:295-302`, `:280-292` · `app/actions/contract-mutations.ts:256, 270` |
| 8 | `vault/20-ban-do-code/bang-doc-ghi.md:299`: `schedules` có 7 nơi ghi, trong đó 3 là `schedule-actions.ts` | `schedule-actions.ts` **0 nơi gọi** → thực tế còn 4 nơi ghi sống | `app/actions/schedule-actions.ts:25-26` (comment tự thú) + grep |

---

## 8. Chưa xác minh

1. **RLS/policy thật của `schedules`.** `20260610120000_realtime_publication_crm_calendar_dashboard.sql:10` chỉ **nhắc tên** trong comment (`schedules_select: admin/manager HOẶC employee_id = mình`); grep `CREATE POLICY` trên `schedules` trong toàn bộ `supabase/migrations/` cho **0 kết quả**. Vì mọi truy cập đi qua service role (`withAuth` → admin client) nên không ảnh hưởng hành vi hiện tại, nhưng nội dung policy thật chưa xác minh được từ repo. Tương tự: không có `CREATE TABLE public.schedules` trong repo.
2. **`revalidatePath("/dashboard")` có xóa được entry `unstable_cache` không.** `app/actions/receipt-actions.ts:348` và `app/actions/inventory-mutations.ts:465,535` chỉ gọi `revalidatePath("/dashboard")` mà không `revalidateTag`. Next.js gắn "implicit tag" theo path cho `unstable_cache`, nên *có thể* vẫn xóa; nhưng trang là `force-dynamic` (`page.tsx:30`) và các loader nằm trong `React.cache` bọc `unstable_cache` — chưa kiểm chứng được bằng đọc mã. **Cần test thực tế**, không suy đoán.
3. **Có cron nào ngoài repo gọi `/api/calendar/sync-worker` không.** `vercel.json:1-3` chỉ có `{"regions":["sin1"]}`; không có `crons`. Route vẫn đọc `process.env.CRON_SECRET` (`route.ts:201`) → có thể ai đó đã cấu hình cron ở Vercel dashboard / dịch vụ ngoài. **Chưa xác minh.** Nếu không có: hàng đợi chỉ chảy khi có người mở `/calendar` **và** Google đã kết nối (`calendar-wrapper.tsx:60`).
4. **`GOOGLE_SYNC_STATUS`/CHECK constraint trên `contract_events.google_sync_status`.** `agent/system-map/02-hop-dong.md:282` dẫn vault nói có CHECK 6 giá trị; chưa tìm được migration tạo constraint đó.
5. **Bộ lọc `use-calendar-data.ts:149` là cố ý hay hồi quy.** Không có comment, ADR (`agent/DECISIONS.md`), hay test nào giải thích tại sao `contract_event`/`task` bị loại sau khi migration `20260714210000` vừa **thêm** nhánh `contract_event` vào RPC. Không có bằng chứng đủ để kết luận ý định — chỉ kết luận được **hành vi**.
6. **Số dòng thật của `google_sync_queue` / tỉ lệ `status='failed'`.** `vault/30-du-lieu/luoc-do-he-thong.md:25` ghi "0 dòng" tại thời điểm sinh vault (2026-08-07); trạng thái hiện tại chưa kiểm (không được chạm DB).
7. **`autoPrintTriggered`** (`calendar-task-actions.ts:307`) được UI dùng làm gì — chưa truy vết nơi tiêu thụ cờ này.
8. **Hiệu lực thực tế của lệch SWR key Google.** `useRealtimeSignal("google_sync_queue", { cacheKeys: [cacheKeys.calendarGoogle(month, year)] })` (`use-calendar-data.ts:121-124`) tạo key `calendar-google:M:Y`, trong khi SWR đăng ký `calendar-google:M:Y:{view}` (`:104`, `lib/swr.ts:97-98`); tùy chọn được tài liệu hóa là **"Exact SWR cache keys"** (`hooks/use-realtime.ts:36-37`) → tín hiệu này gần như chắc chắn không làm tươi được lịch Google. Đã đối chiếu mã nhưng **chưa chạy để xác nhận**.
