---
title: "Module Hệ thống (dashboard, lịch, báo cáo, cài đặt)"
tags: [module, he-thong]
cap-nhat: 2026-08-31
trang-thai: da-kiem-2026-08-31
doi-chieu: agent/system-map/06-nen-tang.md · 07-lich-dashboard.md · 09-baocao-caidat-admin.md · vault/30-du-lieu/than-ham/he-thong.md
---

# Module Hệ thống

Gom các màn hình xuyên suốt không thuộc một nghiệp vụ riêng.

## Dashboard

`/dashboard` — RSC, không SWR, **nhưng CÓ realtime**: `DashboardRealtimeRefresh` (`page.tsx:294`) subscribe `postgres_changes` trên bảng tín hiệu `realtime_signals` rồi gọi server action xoá cache (`components/dashboard/dashboard-realtime-refresh.tsx:104-125`). Component này dựng kênh **thủ công**, không bị `verify-realtime-client-surface.mjs` canh.
RPC: `dashboard_critical_kpis` (từ 05/09 #8 chỉ còn dùng `total_debt` + đếm HĐ — cột `current_revenue/previous_revenue` không ai đọc), **`finance_pnl_by_month`** (3 thẻ Doanh thu · Đã thu · Lãi/lỗ, #8), `dashboard_revenue_chart`, `dashboard_service_breakdown`, **`finance_pending_collections`** (card "Cần thu tiền" — `lib/api/dashboard.ts:850`). **Không** gọi `contract_stats`; hàm đó thuộc `/contracts` (`contract-queries.ts:123`).
`lib/dashboard-idb-cache.ts` **có file nhưng 0 import trong toàn repo** → tầng cache IndexedDB này không chạy. Đừng dựa vào nó khi lập luận về cache dashboard.

⚠️ TTFB `/dashboard` từng đo **5,69s**. Đã ghi nhận nhưng **cố ý chưa xử lý** (admin-only, ngoài phạm vi tối ưu LCP công khai — [[adr-index|ADR-012]]).

## Lịch

`/calendar` — RSC + `@dnd-kit`, **có realtime**: 3 `useRealtimeSignal` (`schedules`, `work_tasks`, `google_sync_queue`) + 4 khoá SWR (`hooks/use-calendar-data.ts:111-124`).
`calendar_month_events` gom `schedules` + `contract_events` + **`work_tasks`**; **không** đụng `employees` — join là `contracts` + `customers` (`20260714210000_contract_multi_day_schedule.sql:91,119-121,152-154`).
Google Calendar: hàng đợi `google_sync_queue` + `api/calendar/sync-worker` chỉ phục vụ **lịch/`schedules`** (`calendar-mutations.ts`, `moodie-action-actions.ts`). Mốc hợp đồng đi **thẳng** Google API rồi ghi `contract_events.google_sync_status`, **không qua hàng đợi** (`lib/contract-event-google-sync.ts:280-302`). Có lịch âm (`lib/lunar-calendar.ts`).

> ⚠️ CHƯA KIỂM (2026-08-31): `vercel.json` không khai `crons` — chưa rõ có cron ngoài repo gọi `/api/calendar/sync-worker` không. Nếu không có thì hàng đợi chỉ chảy khi có người mở `/calendar` **và** Google đã kết nối.

⚠️ **`CalendarWrapper` và `useCalendarData` gắn `"use no memo"`** — tắt React Compiler cho hai hàm này. Lý do: Sentry báo `"Rendered more hooks than during the previous render"` trên production (dev không tái hiện) dù đọc hết 23 file calendar không thấy vi phạm hooks nào ở source. React Compiler thêm `useMemoCache` và tái cấu trúc code path làm hook count đổi giữa các render.
**Đừng gỡ directive này.** Gặp lỗi hooks tương tự ở component >10 hooks với nhiều nhánh render → dùng cùng cách.

## Báo cáo

`/reports` — RPC `finance_reports_snapshot`, **chỉ một nút xuất**, ra `.xls` qua `lib/excel-xml.ts` (`reports-page-actions.tsx:21-24` → `reports-export.ts:288`). **Không xuất PDF**: `html2pdf.js` có đúng 1 call site trong toàn repo và nằm ở bản in hợp đồng (`components/contracts/print/print-contract-client.tsx:94,118`).
Verify: `npm run verify:reports`.

## Cài đặt

`/settings/studio` và `/settings/credit-cards` cần `canManageSettings` (admin/manager), wrapper `withAdmin` (`studio/page.tsx:22`, `credit-cards/page.tsx:29`).
**`/settings` thì KHÔNG cần** — chỉ đòi đăng nhập + có hồ sơ employee (`settings-queries.ts:186-192`); mọi vai vào được, trang tự ẩn khối admin (`settings-view.tsx:107,157`). Đừng giả định đây là trang admin-only.
Bảng `studio_info` (1 dòng) + `system_settings` (**RLS bật 0 policy** → chỉ server chạm).

> ⚠️ CHƯA KIỂM (2026-08-31): [[luoc-do-he-thong]] đếm `system_settings` 23 dòng, mã nguồn khai ~25 khoá — chưa đối chiếu khoá nào chưa từng được lưu.
`lib/settings-secrets.ts` xử lý khoá bí mật.

## Thông báo

`notifications` · `notification_preferences` · `notification_queue` · `push_subscriptions`
Web Push qua VAPID: `api/push/subscribe`, `api/push/send`, service worker `push-sw.js`.
⚠️ `push-sw.js` **phải nằm trong danh sách loại trừ của `proxy.ts`** — quên là PWA đã cài đóng băng ở bản cũ. → [[xac-thuc-phan-quyen]]

## Nhật ký kiểm toán

`/audit-logs` — bảng `audit_logs`, lớn thứ hai hệ thống. Ảnh chụp gần nhất **14.226 dòng** ([[luoc-do-he-thong]]; con số 10.798 ở bản cũ của trang này đã lỗi thời — lấy số từ nguồn sinh tự động). Ghi bằng `lib/audit.ts`.
Enum: `log_source_enum` (trigger · server_action · frontend · system), `log_type_enum` (EVENT_CHANGE · ASSIGNMENT · CONFLICT · ERROR · GENERAL), `severity_enum` (INFO · WARNING · ERROR · CRITICAL).

⚠️ **Bộ lọc UI đang mang enum của V1.** `components/settings/audit-log-list.tsx:47-53` chào 4 lựa chọn `AUTH · DATA · SYSTEM · ERROR` trong khi `log_type_enum` thật là 5 giá trị ở trên → 3/5 lựa chọn vô nghĩa và giá trị phổ biến nhất (`GENERAL`) không lọc được. Sửa bộ lọc phải lấy từ vựng ở `lib/audit.ts:15-20`.

## Kiểm tra toàn vẹn

`integrity-actions.ts` → RPC `run_integrity_scan`, `printing_integrity_report` → bảng `integrity_reports`.

## Admin nội bộ

`/admin/vendors` → [[nha-cung-cap]]
`/admin/backfill-dimensions` — công cụ nạp lại kích thước ảnh gallery. Có bộ script kèm: `scripts/backfill-*.mjs`, `backfill-blurhash.mjs`.

## Bảng

[[luoc-do-he-thong]] — `audit_logs` · `system_settings` · `studio_info` · `notifications` · `notification_preferences` · `notification_queue` · `push_subscriptions` · `login_attempts` · `realtime_signals` · `google_sync_queue` · `integrity_reports`

`realtime_signals` là bảng tín hiệu mỏng của cơ chế **Signal ≠ Data** → [[cache-va-realtime]].

## Liên quan

[[kien-truc-tong-quan]] · [[tich-hop-ngoai]] · [[bay-ui-react]]
