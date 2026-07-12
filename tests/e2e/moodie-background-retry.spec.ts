import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

function readSeed() {
  return JSON.parse(readFileSync(path.join(os.tmpdir(), "e2e-seed-ids.json"), "utf8")) as { userId: string; email: string; password: string };
}

test("Moodie retries an owned failed background research run", async ({ page }) => {
  const seed = readSeed();
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: failedRun, error } = await admin.from("moodie_agent_runs").insert({
    user_id: seed.userId,
    kind: "research",
    title: "E2E retry research",
    request: { query: "OpenAI official latest updates", mode: "web" },
    status: "failed",
    error: "E2E forced retryable failure",
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).select("id").single();
  expect(error).toBeNull();

  await page.goto(`/api/e2e/login?email=${encodeURIComponent(seed.email)}&password=${encodeURIComponent(seed.password)}&next=${encodeURIComponent("/moodie")}`, { waitUntil: "domcontentloaded" });
  const retryResponse = await page.request.post(`/api/moodie/runs/${failedRun!.id}/retry`);
  expect(retryResponse.status()).toBe(201);
  const retryPayload = await retryResponse.json() as { run: { id: string; status: string } };
  expect(retryPayload.run.id).not.toBe(failedRun!.id);
  expect(retryPayload.run.status).toBe("queued");

  await expect.poll(async () => {
    const response = await page.request.get(`/api/moodie/runs?run_id=${retryPayload.run.id}`);
    const payload = await response.json() as { run?: { status?: string } };
    return payload.run?.status;
  }, { timeout: 120_000, intervals: [1000, 1500, 2500] }).toBe("completed");
});
