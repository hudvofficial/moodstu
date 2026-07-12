import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

function readSeed() {
  return JSON.parse(readFileSync(path.join(os.tmpdir(), "e2e-seed-ids.json"), "utf8")) as { email: string; password: string };
}

test("Moodie background research remains usable at tablet width", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1180 });
  const seed = readSeed();
  await page.goto(`/api/e2e/login?email=${encodeURIComponent(seed.email)}&password=${encodeURIComponent(seed.password)}&next=${encodeURIComponent("/moodie")}`, { waitUntil: "domcontentloaded" });
  const composer = page.locator('textarea[placeholder="Tôi có thể giúp gì cho bạn hôm nay?"]:visible');
  await expect(composer).toBeVisible();
  await composer.fill("Nghiên cứu sâu xu hướng trợ lý AI mới nhất và lập báo cáo chi tiết từ nhiều nguồn.");
  await composer.press("Enter");

  const card = page.locator("[data-moodie-background-run]:visible").first();
  await expect(card).toBeVisible({ timeout: 120_000 });
  await expect(card).toContainText(/Đã hoàn tất · [1-9]\d* nguồn/, { timeout: 120_000 });
  const geometry = await card.evaluate((element) => ({
    left: element.getBoundingClientRect().left,
    right: element.getBoundingClientRect().right,
    viewport: window.innerWidth,
    overflow: element.scrollWidth > element.clientWidth + 1,
  }));
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewport + 1);
  expect(geometry.overflow).toBe(false);
  await expect(card.locator('a[target="_blank"]')).not.toHaveCount(0);
});
