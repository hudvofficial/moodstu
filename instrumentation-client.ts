import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only send errors in production
  enabled: process.env.NODE_ENV === "production",

  // Không đo hiệu năng phía trình duyệt: mã tracing bị gỡ khỏi gói client lúc build
  // (`__SENTRY_TRACING__: false` trong next.config.ts) để giảm JS tải về — ADR-022.
  // Bắt lỗi giữ nguyên. Số trải nghiệm thật còn lại: Vercel Speed Insights (gói Hobby
  // chỉ cho điểm tổng, không có LCP/INP/TTFB theo route).

  // Disable Session Replay (free tier)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // Environment tag
  environment: process.env.NODE_ENV,

  // Filter noisy errors
  ignoreErrors: [
    // Browser extensions
    "ResizeObserver loop",
    // next-view-transitions: view transition aborted (slow DOM update / tab hidden).
    // Benign — navigation still applies, only the animation is skipped.
    "Transition was aborted because of timeout",
    // Network errors (normal)
    "Failed to fetch",
    "Load failed",
    "NetworkError",
    // Next.js hydration warnings
    "Hydration failed",
    "There was an error while hydrating",
    // In-app browser injected scripts (Zalo, Facebook, etc.)
    "zaloJSV2",
    "ZaloJSInterface",
    "fb_xd_fragment",
    "__gCrWeb",
    // next-pwa (next.config.ts `register: true`) gọi workbox.register() không
    // .catch(); in-app browser từ chối đăng ký SW → rejection lọt vào Sentry.
    // Chỉ mất offline cache của PWA, trang vẫn chạy bình thường.
    // Regex NEO 2 đầu: ignoreErrors match theo substring nên chuỗi "Rejected"
    // trần sẽ nuốt nhầm mọi lỗi khác có chữ này.
    /^Rejected$/,
  ],

  // Before sending an error, add context
  beforeSend(event) {
    // Don't send errors in development
    if (process.env.NODE_ENV === "development") {
      return null;
    }
    return event;
  },
});
