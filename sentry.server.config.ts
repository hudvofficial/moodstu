import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only send errors in production
  enabled: process.env.NODE_ENV === "production",

  // Performance: sample 20% of server transactions
  tracesSampleRate: 0.2,

  // Environment tag
  environment: process.env.NODE_ENV,

  // Before sending, enrich with context
  beforeSend(event) {
    if (process.env.NODE_ENV === "development") {
      return null;
    }

    // Filter expected errors — not bugs, just normal app flow
    const message = event.exception?.values?.[0]?.value || "";
    const expectedErrors = [
      "Chưa đăng nhập",
      "Từ chối truy cập",
      "NEXT_REDIRECT",
      "NEXT_NOT_FOUND",
    ];

    if (expectedErrors.some((e) => message.includes(e))) {
      return null;
    }

    return event;
  },
});
