# 🔍 PWA Deep Audit — Mood Studio
**Date:** 2026-03-24  
**App:** Next.js 16 + Supabase  
**Auditor:** Antigravity

---

## Tổng quan: PWA Score 1/10 ❌

App hiện tại **KHÔNG installable**, **KHÔNG offline-capable**. Chỉ có file manifest.json nhưng không connected.

---

## 1. MANIFEST AUDIT

| Field | Status | Giá trị |
|-------|--------|---------|
| name | ✅ | "Mood Studio" |
| short_name | ✅ | "Mood Studio" |
| description | ✅ | "Wedding Studio Management..." |
| start_url | ✅ | "/dashboard" |
| display | ✅ | "standalone" |
| background_color | ✅ | "#f8f9fa" |
| theme_color | ⚠️ | "#2E5C46" — **MISMATCH** với layout.tsx (#8B5E3C) |
| orientation | ✅ | "portrait-primary" |
| icons 192 | ❌ | File ref exists BUT **/icons/ folder KHÔNG TỒN TẠI** |
| icons 512 | ❌ | Same — file không tồn tại |
| scope | ❌ THIẾU | Không có `"scope": "/"` |
| screenshots | ❌ THIẾU | Cần cho "richer install UI" trên Android |
| shortcuts | ❌ THIẾU | Quick actions (tạo HĐ, xem lịch...) |
| categories | ❌ THIẾU | `["business", "productivity"]` |
| `<link rel="manifest">` | ❌ CRITICAL | **KHÔNG CÓ** trong layout.tsx → browser không đọc manifest |

**Verdict: ❌ FAIL** — Manifest tồn tại nhưng không connected, icons thiếu

---

## 2. SERVICE WORKER AUDIT

| Check | Status |
|-------|--------|
| sw.js / sw.ts file | ❌ KHÔNG CÓ |
| next-pwa package | ❌ KHÔNG CÓ |
| @serwist/next package | ❌ KHÔNG CÓ |
| workbox package | ❌ KHÔNG CÓ |
| SW registration code | ❌ KHÔNG CÓ |
| Caching strategy | ❌ N/A |
| Precache config | ❌ N/A |
| Runtime cache | ❌ N/A |
| Offline fallback | ❌ N/A |
| Background sync | ❌ N/A |

**Verdict: ❌ FAIL** — KHÔNG CÓ Service Worker → app không cache, không offline

---

## 3. OFFLINE CAPABILITY

| Check | Status |
|-------|--------|
| Offline usable | ❌ Blank page / browser error |
| Cached data | ❌ Không có cache layer |
| Form persistence | ❌ Data mất nếu mất mạng |
| Offline indicator | ❌ Không có UI hiệu báo mất mạng |

**Verdict: ❌ FAIL** — 0% offline capability

---

## 4. INSTALLABILITY CHECK

| Check | Status | Chi tiết |
|-------|--------|----------|
| manifest linked | ❌ | Không link trong `<head>` |
| Icons exist | ❌ | /public/icons/ không tồn tại |
| Service worker | ❌ | Required for installability |
| HTTPS | ✅ | Vercel auto-HTTPS |
| beforeinstallprompt | ❌ | Không handle event |
| Install button/banner | ❌ | Không có UI |
| apple-mobile-web-app-capable | ❌ | Thiếu iOS meta tag |
| apple-touch-icon | ❌ | Thiếu |
| apple-mobile-web-app-status-bar-style | ❌ | Thiếu |

**Verdict: ❌ FAIL** — App KHÔNG installable trên bất kỳ platform nào

---

## 5. PUSH NOTIFICATIONS

| Check | Status |
|-------|--------|
| Web Push API | ❌ Chưa setup |
| Supabase Edge Function cho push | ❌ N/A |
| Permission request UX | ❌ N/A |
| Notification types | ❌ N/A |

**Verdict: ❌ N/A** — Chưa implement (P3 — làm sau)

---

## 6. PERFORMANCE (PWA-specific)

| Check | Status | Chi tiết |
|-------|--------|----------|
| Font loading | ✅ | `display: "swap"`, local font InterVariable.woff2 |
| next/image | ✅ | Đã dùng across app |
| viewport meta | ✅ | width=device-width, initialScale=1, maximumScale=1 |
| themeColor | ⚠️ | #8B5E3C (layout) ≠ #2E5C46 (manifest) |

**Verdict: ⚠️ PARTIAL** — Performance basics OK, nhưng theme_color mismatch

---

## 7. MOBILE UX (PWA context)

| Check | Status | Chi tiết |
|-------|--------|----------|
| viewport meta | ✅ | Đầy đủ |
| maximumScale=1 | ✅ | Chặn pinch zoom (tốt cho app-like UX) |
| safe-area-inset | ❌ | Không có `env(safe-area-inset-*)` trong CSS |
| -webkit-tap-highlight | ❌ | Không set (mặc định blue flash) |
| Pull-to-refresh | ❌ | Không control (browser default) |
| Orientation lock | ✅ | portrait-primary trong manifest |
| Status bar color | ⚠️ | Mismatch giữa layout vs manifest |

**Verdict: ⚠️ PARTIAL** — viewport OK, thiếu safe-area + tap-highlight

---

## 8. SECURITY (PWA requirements)

| Check | Status | Chi tiết |
|-------|--------|----------|
| HTTPS | ✅ | Vercel auto-SSL |
| CSP headers | ❌ | Không có Content-Security-Policy |
| SW scope | ❌ | N/A (no SW) |

**Verdict: ⚠️ PARTIAL** — HTTPS OK, CSP thiếu

---

## 📊 TỔNG KẾT THEO PRIORITY

### P0 — CRITICAL (App không installable)
| # | Issue | File cần sửa |
|---|-------|-------------|
| P0-1 | Thêm `<link rel="manifest" href="/manifest.json">` | `app/layout.tsx` metadata |
| P0-2 | Tạo icon files (192x192 + 512x512) | `public/icons/` |
| P0-3 | Fix theme_color mismatch (#8B5E3C vs #2E5C46) | `manifest.json` + `layout.tsx` |
| P0-4 | Thêm `scope: "/"` vào manifest | `manifest.json` |

### P1 — HIGH (Offline không hoạt động)
| # | Issue | File cần sửa |
|---|-------|-------------|
| P1-1 | Cài `@serwist/next` (recommended cho Next.js 16) | `package.json` |
| P1-2 | Tạo SW với caching strategy | `app/sw.ts` + `next.config.ts` |
| P1-3 | Offline fallback page | `app/offline/page.tsx` |
| P1-4 | Runtime cache cho API responses | SW config |

### P2 — MEDIUM (Missing meta tags + UX)
| # | Issue | File cần sửa |
|---|-------|-------------|
| P2-1 | Thêm apple-mobile-web-app meta tags | `app/layout.tsx` |
| P2-2 | Thêm apple-touch-icon | `app/layout.tsx` + `public/` |
| P2-3 | CSS safe-area-inset cho notch | `app/globals.css` |
| P2-4 | `-webkit-tap-highlight-color: transparent` | `app/globals.css` |
| P2-5 | Thêm icon sizes (72, 96, 128, 144, 152, 384) | `public/icons/` |
| P2-6 | Thêm screenshots cho richer install UI | `manifest.json` + `public/screenshots/` |
| P2-7 | Thêm shortcuts (tạo HĐ, xem lịch, dashboard) | `manifest.json` |

### P3 — LOW (Nice-to-have)
| # | Issue | File cần sửa |
|---|-------|-------------|
| P3-1 | beforeinstallprompt handling + Install button | Component mới |
| P3-2 | Offline indicator UI (banner "Bạn đang offline") | Component mới |
| P3-3 | Background sync cho mutations | SW config |
| P3-4 | Push notifications (task deadline, payment due) | Supabase Edge Function |
| P3-5 | CSP headers | `next.config.ts` |
| P3-6 | Categories trong manifest | `manifest.json` |

---

## 🛠️ ĐỀ XUẤT FIX PLAN (4 Phases)

### Phase 01: Installable (P0) — ~30 phút
- Link manifest → layout.tsx
- Generate icons (192, 512)
- Fix theme_color, add scope
- **Result:** App khả năng install trên Android

### Phase 02: Offline-Ready (P1) — ~1-2 giờ
- Cài @serwist/next
- Config SW: precache static + runtime cache API
- Offline fallback page
- **Result:** App hoạt động offline cơ bản

### Phase 03: iOS Polish (P2) — ~30 phút
- Apple meta tags
- Safe-area CSS
- Tap highlight fix
- Extra icon sizes
- Manifest shortcuts
- **Result:** PWA hoạt động trên cả iOS + Android

### Phase 04: Advanced (P3) — ~2-3 giờ
- Install button UX
- Offline indicator
- Background sync
- Push notifications
- **Result:** PWA full-featured
