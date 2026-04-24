import { headers } from "next/headers";

const BASE_URL_ENV_KEYS = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_APP_URL",
  "APP_URL",
] as const;

function normalizeBaseUrl(value?: string | null): string | null {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export async function getRequestBaseUrl(): Promise<string> {
  const headerStore = await headers();
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost ?? headerStore.get("host");
  const forwardedProto = headerStore.get("x-forwarded-proto");

  if (host) {
    const protocol =
      forwardedProto ??
      (host.includes("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https");

    return `${protocol}://${host}`;
  }

  for (const key of BASE_URL_ENV_KEYS) {
    const normalized = normalizeBaseUrl(process.env[key]);
    if (normalized) return normalized;
  }

  return "http://localhost:3000";
}

export function sanitizeNextPath(
  next: string | null | undefined,
  fallback = "/",
): string {
  if (!next) return fallback;

  const value = next.trim();
  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}
