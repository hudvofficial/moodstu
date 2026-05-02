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
        source: "/workbox-:hash.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
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
      {
        // Static assets (JS, CSS) — cache 1 năm (hashed = immutable)
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
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
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    disableDevLogs: true,
    runtimeCaching: [
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
      // 🔴 RULE 4: Supabase REST API — live business data, never cache
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
