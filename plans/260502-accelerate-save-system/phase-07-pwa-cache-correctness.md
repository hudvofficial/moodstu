# Phase 07 - PWA Cache Correctness

Scope: prevent stale business data or stale protected app shells from surviving service worker/cache updates.

## Completed Slices

- PWA runtime caching:
  - Supabase auth remains `NetworkOnly`.
  - protected HTML/navigation remains `NetworkOnly`.
  - Supabase REST business data changed from `NetworkFirst` with a 1 hour cache to `NetworkOnly`.
  - Supabase storage images remain `StaleWhileRevalidate` with a 30 day cap.
  - hashed Next static assets remain `CacheFirst`.
- Front-end navigation cache:
  - disabled `cacheOnFrontEndNav`.
  - disabled `aggressiveFrontEndNavCaching`.
  - server-rendered protected routes keep their `no-store` headers as the source of truth.
- Service worker update path:
  - added `ServiceWorkerUpdateReload` to reload once per app version when a new service worker claims the page.
  - kept the existing dev-only SW unregister/cache cleanup.
  - allowlisted only this controlled SW update reload in `perf:audit`.

## Decisions

- Do not provide offline fallback for live business data. Offline mode should preserve the shell/static assets, not show stale operational records.
- Keep `/offline` as the document fallback for true navigation failures.
- Keep static/image caching long-lived only for immutable or low-risk assets.

## Remaining For Later Phases

- Validate the generated production `public/sw.js` after build contains `supabase.co/rest` as `NetworkOnly`.
- Smoke production mobile after deploy: update SW, reconnect from offline, verify no stale business list after mutation.
- Add Playwright/browser coverage for service worker update behavior if stable test credentials are available.
