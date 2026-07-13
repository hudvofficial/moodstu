import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

function readSeed() {
  return JSON.parse(readFileSync(path.join(os.tmpdir(), "e2e-seed-ids.json"), "utf8")) as { email: string; password: string };
}

test("Moodie voice settings is clear, UTF-8 safe and responsive", async ({ page }, testInfo) => {
  const seed = readSeed();
  await page.goto(`/api/e2e/login?email=${encodeURIComponent(seed.email)}&password=${encodeURIComponent(seed.password)}&next=${encodeURIComponent("/settings/studio")}`);
  await page.getByRole("button", { name: /Mở cấu hình Moodie/i }).click();
  await page.getByRole("button", { name: /Giọng nói Trò chuyện realtime/i }).click();

  await expect(page.getByText("Nền tảng realtime", { exact: true })).toBeVisible();
  await expect(page.getByText("Gemini là mặc định; Moodie tự chuyển về Gemini nếu OpenAI chưa sẵn sàng.", { exact: true })).toBeVisible();
  await expect(page.getByText("Trò chuyện realtime và nhập liệu", { exact: true })).toBeVisible();
  const voiceSection = page.locator("section").filter({ hasText: "Nền tảng realtime" });
  await voiceSection.screenshot({ path: testInfo.outputPath("voice-settings-desktop.png") });

  await page.getByRole("button", { name: /OpenAI Realtime/i }).click();
  await expect(page.getByText("API key OpenAI", { exact: true })).toBeVisible();
  await expect(page.getByText("Chưa có OpenAI API key. Cấu hình này có thể lưu trước; Moodie vẫn tiếp tục dùng Gemini.", { exact: true })).toBeVisible();
  const openAIModelInput = page.locator('input[value="gpt-realtime-2.1"]');
  await expect(openAIModelInput).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await openAIModelInput.scrollIntoViewIfNeeded();
  await expect(page.getByText("API key OpenAI", { exact: true })).toBeVisible();
  await expect(openAIModelInput).toBeInViewport();
  await expect(page.getByRole("button", { name: /Lưu cấu hình/i })).toBeVisible();
  await voiceSection.screenshot({ path: testInfo.outputPath("voice-settings-mobile.png") });
});
