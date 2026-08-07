---
title: "Module Hệ thống (dashboard, lịch, báo cáo, cài đặt)"
tags: [module, he-thong]
cap-nhat: 2026-08-07
---

# Module Hệ thống

Gom các màn hình xuyên suốt không thuộc một nghiệp vụ riêng.

## Dashboard

`/dashboard` — **RSC thuần**, không SWR, không realtime.
RPC: `dashboard_critical_kpis`, `dashboard_revenue_chart`, `dashboard_service_breakdown`, `contract_stats`.
Cache phía client ở IndexedDB (`lib/dashboard-idb-cache.ts`).

⚠️ TTFB `/dashboard` từng đo **5,69s**. Đã ghi nhận nhưng **cố ý chưa xử lý** (admin-only, ngoài phạm vi tối ưu LCP công khai — [[adr-index|ADR-012]]).

## Lịch

`/calendar` — RSC, `@dnd-kit`, 0 realtime.
`calendar_month_events` gom `contract_events` + `schedules` + `employees`.
Đồng bộ Google Calendar qua hàng đợi `google_sync_queue` + `api/calendar/sync-worker`. Có lịch âm (`lib/lunar-calendar.ts`).

⚠️ **`CalendarWrapper` và `useCalendarData` gắn `"use no memo"`** — tắt React Compiler cho hai hàm này. Lý do: Sentry báo `"Rendered more hooks than during the previous render"` trên production (dev không tái hiện) dù đọc hết 23 file calendar không thấy vi phạm hooks nào ở source. React Compiler thêm `useMemoCache` và tái cấu trúc code path làm hook count đổi giữa các render.
**Đừng gỡ directive này.** Gặp lỗi hooks tương tự ở component >10 hooks với nhiều nhánh render → dùng cùng cách.

## Báo cáo

`/reports` — RPC `finance_reports_snapshot`, xuất Excel qua `lib/excel-xml.ts`, PDF qua `html2pdf.js`.
Verify: `npm run verify:reports`.

## Cài đặt

`/settings`, `/settings/studio`, `/settings/credit-cards` — cần `canManageSettings` (admin/manager), wrapper `withAdmin`.
Bảng `studio_info` (1 dòng) + `system_settings` (23 dòng, **RLS bật 0 policy** → chỉ server chạm).
`lib/settings-secrets.ts` xử lý khoá bí mật.

## Thông báo

`notifications` · `notification_preferences` · `notification_queue` · `push_subscriptions`
Web Push qua VAPID: `api/push/subscribe`, `api/push/send`, service worker `push-sw.js`.
⚠️ `push-sw.js` **phải nằm trong danh sách loại trừ của `proxy.ts`** — quên là PWA đã cài đóng băng ở bản cũ. → [[xac-thuc-phan-quyen]]

## Nhật ký kiểm toán

`/audit-logs` — bảng `audit_logs` **10.798 dòng**, lớn thứ hai hệ thống. Ghi bằng `lib/audit.ts`.
Enum: `log_source_enum` (trigger · server_action · frontend · system), `log_type_enum` (EVENT_CHANGE · ASSIGNMENT · CONFLICT · ERROR · GENERAL), `severity_enum` (INFO · WARNING · ERROR · CRITICAL).

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
