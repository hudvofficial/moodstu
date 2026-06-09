/**
 * contract-mobile-detail-perf.spec.ts
 * ---
 * Đo thực tế: thời gian từ DRAWER → DETAIL trên MOBILE (375px) và TABLET (768px),
 * có CPU throttle 4x để giả lập thiết bị tầm trung.
 *
 * Hypothesis cần chứng minh:
 *   Prefetch detail (router.prefetch + prefetchContractDetail) CHỈ chạy onMouseEnter
 *   (drawer-tab-content.tsx:110,219). Touch device KHÔNG có hover → tap "Chi tiết"
 *   = cold load ~1.5-1.8s mỗi lần. Desktop warm sẵn khi hover nên thấy "instant".
 *
 * Test ghi nhận:
 *   - ms từ lúc tap "Chi tiết hợp đồng" → nội dung detail hiện (contract code heading)
 *   - có RSC/prefetch request nào cho detail route TRƯỚC khi tap không (mobile = không)
 */

import { expect, test, type Page, type CDPSession } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type AdminClient = SupabaseClient;

interface SeedState {
  marker: string;
  email: string;
  password: string;
  employeeName: string;
  contractCode: string;
  userId?: string;
  employeeId?: string;
  customerId?: string;
  contractId?: string;
}

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const sep = line.indexOf("=");
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    let value = line.slice(sep + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    )
      value = value.slice(1, -1);
    process.env[key] ??= value;
  }
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function createAdminSupabase() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function seedUser(admin: AdminClient, seed: SeedState) {
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: seed.email,
    password: seed.password,
    email_confirm: true,
    app_metadata: { role: "admin" },
    user_metadata: { full_name: seed.employeeName },
  });
  if (authError || !authUser.user) throw new Error(`auth user: ${authError?.message}`);
  seed.userId = authUser.user.id;

  const { data: employee, error: empErr } = await admin
    .from("employees")
    .update({
      employee_code: `E2E-MPERF-${Date.now().toString(36).toUpperCase()}`,
      department: "E2E", position: "QA", role: "admin", status: "active",
      start_date: "2026-05-15",
    })
    .eq("auth_user_id", seed.userId)
    .select("id")
    .single();
  if (empErr || !employee) throw new Error(`employee: ${empErr?.message}`);
  seed.employeeId = employee.id;

  const { data: customer } = await admin
    .from("customers")
    .insert({
      customer_code: `E2E-MPERF-CUS-${seed.marker}`,
      full_name: `E2E MPerf ${seed.marker}`,
      phone: "0901234567", status: "active",
    })
    .select("id")
    .single();
  if (!customer) throw new Error("customer insert failed");
  seed.customerId = customer.id;

  // Future dates so "Mới nhất" (newest) sort puts this contract at the TOP of page 1.
  const { data: contract } = await admin
    .from("contracts")
    .insert({
      contract_code: seed.contractCode,
      customer_id: seed.customerId,
      contract_date: "2026-06-30",
      work_date: "2026-07-05",
      service_type: "studio",
      transaction_type: "hop_dong",
      status: "dang_thuc_hien",
      payment_status: "chua_thanh_toan",
      total_amount: 5000000, paid_amount: 1000000, remaining_amount: 4000000,
    })
    .select("id")
    .single();
  if (!contract) throw new Error("contract insert failed");
  seed.contractId = contract.id;

  // A couple events so detail has content to render
  await admin.from("contract_events").insert([
    { contract_id: seed.contractId, event_type: "ngay_chup", title: "Chụp", event_date: "2026-07-05", status: "chua_lam", sort_order: 1, is_manual_date: true },
    { contract_id: seed.contractId, event_type: "hau_ky", title: "Hậu kỳ", event_date: "2026-07-07", status: "chua_lam", sort_order: 2, is_manual_date: true },
  ]);
}

async function cleanupSeed(admin: AdminClient, seed: SeedState) {
  if (seed.contractId) {
    await admin.from("work_tasks").delete().eq("contract_id", seed.contractId);
    await admin.from("contract_events").delete().eq("contract_id", seed.contractId);
    await admin.from("payments").delete().eq("contract_id", seed.contractId);
    await admin.from("printing_orders").delete().eq("contract_id", seed.contractId);
    await admin.from("contract_items").delete().eq("contract_id", seed.contractId);
    await admin.from("contracts").delete().eq("id", seed.contractId);
  }
  if (seed.customerId) await admin.from("customers").delete().eq("id", seed.customerId);
  if (seed.employeeId) await admin.from("employees").delete().eq("id", seed.employeeId);
  if (seed.userId) await admin.auth.admin.deleteUser(seed.userId);
}

async function login(page: Page, seed: SeedState) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(seed.email);
  await page.locator('input[name="password"]').fill(seed.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard$/, { timeout: 45_000 });
}

