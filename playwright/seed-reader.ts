/**
 * playwright/seed-reader.ts
 * ─────────────────────────
 * Thin helper consumed by test specs that want to USE the global seed
 * (rather than spinning up their own). If the file isn't present
 * (e.g. a developer runs a single spec without the full Playwright runner),
 * the functions return null/undefined so specs can fall back to their own
 * per-spec seed or call test.skip().
 *
 * Usage in a spec:
 *
 *   import { readGlobalSeed } from "../../playwright/seed-reader";
 *
 *   test.beforeAll(() => {
 *     const globalSeed = readGlobalSeed();
 *     if (!globalSeed) test.skip(true, "Global seed not available");
 *     // use globalSeed.contractId, globalSeed.email, etc.
 *   });
 */

import { existsSync, readFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { GlobalSeedIds } from "./global-setup";

export const SEED_FILE = path.join(os.tmpdir(), "e2e-seed-ids.json");

/**
 * Read and parse the global seed IDs file.
 * Returns null if the file doesn't exist or is malformed.
 */
export function readGlobalSeed(): GlobalSeedIds | null {
  if (!existsSync(SEED_FILE)) return null;
  try {
    return JSON.parse(readFileSync(SEED_FILE, "utf8")) as GlobalSeedIds;
  } catch {
    return null;
  }
}

/**
 * Read global seed; throw if unavailable (use in beforeAll when the test
 * absolutely depends on global seed data).
 */
export function requireGlobalSeed(): GlobalSeedIds {
  const seed = readGlobalSeed();
  if (!seed) {
    throw new Error(
      `[seed-reader] Global seed file not found at ${SEED_FILE}. ` +
        "Run the full Playwright suite (not a single spec) so globalSetup runs first.",
    );
  }
  return seed;
}
