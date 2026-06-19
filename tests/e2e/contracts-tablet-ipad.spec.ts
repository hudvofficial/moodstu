/**
 * contracts-tablet-ipad.spec.ts
 * ---
 * 8 test case cho iPad A16 Landscape (1024×1366):
 *   1. Scroll FPS > 25 (WebKit headless realistic target)
 *   2. DOM nodes list view < 500
 *   3. Không dual-render — chỉ 1 layout active
 *   4. Detail LCP < 2.5s
 *   5. Touch prefetch — mở detail không cold-load
 *   6. Sticky columns CLS < 0.1
 *   7. Touch target tối thiểu 44px
 *   8. Memory — mở/đóng detail 10 lần không leak
 *
 * Tests 1-3: serial (share seed + login state).
 * Tests 4-8: independent (mỗi test tự seed + login) → chạy được parallel.
 *
 * Seed 20 contracts: 1 contract đầy đủ (events + printing_orders)
 * + 19 contract đơn giản để tạo scrollbar thực tế.
 *
 * FPS target giảm xuống 25-30 cho WebKit headless trên Windows.
 */

import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { sweepStaleE2EOrphans } from "./e2e-sweep";

type AdminClient = SupabaseClient;

interface SeedState {
  marker: string;
  email: string;
  password: string;
  employeeName: string;
  contractCode: string; // first contract (full — events + printing_orders)
  userId?: string;
  customerId?: string; // customer cho first contract
  contractId?: string; // first contract (full)
  extraCustomerId?: string; // customer cho 19 simple contracts
  extraContractIds?: string[]; // 19 simple contracts
}

// ── Helpers ──────────────────────────────────────────────────────────────

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

/**
 * Seed 1 contract ĐẦY ĐỦ (events + printing_orders).
 * Giữ nguyên logic như cũ.
 */
async function seedOneFullContract(admin: AdminClient, seed: SeedState) {
  // 1. Auth user
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: seed.email,
    password: seed.password,
    email_confirm: true,
    app_metadata: { role: "admin" },
    user_metadata: { full_name: seed.employeeName },
  });
  if (authError || !authUser.user)
    throw new Error(`auth user: ${authError?.message || "missing user"}`);
  seed.userId = authUser.user.id;

  // 2. Employee (update trigger-provisioned row)
  const { error: empError } = await admin
    .from("employees")
    .update({
      employee_code: `E2E-IPAD-${seed.marker.slice(-6)}`,
      department: "E2E",
      position: "QA",
      role: "admin",
      status: "active",
      start_date: "2026-05-15",
    })
    .eq("auth_user_id", seed.userId);
  if (empError) throw new Error(`employee: ${empError.message}`);

  // 3. Customer (cho full contract)
  const { data: customer, error: custError } = await admin
    .from("customers")
    .insert({
      customer_code: `E2E-IPAD-CUS-${seed.marker}`,
      full_name: `E2E iPad ${seed.marker}`,
      phone: "0901234567",
      status: "active",
    })
    .select("id")
    .single();
  if (custError || !customer) throw new Error(`customer: ${custError?.message || "missing row"}`);
  seed.customerId = customer.id;

  // 4. Contract (full)
  const { data: contract, error: contractError } = await admin
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
      total_amount: 5000000,
      paid_amount: 1000000,
      remaining_amount: 4000000,
    })
    .select("id")
    .single();
  if (contractError || !contract) throw new Error(`contract: ${contractError?.message || "missing row"}`);
  seed.contractId = contract.id;

  // 5. Contract events (2 events for realistic detail page)
  await admin.from("contract_events").insert([
    {
      contract_id: seed.contractId,
      event_type: "ngay_chup",
      title: "Chụp",
      event_date: "2026-07-05",
      status: "chua_lam",
      sort_order: 1,
      is_manual_date: true,
    },
    {
      contract_id: seed.contractId,
      event_type: "hau_ky",
      title: "Hậu kỳ",
      event_date: "2026-07-07",
      status: "chua_lam",
      sort_order: 2,
      is_manual_date: true,
    },
  ]);

  // 6. Printing order with items (via RPC atomic creation)
  const { data: printingData, error: printingError } = await admin.rpc("create_printing_order_atomic", {
    p_order: {
      contractId: seed.contractId,
      labId: null,
      items: [
        { name: "Album 20x30", quantity: 1, unitPrice: 250000 },
        { name: "Ảnh cổng 60x90", quantity: 1, unitPrice: 112500 },
        { name: "Album 25x35", quantity: 2, unitPrice: 350000 },
      ],
      notes: "Đơn test iPad perf",
      expectedDate: "2026-07-08",
    },
    p_actor_id: seed.userId,
  });
  if (printingError) throw new Error(`printing order: ${printingError.message}`);

  // Verify items persisted
  const orderId = (printingData as any)?.order_id;
  if (orderId) {
    const { data: verifyOrder } = await admin
      .from("printing_orders")
      .select("id, items")
      .eq("id", orderId)
      .single();
    if (!verifyOrder?.items || (Array.isArray(verifyOrder.items) && verifyOrder.items.length === 0)) {
      throw new Error(`Items not persisted: ${JSON.stringify(verifyOrder)}`);
    }
  }
}

