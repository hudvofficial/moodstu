import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

type SeedState = {
  email: string;
  password: string;
  contractCode: string;
};

function readSeed(): SeedState {
  return JSON.parse(readFileSync(path.join(os.tmpdir(), "e2e-seed-ids.json"), "utf8")) as SeedState;
}

async function login(page: Page, seed: SeedState) {
  const url = `/api/e2e/login?email=${encodeURIComponent(seed.email)}&password=${encodeURIComponent(seed.password)}&next=${encodeURIComponent("/moodie")}`;
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/moodie/);
}

async function startNewConversation(page: Page) {
  await page.locator('button[aria-label="Tạo chat mới"]:visible').click();
  await expect(page.locator('textarea[placeholder="Tôi có thể giúp gì cho bạn hôm nay?"]:visible')).toBeVisible();
}

async function installAnswerStabilityObserver(page: Page) {
  await page.evaluate(() => {
    const state = {
      trackedId: "",
      root: null as Element | null,
      rootReplaced: false,
      becameEmptyAfterContent: false,
      sawContent: false,
      maxMatchingSurfaces: 0,
    };
    const sample = () => {
      const streaming = Array.from(document.querySelectorAll<HTMLElement>('[data-moodie-answer-state="streaming"]'))
        .find((element) => element.getClientRects().length > 0);
      if (streaming && !state.trackedId) {
        state.trackedId = streaming.dataset.moodieAnswerSurface || "";
        state.root = streaming;
      }
      if (!state.trackedId) return;
      const matching = Array.from(document.querySelectorAll<HTMLElement>("[data-moodie-answer-surface]"))
        .filter((element) => element.dataset.moodieAnswerSurface === state.trackedId && element.getClientRects().length > 0);
      state.maxMatchingSurfaces = Math.max(state.maxMatchingSurfaces, matching.length);
      const current = matching[0] || null;
      if (state.root && current && state.root !== current) state.rootReplaced = true;
      const responseText = current?.querySelector('[data-moodie-activity-status]')?.textContent || current?.textContent || "";
      const meaningful = responseText.replace(/Đang[^\n]*/g, "").trim();
      if (meaningful) state.sawContent = true;
      if (state.sawContent && !meaningful && current) state.becameEmptyAfterContent = true;
    };
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        sample();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["data-moodie-answer-state", "data-moodie-answer-surface"] });
    Object.assign(window, { __moodieAnswerStability: state, __moodieAnswerObserver: observer });
    sample();
  });
}

async function submitToolPrompt(page: Page, contractCode: string) {
  const prompt = `Tìm và tóm tắt hợp đồng ${contractCode}`;
  const composer = page.locator('textarea[placeholder="Tôi có thể giúp gì cho bạn hôm nay?"]:visible');
  await expect(composer).toBeVisible();
  await composer.fill(prompt);
  await composer.press("Enter");
  return prompt;
}

const phasePattern = /Đang (hiểu yêu cầu|tìm ngữ cảnh|lên kế hoạch|tra dữ liệu|soạn câu trả lời|hoàn tất)/;

async function verifyActivityUI(page: Page, screenshotName: string, prompt?: string, maxMessageGap?: number) {
  const phase = page.locator("span:visible").filter({ hasText: phasePattern }).first();
  await expect(phase).toBeVisible({ timeout: 20_000 });
  const activityRow = phase.locator("xpath=..");
  await expect(activityRow).not.toHaveClass(/animate-pulse/);
  await expect(activityRow.locator("svg")).toHaveCount(1);
  await expect(activityRow.locator("svg")).toHaveClass(/motion-reduce:animate-none/);
  await phase.locator("xpath=..").screenshot({ path: `test-results/${screenshotName}.png` });

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);

  if (prompt && maxMessageGap !== undefined) {
    const userContent = page.locator("div.whitespace-pre-wrap:visible").filter({ hasText: prompt }).last();
    const [userBox, phaseBox] = await Promise.all([userContent.boundingBox(), phase.boundingBox()]);
    expect(userBox).not.toBeNull();
    expect(phaseBox).not.toBeNull();
    const messageGap = (phaseBox?.y ?? 0) - ((userBox?.y ?? 0) + (userBox?.height ?? 0));
    expect(messageGap).toBeLessThanOrEqual(maxMessageGap);
  }

  await expect(page.locator('textarea[placeholder="Tôi có thể giúp gì cho bạn hôm nay?"]:visible')).toBeVisible({ timeout: 60_000 });

  if (prompt && maxMessageGap !== undefined) {
    const userContent = page.locator("div.whitespace-pre-wrap:visible").filter({ hasText: prompt }).last();
    const userArticle = userContent.locator("xpath=ancestor::article[1]");
    const assistantArticle = userArticle.locator("xpath=following-sibling::article[1]");
    const [userArticleBox, assistantArticleBox] = await Promise.all([userArticle.boundingBox(), assistantArticle.boundingBox()]);
    expect(userArticleBox).not.toBeNull();
    expect(assistantArticleBox).not.toBeNull();
    const completedMessageGap = (assistantArticleBox?.y ?? 0) - ((userArticleBox?.y ?? 0) + (userArticleBox?.height ?? 0));
    expect(completedMessageGap).toBeLessThanOrEqual(16);
  }
}

test.describe("Moodie Open-style activity UI", () => {
  test("desktop runtime activity stays compact and unboxed", async ({ page }) => {
    const seed = readSeed();
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, seed);
    await startNewConversation(page);
    const prompt = await submitToolPrompt(page, seed.contractCode);
    await verifyActivityUI(page, "moodie-activity-desktop", prompt);
  });

  test("mobile runtime activity has touch parity without overflow", async ({ page }) => {
    const seed = readSeed();
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, seed);
    await startNewConversation(page);
    await installAnswerStabilityObserver(page);
    const prompt = await submitToolPrompt(page, seed.contractCode);
    await verifyActivityUI(page, "moodie-activity-mobile-390", prompt, 60);

    const stability = await page.evaluate(() => (window as typeof window & { __moodieAnswerStability?: {
      rootReplaced: boolean;
      becameEmptyAfterContent: boolean;
      maxMatchingSurfaces: number;
    } }).__moodieAnswerStability);
    expect(stability?.becameEmptyAfterContent).toBe(false);
    expect(stability?.rootReplaced).toBe(false);
    expect(stability?.maxMatchingSurfaces ?? 0).toBeLessThanOrEqual(1);

    const expandable = page.getByLabel("Mở hoặc đóng các bước Moodie đang thực hiện");
    if (await expandable.isVisible().catch(() => false)) {
      const box = await expandable.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });
});
