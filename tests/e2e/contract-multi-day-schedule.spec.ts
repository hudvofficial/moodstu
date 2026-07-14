import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { requireGlobalSeed } from "../../playwright/seed-reader";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard$/, { timeout: 45_000 });
}

async function selectCurrentMonthDay(page: Page, rowIndex: number, day: string) {
  const row = page.getByTestId("contract-schedule-row").nth(rowIndex);
  await row.getByTestId("contract-schedule-date").click();
  await page.locator("button:visible").filter({ hasText: new RegExp(`^${day}$`) }).click();
}

test.describe.serial("multi-day contract schedule", () => {
  test("adds, preserves and removes independent ceremony events", async ({ page }) => {
    test.setTimeout(180_000);
    const seed = requireGlobalSeed();
    const admin = adminClient();
    const originalShootId = seed.eventIds[0];
    const engagementTitle = `E2E Ăn hỏi ${seed.marker}`;
    const weddingTitle = `E2E Ngày cưới ${seed.marker}`;

    const { error: itemSeedError } = await admin.from("contract_items").insert({
      contract_id: seed.contractId,
      item_name: `E2E Gói Studio ${seed.marker}`,
      type: "dich_vu",
      quantity: 1,
      unit_price: 5_000_000,
      discount_amount: 0,
      total_amount: 5_000_000,
      is_addon: false,
    });
    expect(itemSeedError).toBeNull();

    await login(page, seed.email, seed.password);
    await page.goto(`/contracts/${seed.contractId}/edit`);
    await expect(page.getByTestId("contract-schedule-row")).toHaveCount(1, { timeout: 45_000 });

    await page.getByRole("button", { name: "Ngày lễ", exact: true }).click();
    await page.getByRole("button", { name: "Ngày lễ", exact: true }).click();
    await expect(page.getByTestId("contract-schedule-row")).toHaveCount(3);

    const rows = page.getByTestId("contract-schedule-row");
    await rows.nth(1).getByTestId("contract-schedule-title").fill(engagementTitle);
    await selectCurrentMonthDay(page, 1, "15");
    await rows.nth(2).getByTestId("contract-schedule-title").fill(weddingTitle);
    await selectCurrentMonthDay(page, 2, "16");
    await rows.nth(2).getByRole("button", { name: "Chọn chính", exact: true }).click();

    await page.getByRole("button", { name: /Cập nhật hợp đồng|Cập nhật/, exact: true }).first().click();
    await page.waitForURL(new RegExp(`/contracts/${seed.contractId}$`), { timeout: 45_000 });

    const { data: createdEvents, error: createdError } = await admin
      .from("contract_events")
      .select("id, title, event_type, event_date, deleted_at, sort_order")
      .eq("contract_id", seed.contractId)
      .in("event_type", ["ngay_chup", "ngay_to_chuc"])
      .is("deleted_at", null)
      .order("sort_order");
    expect(createdError).toBeNull();
    expect(createdEvents).toHaveLength(3);
    expect(createdEvents?.[0].id).toBe(originalShootId);
    expect(createdEvents?.map((event) => event.title)).toEqual([
      expect.any(String),
      engagementTitle,
      weddingTitle,
    ]);
    expect(createdEvents?.map((event) => event.event_date?.slice(0, 10))).toEqual([
      "2026-07-05",
      "2026-07-15",
      "2026-07-16",
    ]);

    const { data: customer } = await admin
      .from("customers")
      .select("wedding_date")
      .eq("id", seed.customerId)
      .single();
    expect(customer?.wedding_date).toBe("2026-07-16");

    await page.goto(`/contracts/${seed.contractId}/edit`);
    await expect(page.getByTestId("contract-schedule-row")).toHaveCount(3, { timeout: 45_000 });
    await page.getByRole("button", { name: `Xóa ${engagementTitle}`, exact: true }).click();
    await page.getByRole("button", { name: /Cập nhật hợp đồng|Cập nhật/, exact: true }).first().click();
    await page.waitForURL(new RegExp(`/contracts/${seed.contractId}$`), { timeout: 45_000 });

    const { data: activeAfterDelete } = await admin
      .from("contract_events")
      .select("id, title, deleted_at")
      .eq("contract_id", seed.contractId)
      .in("event_type", ["ngay_chup", "ngay_to_chuc"])
      .is("deleted_at", null);
    expect(activeAfterDelete).toHaveLength(2);
    expect(activeAfterDelete?.some((event) => event.id === originalShootId)).toBe(true);
    expect(activeAfterDelete?.some((event) => event.title === weddingTitle)).toBe(true);

    const { data: removed } = await admin
      .from("contract_events")
      .select("deleted_at, status")
      .eq("contract_id", seed.contractId)
      .eq("title", engagementTitle)
      .single();
    expect(removed?.deleted_at).not.toBeNull();
    expect(removed?.status).toBe("da_huy");
  });

  test("adapts schedule requirements for Ngày cưới and Combo", async ({ page }) => {
    const seed = requireGlobalSeed();
    await login(page, seed.email, seed.password);
    await page.goto(`/contracts/${seed.contractId}/edit`);
    await expect(page.getByTestId("contract-schedule-row").first()).toBeVisible({ timeout: 45_000 });

    const serviceSelect = page.getByRole("combobox").nth(1);
    await serviceSelect.click();
    await page.getByRole("option", { name: "Ngày cưới", exact: true }).click();
    await expect(page.getByTestId("contract-schedule-row")).toHaveCount(1);
    await expect(page.getByTestId("contract-schedule-row").first()).toContainText("Ngày lễ");

    await serviceSelect.click();
    await page.getByRole("option", { name: "Combo", exact: true }).click();
    await expect(page.getByTestId("contract-schedule-row")).toHaveCount(2);
    await expect(page.getByTestId("contract-schedule-row").first()).toContainText("Ngày chụp");
    await expect(page.getByTestId("contract-schedule-row").nth(1)).toContainText("Ngày lễ");
  });
});
