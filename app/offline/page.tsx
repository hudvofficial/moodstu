"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-bg, #f8f9fa)",
        padding: "2rem",
        textAlign: "center" as const,
        gap: "1.5rem",
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: "1.25rem",
          background: "var(--color-primary-surface, #eef3f0)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 40,
        }}
      >
        📡
      </div>

      {/* Text */}
      <div>
        <h1
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "var(--color-text, #1a1a1a)",
            margin: "0 0 0.5rem 0",
          }}
        >
          Không có kết nối mạng
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--color-text-secondary, #6b7280)",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Vui lòng kiểm tra kết nối internet
          <br />
          và thử lại.
        </p>
      </div>

      {/* Retry button */}
      <Button
        onClick={() => window.location.reload()}
        type="button"
        variant="ghost"
        style={{
          padding: "0.75rem 2rem",
          borderRadius: "0.75rem",
          border: "none",
          background: "var(--color-primary, #2E5C46)",
          color: "white",
          fontSize: "0.875rem",
          fontWeight: 600,
          cursor: "pointer",
          transition: "opacity 0.2s",
          boxShadow: "none",
        }}
      >
        Thử lại
      </Button>

      {/* Home link */}
      <Link
        href="/dashboard"
        style={{
          fontSize: "0.8125rem",
          color: "var(--color-primary, #2E5C46)",
          textDecoration: "none",
        }}
      >
        ← Về trang chủ
      </Link>
    </div>
  );
}
