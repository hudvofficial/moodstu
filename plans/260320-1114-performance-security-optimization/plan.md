# Plan: Performance & Security Optimization (V1 + mcoffe → V2)
Created: 2026-03-20 11:14
Updated: 2026-03-20 11:22
Status: 🟡 Pending Approval

## Overview
Tổng hợp tinh hoa từ cả 2 project V1 (0Moodstudio) + mcoffe → V2.
Mục tiêu: V2 >= V1 + mcoffe. V2 thay thế V1 hoàn toàn trên production.

## Nguồn tham khảo
- V1: `C:\Users\Admin\Desktop\Ai\0Moodstudio\webapp\next.config.ts`
- mcoffe: `C:\Users\Admin\Desktop\Ai\mcoffe\next.config.ts`
- V2 hiện tại: `next.config.ts` (17 lines — gần như trống)

## Checklist FINAL (14/14 mục)

| # | Tính năng | Nguồn | V2 hiện tại | Phase |
|---|---|---|---|---|
| 1 | WebP + AVIF tự động | V1 | ❌ | P01 |
| 2 | Image cache 1 năm | V1 | ❌ | P01 |
| 3 | Responsive image sizes | V1 | ❌ | P01 |
| 4 | Supabase Storage remote pattern | V1 + mcoffe | ❌ | P01 |
| 5 | Gzip/Brotli compression | V1 + mcoffe | ❌ | P01 |
| 6 | Tree-shake packages | V1 + mcoffe | ❌ | P01 |
| 7 | Browser cache headers | V1 | ❌ | P01 |
| 8 | CSP Security headers | V1 | ❌ | P01 |
| 9 | staleTimes router cache | V1 | ❌ | P01 |
| 10 | Bundle Analyzer | V1 + mcoffe | ❌ | P01 |
| 11 | App Version injection | mcoffe | ❌ | P01 |
| 12 | `<img>` → `<Image />` | V1 | ❌ (3 files raw) | P02 |
| 13 | PWA + Service Worker + Offline | V1 + mcoffe | ❌ | P03 |
| 14 | Sentry monitoring (bê V1) | V1 | ❌ | P04 |

## Phases

| Phase | Name | Status | Install? |
|-------|------|--------|----------|
| 01 | next.config.ts full upgrade | ⬜ Pending | ✅ `@next/bundle-analyzer` |
| 02 | `<img>` → `<Image />` | ⬜ Pending | Không |
| 03 | PWA + Service Worker | ⬜ Pending | ✅ `@ducanh2912/next-pwa` |
| 04 | Sentry monitoring (bê V1) | ⬜ Pending | ✅ `@sentry/nextjs` |
| 05 | Build verify | ⬜ Pending | Không |

---

## Phase 01: next.config.ts full upgrade
**File:** `next.config.ts`
**Install:** `@next/bundle-analyzer`

### Từ V1 (proven production):
- `images.formats: ["image/webp", "image/avif"]`
- `images.minimumCacheTTL: 31536000` (1 năm)
- `images.deviceSizes + imageSizes` (responsive)
- `images.remotePatterns`: `*.supabase.co`, `lh3.googleusercontent.com`, `images.unsplash.com`
- `compress: true` (Gzip/Brotli)
- `poweredByHeader: false`
- `skipTrailingSlashRedirect: true`
- `reactStrictMode: true`
- `experimental.staleTimes: { dynamic: 180, static: 600 }`
- `experimental.optimizePackageImports` (tree-shake)
- `headers()` → cache headers (static 1y, fonts 1y, images 1w, HTML swr)
- CSP header → XSS protection, frame deny, nosniff

### Từ mcoffe (proven):
- `@next/bundle-analyzer` → `ANALYZE=true npm run build`
- `env.NEXT_PUBLIC_APP_VERSION` → inject version từ package.json
- `env.NEXT_PUBLIC_BUILD_DATE` → inject build timestamp

### V2 giữ nguyên:
- `reactCompiler: true` (V1/mcoffe chưa có)

---

