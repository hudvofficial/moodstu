import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

type RouteMetric = {
  mode: "document" | "client";
  route: string;
  elapsedMs: number;
  domContentLoadedMs: number;
  loadMs: number;
  resourceCount: number;
  transferredBytes: number;
  scriptBytes: number;
};

function readSeed() {
  return JSON.parse(
    readFileSync(path.join(os.tmpdir(), "e2e-seed-ids.json"), "utf8"),
  ) as { email: string; password: string };
}

async function login(page: Page) {
  const seed = readSeed();
  await page.goto(
    `/api/e2e/login?email=${encodeURIComponent(seed.email)}&password=${encodeURIComponent(seed.password)}&next=${encodeURIComponent("/")}`,
  );
  await page.waitForLoadState("domcontentloaded");
}

async function measureRoute(page: Page, route: string, readySelector: string): Promise<RouteMetric> {
  const startedAt = Date.now();
  // App Router streams the shell before the full document settles; measure when
  // the route's meaningful UI is visible instead of waiting for every dev chunk.
  await page.goto(route, { waitUntil: "commit" });
  await page.locator(readySelector).first().waitFor({ state: "visible" });
  const splash = page.locator("#splash-screen");
  if (await splash.count()) {
    await splash.waitFor({ state: "hidden" });
  }
  const elapsedMs = Date.now() - startedAt;
  const browserMetrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    return {
      domContentLoadedMs: Math.round(navigation?.domContentLoadedEventEnd || 0),
      loadMs: Math.round(navigation?.loadEventEnd || navigation?.domContentLoadedEventEnd || 0),
      resourceCount: resources.length,
      transferredBytes: resources.reduce((total, entry) => total + (entry.transferSize || 0), 0),
      scriptBytes: resources
        .filter((entry) => entry.initiatorType === "script")
        .reduce((total, entry) => total + (entry.transferSize || 0), 0),
    };
  });

  return { mode: "document", route, elapsedMs, ...browserMetrics };
}

async function measureClientRoute(
  page: Page,
  route: string,
  readySelector: string,
): Promise<RouteMetric> {
  const before = await page.evaluate(() => performance.getEntriesByType("resource").length);
  const startedAt = Date.now();
  const link = page.locator(`a[href="${route}"]`).first();
  await link.waitFor({ state: "attached" });
  // Mobile keeps the desktop sidebar mounted but visually hidden. Dispatching
  // its native click still exercises the same Next Link/App Router transition.
  await link.evaluate((element) => (element as HTMLAnchorElement).click());
  await page.waitForURL((url) => url.pathname === route);
  await page.locator(readySelector).first().waitFor({ state: "visible" });
  const elapsedMs = Date.now() - startedAt;
  const browserMetrics = await page.evaluate((startIndex) => {
    const resources = (performance.getEntriesByType("resource") as PerformanceResourceTiming[]).slice(startIndex);
    return {
      domContentLoadedMs: 0,
      loadMs: 0,
      resourceCount: resources.length,
      transferredBytes: resources.reduce((total, entry) => total + (entry.transferSize || 0), 0),
      scriptBytes: resources
        .filter((entry) => entry.initiatorType === "script")
        .reduce((total, entry) => total + (entry.transferSize || 0), 0),
    };
  }, before);

  return { mode: "client", route, elapsedMs, ...browserMetrics };
}

async function runSettingsJourney(page: Page, testInfo: TestInfo, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await login(page);

  // Warm Next.js route chunks before measuring the user-visible return journey.
  await page.goto("/settings");
  await page.locator(".detail-grid").waitFor({ state: "visible" });
  await page.goto("/");

  const documentMetrics = [
    await measureRoute(page, "/settings", ".detail-grid"),
    await measureRoute(page, "/settings/studio", ".detail-grid"),
    await measureRoute(page, "/settings/credit-cards", ".main-container > .space-y-6"),
  ];

  const clientMetrics = [
    await measureClientRoute(page, "/settings", ".detail-grid"),
    await measureClientRoute(page, "/settings/studio", ".detail-grid"),
    await measureClientRoute(page, "/settings", ".detail-grid"),
    await measureClientRoute(page, "/settings/credit-cards", ".main-container > .space-y-6"),
  ];
  const metrics = [...documentMetrics, ...clientMetrics];

  await testInfo.attach(`settings-performance-${viewport.width}.json`, {
    body: Buffer.from(JSON.stringify(metrics, null, 2)),
    contentType: "application/json",
  });
  console.log(`[settings-performance:${viewport.width}] ${JSON.stringify(metrics)}`);

  for (const metric of metrics) {
    // Dev compilation and CI contention can add noise; this guards against a stalled route.
    // Native-feel targets are evaluated from the attached measurements, not this safety cap.
    expect(metric.elapsedMs, `${metric.route} should not stall`).toBeLessThan(15_000);
  }

  await page.screenshot({
    path: testInfo.outputPath(`settings-${viewport.width}.png`),
    fullPage: true,
  });
}

test("settings journey performance — desktop", async ({ page }, testInfo) => {
  await runSettingsJourney(page, testInfo, { width: 1366, height: 900 });
});

test("settings journey performance — mobile", async ({ page }, testInfo) => {
  await runSettingsJourney(page, testInfo, { width: 390, height: 844 });
});
