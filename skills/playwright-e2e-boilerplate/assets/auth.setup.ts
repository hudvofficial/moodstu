/**
 * auth.setup.ts
 * ─────────────
 * Playwright setup project — chạy TRƯỚC tất cả test khác.
 * Login qua UI 1 lần, save storage state vào .auth/admin.json.
 *
 * File này đặt tại: tests/e2e/auth.setup.ts
 *
 * playwright.config.ts sẽ reference:
 *   projects: [
 *     { name: "setup", testMatch: /.*\.setup\.ts/ },
 *     // ... other projects với use.storageState = ".auth/admin.json"
 *   ]
 *
 * Run manually:
 *   npx playwright test --project=setup
 */

import { test as setup, expect } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const AUTH_FILE = path.join(process.cwd(), ".auth", "admin.json");

function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return;
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const sep = line.indexOf("=");
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    let value = line.slice(sep + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    )
      value = value.slice(1, -1);
    process.env[key] ??= value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));

setup("authenticate via UI", async ({ page }) => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "[auth.setup] Missing ADMIN_EMAIL or ADMIN_PASSWORD in .env.local",
    );
  }

  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/mật khẩu|password/i).fill(password);
  await page.getByRole("button", { name: /đăng nhập|sign in|login/i }).click();
  await page.waitForURL(/\/dashboard$/, { timeout: 45_000 });

  // Sanity: confirm we have auth cookies
  const cookies = await page.context().cookies();
  expect(cookies.length).toBeGreaterThan(0);

  await page.context().storageState({ path: AUTH_FILE });
  console.log(`[auth.setup] ✅ Saved storage state to ${AUTH_FILE}`);
});