## Phase 02: `<img>` → `<Image />`
**Install:** Không

**2 files sửa:**
1. `components/contracts/detail/costumes-block.tsx` (line 55)
2. `components/contracts/detail/inventory-reservation-form.tsx` (line 173)

**KHÔNG SỬA:** `components/contracts/print/contract-template.tsx` → print template giữ raw `<img>`

---

## Phase 03: PWA + Service Worker + Offline
**Install:** `@ducanh2912/next-pwa`
**Tham khảo:** V1 lines 162-240 + mcoffe lines 42-84

### Config (best-of-both):
- `dest: "public"`, `disable: isDev`
- `register: true`, `cacheOnFrontEndNav: true`
- `aggressiveFrontEndNavCaching: true` (mcoffe)
- `reloadOnOnline: true` (mcoffe)
- `fallbacks: { document: "/offline" }`

### Runtime caching (V1's granular — tốt hơn mcoffe):
- 🔴 Supabase Auth → `NetworkOnly` (NEVER cache)
- 🟢 HTML Navigation → `StaleWhileRevalidate`
- 🟢 Google Fonts → `CacheFirst` (1 năm)
- 🟡 Supabase Storage → `StaleWhileRevalidate` (30 ngày)
- 🟡 Supabase REST API → `NetworkFirst` (5s timeout)
- 🟢 Static assets → `CacheFirst` (30 ngày)

### Tạo mới:
- `app/offline/page.tsx` → fallback UI
- `public/manifest.json` → PWA manifest

---

## Phase 04: Sentry monitoring (bê nguyên V1)
**Install:** `@sentry/nextjs`
**Chiến lược:** Copy 100% từ V1, dùng chung Sentry project (V2 thay thế V1)

### Files copy nguyên từ V1:
1. `sentry.client.config.ts` → noise filter (ResizeObserver, hydration, network)
2. `sentry.server.config.ts` → expected error filter (NEXT_REDIRECT, auth)
3. `sentry.edge.config.ts` → lightweight edge config
4. `instrumentation.ts` → Next.js runtime hook
5. `app/global-error.tsx` → crash fallback UI

### Tích hợp vào next.config.ts:
```typescript
import { withSentryConfig } from "@sentry/nextjs";

export default withPWA(
  withAnalyzer(
    withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      sourcemaps: { deleteSourcemapsAfterUpload: true },
      tunnelRoute: "/monitoring",
      bundleSizeOptimizations: {
        excludeDebugStatements: true,
        excludeReplayIframe: true,
        excludeReplayShadowDom: true,
      },
    })
  )
);
```

### Env vars (copy từ V1 .env.local):
- `SENTRY_ORG` → org name
- `SENTRY_PROJECT` → project name
- `NEXT_PUBLIC_SENTRY_DSN` → DSN URL
- `SENTRY_AUTH_TOKEN` → deploy token

---

## Phase 05: Build verify
- `npm run build` → exit code 0
- `ANALYZE=true npm run build` → verify bundle analyzer
- Kill port → `npm run dev` → verify runtime

---

## V2 vs V1 vs mcoffe — Final comparison

| Feature | V1 | mcoffe | V2 (after this plan) |
|---|---|---|---|
| React Compiler | ❌ | ❌ | ✅ |
| Turbopack | ❌ | ❌ | ✅ |
| Next.js | 14.x | 16.1.6 | 16.1.6 |
| Image WebP/AVIF | ✅ | ❌ | ✅ |
| Bundle Analyzer | ✅ | ✅ | ✅ |
| App Version | ❌ | ✅ | ✅ |
| PWA (6 granular rules) | ✅ | ✅ (3 rules) | ✅ (6 rules) |
| Auth cache protection | ✅ | ❌ | ✅ |
| reloadOnOnline | ❌ | ✅ | ✅ |
| Sentry | ✅ | ❌ | ✅ |
| CSP Security | ✅ | ❌ | ✅ |
| Browser cache headers | ✅ | ❌ | ✅ |

## Quick Commands
- Start: `/code p01`
- Check progress: `/next`
