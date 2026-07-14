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
  environment.reload();
  return true;
}

export function recoverFromStaleServerAction(error: unknown): boolean {
  if (!isStaleServerActionError(error)) return false;
  reloadCurrentBuildOnce(STALE_SERVER_ACTION_RELOAD_KEY);
  return true;
}
