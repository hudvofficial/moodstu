import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only send errors in production
  enabled: process.env.NODE_ENV === "production",

  // Lightweight for edge runtime
  tracesSampleRate: 0.1,

  environment: process.env.NODE_ENV,
});
