import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

function readSeed() {
  return JSON.parse(readFileSync(path.join(os.tmpdir(), "e2e-seed-ids.json"), "utf8")) as { email: string; password: string };
}

test("Moodie text uses Brave for current external facts and exposes citations", async ({ page }) => {
  const seed = readSeed();
  const loginUrl = `/api/e2e/login?email=${encodeURIComponent(seed.email)}&password=${encodeURIComponent(seed.password)}&next=${encodeURIComponent("/moodie")}`;
  await page.goto(loginUrl, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/moodie/);

  await expect(page.locator("#splash-screen")).toBeHidden({ timeout: 30_000 });
  await page.locator('button[aria-label="Tạo chat mới"]:visible').click();
  const composer = page.locator('textarea[placeholder="Tôi có thể giúp gì cho bạn hôm nay?"]:visible');
  await expect(composer).toBeVisible();
  await composer.fill("Hãy dùng Brave Search tìm 3 tin mới nhất về OpenAI và trả lời kèm nguồn.");
  await page.getByRole("button", { name: "Gửi tin nhắn cho Moodie" }).click();
  await expect(composer).toHaveValue("");

  const sourceSummary = page.getByText(/Xem \d+ nguồn tham chiếu|Đã tra \d+ nguồn/).first();
  await expect(sourceSummary).toBeVisible({ timeout: 120_000 });
  const summaryText = await sourceSummary.textContent();
  const sourceCount = Number(summaryText?.match(/\d+/)?.[0] || 0);
  expect(sourceCount).toBeGreaterThan(0);
  expect(sourceCount).toBeLessThanOrEqual(8);
  await expect(composer).toBeVisible({ timeout: 120_000 });
});
