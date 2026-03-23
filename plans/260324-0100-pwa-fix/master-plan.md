# PWA Fix Plan — Mood Studio
**Created:** 2026-03-24  
**Audit:** [audit_pwa_deep_20260324.md](file:///C:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/docs/reports/audit_pwa_deep_20260324.md)  
**Target:** PWA Score 1/10 → 8/10

---

## Overview

Mood Studio hiện có manifest.json nhưng KHÔNG connected, KHÔNG có Service Worker, KHÔNG installable.
Plan này tập trung: installable → offline-ready → iOS compatible. **KHÔNG** làm push notifications.

## Tech Stack Addition
- `@serwist/next` — Service Worker cho Next.js 16
- **Không thêm package nào khác**

## DO NOT TOUCH
- Business logic (actions, mutations, lifecycle)
- UI components hiện tại
- Database schema
- Supabase config

---

## Phases

| Phase | Name | Tasks | Priority |
|-------|------|-------|----------|
| 01 | Installable | 6 | P0 CRITICAL |
| 02 | Service Worker + Offline | 7 | P1 HIGH |
| 03 | iOS + Mobile UX Polish | 6 | P2 MEDIUM |
| 04 | Install UX + Offline Indicator | 5 | P2-P3 |

---

## Phase 01: Installable (P0 — CRITICAL)

> App phải installable trên Chrome Android sau phase này.

### Pre-flight
- [ ] Verify logo.png exists tại `/public/logo.png` ✅ (đã confirm)

### Tasks

#### 1A: Generate PWA Icons
- Dùng `logo.png` làm base, generate:
  - `/public/icons/icon-192x192.png`
  - `/public/icons/icon-512x512.png`
- Tool: `generate_image` hoặc sharp CLI
- **Lưu ý:** maskable icon cần safe zone (padding 20%)

#### 1B: Update manifest.json
```json
{
  "name": "Mood Studio",
  "short_name": "Mood Studio",
  "description": "Wedding Studio Management - Quản lý studio cưới",
  "start_url": "/dashboard",
  "scope": "/",
  "display": "standalone",
  "background_color": "#f8f9fa",
  "theme_color": "#8B5E3C",
  "orientation": "portrait-primary",
  "categories": ["business", "productivity"],
  "icons": [
    { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```
**Thay đổi:**
- theme_color: `#2E5C46` → `#8B5E3C` (match layout.tsx)
- Thêm `scope: "/"`
- Thêm `categories`
- Tách `purpose: "any maskable"` → 2 icon riêng (best practice)

#### 1C: Link manifest trong layout.tsx metadata
```typescript
export const metadata: Metadata = {
  title: "Mood Studio — Quản lý studio cưới",
  description: "Hệ thống quản lý studio cưới chuyên nghiệp",
  icons: { icon: "/logo.png", apple: "/icons/icon-192x192.png" },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mood Studio",
  },
};
```

#### 1D: Fix theme_color thống nhất
- `manifest.json`: `#8B5E3C` ← chọn màu brand (warm earth tone)
- `layout.tsx` viewport: `#8B5E3C` ← giữ nguyên (đã đúng)

### Verify Phase 01
- [ ] `npm run dev` → no errors
- [ ] Chrome DevTools → Application → Manifest → hiện đầy đủ info
- [ ] Icons load OK (192, 512)
- [ ] Chrome mobile: "Add to Home Screen" option xuất hiện

### Rollback
- Revert layout.tsx metadata
- Delete /public/icons/
- Revert manifest.json

---

## Phase 02: Service Worker + Offline (P1 — HIGH)

> App hoạt động offline cơ bản sau phase này.

### Pre-flight
- [ ] Phase 01 verified ✅

### Tasks

#### 2A: Install @serwist/next
```bash
npm install @serwist/next @serwist/sw
```

#### 2B: Tạo SW file — `app/sw.ts`
```typescript
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
```

#### 2C: Config next.config — wrap withSerwist
```typescript
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);
```

#### 2D: Tạo offline fallback page
- File: `app/offline/page.tsx`
- UI: logo + "Bạn đang offline" + retry button
- Style: sử dụng SSOT tokens

#### 2E: Thêm `public/sw.js` vào .gitignore
```
# Service Worker (generated)
public/sw.js
public/sw.js.map
public/swe-worker-*.js
```

#### 2F: tsconfig — thêm worker lib
```json
{
  "compilerOptions": {
    "lib": ["ESNext", "DOM", "DOM.Iterable", "WebWorker"]
  }
}
```

#### 2G: SW registration verification
- @serwist/next auto-register — không cần code thủ công

### Verify Phase 02
- [ ] `npm run build` → SW generated tại public/sw.js
- [ ] Chrome DevTools → Application → Service Workers → registered
- [ ] Network tab → toggle Offline → navigate → offline page hiện
- [ ] Online lại → app hoạt động bình thường

### Rollback
- `npm uninstall @serwist/next @serwist/sw`
- Delete `app/sw.ts`, `app/offline/page.tsx`
- Revert `next.config.ts`
- Remove `public/sw.js*`

---

## Phase 03: iOS + Mobile UX Polish (P2 — MEDIUM)

> PWA hoạt động tốt trên iOS Safari + Android Chrome sau phase này.

### Pre-flight
- [ ] Phase 02 verified ✅

### Tasks

#### 3A: Apple meta tags (đã handle ở 1C via metadata API)
- `appleWebApp.capable: true` → `<meta name="apple-mobile-web-app-capable">`
- `appleWebApp.statusBarStyle: "black-translucent"` → status bar
- `icons.apple` → `<link rel="apple-touch-icon">`

#### 3B: CSS Safe Area + Tap Highlight
File: `app/globals.css` — thêm vào `:root`
```css
/* PWA: Safe area for notch devices */
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
  -webkit-tap-highlight-color: transparent;
}

/* PWA standalone mode adjustments */
@media (display-mode: standalone) {
  body {
    /* Prevent overscroll bounce in standalone */
    overscroll-behavior-y: contain;
  }
}
```

#### 3C: Manifest Shortcuts
```json
"shortcuts": [
  {
    "name": "Tạo hợp đồng",
    "short_name": "Tạo HĐ",
    "url": "/contracts/create",
    "icons": [{ "src": "/icons/icon-96x96.png", "sizes": "96x96" }]
  },
  {
    "name": "Dashboard",
    "short_name": "Tổng quan",
    "url": "/dashboard",
    "icons": [{ "src": "/icons/icon-96x96.png", "sizes": "96x96" }]
  },
  {
    "name": "Lịch công việc",
    "short_name": "Lịch",
    "url": "/calendar",
    "icons": [{ "src": "/icons/icon-96x96.png", "sizes": "96x96" }]
  }
]
```

#### 3D: Extra icon size (96x96 cho shortcuts)
- Generate `/public/icons/icon-96x96.png`

#### 3E: viewport-fit=cover cho notch
```typescript
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#8B5E3C",
  viewportFit: "cover",  // ← thêm mới
};
```

### Verify Phase 03
- [ ] iOS Safari: "Add to Home Screen" works
- [ ] iOS standalone: no content behind notch
- [ ] Android: shortcuts xuất hiện khi long-press icon
- [ ] Tap elements: no blue flash highlight

### Rollback
- Revert globals.css changes
- Revert manifest.json shortcuts
- Revert viewport config

---

## Phase 04: Install UX + Offline Indicator (P2-P3)

> Premium install experience + user biết khi nào offline.

### Pre-flight
- [ ] Phase 03 verified ✅

### Tasks

#### 4A: useOnlineStatus hook
File: `hooks/useOnlineStatus.ts`
```typescript
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const set = (e: Event) => setIsOnline(e.type === "online");
    window.addEventListener("online", set);
    window.addEventListener("offline", set);
    return () => { /* cleanup */ };
  }, []);
  return isOnline;
}
```

#### 4B: OfflineIndicator component
File: `components/ui/offline-indicator.tsx`
- Sticky toast/banner top: "📡 Bạn đang offline — dữ liệu có thể không cập nhật"
- Auto-hide khi online lại
- Style: SSOT tokens, subtle warning bar

#### 4C: Mount OfflineIndicator trong layout
- Thêm `<OfflineIndicator />` trong RootLayout, trước `{children}`

#### 4D: PWA Install Prompt (optional)
File: `components/ui/pwa-install-prompt.tsx`
- beforeinstallprompt event capture
- Show banner sau 3 lần visit (localStorage counter)
- "Cài Mood Studio cho trải nghiệm tốt hơn" + Install button
- Dismiss → don't show for 7 days

#### 4E: SW Update Notification
- Detect new SW version → toast "Có bản cập nhật mới, tải lại trang?"
- Auto-reload hoặc user-triggered

### Verify Phase 04
- [ ] Tắt WiFi → banner "offline" hiện
- [ ] Bật WiFi lại → banner ẩn
- [ ] Chrome → install prompt works (nếu có)
- [ ] Toàn bộ app vẫn hoạt động bình thường

### Rollback
- Delete hooks/useOnlineStatus.ts
- Delete components/ui/offline-indicator.tsx
- Delete components/ui/pwa-install-prompt.tsx
- Revert layout.tsx

---

## Summary

| Phase | Files mới | Files sửa | Packages |
|-------|-----------|-----------|----------|
| 01 | icons/ (4 files) | manifest.json, layout.tsx | — |
| 02 | app/sw.ts, app/offline/page.tsx | next.config.ts, tsconfig.json, .gitignore | @serwist/next, @serwist/sw |
| 03 | icons/icon-96x96.png | globals.css, manifest.json, layout.tsx | — |
| 04 | 3 component files | layout.tsx | — |

**Total:** ~10 new files, ~6 modified files, 2 npm packages
