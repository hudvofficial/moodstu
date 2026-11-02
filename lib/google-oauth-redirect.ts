/**
 * Resolve Google OAuth callback to the correct runtime origin for this studio.
 *
 * Production previously sent OAuth callbacks to localhost:3000 because of
 * a stale environment variable. Never use an untrusted Host to replace the
 * canonical studio callback address.
 */
const CALLBACK_PATH = "/api/auth/google/callback";
const STUDIO_PRODUCTION_HOST = "stu.moodwedding.com";

function isLoopback(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function resolveGoogleOAuthRedirectUri(
  requestUrl: string,
  configuredRedirectUri?: string,
  configuredSiteUrl?: string,
): string {
  const incoming = new URL(requestUrl);

  // One studio production domain, verified and registered in Google Cloud.
  // The trusted production route takes priority over stale Vercel env values.
  if (incoming.hostname === STUDIO_PRODUCTION_HOST) {
    return "https://" + STUDIO_PRODUCTION_HOST + CALLBACK_PATH;
  }

  const requestCallback = new URL(CALLBACK_PATH, incoming.origin).toString();
  const configured = configuredRedirectUri
    ? new URL(configuredRedirectUri)
    : configuredSiteUrl
      ? new URL(CALLBACK_PATH, new URL(configuredSiteUrl).origin)
      : null;

  if (!configured) return requestCallback;

  if (
    configured.pathname !== CALLBACK_PATH ||
    configured.search ||
    configured.hash ||
    !["http:", "https:"].includes(configured.protocol) ||
    (configured.protocol === "http:" && !isLoopback(configured.hostname))
  ) {
    throw new Error("Invalid Google OAuth redirect URI configuration");
  }

  // Local dev always uses its own origin, even if env points to a stale
  // localhost port OR to production. OAuth state cookies are origin-bound.
  if (isLoopback(incoming.hostname)) return requestCallback;

  // OAuth cannot start on one public origin and return to a different one:
  // that would lose the OAuth state cookie. Only registered origins can work.
  if (configured.origin !== incoming.origin) {
    throw new Error("Google OAuth callback origin does not match the current host");
  }

  return configured.toString();
}
