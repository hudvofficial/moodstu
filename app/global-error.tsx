"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="vi">
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            fontFamily: "system-ui, -apple-system, sans-serif",
            backgroundColor: "#fafafa",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "4rem",
              marginBottom: "1rem",
            }}
          >
            😔
          </div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 600,
              color: "#1a1a1a",
              marginBottom: "0.5rem",
            }}
          >
            Đã xảy ra lỗi
          </h1>
          <p
            style={{
              color: "#666",
              marginBottom: "2rem",
              maxWidth: "400px",
              lineHeight: 1.5,
            }}
          >
            Xin lỗi, có lỗi không mong muốn xảy ra. Đội ngũ kỹ thuật đã được
            thông báo.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "0.75rem 2rem",
              backgroundColor: "#2e7d32",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "1rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Thử lại
          </button>
        </div>
      </body>
    </html>
  );
}
