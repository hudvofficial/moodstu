import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

type Seed = {
  email: string;
  password: string;
  userId: string;
};

function readSeed(): Seed {
  return JSON.parse(
    readFileSync(path.join(os.tmpdir(), "e2e-seed-ids.json"), "utf8"),
  ) as Seed;
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function adminClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function login(page: Page, next: string) {
  const seed = readSeed();
  await page.goto(
    `/api/e2e/login?email=${encodeURIComponent(seed.email)}&password=${encodeURIComponent(seed.password)}&next=${encodeURIComponent(next)}`,
  );
  await page.waitForURL((url) => url.pathname === next);
}

async function openTwoPages(pageA: Page, pageB: Page, route: string) {
  await Promise.all([login(pageA, route), login(pageB, route)]);
  await Promise.all([
    pageA.waitForLoadState("domcontentloaded"),
    pageB.waitForLoadState("domcontentloaded"),
  ]);
  // Give both authenticated Realtime channels time to reach SUBSCRIBED before
  // the first mutation, otherwise a very fast test can legitimately miss it.
  await pageA.waitForTimeout(1_500);
}

test.describe.serial("Settings CRUD and signal-only realtime", () => {
  test("credit cards create, update and delete refresh both tabs", async ({
    page,
    context,
  }) => {
    const otherPage = await context.newPage();
    const marker = `E2E-RT-${Date.now()}`;
    const updatedName = `${marker}-UPDATED`;
    const admin = adminClient();

    try {
      await openTwoPages(page, otherPage, "/settings/credit-cards");

      await page.getByRole("button", { name: /Thêm thẻ mới/i }).click();
      const modal = page.getByRole("dialog");
      await modal.getByPlaceholder(/Techcombank/i).fill(marker);
      await modal.getByPlaceholder("VD: 5432").fill("7412");
      await modal.getByRole("button", { name: /Lưu thay đổi/i }).click();

      await expect(page.getByText(marker, { exact: true })).toBeVisible();
      await expect(otherPage.getByText(marker, { exact: true })).toBeVisible({
        timeout: 15_000,
      });

      await page.getByText(marker, { exact: true }).click();
      await page.getByRole("dialog").getByPlaceholder(/Techcombank/i).fill(updatedName);
      await page.getByRole("dialog").getByRole("button", { name: /Lưu thay đổi/i }).click();

      await expect(page.getByText(updatedName, { exact: true })).toBeVisible();
      await expect(otherPage.getByText(updatedName, { exact: true })).toBeVisible({
        timeout: 15_000,
      });

      await page.getByText(updatedName, { exact: true }).click();
      page.once("dialog", (dialog) => dialog.accept());
      await page.getByRole("dialog").getByRole("button", { name: /Xóa thẻ/i }).click();

      await expect(page.getByText(updatedName, { exact: true })).toHaveCount(0);
      await expect(otherPage.getByText(updatedName, { exact: true })).toHaveCount(0, {
        timeout: 15_000,
      });
    } finally {
      await admin.from("credit_cards").delete().like("bank_name", `${marker}%`);
      await otherPage.close();
    }
  });

  test("notification preference updates optimistically and reaches another tab", async ({
    page,
    context,
  }) => {
    const otherPage = await context.newPage();
    const label = "Thông báo hệ thống";

    try {
      await openTwoPages(page, otherPage, "/settings");
      const switchA = page.getByRole("switch", { name: label });
      const switchB = otherPage.getByRole("switch", { name: label });
      const original = await switchA.getAttribute("aria-checked");
      const next = original !== "true";

      await switchA.click();
      await expect(switchA).toHaveAttribute("aria-checked", String(next));
      await expect(switchB).toHaveAttribute("aria-checked", String(next), {
        timeout: 15_000,
      });

      await switchA.click();
      await expect(switchA).toHaveAttribute("aria-checked", original || "false");
      await expect(switchB).toHaveAttribute("aria-checked", original || "false", {
        timeout: 15_000,
      });
    } finally {
      await otherPage.close();
    }
  });

  test("studio save reaches another tab and an unrelated refresh preserves drafts", async ({
    page,
    context,
  }) => {
    const otherPage = await context.newPage();
    const admin = adminClient();
    const { data: original, error } = await admin
      .from("studio_info")
      .select("id, representative")
      .limit(1)
      .single();
    if (error || !original) throw error || new Error("Missing studio_info row");

    const remoteValue = `E2E realtime ${Date.now()}`;
    const localDraft = `E2E local draft ${Date.now()}`;

    try {
      await openTwoPages(page, otherPage, "/settings/studio");
      const representativeA = page.locator("#studio-representative");
      const representativeB = otherPage.locator("#studio-representative");

      await representativeA.fill(remoteValue);
      await page.locator("button:visible", { hasText: "Lưu thay đổi" }).click();
      await expect(representativeB).toHaveValue(remoteValue, { timeout: 15_000 });

      await representativeB.fill(localDraft);
      await admin
        .from("studio_info")
        .update({ representative: `${remoteValue} second update` })
        .eq("id", original.id);
      await otherPage.waitForTimeout(1_000);
      await expect(representativeB).toHaveValue(localDraft);
    } finally {
      await admin
        .from("studio_info")
        .update({ representative: original.representative })
        .eq("id", original.id);
      await otherPage.close();
    }
  });
});
