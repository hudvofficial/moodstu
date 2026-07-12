import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

function readSeed() {
  return JSON.parse(readFileSync(path.join(os.tmpdir(), "e2e-seed-ids.json"), "utf8")) as { email: string; password: string };
}

test("Moodie delegates deep research to a durable background run", async ({ page }) => {
  const seed = readSeed();
  await page.goto(`/api/e2e/login?email=${encodeURIComponent(seed.email)}&password=${encodeURIComponent(seed.password)}&next=${encodeURIComponent("/moodie")}`, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/moodie/);
  await page.locator('button[aria-label="Tạo chat mới"]:visible').click();
  const composer = page.locator('textarea[placeholder="Tôi có thể giúp gì cho bạn hôm nay?"]:visible');
  await composer.fill("Nghiên cứu sâu xu hướng trợ lý AI mới nhất và lập báo cáo chi tiết từ nhiều nguồn.");
  await composer.press("Enter");

  const runCard = page.locator("[data-moodie-background-run]").first();
  await expect(runCard).toBeVisible({ timeout: 120_000 });
  await expect(runCard).toContainText(/Đang nghiên cứu|Đã hoàn tất/, { timeout: 30_000 });
  await expect(runCard).toContainText(/Đã hoàn tất · [1-9]\d* nguồn/, { timeout: 120_000 });
  await expect(runCard.locator('a[target="_blank"]')).not.toHaveCount(0);
  await expect(composer).toBeVisible();
});
