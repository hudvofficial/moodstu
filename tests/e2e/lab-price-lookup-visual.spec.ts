import { test, expect, type Page } from "@playwright/test";

/**
 * Visual smoke cho T-20261112 (lab catalog pricing).
 *
 * Không seed user, không ghi DB — spec §7 cấm E2E seed trên DB dev/prod dùng chung.
 * Cần credential thật trong env:
 *   E2E_LAB_EMAIL=...  E2E_LAB_PASSWORD=...
 *
 *   PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npx playwright test lab-price-lookup-visual
 *
 * Không có env → skip toàn bộ (không fail CI).
 */

const EMAIL = process.env.E2E_LAB_EMAIL;
const PASSWORD = process.env.E2E_LAB_PASSWORD;

const VIEWPORTS = [
  { name: "phone-375", width: 375, height: 812 },
  { name: "phone-390", width: 390, height: 844 },
  { name: "phone-500", width: 500, height: 900 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "tablet-1023", width: 1023, height: 768 },
  { name: "desktop-1366", width: 1366, height: 900 },
];

async function login(page: Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(EMAIL as string);
  await page.locator('input[name="password"]').fill(PASSWORD as string);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard$/, { timeout: 60_000 });
}

test.describe("Lab tra giá — responsive", () => {
  test.skip(!EMAIL || !PASSWORD, "Thiếu E2E_LAB_EMAIL / E2E_LAB_PASSWORD");
  test.setTimeout(120_000);

  for (const vp of VIEWPORTS) {
    test(`${vp.name}: mở drawer tra giá, không tràn ngang`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await login(page);
      await page.goto("/printing/labs");

      await page.getByRole("button", { name: /Tra giá/ }).first().click();

      const drawer = page.getByRole("dialog");
      await expect(drawer.getByText("Tra giá Xưởng in")).toBeVisible();

      // search box và label nguồn giá phải hiện
      await expect(
        drawer.getByLabel("Tìm SKU hoặc dịch vụ"),
      ).toBeVisible();

      // Không tràn ngang: scrollWidth không vượt clientWidth quá 1px
      const overflow = await page.evaluate(() => {
        const el = document.scrollingElement as HTMLElement;
        return el.scrollWidth - el.clientWidth;
      });
      expect(overflow).toBeLessThanOrEqual(1);

      // Thao tác chạm đủ lớn: mọi button trong drawer ≥ 32px cao
      const tooSmall = await drawer.evaluate((node) =>
        Array.from(node.querySelectorAll("button"))
          .filter((b) => b.offsetHeight > 0 && b.offsetHeight < 32)
          .map((b) => b.textContent?.trim() || b.getAttribute("aria-label") || "?"),
      );
      expect(tooSmall).toEqual([]);
    });
  }
});
