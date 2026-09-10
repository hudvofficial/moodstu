import { defineConfig, devices } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;

  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] ??= value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));

const defaultBaseURL = "http://127.0.0.1:3000";
const baseURL = process.env.PLAYWRIGHT_BASE_URL || defaultBaseURL;
const shouldStartWebServer =
  process.env.PLAYWRIGHT_SKIP_WEB_SERVER !== "1" &&
  !process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./playwright/global-setup.ts",
  globalTeardown: "./playwright/global-teardown.ts",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1366, height: 768 },
      },
    },
    // Thiết bị iOS: dùng THẲNG preset của Playwright, không tự chế viewport.
    // Bản cũ "iPad A16 Landscape" spread `devices["Desktop Safari"]` → hasTouch=false,
    // isMobile=false: là Safari desktop chứ không phải iPad, trong khi
    // contracts-tablet-ipad.spec.ts có case "touch prefetch" + "touch target 44px".
    // Cả 4 preset dưới đều là webkit + hasTouch + isMobile.
    {
      name: "iPhone 15 Pro",
      retries: 1,
      use: { ...devices["iPhone 15 Pro"] },
    },
    {
      name: "iPhone 15 Pro Max",
      retries: 1,
      use: { ...devices["iPhone 15 Pro Max"] },
    },
    {
      name: "iPad Pro 11",
      retries: 1,
      use: { ...devices["iPad Pro 11"] },
    },
    {
      name: "iPad Pro 11 landscape",
      retries: 1,
      use: { ...devices["iPad Pro 11 landscape"] },
    },
  ],
  webServer: shouldStartWebServer
    ? {
        // Port PHẢI khớp với `url` bên dưới (= defaultBaseURL :3000). Bản cũ start
        // :3100 nhưng health-check chờ :3000 → cold-start luôn timeout 120s; suite
        // chỉ chạy được khi ĐÃ có dev server ở :3000 (reuseExistingServer bắt nó).
        command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
        url: defaultBaseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});
