const DEFAULT_SLOW_MS = 800;

function getSlowThresholdMs() {
  const configured = Number(process.env.ACTION_PROFILE_SLOW_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_SLOW_MS;
}

function shouldLog(elapsedMs: number) {
  if (process.env.ACTION_PROFILE === "1") return true;
  if (process.env.ACTION_PROFILE === "0") return false;
  return elapsedMs >= getSlowThresholdMs();
}

export async function profileAction<T>(name: string, action: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    return await action();
  } finally {
    const elapsedMs = Math.round(performance.now() - start);
    if (shouldLog(elapsedMs)) {
      console.warn(`[action-profile] ${name} ${elapsedMs}ms`);
    }
  }
}
