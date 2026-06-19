import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import withBundleAnalyzer from "@next/bundle-analyzer";
import withPWAInit from "@ducanh2912/next-pwa";
import pkg from "./package.json" with { type: "json" };

// 🛡️ CSP: Production removes 'unsafe-eval' for stronger XSS protection
const isDev = process.env.NODE_ENV === "development";

const cspHeader = `
    default-src 'self';
    script-src 'self' ${isDev ? "'unsafe-eval'" : ""} 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    font-src 'self' data:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    worker-src 'self' blob:;
    connect-src 'self' https: wss:;
`;

const nextConfig: NextConfig = {
  // ⚡ React Compiler (Next.js 16 — V1/mcoffe chưa có)
  reactCompiler: true,

  // 📌 Auto-version: inject from package.json (mcoffe pattern)
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString(),
  },

    // 🖼️ Image Optimization — WebP/AVIF auto-convert, lazy load, responsive
  images: {
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 31536000, // Cache 1 năm (immutable)
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "ui-avatars.com",
        pathname: "/**",
      },
    ],
  },

  // 📦 Browser Cache Headers
  async headers() {
    const staticAssetRules = isDev
      ? []
      : [
          {
            source: "/workbox-:hash.js",
            headers: [
              {
                key: "Cache-Control",
                value: "public, max-age=31536000, immutable",
              },
            ],
          },
          {
            // Static assets (JS, CSS) — cache 1 năm (hashed = immutable).
            // Dev mode tắt: chunk hash đổi mỗi rebuild, browser pin chunk cũ
            // sẽ gây lỗi "module factory is not available" khi HMR.
            source: "/_next/static/:path*",
            headers: [
              {
                key: "Cache-Control",
                value: "public, max-age=31536000, immutable",
              },
            ],
          },
        ];

    return [
      {
        // Service worker must be checked often so mobile clients update quickly.
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      ...staticAssetRules,
      {
        // Images — cache 1 năm
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Public files (logo, favicon, webp, png, jpg)
        source: "/:path(.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico))",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // Fonts — cache 1 năm
        source: "/:path(.*\\.(?:woff|woff2|ttf|otf|eot))",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // HTML pages — stale-while-revalidate (instant load + background update)
        source: "/((?!api|_next).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, max-age=0, must-revalidate",
          },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Content-Security-Policy",
            value: cspHeader.replace(/\n/g, ""),
          },
        ],
      },
    ];
  },

  // 🗜️ Gzip/Brotli compression
  compress: true,

  // 🔒 Hide X-Powered-By header
  poweredByHeader: false,

  // ⚡ Skip trailing slash redirects (saves 1 redirect)
  skipTrailingSlashRedirect: true,

  // 🧪 React Strict Mode (dev only, catches bugs early)
  reactStrictMode: true,

  // ⚡ Turbopack (dev) — explicit config to allow webpack plugins (PWA) in prod build
  turbopack: {},

  experimental: {
    // ⚡ Partial Prerendering — enable per-route via export const experimental_ppr = true
    // Note: Not using global cacheComponents due to conflict with API route segment configs
    // ⚡ Client Router Cache — reduce SSR re-renders on navigation
    staleTimes: {
      dynamic: 180, // 3 min — reduce 2/3 SSR calls
      static: 600,  // 10 min — static content rarely changes
    },
    // 🌳 Tree-shake heavy packages
    optimizePackageImports: [
      "@supabase/supabase-js",
      "@supabase/ssr",
      "@radix-ui/react-select",
      "@radix-ui/react-dialog",
      "lucide-react",
      "date-fns",
      "swr",
    ],
  },

  // 🖼️ Sharp — webpack config for Vercel deployment
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('sharp');
    }
    return config;
  },
};

