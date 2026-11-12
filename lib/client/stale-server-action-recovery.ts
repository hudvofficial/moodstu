const STALE_SERVER_ACTION_PATTERNS = [
  /unrecognizedactionerror/i,
  /failed to find server action/i,
  /server action .* (?:was )?not found on the server/i,
  /failed-to-find-server-action/i,
];

const BUILD_ID =
  process.env.NEXT_PUBLIC_BUILD_DATE ||
  process.env.NEXT_PUBLIC_APP_VERSION ||
  "dev";

export const STALE_SERVER_ACTION_RELOAD_KEY =
  `mood-studio-stale-action-reloaded:${BUILD_ID}`;

const reloadedKeys = new Set<string>();

function errorText(value: unknown): string {
  if (value instanceof Error) {
    const cause = "cause" in value ? errorText(value.cause) : "";
    return `${value.name} ${value.message} ${cause}`;
  }

  if (typeof value === "string") return value;

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return [record.name, record.message, record.digest, record.cause]
      .map(errorText)
      .join(" ");
  }

  return "";
}

export function isStaleServerActionError(error: unknown): boolean {
  const text = errorText(error);
  return STALE_SERVER_ACTION_PATTERNS.some((pattern) => pattern.test(text));
}

interface ReloadEnvironment {
  storage: Pick<Storage, "getItem" | "setItem">;
  reload: () => void;
}

function browserEnvironment(): ReloadEnvironment | null {
  if (typeof window === "undefined") return null;
  return {
    storage: window.sessionStorage,
    reload: () => window.location.reload(),
  };
}

export function reloadCurrentBuildOnce(
  key: string,
  environment: ReloadEnvironment | null = browserEnvironment(),
  beforeReload?: () => Promise<void>,
): boolean {
  if (!environment) return false;

  if (reloadedKeys.has(key)) return false;

  try {
    if (environment.storage.getItem(key)) return false;
    environment.storage.setItem(key, "1");
  } catch {
    // A blocked storage API must not prevent recovery from a stale deployment.
  }

  reloadedKeys.add(key);

  if (!beforeReload) {
    environment.reload();
    return true;
  }

  // PWA (next-pwa) có thể trả lại đúng chunk cũ sau reload → reload thường
  // không cứu được. Dọn cache + SW trước, rồi mới reload.
  beforeReload()
    .catch(() => {})
    .finally(() => environment.reload());
  return true;
}

/**
 * Xoá Workbox cache + unregister service worker để lần reload sau chắc chắn
 * lấy JS/HTML mới từ network. SW sẽ tự đăng ký lại ở lần load kế tiếp.
 */
async function purgeStaleClientCaches(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    if ("caches" in window) {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((key) => window.caches.delete(key)));
    }
  } catch {
    // Cache API bị chặn (private mode) — bỏ qua, reload vẫn chạy.
  }

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch {
    // Không unregister được thì vẫn reload.
  }
}

export function recoverFromStaleServerAction(error: unknown): boolean {
  if (!isStaleServerActionError(error)) return false;
  reloadCurrentBuildOnce(
    STALE_SERVER_ACTION_RELOAD_KEY,
    browserEnvironment(),
    purgeStaleClientCaches,
  );
  return true;
}

/**
 * Bọc các hàm toast để mọi lỗi hiển thị cho user đều chạy qua recovery.
 *
 * Cần vì ~100 component import `toast` THẲNG từ `sonner`, bỏ qua
 * `lib/toast-manager` (nơi đã gọi recoverFromStaleServerAction). Không sửa 100
 * chỗ; patch một lần tại chỗ mount toaster.
 */
export function guardStaleServerActionToasts(
  target: Record<string, unknown>,
  levels: readonly string[] = ["error", "warning"],
  onStale: (error: unknown) => boolean = recoverFromStaleServerAction,
): Record<string, unknown> {
  const flags = target as Record<string, unknown> & { __staleGuarded?: boolean };
  if (flags.__staleGuarded) return target;
  flags.__staleGuarded = true;

  for (const level of levels) {
    const original = target[level];
    if (typeof original !== "function") continue;

    target[level] = function guardedToast(this: unknown, ...args: unknown[]) {
      onStale(args[0]);
      return (original as (...rest: unknown[]) => unknown).apply(this, args);
    };
  }

  return target;
}