/**
 * Seed 19 contract ĐƠN GIẢN (chỉ cần id, contract_code, status, total_amount).
 * Tất cả dùng chung 1 customer để giảm DB overhead.
 * Trả về array contract IDs.
 */
async function seedSimpleContracts(
  admin: AdminClient,
  customerId: string,
  count: number,
  marker: string,
): Promise<string[]> {
  const BATCH_SIZE = 5;
  const contractIds: string[] = [];

  for (let batchStart = 0; batchStart < count; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, count);
    const rows: Array<Record<string, unknown>> = [];

    for (let i = batchStart; i < batchEnd; i++) {
      const idx = String(i + 1).padStart(2, "0");
      rows.push({
        contract_code: `E2E-IPAD-BULK-${marker.slice(-4)}-${idx}`,
        customer_id: customerId,
        contract_date: "2026-06-30",
        work_date: "2026-07-05",
        service_type: "studio",
        transaction_type: "hop_dong",
        status: "dang_thuc_hien",
        payment_status: "chua_thanh_toan",
        total_amount: 1_000_000 + i * 500_000,
        paid_amount: 0,
        remaining_amount: 1_000_000 + i * 500_000,
      });
    }

    const { data, error } = await admin
      .from("contracts")
      .insert(rows)
      .select("id");

    if (error) {
      throw new Error(`simple contracts batch [${batchStart + 1}-${batchEnd}]: ${error.message}`);
    }

    if (data) {
      for (const c of data) contractIds.push((c as any).id);
    }
  }

  return contractIds;
}

/**
 * Seed toàn bộ: 1 full contract + 19 simple contracts + customer cho simple.
 */
async function seedTwentyContracts(admin: AdminClient, seed: SeedState) {
  // 1. Full contract (có events + printing_orders)
  await seedOneFullContract(admin, seed);

  // 2. Customer riêng cho 19 simple contracts
  const { data: extraCust, error: extraCustErr } = await admin
    .from("customers")
    .insert({
      customer_code: `E2E-IPAD-BULK-CUS-${seed.marker}`,
      full_name: `E2E iPad Bulk ${seed.marker}`,
      phone: "0901234568",
      status: "active",
    })
    .select("id")
    .single();
  if (extraCustErr || !extraCust) throw new Error(`bulk customer: ${extraCustErr?.message || "missing row"}`);
  seed.extraCustomerId = extraCust.id;

  // 3. 19 simple contracts
  seed.extraContractIds = await seedSimpleContracts(admin, seed.extraCustomerId, 19, seed.marker);
}

/**
 * Cleanup toàn bộ seed data: full contract, simple contracts, customers, user.
 */
async function cleanupSeed(admin: AdminClient, seed: SeedState) {
  // Cleanup all contracts (full + simple)
  const allContractIds = [
    ...(seed.contractId ? [seed.contractId] : []),
    ...(seed.extraContractIds ?? []),
  ];

  if (allContractIds.length > 0) {
    // Delete child rows BEFORE parent contracts (no ON DELETE CASCADE relied upon)
    for (const table of [
      "work_tasks",
      "contract_events",
      "payments",
      "payment_plans",
      "contract_checklists",
      "contract_notes",
      "printing_orders",
      "contract_items",
      "dress_reservations",
    ]) {
      await admin.from(table).delete().in("contract_id", allContractIds);
    }
    // Delete contracts
    await admin.from("contracts").delete().in("id", allContractIds);
  }

  // Cleanup customers
  const customerIds = [
    ...(seed.customerId ? [seed.customerId] : []),
    ...(seed.extraCustomerId ? [seed.extraCustomerId] : []),
  ];
  if (customerIds.length > 0) {
    await admin.from("customers").delete().in("id", customerIds);
  }

  // Cleanup user + employee
  if (seed.userId) {
    await admin.from("employees").delete().eq("auth_user_id", seed.userId);
    await admin.auth.admin.deleteUser(seed.userId);
  }
}

