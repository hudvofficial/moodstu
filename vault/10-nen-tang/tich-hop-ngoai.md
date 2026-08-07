---
title: "Tích hợp ngoài"
tags: [nen-tang, tich-hop]
cap-nhat: 2026-08-07
---

# Tích hợp ngoài

Danh sách rút từ code thật (`grep` endpoint + biến môi trường), không phải trí nhớ.

## Google — ba dịch vụ, một OAuth

| Dịch vụ | Endpoint | Dùng ở |
|---|---|---|
| OAuth 2.0 | `accounts.google.com/o/oauth2/v2/auth` · `oauth2.googleapis.com/token` | `app/api/auth/google/*`, `lib/google-auth.ts`, `lib/google-drive-oauth.ts` |
| Drive v3 | `www.googleapis.com/drive/v3/files` · `drive.google.com/thumbnail` | `lib/google-drive.ts`, `gallery-drive-actions.ts` |
| Calendar v3 | `www.googleapis.com/calendar/v3/...` | `lib/googleCalendarService.ts`, `lib/calendar-auth.ts`, `api/calendar/sync-worker` |

Scope: `.../auth/drive`, `.../auth/calendar`.
Biến: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_DRIVE_API_KEY`.

### ⚠️ Bẫy đã cháy: dev và prod là **hai Google Cloud project khác nhau**
Nhưng cùng trỏ về **một Supabase DB**. Token của bên này ghi đè token của bên kia trong DB → triệu chứng "Drive API lúc chạy lúc không". Gặp lỗi Drive chập chờn → **kiểm project OAuth trước khi debug code**.

### Ảnh gallery serve thẳng từ Google
`lh3.googleusercontent.com/d/<fileId>=sN` (N = cỡ) và `drive.google.com/thumbnail?id=..&sz=sN`.
`=s0` = ảnh gốc · `=s600` = ô lưới · `=s2048` = xem trước.
Ảnh gốc **lộ được** qua URL — đã chấp nhận, xem [[bao-mat-du-lieu-rls]] và [[adr-index|ADR-011]].

## Gemini — cho Moodie

`generativelanguage.googleapis.com/v1beta/models`, SDK `@google/genai`.
Biến: `MOODIE_GEMINI_API_KEY`, `MOODIE_GEMINI_MODEL`.
Cấu hình provider lưu trong DB, sửa qua `api/moodie/provider/config`. → [[moodie-ai]]

## Brave Search — cho Moodie

`api.search.brave.com/res/v1`. Có hạn mức: bảng `moodie_brave_usage_daily` + `moodie_brave_audit_events` ghi lượt dùng.

## Sentry

`@sentry/nextjs`. Ba điểm khởi tạo: `instrumentation-client.ts` (**client — không có `sentry.client.config.ts`**), `sentry.server.config.ts`, `sentry.edge.config.ts`.
Biến: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`.

**Nhiễu đã lọc:** lỗi `Rejected` từ `ServiceWorkerContainer.register` — do `next-pwa` gọi `workbox.register()` không `.catch()`, in-app browser từ chối đăng ký SW. Không phải bug app. Lọc bằng regex neo hai đầu `/^Rejected$/` (chuỗi trần `"Rejected"` sẽ nuốt nhầm lỗi khác vì `ignoreErrors` match theo substring).

## Web Push

`web-push` + VAPID. Biến: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`.
Route: `api/push/subscribe`, `api/push/send`. Bảng `push_subscriptions`, `notification_queue`, `notification_preferences`.
Service worker riêng `push-sw.js` — **phải nằm trong danh sách loại trừ của `proxy.ts`** ([[xac-thuc-phan-quyen]]).

## Supabase

Postgres + Auth + Realtime + Storage, region **Singapore**.
Biến: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_POOLER_URL`, `SUPABASE_DB_PASSWORD`.
Kết nối trực tiếp qua pooler + CA ghim (`scripts/supabase-pooler-ca.crt`) — công cụ query nhanh: `node scripts/db-q.mjs "SELECT …"`.

## Vercel

Deploy tự động khi push `main`. `vercel.json` ép `regions: ["sin1"]`.

⚠️ Từng chậm đồng loạt ~200ms+ vì deploy ở `iad1` trong khi DB ở Singapore. **Query chậm đều tay trên mọi endpoint → kiểm region trước khi tối ưu SQL.** Số đo local luôn xấu hơn prod.

Speed Insights: `@vercel/speed-insights`.

## Biến môi trường: bẫy build-time

`NEXT_PUBLIC_*` được **nướng vào lúc build**. Đặt trong `.env.local` chỉ ảnh hưởng dev; prod phải `vercel env add` + redeploy mới có tác dụng. Ví dụ đang có: `NEXT_PUBLIC_RPC_V3`.

## Không liên quan tới dự án này

**Mood Pro** (panel Photoshop + bridge ComfyUI) là **dự án riêng biệt**. Đừng kéo ngữ cảnh của nó sang mood-studio.