/** Đo drawer→detail cho 1 viewport. Trả về { ms, prefetchedBeforeTap }. */
async function measureDrawerToDetail(
  page: Page,
  cdp: CDPSession,
  seed: SeedState,
  label: string,
): Promise<{ ms: number; prefetchedBeforeTap: boolean; detailRscCount: number }> {
  // Track network for the detail route (RSC payload requests carry the contract id / _rsc)
  const detailRequests: { url: string; at: number }[] = [];
  const onReq = (req: any) => {
    const url = req.url();
    if (url.includes(`/contracts/${seed.contractId}`) && !url.includes("/edit") && !url.includes("/print")) {
      detailRequests.push({ url, at: Date.now() });
    }
  };
  page.on("request", onReq);

  // Go to contracts list, find the seeded contract by code.
  // Responsive 3-tier (CLAUDE.md): <768px = card layout, ≥768px(md:) = table.
  await page.goto("/contracts", { waitUntil: "networkidle" });

  // Wait for the seeded contract code to appear in EITHER layout (card or table row).
  const codeText = page.getByText(seed.contractCode, { exact: false }).first();
  await codeText.waitFor({ state: "visible", timeout: 20_000 });

  // Click the clickable ancestor: table row (td) on tablet, card button on phone.
  const tableRow = page.locator("table tbody tr", { hasText: seed.contractCode }).first();
  const cardBtn = page.locator("button.card-base", { hasText: seed.contractCode }).first();
  if (await tableRow.isVisible().catch(() => false)) {
    await tableRow.locator("td").first().click();
  } else if (await cardBtn.isVisible().catch(() => false)) {
    await cardBtn.click();
  } else {
    // Fallback: click the code text's nearest button/row
    await codeText.click();
  }

  // Wait for drawer + "Chi tiết hợp đồng" button.
  // NOTE: ui/drawer.tsx renders BOTH a desktop side-drawer (hidden lg:flex) AND a
  // mobile bottom-sheet (lg:hidden) in the DOM → there are TWO matching buttons,
  // one display:none. Must target the VISIBLE one via :visible.
  const detailBtn = page.locator('button:has-text("Chi tiết hợp đồng"):visible').first();
  await expect(detailBtn).toBeVisible({ timeout: 10_000 });

  // Let drawer settle; record whether any detail prefetch fired before tap
  await page.waitForTimeout(1500);
  const prefetchCountBeforeTap = detailRequests.length;

  // ── TAP "Chi tiết hợp đồng" and measure until detail content visible ──
  const t0 = Date.now();
  await detailBtn.click();

  // 1) URL changes to the detail route (client route change — fast)
  await page.waitForURL(`**/contracts/${seed.contractId}`, { timeout: 30_000 });
  // 2) Real detail content renders. NOTE: the desktop h2 "Hợp đồng <code>" is
  //    max-lg:hidden; both DesktopLayout & MobileLayout render the code (one hidden).
  //    Wait for the VISIBLE occurrence of the contract code = perceived load done.
  const detailContent = page.getByText(seed.contractCode, { exact: false }).filter({ visible: true }).first();
  await detailContent.waitFor({ state: "visible", timeout: 30_000 });
  const ms = Date.now() - t0;

  page.off("request", onReq);

  // Reset back to list for next measurement
  await page.goto("/contracts", { waitUntil: "networkidle" });

  console.log(
    `[mperf:${label}] drawer→detail = ${ms}ms | prefetch-before-tap=${prefetchCountBeforeTap} | total-detail-reqs=${detailRequests.length}`,
  );

  return { ms, prefetchedBeforeTap: prefetchCountBeforeTap > 0, detailRscCount: detailRequests.length };
}

test.describe.serial("contract mobile drawer→detail perf", () => {
  test.setTimeout(240_000);

  let admin: AdminClient;
  const ts = Date.now();
  const seed: SeedState = {
    marker: ts.toString(),
    email: `e2e-mperf-${ts}@test.local`,
    password: `MPerf!${ts}`,
    employeeName: `E2E MPerf ${ts}`,
    contractCode: `E2E-MP-${ts.toString().slice(-6)}`,
  };

  test.beforeAll(async () => {
    admin = createAdminSupabase();
    await seedUser(admin, seed);
  });

  test.afterAll(async () => {
    if (admin) await cleanupSeed(admin, seed);
  });

  test("MOBILE 375px (CPU 4x): measure cold drawer→detail + prefetch presence", async ({ page }) => {
    await login(page, seed);

    await page.setViewportSize({ width: 375, height: 812 });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

    const r1 = await measureDrawerToDetail(page, cdp, seed, "mobile-cold-1");
    const r2 = await measureDrawerToDetail(page, cdp, seed, "mobile-cold-2");

    console.log(`[mperf:mobile] SUMMARY run1=${r1.ms}ms run2=${r2.ms}ms prefetchedBeforeTap=${r1.prefetchedBeforeTap}/${r2.prefetchedBeforeTap}`);

    // Diagnostic assertions (soft — we want the numbers, not a hard gate)
    expect.soft(r1.prefetchedBeforeTap, "MOBILE: detail should ideally be prefetched before tap (currently hover-gated → expected FALSE, proving the bug)").toBeDefined();
    // Flag if slow
    if (r1.ms > 2000 || r2.ms > 2000) {
      console.warn(`[mperf:mobile] ⚠️ SLOW: drawer→detail > 2s on mobile (run1=${r1.ms}, run2=${r2.ms})`);
    }
    expect(r1.ms, "detail must eventually load").toBeLessThan(30_000);
  });

  test("TABLET 768px (CPU 4x): measure cold drawer→detail + prefetch presence", async ({ page }) => {
    await login(page, seed);

    await page.setViewportSize({ width: 768, height: 1024 });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

    const r1 = await measureDrawerToDetail(page, cdp, seed, "tablet-cold-1");
    const r2 = await measureDrawerToDetail(page, cdp, seed, "tablet-cold-2");

    console.log(`[mperf:tablet] SUMMARY run1=${r1.ms}ms run2=${r2.ms}ms prefetchedBeforeTap=${r1.prefetchedBeforeTap}/${r2.prefetchedBeforeTap}`);

    if (r1.ms > 2000 || r2.ms > 2000) {
      console.warn(`[mperf:tablet] ⚠️ SLOW: drawer→detail > 2s on tablet (run1=${r1.ms}, run2=${r2.ms})`);
    }
    expect(r1.ms, "detail must eventually load").toBeLessThan(30_000);
  });
});
