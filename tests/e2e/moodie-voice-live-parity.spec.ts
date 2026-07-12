import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

function readSeed() {
  return JSON.parse(readFileSync(path.join(os.tmpdir(), "e2e-seed-ids.json"), "utf8")) as { email: string; password: string };
}

test("Moodie issues real Live voice tokens with unified tools and reconnect lineage", async ({ page }) => {
  const seed = readSeed();
  await page.goto(`/api/e2e/login?email=${encodeURIComponent(seed.email)}&password=${encodeURIComponent(seed.password)}&next=${encodeURIComponent("/moodie")}`, { waitUntil: "domcontentloaded" });

  const first = await page.request.post("/api/moodie/voice/token", { data: {} });
  expect(first.status()).toBe(200);
  const firstPayload = await first.json() as {
    token: string;
    model: string;
    sessionId: string;
    connectConfig: { tools?: Array<{ functionDeclarations?: Array<{ name?: string }> }> };
  };
  expect(firstPayload.token).toBeTruthy();
  expect(firstPayload.model).toBeTruthy();
  expect(firstPayload.sessionId).toMatch(/^[0-9a-f-]{36}$/i);
  const names = firstPayload.connectConfig.tools?.flatMap((tool) => tool.functionDeclarations || []).map((item) => item.name).sort();
  expect(names).toEqual(["ask_moodie", "cancel_moodie_task", "get_moodie_task_status", "propose_moodie_task", "submit_moodie_task"]);

  const reconnect = await page.request.post("/api/moodie/voice/token", { data: { session_id: firstPayload.sessionId } });
  expect(reconnect.status()).toBe(200);
  const reconnectPayload = await reconnect.json() as { token: string; sessionId: string };
  expect(reconnectPayload.token).toBeTruthy();
  expect(reconnectPayload.sessionId).toBe(firstPayload.sessionId);
});
