"use client";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/**
 * Offline indicator banner — shows when user loses internet connection.
 * Auto-hides when back online. Uses SSOT design tokens.
 */
export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: "fixed",
        top: "env(safe-area-inset-top, 0px)",
        left: 0,
        right: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        padding: "10px 16px",
        background: "var(--color-warning, #ff9800)",
        color: "#fff",
        fontSize: "var(--font-size-body-sm, 14px)",
        fontWeight: 600,
        fontFamily: "var(--font-sans)",
        textAlign: "center" as const,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        animation: "slideDown 0.3s ease-out",
      }}
    >
      <span style={{ fontSize: "16px" }}>📡</span>
      <span>Bạn đang offline — dữ liệu có thể không cập nhật</span>
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
