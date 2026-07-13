import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

type Seed = { email: string; password: string; userId: string };

function seed() {
  return JSON.parse(readFileSync(path.join(os.tmpdir(), "e2e-seed-ids.json"), "utf8")) as Seed;
}

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

test("explicit memory is durable and manageable through the UI", async ({ page }) => {
  const identity = seed();
  const marker = `E2EMemory${Array.from({ length: 10 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join("")}`;
  await page.goto(`/api/e2e/login?email=${encodeURIComponent(identity.email)}&password=${encodeURIComponent(identity.password)}&next=${encodeURIComponent("/moodie")}`);
  await page.waitForURL((url) => url.pathname === "/moodie");
  await expect(page.locator("#splash-screen")).toBeHidden({ timeout: 30_000 });

  const composer = page.getByPlaceholder("Tôi có thể giúp gì cho bạn hôm nay?").first();
  await expect(composer).toBeVisible({ timeout: 30_000 });
  await composer.fill(`Hãy nhớ: ưu tiên gọi tôi là ${marker}`);
  await composer.press("Enter");

  await expect.poll(async () => {
    const { data } = await admin().from("moodie_memories")
      .select("content, status, source_message_id")
      .eq("user_id", identity.userId)
      .ilike("content", `%${marker}%`)
      .maybeSingle();
    return data;
  }, { timeout: 20_000 }).toMatchObject({
    status: "active",
    content: expect.stringContaining(marker),
    source_message_id: expect.any(String),
  });

  const memoryPanel = page.getByTestId("moodie-memory-panel");
  await memoryPanel.getByRole("button", { name: "Ghi nhớ" }).click();
  await expect(memoryPanel.getByText(new RegExp(marker))).toBeVisible();

  await expect.poll(async () => {
    const { data } = await admin().from("moodie_observations")
      .select("conversation_id, prompt_summary, outcome_summary, succeeded")
      .eq("user_id", identity.userId)
      .ilike("prompt_summary", `%${marker}%`)
      .maybeSingle();
    return data;
  }, { timeout: 20_000 }).toMatchObject({
    conversation_id: expect.any(String),
    prompt_summary: expect.stringContaining(marker),
    outcome_summary: expect.any(String),
    succeeded: true,
  });

  const { data: persistedObservation } = await admin().from("moodie_observations")
    .select("conversation_id")
    .eq("user_id", identity.userId)
    .ilike("prompt_summary", `%${marker}%`)
    .single();
  expect(persistedObservation?.conversation_id).toBeTruthy();

  await composer.fill("Tiếp tục giúp mình từ lượt vừa rồi");
  await composer.press("Enter");
  await expect.poll(async () => {
    const { data } = await admin().from("ai_messages")
      .select("content, metadata")
      .eq("conversation_id", persistedObservation!.conversation_id!)
      .eq("role", "assistant")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  }, { timeout: 30_000 }).toMatchObject({
    content: expect.any(String),
    metadata: { trace: { working_memory_used: true } },
  });

  const editedMarker = `${marker}Edited`;
  let explicitCard = memoryPanel.locator("div.rounded-xl", { hasText: marker });
  await explicitCard.getByRole("button", { name: "Sửa memory" }).click();
  const editInput = memoryPanel.getByRole("textbox").nth(1);
  await editInput.fill(`Ưu tiên gọi tôi là ${editedMarker}`);
  await memoryPanel.getByRole("button", { name: "Lưu memory" }).click();
  explicitCard = memoryPanel.locator("div.rounded-xl", { hasText: editedMarker });
  await expect(explicitCard.getByText(new RegExp(editedMarker))).toBeVisible();
  await expect.poll(async () => {
    const { data } = await admin().from("moodie_memories").select("content, status")
      .eq("user_id", identity.userId).ilike("content", `%${editedMarker}%`).maybeSingle();
    return data;
  }).toMatchObject({ content: expect.stringContaining(editedMarker), status: "active" });

  await explicitCard.getByRole("button", { name: "Lưu trữ memory" }).click();
  await expect(explicitCard.getByText("Đã lưu trữ")).toBeVisible();

  const proposedMarker = `${marker}Pending`;
  const secondPage = await page.context().newPage();
  await secondPage.goto("/moodie");
  await expect(secondPage.locator("#splash-screen")).toBeHidden({ timeout: 30_000 });
  const secondMemoryPanel = secondPage.getByTestId("moodie-memory-panel");
  await secondMemoryPanel.getByRole("button", { name: "Ghi nhớ" }).click();
  await expect(secondMemoryPanel.getByText(new RegExp(editedMarker))).toBeVisible();

  await memoryPanel.getByPlaceholder("Ví dụ: Ưu tiên trả lời ngắn").fill(proposedMarker);
  await memoryPanel.getByRole("button", { name: "Thêm" }).click();
  const pendingCard = memoryPanel.locator("div.rounded-xl", { hasText: proposedMarker });
  await expect(pendingCard.getByText("Chờ duyệt")).toBeVisible();
  await expect(secondMemoryPanel.getByText(new RegExp(proposedMarker))).toBeVisible({ timeout: 15_000 });
  await pendingCard.getByRole("button", { name: "Duyệt memory" }).click();
  await expect(pendingCard.getByText("Đang dùng")).toBeVisible();
  await pendingCard.getByRole("button", { name: "Quên ghi nhớ" }).click();
  await expect(pendingCard).toHaveCount(0);
  await expect.poll(async () => {
    const { data } = await admin().from("moodie_memories").select("status")
      .eq("user_id", identity.userId).ilike("content", `%${proposedMarker}%`).maybeSingle();
    return data?.status;
  }).toBe("deleted");

  await secondPage.setViewportSize({ width: 390, height: 844 });
  await secondPage.reload();
  await secondPage.getByRole("button", { name: "Mở lịch sử chat" }).click();
  await expect(secondPage.locator('[data-testid="moodie-memory-panel"]:visible')).toBeVisible();
});