// 🔍 Bundle Analyzer — run with: ANALYZE=true npm run build
const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// 📱 PWA — Service Worker + Offline + Runtime Caching
// Best-of-both: V1's 6 granular rules + mcoffe's reloadOnOnline
const withPWA = withPWAInit({
  dest: "public",
  disable: isDev,
  register: true,
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true, // mcoffe pattern — auto reload khi có mạng lại
  // Never precache files whose names contain '#' (URL fragment delimiter) or a
  // space — those URLs 404 when Workbox fetches them, which aborts the entire
  // SW install and freezes the PWA on the old build. Keep next-pwa's default
  // noprecache exclusion too.
  publicExcludes: ["!noprecache/**/*", "!**/*#*", "!**/* *"],
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    disableDevLogs: true,
    importScripts: ["/push-sw.js"],
    runtimeCaching: [
      // 🟢 D4: Supabase REST API — NetworkFirst 3s timeout, cache 10 phút
      {
        urlPattern: /\/rest\/v1\/.*/,
        handler: "NetworkFirst",
        options: {
          cacheName: "supabase-api",
          networkTimeoutSeconds: 3,
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 10 * 60,
          },
        },
      },
      // 🟢 D4: Supabase Storage — CacheFirst 24h
      {
        urlPattern: /\/storage\/v1\/.*/,
        handler: "CacheFirst",
        options: {
          cacheName: "supabase-storage",
          expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
        },
      },
      // 🔴 RULE 1: Supabase Auth — NEVER CACHE (V1 audit finding)
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/.*/i,
        handler: "NetworkOnly",
      },
      // 🟢 RULE 2: HTML Navigation — NetworkOnly to avoid stale protected RSC shell
      {
        urlPattern: ({ request, url }: { request: Request; url: URL }) => {
          if (request.mode !== "navigate") return false;
          if (url.pathname.startsWith("/api/")) return false;
          if (url.pathname.startsWith("/_next/")) return false;
          if (url.pathname.startsWith("/monitoring")) return false;
          return true;
        },
        handler: "NetworkOnly",
      },
      // 🟡 RULE 3: Supabase Storage images — StaleWhileRevalidate (30 ngày)
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "supabase-images",
          expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      // 🟡 RULE 4a: Dashboard + Contract RPCs — NetworkFirst with timeout (instant fallback)
      {
        urlPattern: ({ url }: { url: URL }) => {
          if (!url.pathname.includes('/rest/v1/rpc/')) return false;
          const cachableRpcs = [
            'get_dashboard_kpi',
            'get_dashboard_revenue_chart',
            'get_dashboard_service_breakdown',
            'get_contract_detail_v2', // ⚡ Contract details cached for instant nav
          ];
          return cachableRpcs.some(rpc => url.href.includes(rpc));
        },
        handler: "NetworkFirst",
        options: {
          cacheName: "rpc-api-cache",
          expiration: { maxEntries: 60, maxAgeSeconds: 300 }, // 5 minutes, 60 entries
          networkTimeoutSeconds: 2, // Fallback to cache after 2s
        },
      },
      // 🔴 RULE 4b: Other Supabase REST API — live business data, never cache
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
        handler: "NetworkOnly",
      },
      // 🟢 RULE 5: Next.js static assets — CacheFirst (30 ngày)
      {
        urlPattern: /\/_next\/static\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "next-static",
          expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts",
          expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
      // 🟢 RULE 6: Google CDN ảnh gallery (lh3) — CacheFirst 30 ngày, max 500 entries.
      // image_url được build từ drive_file_id (=sN suffix variant); file mới upload tạo file mới
      // → cùng URL = cùng nội dung, an toàn cache lâu. Lần 2 vào album = instant từ disk cache.
      {
        urlPattern: /^https:\/\/lh3\.googleusercontent\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "lh3-images",
          expiration: { maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] }, // chỉ cache 200 + opaque (CORS) — bỏ 404/403/429
        },
      },
    ],
  },
});

export default withSentryConfig(
  withPWA(withAnalyzer(nextConfig)),
  {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    silent: true,
    telemetry: false,
    sourcemaps: {
      deleteSourcemapsAfterUpload: true,
      ignore: ["**/webpack-runtime.js", "**/instrumentation.js"],
    },
    tunnelRoute: "/monitoring",
    // ⚡ Bundle Size Optimizations — giảm ~300-500KB JS
    bundleSizeOptimizations: {
      excludeDebugStatements: true,
      excludeReplayIframe: true,
      excludeReplayShadowDom: true,
    },
  },
);