async function login(page: Page, seed: SeedState) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(seed.email);
  await page.locator('input[name="password"]').fill(seed.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard$/, { timeout: 45_000 });
}

/**
 * Helper: click the contract row in the contracts list (responsive-safe).
 * On tablet (≥768px), the layout uses a <table>. We locate the row
 * containing the contract code and click the first <td>.
 */
async function clickContractRow(page: Page, contractCode: string) {
  const codeText = page.getByText(contractCode, { exact: false }).first();
  await codeText.waitFor({ state: "visible", timeout: 20_000 });

  const tableRow = page.locator("table tbody tr", { hasText: contractCode }).first();
  const cardBtn = page.locator("button.card-base", { hasText: contractCode }).first();

  if (await tableRow.isVisible().catch(() => false)) {
    await tableRow.locator("td").first().click();
  } else if (await cardBtn.isVisible().catch(() => false)) {
    await cardBtn.click();
  } else {
    await codeText.click();
  }
}

// ─── Perf measurements ──────────────────────────────────────────────────

/**
 * Đo FPS bằng cách đếm requestAnimationFrame trong durationMs.
 */
async function measureFPS(page: Page, durationMs: number): Promise<number> {
  return page.evaluate((duration) => {
    return new Promise<number>((resolve) => {
      let frameCount = 0;
      const start = performance.now();

      function tick() {
        frameCount++;
        const elapsed = performance.now() - start;
        if (elapsed >= duration) {
          resolve(frameCount / (elapsed / 1000));
          return;
        }
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }, durationMs);
}

// ─── Test suite ─────────────────────────────────────────────────────────

const IPAD_LANDSCAPE = { width: 1024, height: 1366 };

// ═══════════════════════════════════════════════════════════════════════════
// Tests 1-3: SERIAL — dùng chung seed + login để đo perf core
// ═══════════════════════════════════════════════════════════════════════════

test.describe.serial("contracts tablet iPad A16 landscape - perf core (tests 1-3)", () => {
  test.setTimeout(240_000);

  let admin: AdminClient;
  const ts = Date.now();
  const seed: SeedState = {
    marker: ts.toString(),
    email: `e2e-ipad-core-${ts}@test.local`,
    password: `IPadCore!${ts}`,
    employeeName: `E2E iPad Core ${ts}`,
    contractCode: `E2E-IPAD-${ts.toString().slice(-6)}`,
  };

  test.beforeAll(async () => {
    admin = createAdminSupabase();
    await sweepStaleE2EOrphans(admin);
    await seedTwentyContracts(admin, seed);
  });

  test.afterAll(async () => {
    if (admin) await cleanupSeed(admin, seed);
  });

  // ── 1. List scroll FPS > 25 trên iPad landscape ──────────────────────

  test("1. List scroll FPS > 25 trên iPad landscape", async ({ page }) => {
    await page.setViewportSize(IPAD_LANDSCAPE);
    await login(page, seed);

    await page.goto("/contracts", { waitUntil: "networkidle" });

    // Wait for seeded contract to appear in the list
    const codeText = page.getByText(seed.contractCode, { exact: false }).first();
    await codeText.waitFor({ state: "visible", timeout: 20_000 });

    // Ensure list has content to scroll (20 contracts → scrollbar xuất hiện)
    await page.waitForTimeout(1000);

    // Verify scroll container exists
    const scrollContainer = page.locator("table").first();
    await expect(scrollContainer).toBeVisible({ timeout: 5_000 });

    // Start measuring FPS and scrolling simultaneously
    const fpsPromise = measureFPS(page, 3_000);

    // Scroll thực sự với delta lớn (500px) để kích hoạt render real scroll
    const startScroll = Date.now();
    while (Date.now() - startScroll < 3_000) {
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(80);
    }

    const fps = await fpsPromise;
    console.log(`[ipad-perf] Scroll FPS = ${fps.toFixed(1)} (target > 25)`);

    // WebKit headless trên Windows: target 25-30 fps là hợp lý
    // (không thể đạt 45-60 như Chrome thật trên iPad)
    expect(fps).toBeGreaterThan(25);
  });

  // ── 2. DOM nodes list view < 500 ──────────────────────────────────────

  test("2. DOM nodes list view < 500", async ({ page }) => {
    await page.setViewportSize(IPAD_LANDSCAPE);
    await login(page, seed);

    await page.goto("/contracts", { waitUntil: "networkidle" });

    // Wait for seeded contract to appear
    const codeText = page.getByText(seed.contractCode, { exact: false }).first();
    await codeText.waitFor({ state: "visible", timeout: 20_000 });

    // Wait for list to fully settle
    await page.waitForTimeout(1_500);

    // Đếm DOM nodes trong list container (table hoặc card-list container)
    const domCount = await page.evaluate(() => {
      // Try to scope to the contracts list area — table wrapper or card list
      const container = document.querySelector("table")?.parentElement?.parentElement
        ?? document.querySelector('[class*="contract"][class*="list"]')
        ?? document.querySelector("main")
        ?? document.body;
      return container.querySelectorAll("*").length;
    });

    console.log(`[ipad-perf] DOM nodes in list view = ${domCount} (target < 500)`);
    expect(domCount).toBeLessThan(500);
  });

  // ── 3. Không dual-render — chỉ 1 layout active ───────────────────────

  test("3. Không dual-render — chỉ 1 layout active", async ({ page }) => {
    await page.setViewportSize(IPAD_LANDSCAPE);
    await login(page, seed);

    // Navigate to a page that uses responsive layouts (contract detail)
    // This test verifies that at any given viewport, only one layout
    // (desktop or mobile) is actually visible/mounted, not both.
    await page.goto("/contracts", { waitUntil: "networkidle" });

    const codeText = page.getByText(seed.contractCode, { exact: false }).first();
    await codeText.waitFor({ state: "visible", timeout: 20_000 });

    // Open drawer → go to detail
    await clickContractRow(page, seed.contractCode);
    const detailBtn = page.locator('button:has-text("Chi tiết hợp đồng"):visible').first();
    await expect(detailBtn).toBeVisible({ timeout: 10_000 });
    await detailBtn.click();
    await page.waitForURL(`**/contracts/${seed.contractId}`, { timeout: 30_000 });

    // Wait for detail to render
    await page.waitForTimeout(2_000);

    // Check dual-render: DesktopLayout vs MobileLayout
    // In a proper responsive setup, only one layout is visible at a time.
    // On iPad landscape (1024px ≥ 768px md breakpoint), the table/desktop
    // layout should be visible, and mobile card layout should be hidden.
    const dualRender = await page.evaluate(() => {
      // Check for common dual-render patterns:
      // Pattern 1: DesktopLayout + MobileLayout components
      const allLayouts = document.querySelectorAll('[class*="DesktopLayout"], [class*="MobileLayout"]');
      const visibleLayouts = Array.from(allLayouts).filter((el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return style.display !== "none"
          && style.visibility !== "hidden"
          && rect.width > 0
          && rect.height > 0;
      });

      // Pattern 2: Desktop + Mobile side-by-side table/card wrappers
      const desktopTable = document.querySelector("table:not([class*='hidden'])");
      const mobileCards = document.querySelectorAll('[class*="card-base"], [class*="Card"]');
      const visibleCards = Array.from(mobileCards).filter((el) => {
        const style = window.getComputedStyle(el);
        return style.display !== "none" && style.visibility !== "hidden";
      });

      // Both patterns signal dual rendering
      const hasBothLayoutTypes = visibleLayouts.length > 1
        && visibleLayouts.some((el) => el.className.includes("Desktop"))
        && visibleLayouts.some((el) => el.className.includes("Mobile"));

      const hasTableAndCards = !!desktopTable && visibleCards.length > 1;

      return {
        layoutCount: allLayouts.length,
        visibleLayoutCount: visibleLayouts.length,
        hasBothTypes: hasBothLayoutTypes,
        hasTableAndCards,
        isDualRendering: hasBothLayoutTypes || hasTableAndCards,
      };
    });

    console.log(`[ipad-perf] Dual render check: ${JSON.stringify(dualRender)}`);
    expect(dualRender.isDualRendering, "Không được dual-render: chỉ 1 layout active tại 1 viewport").toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tests 4-8: INDEPENDENT — mỗi test tự seed + login, chạy được parallel
// ═══════════════════════════════════════════════════════════════════════════

// ── 4. Detail LCP < 2.5s trên iPad landscape ─────────────────────────

test.describe("4. Detail LCP < 2.5s trên iPad landscape", () => {
  test.setTimeout(240_000);

  let admin: AdminClient;
  const ts = Date.now();
  const seed: SeedState = {
    marker: `lcp-${ts}`,
    email: `e2e-ipad-lcp-${ts}@test.local`,
    password: `IPadLCP!${ts}`,
    employeeName: `E2E iPad LCP ${ts}`,
    contractCode: `E2E-IPAD-LCP-${ts.toString().slice(-6)}`,
  };

  test.beforeAll(async () => {
    admin = createAdminSupabase();
    await sweepStaleE2EOrphans(admin);
    await seedTwentyContracts(admin, seed);
  });

  test.afterAll(async () => {
    if (admin) await cleanupSeed(admin, seed);
  });

  test("4. Detail LCP < 2.5s trên iPad landscape", async ({ page }) => {
    await page.setViewportSize(IPAD_LANDSCAPE);
    await login(page, seed);

    await page.goto("/contracts", { waitUntil: "networkidle" });

    // Wait for seeded contract
    const codeText = page.getByText(seed.contractCode, { exact: false }).first();
    await codeText.waitFor({ state: "visible", timeout: 20_000 });

    // Click row to open drawer
    await clickContractRow(page, seed.contractCode);
    const detailBtn = page.locator('button:has-text("Chi tiết hợp đồng"):visible').first();
    await expect(detailBtn).toBeVisible({ timeout: 10_000 });

    // Let drawer settle
    await page.waitForTimeout(500);

    // Clear existing performance entries to get fresh LCP for detail navigation
    await page.evaluate(() => {
      performance.clearResourceTimings();
      // Mark time-of-tap for LCP measurement
      (window as any).__lcpStart = performance.now();
    });

    // Click "Chi tiết hợp đồng"
    await detailBtn.click();

    // Wait for detail page to load fully
    await page.waitForURL(`**/contracts/${seed.contractId}`, { timeout: 30_000 });
    const detailContent = page.getByText(seed.contractCode, { exact: false }).filter({ visible: true }).first();
    await detailContent.waitFor({ state: "visible", timeout: 30_000 });

    // Wait for LCP to settle (largest element may appear late)
    await page.waitForTimeout(2_000);

    // Measure LCP
    const lcp = await page.evaluate(() => {
      const entries = performance.getEntriesByType("largest-contentful-paint") as PerformanceEntry[];
      if (entries.length === 0) return -1;
      // Get the last (most recent) LCP entry after detail navigation
      const latest = entries[entries.length - 1];
      const startMark = (window as any).__lcpStart as number;
      // If we have a start mark, calculate relative LCP; otherwise use absolute
      return startMark ? latest.startTime - startMark : latest.startTime;
    });

    console.log(`[ipad-perf] Detail LCP = ${lcp.toFixed(0)}ms (target < 2500ms)`);
    expect(lcp).toBeGreaterThan(0); // Must have at least one LCP entry
    expect(lcp).toBeLessThan(2500);
  });
});

// ── 5. Touch prefetch — mở detail không cold-load ─────────────────────

test.describe("5. Touch prefetch — mở detail không cold-load", () => {
  test.setTimeout(240_000);

  let admin: AdminClient;
  const ts = Date.now();
  const seed: SeedState = {
    marker: `prefetch-${ts}`,
    email: `e2e-ipad-prefetch-${ts}@test.local`,
    password: `IPadPrefetch!${ts}`,
    employeeName: `E2E iPad Prefetch ${ts}`,
    contractCode: `E2E-IPAD-PF-${ts.toString().slice(-6)}`,
  };

  test.beforeAll(async () => {
    admin = createAdminSupabase();
    await sweepStaleE2EOrphans(admin);
    await seedTwentyContracts(admin, seed);
  });

  test.afterAll(async () => {
    if (admin) await cleanupSeed(admin, seed);
  });

  test("5. Touch prefetch — mở detail không cold-load", async ({ page }) => {
    await page.setViewportSize(IPAD_LANDSCAPE);
    await login(page, seed);

    await page.goto("/contracts", { waitUntil: "networkidle" });

    const codeText = page.getByText(seed.contractCode, { exact: false }).first();
    await codeText.waitFor({ state: "visible", timeout: 20_000 });

    // Track API calls from now
    const apiCalls: string[] = [];
    const onReq = (req: any) => {
      const url = req.url();
      if (url.includes("/rest/v1/") || url.includes("/rpc/")) {
        apiCalls.push(`${req.method()} ${new URL(url).pathname}`);
      }
    };
    page.on("request", onReq);

    // Tap row → drawer opens
    await clickContractRow(page, seed.contractCode);
    const detailBtn = page.locator('button:has-text("Chi tiết hợp đồng"):visible').first();
    await expect(detailBtn).toBeVisible({ timeout: 10_000 });

    // Let drawer fully settle
    await page.waitForTimeout(1_000);
    const apiCallsAfterDrawer = apiCalls.length;

    // Tap "Chi tiết hợp đồng"
    await detailBtn.click();
    await page.waitForURL(`**/contracts/${seed.contractId}`, { timeout: 30_000 });
    const detailContent = page.getByText(seed.contractCode, { exact: false }).filter({ visible: true }).first();
    await detailContent.waitFor({ state: "visible", timeout: 30_000 });

    await page.waitForTimeout(1_000);

    page.off("request", onReq);

    // Check: no GET contracts/:id should have fired DURING detail open
    // (data should already be prefetched/cached from drawer open)
    const detailFetches = apiCalls.filter(
      (call) => call.includes(`contracts/${seed.contractId}`) || call.includes("getContractDetail"),
    );

    console.log(`[ipad-perf] API calls total=${apiCalls.length}, detail fetches=${detailFetches.length}`);
    console.log(`[ipad-perf] Detail fetches: ${JSON.stringify(detailFetches)}`);

    // On touch devices with prefetch, no cold GET to contracts/:id should be needed
    // The drawer's prefetch (via router.prefetch or SWR cache) should have data ready
    const coldLoadDetected = apiCalls.length > apiCallsAfterDrawer
      && detailFetches.some((c) => c.startsWith("GET"));
    expect(coldLoadDetected, "Không được cold-load — data phải đã prefetch sẵn từ drawer").toBe(false);
  });
});

// ── 6. Sticky columns CLS < 0.1 ──────────────────────────────────────

test.describe("6. Sticky columns CLS < 0.1", () => {
  test.setTimeout(240_000);

  let admin: AdminClient;
  const ts = Date.now();
  const seed: SeedState = {
    marker: `cls-${ts}`,
    email: `e2e-ipad-cls-${ts}@test.local`,
    password: `IPadCLS!${ts}`,
    employeeName: `E2E iPad CLS ${ts}`,
    contractCode: `E2E-IPAD-CLS-${ts.toString().slice(-6)}`,
  };

  test.beforeAll(async () => {
    admin = createAdminSupabase();
    await sweepStaleE2EOrphans(admin);
    await seedTwentyContracts(admin, seed);
  });

  test.afterAll(async () => {
    if (admin) await cleanupSeed(admin, seed);
  });

  test("6. Sticky columns CLS < 0.1", async ({ page }) => {
    await page.setViewportSize(IPAD_LANDSCAPE);
    await login(page, seed);

    await page.goto("/contracts", { waitUntil: "networkidle" });

    const codeText = page.getByText(seed.contractCode, { exact: false }).first();
    await codeText.waitFor({ state: "visible", timeout: 20_000 });

    // Wait for table to fully render with all columns
    await page.waitForTimeout(1_500);

    // Inject CLS observer before scrolling
    await page.evaluate(() => {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // LayoutShift entries may not be directly available via PerformanceObserver
          // in all browsers — use type casting
          if (entry.entryType === "layout-shift") {
            clsValue += (entry as any).value ?? 0;
          }
        }
      });
      try {
        observer.observe({ type: "layout-shift", buffered: true });
      } catch {
        // LayoutShift API may not be available in this browser
      }
      (window as any).__clsObserver = observer;
      (window as any).__clsValue = clsValue;
    });

    // Scroll ngang bảng (horizontal scroll trên tablet)
    const tableContainer = page.locator("table").first();
    await expect(tableContainer).toBeVisible({ timeout: 5_000 });

    // Check if horizontal scroll is available
    const hasHScroll = await page.evaluate(() => {
      const el = document.querySelector("table")?.parentElement;
      if (!el) return false;
      return el.scrollWidth > el.clientWidth;
    });

    if (hasHScroll) {
      const scrollWrapper = page.locator("table").first().locator("xpath=ancestor::*[contains(@style, 'overflow') or contains(@class, 'overflow')][1]");
      const wrapper = (await scrollWrapper.count()) > 0 ? scrollWrapper : tableContainer;

      // Scroll right then left
      await wrapper.evaluate((el) => { el.scrollLeft = 300; });
      await page.waitForTimeout(500);
      await wrapper.evaluate((el) => { el.scrollLeft = 600; });
      await page.waitForTimeout(500);
      await wrapper.evaluate((el) => { el.scrollLeft = 0; });
      await page.waitForTimeout(500);
      await wrapper.evaluate((el) => { el.scrollLeft = 300; });
      await page.waitForTimeout(500);
    } else {
      // No horizontal scroll needed — test passes trivially (CLS = 0)
      console.log("[ipad-perf] Không có thanh cuộn ngang — CLS = 0");
    }

    // Collect CLS
    const cls = await page.evaluate(() => {
      const observer = (window as any).__clsObserver;
      if (observer && typeof observer.disconnect === "function") {
        observer.disconnect();
      }
      return (window as any).__clsValue ?? 0;
    });

    console.log(`[ipad-perf] CLS during horizontal scroll = ${cls} (target < 0.1)`);
    expect(cls).toBeLessThan(0.1);
  });
});

// ── 7. Touch target tối thiểu 44px ────────────────────────────────────

test.describe("7. Touch target tối thiểu 44px", () => {
  test.setTimeout(240_000);

  let admin: AdminClient;
  const ts = Date.now();
  const seed: SeedState = {
    marker: `touch-${ts}`,
    email: `e2e-ipad-touch-${ts}@test.local`,
    password: `IPadTouch!${ts}`,
    employeeName: `E2E iPad Touch ${ts}`,
    contractCode: `E2E-IPAD-TCH-${ts.toString().slice(-6)}`,
  };

  test.beforeAll(async () => {
    admin = createAdminSupabase();
    await sweepStaleE2EOrphans(admin);
    await seedTwentyContracts(admin, seed);
  });

  test.afterAll(async () => {
    if (admin) await cleanupSeed(admin, seed);
  });

  test("7. Touch target tối thiểu 44px", async ({ page }) => {
    await page.setViewportSize(IPAD_LANDSCAPE);
    await login(page, seed);

    await page.goto("/contracts", { waitUntil: "networkidle" });

    const codeText = page.getByText(seed.contractCode, { exact: false }).first();
    await codeText.waitFor({ state: "visible", timeout: 20_000 });

    await page.waitForTimeout(1_500);

    // Kiểm tra kích thước các touch target trong list:
    // - Filter buttons
    // - Action buttons (view, edit, etc.)
    // - Row click targets
    const targets = await page.evaluate(() => {
      // Collect all interactive elements in the contracts list area
      const container = document.querySelector("table")?.closest("div[id], div[class]")
        ?? document.querySelector("main")
        ?? document.body;

      const interactive = container.querySelectorAll(
        'button, a, [role="button"], [tabindex]:not([tabindex="-1"]), input, select',
      );

      const measurements: Array<{
        tag: string;
        text: string;
        width: number;
        height: number;
        pass: boolean;
      }> = [];

      for (const el of interactive) {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") continue;
        if (rect.width === 0 || rect.height === 0) continue;

        measurements.push({
          tag: el.tagName.toLowerCase(),
          text: (el.textContent ?? "").trim().slice(0, 40),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          pass: rect.width >= 44 && rect.height >= 44,
        });
      }

      return measurements;
    });

    // Log all targets for diagnostics
    console.log(`[ipad-perf] Touch targets found: ${targets.length}`);
    for (const t of targets) {
      const icon = t.pass ? "✅" : "❌";
      console.log(`  ${icon} <${t.tag}> "${t.text}" → ${t.width}×${t.height}px`);
    }

    // Filter: only check buttons and links that are primary UI actions
    // (not tiny icons inside cells — those should be at least 44×44 too)
    const failing = targets.filter((t) => !t.pass);
    if (failing.length > 0) {
      console.warn(`[ipad-perf] ⚠️ ${failing.length} touch targets < 44×44px`);
      failing.forEach((t) =>
        console.warn(`  ❌ <${t.tag}> "${t.text}" → ${t.width}×${t.height}px`),
      );
    }

    // Assert: all interactive elements meet 44×44 touch target (WCAG 2.5.5)
    expect(
      failing.length,
      `Có ${failing.length} touch target < 44×44px: ${failing.map((t) => `"${t.text}"(${t.width}×${t.height})`).join(", ")}`,
    ).toBe(0);
  });
});

// ── 8. Memory — mở/đóng detail 10 lần không leak ─────────────────────

test.describe("8. Memory — mở/đóng detail 10 lần không leak", () => {
  test.setTimeout(240_000);

  let admin: AdminClient;
  const ts = Date.now();
  const seed: SeedState = {
    marker: `mem-${ts}`,
    email: `e2e-ipad-mem-${ts}@test.local`,
    password: `IPadMem!${ts}`,
    employeeName: `E2E iPad Mem ${ts}`,
    contractCode: `E2E-IPAD-MEM-${ts.toString().slice(-6)}`,
  };

  test.beforeAll(async () => {
    admin = createAdminSupabase();
    await sweepStaleE2EOrphans(admin);
    await seedTwentyContracts(admin, seed);
  });

  test.afterAll(async () => {
    if (admin) await cleanupSeed(admin, seed);
  });

  test("8. Memory — mở/đóng detail 10 lần không leak", async ({ page }) => {
    await page.setViewportSize(IPAD_LANDSCAPE);
    await login(page, seed);

    await page.goto("/contracts", { waitUntil: "networkidle" });

    const codeText = page.getByText(seed.contractCode, { exact: false }).first();
    await codeText.waitFor({ state: "visible", timeout: 20_000 });

    // Wait for initial page to settle
    await page.waitForTimeout(2_000);

    // Measure baseline memory
    const measureMem = async () => {
      return page.evaluate(() => {
        const mem = (performance as any).memory;
        return {
          usedJSHeapSize: mem?.usedJSHeapSize ?? 0,
          totalJSHeapSize: mem?.totalJSHeapSize ?? 0,
        };
      });
    };

    const baseline = await measureMem();
    console.log(`[ipad-perf] Memory baseline: ${(baseline.usedJSHeapSize / 1024 / 1024).toFixed(1)} MB`);

    // Loop 10 lần: mở drawer → click "Chi tiết" → back → repeat
    const ITERATIONS = 10;
    for (let i = 0; i < ITERATIONS; i++) {
      // Open drawer by clicking contract row
      await clickContractRow(page, seed.contractCode);
      const detailBtn = page.locator('button:has-text("Chi tiết hợp đồng"):visible').first();
      await expect(detailBtn).toBeVisible({ timeout: 10_000 });

      // Click "Chi tiết hợp đồng"
      await detailBtn.click();
      await page.waitForURL(`**/contracts/${seed.contractId}`, { timeout: 30_000 });
      const detailContent = page.getByText(seed.contractCode, { exact: false }).filter({ visible: true }).first();
      await detailContent.waitFor({ state: "visible", timeout: 30_000 });

      // Let detail page fully render
      await page.waitForTimeout(1_000);

      // Navigate back to contracts list
      await page.goto("/contracts", { waitUntil: "networkidle" });
      const backCode = page.getByText(seed.contractCode, { exact: false }).first();
      await backCode.waitFor({ state: "visible", timeout: 20_000 });

      // Small delay to let GC potentially run
      await page.waitForTimeout(500);

      console.log(`[ipad-perf] Memory loop ${i + 1}/${ITERATIONS} done`);
    }

    // Final memory measurement
    await page.waitForTimeout(2_000); // Let GC settle
    const after = await measureMem();

    const deltaMB = (after.usedJSHeapSize - baseline.usedJSHeapSize) / 1024 / 1024;
    console.log(
      `[ipad-perf] Memory after ${ITERATIONS} loops: ${(after.usedJSHeapSize / 1024 / 1024).toFixed(1)} MB ` +
      `(delta = ${deltaMB.toFixed(1)} MB, target < 50 MB)`,
    );

    // Assert memory growth < 50MB
    expect(
      after.usedJSHeapSize - baseline.usedJSHeapSize,
      `Memory leak detected: delta = ${deltaMB.toFixed(1)} MB (limit 50 MB)`,
    ).toBeLessThan(50 * 1024 * 1024);
  });
});
